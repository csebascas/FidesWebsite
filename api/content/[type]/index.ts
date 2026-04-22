import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdmin } from '../../_lib/auth.js';
import { getAdminClient } from '../../_lib/supabase.js';

/** Fields to exclude from list responses (large JSON blobs). */
const HEAVY_FIELDS = ['content', 'body', 'steps', 'blocks'];

interface TypeConfig {
  table: string;
  searchFields: string[];
}

const TYPE_CONFIGS: Record<string, TypeConfig> = {
  lessons: {
    table: 'lessons',
    searchFields: ['title', 'subtitle'],
  },
  articles: {
    table: 'articles',
    searchFields: ['title', 'slug'],
  },
  entries: {
    table: 'reference_entries',
    searchFields: ['term'],
  },
  saints: {
    table: 'saints',
    searchFields: ['name'],
  },
  tracks: {
    table: 'tracks',
    searchFields: ['name'],
  },
  pillars: {
    table: 'pillars',
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

  let query = supabase.from(config.table).select('*');

  if (search) {
    const orFilter = config.searchFields.map((f) => `${f}.ilike.%${search}%`).join(',');
    query = query.or(orFilter);
  }

  const { data, error } = await query.limit(500);

  if (error) {
    return res.status(500).json({ error: error.message, details: error });
  }

  // Strip heavy fields from list responses
  const rows = (data ?? []).map((row: any) => {
    const clean = { ...row };
    for (const field of HEAVY_FIELDS) {
      delete clean[field];
    }
    return clean;
  });

  // Enrich lessons with track/pillar names via separate lookups
  if (typeStr === 'lessons' && rows.length > 0) {
    const trackIds = [...new Set(rows.map((l: any) => l.track_id).filter(Boolean))];
    if (trackIds.length > 0) {
      const { data: tracks } = await supabase
        .from('tracks')
        .select('id, name, pillar_id')
        .in('id', trackIds);

      const pillarIds = [...new Set((tracks ?? []).map((t: any) => t.pillar_id).filter(Boolean))];
      let pillarMap: Record<string, string> = {};
      if (pillarIds.length > 0) {
        const { data: pillars } = await supabase
          .from('pillars')
          .select('id, name')
          .in('id', pillarIds);
        pillarMap = Object.fromEntries((pillars ?? []).map((p: any) => [p.id, p.name]));
      }

      const trackMap = Object.fromEntries((tracks ?? []).map((t: any) => [t.id, t]));

      for (const lesson of rows) {
        const track = trackMap[lesson.track_id];
        lesson._track_name = track?.name ?? null;
        lesson._pillar_name = track ? (pillarMap[track.pillar_id] ?? null) : null;
      }
    }
  }

  // Enrich tracks with pillar names
  if (typeStr === 'tracks' && rows.length > 0) {
    const pillarIds = [...new Set(rows.map((t: any) => t.pillar_id).filter(Boolean))];
    if (pillarIds.length > 0) {
      const { data: pillars } = await supabase
        .from('pillars')
        .select('id, name')
        .in('id', pillarIds);

      const pillarMap = Object.fromEntries((pillars ?? []).map((p: any) => [p.id, p.name]));
      for (const track of rows) {
        track._pillar_name = pillarMap[track.pillar_id] ?? null;
      }
    }
  }

  return res.status(200).json({ data: rows });
}
