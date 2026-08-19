import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient } from './_lib/supabase.js';
import { verifyAdmin } from './_lib/auth.js';
import { fetchSuperwallMetrics, fetchPaywallAnalytics, fetchPlatformRevenue, getSuperwallError } from './_lib/superwall.js';

// Every dashboard tab switch previously re-ran its full RPC (and, for
// revenue, live ClickHouse queries) from scratch, on every request — none of
// this data needs to be fresher than a few tens of seconds for an admin
// dashboard. A short in-memory cache, scoped to the warm serverless instance,
// absorbs repeated loads (tab switches, page refreshes, multiple admins
// looking at the same tab) without adding any staleness an operator would
// notice. `private` on the Cache-Control header keeps this to the browser's
// own cache only — nothing shared/CDN-level, since these responses require
// the admin session cookie to produce.
const TTL_MS = 30_000;
const cache = new Map<string, { expiresAt: number; data: unknown }>();

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data as T;
  const data = await fn();
  cache.set(key, { expiresAt: Date.now() + TTL_MS, data });
  return data;
}

interface Alert {
  metric: string;
  severity: 'red' | 'amber';
  current: number; // last 7 full days
  baseline: number; // typical week (avg of the prior three 7-day blocks)
  pctChange: number; // negative = drop
  message: string;
}

// Weekly anomaly check: compare the last 7 full UTC days against the average
// of the three preceding weeks. Returns an alert only for a meaningful DROP,
// and only when there's enough history to judge — so it stays quiet in normal
// operation and speaks up when a metric collapses.
function buildAlert(metric: string, isoTimestamps: string[]): Alert | null {
  const dayMs = 86400000;
  const startOfTodayUTC = Math.floor(Date.now() / dayMs) * dayMs;
  const blocks = [0, 1, 2, 3].map((i) => {
    const hi = startOfTodayUTC - i * 7 * dayMs;
    return { lo: hi - 7 * dayMs, hi, count: 0 };
  });
  for (const ts of isoTimestamps) {
    const t = new Date(ts).getTime();
    if (!Number.isFinite(t)) continue;
    for (const b of blocks) {
      if (t >= b.lo && t < b.hi) {
        b.count++;
        break;
      }
    }
  }
  const current = blocks[0].count;
  const prior = [blocks[1], blocks[2], blocks[3]];
  const baseline = prior.reduce((s, b) => s + b.count, 0) / prior.length;
  if (baseline < 3) return null; // too little history to call it an anomaly
  const pctChange = (current - baseline) / baseline;
  if (pctChange > -0.3) return null; // only surface real drops
  const severity: 'red' | 'amber' = pctChange <= -0.5 ? 'red' : 'amber';
  const pct = Math.round(Math.abs(pctChange) * 100);
  const message = `${metric} down ${pct}% this week (${current} vs ~${Math.round(baseline)} typical).`;
  return { metric, severity, current, baseline: Math.round(baseline), pctChange, message };
}

