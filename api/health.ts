import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdmin } from './_lib/auth';
import { getAdminClient } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await verifyAdmin(req, res);
  if (!session) return;

  const supabase = getAdminClient();

  const [dbAlive, cronStatus, stuckStreaks, totalUsers, activeToday, proUsers] = await Promise.allSettled([
    supabase.rpc('exec_sql', { query: 'SELECT 1' }).then(() => ({ ok: true })),

    supabase
      .from('cron.job_run_details' as any)
      .select('jobid, jobname, last_run, last_run_status, start_time')
      .order('start_time', { ascending: false })
      .limit(20),

    supabase.rpc('exec_sql', {
      query: `SELECT count(*) as count FROM users WHERE streak_current > 0 AND streak_last_date < current_date - interval '3 days'`,
    }),

    supabase.from('users').select('*', { count: 'exact', head: true }),

    supabase.rpc('exec_sql', {
      query: `SELECT count(DISTINCT user_id) as count FROM user_lesson_progress WHERE completed_at >= current_date`,
    }),

    supabase.from('users').select('*', { count: 'exact', head: true }).eq('subscription_tier', 'pro'),
  ]);

  return res.status(200).json({
    db_alive: dbAlive.status === 'fulfilled' ? dbAlive.value : { ok: false },
    cron_status: cronStatus.status === 'fulfilled' ? cronStatus.value.data : null,
    stuck_streaks: stuckStreaks.status === 'fulfilled' ? stuckStreaks.value : null,
    total_users: totalUsers.status === 'fulfilled' ? totalUsers.value.count : null,
    active_today: activeToday.status === 'fulfilled' ? activeToday.value : null,
    pro_users: proUsers.status === 'fulfilled' ? proUsers.value.count : null,
  });
}
