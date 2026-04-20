import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdmin } from '../_lib/auth.js';
import { getAdminClient } from '../_lib/supabase.js';

interface TypeConfig {
  table: string;
  select: string;
  searchFields: string[];
  orderBy: string;
}

const TYPE_CONFIGS: Record<string, TypeConfig> = {
  lessons: {
    table: 'lessons',
    select: 'id, title, subtitle, track_id, xp_reward, active, sort_order',
    searchFields: ['title', 'subtitle'],
    orderBy: 'sort_order',
  },
  articles: {
    table: 'articles',
    select: 'id, title, slug, type, category, published, featured, created_at',
    searchFields: ['title', 'slug'],
    orderBy: 'created_at',
  },
  entries: {
    table: 'entries',
    select: 'id, term, type, category, featured, wotd_date, created_at',
    searchFields: ['term'],
    orderBy: 'created_at',
  },
  saints: {
    table: 'saints',
    select: 'id, name, feast_month, feast_day_number, rarity, unlock_method, sort_order',
    searchFields: ['name'],
    orderBy: 'sort_order',
  },
  tracks: {
    table: 'tracks',
    select: 'id, name, pillar_id, is_free, active, lesson_count, sort_order',
    searchFields: ['name'],
    orderBy: 'sort_order',
  },
  pillars: {
    table: 'pillars',
    select: 'id, name, slug, color, sort_order, active',
    searchFields: ['name', 'slug'],
    orderBy: 'sort_order',
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

  const { data, error } = await query.order(config.orderBy, { ascending: true }).limit(500);

  if (error) {
    return res.status(500).json({ error: error.message, details: error });
  }

  // Enrich lessons with track/pillar names via separate lookups
  if (typeStr === 'lessons' && data && data.length > 0) {
    const trackIds = [...new Set(data.map((l: any) => l.track_id).filter(Boolean))];
    const { data: tracks } = await supabase
      .from('tracks')
      .select('id, name, pillar_id')
      .in('id', trackIds);

    const pillarIds = [...new Set((tracks ?? []).map((t: any) => t.pillar_id).filter(Boolean))];
    const { data: pillars } = await supabase
      .from('pillars')
      .select('id, name')
      .in('id', pillarIds);

    const trackMap = Object.fromEntries((tracks ?? []).map((t: any) => [t.id, t]));
    const pillarMap = Object.fromEntries((pillars ?? []).map((p: any) => [p.id, p.name]));

    for (const lesson of data as any[]) {
      const track = trackMap[lesson.track_id];
      lesson._track_name = track?.name ?? null;
      lesson._pillar_name = track ? (pillarMap[track.pillar_id] ?? null) : null;
    }
  }

  // Enrich tracks with pillar names
  if (typeStr === 'tracks' && data && data.length > 0) {
    const pillarIds = [...new Set(data.map((t: any) => t.pillar_id).filter(Boolean))];
    const { data: pillars } = await supabase
      .from('pillars')
      .select('id, name')
      .in('id', pillarIds);

    const pillarMap = Object.fromEntries((pillars ?? []).map((p: any) => [p.id, p.name]));
    for (const track of data as any[]) {
      track._pillar_name = pillarMap[track.pillar_id] ?? null;
    }
  }

  return res.status(200).json({ data });
}
