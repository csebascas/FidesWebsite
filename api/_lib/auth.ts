import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Signed (HMAC-SHA256) stateless admin session.
//
// Why not the Supabase access token: it expires after ~1 hour, which forced a
// re-login mid-session even though the cookie claimed 24h. Credentials are
// still verified against Supabase auth at login time; after that the session
// stands on its own signature + the ADMIN_EMAILS allowlist, checked on every
// request.

const COOKIE_NAME = 'fides_admin_session';
const SESSION_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface AdminSession {
  email: string;
  exp: number;
}

function sessionSecret(): string {
  // Dedicated secret if set; otherwise derive from the service-role key so no
  // extra env var is required to get a valid HMAC key.
  const base = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) throw new Error('No ADMIN_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY set');
  return base;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

export function allowedEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function createSessionCookie(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + SESSION_SECONDS * 1000 })
  ).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function readSession(req: VercelRequest): AdminSession | null {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw) return null;

  const dot = raw.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);

  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let session: AdminSession;
  try {
    session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!session?.email || typeof session.exp !== 'number' || Date.now() > session.exp) return null;
  if (!allowedEmails().includes(session.email.toLowerCase())) return null;
  return session;
}

export async function verifyAdmin(req: VercelRequest, res: VercelResponse): Promise<AdminSession | null> {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return session;
}
