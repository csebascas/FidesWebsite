<template>
  <div class="retention">
    <h1 class="page-title">Retention</h1>
    <p class="subtitle">How many come back. The number that decides everything else.</p>

    <div v-if="loading" class="note">Loading…</div>
    <div v-else-if="error" class="note err">{{ error }}</div>

    <template v-else>
      <!-- Headline tiles -->
      <div class="statstrip">
        <div class="stat"><span class="n">{{ fmtPct(headline.d1) }}</span><span class="l">D1 return</span></div>
        <div class="stat"><span class="n">{{ fmtPct(headline.d7) }}</span><span class="l">D7 return</span></div>
        <div class="stat"><span class="n">{{ fmtPct(headline.d30) }}</span><span class="l">D30 return</span></div>
        <div class="stat"><span class="n gold">{{ fmtDays(headline.median_lifetime_days) }}</span><span class="l">Est. lifetime (median)</span></div>
      </div>

      <!-- Retention curve -->
      <div class="section">
        <h2 class="section-title">Retention curve</h2>
        <p class="hint">% still active on day N after signup.</p>
        <LineChart :series="curveSeries" :y-max="100" :x-labels="curveXLabels" :y-labels="['0', '25', '50', '75', '100']" />
      </div>

      <!-- Retention by attribution -->
      <div class="section">
        <h2 class="section-title">Retention by attribution</h2>
        <p class="hint">D7 return, by how they found Fides.</p>
        <FunnelBars v-if="attributionRows.length" :rows="attributionRows" />
        <p v-else class="note small">No attribution data yet.</p>
      </div>

      <!-- Cohort heatmap -->
      <div class="section">
        <h2 class="section-title">Weekly cohort heatmap</h2>
        <p class="hint">Rows = signup week, columns = weeks since. Grey = week hasn't elapsed.</p>
        <CohortHeatmap :rows="cohortRows" :headers="cohortHeaders" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import LineChart from '../../components/charts/LineChart.vue'
import CohortHeatmap from '../../components/charts/CohortHeatmap.vue'
import FunnelBars from '../../components/charts/FunnelBars.vue'

const loading = ref(true)
const error = ref('')
const headline = ref<any>({})
const curve = ref<any[]>([])
const attribution = ref<any[]>([])
const cohorts = ref<any[]>([])

function fmtPct(v: any): string {
  return v === null || v === undefined ? '—' : `${v}%`
}
function fmtDays(v: any): string {
  return v === null || v === undefined ? '—' : `${v}d`
}
function fmtWeek(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

const curveSeries = computed(() => [
  { name: 'ret', color: '#E8B44E', points: (curve.value || []).map((c) => ({ x: c.day, y: c.pct ?? 0 })) },
])
const curveXLabels = ['D0', 'D1', 'D7', 'D14', 'D30']

const attributionRows = computed(() => {
  const rows = attribution.value || []
  const maxD7 = Math.max(0, ...rows.map((r) => Number(r.d7_ret_pct ?? 0)))
  return [...rows]
    .sort((a, b) => Number(b.d7_ret_pct ?? 0) - Number(a.d7_ret_pct ?? 0))
    .map((r) => ({
      label: r.source,
      value: r.d7_ret_pct == null ? '—' : `${r.d7_ret_pct}%`,
      frac: maxD7 ? (Number(r.d7_ret_pct ?? 0)) / maxD7 : 0,
    }))
})

const cohortHeaders = ['W0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8']
const cohortRows = computed(() =>
  (cohorts.value || []).map((c) => ({ label: fmtWeek(c.week_start), size: c.size, w: c.w }))
)

onMounted(async () => {
  try {
    const res = await fetch('/api/dashboard?view=retention')
    if (!res.ok) { error.value = 'Failed to load retention data.'; loading.value = false; return }
    const d = await res.json()
    headline.value = d.headline ?? {}
    curve.value = d.curve ?? []
    cohorts.value = d.cohorts ?? []
    // Attribution is secondary: a failure degrades to an empty panel rather
    // than blanking the whole page.
    try {
      const ares = await fetch('/api/dashboard?view=attribution')
      if (ares.ok) attribution.value = (await ares.json()) ?? []
    } catch { /* leave attribution empty */ }
  } catch { error.value = 'Network error.' } finally { loading.value = false }
})
</script>

<style scoped>
.retention { max-width: 900px; }
.page-title { font-family: var(--serif); font-size: 24px; color: var(--text); font-weight: 700; margin: 0 0 6px; }
.subtitle { font-family: var(--sans); font-size: 13px; color: var(--text-3); margin: 0 0 22px; }
.note { font-family: var(--sans); font-size: 13px; color: var(--text-3); padding: 20px 0; }
.note.err { color: #ff6b5e; }
.note.small { padding: 8px 0; }

.statstrip { display: flex; gap: 10px; margin-bottom: 26px; flex-wrap: wrap; }
.stat { flex: 1; min-width: 130px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 3px; }
.stat .n { font-family: var(--serif); font-size: 26px; color: var(--text); line-height: 1; }
.stat .n.gold { color: var(--gold-light); }
.stat .l { font-family: var(--sans); font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; }

.section { margin-bottom: 34px; }
.section-title { font-family: var(--sans); font-size: 13px; color: var(--text-3); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 8px; }
.hint { font-family: var(--sans); font-size: 12px; color: var(--text-3); margin: 0 0 4px; line-height: 1.5; }
</style>
