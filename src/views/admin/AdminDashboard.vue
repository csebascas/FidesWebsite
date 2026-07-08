<template>
  <div class="dashboard">
    <header class="head rise" style="--i: 0">
      <h1 class="page-title">Dashboard</h1>
      <div class="date">{{ today }}</div>
    </header>

    <!-- Stat strip -->
    <div class="statstrip rise" style="--i: 1">
      <template v-if="loadingStats">
        <div v-for="i in 6" :key="i" class="stat">
          <div class="skeleton-number"></div>
          <div class="skeleton-label"></div>
        </div>
      </template>
      <template v-else>
        <div class="stat"><span class="n">{{ stats.totalUsers ?? '—' }}</span><span class="l">Total users</span></div>
        <div class="stat"><span class="n gold">{{ stats.proUsers ?? '—' }}</span><span class="l">Pro users</span></div>
        <div class="stat"><span class="n">{{ stats.activeToday ?? '—' }}</span><span class="l">Lessons today</span></div>
        <div class="stat"><span class="n">{{ stats.active7d ?? '—' }}</span><span class="l">Active 7d</span></div>
        <div class="stat"><span class="n">{{ stats.active30d ?? '—' }}</span><span class="l">Active 30d</span></div>
        <div class="stat"><span class="n">{{ stats.avgStreak ?? '—' }}</span><span class="l">Avg streak</span></div>
      </template>
    </div>

    <div class="dash-grid">
      <!-- Left column -->
      <div class="dash-col">
        <div class="section rise" style="--i: 2">
          <h2 class="section-title">Recent Activity</h2>
          <div v-if="activity.length === 0 && !loadingActivity" class="empty-text">No recent activity</div>
          <div class="feed">
            <div v-for="a in activity" :key="a.id" class="frow">
              <span class="fava" :class="{ gold: a.action === 'completed' }">{{ initials(a.name) }}</span>
              <span class="ftext">
                <strong>{{ a.name }}</strong> {{ a.action === 'joined' ? 'joined' : 'completed' }}
                <router-link v-if="a.route" :to="a.route" class="flink">{{ a.detail }}</router-link>
                <template v-else>{{ a.detail || '' }}</template>
              </span>
              <span class="ftime">{{ a.ago }}</span>
            </div>
          </div>
        </div>

        <div class="section rise" style="--i: 3">
          <h2 class="section-title">Content Health</h2>
          <div v-if="!loadingHealth && warnings.length === 0" class="health-ok">
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.5 5 9l4.5-5.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            All content looks healthy
          </div>
          <div v-for="w in warnings" :key="w.id" class="warn">
            <span class="wdot"></span>
            <span class="wtype">{{ w.type }}</span>
            <router-link :to="w.route" class="wname">{{ w.name }}</router-link>
            <span class="wissue">{{ w.issue }}</span>
          </div>
        </div>

        <div v-if="streakDist.length" class="section rise" style="--i: 4">
          <h2 class="section-title">Streak Distribution</h2>
          <div v-for="s in streakDist" :key="s.label" class="bar-row">
            <span class="bn">{{ s.label }}</span>
            <div class="bar-wrap"><div class="bar" :style="{ width: s.pct + '%' }"></div></div>
            <span class="bc">{{ s.count }}</span>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div class="dash-col">
        <div class="section rise" style="--i: 2">
          <h2 class="section-title">Content</h2>
          <div class="cgrid">
            <router-link v-for="c in contentCounts" :key="c.label" :to="c.route" class="ctile">
              <span class="cn">{{ c.count ?? '—' }}</span>
              <span class="cl">{{ c.label }}</span>
            </router-link>
          </div>
        </div>

        <div v-if="topLessons.length" class="section rise" style="--i: 3">
          <h2 class="section-title">Most Completed Lessons</h2>
          <div v-for="(l, i) in topLessons" :key="l.lesson_id" class="rank">
            <span class="r">{{ i + 1 }}</span>
            <router-link :to="`/d/content/lessons/${l.lesson_id}`" class="rt">{{ l.title }}</router-link>
            <span class="rtr">{{ l.track_name }}</span>
            <span class="rc">{{ l.completions }}</span>
          </div>
        </div>

        <div v-if="trackStats.length" class="section rise" style="--i: 4">
          <h2 class="section-title">Completions by Track</h2>
          <div v-for="t in trackStats" :key="t.name" class="bar-row">
            <span class="bn">{{ t.name }}</span>
            <div class="bar-wrap"><div class="bar" :style="{ width: t.pct + '%' }"></div></div>
            <span class="bc">{{ t.completions }}</span>
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

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/)
  const first = parts[0]?.[0] || '·'
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
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
.dashboard { max-width: 1080px; }

/* Entrance: fade + 8px rise, ease-out, 30ms stagger. No springs. */
.rise {
  opacity: 0;
  animation: rise 0.18s ease-out forwards;
  animation-delay: calc(var(--i, 0) * 30ms);
}
@keyframes rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

.head { margin-bottom: 22px; }
.page-title { font-family: var(--serif); font-size: 23px; color: var(--text); font-weight: 600; margin: 0; }
.date { font-family: var(--sans); font-size: 11px; color: var(--text-3); margin-top: 3px; }

