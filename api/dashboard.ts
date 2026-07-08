import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient } from './_lib/supabase.js';
import { verifyAdmin } from './_lib/auth.js';

// One call for the whole dashboard — the heavy lifting happens in the
// admin_dashboard_data() Postgres function instead of ~15 browser queries.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await verifyAdmin(req, res);
  if (!session) return;

  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc('admin_dashboard_data');
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json(data);
}
