# Admin Dashboard — Setup Guide

What's left to do by hand after the July 2026 redesign (one-step login, 30-day
sessions, two admins, weekly report). Everything code-side is already done;
this is the Supabase + Vercel checklist.

## 1. Supabase — admin accounts (5 min)

Dashboard → **Authentication → Users** (project `huwcgdlarvmmjurysqar`):

1. **Sebastian — `sbastiancastro08@gmail.com`**
   No auth user exists for this address yet. Click **Add user → Create new user**,
   enter the email, check "Auto Confirm User", and either set a password there
   or use **Send password recovery** afterwards so you pick it yourself.
2. **Ryan — `ryanjburke34@gmail.com`**
   Auth user already exists (created 2026-07-05). He likely signed up through
   the app, so he may not have a dashboard-friendly password. Send him a
   **password recovery** email from the same screen; the password he sets works
   for both app and dashboard.

Nothing else is needed in Supabase — the dashboard checks credentials against
these auth users and the `ADMIN_EMAILS` allowlist below. The
`subscription_events` / `admin_weekly_reports` tables and the
`admin_report_metrics()` function were already applied
(migration `20260708130000`), and the `superwall-webhook` edge function (v17)
is already logging events.

## 2. Vercel — environment variables (5 min)

Project **fides-website** → Settings → Environment Variables (Production):

| Variable | Value | Notes |
|---|---|---|
| `ADMIN_EMAILS` | `sbastiancastro08@gmail.com,ryanjburke34@gmail.com` | replaces the old single-admin value — double-check spelling, a typo locks that person out |
| `ADMIN_SESSION_SECRET` | any long random string (`openssl rand -hex 32`) | optional — falls back to the service-role key if unset |
| `CRON_SECRET` | another random string | Vercel automatically sends it as a bearer token on cron calls; without it the Monday cron gets 401 |
| `RESEND_API_KEY` | from resend.com | optional — without it the report still runs + saves, it just doesn't email |
| `SUPERWALL_API_KEY` | org API key from Superwall → app settings → API Keys (data:read scope is enough) | powers money made / trials / paying in the report with full store history; without it those numbers fall back to our own event log (which only starts 2026-07-08) |
| `REPORT_FROM` | `Fides Reports <reports@joinfides.com>` | optional — requires verifying joinfides.com in Resend first; defaults to Resend's onboarding sender |
| `ADMIN_ACCESS_CODE` | — | **delete it** — the access-code gate is gone |

Then **redeploy** so the new values are picked up.

## 3. Resend (optional, for the emailed report) (10 min)

1. Create a free account at resend.com (100 emails/day free — the report sends 1/week).
2. Verify the `joinfides.com` domain (add the DNS records they show).
3. Create an API key → paste into `RESEND_API_KEY` on Vercel.
4. Set `REPORT_FROM` to a sender on the verified domain.

## 4. Sanity check after deploy

- `/d/login` — one screen, no access code. Sign in with each account.
- Session should survive past an hour (old dashboard silently logged out at ~60 min).
- Sign out actually signs out (this was broken before — cookie path bug).
- `/d/reports` → **Run now** — downloads/users totals should be non-zero
  immediately; trial + paying numbers start at 0 and grow as Superwall events
  arrive (history can't be backfilled).
- Monday after 13:00 UTC: a row appears in Reports, and an email lands in both
  inboxes if Resend is configured.

## How the pieces fit

- **Login**: email+password → Supabase auth check → `ADMIN_EMAILS` allowlist →
  signed (HMAC) httpOnly cookie, 30 days. No more access-code pre-gate; rate
  limiting stayed (5 tries / 15 min / IP).
- **Weekly report**: Vercel cron (Mon 13:00 UTC) → `/api/reports/weekly` →
  Postgres `admin_report_metrics()` → snapshot in `admin_weekly_reports` →
  Resend email to `ADMIN_EMAILS`.
- **Trial vs paying**: the Superwall webhook now inserts every store event into
  `subscription_events` (product, period type). TRIAL `initial_purchase` = trial
  signup; first non-TRIAL charge = paying. Monthly/yearly split matches the
  product id (`%month%` / `%year%`).
