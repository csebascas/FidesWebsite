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
