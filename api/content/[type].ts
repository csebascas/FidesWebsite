import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdmin } from '../_lib/auth.js';
import { getAdminClient } from '../_lib/supabase.js';

const TYPE_CONFIGS: Record<string, { table: string; select: string; searchFields: string[] }> = {
  lessons: {
    table: 'lessons',
    select: 'id, title, subtitle, track_id, xp_reward, active, sort_order, created_at, tracks(name, pillars(name))',
    searchFields: ['title', 'subtitle'],
  },
  articles: {
    table: 'articles',
    select: 'id, title, slug, type, category, published, featured, created_at',
    searchFields: ['title', 'slug'],
  },
  entries: {
    table: 'entries',
    select: 'id, term, type, category, featured, wotd_date, created_at',
    searchFields: ['term'],
  },
  saints: {
    table: 'saints',
    select: 'id, name, feast_month, feast_day_number, rarity, unlock_method, sort_order',
    searchFields: ['name'],
  },
  tracks: {
    table: 'tracks',
    select: 'id, name, pillar_id, is_free, active, lesson_count, sort_order, pillars(name)',
    searchFields: ['name'],
  },
  pillars: {
    table: 'pillars',
    select: 'id, name, slug, color, sort_order, active',
    searchFields: ['name', 'slug'],
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await verifyAdmin(req, res);
  if (!session) return;

  const { type } = req.query;
  const typeStr = Array.isArray(type) ? type[0] : type;

  if (!typeStr || !TYPE_CONFIGS[typeStr]) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${Object.keys(TYPE_CONFIGS).join(', ')}` });
  }

  const config = TYPE_CONFIGS[typeStr];
  const supabase = getAdminClient();
  const search = req.query.search as string | undefined;

  let query = supabase.from(config.table).select(config.select);

  if (search) {
    const orFilter = config.searchFields.map((f) => `${f}.ilike.%${search}%`).join(',');
    query = query.or(orFilter);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(200);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ data });
}
