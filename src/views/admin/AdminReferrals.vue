<template>
  <div class="referrals">
    <h1 class="page-title">Referrals</h1>
    <p class="subtitle">Friend referrals and partner/creator referrals — how many users came in, converted to Pro, and stayed on the app.</p>

    <div v-if="loading" class="note">Loading…</div>
    <div v-else-if="error" class="note err">{{ error }}</div>

    <template v-else>
      <!-- Headline stats -->
      <div class="statstrip">
        <div class="stat"><span class="n">{{ h.friend_referred }}</span><span class="l">Friend referred</span></div>
        <div class="stat"><span class="n">{{ h.partner_referred }}</span><span class="l">Partner referred</span></div>
        <div class="stat"><span class="n gold">{{ h.friend_paid + h.partner_paid }}</span><span class="l">Paid Pro (total)</span></div>
        <div class="stat"><span class="n good">{{ h.friend_stayed + h.partner_stayed }}</span><span class="l">Stayed on app</span></div>
      </div>

      <!-- Friend referral funnel -->
      <div class="section">
        <h2 class="section-title">Friend referral funnel</h2>
        <div class="funnel">
          <div v-for="s in friendFunnel" :key="s.key" class="funnel-row">
            <span class="fl-label">{{ s.label }}</span>
            <div class="fl-bar-wrap"><div class="fl-bar" :style="{ width: pct(s.value, h.friend_referred) + '%' }"></div></div>
            <span class="fl-val">{{ s.value }}</span>
            <span class="fl-pct">{{ pct(s.value, h.friend_referred) }}%</span>
          </div>
        </div>
        <p class="hint">"Stayed on app" = user has activity (XP) at least 14 days after their referral claim — i.e. they came back after the free Pro window.</p>
      </div>

      <!-- Partner referral funnel -->
      <div class="section">
        <h2 class="section-title">Partner / creator referral funnel</h2>
        <div class="funnel">
          <div v-for="s in partnerFunnel" :key="s.key" class="funnel-row">
            <span class="fl-label">{{ s.label }}</span>
            <div class="fl-bar-wrap"><div class="fl-bar" :style="{ width: pct(s.value, h.partner_referred) + '%' }"></div></div>
            <span class="fl-val">{{ s.value }}</span>
            <span class="fl-pct">{{ pct(s.value, h.partner_referred) }}%</span>
          </div>
        </div>
        <p class="hint">Partner-referred users get a free Pro grant on signup, so "Started trial / sub" and "Converted to paying" count real App Store activity only — never the free grant. "Converted to paying" = actually charged (a paid renewal or a direct paid purchase); an active trial counts under "Started", not paying.</p>
      </div>

      <!-- Best partners -->
      <div class="section">
        <h2 class="section-title">Best partners · conversion to paid</h2>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Partner</th>
                <th class="num">Signups</th>
                <th class="num" title="Free Pro window ended">Free over</th>
                <th class="num" title="Started a store subscription (trial or paid)">Started</th>
                <th class="num">Trials</th>
                <th class="num" title="Actually charged money">Paid</th>
                <th class="num" title="Churned after paying">Churned</th>
                <th class="num" title="Paid ÷ signups">Conv %</th>
                <th class="num">Stayed</th>
                <th class="num">Avg Pro left</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in partners" :key="p.code">
                <td>
                  <span class="creator-name">{{ p.creator_name }}</span>
                  <span v-if="p.creator_handle" class="creator-handle">{{ p.creator_handle }}</span>
                </td>
                <td class="num">{{ p.signups }}</td>
                <td class="num">{{ p.window_ended }}</td>
                <td class="num">{{ p.joined_pro }}</td>
                <td class="num">{{ p.trials }}</td>
                <td class="num gold">{{ p.paid_conversions }}</td>
                <td class="num">{{ p.churned }}</td>
                <td class="num">{{ p.pct_paid != null ? p.pct_paid + '%' : '—' }}</td>
                <td class="num">{{ p.stayed }}</td>
                <td class="num">{{ p.avg_pro_days_left }}d</td>
                <td><span class="status-pill" :class="p.active ? 'on' : 'off'">{{ p.active ? 'Active' : 'Paused' }}</span></td>
              </tr>
              <tr v-if="!partners.length"><td colspan="11" class="empty">No partner codes yet.</td></tr>
            </tbody>
          </table>
        </div>
        <p class="hint">"Avg Pro left" = average days remaining on the referred users' Pro subscriptions from now. 0 means their free Pro has expired.</p>
      </div>

      <!-- Best friend referrers -->
      <div class="section">
        <h2 class="section-title">Best friend referrers</h2>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Referrer</th>
                <th class="num">Referred</th>
                <th class="num">Activated</th>
                <th class="num">Started Pro</th>
                <th class="num">Paid</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in friendReferrers" :key="r.referrer_user_id">
                <td>
                  <span class="creator-name">{{ r.referrer_name || 'Pilgrim' }}</span>
                  <span v-if="r.referrer_username" class="creator-handle">@{{ r.referrer_username }}</span>
                </td>
                <td class="num">{{ r.total_referred }}</td>
                <td class="num">{{ r.activated }}</td>
                <td class="num">{{ r.started_pro }}</td>
                <td class="num gold">{{ r.paid }}</td>
              </tr>
              <tr v-if="!friendReferrers.length"><td colspan="5" class="empty">No friend referrals yet.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Partner referred users — Pro expiring -->
      <div class="section">
        <h2 class="section-title">Partner referred users · Pro time remaining</h2>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Code</th>
                <th>Redeemed</th>
                <th class="num">Pro days granted</th>
                <th class="num">Grant days left</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in expiring" :key="u.user_id" :class="{ expired: u.days_left === 0 && !u.paid }">
                <td>
                  <span class="creator-name">{{ u.referred_name || 'Pilgrim' }}</span>
                  <span v-if="u.referred_username" class="creator-handle">@{{ u.referred_username }}</span>
                </td>
                <td><code class="code">{{ u.code }}</code></td>
                <td>{{ formatDate(u.redeemed_at) }}</td>
                <td class="num">{{ u.pro_days_granted }}d</td>
                <td class="num">
                  <span v-if="u.days_left === null" class="lifetime">Lifetime</span>
                  <span v-else :class="daysLeftClass(u.days_left)">{{ u.days_left }}d</span>
                </td>
                <td><span class="status-pill" :class="u.status">{{ statusLabel(u.status) }}</span></td>
              </tr>
              <tr v-if="!expiring.length"><td colspan="6" class="empty">No partner-referred users yet.</td></tr>
            </tbody>
          </table>
        </div>
        <p class="hint">Shows the most recent 500 partner-referred users. "Days left" is how long until their free Pro expires — when it hits 0, they either convert to paid or drop to free.</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)
