import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient } from '../_lib/supabase.js';

// ── Rate limiting (in-memory, per-instance) ──────────────────────
const rateMap: Record<string, { count: number; resetAt: number }> = {};
const RATE_LIMIT = 30;          // max clicks per IP
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

// ── Dedup: ignore identical IP+platform within this window ───────
const recentMap: Record<string, number> = {};
const DEDUP_WINDOW = 5_000; // 5 seconds

// ── Cleanup stale entries every 10 minutes ───────────────────────
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 600_000) return;
  lastCleanup = now;
  for (const k of Object.keys(rateMap)) {
    if (now > rateMap[k].resetAt) delete rateMap[k];
  }
  for (const k of Object.keys(recentMap)) {
    if (now > recentMap[k]) delete recentMap[k];
  }
}

function getIp(req: VercelRequest): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || (req.headers['x-real-ip'] as string)
    || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap[ip];
  if (!entry || now > entry.resetAt) {
    rateMap[ip] = { count: 1, resetAt: now + RATE_WINDOW };
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

function isDuplicate(ip: string, platform: string): boolean {
  const key = `${ip}:${platform}`;
  const now = Date.now();
  if (recentMap[key] && now < recentMap[key]) return true;
  recentMap[key] = now + DEDUP_WINDOW;
  return false;
}

// ── Bot detection ────────────────────────────────────────────────
const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|baiduspider|yandex|duckduck|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|curl|wget|python|httpie|postman|insomnia/i;

function isBot(ua: string): boolean {
  if (!ua || ua.length < 10) return true;
  return BOT_PATTERN.test(ua);
}

// ── Input sanitization ───────────────────────────────────────────
function sanitize(value: unknown, maxLen: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  // Strip control chars and null bytes
  const clean = value.replace(/[\x00-\x1f\x7f]/g, '').trim();
  if (clean.length === 0) return null;
  return clean.slice(0, maxLen);
}

const ALLOWED_ORIGINS = ['https://joinfides.com', 'https://www.joinfides.com'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── Method check ───────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Origin / Referer check ─────────────────────────────────────
  // In production, only accept requests from our own site.
  // Allow all origins in development (no x-vercel-ip-country header).
  const origin = req.headers['origin'] as string | undefined;
  const referer = req.headers['referer'] as string | undefined;
  const isVercel = !!req.headers['x-vercel-ip-country'];

  if (isVercel) {
    const originOk = origin && ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
    const refererOk = referer && ALLOWED_ORIGINS.some((o) => referer.startsWith(o));
    if (!originOk && !refererOk) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  // ── Body size guard (reject unreasonably large payloads) ───────
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 2048) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  // ── Handle sendBeacon (may arrive as text/plain) ──────────────
  if (typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({ error: 'Invalid body' });
    }
  }

  const ip = getIp(req);
  const ua = (req.headers['user-agent'] as string) || '';

  // ── Bot filter ─────────────────────────────────────────────────
  if (isBot(ua)) {
    // Return 200 to not reveal detection — just silently drop
    return res.status(200).json({ ok: true });
  }

  // ── Rate limit ─────────────────────────────────────────────────
  cleanup();
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // ── Validate platform ──────────────────────────────────────────
  const body = req.body || {};
  const platform = body.platform;
  if (!platform || !['ios', 'android', 'unknown'].includes(platform)) {
    return res.status(400).json({ error: 'Invalid platform' });
  }

  // ── Dedup rapid-fire clicks ────────────────────────────────────
  if (isDuplicate(ip, platform)) {
    return res.status(200).json({ ok: true });
  }

  // ── Sanitize all user-provided strings ─────────────────────────
  const referrer = sanitize(body.referrer, 512);
  const utmSource = sanitize(body.utm_source, 128);
  const utmMedium = sanitize(body.utm_medium, 128);
  const utmCampaign = sanitize(body.utm_campaign, 128);

  // ── Geo from Vercel headers (trusted, not user-supplied) ───────
  const country = sanitize(req.headers['x-vercel-ip-country'], 4);
  const region = sanitize(req.headers['x-vercel-ip-country-region'], 8);
  const city = sanitize(req.headers['x-vercel-ip-city'], 128);
  const rawLat = req.headers['x-vercel-ip-latitude'] as string | undefined;
  const rawLng = req.headers['x-vercel-ip-longitude'] as string | undefined;
  const latitude = rawLat ? parseFloat(rawLat) : null;
  const longitude = rawLng ? parseFloat(rawLng) : null;

  // Guard against NaN from malformed headers
  const safeLat = latitude !== null && isFinite(latitude) ? latitude : null;
  const safeLng = longitude !== null && isFinite(longitude) ? longitude : null;

  // ── Insert ─────────────────────────────────────────────────────
  const supabase = getAdminClient();

  const { error } = await supabase.from('download_clicks').insert({
    platform,
    referrer,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    user_agent: sanitize(ua, 512),
    ip_address: ip,
    country,
    region,
    city,
    latitude: safeLat,
    longitude: safeLng,
  });

  if (error) {
    // Don't leak internal error details
    return res.status(500).json({ error: 'Failed to track' });
  }

  return res.status(200).json({ ok: true });
}
