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
              <th>Category</th>
              <th>Message</th>
              <th>Version</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in feedbackItems" :key="item.id" :class="{ dismissed: item._dismissed }">
              <td>
                <router-link v-if="item.user_id" :to="`/d/users?user=${item.user_id}`" class="user-link">
                  {{ item._user_name || 'Anonymous' }}
                </router-link>
                <span v-else class="text-muted">Anonymous</span>
              </td>
              <td><span class="category-badge">{{ item.category || '—' }}</span></td>
              <td class="message-cell">{{ item.message || '—' }}</td>
              <td>{{ item.app_version || '—' }}</td>
              <td>{{ formatDate(item.created_at) }}</td>
              <td>
                <button v-if="!item._dismissed" class="review-btn" @click="dismissItem('feedback', item)" title="Mark reviewed">&#10003;</button>
                <button class="delete-btn" @click="deleteItem('feedback', item)" title="Delete">&#215;</button>
              </td>
            </tr>
            <tr v-if="feedbackItems.length === 0">
              <td colspan="6" class="empty">No feedback yet.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Content Reports -->
      <div v-if="activeTab === 'reports'">
        <table class="data-table">
          <thead>
            <tr>
              <th>Content Type</th>
              <th>Content ID</th>
              <th>Reason</th>
              <th>Details</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in reportItems" :key="item.id">
              <td><span class="category-badge">{{ item.content_type || '—' }}</span></td>
              <td class="id-cell">{{ item.content_id || '—' }}</td>
              <td>{{ item.reason || '—' }}</td>
              <td class="message-cell">{{ item.details || '—' }}</td>
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
              <th>Query</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in requestItems" :key="item.id">
              <td>{{ item.query || '—' }}</td>
              <td>{{ formatDate(item.created_at) }}</td>
            </tr>
            <tr v-if="requestItems.length === 0">
              <td colspan="2" class="empty">No requests yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminRpc } from '../../lib/supabase'

const tabs = [
  { key: 'feedback', label: 'User Feedback' },
  { key: 'reports', label: 'Content Reports' },
  { key: 'requests', label: 'Topic Requests' },
]

const activeTab = ref('feedback')
const feedbackItems = ref<any[]>([])
const reportItems = ref<any[]>([])
const requestItems = ref<any[]>([])

function dismissItem(_table: string, item: any) {
  item._dismissed = true
}

async function deleteItem(table: string, item: any) {
  await adminRpc({ action: 'delete', table, id: item.id })
  if (table === 'feedback') feedbackItems.value = feedbackItems.value.filter(i => i.id !== item.id)
  else if (table === 'content_reports') reportItems.value = reportItems.value.filter(i => i.id !== item.id)
  else if (table === 'topic_requests') requestItems.value = requestItems.value.filter(i => i.id !== item.id)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

onMounted(async () => {
  const [fb, reports, requests] = await Promise.all([
    adminRpc({ action: 'select', table: 'feedback', order: { column: 'created_at', ascending: false }, limit: 100 }),
    adminRpc({ action: 'select', table: 'content_reports', order: { column: 'created_at', ascending: false }, limit: 100 }),
    adminRpc({ action: 'select', table: 'topic_requests', order: { column: 'created_at', ascending: false }, limit: 100 }),
  ])
  // Enrich feedback with user names
  const allItems = [...(fb.data ?? []), ...(reports.data ?? []), ...(requests.data ?? [])]
  const userIds = [...new Set(allItems.map((i: any) => i.user_id).filter(Boolean))]
  let userMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: users } = await adminRpc({ action: 'select', table: 'users', select: 'id, display_name' })
    userMap = Object.fromEntries((users ?? []).filter((u: any) => userIds.includes(u.id)).map((u: any) => [u.id, u.display_name || 'Anonymous']))
  }

  feedbackItems.value = (fb.data ?? []).map((i: any) => ({ ...i, _user_name: userMap[i.user_id] || null }))
  reportItems.value = (reports.data ?? []).map((i: any) => ({ ...i, _user_name: userMap[i.user_id] || null }))
  requestItems.value = (requests.data ?? []).map((i: any) => ({ ...i, _user_name: userMap[i.user_id] || null }))
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

.category-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-2);
  text-transform: capitalize;
}

.message-cell {
  max-width: 400px;
  white-space: pre-wrap;
  word-break: break-word;
}

.user-link { color: var(--gold-light); text-decoration: none; }
.user-link:hover { text-decoration: underline; }
.text-muted { color: var(--text-3); }

.review-btn, .delete-btn {
  font-size: 14px; background: none; border: none; cursor: pointer;
  width: 26px; height: 26px; border-radius: 4px; display: inline-flex;
  align-items: center; justify-content: center; transition: all 0.15s;
}
.review-btn { color: #34C759; }
.review-btn:hover { background: rgba(52, 199, 89, 0.1); }
.delete-btn { color: var(--text-3); }
.delete-btn:hover { color: #FF3B30; background: rgba(255, 59, 48, 0.08); }
tr.dismissed { opacity: 0.4; }

.id-cell {
  font-family: monospace;
  font-size: 11px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
