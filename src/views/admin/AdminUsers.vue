<template>
  <div class="users-page">
    <div class="page-header">
      <h1 class="page-title">Users <span v-if="users.length" class="row-count">({{ users.length }})</span></h1>
      <div class="filter-bar">
        <select v-model="tierFilter" class="filter-select">
          <option value="">All tiers</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </select>
        <select v-model="leagueFilter" class="filter-select">
          <option value="">All leagues</option>
          <option value="bronze">Bronze</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
          <option value="diamond">Diamond</option>
        </select>
        <input v-model="search" type="text" class="search-input" placeholder="Search users..." />
      </div>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th @click="sortBy('display_name')" class="sortable">Name <span v-if="sortKey === 'display_name'" class="sort-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</span></th>
            <th @click="sortBy('xp')" class="sortable">XP <span v-if="sortKey === 'xp'" class="sort-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</span></th>
            <th @click="sortBy('level')" class="sortable">Level <span v-if="sortKey === 'level'" class="sort-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</span></th>
            <th @click="sortBy('streak_current')" class="sortable">Streak <span v-if="sortKey === 'streak_current'" class="sort-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</span></th>
            <th>League</th>
            <th>Tier</th>
            <th @click="sortBy('created_at')" class="sortable">Joined <span v-if="sortKey === 'created_at'" class="sort-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</span></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in filteredUsers" :key="user.id" @click="selectUser(user)" class="clickable" :class="{ selected: selectedUser?.id === user.id }">
            <td>{{ user.display_name || '—' }}</td>
            <td>{{ user.xp?.toLocaleString() ?? 0 }}</td>
            <td>{{ user.level }}</td>
            <td>
              <span v-if="user.streak_current > 0" class="streak-badge">{{ user.streak_current }}d</span>
              <span v-else class="text-muted">0</span>
              <span v-if="user.streak_longest > 0" class="text-muted"> (best: {{ user.streak_longest }})</span>
            </td>
            <td><span class="league-badge" :class="user.league">{{ user.league }}</span></td>
            <td><span class="tier-badge" :class="user.subscription_tier">{{ user.subscription_tier }}</span></td>
            <td>{{ formatDate(user.created_at) }}</td>
            <td>
              <button class="delete-btn" @click.stop="confirmDelete(user)" title="Delete user">×</button>
            </td>
          </tr>
          <tr v-if="!loading && filteredUsers.length === 0">
            <td colspan="8" class="empty">No users found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="loading-text">Loading...</div>

    <!-- User detail panel -->
    <div v-if="selectedUser" class="detail-panel">
      <div class="detail-header">
        <h3 class="detail-title">{{ selectedUser.display_name || 'Anonymous' }}</h3>
        <button class="close-btn" @click="selectedUser = null">×</button>
      </div>
      <div class="detail-body">
        <div class="detail-row">
          <span class="detail-label">ID</span>
          <span class="detail-value mono">{{ selectedUser.id }}</span>
        </div>
        <div class="detail-edit-section">
          <h4 class="detail-section-title">Profile</h4>
          <div class="detail-field">
            <label>Display Name</label>
            <input v-model="selectedUser.display_name" class="detail-input" />
          </div>
          <div class="detail-field">
            <label>Tier</label>
            <select v-model="selectedUser.subscription_tier" class="detail-input">
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div class="detail-field-row">
            <div class="detail-field">
              <label>XP</label>
              <input v-model.number="selectedUser.xp" class="detail-input" type="number" />
            </div>
            <div class="detail-field">
              <label>Level</label>
              <input v-model.number="selectedUser.level" class="detail-input" type="number" />
            </div>
          </div>
          <div class="detail-field">
            <label>League</label>
            <select v-model="selectedUser.league" class="detail-input">
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
              <option value="diamond">Diamond</option>
            </select>
          </div>
          <div class="detail-field-row">
            <div class="detail-field">
              <label>Streak</label>
              <input v-model.number="selectedUser.streak_current" class="detail-input" type="number" />
            </div>
            <div class="detail-field">
              <label>Best Streak</label>
              <input v-model.number="selectedUser.streak_longest" class="detail-input" type="number" />
            </div>
          </div>
          <button class="btn-save" @click="saveUser" :disabled="savingUser">{{ savingUser ? 'Saving...' : 'Save Changes' }}</button>
          <span v-if="userSaveMsg" class="save-msg" :class="userSaveErr ? 'err' : 'ok'">{{ userSaveMsg }}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">Onboarded</span>
          <span class="bool-badge" :class="selectedUser.onboarding_completed ? 'yes' : 'no'">{{ selectedUser.onboarding_completed ? 'Yes' : 'No' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Joined</span>
          <span class="detail-value">{{ formatDate(selectedUser.created_at) }}</span>
        </div>

        <div class="detail-section">
          <h4 class="detail-section-title">Lessons Completed</h4>
          <div v-if="userProgress.length === 0" class="text-muted">None yet</div>
          <div v-for="p in userProgress" :key="p.id" class="progress-row">
            <span>{{ p.lesson_title || p.lesson_id }}</span>
            <span class="text-muted">{{ p.times_completed }}× · {{ p.best_score ?? '—' }}★</span>
          </div>
        </div>

        <div class="detail-actions">
          <button class="btn-danger" @click="confirmDelete(selectedUser)">Delete User</button>
        </div>
      </div>
    </div>

    <!-- Delete confirmation -->
    <div v-if="deleteTarget" class="modal-overlay" @click="deleteTarget = null">
      <div class="modal" @click.stop>
        <h3 class="modal-title">Delete user?</h3>
        <p class="modal-body">This will permanently remove <strong>{{ deleteTarget.display_name || deleteTarget.id }}</strong> and all their progress. This cannot be undone.</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="deleteTarget = null">Cancel</button>
          <button class="btn-danger" @click="handleDelete" :disabled="deleting">{{ deleting ? 'Deleting...' : 'Delete' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'
import { adminRpc } from '../../lib/supabase'

const users = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const tierFilter = ref('')
const leagueFilter = ref('')
const sortKey = ref('created_at')
const sortDir = ref<'asc' | 'desc'>('desc')
const selectedUser = ref<any>(null)
const userProgress = ref<any[]>([])
const deleteTarget = ref<any>(null)
const deleting = ref(false)
const savingUser = ref(false)
const userSaveMsg = ref('')
const userSaveErr = ref(false)

async function saveUser() {
  if (!selectedUser.value) return
  savingUser.value = true
  userSaveMsg.value = ''
  userSaveErr.value = false
  const { display_name, subscription_tier, xp, level, league, streak_current, streak_longest } = selectedUser.value
  const { error } = await adminRpc({
    action: 'update', table: 'users', id: selectedUser.value.id,
    data: { display_name, subscription_tier, xp, level, league, streak_current, streak_longest },
  })
  if (error) { userSaveErr.value = true; userSaveMsg.value = `Failed: ${error}` }
  else { userSaveMsg.value = 'Saved.' }
  savingUser.value = false
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const filteredUsers = computed(() => {
  let result = users.value
  if (tierFilter.value) result = result.filter(u => u.subscription_tier === tierFilter.value)
  if (leagueFilter.value) result = result.filter(u => u.league === leagueFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(u => (u.display_name || '').toLowerCase().includes(q) || u.id.includes(q))
  }
  if (sortKey.value) {
    result = [...result].sort((a, b) => {
      const av = a[sortKey.value] ?? ''
      const bv = b[sortKey.value] ?? ''
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir.value === 'asc' ? cmp : -cmp
    })
  }
  return result
})

function sortBy(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

async function selectUser(user: any) {
  selectedUser.value = user
  const { data } = await adminRpc({
    action: 'select', table: 'user_lesson_progress',
    match: { user_id: user.id, completed: true },
    order: { column: 'completed_at', ascending: false }, limit: 50,
  })

  if (data && data.length > 0) {
    const lessonIds = [...new Set(data.map((p: any) => p.lesson_id))]
    const { data: lessons } = await supabase.from('lessons').select('id, title').in('id', lessonIds)
    const titleMap = Object.fromEntries((lessons ?? []).map((l: any) => [l.id, l.title]))
    userProgress.value = data.map((p: any) => ({ ...p, lesson_title: titleMap[p.lesson_id] || null }))
  } else {
    userProgress.value = []
  }
}

function confirmDelete(user: any) {
  deleteTarget.value = user
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  const userId = deleteTarget.value.id

  // Delete related data first, then user
  for (const t of ['user_lesson_progress', 'user_track_progress', 'user_saint_unlocks', 'user_badges', 'league_entries']) {
    await adminRpc({ action: 'delete', table: t, match: { user_id: userId } })
  }
  const { error } = await adminRpc({ action: 'delete', table: 'users', id: userId })

  if (!error) {
    users.value = users.value.filter(u => u.id !== userId)
    if (selectedUser.value?.id === userId) selectedUser.value = null
    deleteTarget.value = null
  }
  deleting.value = false
}

onMounted(async () => {
  const { data } = await adminRpc({
    action: 'select', table: 'users',
    order: { column: 'created_at', ascending: false }, limit: 500,
  })
  users.value = data ?? []
  loading.value = false
})
</script>

<style scoped>
.users-page { max-width: 1200px; }
.page-header { margin-bottom: 20px; }
.page-title {
  font-family: var(--serif);
  font-size: 24px;
  color: var(--text);
  font-weight: 700;
  margin: 0 0 12px;
}
.row-count { font-family: var(--sans); font-size: 14px; font-weight: 400; color: var(--text-3); }
.filter-bar { display: flex; gap: 8px; flex-wrap: wrap; }
.filter-select {
  font-family: var(--sans); font-size: 13px; padding: 8px 12px; border-radius: 6px;
  border: 1px solid var(--line); background: var(--raised); color: var(--text); cursor: pointer;
}
.search-input {
  font-family: var(--sans); font-size: 13px; padding: 8px 12px; border-radius: 6px;
  border: 1px solid var(--line); background: var(--raised); color: var(--text); flex: 1; min-width: 180px;
}
.search-input::placeholder { color: var(--text-3); }
.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-family: var(--sans); font-size: 13px; }
.data-table th {
  background: var(--surface); color: var(--text-3); font-weight: 500; text-align: left;
  padding: 10px 12px; border-bottom: 1px solid var(--line); white-space: nowrap; user-select: none;
}
.data-table th.sortable { cursor: pointer; }
.data-table th.sortable:hover { color: var(--text-2); }
.sort-arrow { margin-left: 4px; font-size: 11px; }
.data-table td { padding: 10px 12px; border-bottom: 1px solid var(--line); color: var(--text-2); }
.data-table tr.clickable { cursor: pointer; transition: background 0.15s; }
.data-table tr.clickable:hover { background: var(--raised); }
.data-table tr.selected { background: rgba(200, 165, 90, 0.08); }
.empty { text-align: center; color: var(--text-3); padding: 32px 12px; }
.loading-text { font-family: var(--sans); font-size: 13px; color: var(--text-3); margin-top: 16px; }
.text-muted { color: var(--text-3); font-size: 12px; }
.mono { font-family: monospace; font-size: 11px; }

.streak-badge { color: var(--gold-light); font-weight: 600; }
.league-badge {
  font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 500; text-transform: capitalize;
}
.league-badge.bronze { background: rgba(142, 142, 147, 0.1); color: #8E8E93; }
.league-badge.silver { background: rgba(174, 174, 178, 0.15); color: #AEAEB2; }
.league-badge.gold { background: rgba(200, 165, 90, 0.15); color: var(--gold-light); }
.league-badge.platinum { background: rgba(0, 199, 190, 0.12); color: #00C7BE; }
.league-badge.diamond { background: rgba(0, 122, 255, 0.12); color: #007AFF; }
.tier-badge {
  font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 500; text-transform: capitalize;
}
.tier-badge.free { background: rgba(142, 142, 147, 0.1); color: #8E8E93; }
.tier-badge.pro { background: rgba(200, 165, 90, 0.15); color: var(--gold-light); }
.bool-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
.bool-badge.yes { background: rgba(52, 199, 89, 0.15); color: #34C759; }
.bool-badge.no { background: rgba(142, 142, 147, 0.1); color: var(--text-3); }

.delete-btn {
  font-size: 16px; color: var(--text-3); background: none; border: none; cursor: pointer;
  width: 24px; height: 24px; border-radius: 4px; transition: all 0.15s;
}
.delete-btn:hover { color: #FF3B30; background: rgba(255, 59, 48, 0.08); }

/* Detail panel */
.detail-panel {
  position: fixed; top: 0; right: 0; bottom: 0; width: 380px; background: var(--surface);
  border-left: 1px solid var(--line); z-index: 150; overflow-y: auto; box-shadow: -4px 0 20px rgba(0,0,0,0.3);
}
.detail-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px; border-bottom: 1px solid var(--line);
}
.detail-title { font-family: var(--serif); font-size: 18px; color: var(--text); margin: 0; }
.close-btn {
  font-size: 20px; color: var(--text-3); background: none; border: none; cursor: pointer;
  width: 32px; height: 32px; border-radius: 6px;
}
.close-btn:hover { background: var(--raised); color: var(--text); }
.detail-body { padding: 16px 20px; }
.detail-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; border-bottom: 1px solid var(--line);
}
.detail-label { font-family: var(--sans); font-size: 12px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px; }
.detail-value { font-family: var(--sans); font-size: 13px; color: var(--text-2); }
.detail-section { margin-top: 20px; }
.detail-section-title { font-family: var(--sans); font-size: 12px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px; }
.progress-row {
  display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--line);
  font-family: var(--sans); font-size: 12px; color: var(--text-2);
}
.detail-edit-section { margin-bottom: 16px; }
.detail-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.detail-field label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-3); }
.detail-input {
  font-family: var(--sans); font-size: 13px; color: var(--text); padding: 8px 10px;
  background: var(--raised); border: 1px solid var(--line); border-radius: 4px; outline: none; width: 100%;
}
.detail-input:focus { border-color: var(--gold); }
.detail-field-row { display: flex; gap: 8px; }
.detail-field-row .detail-field { flex: 1; }
.btn-save {
  font-family: var(--sans); font-size: 12px; font-weight: 600; padding: 8px 16px;
  border-radius: 6px; border: none; background: var(--gold); color: var(--bg); cursor: pointer; margin-top: 4px;
}
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; }
.save-msg { font-family: var(--sans); font-size: 12px; margin-left: 8px; }
.save-msg.ok { color: #34C759; }
.save-msg.err { color: #FF3B30; }

.detail-actions { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--line); }

.btn-danger {
  font-family: var(--sans); font-size: 13px; font-weight: 600; padding: 10px 20px;
  border-radius: 6px; border: none; background: #FF3B30; color: white; cursor: pointer;
}
.btn-danger:hover { opacity: 0.9; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200;
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: var(--surface); border: 1px solid var(--line); border-radius: 12px;
  padding: 24px; max-width: 400px; width: 90%;
}
.modal-title { font-family: var(--serif); font-size: 18px; color: var(--text); margin: 0 0 12px; }
.modal-body { font-family: var(--sans); font-size: 14px; color: var(--text-2); line-height: 1.6; margin: 0 0 20px; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-cancel {
  font-family: var(--sans); font-size: 13px; padding: 10px 20px; border-radius: 6px;
  border: 1px solid var(--line); background: var(--raised); color: var(--text-2); cursor: pointer;
}
.btn-cancel:hover { background: var(--surface); }
</style>
