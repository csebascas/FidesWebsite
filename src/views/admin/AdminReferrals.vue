<template>
  <div class="referrals">
    <h1 class="page-title">Referrals</h1>
    <p class="subtitle">Where referred users are in the funnel — from free Pro to an actual paid subscription.</p>

    <div v-if="loading" class="note">Loading…</div>
    <div v-else-if="error" class="note err">{{ error }}</div>

    <template v-else>
      <!-- One-line read on the whole thing -->
      <p class="insight">
        {{ totalReferred }} people came in through referrals and nearly all took their free Pro.
        <b>{{ totalActivated }} did a lesson</b> and <b>{{ totalActive }} are still active this fortnight</b>, but
        <span :class="totalPaid ? 'good' : 'bad'">{{ totalPaid }} {{ totalPaid === 1 ? 'has' : 'have' }} converted to a paid subscription</span>.
        The referrals are landing on engagement — the gap is getting them to pay.
      </p>

      <!-- Headline KPIs -->
      <div class="kpis">
        <div class="kpi">
          <span class="n">{{ totalReferred }}</span><span class="l">People referred</span>
          <span class="sub">{{ h.partner_referred || 0 }} partner · {{ h.friend_referred || 0 }} friend</span>
        </div>
        <div class="kpi">
          <span class="n gold">{{ totalActivated }}</span><span class="l">Activated</span>
          <span class="sub">did at least one lesson</span>
        </div>
        <div class="kpi">
          <span class="n good">{{ totalActive }}</span><span class="l">Still active</span>
          <span class="sub">did a lesson in the last 14 days</span>
        </div>
        <div class="kpi">
          <span class="n" :class="totalPaid ? 'good' : 'warn'">{{ totalPaid }}</span><span class="l">Paid conversions</span>
          <span class="sub">actually charged</span>
        </div>
      </div>

      <!-- What to watch -->
      <div v-if="h.partner_lapsed" class="callout">
        <span class="dot"></span>
        <p><b>{{ h.partner_lapsed }} partner-referred {{ h.partner_lapsed === 1 ? 'user' : 'users' }}</b> finished the free window and never started a subscription. Worth testing a paywall nudge as the grant runs out.</p>
      </div>

      <!-- Two funnels -->
      <div class="section-title">Funnels</div>
      <div class="grid2">
        <div class="card">
          <h3>Friends</h3>
          <p class="cap">Invited by an existing user</p>
          <FunnelStep label="Referred" :value="h.friend_referred" :total="h.friend_referred" />
          <FunnelStep label="Activated" :value="h.friend_activated" :total="h.friend_referred" tone="blue" />
          <FunnelStep label="Started sub" :value="h.friend_started_pro" :total="h.friend_referred" tone="soft" />
          <FunnelStep label="Paid" :value="h.friend_paid" :total="h.friend_referred" tone="paid" />
        </div>
        <div class="card">
          <h3>Partners &amp; creators</h3>
          <p class="cap">Redeemed a creator code (free 2-week Pro)</p>
          <FunnelStep label="Signups" :value="h.partner_referred" :total="h.partner_referred" />
          <FunnelStep label="Free window over" :value="h.partner_window_ended" :total="h.partner_referred" tone="soft" />
          <FunnelStep label="Started sub" :value="h.partner_started_pro" :total="h.partner_referred" tone="soft" />
          <FunnelStep label="Paid" :value="h.partner_paid" :total="h.partner_referred" tone="paid" />
        </div>
      </div>

      <!-- Partner leaderboard -->
      <div class="section-title">Partners · who drives signups &amp; who converts</div>
      <div class="card pad0">
        <div class="table-scroll">
          <table class="lead">
            <thead>
              <tr>
                <th>Creator</th>
                <th class="num">Signups</th>
                <th class="where">Where they are now</th>
                <th class="num">Trial</th>
                <th class="num">Paid</th>
                <th class="num">Conv</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in partners" :key="p.code">
                <td>
                  <span class="cname">{{ p.creator_name }}</span>
                  <span v-if="p.creator_handle" class="chandle">{{ p.creator_handle }}</span>
                </td>
                <td class="num">{{ p.signups }}</td>
                <td>
                  <div class="stack" :title="stackTitle(p)">
                    <span class="sg" :style="{ width: pctOf(p.on_grant, p.signups) + '%' }"></span>
                    <span class="st" :style="{ width: pctOf(p.trials, p.signups) + '%' }"></span>
                    <span class="sp" :style="{ width: pctOf(p.paid_conversions, p.signups) + '%' }"></span>
                    <span class="sw" :style="{ width: pctOf(p.lapsed, p.signups) + '%' }"></span>
                  </div>
                </td>
                <td class="num">{{ p.trials }}</td>
                <td class="num gold">{{ p.paid_conversions }}</td>
                <td class="num">
                  <span v-if="p.signups" class="pill" :class="p.paid_conversions ? 'some' : 'zero'">{{ p.pct_paid ?? 0 }}%</span>
                  <span v-else class="muted">—</span>
                </td>
              </tr>
              <tr v-if="!partners.length"><td colspan="6" class="empty">No partner codes yet.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="legend">
          <span><i class="sg"></i>On free Pro now</span>
          <span><i class="st"></i>In trial</span>
          <span><i class="sp"></i>Paid</span>
          <span><i class="sw"></i>Lapsed (free ended, no purchase)</span>
        </div>
      </div>

      <!-- Friend referrers -->
      <div class="section-title" style="margin-top:34px">Friends · top referrers</div>
      <div class="card pad0">
        <div class="table-scroll">
          <table class="lead">
            <thead>
              <tr><th>Referrer</th><th class="num">Referred</th><th class="num">Activated</th><th class="num">Paid</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in friendReferrers" :key="r.referrer_user_id">
                <td>
                  <span class="cname">{{ r.referrer_name || 'Pilgrim' }}</span>
                  <span v-if="r.referrer_username" class="chandle">@{{ r.referrer_username }}</span>
                </td>
                <td class="num">{{ r.total_referred }}</td>
                <td class="num">{{ r.activated }}</td>
                <td class="num gold">{{ r.paid }}</td>
              </tr>
              <tr v-if="!friendReferrers.length"><td colspan="4" class="empty">No friend referrals yet.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h as vnode } from 'vue'

