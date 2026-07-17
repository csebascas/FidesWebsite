<template>
  <div class="reports">
    <header class="head rise" style="--i: 0">
      <div>
        <h1 class="page-title">Weekly Report</h1>
        <div class="date" v-if="latest">Week of {{ fmtRange(latest.week_start, latest.week_end) }}<span v-if="latest.emailed_to?.length"> · emailed to {{ latest.emailed_to.length }} admins</span></div>
        <div class="date" v-else>No reports yet — run one now or wait for Monday's cron</div>
      </div>
      <button class="run-btn" :disabled="running" @click="runNow">
        {{ running ? 'Running…' : 'Run now' }}
      </button>
    </header>

    <div v-if="latest" class="card rise" style="--i: 1">
      <div class="mrow">
        <span class="ml">Money made</span>
        <span class="mn gold">{{ money(latest.metrics.revenue_total) }}</span>
        <span class="md up">+{{ money(latest.metrics.revenue_week) }} this week</span>
      </div>
      <div class="mrow">
        <span class="ml">Downloads</span>
        <span class="mn">{{ latest.metrics.downloads_total }}</span>
        <span class="md up">+{{ latest.metrics.downloads_week }} this week</span>
      </div>
      <div class="mrow">
        <span class="ml">Users</span>
        <span class="mn">{{ latest.metrics.users_total }}</span>
        <span class="md up">+{{ latest.metrics.users_week }} this week</span>
      </div>
      <div class="mrow">
        <span class="ml">Free-trial signups</span>
        <span class="mn">{{ latest.metrics.trials_total }}</span>
        <span class="md up">+{{ latest.metrics.trials_week }} this week</span>
      </div>
      <div class="mrow">
        <span class="ml">Active trials</span>
        <span class="mn">{{ latest.metrics.active_trials ?? 0 }}</span>
        <span class="md">right now</span>
      </div>
      <div class="mrow">
        <span class="ml">Trial conversions</span>
        <span class="mn">{{ latest.metrics.trial_conversions ?? 0 }}</span>
        <span class="md">all time</span>
      </div>
      <div class="mrow">
        <span class="ml">Paying — monthly</span>
        <span class="mn gold">{{ latest.metrics.paying_monthly }}</span>
        <span class="md">of {{ latest.metrics.pro_total }} Pro</span>
      </div>
      <div class="mrow">
        <span class="ml">Paying — yearly</span>
        <span class="mn gold">{{ latest.metrics.paying_yearly }}</span>
        <span class="md">of {{ latest.metrics.pro_total }} Pro</span>
      </div>
      <div class="mrow">
        <span class="ml">New paying</span>
        <span class="mn">{{ latest.metrics.paying_new_week }}</span>
        <span class="md up">this week</span>
      </div>
    </div>

    <div v-if="latest && latest.metrics.activation_rate != null" class="card rise" style="--i: 1">
      <div class="card-eyebrow">Engagement</div>
      <div class="mrow">
        <span class="ml">Active this week</span>
        <span class="mn">{{ latest.metrics.active_week ?? 0 }}</span>
        <span class="md">did a real lesson</span>
      </div>
      <div class="mrow">
        <span class="ml">Activation rate</span>
        <span class="mn" :class="rag(latest.metrics.activation_rate, 30, 42)">{{ latest.metrics.activation_rate ?? 0 }}%</span>
        <span class="md">2+ active days, wk1</span>
      </div>
      <div class="mrow">
        <span class="ml">Week-1 retention</span>
        <span class="mn" :class="rag(latest.metrics.retention_w1, 28, 45)">{{ latest.metrics.retention_w1 ?? 0 }}%</span>
        <span class="md">last week's cohort</span>
      </div>
      <div class="mrow">
        <span class="ml">On a streak</span>
        <span class="mn" :class="rag(latest.metrics.streak_on_pct, 20, 40)">{{ latest.metrics.streak_on_pct ?? 0 }}%</span>
        <span class="md">vs Duolingo ~40%+</span>
      </div>
      <div class="mrow">
        <span class="ml">Streak deaths</span>
        <span class="mn" :class="{ flame: (latest.metrics.streak_deaths_week ?? 0) > 0 }">{{ latest.metrics.streak_deaths_week ?? 0 }}</span>
        <span class="md">this week</span>
      </div>
    </div>

    <div v-if="trends.length >= 2" class="section rise" style="--i: 2">
      <h2 class="section-title">Trends — week over week</h2>
      <div class="tgrid">
        <div v-for="t in trendTiles" :key="t.label" class="ttile">
          <div class="thead">
            <span class="tlabel">{{ t.label }}</span>
            <span class="tval" :class="{ gold: t.gold }">{{ t.latest }}</span>
          </div>
          <div class="tbars">
            <div
              v-for="(p, i) in t.points"
              :key="i"
              class="tbar"
              :class="{ latest: i === t.points.length - 1 }"
              :style="{ height: p.pct + '%' }"
              :title="`Week of ${p.week}: ${p.value}`"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="history.length" class="section rise" style="--i: 3">
      <h2 class="section-title">Past reports</h2>
      <div v-for="r in history" :key="r.id" class="hrow">
        <span class="hname">Week of {{ fmtRange(r.week_start, r.week_end) }}</span>
        <span class="hmeta">+{{ r.metrics.downloads_week }} downloads · +{{ r.metrics.users_week }} users · +{{ r.metrics.paying_new_week }} paying</span>
        <span class="htime">{{ fmtDay(r.created_at) }}</span>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Report {
  id: string
  week_start: string
  week_end: string
  metrics: Record<string, number>
  emailed_to: string[] | null
  created_at: string
}

