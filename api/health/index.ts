import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdmin } from '../_lib/auth.js';
import { getAdminClient } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await verifyAdmin(req, res);
  if (!session) return;

  const supabase = getAdminClient();

  // Simple connectivity check — just select from users
  const [dbCheck, stuckStreaksCheck, totalUsersCheck, proUsersCheck] = await Promise.allSettled([
    supabase.from('users').select('id', { count: 'exact', head: true }),

    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gt('streak_current', 0)
      .lt('streak_last_date', new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)),

    // Match admin_dashboard_data()'s canonical definition: exclude bots
    // (is_bot true) and soft-deleted rows, so this count agrees with the
    // Overview's "Total users" instead of quietly counting bots + deleted.
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('is_bot', 'is', true)
      .is('deleted_at', null),

    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_tier', 'pro')
      .not('is_bot', 'is', true),
  ]);

  const dbConnected = dbCheck.status === 'fulfilled' && !dbCheck.value.error;
  const stuckCount =
    stuckStreaksCheck.status === 'fulfilled' && !stuckStreaksCheck.value.error
      ? stuckStreaksCheck.value.count ?? 0
      : 0;

  return res.status(200).json({
    database: { connected: dbConnected },
    stuck_streaks: stuckCount,
    total_users: totalUsersCheck.status === 'fulfilled' ? totalUsersCheck.value.count : null,
    pro_users: proUsersCheck.status === 'fulfilled' ? proUsersCheck.value.count : null,
  });
}
