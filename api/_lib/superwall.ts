// Superwall ClickHouse metrics for the weekly report.
//
// The store (App Store / Play) is the source of truth for money, trials, and
// subscriptions — Superwall's revenue attribution table has the full history,
// unlike our own subscription_events log which only starts at webhook v17
// (2026-07-08). Requires an org API key with the data:read scope in
// SUPERWALL_API_KEY; without it callers fall back to Supabase-derived numbers.

const ORG_ID = process.env.SUPERWALL_ORG_ID || '8212';
// Fides app ids: 42061 iOS, 42062 Android, 43184 promotional web
const APP_IDS = process.env.SUPERWALL_APP_IDS || '42061,42062,43184';

export interface SuperwallMetrics {
  revenue_total: number;
  revenue_week: number;
  trials_total: number;
  trials_week: number;
  trial_conversions: number;
  paying_monthly: number;
  paying_yearly: number;
  active_trials: number;
}

// App-id → platform, for the profit estimator: iOS and Android both go
// through their store's IAP cut, "web" (promotional checkout, app 43184) is
// NOT an app-store purchase — it doesn't owe Apple/Google a commission at
// all — so it needs a different fee model than the two store platforms.
const PLATFORM_BY_APP_ID: Record<string, 'ios' | 'android' | 'web'> = {
  '42061': 'ios',
  '42062': 'android',
  '43184': 'web',
};

export interface PlatformRevenue {
  platform: 'ios' | 'android' | 'web';
  revenue_total: number;
  revenue_week: number;
}

function platformQuery(appIds: string): string {
  return `
WITH tx AS (
  SELECT originalTransactionId, transactionId, applicationId,
    argMax(price, ts) AS price, max(ts) AS last_ts
  FROM open_revenue.attributed_events_by_ts_rep FINAL
  WHERE isSandbox = 0 AND applicationId IN (${appIds})
    AND ts < now() AND isFamilyShare = 0
  GROUP BY originalTransactionId, transactionId, applicationId
)
SELECT applicationId,
  round(coalesce(sumIf(price, price > 0), 0), 2) AS revenue_total,
  round(coalesce(sumIf(price, price > 0 AND last_ts >= now() - INTERVAL 7 DAY), 0), 2) AS revenue_week
FROM tx
GROUP BY applicationId
FORMAT JSONEachRow`;
}

// Gross revenue split by platform — the store-fee profit estimate needs this
// because Apple/Google IAP commission doesn't apply to the web checkout at
// all, so a single blended fee rate over combined revenue would be wrong.
export async function fetchPlatformRevenue(): Promise<PlatformRevenue[] | null> {
  const appIds = joinedAppIds();
  if (!appIds) return null;
  const rows = await chQuery(platformQuery(appIds));
  if (!rows) return null;
  const num = (v: unknown) => (v == null ? 0 : Number(v) || 0);
  return rows
    .map((r) => ({
      platform: PLATFORM_BY_APP_ID[String(r.applicationId)],
      revenue_total: num(r.revenue_total),
      revenue_week: num(r.revenue_week),
    }))
    .filter((r): r is PlatformRevenue => !!r.platform);
}

