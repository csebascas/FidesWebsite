import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await verifyAdmin(req, res);
  if (!session) return;

  return res.status(200).json({ email: session.email });
}