const error = ref('')
const headline = ref<any>({})
const friendReferrers = ref<any[]>([])
const partners = ref<any[]>([])
const expiring = ref<any[]>([])

const h = computed(() => headline.value)

const friendFunnel = computed(() => {
  const d = headline.value
  return [
    { key: 'referred',      label: 'Referred by a friend', value: d.friend_referred },
    { key: 'activated',      label: 'Activated (did a lesson)', value: d.friend_activated },
    { key: 'started_pro',    label: 'Started Pro / trial', value: d.friend_started_pro },
    { key: 'paid',           label: 'Converted to paid Pro', value: d.friend_paid },
    { key: 'stayed',         label: 'Stayed on app after Pro', value: d.friend_stayed },
  ]
})

const partnerFunnel = computed(() => {
  const d = headline.value
  return [
    { key: 'referred',      label: 'Referred by a partner', value: d.partner_referred },
    { key: 'window_ended',   label: 'Free Pro window ended', value: d.partner_window_ended },
    { key: 'started_pro',    label: 'Started trial / sub', value: d.partner_started_pro },
    { key: 'paid',           label: 'Converted to paying', value: d.partner_paid },
    { key: 'churned',        label: 'Churned after paying', value: d.partner_churned },
    { key: 'stayed',         label: 'Stayed on app after Pro', value: d.partner_stayed },
  ]
})

function pct(v: any, total: number): number {
  const n = Number(v)
  return total ? Math.round((n / total) * 100) : 0
}