function buildQuery(appIds: string): string {
  return `
WITH tx AS (
  SELECT originalTransactionId, transactionId, name, periodType, isTrialConversion,
    argMax(price, ts) AS price, max(ts) AS last_ts
  FROM open_revenue.attributed_events_by_ts_rep FINAL
  WHERE isSandbox = 0 AND applicationId IN (${appIds})
    AND ts < now() AND isFamilyShare = 0
  GROUP BY originalTransactionId, transactionId, name, periodType, isTrialConversion
),
subs AS (
  SELECT originalTransactionId,
    argMax(productId, ts) AS product_id,
    argMax(periodType, ts) AS period_type,
    argMax(name, ts) AS last_event,
    max(expirationAt) AS expires
  FROM open_revenue.attributed_events_by_ts_rep FINAL
  WHERE isSandbox = 0 AND applicationId IN (${appIds})
    AND ts < now() AND isFamilyShare = 0 AND isRefund = 0
    AND name IN ('initial_purchase', 'renewal', 'uncancellation', 'product_change', 'cancellation', 'expiration')
  GROUP BY originalTransactionId
)
SELECT
  (SELECT round(coalesce(sumIf(price, price > 0), 0), 2) FROM tx) AS revenue_total,
  (SELECT round(coalesce(sumIf(price, price > 0 AND last_ts >= now() - INTERVAL 7 DAY), 0), 2) FROM tx) AS revenue_week,
  (SELECT uniqIf(originalTransactionId, name = 'initial_purchase' AND lower(periodType) = 'trial') FROM tx) AS trials_total,
  (SELECT uniqIf(originalTransactionId, name = 'initial_purchase' AND lower(periodType) = 'trial' AND last_ts >= now() - INTERVAL 7 DAY) FROM tx) AS trials_week,
  (SELECT uniqIf(originalTransactionId, name = 'renewal' AND isTrialConversion = 1) FROM tx) AS trial_conversions,
  (SELECT countIf(lower(period_type) != 'trial' AND positionCaseInsensitive(product_id, 'month') > 0) FROM subs WHERE expires > now() AND last_event != 'expiration') AS paying_monthly,
  (SELECT countIf(lower(period_type) != 'trial' AND positionCaseInsensitive(product_id, 'year') > 0) FROM subs WHERE expires > now() AND last_event != 'expiration') AS paying_yearly,
  (SELECT countIf(lower(period_type) = 'trial') FROM subs WHERE expires > now() AND last_event != 'expiration') AS active_trials
FORMAT JSONEachRow`;
}

function joinedAppIds(): string {
  return APP_IDS.split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter(Number.isFinite)
    .join(', ');
}

// Set whenever a query fails, so callers can surface WHY revenue data is
// missing instead of it silently reading as "$0" — a scoped-wrong API key
// (403 insufficient_permissions) looks identical to "no revenue" otherwise,
// and stayed unnoticed for days before being caught this way.
let lastError: string | null = null;
export function getSuperwallError(): string | null {
  return lastError;
}

