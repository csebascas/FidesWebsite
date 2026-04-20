import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient } from '../_lib/supabase.js';

// In-memory rate limit
const attempts: Record<string, { count: number; resetAt: number }> = {};
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts[ip];
  if (!entry || now > entry.resetAt) {
    attempts[ip] = { count: 1, resetAt: now + WINDOW_MS };
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const allowedEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
  if (!allowedEmails.includes(email.toLowerCase())) {
    // Generic error — don't reveal if email is invalid vs not allowed
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const expires = Date.now() + 86400 * 1000; // 24h
  const sessionPayload = JSON.stringify({ email, token: data.session.access_token, expires });

  res.setHeader(
    'Set-Cookie',
    `fides_admin_session=${encodeURIComponent(sessionPayload)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
  );

  return res.status(200).json({ ok: true });
}
