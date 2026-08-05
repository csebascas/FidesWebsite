import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient } from '../_lib/supabase.js';
import { readSession } from '../_lib/auth.js';
import { fetchSuperwallMetrics } from '../_lib/superwall.js';

// One function for the whole report system (Hobby plan caps deployments at 12
// serverless functions, so run + history share this endpoint):
//  - GET  with admin session            → report history for the Reports tab
//  - GET  with CRON_SECRET bearer       → cron run (Mondays 13:00 UTC, emails)
//  - POST with admin session            → manual "Run now" (emails only with ?email=1)
//
// Money/trials/paying come from Superwall's revenue attribution (full store
// history); downloads/users come from our own tables. If SUPERWALL_API_KEY is
// missing the trial/paying numbers fall back to our subscription_events log,
// which only has history from 2026-07-08 onward.

interface Metrics {
  downloads_total: number;
  downloads_week: number;
  users_total: number;
  users_week: number;
  trials_total: number;
  trials_week: number;
  paying_monthly: number;
  paying_yearly: number;
  paying_new_week: number;
  pro_total: number;
  revenue_total?: number;
  revenue_week?: number;
  active_trials?: number;
  trial_conversions?: number;
  source?: string;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function money(n: number | undefined): string {
  return `$${(n ?? 0).toFixed(2)}`;
}

function reportHtml(m: Metrics, weekStart: Date, weekEnd: Date): string {
  const row = (label: string, total: string | number, delta: string, gold = false) => `
    <tr>
      <td style="padding:13px 0;border-bottom:1px solid #242424;font:400 13px 'Helvetica Neue',Arial,sans-serif;color:#8A847A;">${label}</td>
      <td style="padding:13px 0;border-bottom:1px solid #242424;font:700 16px 'Helvetica Neue',Arial,sans-serif;color:${gold ? '#E8B44E' : '#F2EDE4'};text-align:right;">${total}</td>
      <td style="padding:13px 0 13px 16px;border-bottom:1px solid #242424;font:400 12px 'Helvetica Neue',Arial,sans-serif;color:#7FB08A;text-align:right;white-space:nowrap;">${delta}</td>
    </tr>`;

  return `
  <div style="background:#0C0C0C;padding:32px 24px;">
    <div style="max-width:520px;margin:0 auto;">
      <div style="font:700 26px Georgia,'Times New Roman',serif;color:#F2EDE4;">Fides — Weekly Report</div>
      <div style="font:400 12px 'Helvetica Neue',Arial,sans-serif;color:#52504C;margin:6px 0 20px;">Week of ${fmtDate(weekStart)} – ${fmtDate(weekEnd)}</div>
      <div style="background:#181818;border-radius:10px;padding:6px 20px;">
        <table style="width:100%;border-collapse:collapse;">
          ${row('Money made', money(m.revenue_total), `+${money(m.revenue_week)} this week`, true)}
          ${row('Downloads', m.downloads_total, `+${m.downloads_week} this week`)}
          ${row('Users', m.users_total, `+${m.users_week} this week`)}
          ${row('Free-trial signups', m.trials_total, `+${m.trials_week} this week`)}
          ${row('Active trials', m.active_trials ?? 0, 'right now')}
          ${row('Paying — monthly', m.paying_monthly, `of ${m.pro_total} Pro`, true)}
          ${row('Paying — yearly', m.paying_yearly, `of ${m.pro_total} Pro`, true)}
          ${row('New paying', m.paying_new_week, 'this week')}
        </table>
      </div>
      <div style="font:400 11px 'Helvetica Neue',Arial,sans-serif;color:#52504C;margin-top:16px;">Full history at joinfides.com/d/reports</div>
    </div>
  </div>`;
}

async function runReport(res: VercelResponse, wantEmail: boolean) {
  const supabase = getAdminClient();
  const [{ data: metrics, error }, superwall] = await Promise.all([
    supabase.rpc('admin_report_metrics'),
    fetchSuperwallMetrics(),
  ]);
  if (error || !metrics) {
    return res.status(500).json({ error: error?.message || 'metrics failed' });
  }
  const m = metrics as Metrics;

  // Superwall (store history) overrides webhook-derived trial/paying numbers
  // and contributes revenue.
  if (superwall) {
    m.trials_total = superwall.trials_total;
    m.trials_week = superwall.trials_week;
    m.paying_monthly = superwall.paying_monthly;
    m.paying_yearly = superwall.paying_yearly;
    m.revenue_total = superwall.revenue_total;
    m.revenue_week = superwall.revenue_week;
    m.active_trials = superwall.active_trials;
    m.trial_conversions = superwall.trial_conversions;
    m.source = 'superwall';
  } else {
    m.source = 'supabase';
  }

  const weekEnd = new Date();
  const weekStart = new Date(weekEnd.getTime() - 7 * 86400 * 1000);

  let emailedTo: string[] = [];
  const resendKey = process.env.RESEND_API_KEY;
  if (wantEmail && !resendKey) {
    console.error('[weekly-report] RESEND_API_KEY not set — skipping email');
  }
  if (resendKey && wantEmail) {
    // Report recipients are independent of ADMIN_EMAILS (that list also
    // controls dashboard login) so adding a login admin doesn't silently
    // add them to the report distribution.
    const to = (process.env.REPORT_TO || '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.REPORT_FROM || 'Fides Reports <onboarding@resend.dev>',
          to,
          subject: `Fides weekly — ${money(m.revenue_week)} made, ${m.users_week} new users, ${m.trials_week} trials`,
          html: reportHtml(m, weekStart, weekEnd),
        }),
      });
      if (r.ok) emailedTo = to;
      else console.error('[weekly-report] resend failed', await r.text());
    } catch (e) {
      console.error('[weekly-report] resend failed', e);
    }
  }

  const { error: insertError } = await supabase.from('admin_weekly_reports').insert({
    week_start: weekStart.toISOString().slice(0, 10),
    week_end: weekEnd.toISOString().slice(0, 10),
    metrics: m,
    emailed_to: emailedTo,
  });
  if (insertError) console.error('[weekly-report] snapshot insert failed', insertError);

  return res.status(200).json({ ok: true, metrics: m, emailed: emailedTo });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const bearer = ((req.headers['authorization'] as string) || '').replace('Bearer ', '');
  const isCron = !!process.env.CRON_SECRET && bearer === process.env.CRON_SECRET;
  const adminSession = readSession(req);

  if (!isCron && !adminSession) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Cron fires a GET with the secret → run + email.
  if (isCron) {
    return runReport(res, true);
  }

  if (req.method === 'POST') {
    return runReport(res, req.query.email === '1');
  }

  if (req.method === 'GET') {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('admin_weekly_reports')
      .select('id, week_start, week_end, metrics, emailed_to, created_at')
      .order('created_at', { ascending: false })
      .limit(26);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ reports: data ?? [] });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
