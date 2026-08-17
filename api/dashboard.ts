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

    // ?view=offers serves the Offers tab: the win-back / notification-offer
    // funnel (sent -> tapped -> converted) from the offer_funnel +
    // offer_conversions views. Those views are granted to service_role only, so
    // they must be read here (server-side), never from the anon browser client.
    // Direct .from() selects — no RPC needed. Errors if the offer_tracking
    // migration isn't live in prod yet (the tab shows a friendly error state).
    if (view === 'offers') {
      const data = await cached('offers', async () => {
        const [funnel, conversions, sent, cfg] = await Promise.all([
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
          supabase.from('app_config').select('value').eq('key', 'winback_offer').maybeSingle(),
        ]);
        if (funnel.error) throw funnel.error;
        if (conversions.error) throw conversions.error;
        // Resolve display names for the "who got it" list (offer_events only
        // stores user_id).
        const sentRows = (sent.data ?? []) as Array<{ user_id: string; offer_key: string; placement: string; occurred_at: string }>;
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
        }));
        return {
          funnel: funnel.data ?? [],
          conversions: conversions.data ?? [],
          sends,
          config: cfg.data?.value ?? { enabled: true, window_hours: 72, cooldown_days: 14 },
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
