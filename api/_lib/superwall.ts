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

export async function fetchSuperwallMetrics(): Promise<SuperwallMetrics | null> {
  const key = process.env.SUPERWALL_API_KEY;
  if (!key) return null;

  const appIds = APP_IDS.split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter(Number.isFinite)
    .join(', ');
  if (!appIds) return null;

  try {
    const res = await fetch(`https://api.superwall.com/v2/organizations/${ORG_ID}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: buildQuery(appIds),
    });
    if (!res.ok) {
      console.error('[superwall] query failed', res.status, await res.text());
      return null;
    }
    const text = await res.text();
    const line = text.trim().split('\n')[0];
    if (!line) return null;
    const row = JSON.parse(line);
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
