<template>
  <div class="health">
    <h1 class="page-title">System Health</h1>

    <div class="health-grid">
      <div class="health-card">
        <div class="health-header">
          <span class="dot" :class="dbStatus"></span>
          <span class="health-label">Database</span>
        </div>
        <span class="health-value">{{ dbStatus === 'green' ? 'Connected' : dbStatus === 'loading' ? '...' : 'Error' }}</span>
      </div>

      <div class="health-card" v-for="job in cronJobs" :key="job.name">
        <div class="health-header">
          <span class="dot" :class="job.status"></span>
          <span class="health-label">{{ job.name }}</span>
        </div>
        <span class="health-value">{{ job.lastRun }}</span>
      </div>

      <div class="health-card">
        <div class="health-header">
          <span class="dot" :class="stuckStreaks > 0 ? 'yellow' : 'green'"></span>
          <span class="health-label">Stuck Streaks</span>
        </div>
        <span class="health-value">{{ stuckStreaks }}</span>
      </div>
    </div>

    <button class="btn-gold" @click="runIntegrityCheck" :disabled="checking">
      {{ checking ? 'Running...' : 'Run Integrity Check' }}
    </button>

    <div v-if="integrityResult" class="integrity-result">
      <pre>{{ integrityResult }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface CronJob {
  name: string
  lastRun: string
  status: 'green' | 'red'
}

const dbStatus = ref<'green' | 'red' | 'loading'>('loading')
const cronJobs = ref<CronJob[]>([])
const stuckStreaks = ref(0)
const checking = ref(false)
const integrityResult = ref('')

function timeAgo(dateStr: string): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

onMounted(async () => {
  try {
    const res = await fetch('/api/health')
    if (res.ok) {
      const data = await res.json()
      dbStatus.value = data.database?.connected ? 'green' : 'red'
      stuckStreaks.value = data.stuck_streaks ?? data.stuckStreaks ?? 0

      if (data.cron_jobs || data.cronJobs) {
        const jobs = data.cron_jobs || data.cronJobs
        cronJobs.value = jobs.map((j: any) => ({
          name: j.name || j.jobname,
          lastRun: timeAgo(j.last_run || j.lastRun),
          status: j.status === 'ok' || j.active ? 'green' : 'red',
        }))
      }
    } else {
      dbStatus.value = 'red'
    }
  } catch {
    dbStatus.value = 'red'
  }
})

async function runIntegrityCheck() {
  checking.value = true
  integrityResult.value = ''
  try {
    const res = await fetch('/api/health/integrity')
    if (res.ok) {
      const data = await res.json()
      integrityResult.value = JSON.stringify(data, null, 2)
    } else {
      integrityResult.value = 'Failed to run integrity check.'
    }
  } catch {
    integrityResult.value = 'Network error.'
  } finally {
    checking.value = false
  }
}
</script>

<style scoped>
.health {
  max-width: 900px;
}

.page-title {
  font-family: var(--serif);
  font-size: 24px;
  color: var(--text);
  font-weight: 700;
  margin: 0 0 24px;
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.health-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.health-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot.green { background: #34C759; }
.dot.red { background: #FF3B30; }
.dot.yellow { background: #FFCC00; }
.dot.loading { background: var(--text-3); }

.health-label {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text-2);
}

.health-value {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text-3);
}

.btn-gold {
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  background: var(--gold);
  color: var(--bg);
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-gold:hover { opacity: 0.9; }
.btn-gold:disabled { opacity: 0.5; cursor: not-allowed; }

.integrity-result {
  margin-top: 16px;
  background: var(--raised);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
}

.integrity-result pre {
  font-family: 'SF Mono', monospace;
  font-size: 12px;
  color: var(--text-2);
  margin: 0;
  white-space: pre-wrap;
}
</style>
