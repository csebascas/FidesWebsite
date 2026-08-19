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

      <div class="health-card">
        <div class="health-header">
          <span class="dot" :class="stuckStreaks > 0 ? 'yellow' : 'green'"></span>
          <span class="health-label">Stuck Streaks</span>
        </div>
        <span class="health-value">{{ stuckStreaks }}</span>
      </div>

      <div class="health-card">
        <div class="health-header">
          <span class="dot neutral"></span>
          <span class="health-label">Total Users</span>
        </div>
        <span class="health-value">{{ totalUsers?.toLocaleString() ?? '...' }}</span>
      </div>

      <div class="health-card">
        <div class="health-header">
          <span class="dot neutral"></span>
          <span class="health-label">Pro Users</span>
        </div>
        <span class="health-value">{{ proUsers?.toLocaleString() ?? '...' }}</span>
      </div>
    </div>

    <button class="btn-gold" @click="runIntegrityCheck" :disabled="checking">
      {{ checking ? 'Running...' : 'Run Integrity Check' }}
    </button>

    <div v-if="integrityResult" class="integrity-result">
      <div v-for="(check, key) in integrityChecks" :key="key" class="integrity-row">
        <span class="dot" :class="check.ok ? 'green' : 'red'"></span>
        <span class="integrity-key">{{ key }}</span>
        <span class="integrity-detail">{{ check.detail }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const dbStatus = ref<'green' | 'red' | 'loading'>('loading')
const stuckStreaks = ref(0)
const totalUsers = ref<number | null>(null)
const proUsers = ref<number | null>(null)
const checking = ref(false)
const integrityResult = ref(false)
const integrityChecks = ref<Record<string, { ok: boolean; detail: string }>>({})

onMounted(async () => {
  try {
    const res = await fetch('/api/health')
    if (res.ok) {
      const data = await res.json()
      dbStatus.value = data.database?.connected ? 'green' : 'red'
      stuckStreaks.value = data.stuck_streaks ?? 0
      totalUsers.value = data.total_users
      proUsers.value = data.pro_users
    } else {
      dbStatus.value = 'red'
    }
  } catch {
    dbStatus.value = 'red'
  }
})

async function runIntegrityCheck() {
  checking.value = true
  integrityResult.value = false
  integrityChecks.value = {}
  try {
    const res = await fetch('/api/health/integrity')
    if (res.ok) {
      const data = await res.json()
      integrityChecks.value = data.checks ?? {}
      integrityResult.value = true
    } else {
      integrityChecks.value = { error: { ok: false, detail: 'Failed to run integrity check.' } }
      integrityResult.value = true
    }
  } catch {
    integrityChecks.value = { error: { ok: false, detail: 'Network error.' } }
    integrityResult.value = true
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
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
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
.dot.neutral { background: var(--text-3); opacity: 0.5; }

.health-label {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text-2);
}

.health-value {
  font-family: var(--sans);
  font-size: 18px;
  color: var(--text);
  font-weight: 600;
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
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.integrity-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.integrity-key {
  font-family: 'SF Mono', monospace;
  font-size: 12px;
  color: var(--text-2);
  min-width: 180px;
}

.integrity-detail {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text-3);
}
</style>