const reports = ref<Report[]>([])
const running = ref(false)
const error = ref('')

const latest = computed(() => reports.value[0] || null)
const history = computed(() => reports.value.slice(1))

// One snapshot per week for trends (manual "Run now" can create several in the
// same week — keep the most recent), oldest → newest, capped at 12 weeks.
const trends = computed(() => {
  const byWeek = new Map<string, Report>()
  for (const r of reports.value) {
    if (!byWeek.has(r.week_start)) byWeek.set(r.week_start, r) // reports come newest-first
  }
  return [...byWeek.values()]
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
    .slice(-12)
})

interface TrendTile {
  label: string
  latest: number
  gold: boolean
  points: { week: string; value: number; pct: number }[]
}

const trendTiles = computed<TrendTile[]>(() => {
  const defs: { label: string; gold?: boolean; value: (m: Record<string, number>) => number }[] = [
    { label: 'Revenue / wk', gold: true, value: (m) => m.revenue_week ?? 0 },
    { label: 'Downloads / wk', value: (m) => m.downloads_week ?? 0 },
    { label: 'New users / wk', value: (m) => m.users_week ?? 0 },
    { label: 'Trial signups / wk', value: (m) => m.trials_week ?? 0 },
    { label: 'New paying / wk', value: (m) => m.paying_new_week ?? 0 },
    { label: 'Paying subs', gold: true, value: (m) => (m.paying_monthly ?? 0) + (m.paying_yearly ?? 0) },
    { label: 'Pro users', gold: true, value: (m) => m.pro_total ?? 0 },
    { label: 'Active / wk', value: (m) => m.active_week ?? 0 },
    { label: 'Activation %', value: (m) => m.activation_rate ?? 0 },
    { label: 'Retention W1 %', value: (m) => m.retention_w1 ?? 0 },
    { label: 'On a streak %', value: (m) => m.streak_on_pct ?? 0 },
  ]
  return defs.map((d) => {
    const values = trends.value.map((r) => ({ week: fmtDay(r.week_start + 'T00:00:00'), value: d.value(r.metrics) }))
    const max = Math.max(...values.map((v) => v.value), 1)
    return {
      label: d.label,
      gold: !!d.gold,
      latest: values[values.length - 1]?.value ?? 0,
      points: values.map((v) => ({ ...v, pct: Math.max(Math.round((v.value / max) * 100), v.value > 0 ? 8 : 3) })),
    }
  })
})

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// RAG vs benchmark band: green at/above best-in-class, amber on par, red below.
function rag(v: any, mid: number, high: number): string {
  const n = Number(v)
  if (Number.isNaN(n)) return ''
  return n >= high ? 'good' : n >= mid ? 'mid' : 'bad'
}

