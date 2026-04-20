import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory rate limit (per Vercel instance — resets on cold start, but still useful)
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

  const { code } = req.body || {};
  const secret = process.env.ADMIN_ACCESS_CODE;

  if (!secret) {
    return res.status(500).json({ error: 'Access code not configured' });
  }

  if (!code || code !== secret) {
    return res.status(401).json({ error: 'Invalid access code' });
  }

  return res.status(200).json({ ok: true });
}
