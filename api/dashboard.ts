import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient } from './_lib/supabase.js';
import { verifyAdmin } from './_lib/auth.js';
import { fetchSuperwallMetrics, fetchPaywallAnalytics } from './_lib/superwall.js';

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

  if (req.query.view === 'revenue') {
    const [{ data, error }, superwall, paywalls] = await Promise.all([
      supabase.rpc('admin_revenue_data'),
      fetchSuperwallMetrics(),
      fetchPaywallAnalytics(),
    ]);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ...data, superwall, paywalls });
  }

  // ?view=growth serves the Growth tab: activation funnel + weekly retention.
  if (req.query.view === 'growth') {
    const { data, error } = await supabase.rpc('admin_growth_data');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  const { data, error } = await supabase.rpc('admin_dashboard_data');
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json(data);
}
