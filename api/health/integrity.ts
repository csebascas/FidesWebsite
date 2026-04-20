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
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // 1. Users with broken streak data (current > 0 but no last_date)
  const { count: brokenStreaks } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gt('streak_current', 0)
    .is('streak_last_date', null);
  checks.streak_integrity = {
    ok: (brokenStreaks ?? 0) === 0,
    detail: `${brokenStreaks ?? 0} users with streak > 0 but no last_date`,
  };

  // 2. Orphaned lesson progress (lessons that no longer exist)
  const { data: lessons } = await supabase.from('lessons').select('id');
  const lessonIds = new Set((lessons ?? []).map((l: any) => l.id));
  const { data: progress } = await supabase
    .from('user_lesson_progress')
    .select('lesson_id')
    .limit(500);
  const orphaned = (progress ?? []).filter((p: any) => !lessonIds.has(p.lesson_id));
  checks.orphaned_progress = {
    ok: orphaned.length === 0,
    detail: `${orphaned.length} progress records for non-existent lessons`,
  };

  // 3. Tables exist and are readable
  const tables = ['users', 'lessons', 'tracks', 'pillars', 'articles', 'entries', 'saints'];
  for (const table of tables) {
    const { error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    checks[`table_${table}`] = {
      ok: !error,
      detail: error ? error.message : `${count} rows`,
    };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return res.status(200).json({ ok: allOk, checks });
}
