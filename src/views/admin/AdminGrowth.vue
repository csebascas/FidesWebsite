<template>
  <div class="growth">
    <h1 class="page-title">Growth</h1>
    <p class="subtitle">Activation, retention and churn for real (non-bot) users. Lesson completions exclude placement test-outs.</p>

    <div v-if="loading" class="note">Loading…</div>
    <div v-else-if="error" class="note err">{{ error }}</div>

    <template v-else>
      <!-- Headline stats -->
      <div class="statstrip">
        <div class="stat"><span class="n" :class="ragClass(activation.rate_pct, 30, 42)">{{ activation.rate_pct ?? '—' }}%</span><span class="l">Activation rate</span><span class="d">{{ activation.activated }}/{{ activation.new_users }} new users</span></div>
        <div class="stat"><span class="n" :class="ragClass(pct(funnel.returned_day2plus), 28, 45)">{{ pct(funnel.returned_day2plus) }}%</span><span class="l">Return day 2+</span><span class="d">vs Duolingo ~50%</span></div>
        <div class="stat"><span class="n" :class="ragClass(streakOnPct, 20, 40)">{{ streakOnPct }}%</span><span class="l">On a streak</span><span class="d">vs Duolingo ~40%+</span></div>
        <div class="stat"><span class="n" :class="{ flame: (streaks.deaths_7d ?? 0) > 0 }">{{ streaks.deaths_7d ?? 0 }}</span><span class="l">Streak deaths 7d</span></div>
      </div>

      <!-- Activation funnel -->
      <div class="section">
        <h2 class="section-title">Activation funnel</h2>
        <div class="funnel">
          <div v-for="s in funnelSteps" :key="s.key" class="funnel-row">
            <span class="fl-label">{{ s.label }}</span>
            <div class="fl-bar-wrap"><div class="fl-bar" :style="{ width: pct(s.value) + '%' }"></div></div>
            <span class="fl-val">{{ s.value }}</span>
            <span class="fl-pct" :class="{ warn: s.warn }">{{ pct(s.value) }}%</span>
          </div>
        </div>
      </div>

      <!-- Benchmarks -->
      <div class="section">
        <h2 class="section-title">How we compare · industry reference</h2>
        <div class="table-scroll">
          <table class="bench">
            <thead><tr><th>Metric</th><th class="num">Fides</th><th>Category</th><th>Best-in-class</th><th>Read</th></tr></thead>
            <tbody>
              <tr v-for="b in benchmarks" :key="b.metric">
                <td>{{ b.metric }}<span v-if="b.note" class="bnote"> · {{ b.note }}</span></td>
                <td class="num you">{{ b.you }}</td>
                <td class="muted">{{ b.cat }}</td>
                <td class="muted">{{ b.best }}</td>
                <td><span class="vpill" :class="vClass(b.v)">{{ b.v }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="hint">Benchmarks are approximate figures from public reports (Duolingo disclosures, education/subscription retention studies) — directional context, not live competitor data.</p>
      </div>

      <!-- Streak health -->
      <div class="section">
        <h2 class="section-title">Streak health · the retention spine</h2>
        <div class="dash-grid">
          <div>
            <div v-for="d in streaks.dist || []" :key="d.label" class="bar-row">
              <span class="bn">{{ d.label }}</span>
              <div class="bar-wrap"><div class="bar" :class="{ dead: d.label === 'None' }" :style="{ width: distPct(d.count) + '%' }"></div></div>
              <span class="bc">{{ d.count }}</span>
            </div>
            <p class="hint">{{ pct(streaks.zero) }}% of users have no active streak.</p>
          </div>
          <div>
            <h3 class="mini-title">At-risk — missed 1–3 days, streak ≥ 3</h3>
            <div v-if="!(streaks.at_risk || []).length" class="note small">Nobody in the intervention window right now.</div>
            <table v-else class="mini-table">
              <tr v-for="(u, i) in streaks.at_risk" :key="i">
                <td>{{ u.name }}</td>
                <td class="num">{{ u.streak }}-day</td>
                <td class="num muted">{{ u.days_ago }}d ago</td>
              </tr>
            </table>
          </div>
        </div>
      </div>

      <!-- Retention cohorts -->
      <div class="section">
        <h2 class="section-title">Weekly retention cohorts</h2>
        <p class="hint">% of each week's signups active (any XP) in later weeks. Grey = week hasn't elapsed.</p>
        <div class="table-scroll">
          <table class="cohort">
            <thead>
              <tr><th>Signed up</th><th class="num">Users</th><th class="num">Wk 1</th><th class="num">Wk 2</th><th class="num">Wk 4</th><th class="num">Wk 8</th></tr>
            </thead>
            <tbody>
              <tr v-for="c in cohorts" :key="c.date">
                <td>{{ c.week }}</td>
                <td class="num">{{ c.users }}</td>
                <td v-for="w in [1,2,4,8]" :key="w" class="num cell" :class="[{ future: !isMature(c, w) }, cohortRag(c, w)]">
                  {{ isMature(c, w) ? cohortPct(c, w) + '%' : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Feature adoption -->
      <div class="section">
        <h2 class="section-title">Feature adoption · of {{ features.active_28d }} active-28d users</h2>
        <div class="funnel">
          <div v-for="f in (features.rows || [])" :key="f.label" class="funnel-row">
            <span class="fl-label">{{ f.label }}</span>
            <div class="fl-bar-wrap"><div class="fl-bar" :class="{ dead: featPct(f.users) < 8 }" :style="{ width: featPct(f.users) + '%' }"></div></div>
            <span class="fl-val">{{ f.users }}</span>
            <span class="fl-pct">{{ featPct(f.users) }}%</span>
          </div>
        </div>
        <p class="hint">Rows under ~8% are cut-or-fix candidates.</p>
      </div>

      <!-- Subscription churn -->
      <div class="section">
        <h2 class="section-title">Subscription churn · 90 days</h2>
        <div class="statstrip">
          <div class="stat"><span class="n">{{ churn.trials_started ?? 0 }}</span><span class="l">Trials started</span></div>
          <div class="stat"><span class="n gold">{{ churn.paid ?? 0 }}</span><span class="l">Paid conversions</span></div>
          <div class="stat"><span class="n flame">{{ churn.voluntary ?? 0 }}</span><span class="l">Cancelled (voluntary)</span></div>
          <div class="stat"><span class="n flame">{{ churn.involuntary ?? 0 }}</span><span class="l">Expired (involuntary)</span></div>
        </div>
        <p class="hint">Net = paid − (voluntary + involuntary) = <b>{{ (churn.paid ?? 0) - (churn.voluntary ?? 0) - (churn.involuntary ?? 0) }}</b>. Overlaps with the Revenue tab's Superwall detail.</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)
const error = ref('')
const funnel = ref<any>({})
const activation = ref<any>({})
const cohorts = ref<any[]>([])
const streaks = ref<any>({})
const features = ref<any>({})
const churn = ref<any>({})

const funnelSteps = computed(() => {
  const f = funnel.value
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
  return total ? Math.round((Number(v) / total) * 100) : 0
}

// Verdict against a category-median / best-in-class band.
function verdict(v: number | null, mid: number, high: number): string {
  if (v == null || Number.isNaN(v)) return 'small n'
  if (v >= high) return 'Strong'
  if (v >= mid) return 'On par'
  return 'Below'
}
function vClass(v: string): string {
  return v === 'Strong' ? 'good' : v === 'Below' ? 'bad' : 'mid'
}
// Numeric RAG: green at/above best-in-class band, amber on-par, red below.
function ragClass(v: any, mid: number, high: number): string {
  const n = Number(v)
  if (Number.isNaN(n)) return ''
  return n >= high ? 'good' : n >= mid ? 'mid' : 'bad'
}

// Industry reference bands (approximate, from public reports — Duolingo
// disclosures, education/subscription app retention studies). Directional.
const streakOnPct = computed(() => {
  const total = funnel.value?.signed_up || 0
  return total ? Math.round(((total - Number(streaks.value.zero || 0)) / total) * 100) : 0
})

const benchmarks = computed(() => {
  const f = funnel.value, total = f.signed_up || 0
  const streakOn = total ? Math.round(((total - Number(streaks.value.zero || 0)) / total) * 100) : 0
  const ret = pct(f.returned_day2plus)
  const proPct = pct(f.pro)
  const trials = Number(churn.value.trials_started || 0)
  const trialConv = trials ? Math.round((Number(churn.value.paid || 0) / trials) * 100) : null
  const act = Number(activation.value.rate_pct ?? 0)
  return [
    { metric: 'Activation (2+ active days, wk1)', you: act + '%', cat: 'Learning apps ~25–35%', best: 'Duolingo ~45%', v: verdict(act, 30, 42) },
    { metric: 'Early retention (return day 2+)', you: ret + '%', cat: 'Education ~25–30%', best: 'Duolingo ~50%', v: verdict(ret, 28, 45) },
    { metric: 'On an active streak', you: streakOn + '%', cat: '—', best: 'Duolingo ~40%+', v: verdict(streakOn, 20, 40) },
    { metric: 'Trial → paid', you: trialConv == null ? '—' : trialConv + '%', cat: 'Freemium ~30–50%', best: '>55%', v: trialConv == null ? 'small n' : verdict(trialConv, 30, 55) },
    { metric: 'Free → Pro', you: proPct + '%', cat: 'Freemium ~2–5%', best: '—', note: 'inflated by referral/comp grants', v: 'context' },
  ]
})
function distPct(v: number): number {
  const total = (streaks.value.dist || []).reduce((a: number, d: any) => a + Number(d.count), 0)
  return total ? Math.round((Number(v) / total) * 100) : 0
}
function featPct(v: number): number {
  const total = features.value?.active_28d || 0
  return total ? Math.round((Number(v) / total) * 100) : 0
}
function cohortPct(c: any, wk: number): number {
  const n = Number(c['wk' + wk] ?? 0), u = Number(c.users ?? 0)
  return u ? Math.round((n / u) * 100) : 0
}
function weeksSince(d: string): number {
  if (!d) return 0
  return Math.floor((Date.now() - new Date(d + 'T00:00:00Z').getTime()) / (7 * 864e5))
}
function isMature(c: any, wk: number): boolean { return weeksSince(c.date) >= wk }
// Per-week retention benchmark bands [category-median, best-in-class]. Retention
// decays each week, so the bar drops. Below median = red, on par = amber,
// at/above best-in-class = green.
const COHORT_BANDS: Record<number, [number, number]> = { 1: [25, 45], 2: [15, 30], 4: [8, 20], 8: [5, 12] }
function cohortRag(c: any, wk: number): string {
  if (!isMature(c, wk)) return ''
  const p = cohortPct(c, wk)
  const [mid, high] = COHORT_BANDS[wk]
  return p >= high ? 'good' : p >= mid ? 'mid' : 'bad'
}

onMounted(async () => {
  try {
    const res = await fetch('/api/dashboard?view=growth')
    if (!res.ok) { error.value = 'Failed to load growth data.'; loading.value = false; return }
    const d = await res.json()
    funnel.value = d.funnel ?? {}
    activation.value = d.activation ?? {}
    cohorts.value = d.cohorts ?? []
    streaks.value = d.streaks ?? {}
    features.value = d.features ?? {}
    churn.value = d.churn ?? {}
  } catch { error.value = 'Network error.' } finally { loading.value = false }
})
</script>

<style scoped>
.growth { max-width: 900px; }
.page-title { font-family: var(--serif); font-size: 24px; color: var(--text); font-weight: 700; margin: 0 0 6px; }
.subtitle { font-family: var(--sans); font-size: 13px; color: var(--text-3); margin: 0 0 22px; }
.note { font-family: var(--sans); font-size: 13px; color: var(--text-3); padding: 20px 0; }
.note.small { padding: 8px 0; }
.note.err { color: #ff6b5e; }

.statstrip { display: flex; gap: 10px; margin-bottom: 26px; flex-wrap: wrap; }
.stat { flex: 1; min-width: 130px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 3px; }
.stat .n { font-family: var(--serif); font-size: 26px; color: var(--text); line-height: 1; }
.stat .n.gold { color: var(--gold-light); }
.stat .n.flame { color: #D4673A; }
.stat .n.good { color: #34c759; }
.stat .n.mid { color: var(--gold-light); }
.stat .n.bad { color: #D4673A; }
.stat .l { font-family: var(--sans); font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; }
.stat .d { font-family: var(--sans); font-size: 11px; color: var(--text-3); }

.section { margin-bottom: 34px; }
.section-title { font-family: var(--sans); font-size: 13px; color: var(--text-3); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 14px; }
.mini-title { font-family: var(--sans); font-size: 12px; color: var(--text-2); font-weight: 600; margin: 0 0 10px; }
.hint { font-family: var(--sans); font-size: 12px; color: var(--text-3); margin: 10px 0 0; line-height: 1.5; }
.hint b { color: var(--text); }

.funnel { display: flex; flex-direction: column; gap: 8px; }
.funnel-row { display: grid; grid-template-columns: 180px 1fr auto 46px; align-items: center; gap: 12px; }
.fl-label { font-family: var(--sans); font-size: 13px; color: var(--text-2); }
.fl-bar-wrap { height: 24px; background: var(--surface); border-radius: 6px; overflow: hidden; }
.fl-bar { height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold-light)); border-radius: 6px; }
.fl-bar.dead { background: #3a3a3a; }
.fl-val { font-family: var(--sans); font-size: 13px; color: var(--text); text-align: right; font-variant-numeric: tabular-nums; }
.fl-pct { font-family: var(--sans); font-size: 12px; color: var(--text-3); text-align: right; font-variant-numeric: tabular-nums; }
.fl-pct.warn { color: var(--gold-light); font-weight: 600; }

.dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
.bar-row { display: grid; grid-template-columns: 44px 1fr auto; align-items: center; gap: 10px; margin-bottom: 8px; }
.bn { font-family: var(--sans); font-size: 12px; color: var(--text-2); }
.bar-wrap { height: 18px; background: var(--surface); border-radius: 5px; overflow: hidden; }
.bar { height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold-light)); border-radius: 5px; }
.bar.dead { background: #4a3a3a; }
.bc { font-family: var(--sans); font-size: 12px; color: var(--text); font-variant-numeric: tabular-nums; }

.mini-table { width: 100%; border-collapse: collapse; font-family: var(--sans); font-size: 13px; }
.mini-table td { padding: 6px 4px; border-bottom: 0.5px solid var(--line); color: var(--text-2); }
.mini-table td.num { text-align: right; font-variant-numeric: tabular-nums; color: var(--text); }
.mini-table td.muted { color: var(--text-3); }

.table-scroll { overflow-x: auto; }
.cohort { width: 100%; border-collapse: collapse; font-family: var(--sans); font-size: 13px; }
.cohort th { background: var(--surface); color: var(--text-3); font-weight: 500; text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--line); white-space: nowrap; }
.cohort th.num, .cohort td.num { text-align: right; font-variant-numeric: tabular-nums; }
.cohort td { padding: 9px 12px; border-bottom: 1px solid var(--line); color: var(--text-2); }
.cohort td.cell { color: var(--text); border-radius: 4px; }
.cohort td.cell.good { background: rgba(52,199,89,0.18); color: #4ad168; }
.cohort td.cell.mid  { background: rgba(196,145,44,0.16); color: var(--gold-light); }
.cohort td.cell.bad  { background: rgba(212,103,58,0.16); color: #e0805c; }
.cohort td.future { color: var(--text-3); background: rgba(255,255,255,0.02) !important; }

.bench { width: 100%; border-collapse: collapse; font-family: var(--sans); font-size: 13px; }
.bench th { background: var(--surface); color: var(--text-3); font-weight: 500; text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--line); white-space: nowrap; }
.bench th.num, .bench td.num { text-align: right; }
.bench td { padding: 10px 12px; border-bottom: 1px solid var(--line); color: var(--text-2); }
.bench td.you { color: var(--text); font-weight: 600; font-variant-numeric: tabular-nums; }
.bench td.muted { color: var(--text-3); font-size: 12px; }
.bnote { color: var(--text-3); font-size: 11px; }
.vpill { font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 100px; white-space: nowrap; }
.vpill.good { color: #34c759; background: rgba(52,199,89,0.12); }
.vpill.bad { color: #D4673A; background: rgba(212,103,58,0.14); }
.vpill.mid { color: var(--gold-light); background: rgba(196,145,44,0.12); }

@media (max-width: 640px) { .dash-grid { grid-template-columns: 1fr; } }
</style>
