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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Stats {
  totalUsers: number | null
  proUsers: number | null
  activeToday: number | null
  avgStreak: number | null
}

const loading = ref(true)
const stats = ref<Stats>({
  totalUsers: null,
  proUsers: null,
  activeToday: null,
  avgStreak: null,
})

onMounted(async () => {
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
  } catch {
    // keep defaults
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.dashboard {
  max-width: 900px;
}

.page-title {
  font-family: var(--serif);
  font-size: 24px;
  color: var(--text);
  font-weight: 700;
  margin: 0 0 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-number {
  font-family: var(--sans);
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
}

.stat-label {
  font-family: var(--sans);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-3);
}

.stat-card.skeleton {
  min-height: 90px;
}

.skeleton-number {
  width: 60px;
  height: 28px;
  background: var(--raised);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-label {
  width: 80px;
  height: 12px;
  background: var(--raised);
  border-radius: 3px;
  animation: pulse 1.5s ease-in-out infinite;
  animation-delay: 0.1s;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
