import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient } from './supabase.js';

interface AdminSession {
  email: string;
  token: string;
  expires: number;
}

export async function verifyAdmin(req: VercelRequest, res: VercelResponse): Promise<AdminSession | null> {
  const cookie = req.cookies?.fides_admin_session;
  if (!cookie) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  let session: AdminSession;
  try {
    session = JSON.parse(cookie);
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  if (!session.token || !session.email || Date.now() > session.expires) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const allowedEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
  if (!allowedEmails.includes(session.email.toLowerCase())) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.getUser(session.token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  return session;
}