/* Stat strip — one surface, hairline column dividers */
.statstrip {
  display: flex;
  background: var(--surface);
  border-radius: 10px;
  padding: 18px 0;
  margin-bottom: 26px;
}
.stat {
  flex: 1;
  padding: 0 20px;
  border-right: 0.5px solid #242424;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.stat:last-child { border-right: none; }
.stat .n { font-family: var(--sans); font-size: 24px; font-weight: 700; letter-spacing: -0.3px; color: var(--text); }
.stat .n.gold { color: var(--gold-light); }
.stat .l { font-family: var(--sans); font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text-3); }

.skeleton-number { width: 44px; height: 24px; background: var(--raised); border-radius: 4px; animation: pulse 1.5s ease-in-out infinite; }
.skeleton-label { width: 62px; height: 9px; background: var(--raised); border-radius: 3px; animation: pulse 1.5s ease-in-out infinite; animation-delay: 0.1s; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

/* Two-column layout */
.dash-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 34px; }
.section { margin-bottom: 26px; }
.section-title {
  font-family: var(--sans); font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.8px; color: var(--text-3); margin: 0 0 6px;
}

/* Activity feed — hairline rows, initials avatars */
.frow {
  display: flex; align-items: center; gap: 11px; padding: 9px 2px;
  border-bottom: 0.5px solid var(--line);
  font-family: var(--sans); font-size: 12px; color: var(--text-2);
}
.frow:last-child { border-bottom: none; }
.fava {
  width: 22px; height: 22px; border-radius: 11px; flex-shrink: 0;
  background: var(--raised); color: var(--text-2);
  font-size: 9px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.fava.gold { background: rgba(196, 145, 44, 0.08); color: var(--gold-light); }
.ftext { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ftext strong { color: var(--text); font-weight: 600; }
.flink { color: var(--gold-light); text-decoration: none; }
.flink:hover { text-decoration: underline; }
.ftime { font-size: 10.5px; color: var(--text-3); flex-shrink: 0; }

/* Content health */
.health-ok {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--sans); font-size: 12px; color: #7FB08A; padding: 9px 2px;
}
.warn {
  display: flex; align-items: center; gap: 10px; padding: 9px 2px;
  border-bottom: 0.5px solid var(--line);
  font-family: var(--sans); font-size: 12px;
}
.warn:last-child { border-bottom: none; }
.wdot { width: 5px; height: 5px; border-radius: 2.5px; background: var(--streak); flex-shrink: 0; }
.wtype { font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-3); width: 46px; flex-shrink: 0; }
.wname { color: var(--text); text-decoration: none; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wname:hover { color: var(--gold-light); }
.wissue { font-size: 10.5px; color: var(--text-3); flex-shrink: 0; }

/* Content tiles — no borders, depth via value */
.cgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.ctile {
  background: var(--surface); border-radius: 10px; padding: 13px 15px;
  display: flex; flex-direction: column; gap: 2px;
  text-decoration: none; transition: background 0.15s ease;
}
.ctile:hover { background: var(--raised); }
.cn { font-family: var(--sans); font-size: 19px; font-weight: 700; color: var(--text); }
.cl { font-family: var(--sans); font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-3); }

/* Ranked list — serif titles */
.rank {
  display: flex; align-items: center; gap: 10px; padding: 8px 2px;
  border-bottom: 0.5px solid var(--line);
  font-family: var(--sans); font-size: 12px;
}
.rank:last-child { border-bottom: none; }
.r { width: 16px; text-align: center; font-size: 10.5px; font-weight: 700; color: var(--gold-light); flex-shrink: 0; }
.rt {
  flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-family: var(--serif); font-size: 12.5px; color: var(--text); text-decoration: none;
}
.rt:hover { color: var(--gold-light); }
.rtr { font-size: 10px; color: var(--text-3); flex-shrink: 0; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc { width: 26px; text-align: right; font-weight: 600; color: var(--text-2); flex-shrink: 0; font-variant-numeric: tabular-nums; }

/* Bars — 4px, gold on raised */
.bar-row { display: flex; align-items: center; gap: 10px; padding: 7px 2px; font-family: var(--sans); font-size: 11.5px; }
.bn { width: 96px; color: var(--text-2); flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-wrap { flex: 1; height: 4px; background: var(--raised); border-radius: 2px; overflow: hidden; }
.bar { height: 100%; background: var(--gold); border-radius: 2px; transition: width 0.25s ease-out; }
.bc { width: 30px; text-align: right; font-weight: 600; color: var(--text-2); flex-shrink: 0; font-variant-numeric: tabular-nums; font-size: 11px; }

.empty-text { font-family: var(--sans); font-size: 12.5px; color: var(--text-3); padding: 9px 2px; }

@media (max-width: 900px) {
  .statstrip { flex-wrap: wrap; padding: 8px 0; }
  .stat { flex: 1 1 33%; padding: 10px 20px; border-right: none; }
  .dash-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .stat { flex: 1 1 50%; }
  .cgrid { grid-template-columns: repeat(2, 1fr); }
}
</style>