const loading = ref(true)
const error = ref('')
const headline = ref<any>({})
const friendReferrers = ref<any[]>([])
const partners = ref<any[]>([])

const h = computed(() => headline.value)
const numv = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0)

const totalReferred = computed(() => numv(h.value.friend_referred) + numv(h.value.partner_referred))
const totalActivated = computed(() => numv(h.value.friend_activated) + numv(h.value.partner_activated))
const totalActive = computed(() => numv(h.value.friend_active) + numv(h.value.partner_active))
const totalPaid = computed(() => numv(h.value.friend_paid) + numv(h.value.partner_paid))

function pctOf(v: any, total: any): number {
  const t = numv(total)
  return t ? Math.round((numv(v) / t) * 100) : 0
}

function stackTitle(p: any): string {
  return `On free Pro ${numv(p.on_grant)} · In trial ${numv(p.trials)} · Paid ${numv(p.paid_conversions)} · Lapsed ${numv(p.lapsed)}`
}

// Inline funnel-step renderer: label · proportion bar · value + %.
const FunnelStep = (props: { label: string; value: any; total: any; tone?: string }) => {
  const val = numv(props.value)
  const total = numv(props.total)
  const pct = total ? Math.round((val / total) * 100) : 0
  const tone = props.tone || 'primary'
  const isBase = props.label === 'Referred' || props.label === 'Signups'
  return vnode('div', { class: 'step' }, [
    vnode('span', { class: 'sl' }, props.label),
    vnode('div', { class: 'track' }, [
      vnode('div', { class: `fill ${tone}`, style: { width: Math.max(pct, val > 0 ? 3 : 0) + '%' } }),
    ]),
    vnode('span', { class: 'val' + (val === 0 ? ' zero' : '') }, [
      vnode('b', {}, String(val)),
      isBase ? '' : ` · ${pct}%`,
    ]),
  ])
}

async function load() {
  loading.value = true
  try {
    const res = await fetch('/api/dashboard?view=referrals')
    if (!res.ok) { error.value = 'Failed to load referral data.'; loading.value = false; return }
    const d = await res.json()
    headline.value = d.headline ?? {}
    friendReferrers.value = d.friend_referrers ?? []
    partners.value = d.partner_stats ?? []
  } catch { error.value = 'Network error.' } finally { loading.value = false }
}

onMounted(load)
</script>

