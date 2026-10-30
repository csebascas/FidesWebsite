// Firebase Analytics (GA4) reader for the Release 1.5 tab. It reads events the app
// already sends to Firebase, so it works for builds already in people's hands.
// Needs two env vars; without them callers get null and the tab says so.
//   GA4_PROPERTY_ID          numeric GA4 property id (Firebase > Project settings > Integrations)
//   GA4_SERVICE_ACCOUNT      the service-account JSON, as a string. The account's email must have
//                            Viewer on the GA4 property.
// Event counts work immediately. Per-value breakdowns (which pillar, how many
// minutes, which sale) need the event parameter registered as an event-scoped
// custom dimension in GA4 first, and only count from that day on.
import { createSign } from 'node:crypto';

export interface Ga4Result {
  events: Record<string, { count: number; users: number }>;
  breakdowns: Record<string, Array<{ value: string; count: number }>>;
  note: string | null;
}

const EVENTS = ['onboarding_pillar_picked', 'onboarding_year_minutes', 'pro_sale_popup', 'pro_sale_card_tap'];
// event -> parameter whose values we break down by
const PARAMS: Array<[string, string]> = [
  ['onboarding_pillar_picked', 'pillar'],
  ['onboarding_year_minutes', 'minutes'],
  ['pro_sale_popup', 'sale'],
  ['pro_sale_card_tap', 'sale'],
];

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

async function accessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(sa.private_key);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${head}.${claim}.${b64url(sig)}`,
    }),
  });
  if (!res.ok) throw new Error(`Google auth failed (${res.status})`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function report(property: string, token: string, body: unknown) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GA4 ${res.status}`);
  return (await res.json()) as { rows?: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }> };
}

export async function fetchRelease15Firebase(days = 30): Promise<Ga4Result | null> {
  const property = process.env.GA4_PROPERTY_ID;
  const raw = process.env.GA4_SERVICE_ACCOUNT;
  if (!property || !raw) return null;
  const out: Ga4Result = { events: {}, breakdowns: {}, note: null };
  try {
    const token = await accessToken(JSON.parse(raw));
    const dateRanges = [{ startDate: `${days}daysAgo`, endDate: 'today' }];
    const base = await report(property, token, {
      dateRanges,
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: EVENTS } } },
    });
    for (const r of base.rows ?? []) {
      out.events[r.dimensionValues[0].value] = {
        count: Number(r.metricValues[0].value),
        users: Number(r.metricValues[1].value),
      };
    }
    const missing: string[] = [];
    for (const [event, param] of PARAMS) {
      try {
        const rep = await report(property, token, {
          dateRanges,
          dimensions: [{ name: `customEvent:${param}` }],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: event } } },
          orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
          limit: 25,
        });
        out.breakdowns[event] = (rep.rows ?? []).map((r) => ({
          value: r.dimensionValues[0].value,
          count: Number(r.metricValues[0].value),
        }));
      } catch {
        missing.push(param);
      }
    }
    if (missing.length) {
      out.note = `Register ${[...new Set(missing)].join(', ')} as event-scoped custom dimensions in GA4 to see the breakdown.`;
    }
    return out;
  } catch (e: any) {
    out.note = `Firebase read failed: ${e?.message || 'unknown error'}`;
    return out;
  }
}
