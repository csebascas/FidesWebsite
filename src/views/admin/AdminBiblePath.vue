<template>
  <div class="bible-path">
    <h1 class="page-title">Bible Path</h1>
    <p class="subtitle">Adoption and completion of Bible reading plans. "Real" users only (bots and deleted accounts excluded).</p>

    <div v-if="loading" class="note">Loading…</div>
    <div v-else-if="error" class="note err">{{ error }}</div>

    <template v-else>
      <!-- Headline stats -->
      <div class="statstrip">
        <div class="stat"><span class="n">{{ pctOf(overall.adoption_rate) }}%</span><span class="l">Adoption rate</span><span class="d">{{ overall.users_enrolled }}/{{ overall.total_users }} users</span></div>
        <div class="stat"><span class="n gold">{{ pctOf(overall.completion_rate) }}%</span><span class="l">Completion rate</span><span class="d">{{ overall.total_completions }}/{{ overall.total_enrollments }} enrollments</span></div>
        <div class="stat"><span class="n">{{ overall.total_enrollments ?? 0 }}</span><span class="l">Total enrollments</span></div>
        <div class="stat"><span class="n">{{ overall.enrollments_28d ?? 0 }}</span><span class="l">New enrollments, 28d</span></div>
      </div>

      <!-- Per-plan breakdown -->
      <div class="section">
        <h2 class="section-title">Plans · {{ overall.plans_with_enrollments ?? 0 }} of {{ plans.length }} ever enrolled</h2>
        <div class="table-scroll">
          <table class="plans">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Category</th>
                <th class="num">Days</th>
                <th class="num">Enrollments</th>
                <th class="num">Completions</th>
                <th class="num">Completion rate</th>
                <th class="num">Avg day, in-progress</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in plans" :key="p.slug" :class="{ unused: p.enrollments === 0 }">
                <td>{{ p.name }}<span class="pnote"> · {{ p.level }}</span></td>
                <td class="muted">{{ p.category }}</td>
                <td class="num muted">{{ p.day_count }}</td>
                <td class="num">{{ p.enrollments }}</td>
                <td class="num">{{ p.completions }}</td>
                <td class="num" :class="rateClass(p.completion_rate)">{{ pctOf(p.completion_rate) }}%</td>
                <td class="num muted">{{ p.enrollments > p.completions ? p.avg_days_in_progress : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="hint">Rows with zero enrollments are candidates for re-promotion or cut. "Avg day, in-progress" only counts enrollments not yet completed.</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { cachedFetch } from '../../lib/apiCache'

const loading = ref(true)
const error = ref('')
const overall = ref<any>({})
const plans = ref<any[]>([])

function pctOf(v: number): number {
  return Math.round(Number(v ?? 0) * 100)
}
function rateClass(v: number): string {
  const p = pctOf(v)
  if (p === 0) return ''
  return p >= 50 ? 'good' : p >= 25 ? 'mid' : 'bad'
}

onMounted(async () => {
  try {
    const res = await cachedFetch('/api/dashboard?view=bible-path')
    if (!res.ok) { error.value = 'Failed to load Bible Path data.'; loading.value = false; return }
    const d = await res.json()
    overall.value = d.overall ?? {}
    plans.value = d.plans ?? []
  } catch { error.value = 'Network error.' } finally { loading.value = false }
})
</script>

<style scoped>
.bible-path { max-width: 900px; }
.page-title { font-family: var(--serif); font-size: 24px; color: var(--text); font-weight: 700; margin: 0 0 6px; }
.subtitle { font-family: var(--sans); font-size: 13px; color: var(--text-3); margin: 0 0 22px; }
.note { font-family: var(--sans); font-size: 13px; color: var(--text-3); padding: 20px 0; }
.note.err { color: #ff6b5e; }

.statstrip { display: flex; gap: 10px; margin-bottom: 26px; flex-wrap: wrap; }
.stat { flex: 1; min-width: 130px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 3px; }
.stat .n { font-family: var(--serif); font-size: 26px; color: var(--text); line-height: 1; }
.stat .n.gold { color: var(--gold-light); }
.stat .l { font-family: var(--sans); font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; }
.stat .d { font-family: var(--sans); font-size: 11px; color: var(--text-3); }

.section { margin-bottom: 34px; }
.section-title { font-family: var(--sans); font-size: 13px; color: var(--text-3); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 14px; }
.hint { font-family: var(--sans); font-size: 12px; color: var(--text-3); margin: 10px 0 0; line-height: 1.5; }

.table-scroll { overflow-x: auto; }
.plans { width: 100%; border-collapse: collapse; font-family: var(--sans); font-size: 13px; }
.plans th { background: var(--surface); color: var(--text-3); font-weight: 500; text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--line); white-space: nowrap; }
.plans th.num, .plans td.num { text-align: right; font-variant-numeric: tabular-nums; }
.plans td { padding: 9px 12px; border-bottom: 0.5px solid var(--line); color: var(--text-2); }
.plans tr.unused td { color: var(--text-3); }
.plans td.muted { color: var(--text-3); font-size: 12px; }
.pnote { color: var(--text-3); font-size: 11px; }
.plans td.good { color: #34c759; font-weight: 600; }
.plans td.mid { color: var(--gold-light); font-weight: 600; }
.plans td.bad { color: #D4673A; font-weight: 600; }
</style>
