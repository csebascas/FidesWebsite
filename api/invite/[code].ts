import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient } from '../_lib/supabase.js';

// GET /api/invite/<code>
//
// Returns the inviter's display name + avatar so the /i/<code> landing page
// can render "<Sebastian> invited you to Fides". Calls the Supabase RPC
// `lookup_invite_code(p_code)` which is granted to anon.
//
// 404 if the code doesn't resolve. Public, no auth.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const rawCode = req.query.code;
  const code = (Array.isArray(rawCode) ? rawCode[0] : rawCode)?.toString().toUpperCase().trim();
  if (!code || code.length < 3 || code.length > 32) {
    res.status(400).json({ error: 'invalid_code' });
    return;
  }

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .rpc('lookup_invite_code', { p_code: code })
      .maybeSingle();

    if (error) {
      console.error('lookup_invite_code error:', error);
      res.status(500).json({ error: 'server_error' });
      return;
    }
    if (!data) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // Cache for 5 minutes — code → name binding is stable.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).json({
      code,
      inviter_name: (data as { inviter_name: string | null }).inviter_name,
      inviter_avatar_url: (data as { inviter_avatar_url: string | null }).inviter_avatar_url,
    });
  } catch (e) {
    console.error('invite lookup exception:', e);
    res.status(500).json({ error: 'server_error' });
  }
}
