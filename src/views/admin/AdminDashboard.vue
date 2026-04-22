<template>
  <div class="dashboard">
    <h1 class="page-title">Dashboard</h1>

    <div class="stats-grid">
      <div v-if="loading" v-for="i in 4" :key="i" class="stat-card skeleton">
        <div class="skeleton-number"></div>
        <div class="skeleton-label"></div>
      </div>

      <template v-if="!loading">
        <div class="stat-card">
          <span class="stat-number">{{ stats.totalUsers ?? '—' }}</span>
          <span class="stat-label">Total Users</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ stats.proUsers ?? '—' }}</span>
          <span class="stat-label">Pro Users</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ stats.activeToday ?? '—' }}</span>
          <span class="stat-label">Active Today</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ stats.avgStreak ?? '—' }}</span>
          <span class="stat-label">Avg Streak</span>
        </div>
      </template>
    </div>

    <!-- Content counts -->
    <div v-if="!loading" class="section">
      <h2 class="section-title">Content</h2>
      <div class="stats-grid small">
        <div v-for="c in contentCounts" :key="c.label" class="stat-card mini">
          <span class="stat-number small">{{ c.count ?? '—' }}</span>
          <span class="stat-label">{{ c.label }}</span>
        </div>
      </div>
    </div>

    <!-- Top lessons -->
    <div v-if="topLessons.length" class="section">
      <h2 class="section-title">Most Completed Lessons</h2>
      <div class="top-list">
        <div v-for="(l, i) in topLessons" :key="l.lesson_id" class="top-row">
          <span class="top-rank">{{ i + 1 }}</span>
          <span class="top-name">{{ l.title }}</span>
          <span class="top-track">{{ l.track_name || '' }}</span>
          <span class="top-count">{{ l.completions }}</span>
        </div>
      </div>
    </div>

    <!-- Track completion -->
    <div v-if="trackStats.length" class="section">
      <h2 class="section-title">Completions by Track</h2>
      <div class="top-list">
        <div v-for="t in trackStats" :key="t.name" class="top-row">
          <span class="top-name">{{ t.name }}</span>
          <div class="bar-wrap">
            <div class="bar" :style="{ width: t.pct + '%' }"></div>
          </div>
          <span class="top-count">{{ t.completions }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'

interface Stats {
  totalUsers: number | null
  proUsers: number | null
  activeToday: number | null
  avgStreak: number | null
}

const loading = ref(true)
const stats = ref<Stats>({ totalUsers: null, proUsers: null, activeToday: null, avgStreak: null })
const contentCounts = ref<{ label: string; count: number | null }[]>([])
const topLessons = ref<any[]>([])
const trackStats = ref<any[]>([])

onMounted(async () => {
  // Stats from API (uses service role for auth-only queries)
  try {
    const res = await fetch('/api/stats')
    if (res.ok) {
      const data = await res.json()
      stats.value = {
        totalUsers: data.total_users ?? null,
        proUsers: data.pro_users ?? null,
        activeToday: data.lessons_completed_today ?? null,
        avgStreak: data.average_streak ?? null,
      }
    }
  } catch { /* keep defaults */ }

  // Content counts via Supabase
  const tables = [
    { label: 'Lessons', table: 'lessons' },
    { label: 'Articles', table: 'articles' },
    { label: 'Entries', table: 'reference_entries' },
    { label: 'Saints', table: 'saints' },
    { label: 'Tracks', table: 'tracks' },
    { label: 'Pillars', table: 'pillars' },
  ]
  const counts = await Promise.all(
    tables.map(async (t) => {
      const { count } = await supabase.from(t.table).select('*', { count: 'exact', head: true })
      return { label: t.label, count }
    })
  )
  contentCounts.value = counts

  // Top lessons by completion
  const { data: progress } = await supabase
    .from('user_lesson_progress')
    .select('lesson_id')
    .eq('completed', true)

  if (progress && progress.length > 0) {
    // Count completions per lesson
    const countMap: Record<string, number> = {}
    for (const p of progress) {
      countMap[p.lesson_id] = (countMap[p.lesson_id] || 0) + 1
    }

    // Get lesson titles and track info
    const lessonIds = Object.keys(countMap)
    const { data: lessons } = await supabase.from('lessons').select('id, title, track_id').in('id', lessonIds)
    const trackIds = [...new Set((lessons ?? []).map((l: any) => l.track_id).filter(Boolean))]
    const { data: tracks } = await supabase.from('tracks').select('id, name').in('id', trackIds)
    const trackMap = Object.fromEntries((tracks ?? []).map((t: any) => [t.id, t.name]))

    const ranked = (lessons ?? [])
      .map((l: any) => ({ lesson_id: l.id, title: l.title, track_name: trackMap[l.track_id] || '', completions: countMap[l.id] || 0 }))
      .sort((a: any, b: any) => b.completions - a.completions)
      .slice(0, 10)
    topLessons.value = ranked

    // Track-level aggregation
    const trackCounts: Record<string, number> = {}
    for (const l of lessons ?? []) {
      const tn = trackMap[l.track_id] || 'Unknown'
      trackCounts[tn] = (trackCounts[tn] || 0) + (countMap[l.id] || 0)
    }
    const maxTrack = Math.max(...Object.values(trackCounts), 1)
    trackStats.value = Object.entries(trackCounts)
      .map(([name, completions]) => ({ name, completions, pct: Math.round((completions / maxTrack) * 100) }))
      .sort((a, b) => b.completions - a.completions)
  }

  loading.value = false
})
</script>

<style scoped>
.dashboard { max-width: 1000px; }
.page-title { font-family: var(--serif); font-size: 24px; color: var(--text); font-weight: 700; margin: 0 0 24px; }
.section { margin-top: 32px; }
.section-title { font-family: var(--sans); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-3); margin: 0 0 12px; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stats-grid.small { grid-template-columns: repeat(6, 1fr); }
.stat-card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 6px; }
.stat-card.mini { padding: 14px; }
.stat-number { font-family: var(--sans); font-size: 28px; font-weight: 700; color: var(--text); }
.stat-number.small { font-size: 20px; }
.stat-label { font-family: var(--sans); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-3); }
.stat-card.skeleton { min-height: 90px; }
.skeleton-number { width: 60px; height: 28px; background: var(--raised); border-radius: 4px; animation: pulse 1.5s ease-in-out infinite; }
.skeleton-label { width: 80px; height: 12px; background: var(--raised); border-radius: 3px; animation: pulse 1.5s ease-in-out infinite; animation-delay: 0.1s; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

/* Top lessons */
.top-list { display: flex; flex-direction: column; gap: 2px; }
.top-row {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  background: var(--surface); border-radius: 6px; font-family: var(--sans); font-size: 13px;
}
.top-rank { font-weight: 700; color: var(--gold-light); width: 20px; text-align: center; flex-shrink: 0; }
.top-name { flex: 1; color: var(--text-2); }
.top-track { font-size: 11px; color: var(--text-3); flex-shrink: 0; }
.top-count { font-weight: 600; color: var(--text); width: 32px; text-align: right; flex-shrink: 0; }

/* Bar chart */
.bar-wrap { flex: 1; height: 8px; background: var(--raised); border-radius: 4px; overflow: hidden; }
.bar { height: 100%; background: var(--gold); border-radius: 4px; transition: width 0.3s; }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .stats-grid.small { grid-template-columns: repeat(3, 1fr); }
}
</style>
