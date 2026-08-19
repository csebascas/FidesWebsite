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

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const OFFER_KEY = 'winback';
const OFFER_PLACEMENT = 'notification_offer';
const DEFAULT_OFFER_STARTS_AT = '2026-08-17T00:00:00-04:00';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function offerRecipientIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value
    .filter((id): id is string => typeof id === 'string' && UUID_RE.test(id.trim()))
    .map((id) => id.trim().toLowerCase());
  return [...new Set(ids)].slice(0, 100);
}

const ALLOWED_TABLES = [
  'users', 'lessons', 'articles', 'reference_entries', 'entries',
  'saints', 'tracks', 'pillars', 'feedback', 'content_reports',
  'topic_requests', 'user_lesson_progress', 'user_track_progress',
  'user_saint_unlocks', 'user_badges', 'league_entries',
  'partner_codes', 'partner_attributions', 'partner_referral_stats',
  'partner_referral_users', 'partner_of_month', 'partner_monthly_content',
  'paintings', 'painting_regions',
  'app_config',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await verifyAdmin(req, res);
  if (!session) return;

  const { action, table, data, id, match, select, order, limit: lim, userIds } = req.body || {};

  if (!action || (action !== 'send_offer' && !table)) {
    return res.status(400).json({ error: 'action and table are required' });
  }

  const tableName = TABLE_MAP[table] || table;
  if (action !== 'send_offer' && !ALLOWED_TABLES.includes(tableName)) {
    return res.status(400).json({ error: `Table not allowed: ${table}` });
  }

  const supabase = getAdminClient();

  try {
    if (action === 'send_offer') {
      const recipientIds = offerRecipientIds(userIds);
      if (!recipientIds.length) {
        return res.status(400).json({ error: 'Provide one to 100 valid user IDs.' });
      }

      const { data: cfgRow, error: cfgError } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'winback_offer')
        .maybeSingle();
      if (cfgError) return res.status(500).json({ error: cfgError.message });

      const config = (cfgRow?.value ?? {}) as { starts_at?: string; window_hours?: number };
      const startsAt = new Date(config.starts_at ?? DEFAULT_OFFER_STARTS_AT);
      if (Number.isNaN(startsAt.getTime()) || Date.now() < startsAt.getTime()) {
        return res.status(409).json({
          error: `Manual offer sends unlock at ${DEFAULT_OFFER_STARTS_AT}. Confirm App Store approval first.`,
        });
      }
      const windowHours = typeof config.window_hours === 'number' && config.window_hours > 0
        ? config.window_hours
        : 72;
      const offerEndsAt = new Date(Date.now() + windowHours * 60 * 60 * 1000).toISOString();

      const [{ data: users, error: usersError }, { data: prefs, error: prefsError }, { data: tokens, error: tokensError }] = await Promise.all([
        supabase.from('users').select('id').in('id', recipientIds).eq('is_bot', false).is('deleted_at', null),
        supabase.from('user_notification_prefs').select('user_id').in('user_id', recipientIds).eq('comeback_nudges', true),
        supabase.from('user_push_tokens').select('user_id, token').in('user_id', recipientIds),
      ]);
      if (usersError || prefsError || tokensError) {
        return res.status(500).json({ error: usersError?.message ?? prefsError?.message ?? tokensError?.message });
      }

      const activeIds = new Set((users ?? []).map((user) => user.id));
      const optedInIds = new Set((prefs ?? []).map((pref) => pref.user_id));
      const eligibleIds = new Set([...activeIds].filter((userId) => optedInIds.has(userId)));
      const eligibleTokens = (tokens ?? []).filter((token) => eligibleIds.has(token.user_id));
      if (!eligibleTokens.length) {
        return res.status(200).json({
          sent: 0,
          skipped: recipientIds.length,
          reason: 'No selected users have an eligible push token and offer notification consent.',
        });
      }

      const messages = eligibleTokens.map((token) => ({
        to: token.token,
        title: '50% off Fides Pro',
        body: 'A one-time welcome-back offer, whenever you are ready.',
        sound: 'default',
        data: {
          kind: 'offer',
          paywall: {
            placement: OFFER_PLACEMENT,
            params: { offer_key: OFFER_KEY, offer_ends_at: offerEndsAt },
          },
        },
      }));
      const expo = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!expo.ok) return res.status(502).json({ error: `Expo push service returned ${expo.status}.` });
      const payload = await expo.json() as { data?: Array<{ status: 'ok' | 'error' }> };
      const deliveredIds = new Set<string>();
      for (const [index, ticket] of (payload.data ?? []).entries()) {
        if (ticket.status === 'ok') deliveredIds.add(eligibleTokens[index].user_id);
      }
      if (deliveredIds.size) {
        const { error: eventError } = await supabase.from('offer_events').insert(
          [...deliveredIds].map((user_id) => ({
            user_id,
            offer_key: OFFER_KEY,
            placement: OFFER_PLACEMENT,
            event: 'sent',
            meta: { source: 'admin_manual', sent_by: session.email, offer_ends_at: offerEndsAt },
          })),
        );
        if (eventError) return res.status(500).json({ error: `Pushes were accepted, but tracking failed: ${eventError.message}` });
      }
      return res.status(200).json({ sent: deliveredIds.size, skipped: recipientIds.length - deliveredIds.size, offer_ends_at: offerEndsAt });
    }

    if (action === 'select') {
      // PostgREST's select syntax lets `table(*)` embed a related table via
      // its foreign key — every real caller only ever passes a plain
      // comma-separated column list, so reject anything that could embed a
      // table outside ALLOWED_TABLES and read columns the caller shouldn't see.
      if (typeof select === 'string' && /[()]/.test(select)) {
        return res.status(400).json({ error: 'select must be a plain column list' });
      }
      // Request an exact count so callers can show the true total even when
      // the returned rows are capped by `limit` (e.g. the Users list shows
      // "1,017" while only rendering the first 500 rows).
      let query = supabase.from(tableName).select(select || '*', { count: 'exact' });
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
      // select('*') (not 'id') so tables whose PK isn't `id` (e.g. partner_codes,
      // keyed on `code`) don't error. Callers that read `.data.id` still work.
      const { data: row, error } = await supabase.from(tableName).insert(data).select('*').single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data: row });
    }

    if (action === 'update') {
      // Update by `id`, or by `match` for tables keyed on another column
      // (e.g. partner_codes.code).
      if ((!id && !match) || !data) return res.status(400).json({ error: 'id or match, plus data, are required for update' });
      const updates = { ...data };
      delete updates.id;
      delete updates.created_at;
      let query = supabase.from(tableName).update(updates);
      if (id) query = query.eq('id', id);
      if (match) {
        for (const [key, val] of Object.entries(match)) {
          query = query.eq(key, val);
        }
      }
      const { data: rows, error } = await query.select('*');
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data: Array.isArray(rows) ? rows[0] : rows });
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
