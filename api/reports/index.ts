import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient } from '../_lib/supabase.js';
import { verifyAdmin } from '../_lib/auth.js';

// Report history for the dashboard Reports tab.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await verifyAdmin(req, res);
  if (!session) return;

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('admin_weekly_reports')
    .select('id, week_start, week_end, metrics, emailed_to, created_at')
    .order('created_at', { ascending: false })
    .limit(26);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ reports: data ?? [] });
}