// One call for the whole dashboard — the heavy lifting happens in the
// admin_dashboard_data() Postgres function instead of ~15 browser queries.
// ?view=revenue serves the Revenue tab from the same function (Hobby plan
// caps deployments at 12 serverless functions, so tabs share endpoints):
// admin_revenue_data() for our own tables + Superwall ClickHouse for
// money/trials/paywall performance.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await verifyAdmin(req, res);
  if (!session) return;

  const supabase = getAdminClient();
  const view = typeof req.query.view === 'string' ? req.query.view : 'default';

  try {
    if (view === 'revenue') {
      const body = await cached('revenue', async () => {
        const [{ data, error }, superwall, paywalls, platformRevenue] = await Promise.all([
          supabase.rpc('admin_revenue_data'),
          fetchSuperwallMetrics(),
          fetchPaywallAnalytics(),
          fetchPlatformRevenue(),
        ]);
        if (error) throw error;
        const superwall_error = superwall == null || paywalls == null ? getSuperwallError() : null;
        return { ...data, superwall, paywalls, superwall_error, platform_revenue: platformRevenue };
      });
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.status(200).json(body);
    }

    // ?view=growth serves the Growth tab: activation funnel + weekly retention.
    if (view === 'growth') {
      const data = await cached('growth', async () => {
        const { data, error } = await supabase.rpc('admin_growth_data');
        if (error) throw error;
        return data;
      });
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.status(200).json(data);
    }

    // ?view=referrals serves the Referrals tab: friend/partner referral tracking.
    if (view === 'referrals') {
      const data = await cached('referrals', async () => {
        const { data, error } = await supabase.rpc('admin_referrals_data');
        if (error) throw error;
        return data;
      });
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.status(200).json(data);
    }

    // ?view=bible-path serves the Bible Path tab: adoption + per-plan completion.
    if (view === 'bible-path') {
      const data = await cached('bible-path', async () => {
        const { data, error } = await supabase.rpc('admin_bible_path_data');
        if (error) throw error;
        return data;
      });
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.status(200).json(data);
    }

    // ?view=retention serves the Retention tab: Day-N curve, DAU/MAU series,
    // cohort heatmap. admin_retention_data is service_role only.
    if (view === 'retention') {
      const data = await cached('retention', async () => {
        const { data, error } = await supabase.rpc('admin_retention_data', { p_days: 30 });
        if (error) throw error;
        return data;
      });
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.status(200).json(data);
    }

    // ?view=engagement serves the Engagement tab: offer funnel, notification
    // opt-in/sends, league competition. Read-only reporting.
    if (view === 'engagement') {
      const data = await cached('engagement', async () => {
        const { data, error } = await supabase.rpc('admin_engagement_data', { p_days: 30 });
        if (error) throw error;
        return data;
      });
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.status(200).json(data);
    }

    // ?view=attribution serves the Growth tab's channel-quality table.
    if (view === 'attribution') {
      const data = await cached('attribution', async () => {
        const { data, error } = await supabase.rpc('admin_attribution_data', { p_days: 90 });
        if (error) throw error;
        return data;
      });
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.status(200).json(data);
    }

    const PRICE_MONTHLY = 6.99;
const PRICE_YEARLY_PER_MONTH = 59.99 / 12;

function planOf(productId: string | null): 'yearly' | 'monthly' {
  const p = (productId || '').toLowerCase();
  if (p.includes('year') || p.includes('annual')) return 'yearly';
  return 'monthly';
}

// Separate real payers from grants/trials and estimate MRR. subscription_events
// (App Store + Play) is the source of truth for money; a Pro user with no
// production purchase is a grant. Prices are approximate (plan inferred from
// product_id) — the Revenue tab has exact Superwall figures.
function computeSubscriptions(events: any[], proUsers: any[]) {
  // Per-user rollup of their production purchase history.
  const byUser = new Map<string, { hasNormal: boolean; hasTrial: boolean; plan: 'yearly' | 'monthly'; latest: number }>();
  for (const e of events) {
    const uid = e.user_id;
    if (!uid) continue;
    const t = new Date(e.occurred_at).getTime();
    const cur = byUser.get(uid) || { hasNormal: false, hasTrial: false, plan: 'monthly' as const, latest: 0 };
    const isNormal = String(e.period_type).toUpperCase() === 'NORMAL';
    cur.hasNormal = cur.hasNormal || isNormal;
    cur.hasTrial = cur.hasTrial || String(e.period_type).toUpperCase() === 'TRIAL';
    if (Number.isFinite(t) && t >= cur.latest) {
      cur.latest = t;
      cur.plan = planOf(e.product_id);
    }
    byUser.set(uid, cur);
  }

  const now = Date.now();
  let paying = 0, trial = 0, granted = 0, lapsed = 0, payMonthly = 0, payYearly = 0, mrr = 0;

  for (const u of proUsers) {
    const active =
      u.has_lifetime_pro === true ||
      (u.subscription_expires_at != null && new Date(u.subscription_expires_at).getTime() > now);
    if (!active) {
      lapsed++;
      continue;
    }
    const hist = byUser.get(u.id);
    if (hist?.hasNormal) {
      paying++;
      if (hist.plan === 'yearly') {
        payYearly++;
        mrr += PRICE_YEARLY_PER_MONTH;
      } else {
        payMonthly++;
        mrr += PRICE_MONTHLY;
      }
    } else if (hist?.hasTrial) {
      trial++;
    } else {
      granted++;
    }
  }

  const total = proUsers.length;
  return {
    total_pro: total,
    active_paying: paying,
    active_trial: trial,
    active_granted: granted,
    lapsed_pro: lapsed,
    pay_monthly: payMonthly,
    pay_yearly: payYearly,
    mrr: Math.round(mrr),
    arpu: paying > 0 ? Math.round((mrr / paying) * 100) / 100 : 0,
  };
}

// ?view=alerts powers the Overview anomaly banner. Rather than a Postgres
    // RPC (which would only reach prod on a separate Fides-repo merge), it
    // fetches recent timestamps directly and buckets them in JS, so it ships
    // live with this app. Weekly smoothing (last 7 full days vs the trailing
    // 3-week average) avoids day-of-week noise and partial-day undercounting —
    // exactly the kind of drop (signups/purchases collapsing) that otherwise
    // runs for days unnoticed.
    if (view === 'alerts') {
      const data = await cached('alerts', async () => {
        const since = new Date(Date.now() - 35 * 86400000).toISOString();
        const [signups, purchases, downloads] = await Promise.all([
          supabase
            .from('users')
            .select('created_at')
            .eq('is_bot', false)
            .is('deleted_at', null)
            .gte('created_at', since),
          supabase
            .from('subscription_events')
            .select('occurred_at')
            .eq('event', 'initial_purchase')
            .eq('environment', 'PRODUCTION')
            .gte('occurred_at', since),
          supabase.from('download_clicks').select('created_at').gte('created_at', since),
        ]);

        const alerts = [
          buildAlert('New signups', (signups.data ?? []).map((r: any) => r.created_at)),
          buildAlert('New paid subscriptions', (purchases.data ?? []).map((r: any) => r.occurred_at)),
          buildAlert('Download-page clicks', (downloads.data ?? []).map((r: any) => r.created_at)),
        ].filter((a): a is Alert => a !== null);

        return { alerts };
      });
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.status(200).json(data);
    }

    // ?view=subscriptions powers the Overview's honest revenue tiles. "Pro
    // users" (subscription_tier='pro') lumps together real payers, free
    // referral grants, lifetime grants, and trial users — overstating paid
    // conversion ~2.5x. This separates them from the source of truth
    // (subscription_events = real App Store / Play activity) and estimates MRR
    // from the plan encoded in product_id. Computed in JS from a small table.
    if (view === 'subscriptions') {
      const data = await cached('subscriptions', async () => {
        const [events, pro] = await Promise.all([
          supabase
            .from('subscription_events')
            .select('user_id, event, product_id, period_type, occurred_at')
            .eq('environment', 'PRODUCTION'),
          supabase
            .from('users')
            .select('id, subscription_expires_at, has_lifetime_pro, referral_pro_days_lifetime')
            .eq('subscription_tier', 'pro')
            .eq('is_bot', false)
            .is('deleted_at', null),
        ]);
        if (events.error) throw events.error;
        if (pro.error) throw pro.error;
        return computeSubscriptions(events.data ?? [], pro.data ?? []);
      });
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.status(200).json(data);
    }

    // ?view=offers serves the Offers tab: the win-back / notification-offer
    // funnel (sent -> tapped -> converted) from the offer_funnel +
    // offer_conversions views. Those views are granted to service_role only, so
    // they must be read here (server-side), never from the anon browser client.
    // Direct .from() selects — no RPC needed. Errors if the offer_tracking
    // migration isn't live in prod yet (the tab shows a friendly error state).
    if (view === 'offers') {
      const refresh = typeof req.query.refresh === 'string' ? req.query.refresh : '';
      const data = await cached(refresh ? `offers:${refresh}` : 'offers', async () => {
        const [funnel, conversions, sent, taps, cfg] = await Promise.all([
          supabase.from('offer_funnel').select('*'),
          supabase
            .from('offer_conversions')
            .select('*')
            .order('purchased_at', { ascending: false })
            .limit(200),
          supabase
            .from('offer_events')
            .select('user_id, offer_key, placement, occurred_at')
            .eq('event', 'sent')
            .order('occurred_at', { ascending: false })
            .limit(100),
          supabase
            .from('offer_events')
            .select('user_id, offer_key, occurred_at')
            .eq('event', 'tapped')
            .order('occurred_at', { ascending: false })
            .limit(500),
          supabase.from('app_config').select('value').eq('key', 'winback_offer').maybeSingle(),
        ]);
        if (funnel.error) throw funnel.error;
        if (conversions.error) throw conversions.error;
        // Resolve display names for the "who got it" list (offer_events only
        // stores user_id).
        const sentRows = (sent.data ?? []) as Array<{ user_id: string; offer_key: string; placement: string; occurred_at: string }>;
        const latestTapByUserOffer = new Map<string, string>();
        for (const tap of (taps.data ?? []) as Array<{ user_id: string; offer_key: string; occurred_at: string }>) {
          const key = `${tap.user_id}:${tap.offer_key}`;
          if (!latestTapByUserOffer.has(key)) latestTapByUserOffer.set(key, tap.occurred_at);
        }
        const ids = [...new Set(sentRows.map((r) => r.user_id))];
        const names: Record<string, string> = {};
        if (ids.length) {
          const { data: us } = await supabase.from('users').select('id, username, display_name').in('id', ids);
          for (const u of (us ?? []) as Array<{ id: string; username: string | null; display_name: string | null }>) {
            names[u.id] = u.username || u.display_name || String(u.id).slice(0, 8);
          }
        }
        const sends = sentRows.map((r) => ({
          name: names[r.user_id] || String(r.user_id).slice(0, 8),
          offer_key: r.offer_key,
          placement: r.placement,
          occurred_at: r.occurred_at,
          tapped_at: latestTapByUserOffer.get(`${r.user_id}:${r.offer_key}`) ?? null,
        }));
        return {
          funnel: funnel.data ?? [],
          conversions: conversions.data ?? [],
          sends,
          config: cfg.data?.value ?? { enabled: false, window_hours: 72, cooldown_days: 14 },
        };
      });
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.status(200).json(data);
    }

    const data = await cached('default', async () => {
      const { data, error } = await supabase.rpc('admin_dashboard_data');
      if (error) throw error;
      return data;
    });
    res.setHeader('Cache-Control', 'private, max-age=30');
    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