function money(n: number | undefined | null): string {
  return `$${(n ?? 0).toFixed(2)}`
}

function fmtRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`
}

async function load() {
  try {
    const res = await fetch('/api/reports')
    if (res.ok) {
      const data = await res.json()
      reports.value = data.reports || []
    }
  } catch { /* ignore */ }
}

async function runNow() {
  running.value = true
  error.value = ''
  try {
    const res = await fetch('/api/reports', { method: 'POST' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      error.value = data.error || 'Report run failed'
    }
    await load()
  } catch {
    error.value = 'Network error — try again'
  } finally {
    running.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.reports { max-width: 640px; }

.rise {
  opacity: 0;
  animation: rise 0.18s ease-out forwards;
  animation-delay: calc(var(--i, 0) * 30ms);
}
@keyframes rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

.head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.page-title { font-family: var(--serif); font-size: 23px; color: var(--text); font-weight: 600; margin: 0; }
.date { font-family: var(--sans); font-size: 11px; color: var(--text-3); margin-top: 3px; }

.run-btn {
  background: rgba(196, 145, 44, 0.08);
  color: var(--gold-light);
  border: none;
  border-radius: 6px;
  padding: 8px 14px;
  font-family: var(--sans);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease, transform 0.12s ease;
}
.run-btn:hover { background: rgba(196, 145, 44, 0.12); }
.run-btn:active { transform: scale(0.97); }
.run-btn:disabled { opacity: 0.6; cursor: default; }

.card {
  background: var(--surface);
  border-radius: 10px;
  padding: 4px 20px;
  margin-bottom: 24px;
}

.mrow {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 0.5px solid #242424;
  font-family: var(--sans);
}
.mrow:last-child { border-bottom: none; }
.ml { flex: 1; font-size: 12.5px; color: var(--text-2); }
.mn { font-size: 16px; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
.mn.gold { color: var(--gold-light); }
.mn.flame { color: #D4673A; }
.mn.good { color: #34c759; }
.mn.mid { color: var(--gold-light); }
.mn.bad { color: #D4673A; }
.card-eyebrow { font-family: var(--sans); font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); margin-bottom: 10px; }
.md { width: 110px; text-align: right; font-size: 11px; color: var(--text-3); }
.md.up { color: #7FB08A; }

.section-title {
  font-family: var(--sans); font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.8px; color: var(--text-3); margin: 0 0 6px;
}

.section { margin-bottom: 24px; }

/* Trend tiles — mini week-over-week bar charts */
.tgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.ttile { background: var(--surface); border-radius: 10px; padding: 12px 14px 10px; }
.thead { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.tlabel {
  font-family: var(--sans); font-size: 9.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 1px; color: var(--text-3);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tval { font-family: var(--sans); font-size: 15px; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
.tval.gold { color: var(--gold-light); }
.tbars { display: flex; align-items: flex-end; gap: 3px; height: 34px; }
.tbar {
  flex: 1;
  background: var(--raised);
  border-radius: 1.5px;
  min-height: 1px;
  transition: height 0.25s ease-out;
}
.tbar.latest { background: var(--gold); }

@media (max-width: 700px) {
  .tgrid { grid-template-columns: repeat(2, 1fr); }
}

.hrow {
  display: flex; align-items: center; gap: 12px; padding: 9px 2px;
  border-bottom: 0.5px solid var(--line);
  font-family: var(--sans); font-size: 12px;
}
.hrow:last-child { border-bottom: none; }
.hname { color: var(--text); flex-shrink: 0; }
.hmeta { flex: 1; color: var(--text-3); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.htime { color: var(--text-3); font-size: 10.5px; flex-shrink: 0; }

.error { font-family: var(--sans); font-size: 11.5px; color: var(--streak); margin-top: 12px; }
</style>
