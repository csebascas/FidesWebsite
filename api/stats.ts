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
    streakUsers,
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
    // Fetch streak data for all users to compute avg + distribution client-side
    supabase.from('users').select('streak_current'),
  ]);

  // Compute average streak and distribution from raw data
  let averageStreak: number | null = null;
  const distribution: Record<string, number> = { '0': 0, '1-3': 0, '4-7': 0, '8-14': 0, '15-30': 0, '30+': 0 };

  if (streakUsers.status === 'fulfilled' && streakUsers.value.data) {
    const streaks = streakUsers.value.data.map((u: any) => u.streak_current ?? 0);
    const active = streaks.filter((s: number) => s > 0);
    if (active.length > 0) {
      averageStreak = Math.round((active.reduce((a: number, b: number) => a + b, 0) / active.length) * 10) / 10;
    }
    for (const s of streaks) {
      if (s === 0) distribution['0']++;
      else if (s <= 3) distribution['1-3']++;
      else if (s <= 7) distribution['4-7']++;
      else if (s <= 14) distribution['8-14']++;
      else if (s <= 30) distribution['15-30']++;
      else distribution['30+']++;
    }
  }

  return res.status(200).json({
    total_users: totalUsers.status === 'fulfilled' ? totalUsers.value.count : null,
    pro_users: proUsers.status === 'fulfilled' ? proUsers.value.count : null,
    anonymous_users: anonUsers.status === 'fulfilled' ? anonUsers.value.count : null,
    users_last_7_days: usersLast7.status === 'fulfilled' ? usersLast7.value.count : null,
    users_last_30_days: usersLast30.status === 'fulfilled' ? usersLast30.value.count : null,
    lessons_completed_today: lessonsToday.status === 'fulfilled' ? lessonsToday.value.count : null,
    lessons_completed_this_week: lessonsThisWeek.status === 'fulfilled' ? lessonsThisWeek.value.count : null,
    average_streak: averageStreak,
    streak_distribution: distribution,
  });
}
