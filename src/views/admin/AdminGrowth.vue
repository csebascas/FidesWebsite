<template>
  <div class="growth">
    <h1 class="page-title">Growth</h1>
    <p class="subtitle">Activation and retention for real (non-bot) users. Activity = a completed lesson.</p>

    <div v-if="loading" class="note">Loading…</div>
    <div v-else-if="error" class="note err">{{ error }}</div>

    <template v-else>
      <!-- Activation funnel -->
      <div class="section">
        <h2 class="section-title">Activation funnel</h2>
        <div class="funnel">
          <div v-for="s in funnelSteps" :key="s.key" class="funnel-row">
            <span class="fl-label">{{ s.label }}</span>
            <div class="fl-bar-wrap">
              <div class="fl-bar" :style="{ width: pct(s.value) + '%' }"></div>
            </div>
            <span class="fl-val">{{ s.value }}</span>
            <span class="fl-pct" :class="{ warn: s.warn }">{{ pct(s.value) }}%</span>
          </div>
        </div>
        <div class="callout" v-if="funnel">
          <b>{{ pct(funnel.returned_day2plus) }}%</b> ever returned on a later day, and only <b>{{ pct(funnel.did_3_lessons) }}%</b> reached 3 lessons — the drop between first lesson and coming back is where activation is bleeding.
        </div>
      </div>

      <!-- Retention cohorts -->
      <div class="section">
        <h2 class="section-title">Weekly retention cohorts</h2>
        <p class="hint">% of each week's signups who completed a lesson in later weeks. Grey = week hasn't elapsed yet.</p>
        <div class="table-scroll">
          <table class="cohort">
            <thead>
              <tr>
                <th>Signed up</th><th class="num">Users</th>
                <th class="num">Wk 0</th><th class="num">Wk 1</th><th class="num">Wk 2</th><th class="num">Wk 3</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in cohorts" :key="c.date">
                <td>{{ c.week }}</td>
                <td class="num">{{ c.users }}</td>
                <td v-for="w in [0,1,2,3]" :key="w" class="num cell"
                    :class="{ future: !isMature(c, w) }"
                    :style="cellStyle(c, w)">
                  {{ isMature(c, w) ? cohortPct(c, w) + '%' : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)
const error = ref('')
const funnel = ref<any>(null)
const cohorts = ref<any[]>([])

const funnelSteps = computed(() => {
  const f = funnel.value
  if (!f) return []
  return [
    { key: 'signed_up', label: 'Signed up', value: f.signed_up },
    { key: 'did_1_lesson', label: 'Completed 1 lesson', value: f.did_1_lesson },
    { key: 'returned_day2plus', label: 'Returned on a later day', value: f.returned_day2plus, warn: true },
    { key: 'did_3_lessons', label: 'Reached 3 lessons', value: f.did_3_lessons },
    { key: 'did_10_lessons', label: 'Reached 10 lessons', value: f.did_10_lessons },
    { key: 'pro', label: 'On Pro', value: f.pro },
  ]
})

function pct(v: number): number {
  const total = funnel.value?.signed_up || 0
  if (!total) return 0
  return Math.round((Number(v) / total) * 100)
}

function cohortPct(c: any, wk: number): number {
  const n = Number(c['wk' + wk] ?? 0)
  const u = Number(c.users ?? 0)
  return u ? Math.round((n / u) * 100) : 0
}

// A cohort's week N has only elapsed if enough calendar time has passed.
function weeksSince(dateStr: string): number {
  if (!dateStr) return 0
  const then = new Date(dateStr + 'T00:00:00Z').getTime()
  const now = Date.now()
  return Math.floor((now - then) / (7 * 24 * 3600 * 1000))
}
function isMature(c: any, wk: number): boolean {
  return weeksSince(c.date) >= wk
}

function cellStyle(c: any, wk: number) {
  if (!isMature(c, wk) || wk === 0) return {}
  const p = cohortPct(c, wk)
  // Green heat scaled by retention %.
  return { background: `rgba(52, 199, 89, ${Math.min(0.05 + (p / 100) * 0.5, 0.55)})` }
}

onMounted(async () => {
  try {
    const res = await fetch('/api/dashboard?view=growth')
    if (!res.ok) { error.value = 'Failed to load growth data.'; loading.value = false; return }
    const data = await res.json()
    funnel.value = data.funnel
    cohorts.value = data.cohorts ?? []
  } catch {
    error.value = 'Network error.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.growth { max-width: 860px; }
.page-title { font-family: var(--serif); font-size: 24px; color: var(--text); font-weight: 700; margin: 0 0 6px; }
.subtitle { font-family: var(--sans); font-size: 13px; color: var(--text-3); margin: 0 0 24px; }
.note { font-family: var(--sans); font-size: 13px; color: var(--text-3); padding: 20px 0; }
.note.err { color: #ff6b5e; }
.section { margin-bottom: 34px; }
.section-title {
  font-family: var(--sans); font-size: 13px; color: var(--text-3); font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 14px;
}
.hint { font-family: var(--sans); font-size: 12px; color: var(--text-3); margin: -6px 0 14px; }

/* Funnel */
.funnel { display: flex; flex-direction: column; gap: 8px; }
.funnel-row { display: grid; grid-template-columns: 190px 1fr auto 48px; align-items: center; gap: 12px; }
.fl-label { font-family: var(--sans); font-size: 13px; color: var(--text-2); }
.fl-bar-wrap { height: 26px; background: var(--surface); border-radius: 6px; overflow: hidden; }
.fl-bar { height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold-light)); border-radius: 6px; transition: width 0.4s; }
.fl-val { font-family: var(--sans); font-size: 13px; color: var(--text); font-variant-numeric: tabular-nums; text-align: right; }
.fl-pct { font-family: var(--sans); font-size: 12px; color: var(--text-3); text-align: right; font-variant-numeric: tabular-nums; }
.fl-pct.warn { color: var(--gold-light); font-weight: 600; }

.callout {
  font-family: var(--sans); font-size: 13px; line-height: 1.6; color: var(--text-2);
  background: rgba(196,145,44,0.08); border: 0.5px solid rgba(196,145,44,0.3);
  border-radius: 8px; padding: 12px 14px; margin-top: 18px;
}
.callout b { color: var(--gold-light); }

/* Cohort table */
.table-scroll { overflow-x: auto; }
.cohort { width: 100%; border-collapse: collapse; font-family: var(--sans); font-size: 13px; }
.cohort th {
  background: var(--surface); color: var(--text-3); font-weight: 500; text-align: left;
  padding: 9px 12px; border-bottom: 1px solid var(--line); white-space: nowrap;
}
.cohort th.num, .cohort td.num { text-align: right; font-variant-numeric: tabular-nums; }
.cohort td { padding: 9px 12px; border-bottom: 1px solid var(--line); color: var(--text-2); }
.cohort td.cell { color: var(--text); border-radius: 4px; }
.cohort td.future { color: var(--text-3); background: rgba(255,255,255,0.02) !important; }
</style>
