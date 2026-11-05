import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient } from '../_lib/supabase.js';
import { allowedEmails, createSessionCookie } from '../_lib/auth.js';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Fallback limiter, used only when the durable one (admin_login_attempts via the
// admin_login_failures RPC) is unavailable, e.g. before that migration is live.
// Per serverless instance, so best-effort only.
const attempts: Record<string, { count: number; resetAt: number }> = {};
function memoryRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts[ip];
  if (!entry || now > entry.resetAt) {
    attempts[ip] = { count: 1, resetAt: now + WINDOW_MS };
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

async function record(supabase: ReturnType<typeof getAdminClient>, ip: string, email: string | null, success: boolean) {
  try {
    await supabase.from('admin_login_attempts').insert({ ip, email, success });
  } catch {
    // table not there yet, or transient: never block login on bookkeeping
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  const supabase = getAdminClient();

  const { data: failures, error: rlError } = await supabase.rpc('admin_login_failures', { p_ip: ip });
  if (rlError) {
    if (memoryRateLimited(ip)) {
      return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    }
  } else if ((failures ?? 0) >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }

  const { email, password } = req.body || {};
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const normalized = email.trim().toLowerCase();

  if (!allowedEmails().includes(normalized)) {
    // Generic error: don't reveal whether the email is invalid or just not allowed
    await record(supabase, ip, normalized, false);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: normalized, password });

  if (error || !data.session) {
    await record(supabase, ip, normalized, false);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  await record(supabase, ip, normalized, true);
  res.setHeader('Set-Cookie', createSessionCookie(normalized));
  return res.status(200).json({ ok: true });
}
