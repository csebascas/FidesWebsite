<template>
  <div class="revenue">
    <header class="head rise" style="--i: 0">
      <div>
        <h1 class="page-title">Revenue</h1>
        <div class="date">{{ sourceNote }}</div>
      </div>
    </header>

    <!-- Money stat strip -->
    <div class="statstrip rise" style="--i: 1">
      <template v-if="loading">
        <div v-for="i in 6" :key="i" class="stat">
          <div class="skeleton-number"></div>
          <div class="skeleton-label"></div>
        </div>
      </template>
      <template v-else>
        <div class="stat">
          <span class="n gold">{{ money(sw?.revenue_total) }}</span>
          <span class="l">Revenue</span>
          <span class="d" v-if="sw?.revenue_week">+{{ money(sw.revenue_week) }} this week</span>
        </div>
        <div class="stat"><span class="n">{{ sw?.active_trials ?? 0 }}</span><span class="l">Active trials</span></div>
        <div class="stat"><span class="n">{{ sw?.trials_total ?? funnel.trials ?? 0 }}</span><span class="l">Trials all-time</span></div>
        <div class="stat"><span class="n">{{ sw?.trial_conversions ?? 0 }}</span><span class="l">Trial converts</span></div>
        <div class="stat"><span class="n gold">{{ sw?.paying_monthly ?? 0 }}</span><span class="l">Paying monthly</span></div>
        <div class="stat"><span class="n gold">{{ sw?.paying_yearly ?? 0 }}</span><span class="l">Paying yearly</span></div>
      </template>
    </div>

    <!-- Profit estimate — gross revenue minus store/processor fees -->
    <div class="section rise" style="--i: 1.5">
      <h2 class="section-title">Profit Estimate — after store fees</h2>
      <div v-if="!platformRevenue.length" class="empty-text">Superwall data unavailable</div>
      <template v-else>
        <table class="ptable profit">
          <thead>
            <tr><th>Platform</th><th>Gross</th><th>Fee rate</th><th>Fees</th><th>Net</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in profitRows" :key="p.platform">
              <td class="pname">{{ p.label }}</td>
              <td>{{ money(p.gross) }}</td>
              <td>
                <input
                  type="number" class="rate-input" min="0" max="100" step="0.1"
                  :value="(feeRates[p.platform] * 100).toFixed(1)"
                  @input="setRatePct(p.platform, ($event.target as HTMLInputElement).value)"
                />%
              </td>
              <td class="muted">{{ money(p.fees) }}</td>
              <td class="prate">{{ money(p.net) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td class="pname">Total</td>
              <td>{{ money(profitTotal.gross) }}</td>
              <td></td>
              <td class="muted">{{ money(profitTotal.fees) }}</td>
              <td class="prate gold">{{ money(profitTotal.net) }}</td>
            </tr>
          </tfoot>
        </table>
        <p class="hint">
          Defaults assume Apple Small Business Program (15%) and Google Play's sub-$1M tier (15%) — both auto-apply at this revenue scale. Web fee rate is an estimate (typical card-processor rate); adjust any rate to match your actual terms. Lifetime gross, not just this period — no cost data (infra, API usage, etc.) is included, this is store/processor fees only.
        </p>
      </template>
    </div>

    <div class="rev-grid">
      <div class="rev-col">
        <!-- Acquisition funnel -->
        <div class="section rise" style="--i: 2">
          <h2 class="section-title">Conversion Funnel</h2>
          <div v-for="(s, i) in funnelStages" :key="s.label" class="fstage">
            <span class="fslabel">{{ s.label }}</span>
            <div class="fsbar-wrap">
              <div class="fsbar" :class="{ gold: i === funnelStages.length - 1 }" :style="{ width: s.pct + '%' }"></div>
            </div>
            <span class="fsn">{{ s.value }}</span>
            <span class="fsrate">{{ s.rate }}</span>
          </div>
        </div>

        <!-- Paywall funnel, last 30 days -->
        <div class="section rise" style="--i: 3">
          <h2 class="section-title">Paywall Funnel — 30 days</h2>
          <div v-if="!paywalls" class="empty-text">Superwall data unavailable</div>
          <template v-else>
            <div v-for="(s, i) in paywallStages" :key="s.label" class="fstage">
              <span class="fslabel">{{ s.label }}</span>
              <div class="fsbar-wrap">
                <div class="fsbar" :class="{ gold: i === paywallStages.length - 1 }" :style="{ width: s.pct + '%' }"></div>
              </div>
              <span class="fsn">{{ s.value }}</span>
              <span class="fsrate">{{ s.rate }}</span>
            </div>
            <div class="fnote">{{ funnel30.declines }} declined · {{ funnel30.tx_abandon }} abandoned checkout</div>
          </template>
        </div>

        <!-- Daily paywall activity -->
        <div v-if="dailyChart.length" class="section rise" style="--i: 4">
          <h2 class="section-title">Paywall Opens — daily</h2>
          <div class="chart">
            <div v-for="d in dailyChart" :key="d.day" class="chart-col" :title="`${d.day}: ${d.opens} opens, ${d.tx_complete} purchases`">
              <div class="chart-bar" :style="{ height: d.openPct + '%' }"></div>
              <div v-if="d.tx_complete" class="chart-bar buy" :style="{ height: d.buyPct + '%' }"></div>
            </div>
          </div>
          <div class="chart-legend">
            <span class="lg"><span class="lgdot"></span>Opens</span>
            <span class="lg"><span class="lgdot buy"></span>Purchases</span>
          </div>
        </div>
      </div>

      <div class="rev-col">
        <!-- Placement performance -->
        <div class="section rise" style="--i: 2">
          <h2 class="section-title">Paywall Placements — all time</h2>
          <div v-if="!placements.length" class="empty-text">No paywall opens recorded</div>
          <table v-else class="ptable">
            <thead>
              <tr><th>Placement</th><th>Views</th><th>Users</th><th>Trials</th><th>Conv.</th></tr>
            </thead>
            <tbody>
              <tr v-for="p in placements" :key="p.placement">
                <td class="pname">{{ p.placement }}</td>
                <td>{{ p.views }}</td>
                <td>{{ p.users }}</td>
                <td :class="{ 'has-trials': p.trials > 0 }">{{ p.trials + p.purchases }}</td>
                <td class="prate">{{ convRate(p) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Subscription events, 30d -->
        <div class="section rise" style="--i: 3">
          <h2 class="section-title">Subscription Events — 30 days</h2>
          <div v-if="!eventTypeRows.length" class="empty-text">No webhook events yet — the log started July 8, 2026</div>
          <div v-for="e in eventTypeRows" :key="e.label" class="bar-row">
            <span class="bn">{{ e.label }}</span>
            <div class="bar-wrap"><div class="bar" :style="{ width: pct(e.count, maxEventType) + '%' }"></div></div>
            <span class="bc">{{ e.count }}</span>
          </div>
        </div>

        <!-- Recent events feed -->
        <div class="section rise" style="--i: 4">
          <h2 class="section-title">Recent Events</h2>
          <div v-if="!recentEvents.length" class="empty-text">Nothing yet — new trials, renewals and cancellations land here</div>
          <div v-for="(e, i) in recentEvents" :key="i" class="frow">
            <span class="fava" :class="eventTone(e.event)">{{ initials(e.user_name) }}</span>
            <span class="ftext">
              <router-link v-if="e.user_id" :to="`/d/users?user=${e.user_id}`" class="flink strong">{{ e.user_name }}</router-link>
              <strong v-else>{{ e.user_name }}</strong>
              {{ eventLabel(e) }}
              <span v-if="e.product_id" class="fprod">{{ productLabel(e.product_id) }}</span>
            </span>
            <span class="ftime">{{ timeAgo(e.occurred_at) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { cachedFetch } from '../../lib/apiCache'

const loading = ref(true)
const funnel = ref<any>({})
const eventsByType = ref<Record<string, number>>({})
const recentEvents = ref<any[]>([])
const sw = ref<any>(null)
const paywalls = ref<any>(null)
const swError = ref<string | null>(null)
const platformRevenue = ref<{ platform: 'ios' | 'android' | 'web'; revenue_total: number; revenue_week: number }[]>([])

const sourceNote = computed(() => {
  if (sw.value) return 'Money and paywall numbers from Superwall (store history) · funnel from Supabase'
  return swError.value
    ? `Superwall unreachable (${swError.value}) — showing Supabase-only numbers`
    : 'Superwall unreachable — showing Supabase-only numbers'
})

// Store/processor fee estimate. iOS and Android default to 15% — both Apple's
// Small Business Program and Google Play's sub-$1M annual tier land there
// automatically at this revenue scale, no enrollment action needed once
// under the threshold. "Web" is a promotional/direct checkout, NOT an app-
// store purchase, so it owes no Apple/Google commission at all — defaulted
// to a typical card-processor rate instead, clearly flagged as an estimate.
// All three are editable in case actual terms differ.
const PLATFORM_LABELS: Record<string, string> = { ios: 'iOS (App Store)', android: 'Android (Play Store)', web: 'Web (processor)' }
const feeRates = ref<Record<string, number>>({ ios: 0.15, android: 0.15, web: 0.032 })

function setRatePct(platform: string, value: string) {
  const pct = Number(value)
  if (Number.isFinite(pct) && pct >= 0 && pct <= 100) feeRates.value[platform] = pct / 100
}

const profitRows = computed(() =>
  platformRevenue.value.map(p => {
    const rate = feeRates.value[p.platform] ?? 0
    const fees = p.revenue_total * rate
    return { platform: p.platform, label: PLATFORM_LABELS[p.platform] ?? p.platform, gross: p.revenue_total, fees, net: p.revenue_total - fees }
  })
)

const profitTotal = computed(() =>
  profitRows.value.reduce((a, r) => ({ gross: a.gross + r.gross, fees: a.fees + r.fees, net: a.net + r.net }), { gross: 0, fees: 0, net: 0 })
)

function money(n: number | undefined | null): string {
  return `$${(n ?? 0).toFixed(2)}`
}

function pct(value: number, max: number) {
  return max ? Math.round((value / max) * 100) : 0
}

function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/)
  const first = parts[0]?.[0] || '·'
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Downloads → Users → Trials → Paying, each with % of the previous stage.
// Trials/paying prefer Superwall (full store history); our webhook log only
// starts 2026-07-08.
const funnelStages = computed(() => {
  const downloads = funnel.value.downloads ?? 0
  const users = funnel.value.users ?? 0
  const trials = sw.value?.trials_total ?? funnel.value.trials ?? 0
  const paying = sw.value ? (sw.value.paying_monthly ?? 0) + (sw.value.paying_yearly ?? 0) : funnel.value.pro ?? 0
  const stages = [
    { label: 'Downloads', value: downloads },
    { label: 'Sign-ups', value: users },
    { label: 'Trials', value: trials },
    { label: 'Paying', value: paying },
  ]
  const max = Math.max(stages[0].value, 1)
  return stages.map((s, i) => ({
    ...s,
    pct: Math.max(Math.round((s.value / max) * 100), s.value > 0 ? 2 : 0),
    rate: i === 0 ? '' : stages[i - 1].value > 0 ? `${Math.round((s.value / stages[i - 1].value) * 100)}%` : '—',
  }))
})

const funnel30 = computed(() => {
  const t = { opens: 0, declines: 0, tx_start: 0, tx_complete: 0, tx_abandon: 0 }
  for (const d of paywalls.value?.daily ?? []) {
    t.opens += d.opens; t.declines += d.declines
    t.tx_start += d.tx_start; t.tx_complete += d.tx_complete; t.tx_abandon += d.tx_abandon
  }
  return t
})

const paywallStages = computed(() => {
  const t = funnel30.value
  const stages = [
    { label: 'Opens', value: t.opens },
    { label: 'Checkout', value: t.tx_start },
    { label: 'Purchased', value: t.tx_complete },
  ]
  const max = Math.max(stages[0].value, 1)
  return stages.map((s, i) => ({
    ...s,
    pct: Math.max(Math.round((s.value / max) * 100), s.value > 0 ? 2 : 0),
    rate: i === 0 ? '' : stages[i - 1].value > 0 ? `${Math.round((s.value / stages[i - 1].value) * 100)}%` : '—',
  }))
})

const dailyChart = computed(() => {
  const days: any[] = paywalls.value?.daily ?? []
  const max = Math.max(...days.map((d) => d.opens), 1)
  return days.slice(-30).map((d) => ({
    ...d,
    openPct: Math.max(Math.round((d.opens / max) * 100), d.opens > 0 ? 6 : 2),
    buyPct: Math.max(Math.round((d.tx_complete / max) * 100), d.tx_complete > 0 ? 6 : 0),
  }))
})

const placements = computed(() => paywalls.value?.placements ?? [])

function convRate(p: any): string {
  if (!p.users) return '—'
  return `${Math.round(((p.trials + p.purchases) / p.users) * 100)}%`
}

const EVENT_LABELS: Record<string, string> = {
  initial_purchase: 'Purchases',
  renewal: 'Renewals',
  cancellation: 'Cancellations',
  uncancellation: 'Resubscribes',
  expiration: 'Expirations',
  billing_issue: 'Billing issues',
  product_change: 'Plan changes',
  non_renewing_purchase: 'One-time purchases',
}

const eventTypeRows = computed(() =>
  Object.entries(eventsByType.value)
    .map(([event, count]) => ({ label: EVENT_LABELS[event] || event, count: count as number }))
    .sort((a, b) => b.count - a.count)
)

const maxEventType = computed(() => Math.max(...eventTypeRows.value.map((e) => e.count), 1))

function eventLabel(e: any): string {
  const trial = (e.period_type || '').toUpperCase() === 'TRIAL'
  switch (e.event) {
    case 'initial_purchase': return trial ? 'started a trial' : 'purchased'
    case 'renewal': return 'renewed'
    case 'cancellation': return trial ? 'cancelled their trial' : 'cancelled'
    case 'uncancellation': return 'resubscribed'
    case 'expiration': return 'expired'
    case 'billing_issue': return 'hit a billing issue'
    case 'product_change': return 'changed plan'
    default: return e.event
  }
}

function eventTone(event: string): string {
  if (event === 'initial_purchase' || event === 'renewal' || event === 'uncancellation') return 'gold'
  if (event === 'cancellation' || event === 'expiration' || event === 'billing_issue') return 'bad'
  return ''
}

function productLabel(productId: string): string {
  const p = productId.toLowerCase()
  if (p.includes('year')) return 'yearly'
  if (p.includes('month')) return 'monthly'
  return productId
}

onMounted(async () => {
  try {
    const res = await cachedFetch('/api/dashboard?view=revenue')
    if (res.ok) {
      const d = await res.json()
      funnel.value = d.funnel || {}
      eventsByType.value = d.events_30d || {}
      recentEvents.value = d.recent_events || []
      sw.value = d.superwall || null
      paywalls.value = d.paywalls || null
      swError.value = d.superwall_error || null
      platformRevenue.value = d.platform_revenue || []
    }
  } catch { /* keep defaults */ }
  loading.value = false
})
</script>

<style scoped>
.revenue { max-width: 1080px; }

.rise {
  opacity: 0;
  animation: rise 0.18s ease-out forwards;
  animation-delay: calc(var(--i, 0) * 30ms);
}
@keyframes rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

.head { margin-bottom: 22px; }
.page-title { font-family: var(--serif); font-size: 23px; color: var(--text); font-weight: 600; margin: 0; }
.date { font-family: var(--sans); font-size: 11px; color: var(--text-3); margin-top: 3px; }

/* Stat strip — same treatment as the Dashboard */
.statstrip {
  display: flex;
  background: var(--surface);
  border-radius: 10px;
  padding: 18px 0;
  margin-bottom: 26px;
}
.stat {
  flex: 1;
  padding: 0 20px;
  border-right: 0.5px solid #242424;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.stat:last-child { border-right: none; }
.stat .n { font-family: var(--sans); font-size: 24px; font-weight: 700; letter-spacing: -0.3px; color: var(--text); }
.stat .n.gold { color: var(--gold-light); }
.stat .l { font-family: var(--sans); font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text-3); }
.stat .d { font-family: var(--sans); font-size: 10px; color: #7FB08A; }

.skeleton-number { width: 44px; height: 24px; background: var(--raised); border-radius: 4px; animation: pulse 1.5s ease-in-out infinite; }
.skeleton-label { width: 62px; height: 9px; background: var(--raised); border-radius: 3px; animation: pulse 1.5s ease-in-out infinite; animation-delay: 0.1s; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.rev-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 34px; }
.section { margin-bottom: 26px; }
.section-title {
  font-family: var(--sans); font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.8px; color: var(--text-3); margin: 0 0 6px;
}
.empty-text { font-family: var(--sans); font-size: 12.5px; color: var(--text-3); padding: 9px 2px; }

/* Funnel stages */
.fstage { display: flex; align-items: center; gap: 10px; padding: 7px 2px; font-family: var(--sans); font-size: 11.5px; }
.fslabel { width: 76px; color: var(--text-2); flex-shrink: 0; }
.fsbar-wrap { flex: 1; height: 14px; background: var(--raised); border-radius: 3px; overflow: hidden; }
.fsbar { height: 100%; background: #3A3A3A; border-radius: 3px; transition: width 0.25s ease-out; }
.fsbar.gold { background: var(--gold); }
.fsn { width: 44px; text-align: right; font-weight: 700; color: var(--text); flex-shrink: 0; font-variant-numeric: tabular-nums; }
.fsrate { width: 40px; text-align: right; font-size: 10.5px; color: var(--text-3); flex-shrink: 0; font-variant-numeric: tabular-nums; }
.fnote { font-family: var(--sans); font-size: 10.5px; color: var(--text-3); padding: 6px 2px 0; }

/* Daily chart */
.chart { display: flex; align-items: flex-end; gap: 2px; height: 72px; padding: 8px 2px 0; }
.chart-col { flex: 1; position: relative; height: 100%; display: flex; align-items: flex-end; }
.chart-bar { width: 100%; background: var(--raised); border-radius: 1.5px; min-height: 1px; }
.chart-bar.buy { position: absolute; left: 0; bottom: 0; background: var(--gold); }
.chart-legend { display: flex; gap: 14px; padding: 8px 2px 0; }
.lg { display: flex; align-items: center; gap: 5px; font-family: var(--sans); font-size: 10px; color: var(--text-3); }
.lgdot { width: 7px; height: 7px; border-radius: 2px; background: var(--raised); }
.lgdot.buy { background: var(--gold); }

/* Placement table */
.ptable { width: 100%; border-collapse: collapse; font-family: var(--sans); font-size: 11.5px; }
.ptable th {
  text-align: right; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
  color: var(--text-3); padding: 6px 2px; border-bottom: 0.5px solid var(--line); white-space: nowrap;
}
.ptable th:first-child { text-align: left; }
.ptable td {
  text-align: right; padding: 8px 2px; border-bottom: 0.5px solid var(--line);
  color: var(--text-2); font-variant-numeric: tabular-nums;
}
.ptable tr:last-child td { border-bottom: none; }
.ptable .pname { text-align: left; color: var(--text); }
.ptable .has-trials { color: var(--gold-light); font-weight: 600; }
.ptable .prate { color: var(--text-3); }
.ptable .prate.gold { color: var(--gold-light); font-weight: 700; }
.ptable .muted { color: var(--text-3); }
.ptable.profit tfoot td { border-top: 0.5px solid var(--line); border-bottom: none; padding-top: 10px; font-weight: 600; }
.rate-input {
  width: 44px; text-align: right; font-family: var(--sans); font-size: 11.5px; font-variant-numeric: tabular-nums;
  background: var(--raised); border: 0.5px solid var(--line); border-radius: 4px; color: var(--text);
  padding: 3px 4px; margin-right: 2px;
}
.rate-input:focus { outline: none; border-color: var(--gold); }
.hint { font-family: var(--sans); font-size: 11px; color: var(--text-3); margin: 12px 0 0; line-height: 1.5; }

/* Event type bars — same as Dashboard bar rows */
.bar-row { display: flex; align-items: center; gap: 10px; padding: 7px 2px; font-family: var(--sans); font-size: 11.5px; }
.bn { width: 110px; color: var(--text-2); flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-wrap { flex: 1; height: 4px; background: var(--raised); border-radius: 2px; overflow: hidden; }
.bar { height: 100%; background: var(--gold); border-radius: 2px; transition: width 0.25s ease-out; }
.bc { width: 30px; text-align: right; font-weight: 600; color: var(--text-2); flex-shrink: 0; font-variant-numeric: tabular-nums; font-size: 11px; }

/* Recent events feed — same as Dashboard activity */
.frow {
  display: flex; align-items: center; gap: 11px; padding: 9px 2px;
  border-bottom: 0.5px solid var(--line);
  font-family: var(--sans); font-size: 12px; color: var(--text-2);
}
.frow:last-child { border-bottom: none; }
.fava {
  width: 22px; height: 22px; border-radius: 11px; flex-shrink: 0;
  background: var(--raised); color: var(--text-2);
  font-size: 9px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.fava.gold { background: rgba(196, 145, 44, 0.08); color: var(--gold-light); }
.fava.bad { background: rgba(212, 103, 58, 0.08); color: var(--streak); }
.ftext { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ftext strong { color: var(--text); font-weight: 600; }
.fprod { color: var(--text-3); font-size: 11px; }
.flink { color: var(--gold-light); text-decoration: none; }
.flink.strong { font-weight: 600; }
.flink:hover { text-decoration: underline; }
.ftime { font-size: 10.5px; color: var(--text-3); flex-shrink: 0; }

@media (max-width: 900px) {
  .statstrip { flex-wrap: wrap; padding: 8px 0; }
  .stat { flex: 1 1 33%; padding: 10px 20px; border-right: none; }
  .rev-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .stat { flex: 1 1 50%; }
}
</style>
