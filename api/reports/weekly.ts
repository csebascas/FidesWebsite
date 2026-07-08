import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient } from '../_lib/supabase.js';
import { readSession, allowedEmails } from '../_lib/auth.js';

// Runs the weekly report: computes metrics via admin_report_metrics(), stores
// a snapshot in admin_weekly_reports, and emails both admins via Resend.
//
// Callers:
//  - Vercel cron (Mondays 13:00 UTC) — authenticated by CRON_SECRET bearer
//  - "Run now" in the dashboard — authenticated by the admin session cookie
//    (manual runs skip email unless ?email=1)

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
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
          ${row('Downloads', m.downloads_total, `+${m.downloads_week} this week`)}
          ${row('Users', m.users_total, `+${m.users_week} this week`)}
          ${row('Free-trial signups', m.trials_total, `+${m.trials_week} this week`)}
          ${row('Paying — monthly', m.paying_monthly, `of ${m.pro_total} Pro`, true)}
          ${row('Paying — yearly', m.paying_yearly, `of ${m.pro_total} Pro`, true)}
          ${row('New paying', m.paying_new_week, 'this week')}
        </table>
      </div>
      <div style="font:400 11px 'Helvetica Neue',Arial,sans-serif;color:#52504C;margin-top:16px;">Full history at joinfides.com/d/reports</div>
    </div>
  </div>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const bearer = ((req.headers['authorization'] as string) || '').replace('Bearer ', '');
  const isCron = !!process.env.CRON_SECRET && bearer === process.env.CRON_SECRET;
  const adminSession = readSession(req);

  if (!isCron && !adminSession) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getAdminClient();
  const { data: metrics, error } = await supabase.rpc('admin_report_metrics');
  if (error || !metrics) {
    return res.status(500).json({ error: error?.message || 'metrics failed' });
  }
  const m = metrics as Metrics;

  const weekEnd = new Date();
  const weekStart = new Date(weekEnd.getTime() - 7 * 86400 * 1000);

  // Email on cron runs (or manual runs with ?email=1) when Resend is configured
  let emailedTo: string[] = [];
  const resendKey = process.env.RESEND_API_KEY;
  const wantEmail = isCron || req.query.email === '1';
  if (resendKey && wantEmail) {
    const to = allowedEmails();
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.REPORT_FROM || 'Fides Reports <onboarding@resend.dev>',
          to,
          subject: `Fides weekly — ${m.users_week} new users, ${m.paying_new_week} new paying`,
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
