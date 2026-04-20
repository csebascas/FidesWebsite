<template>
  <div class="feedback">
    <h1 class="page-title">Feedback</h1>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="tab-content">
      <!-- User Feedback -->
      <div v-if="activeTab === 'feedback'">
        <table class="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Message</th>
              <th>Screen</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in feedbackItems" :key="item.id">
              <td>{{ item.user_email || item.user_id || '—' }}</td>
              <td>{{ item.message || '—' }}</td>
              <td>{{ item.screen || '—' }}</td>
              <td>{{ formatDate(item.created_at) }}</td>
            </tr>
            <tr v-if="feedbackItems.length === 0">
              <td colspan="4" class="empty">No feedback yet.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Content Reports -->
      <div v-if="activeTab === 'reports'">
        <table class="data-table">
          <thead>
            <tr>
              <th>Content</th>
              <th>Type</th>
              <th>Reason</th>
              <th>Reporter</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in reportItems" :key="item.id">
              <td>{{ item.content_title || item.content_id || '—' }}</td>
              <td>{{ item.content_type || '—' }}</td>
              <td>{{ item.reason || '—' }}</td>
              <td>{{ item.reporter_email || item.reporter_id || '—' }}</td>
              <td>{{ formatDate(item.created_at) }}</td>
            </tr>
            <tr v-if="reportItems.length === 0">
              <td colspan="5" class="empty">No reports yet.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Topic Requests -->
      <div v-if="activeTab === 'requests'">
        <table class="data-table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Votes</th>
              <th>Requester</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in requestItems" :key="item.id">
              <td>{{ item.topic || '—' }}</td>
              <td>{{ item.votes ?? 0 }}</td>
              <td>{{ item.requester_email || item.requester_id || '—' }}</td>
              <td>{{ formatDate(item.created_at) }}</td>
            </tr>
            <tr v-if="requestItems.length === 0">
              <td colspan="4" class="empty">No requests yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const tabs = [
  { key: 'feedback', label: 'User Feedback' },
  { key: 'reports', label: 'Content Reports' },
  { key: 'requests', label: 'Topic Requests' },
]

const activeTab = ref('feedback')
const feedbackItems = ref<any[]>([])
const reportItems = ref<any[]>([])
const requestItems = ref<any[]>([])

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

onMounted(async () => {
  try {
    const res = await fetch('/api/content/feedback')
    if (res.ok) {
      const data = await res.json()
      feedbackItems.value = data.feedback || []
      reportItems.value = data.reports || []
      requestItems.value = data.requests || []
    }
  } catch {
    // ignore
  }
})
</script>

<style scoped>
.feedback {
  max-width: 1100px;
}

.page-title {
  font-family: var(--serif);
  font-size: 24px;
  color: var(--text);
  font-weight: 700;
  margin: 0 0 20px;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 0;
}

.tab-btn {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text-3);
  background: none;
  border: none;
  padding: 10px 16px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}

.tab-btn:hover {
  color: var(--text-2);
}

.tab-btn.active {
  color: var(--gold-light);
  border-bottom-color: var(--gold);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--sans);
  font-size: 13px;
}

.data-table th {
  background: var(--surface);
  color: var(--text-3);
  font-weight: 500;
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
}

.data-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  color: var(--text-2);
}

.empty {
  text-align: center;
  color: var(--text-3);
  padding: 32px 12px;
}
</style>
