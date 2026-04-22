<template>
  <div class="dashboard">
    <h1 class="page-title">Dashboard</h1>

    <!-- Stats grid -->
    <div class="stats-grid">
      <div v-if="loadingStats" v-for="i in 6" :key="i" class="stat-card skeleton">
        <div class="skeleton-number"></div>
        <div class="skeleton-label"></div>
      </div>
      <template v-if="!loadingStats">
        <div class="stat-card accent">
          <span class="stat-number">{{ stats.totalUsers ?? '—' }}</span>
          <span class="stat-label">Total Users</span>
        </div>
        <div class="stat-card accent">
          <span class="stat-number">{{ stats.proUsers ?? '—' }}</span>
          <span class="stat-label">Pro Users</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ stats.activeToday ?? '—' }}</span>
          <span class="stat-label">Lessons Today</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ stats.active7d ?? '—' }}</span>
          <span class="stat-label">Active 7d</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ stats.active30d ?? '—' }}</span>
          <span class="stat-label">Active 30d</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ stats.avgStreak ?? '—' }}</span>
          <span class="stat-label">Avg Streak</span>
        </div>
      </template>
    </div>

    <!-- Two-column layout -->
    <div class="dash-grid">
      <!-- Left column -->
      <div class="dash-col">
        <!-- Recent Activity -->
        <div class="section">
          <h2 class="section-title">Recent Activity</h2>
          <div v-if="activity.length === 0 && !loadingActivity" class="empty-text">No recent activity</div>
          <div class="activity-feed">
            <div v-for="a in activity" :key="a.id" class="activity-row">
              <span class="activity-icon" :class="a.action">{{ a.action === 'joined' ? '+' : '&#10003;' }}</span>
              <span class="activity-text">
                <strong>{{ a.name }}</strong> {{ a.action === 'joined' ? 'joined' : 'completed' }}
                <router-link v-if="a.route" :to="a.route" class="activity-link">{{ a.detail }}</router-link>
                <template v-else>{{ a.detail || '' }}</template>
              </span>
              <span class="activity-time">{{ a.ago }}</span>
            </div>
          </div>
        </div>

        <!-- Content Health -->
        <div class="section">
          <h2 class="section-title">Content Health</h2>
          <div v-if="!loadingHealth && warnings.length === 0" class="health-ok">All content looks healthy</div>
          <div v-for="w in warnings" :key="w.id" class="warning-row">
            <span class="warning-dot"></span>
            <span class="warning-type">{{ w.type }}</span>
            <router-link :to="w.route" class="warning-name">{{ w.name }}</router-link>
            <span class="warning-issue">{{ w.issue }}</span>
          </div>
        </div>

        <!-- Streak Distribution -->
        <div v-if="streakDist.length" class="section">
          <h2 class="section-title">Streak Distribution</h2>
          <div class="top-list">
            <div v-for="s in streakDist" :key="s.label" class="top-row">
              <span class="top-name streak-label">{{ s.label }}</span>
              <div class="bar-wrap"><div class="bar" :style="{ width: s.pct + '%' }"></div></div>
              <span class="top-count">{{ s.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div class="dash-col">
        <!-- Content counts -->
        <div class="section">
          <h2 class="section-title">Content</h2>
          <div class="content-grid">
            <router-link v-for="c in contentCounts" :key="c.label" :to="c.route" class="content-card">
              <span class="content-count">{{ c.count ?? '—' }}</span>
              <span class="content-label">{{ c.label }}</span>
            </router-link>
          </div>
        </div>

        <!-- Top lessons -->
        <div v-if="topLessons.length" class="section">
          <h2 class="section-title">Most Completed Lessons</h2>
          <div class="top-list">
            <div v-for="(l, i) in topLessons" :key="l.lesson_id" class="top-row">
              <span class="top-rank">{{ i + 1 }}</span>
              <router-link :to="`/d/content/lessons/${l.lesson_id}`" class="top-name link">{{ l.title }}</router-link>
              <span class="top-track">{{ l.track_name }}</span>
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
              <div class="bar-wrap"><div class="bar" :style="{ width: t.pct + '%' }"></div></div>
              <span class="top-count">{{ t.completions }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase, adminRpc } from '../../lib/supabase'

const loadingStats = ref(true)
const loadingActivity = ref(true)
const loadingHealth = ref(true)

const stats = ref<any>({})
const contentCounts = ref<any[]>([])
const topLessons = ref<any[]>([])
const trackStats = ref<any[]>([])
const streakDist = ref<any[]>([])
const activity = ref<any[]>([])
const warnings = ref<any[]>([])

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

onMounted(async () => {
  // 1. Stats from API
  try {
    const res = await fetch('/api/stats')
    if (res.ok) {
      const data = await res.json()
      stats.value = {
        totalUsers: data.total_users,
        proUsers: data.pro_users,
        activeToday: data.lessons_completed_today,
        active7d: data.users_last_7_days,
        active30d: data.users_last_30_days,
        avgStreak: data.average_streak,
      }
      // Streak distribution
      if (data.streak_distribution) {
        const maxS = Math.max(...Object.values(data.streak_distribution as Record<string, number>), 1)
        streakDist.value = Object.entries(data.streak_distribution).map(([label, count]) => ({
          label, count, pct: Math.round(((count as number) / maxS) * 100)
        }))
      }
    }
  } catch { /* keep defaults */ }
  loadingStats.value = false

  // 2. Content counts
  const tables = [
    { label: 'Lessons', table: 'lessons', route: '/d/content/lessons' },
    { label: 'Articles', table: 'articles', route: '/d/content/articles' },
    { label: 'Entries', table: 'reference_entries', route: '/d/content/entries' },
    { label: 'Saints', table: 'saints', route: '/d/content/saints' },
    { label: 'Tracks', table: 'tracks', route: '/d/content/tracks' },
    { label: 'Pillars', table: 'pillars', route: '/d/content/pillars' },
  ]
  const counts = await Promise.all(
    tables.map(async (t) => {
      const { count } = await supabase.from(t.table).select('*', { count: 'exact', head: true })
      return { label: t.label, count, route: t.route }
    })
  )
  contentCounts.value = counts

  // 3. Recent activity feed (users table needs service role)
  const [signups, completions] = await Promise.all([
    adminRpc({ action: 'select', table: 'users', select: 'id, display_name, created_at', order: { column: 'created_at', ascending: false }, limit: 6 }),
    adminRpc({ action: 'select', table: 'user_lesson_progress', select: 'id, user_id, lesson_id, completed_at', match: { completed: true }, order: { column: 'completed_at', ascending: false }, limit: 10 }),
  ])

  const feed: any[] = []

  for (const u of (signups.data ?? [])) {
    feed.push({ id: `signup-${u.id}`, name: u.display_name || 'Anonymous', action: 'joined', detail: '', route: '', ago: timeAgo(u.created_at), ts: new Date(u.created_at).getTime() })
  }

  if (completions.data && completions.data.length > 0) {
    const lessonIds = [...new Set(completions.data.map((c: any) => c.lesson_id))]
    const userIds = [...new Set(completions.data.map((c: any) => c.user_id))]
    const [lessonRes, userRes] = await Promise.all([
      supabase.from('lessons').select('id, title').in('id', lessonIds),
      adminRpc({ action: 'select', table: 'users', select: 'id, display_name' }),
    ])
    const lessonMap = Object.fromEntries((lessonRes.data ?? []).map((l: any) => [l.id, l.title]))
    const allUsers = (userRes.data ?? []).filter((u: any) => userIds.includes(u.id))
    const userMap = Object.fromEntries(allUsers.map((u: any) => [u.id, u.display_name || 'Anonymous']))

    for (const c of completions.data) {
      feed.push({
        id: `comp-${c.id}`, name: userMap[c.user_id] || 'Anonymous', action: 'completed',
        detail: lessonMap[c.lesson_id] || 'a lesson', route: `/d/content/lessons/${c.lesson_id}`,
        ago: timeAgo(c.completed_at), ts: new Date(c.completed_at).getTime(),
      })
    }
  }

  feed.sort((a, b) => b.ts - a.ts)
  activity.value = feed.slice(0, 12)
  loadingActivity.value = false

  // 4. Top lessons and track stats
  const { data: progress } = await supabase.from('user_lesson_progress').select('lesson_id').eq('completed', true)
  if (progress && progress.length > 0) {
    const countMap: Record<string, number> = {}
    for (const p of progress) countMap[p.lesson_id] = (countMap[p.lesson_id] || 0) + 1

    const lessonIds = Object.keys(countMap)
    const { data: lessons } = await supabase.from('lessons').select('id, title, track_id').in('id', lessonIds)
    const trackIds = [...new Set((lessons ?? []).map((l: any) => l.track_id).filter(Boolean))]
    const { data: tracks } = await supabase.from('tracks').select('id, name').in('id', trackIds)
    const trackMap = Object.fromEntries((tracks ?? []).map((t: any) => [t.id, t.name]))

    topLessons.value = (lessons ?? [])
      .map((l: any) => ({ lesson_id: l.id, title: l.title, track_name: trackMap[l.track_id] || '', completions: countMap[l.id] || 0 }))
      .sort((a: any, b: any) => b.completions - a.completions)
      .slice(0, 10)

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

  // 5. Content health warnings
  const [lessonsCheck, articlesCheck, saintsCheck] = await Promise.all([
    supabase.from('lessons').select('id, title, content').eq('active', true),
    supabase.from('articles').select('id, title, body').eq('published', true),
    supabase.from('saints').select('id, name, short_bio'),
  ])

  const w: any[] = []
  for (const l of (lessonsCheck.data ?? [])) {
    const steps = Array.isArray(l.content) ? l.content : []
    if (steps.length < 3) w.push({ id: `l-${l.id}`, type: 'Lesson', name: l.title, route: `/d/content/lessons/${l.id}`, issue: `Only ${steps.length} steps` })
  }
  for (const a of (articlesCheck.data ?? [])) {
    const blocks = Array.isArray(a.body) ? a.body : []
    if (blocks.length === 0) w.push({ id: `a-${a.id}`, type: 'Article', name: a.title, route: `/d/content/articles/${a.id}`, issue: 'Empty body' })
  }
  for (const s of (saintsCheck.data ?? [])) {
    if (!s.short_bio) w.push({ id: `s-${s.id}`, type: 'Saint', name: s.name, route: `/d/content/saints/${s.id}`, issue: 'Missing bio' })
  }
  warnings.value = w.slice(0, 10)
  loadingHealth.value = false
})
</script>

<style scoped>
.dashboard { max-width: 1100px; }
.page-title { font-family: var(--serif); font-size: 24px; color: var(--text); font-weight: 700; margin: 0 0 24px; }

/* Stats */
.stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
.stat-card {
  background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
  padding: 18px; display: flex; flex-direction: column; gap: 4px;
}
.stat-card.accent { border-left: 3px solid var(--gold); }
.stat-number { font-family: var(--sans); font-size: 24px; font-weight: 700; color: var(--text); }
.stat-label { font-family: var(--sans); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-3); }
.stat-card.skeleton { min-height: 80px; }
.skeleton-number { width: 50px; height: 24px; background: var(--raised); border-radius: 4px; animation: pulse 1.5s ease-in-out infinite; }
.skeleton-label { width: 70px; height: 10px; background: var(--raised); border-radius: 3px; animation: pulse 1.5s ease-in-out infinite; animation-delay: 0.1s; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

/* Two-column layout */
.dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 28px; }
.section { margin-bottom: 28px; }
.section-title { font-family: var(--sans); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-3); margin: 0 0 10px; }

/* Activity feed */
.activity-feed { display: flex; flex-direction: column; gap: 2px; }
.activity-row {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  background: var(--surface); border-radius: 6px; font-family: var(--sans); font-size: 12px;
}
.activity-icon {
  width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0;
}
.activity-icon.joined { background: rgba(52, 199, 89, 0.12); color: #34C759; }
.activity-icon.completed { background: rgba(0, 122, 255, 0.12); color: #007AFF; }
.activity-text { flex: 1; color: var(--text-2); line-height: 1.4; }
.activity-text strong { color: var(--text); font-weight: 600; }
.activity-link { color: var(--gold-light); text-decoration: none; }
.activity-link:hover { text-decoration: underline; }
.activity-time { font-size: 11px; color: var(--text-3); flex-shrink: 0; white-space: nowrap; }

/* Content health */
.health-ok { font-family: var(--sans); font-size: 13px; color: #34C759; padding: 12px; background: rgba(52, 199, 89, 0.06); border-radius: 6px; }
.warning-row {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px;
  background: var(--surface); border-radius: 6px; font-family: var(--sans); font-size: 12px; margin-bottom: 2px;
}
.warning-dot { width: 6px; height: 6px; border-radius: 50%; background: #FFCC00; flex-shrink: 0; }
.warning-type { font-size: 10px; font-weight: 600; text-transform: uppercase; color: var(--text-3); flex-shrink: 0; width: 48px; }
.warning-name { color: var(--gold-light); text-decoration: none; flex: 1; }
.warning-name:hover { text-decoration: underline; }
.warning-issue { font-size: 11px; color: var(--text-3); flex-shrink: 0; }

/* Content counts */
.content-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.content-card {
  background: var(--surface); border: 1px solid var(--line); border-radius: 8px;
  padding: 14px; display: flex; flex-direction: column; gap: 4px;
  text-decoration: none; transition: border-color 0.15s, background 0.15s; cursor: pointer;
}
.content-card:hover { border-color: var(--gold); background: var(--raised); }
.content-count { font-family: var(--sans); font-size: 20px; font-weight: 700; color: var(--text); }
.content-label { font-family: var(--sans); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-3); }

/* Top lists / bar charts */
.top-list { display: flex; flex-direction: column; gap: 2px; }
.top-row {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  background: var(--surface); border-radius: 6px; font-family: var(--sans); font-size: 12px;
}
.top-rank { font-weight: 700; color: var(--gold-light); width: 18px; text-align: center; flex-shrink: 0; }
.top-name { flex: 1; color: var(--text-2); }
.top-name.link { color: var(--text-2); text-decoration: none; }
.top-name.link:hover { color: var(--gold-light); }
.top-track { font-size: 11px; color: var(--text-3); flex-shrink: 0; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.top-count { font-weight: 600; color: var(--text); width: 28px; text-align: right; flex-shrink: 0; }
.bar-wrap { flex: 1; height: 6px; background: var(--raised); border-radius: 3px; overflow: hidden; }
.bar { height: 100%; background: var(--gold); border-radius: 3px; transition: width 0.3s; }
.streak-label { width: 44px; flex: none; }
.empty-text { font-family: var(--sans); font-size: 13px; color: var(--text-3); padding: 12px; }

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: repeat(3, 1fr); }
  .dash-grid { grid-template-columns: 1fr; }
  .content-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 600px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .content-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