// Runs a ClickHouse query and returns all JSONEachRow lines parsed.
async function chQuery(sql: string): Promise<Record<string, unknown>[] | null> {
  const key = process.env.SUPERWALL_API_KEY;
  if (!key) {
    lastError = 'SUPERWALL_API_KEY is not set';
    return null;
  }
  try {
    const res = await fetch(`https://api.superwall.com/v2/organizations/${ORG_ID}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: sql,
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[superwall] query failed', res.status, body);
      lastError = `Superwall ${res.status}: ${body.slice(0, 200)}`;
      return null;
    }
    lastError = null;
    const text = await res.text();
    return text
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (e) {
    console.error('[superwall] query failed', e);
    lastError = e instanceof Error ? e.message : 'Superwall request failed';
    return null;
  }
}

export async function fetchSuperwallMetrics(): Promise<SuperwallMetrics | null> {
  const appIds = joinedAppIds();
  if (!appIds) return null;

  try {
    const rows = await chQuery(buildQuery(appIds));
    const row = rows?.[0];
    if (!row) return null;
    // ClickHouse returns uniq/count values as strings — normalize everything.
    const num = (v: unknown) => (v == null ? 0 : Number(v) || 0);
    return {
      revenue_total: num(row.revenue_total),
      revenue_week: num(row.revenue_week),
      trials_total: num(row.trials_total),
      trials_week: num(row.trials_week),
      trial_conversions: num(row.trial_conversions),
      paying_monthly: num(row.paying_monthly),
      paying_yearly: num(row.paying_yearly),
      active_trials: num(row.active_trials),
    };
  } catch (e) {
    console.error('[superwall] query failed', e);
    return null;
  }
}

// Paywall analytics for the Revenue tab. Three sources, all validated against
// the live warehouse 2026-07-08:
//  - sw.events_hr_agg          → daily paywall/transaction funnel, last 30 days
//  - paywall_open_events_agg   → lifetime opens per placement
//  - attributed_events_by_ts   → lifetime trials/purchases per placement
export interface PaywallDaily {
  day: string;
  opens: number;
  declines: number;
  tx_start: number;
  tx_complete: number;
  tx_abandon: number;
}

export interface PlacementStats {
  placement: string;
  users: number;
  views: number;
  trials: number;
  purchases: number;
  trial_conversions: number;
}

export interface PaywallAnalytics {
  daily: PaywallDaily[];
  placements: PlacementStats[];
}

export async function fetchPaywallAnalytics(): Promise<PaywallAnalytics | null> {
  const appIds = joinedAppIds();
  if (!appIds || !process.env.SUPERWALL_API_KEY) return null;

  const dailySql = `
SELECT toDate(ts) AS day, name, uniqMerge(count) AS cnt
FROM sw.events_hr_agg
WHERE applicationId IN (${appIds}) AND isSandbox = 0
  AND name IN ('paywall_open', 'paywall_decline', 'transaction_start', 'transaction_complete', 'transaction_abandon')
  AND ts >= now() - INTERVAL 30 DAY AND ts < now()
GROUP BY day, name
ORDER BY day
FORMAT JSONEachRow`;

  const opensSql = `
SELECT placement,
  uniqMerge(users_state) AS users,
  uniqMerge(views_state) AS views
FROM open_revenue.paywall_open_events_agg
WHERE applicationId IN (${appIds}) AND environment = 'PRODUCTION'
GROUP BY placement
ORDER BY users DESC
FORMAT JSONEachRow`;

  const conversionsSql = `
SELECT coalesce(placement, '') AS placement,
  uniqIf(originalTransactionId, name = 'initial_purchase' AND lower(coalesce(periodType, '')) = 'trial') AS trials,
  uniqIf(originalTransactionId, name = 'initial_purchase' AND lower(coalesce(periodType, '')) != 'trial') AS purchases,
  uniqIf(originalTransactionId, name = 'renewal' AND isTrialConversion = 1) AS trial_conversions
FROM open_revenue.attributed_events_by_ts_rep FINAL
WHERE applicationId IN (${appIds}) AND isSandbox = 0
  AND isFamilyShare = 0 AND isRefund = 0 AND ts < now()
GROUP BY placement
FORMAT JSONEachRow`;

  const [dailyRows, openRows, convRows] = await Promise.all([
    chQuery(dailySql),
    chQuery(opensSql),
    chQuery(conversionsSql),
  ]);
  if (!dailyRows && !openRows && !convRows) return null;

  const num = (v: unknown) => (v == null ? 0 : Number(v) || 0);

  const byDay = new Map<string, PaywallDaily>();
  for (const r of dailyRows ?? []) {
    const day = String(r.day);
    const entry = byDay.get(day) ?? { day, opens: 0, declines: 0, tx_start: 0, tx_complete: 0, tx_abandon: 0 };
    const cnt = num(r.cnt);
    if (r.name === 'paywall_open') entry.opens += cnt;
    else if (r.name === 'paywall_decline') entry.declines += cnt;
    else if (r.name === 'transaction_start') entry.tx_start += cnt;
    else if (r.name === 'transaction_complete') entry.tx_complete += cnt;
    else if (r.name === 'transaction_abandon') entry.tx_abandon += cnt;
    byDay.set(day, entry);
  }

  const placements = new Map<string, PlacementStats>();
  for (const r of openRows ?? []) {
    const placement = String(r.placement || 'unknown');
    const entry = placements.get(placement) ?? { placement, users: 0, views: 0, trials: 0, purchases: 0, trial_conversions: 0 };
    entry.users += num(r.users);
    entry.views += num(r.views);
    placements.set(placement, entry);
  }
  for (const r of convRows ?? []) {
    const placement = String(r.placement || 'unknown');
    const entry = placements.get(placement) ?? { placement, users: 0, views: 0, trials: 0, purchases: 0, trial_conversions: 0 };
    entry.trials += num(r.trials);
    entry.purchases += num(r.purchases);
    entry.trial_conversions += num(r.trial_conversions);
    placements.set(placement, entry);
  }

  return {
    daily: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)),
    placements: [...placements.values()].sort((a, b) => b.users - a.users),
  };
}
