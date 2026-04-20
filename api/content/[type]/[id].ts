import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdmin } from '../../_lib/auth.js';
import { getAdminClient } from '../../_lib/supabase.js';

const VALID_TYPES = ['lessons', 'articles', 'entries', 'saints', 'tracks', 'pillars'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await verifyAdmin(req, res);
  if (!session) return;

  const { type, id } = req.query;
  const typeStr = Array.isArray(type) ? type[0] : type;
  const idStr = Array.isArray(id) ? id[0] : id;

  if (!typeStr || !VALID_TYPES.includes(typeStr)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` });
  }

  if (!idStr) {
    return res.status(400).json({ error: 'ID is required' });
  }

  const supabase = getAdminClient();

  if (req.method === 'GET') {
    const { data, error } = await supabase.from(typeStr).select('*').eq('id', idStr).single();

    if (error) {
      return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  }

  if (req.method === 'PUT') {
    const updates = req.body;
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Remove id from updates to prevent overwriting
    delete updates.id;
    delete updates.created_at;

    const { data, error } = await supabase.from(typeStr).update(updates).eq('id', idStr).select('*').single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  }
}
