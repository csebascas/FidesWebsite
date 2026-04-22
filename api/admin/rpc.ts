import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdmin } from '../_lib/auth.js';
import { getAdminClient } from '../_lib/supabase.js';

/**
 * Admin RPC endpoint — proxies Supabase operations using the service role key.
 * Handles operations blocked by RLS for the anon key:
 *   - Reading all users
 *   - Creating / updating / deleting content
 *   - Reading feedback, content_reports, topic_requests
 *   - Deleting users and their related data
 *
 * POST /api/admin/rpc
 * Body: { action, table, data?, id?, match? }
 */

const TABLE_MAP: Record<string, string> = {
  entries: 'reference_entries',
};

const ALLOWED_TABLES = [
  'users', 'lessons', 'articles', 'reference_entries', 'entries',
  'saints', 'tracks', 'pillars', 'feedback', 'content_reports',
  'topic_requests', 'user_lesson_progress', 'user_track_progress',
  'user_saint_unlocks', 'user_badges', 'league_entries',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await verifyAdmin(req, res);
  if (!session) return;

  const { action, table, data, id, match, select, order, limit: lim } = req.body || {};

  if (!action || !table) {
    return res.status(400).json({ error: 'action and table are required' });
  }

  const tableName = TABLE_MAP[table] || table;
  if (!ALLOWED_TABLES.includes(tableName)) {
    return res.status(400).json({ error: `Table not allowed: ${table}` });
  }

  const supabase = getAdminClient();

  try {
    if (action === 'select') {
      let query = supabase.from(tableName).select(select || '*');
      if (match) {
        for (const [key, val] of Object.entries(match)) {
          query = query.eq(key, val);
        }
      }
      if (order) {
        query = query.order(order.column || 'created_at', { ascending: order.ascending ?? false });
      }
      const { data: rows, error, count } = await query.limit(lim || 500);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data: rows, count });
    }

    if (action === 'insert') {
      if (!data) return res.status(400).json({ error: 'data is required for insert' });
      const { data: row, error } = await supabase.from(tableName).insert(data).select('id').single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data: row });
    }

    if (action === 'update') {
      if (!id || !data) return res.status(400).json({ error: 'id and data are required for update' });
      const updates = { ...data };
      delete updates.id;
      delete updates.created_at;
      const { data: row, error } = await supabase.from(tableName).update(updates).eq('id', id).select('*').single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data: row });
    }

    if (action === 'delete') {
      if (!id && !match) return res.status(400).json({ error: 'id or match is required for delete' });
      let query = supabase.from(tableName).delete();
      if (id) query = query.eq('id', id);
      if (match) {
        for (const [key, val] of Object.entries(match)) {
          query = query.eq(key, val);
        }
      }
      const { error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
}