function formatDate(d: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function statusLabel(s: string): string {
  switch (s) {
    case 'paid':
      return 'Paid'
    case 'trial':
      return 'Trial'
    case 'on_grant':
      return 'On free Pro'
    case 'lapsed':
      return 'Free ended'
    default:
      return 'Signed up'
  }
}

function daysLeftClass(d: number): string {
  if (d <= 0) return 'expired-text'
  if (d <= 3) return 'warn-text'
  return ''
}

onMounted(async () => {
  try {
    const res = await fetch('/api/dashboard?view=referrals')
    if (!res.ok) { error.value = 'Failed to load referral data.'; loading.value = false; return }
    const d = await res.json()
    headline.value = d.headline ?? {}
    friendReferrers.value = d.friend_referrers ?? []
    partners.value = d.partner_stats ?? []
    expiring.value = d.partner_pro_expiring ?? []
  } catch { error.value = 'Network error.' } finally { loading.value = false }
})
</script>

<style scoped>
.referrals { max-width: 1000px; }
.page-title { font-family: var(--serif); font-size: 24px; color: var(--text); font-weight: 700; margin: 0 0 6px; }
.subtitle { font-family: var(--sans); font-size: 13px; color: var(--text-3); margin: 0 0 22px; max-width: 620px; line-height: 1.5; }
.note { font-family: var(--sans); font-size: 13px; color: var(--text-3); padding: 20px 0; }
.note.err { color: #ff6b5e; }

.statstrip { display: flex; gap: 10px; margin-bottom: 26px; flex-wrap: wrap; }
.stat { flex: 1; min-width: 130px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 3px; }
.stat .n { font-family: var(--serif); font-size: 26px; color: var(--text); line-height: 1; }
.stat .n.gold { color: var(--gold-light); }
.stat .n.good { color: #34c759; }
.stat .l { font-family: var(--sans); font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; }

.section { margin-bottom: 34px; }
.section-title { font-family: var(--sans); font-size: 13px; color: var(--text-3); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 14px; }
.hint { font-family: var(--sans); font-size: 12px; color: var(--text-3); margin: 10px 0 0; line-height: 1.5; }
.hint b { color: var(--text); }

.funnel { display: flex; flex-direction: column; gap: 8px; }
.funnel-row { display: grid; grid-template-columns: 200px 1fr auto 46px; align-items: center; gap: 12px; }
.fl-label { font-family: var(--sans); font-size: 13px; color: var(--text-2); }
.fl-bar-wrap { height: 24px; background: var(--surface); border-radius: 6px; overflow: hidden; }
.fl-bar { height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold-light)); border-radius: 6px; }
.fl-val { font-family: var(--sans); font-size: 13px; color: var(--text); text-align: right; font-variant-numeric: tabular-nums; }
.fl-pct { font-family: var(--sans); font-size: 12px; color: var(--text-3); text-align: right; font-variant-numeric: tabular-nums; }

.table-scroll { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-family: var(--sans); font-size: 13px; }
.data-table th { background: var(--surface); color: var(--text-3); font-weight: 500; text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--line); white-space: nowrap; }
.data-table th.num, .data-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.data-table td { padding: 9px 12px; border-bottom: 0.5px solid var(--line); color: var(--text-2); }
.data-table td.num { color: var(--text); }
.data-table td.gold { color: var(--gold-light); font-weight: 600; }
.data-table tr.expired td { opacity: 0.55; }

.creator-name { color: var(--text); font-weight: 500; }
.creator-handle { color: var(--text-3); font-size: 11px; margin-left: 6px; }
.code { font-family: var(--sans); font-size: 12px; color: var(--gold-light); background: rgba(196,145,44,0.08); padding: 2px 7px; border-radius: 4px; }

.status-pill { font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 100px; white-space: nowrap; }
.status-pill.on { color: #34c759; background: rgba(52,199,89,0.12); }
.status-pill.off { color: var(--text-3); background: var(--surface); }
.status-pill.paid { color: #34c759; background: rgba(52,199,89,0.12); }
.status-pill.trial { color: var(--gold-light); background: rgba(196,145,44,0.12); }
.status-pill.on_grant { color: #5aa9e6; background: rgba(90,169,230,0.12); }
.status-pill.lapsed { color: var(--text-3); background: rgba(255,107,94,0.08); }

.lifetime { color: var(--gold-light); font-weight: 600; }
.warn-text { color: var(--streak); font-weight: 600; }
.expired-text { color: var(--text-3); }
.empty { text-align: center; color: var(--text-3); padding: 20px 0; }
</style>