<style scoped>
.referrals { max-width: 1000px; }
.page-title { font-family: var(--serif); font-size: 24px; color: var(--text); font-weight: 700; margin: 0 0 6px; }
.subtitle { font-family: var(--sans); font-size: 13px; color: var(--text-3); margin: 0 0 22px; max-width: 620px; line-height: 1.5; }
.note { font-family: var(--sans); font-size: 13px; color: var(--text-3); padding: 20px 0; }
.note.err { color: #ff6b5e; }

.insight {
  font-family: var(--serif); font-size: 18px; line-height: 1.45; color: var(--text);
  margin: 0 0 26px; max-width: 640px;
}
.insight b { color: var(--gold-light); font-weight: 600; }
.insight .bad { color: #d4673a; }
.insight .good { color: #34c759; }

.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
.kpi { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 15px 17px; display: flex; flex-direction: column; }
.kpi .n { font-family: var(--serif); font-size: 28px; line-height: 1; font-variant-numeric: tabular-nums; }
.kpi .n.gold { color: var(--gold-light); }
.kpi .n.good { color: #34c759; }
.kpi .n.warn { color: #d4673a; }
.kpi .l { font-family: var(--sans); font-size: 11.5px; color: var(--text-3); margin-top: 8px; }
.kpi .sub { font-family: var(--sans); font-size: 11px; color: var(--text-3); opacity: .7; margin-top: 2px; }

.callout { display: flex; gap: 13px; align-items: flex-start; background: rgba(212,103,58,.07); border: 1px solid rgba(212,103,58,.25); border-radius: 10px; padding: 14px 16px; margin: 0 0 30px; }
.callout .dot { width: 8px; height: 8px; border-radius: 50%; background: #d4673a; margin-top: 7px; flex: none; }
.callout p { margin: 0; font-family: var(--sans); font-size: 13px; color: var(--text-2); line-height: 1.5; }
.callout b { color: #d4673a; }

.section-title { font-family: var(--sans); font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--text-3); margin: 0 0 14px; font-weight: 500; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 34px; }

.card { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 20px; }
.card.pad0 { padding: 16px 16px 14px; }
.card h3 { font-family: var(--serif); font-weight: 600; font-size: 17px; color: var(--text); margin: 0 0 2px; }
.card .cap { font-family: var(--sans); font-size: 12px; color: var(--text-3); margin: 0 0 18px; }

.table-scroll { overflow-x: auto; }

:deep(.step) { display: grid; grid-template-columns: 122px 1fr 74px; align-items: center; gap: 12px; margin-bottom: 11px; }
:deep(.step .sl) { font-family: var(--sans); font-size: 12.5px; color: var(--text); }
:deep(.step .track) { height: 22px; background: var(--bg, #0c0c0c); border-radius: 5px; overflow: hidden; }
:deep(.step .fill) { height: 100%; border-radius: 5px; min-width: 0; }
:deep(.step .fill.primary) { background: linear-gradient(90deg, #3a3126, var(--gold)); }
:deep(.step .fill.soft) { background: #6e5a34; }
:deep(.step .fill.blue) { background: #5a93c4; }
:deep(.step .fill.paid) { background: #34c759; }
:deep(.step .val) { text-align: right; font-family: var(--sans); font-size: 12.5px; font-variant-numeric: tabular-nums; color: var(--text-3); }
:deep(.step .val b) { color: var(--text); font-weight: 600; }
:deep(.step .val.zero b) { color: #d4673a; }

table.lead { width: 100%; border-collapse: collapse; font-family: var(--sans); font-size: 13px; }
table.lead th { text-align: left; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; color: var(--text-3); font-weight: 500; padding: 4px 10px 10px; white-space: nowrap; }
table.lead th.num, table.lead td.num { text-align: right; font-variant-numeric: tabular-nums; }
table.lead th.where { width: 170px; }
table.lead td { padding: 11px 10px; border-top: 1px solid var(--line); color: var(--text-2); }
table.lead td.gold { color: var(--gold-light); font-weight: 600; }
.cname { color: var(--text); font-weight: 500; }
.chandle { color: var(--text-3); font-size: 11px; margin-left: 6px; }
.muted { color: var(--text-3); }
.empty { text-align: center; color: var(--text-3); padding: 22px 0; }

.stack { display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: var(--bg, #0c0c0c); width: 160px; }
.stack span { display: block; height: 100%; }
.sg { background: #5a93c4; }
.st { background: var(--gold); }
.sp { background: #34c759; }
.sw { background: #d4673a; opacity: .7; }
.pill { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 100px; }
.pill.zero { color: #d4673a; background: rgba(212,103,58,.12); }
.pill.some { color: #34c759; background: rgba(52,199,89,.14); }
.legend { display: flex; gap: 16px; margin: 14px 4px 2px; font-family: var(--sans); font-size: 11px; color: var(--text-3); flex-wrap: wrap; }
.legend i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }

@media (max-width: 720px) {
  .kpis { grid-template-columns: repeat(2, 1fr); }
  .grid2 { grid-template-columns: 1fr; }
}
</style>
