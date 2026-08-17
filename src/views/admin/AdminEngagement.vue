<template>
  <div class="engagement">
    <h1 class="page-title">Engagement</h1>
    <p class="subtitle">Notifications, offers, and league competition: the loops that bring people back.</p>

    <div v-if="loading" class="note">Loading…</div>
    <div v-else-if="error" class="note err">{{ error }}</div>

    <template v-else>
      <div class="grid2">
        <!-- Offer funnel -->
        <div class="section">
          <h2 class="section-title">Win-back offer funnel</h2>
          <p class="hint">{{ offerCaption }}</p>
          <FunnelBars v-if="offerRows.length" :rows="offerRows" />
          <p v-else class="note small">No offers sent yet.</p>
          <p v-if="offerRows.length" class="hint">
            {{ ttcCaption }}
          </p>
        </div>

        <!-- Notification opt-in -->
        <div class="section">
          <h2 class="section-title">Notification opt-in</h2>
          <p class="hint">% of users with each kind on.</p>
          <FunnelBars v-if="optinRows.length" :rows="optinRows" />
          <p v-else class="note small">No opt-in data yet.</p>
        </div>
      </div>

      <!-- Notification sends -->
      <div class="section">
        <h2 class="section-title">Notification sends</h2>
        <div v-if="sends.length" class="sends-list">
          <div class="sends-row" v-for="s in sends" :key="s.kind">
            <span class="sk">{{ s.kind }}</span>
            <span class="sv">{{ s.sends }}</span>
          </div>
        </div>
        <p v-else class="note small">No sends recorded yet.</p>
      </div>

      <!-- League -->
      <div class="section">
        <h2 class="section-title">League competition</h2>
        <p class="hint">This week · promotion / relegation flow.</p>
        <div class="statstrip">
          <div class="stat"><span class="n">{{ fmtNum(league.active_competitors) }}</span><span class="l">Active competitors</span></div>
          <div class="stat"><span class="n">{{ fmtNum(league.promoted) }}</span><span class="l">Promoted last wk</span></div>
          <div class="stat"><span class="n">{{ fmtNum(league.relegated) }}</span><span class="l">Relegated</span></div>
          <div class="stat"><span class="n gold">{{ fmtPace(league.human_vs_bot_pace) }}</span><span class="l">Human vs bot pace</span></div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import FunnelBars from '../../components/charts/FunnelBars.vue'

const loading = ref(true)
const error = ref('')

const offerFunnel = ref<any[]>([])
const offerTtcMedianHours = ref<number | null>(null)
const notifOptin = ref<any[]>([])
const notifSends = ref<any[]>([])
const league = ref<any>({})

function fmtNum(v: any): string {
  return v === null || v === undefined ? '—' : String(v)
}
function fmtPace(v: any): string {
  return v === null || v === undefined ? 'N/A' : `${v}x`
}

const offerRows = computed(() => {
  const f = offerFunnel.value?.[0]
  if (!f) return []
  return [
    { label: 'Push sent', value: String(f.users_sent), frac: 1 },
    {
      label: 'Tapped',
      value: String(f.users_tapped),
      pct: f.sent_to_tap_pct != null ? f.sent_to_tap_pct + '%' : '',
      frac: f.users_sent ? f.users_tapped / f.users_sent : 0,
    },
    {
      label: 'Converted to Pro',
      value: String(f.users_converted),
      pct: f.tap_to_paid_pct != null ? f.tap_to_paid_pct + '%' : '',
      frac: f.users_sent ? f.users_converted / f.users_sent : 0,
    },
  ]
})

const offerCaption = computed(() => {
  const f = offerFunnel.value?.[0]
  if (!f) return 'No offers sent yet.'
  return `${f.placement || f.offer_key || 'offer'} · last 30d`
})

const ttcCaption = computed(() => {
  const h = offerTtcMedianHours.value
  return h == null ? 'No conversions yet.' : `Median time to convert: ${h} hours.`
})

const optinRows = computed(() =>
  (notifOptin.value || []).map((r) => ({
    label: r.kind,
    value: r.on_pct == null ? '—' : `${r.on_pct}%`,
    frac: r.on_pct == null ? 0 : Number(r.on_pct) / 100,
  }))
)

const sends = computed(() => notifSends.value || [])

onMounted(async () => {
  try {
    const res = await fetch('/api/dashboard?view=engagement')
    if (!res.ok) { error.value = 'Failed to load engagement data.'; loading.value = false; return }
    const d = await res.json()
    offerFunnel.value = d.offer_funnel ?? []
    offerTtcMedianHours.value = d.offer_ttc_median_hours ?? null
    notifOptin.value = d.notif_optin ?? []
    notifSends.value = d.notif_sends ?? []
    league.value = d.league ?? {}
  } catch {
    error.value = 'Network error.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.engagement { max-width: 900px; }
.page-title { font-family: var(--serif); font-size: 24px; color: var(--text); font-weight: 700; margin: 0 0 6px; }
.subtitle { font-family: var(--sans); font-size: 13px; color: var(--text-3); margin: 0 0 22px; }
.note { font-family: var(--sans); font-size: 13px; color: var(--text-3); padding: 20px 0; }
.note.err { color: #ff6b5e; }
.note.small { padding: 8px 0; }

.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }

.section { margin-bottom: 34px; }
.section-title { font-family: var(--sans); font-size: 13px; color: var(--text-3); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 8px; }
.hint { font-family: var(--sans); font-size: 12px; color: var(--text-3); margin: 0 0 4px; line-height: 1.5; }

.sends-list { display: flex; flex-direction: column; gap: 6px; }
.sends-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 0.5px solid var(--line); }
.sk { font-family: var(--sans); font-size: 13px; color: var(--text-2); }
.sv { font-family: var(--sans); font-size: 13px; color: var(--text); font-variant-numeric: tabular-nums; }

.statstrip { display: flex; gap: 10px; flex-wrap: wrap; }
.stat { flex: 1; min-width: 130px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 3px; }
.stat .n { font-family: var(--serif); font-size: 26px; color: var(--text); line-height: 1; }
.stat .n.gold { color: var(--gold-light); }
.stat .l { font-family: var(--sans); font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; }

@media (max-width: 640px) { .grid2 { grid-template-columns: 1fr; } }
</style>
