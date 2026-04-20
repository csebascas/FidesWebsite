import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdmin } from './_lib/auth.js';
import { getAdminClient } from './_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await verifyAdmin(req, res);
  if (!session) return;

  const supabase = getAdminClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - now.getDay() * 86400000);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartISO = weekStart.toISOString();

  const [
    totalUsers,
    proUsers,
    anonUsers,
    usersLast7,
    usersLast30,
    lessonsToday,
    lessonsThisWeek,
    avgStreak,
    streakDistribution,
    topLessons,
  ] = await Promise.allSettled([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('subscription_tier', 'pro'),
    supabase.from('users').select('*', { count: 'exact', head: true }).is('email', null),
    supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase
      .from('user_lesson_progress')
      .select('*', { count: 'exact', head: true })
      .gte('completed_at', todayStart)
      .not('completed_at', 'is', null),
    supabase
      .from('user_lesson_progress')
      .select('*', { count: 'exact', head: true })
      .gte('completed_at', weekStartISO)
      .not('completed_at', 'is', null),
    supabase.rpc('exec_sql', {
      query: `SELECT ROUND(AVG(streak_current)::numeric, 1) as avg FROM users WHERE streak_current > 0`,
    }),
    supabase.rpc('exec_sql', {
      query: `
        SELECT
          CASE
            WHEN streak_current = 0 THEN '0'
            WHEN streak_current BETWEEN 1 AND 3 THEN '1-3'
            WHEN streak_current BETWEEN 4 AND 7 THEN '4-7'
            WHEN streak_current BETWEEN 8 AND 14 THEN '8-14'
            WHEN streak_current BETWEEN 15 AND 30 THEN '15-30'
            ELSE '30+'
          END as bucket,
          count(*) as count
        FROM users
        GROUP BY bucket
        ORDER BY MIN(streak_current)
      `,
    }),
    supabase.rpc('exec_sql', {
      query: `
        SELECT l.title, count(*) as completions
        FROM user_lesson_progress ulp
        JOIN lessons l ON l.id = ulp.lesson_id
        WHERE ulp.completed_at IS NOT NULL
        GROUP BY l.id, l.title
        ORDER BY completions DESC
        LIMIT 5
      `,
    }),
  ]);

  return res.status(200).json({
    total_users: totalUsers.status === 'fulfilled' ? totalUsers.value.count : null,
    pro_users: proUsers.status === 'fulfilled' ? proUsers.value.count : null,
    anonymous_users: anonUsers.status === 'fulfilled' ? anonUsers.value.count : null,
    users_last_7_days: usersLast7.status === 'fulfilled' ? usersLast7.value.count : null,
    users_last_30_days: usersLast30.status === 'fulfilled' ? usersLast30.value.count : null,
    lessons_completed_today: lessonsToday.status === 'fulfilled' ? lessonsToday.value.count : null,
    lessons_completed_this_week: lessonsThisWeek.status === 'fulfilled' ? lessonsThisWeek.value.count : null,
    average_streak: avgStreak.status === 'fulfilled' ? avgStreak.value : null,
    streak_distribution: streakDistribution.status === 'fulfilled' ? streakDistribution.value : null,
    top_lessons: topLessons.status === 'fulfilled' ? topLessons.value : null,
  });
}
