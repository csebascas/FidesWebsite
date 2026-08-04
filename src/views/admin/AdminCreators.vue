<template>
  <div class="creators">
    <h1 class="page-title">Creators</h1>
    <p class="subtitle">Give a partner a unique code, hand them their link, and track how many of their signups start a trial and convert to paid Pro.</p>

    <!-- Totals -->
    <div class="statstrip">
      <div class="stat"><span class="n">{{ loading ? '—' : totals.creators }}</span><span class="l">Creators</span></div>
      <div class="stat"><span class="n">{{ loading ? '—' : totals.signups }}</span><span class="l">Signups</span></div>
      <div class="stat"><span class="n gold">{{ loading ? '—' : totals.joined }}</span><span class="l">Joined Pro</span></div>
      <div class="stat"><span class="n gold">{{ loading ? '—' : totals.paid }}</span><span class="l">Paid</span></div>
    </div>

    <!-- New code -->
    <div class="section">
      <h2 class="section-title">New creator code</h2>
      <div class="form-card">
        <div class="form-grid">
          <div class="input-row">
            <label>Code</label>
            <input v-model="newCode" placeholder="CREATORCODE" maxlength="32" @input="newCode = newCode.toUpperCase().replace(/[^0-9A-Z]/g, '')" />
          </div>
          <div class="input-row">
            <label>Creator name</label>
            <input v-model="newName" placeholder="Creator's name" />
          </div>
          <div class="input-row">
            <label>Handle <span class="opt">(optional)</span></label>
            <input v-model="newHandle" placeholder="@handle" />
          </div>
          <div class="input-row">
            <label>Avatar URL <span class="opt">(optional)</span></label>
            <input v-model="newAvatar" placeholder="https://…" />
          </div>
          <div class="input-row">
            <label>Pro days <span class="opt">(blank = default)</span></label>
            <input v-model="newDays" placeholder="default" inputmode="numeric" />
          </div>
        </div>
        <div class="form-foot">
          <span class="form-error" v-if="formError">{{ formError }}</span>
          <button class="create-btn" :disabled="creating" @click="createCode">{{ creating ? 'Creating…' : 'Create code' }}</button>
        </div>
        <p class="hint">Blank Pro-days uses the global referral <code>base_days</code>. New users get that many days of Pro when they enter the code — and see the same “&lt;name&gt; invited you to Fides” reveal they'd get from a friend invite.</p>
      </div>
    </div>

    <!-- Funnel -->
    <div class="section">
      <h2 class="section-title">Referral funnel</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>Creator</th>
            <th>Code / link</th>
            <th class="num">Signups</th>
            <th class="num">Joined Pro</th>
            <th class="num">Trials</th>
            <th class="num">Paid</th>
            <th class="num">Conv.</th>
            <th>Linked user</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in rows" :key="row.code">
            <tr :class="{ paused: !row.active, 'row-open': expanded === row.code }">
              <td>
                <button class="creator-toggle" @click="toggleExpand(row.code)" :title="expanded === row.code ? 'Hide who was referred' : 'Show who was referred'">
                  <span class="chev" :class="{ open: expanded === row.code }">▸</span>
                  <span class="creator-cell">
                    <span class="creator-name">{{ row.creator_name }}</span>
                    <span v-if="row.creator_handle" class="creator-handle">{{ row.creator_handle }}</span>
                  </span>
                </button>
              </td>
              <td>
                <code class="code">{{ row.code }}</code>
                <button class="copy-btn" @click="copyLink(row.code)">{{ copied === row.code ? 'Copied' : 'Copy link' }}</button>
              </td>
              <td class="num">{{ num(row.signups) }}</td>
              <td class="num gold">{{ num(row.joined_pro) }}</td>
              <td class="num">{{ num(row.trials) }}</td>
              <td class="num gold">{{ num(row.paid_conversions) }}</td>
              <td class="num">{{ row.pct_joined_pro != null ? row.pct_joined_pro + '%' : '—' }}</td>
              <td class="link-cell">
                <template v-if="linkingCode === row.code">
                  <div class="link-edit">
                    <input
                      v-model="linkSearch"
                      class="link-input"
                      placeholder="Search name, @username, or UUID"
                    />
                    <button class="link-cancel" @click="cancelLink">Cancel</button>
                  </div>
                  <div v-if="linkSearch.trim()" class="link-results">
                    <button
                      v-for="u in linkMatches"
                      :key="u.id"
                      class="link-result"
                      :disabled="linkSaving"
                      @click="saveLink(row, u.id)"
                    >
                      <span class="lr-name">{{ u.display_name || 'Pilgrim' }}</span>
                      <span v-if="u.username" class="lr-handle">@{{ u.username }}</span>
                      <span class="lr-id">{{ shortId(u.id) }}</span>
                    </button>
                    <div v-if="linkMatches.length === 0" class="link-noresult">
                      <span v-if="usersLoadingList">Loading users…</span>
                      <template v-else>
                        No match.
                        <button
                          v-if="isUuid(linkSearch)"
                          class="link-uuid-btn"
                          :disabled="linkSaving"
                          @click="saveLink(row, linkSearch.trim())"
                        >Link this UUID</button>
                      </template>
                    </div>
                  </div>
                  <span v-if="linkError" class="link-error">{{ linkError }}</span>
                </template>
                <template v-else-if="row.linked_user_id">
                  <button class="linked-user" @click="startLink(row)" title="Click to change the linked user">
                    {{ row.linked_display_name || (row.linked_username ? '@' + row.linked_username : shortId(row.linked_user_id)) }}
                  </button>
                  <button class="link-unlink" @click="unlink(row)" title="Unlink">✕</button>
                </template>
                <button v-else class="link-btn" @click="startLink(row)">Link user</button>
              </td>
              <td>
                <div class="row-actions">
                  <button class="edit-btn" @click="startEdit(row)">Edit</button>
                  <button class="status-btn" :class="{ on: row.active }" @click="toggleActive(row)">
                    {{ row.active ? 'Active' : 'Paused' }}
                  </button>
                </div>
              </td>
            </tr>

            <!-- Inline edit panel -->
            <tr v-if="editingCode === row.code" class="detail-row">
              <td colspan="9">
                <div class="edit-panel">
                  <div class="edit-head">
                    <span class="edit-title">Edit creator</span>
                    <code class="code">{{ row.code }}</code>
                    <span class="edit-hint">Code can’t be changed — it’s in existing referral links and attributions.</span>
                  </div>
                  <div class="edit-grid">
                    <div class="input-row">
                      <label>Creator name</label>
                      <input v-model="editForm.creator_name" placeholder="Creator's name" />
                    </div>
                    <div class="input-row">
                      <label>Handle</label>
                      <input v-model="editForm.creator_handle" placeholder="@handle (optional)" />
                    </div>
                    <div class="input-row">
                      <label>Avatar URL</label>
                      <input v-model="editForm.avatar_url" placeholder="https://…" />
                    </div>
                    <div class="input-row">
                      <label>Pro days <span class="opt">(blank = default)</span></label>
                      <input v-model="editForm.pro_days" placeholder="default" inputmode="numeric" />
                    </div>
                  </div>
                  <div class="edit-foot">
                    <span class="form-error" v-if="editError">{{ editError }}</span>
                    <span class="edit-ok" v-if="editSaved">Saved.</span>
                    <button class="link-cancel" @click="cancelEdit">Cancel</button>
                    <button class="create-btn" :disabled="editSaving" @click="saveEdit(row)">{{ editSaving ? 'Saving…' : 'Save changes' }}</button>
                  </div>
                </div>
              </td>
            </tr>

            <!-- Expanded detail: linked user + referred list + monthly tracker -->
            <tr v-if="expanded === row.code" class="detail-row">
              <td colspan="9">
                <!-- Linked user -->
                <div class="detail-link">
                  <span class="dl-label">Linked creator account</span>
                  <template v-if="linkingCode === row.code">
                    <div class="link-edit">
                      <input
                        v-model="linkSearch"
                        class="link-input wide"
                        placeholder="Search name, @username, or UUID"
                      />
                      <button class="link-cancel" @click="cancelLink">Cancel</button>
                    </div>
                    <div v-if="linkSearch.trim()" class="link-results">
                      <button
                        v-for="u in linkMatches"
                        :key="u.id"
                        class="link-result"
                        :disabled="linkSaving"
                        @click="saveLink(row, u.id)"
                      >
                        <span class="lr-name">{{ u.display_name || 'Pilgrim' }}</span>
                        <span v-if="u.username" class="lr-handle">@{{ u.username }}</span>
                        <span class="lr-id">{{ shortId(u.id) }}</span>
                      </button>
                      <div v-if="linkMatches.length === 0" class="link-noresult">
                        <span v-if="usersLoadingList">Loading users…</span>
                        <template v-else>
                          No match.
                          <button
                            v-if="isUuid(linkSearch)"
                            class="link-uuid-btn"
                            :disabled="linkSaving"
                            @click="saveLink(row, linkSearch.trim())"
                          >Link this UUID</button>
                        </template>
                      </div>
                    </div>
                    <span v-if="linkError" class="link-error">{{ linkError }}</span>
                  </template>
                  <template v-else-if="row.linked_user_id">
                    <span class="dl-linked">{{ row.linked_display_name || (row.linked_username ? '@' + row.linked_username : shortId(row.linked_user_id)) }}</span>
                    <button class="link-btn" @click="startLink(row)">Change</button>
                    <button class="link-unlink" @click="unlink(row)">Unlink</button>
                  </template>
                  <template v-else>
                    <span class="dl-none">Not linked</span>
                    <button class="link-btn" @click="startLink(row)">Link a user</button>
                  </template>
                </div>

                <!-- Monthly tracker -->
                <div class="tracker">
                  <div class="tracker-head">
                    <span class="dl-label">Monthly content tracker</span>
                    <span class="tracker-sub">Posts &amp; stories about us, per month</span>
                  </div>
                  <div v-if="trackerLoading === row.code" class="detail-note">Loading…</div>
                  <template v-else>
                    <table v-if="(trackerByCode[row.code] || []).length" class="tracker-table">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th class="num">Posts</th>
                          <th class="num">Stories</th>
                          <th>Notes</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="m in trackerByCode[row.code]" :key="m.id || m.month">
                          <td>
                            <input
                              v-model="m.month"
                              type="month"
                              class="tracker-input month"
                              @change="touchTracker(row.code, m)"
                            />
                          </td>
                          <td class="num">
                            <input
                              v-model.number="m.posts"
                              type="number"
                              min="0"
                              class="tracker-input num"
                              @change="touchTracker(row.code, m)"
                            />
                          </td>
                          <td class="num">
                            <input
                              v-model.number="m.stories"
                              type="number"
                              min="0"
                              class="tracker-input num"
                              @change="touchTracker(row.code, m)"
                            />
                          </td>
                          <td>
                            <input
                              v-model="m.notes"
                              class="tracker-input notes"
                              placeholder="—"
                              @change="touchTracker(row.code, m)"
                            />
                          </td>
                          <td>
                            <button class="tracker-del" @click="deleteTracker(row.code, m)" :disabled="trackerSaving === m.id + '-' + m.month" title="Delete">✕</button>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>Total</td>
                          <td class="num">{{ trackerTotals(row.code).posts }}</td>
                          <td class="num">{{ trackerTotals(row.code).stories }}</td>
                          <td></td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                    <div v-else class="detail-note">No months logged yet.</div>
                    <div class="tracker-foot">
                      <button class="tracker-add" @click="addTrackerMonth(row.code)">+ Add month</button>
                      <button
                        v-if="trackerDirty[row.code]"
                        class="create-btn sm"
                        :disabled="trackerSaving === row.code"
                        @click="saveTrackers(row.code)"
                      >{{ trackerSaving === row.code ? 'Saving…' : 'Save tracker' }}</button>
                    </div>
                  </template>
                </div>

                <!-- Referred users -->
                <div v-if="usersLoading === row.code" class="detail-note">Loading…</div>
                <div v-else-if="(usersByCode[row.code] || []).length === 0" class="detail-note">No signups yet for this code.</div>
                <div v-else class="referred-list">
                  <div class="referred-head">
                    <span>Referred user</span><span>Joined</span><span>Status</span>
                  </div>
                  <div v-for="u in usersByCode[row.code]" :key="u.user_id" class="referred-row">
                    <div class="referred-who">
                      <span class="referred-name">{{ u.display_name || (u.username ? '@' + u.username : 'Pilgrim') }}</span>
                      <span v-if="u.username && u.display_name" class="referred-handle">@{{ u.username }}</span>
                    </div>
                    <span class="referred-date">{{ formatDate(u.redeemed_at) }}</span>
                    <span class="status-pill" :class="u.status">{{ statusLabel(u.status) }}</span>
                  </div>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!loading && rows.length === 0">
            <td colspan="9" class="empty">No creator codes yet. Create one above.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { adminRpc } from '../../lib/supabase'

const LINK_BASE = 'https://joinfides.com/i/'

const loading = ref(true)
const rows = ref<any[]>([])

const newCode = ref('')
const newName = ref('')
const newHandle = ref('')
const newAvatar = ref('')
const newDays = ref('')
const creating = ref(false)
const formError = ref('')
const copied = ref('')

// ── Inline edit ──────────────────────────────────────────────────────────────
const editingCode = ref<string | null>(null)
const editForm = reactive<any>({
  creator_name: '',
  creator_handle: '',
  avatar_url: '',
  pro_days: '',
})
const editSaving = ref(false)
const editError = ref('')
const editSaved = ref(false)

function startEdit(row: any) {
  // Collapse the expand panel if open — the edit panel replaces it visually.
  expanded.value = null
  editingCode.value = row.code
  editError.value = ''
  editSaved.value = false
  editForm.creator_name = row.creator_name || ''
  editForm.creator_handle = row.creator_handle || ''
  editForm.avatar_url = row.avatar_url || ''
  editForm.pro_days = row.pro_days != null ? String(row.pro_days) : ''
}

function cancelEdit() {
  editingCode.value = null
}

async function saveEdit(row: any) {
  editError.value = ''
  editSaved.value = false
  const name = editForm.creator_name.trim()
  if (!name) {
    editError.value = 'Creator name is required.'
    return
  }
  let days: number | null = null
  if (editForm.pro_days.trim()) {
    const d = parseInt(editForm.pro_days, 10)
    if (!Number.isFinite(d) || d <= 0) {
      editError.value = 'Pro days must be a positive number (or blank for default).'
      return
    }
    days = d
  }
  const handle = editForm.creator_handle.trim() || null
  const avatar = editForm.avatar_url.trim() || null
  editSaving.value = true
  const { error } = await adminRpc({
    action: 'update',
    table: 'partner_codes',
    match: { code: row.code },
    data: {
      creator_name: name,
      creator_handle: handle,
      avatar_url: avatar,
      pro_days: days,
    },
  })
  editSaving.value = false
  if (error) {
    editError.value = error
    return
  }
  // Reflect locally
  row.creator_name = name
  row.creator_handle = handle
  row.avatar_url = avatar
  row.pro_days = days
  editSaved.value = true
  setTimeout(() => { editSaved.value = false }, 2000)
  setTimeout(() => { editingCode.value = null }, 800)
}

// Link-to-user editing: search users by name / @username / id, or paste a UUID.
const linkingCode = ref<string | null>(null)
const linkSearch = ref('')
const linkError = ref('')
const linkSaving = ref(false)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// User directory for the search, loaded once on first link. Same select the
// Users tab uses, so the admin searches over the real accounts.
const linkUsers = ref<any[]>([])
const linkUsersLoaded = ref(false)
const usersLoadingList = ref(false)

function shortId(id: string): string {
  return id ? id.slice(0, 8) + '…' : '—'
}

function isUuid(s: string): boolean {
  return UUID_RE.test((s || '').trim())
}

async function loadLinkUsers() {
  if (linkUsersLoaded.value || usersLoadingList.value) return
  usersLoadingList.value = true
  const { data } = await adminRpc({
    action: 'select',
    table: 'users',
    select: 'id, username, display_name',
    order: { column: 'created_at', ascending: false },
    limit: 5000,
  })
  linkUsers.value = data || []
  linkUsersLoaded.value = true
  usersLoadingList.value = false
}

const linkMatches = computed(() => {
  const q = linkSearch.value.trim().toLowerCase()
  if (!q) return []
  return linkUsers.value
    .filter(
      (u) =>
        (u.display_name || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.id || '').toLowerCase().includes(q),
    )
    .slice(0, 8)
})

function startLink(row: any) {
  linkError.value = ''
  linkSearch.value = ''
  linkingCode.value = row.code
  void loadLinkUsers()
}

function cancelLink() {
  linkingCode.value = null
  linkSearch.value = ''
  linkError.value = ''
}

async function saveLink(row: any, userId: string) {
  linkError.value = ''
  const id = (userId || '').trim()
  if (!UUID_RE.test(id)) {
    linkError.value = 'Pick a user from the list, or paste a valid UUID.'
    return
  }
  linkSaving.value = true
  const { error } = await adminRpc({
    action: 'update',
    table: 'partner_codes',
    match: { code: row.code },
    data: { linked_user_id: id },
  })
  linkSaving.value = false
  if (error) {
    linkError.value = /duplicate|unique/i.test(error)
      ? 'That user is already linked to another code.'
      : error
    return
  }
  cancelLink()
  await load() // refresh so the linked user's name shows
}

async function unlink(row: any) {
  const { error } = await adminRpc({
    action: 'update',
    table: 'partner_codes',
    match: { code: row.code },
    data: { linked_user_id: null },
  })
  if (!error) {
    row.linked_user_id = null
    row.linked_username = null
    row.linked_display_name = null
  }
}

// Drill-down: which creator is expanded, and the per-user list per code.
const expanded = ref<string | null>(null)
const usersByCode = ref<Record<string, any[]>>({})
const usersLoading = ref<string | null>(null)

async function toggleExpand(code: string) {
  // Collapse the inline edit panel if it's open — expand replaces it.
  editingCode.value = null
  if (expanded.value === code) { expanded.value = null; return }
  expanded.value = code
  if (!usersByCode.value[code]) {
    usersLoading.value = code
    const { data } = await adminRpc({
      action: 'select',
      table: 'partner_referral_users',
      match: { code },
      order: { column: 'redeemed_at', ascending: false },
      limit: 500,
    })
    usersByCode.value = { ...usersByCode.value, [code]: data ?? [] }
    usersLoading.value = null
  }
  // Load the monthly tracker if not already loaded.
  if (!trackerByCode.value[code]) {
    await loadTrackers(code)
  }
}

function statusLabel(s: string): string {
  return s === 'paid' ? 'Paid' : s === 'trial' ? 'Trial' : 'Signed up'
}

function formatDate(d: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const totals = computed(() =>
  rows.value.reduce(
    (a, r) => ({
      creators: a.creators + 1,
      signups: a.signups + num(r.signups),
      joined: a.joined + num(r.joined_pro),
      paid: a.paid + num(r.paid_conversions),
    }),
    { creators: 0, signups: 0, joined: 0, paid: 0 },
  ),
)

function num(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

async function load() {
  loading.value = true
  const { data } = await adminRpc({
    action: 'select',
    table: 'partner_referral_stats',
    order: { column: 'signups', ascending: false },
    limit: 500,
  })
  rows.value = data ?? []
  loading.value = false
}

async function createCode() {
  formError.value = ''
  const code = newCode.value.trim().toUpperCase()
  if (!/^[0-9A-Z]{3,32}$/.test(code)) {
    formError.value = 'Code must be 3–32 letters/numbers.'
    return
  }
  if (!newName.value.trim()) {
    formError.value = 'Creator name is required.'
    return
  }
  let days: number | null = null
  if (newDays.value.trim()) {
    const d = parseInt(newDays.value, 10)
    if (!Number.isFinite(d) || d <= 0) {
      formError.value = 'Pro days must be a positive number (or blank for default).'
      return
    }
    days = d
  }
  creating.value = true
  const { error } = await adminRpc({
    action: 'insert',
    table: 'partner_codes',
    data: {
      code,
      creator_name: newName.value.trim(),
      creator_handle: newHandle.value.trim() || null,
      avatar_url: newAvatar.value.trim() || null,
      pro_days: days,
    },
  })
  creating.value = false
  if (error) {
    formError.value = /duplicate|already exists|unique/i.test(error)
      ? 'That code already exists.'
      : error
    return
  }
  newCode.value = ''
  newName.value = ''
  newHandle.value = ''
  newAvatar.value = ''
  newDays.value = ''
  await load()
}

async function toggleActive(row: any) {
  const next = !row.active
  const { error } = await adminRpc({
    action: 'update',
    table: 'partner_codes',
    match: { code: row.code },
    data: { active: next },
  })
  if (!error) row.active = next
}

async function copyLink(code: string) {
  try {
    await navigator.clipboard.writeText(LINK_BASE + code)
    copied.value = code
    setTimeout(() => {
      if (copied.value === code) copied.value = ''
    }, 1500)
  } catch {
    /* clipboard unavailable */
  }
}

// ── Monthly tracker ──────────────────────────────────────────────────────────
// Each creator (code) has a list of {id?, month, posts, stories, notes} rows.
// New (unsaved) rows have id = null. `dirty` tracks which codes have unsaved
// changes so the Save button only shows when needed.

interface TrackerRow {
  id: string | null
  month: string
  posts: number
  stories: number
  notes: string | null
  _dirty?: boolean
  _deleted?: boolean
}

const trackerByCode = ref<Record<string, TrackerRow[]>>({})
const trackerLoading = ref<string | null>(null)
const trackerDirty = ref<Record<string, boolean>>({})
const trackerSaving = ref<string | null>(null) // holds "code" or "id-month"

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

async function loadTrackers(code: string) {
  trackerLoading.value = code
  const { data } = await adminRpc({
    action: 'select',
    table: 'partner_monthly_content',
    match: { code },
    order: { column: 'month', ascending: false },
    limit: 200,
  })
  trackerByCode.value = {
    ...trackerByCode.value,
    [code]: (data ?? []).map((r: any) => ({
      id: r.id,
      month: r.month,
      posts: r.posts ?? 0,
      stories: r.stories ?? 0,
      notes: r.notes ?? null,
    })),
  }
  trackerLoading.value = null
}

function addTrackerMonth(code: string) {
  const list = trackerByCode.value[code] || []
  // Default to the current month, but skip it if already present.
  const m = currentMonth()
  if (!list.some((r) => r.month === m && !r._deleted)) {
    list.push({ id: null, month: m, posts: 0, stories: 0, notes: null, _dirty: true })
    trackerByCode.value = { ...trackerByCode.value, [code]: list }
  }
  trackerDirty.value = { ...trackerDirty.value, [code]: true }
}

function touchTracker(code: string, row: TrackerRow) {
  row._dirty = true
  trackerDirty.value = { ...trackerDirty.value, [code]: true }
}

async function deleteTracker(code: string, row: TrackerRow) {
  const key = (row.id || 'new') + '-' + row.month
  trackerSaving.value = key
  if (row.id) {
    await adminRpc({
      action: 'delete',
      table: 'partner_monthly_content',
      id: row.id,
    })
  }
  const list = (trackerByCode.value[code] || []).filter(
    (r) => r !== row,
  )
  trackerByCode.value = { ...trackerByCode.value, [code]: list }
  trackerSaving.value = null
}

async function saveTrackers(code: string) {
  trackerSaving.value = code
  const list = trackerByCode.value[code] || []
  for (const row of list) {
    if (!row._dirty) continue
    // Validate
    if (!/^\d{4}-\d{2}$/.test(row.month)) continue
    const posts = Math.max(0, Number(row.posts) || 0)
    const stories = Math.max(0, Number(row.stories) || 0)
    const payload = {
      code,
      month: row.month,
      posts,
      stories,
      notes: (row.notes || '').trim() || null,
    }
    if (row.id) {
      // Update existing
      const { error } = await adminRpc({
        action: 'update',
        table: 'partner_monthly_content',
        id: row.id,
        data: { posts, stories, notes: payload.notes },
      })
      if (error) { trackerSaving.value = null; return }
    } else {
      // Insert — check for (code, month) collision first.
      const { data: existing } = await adminRpc({
        action: 'select',
        table: 'partner_monthly_content',
        match: { code, month: row.month },
        limit: 1,
      })
      if (existing && existing.length) {
        // Month already exists for this code — update it instead.
        const existingId = existing[0].id
        const { error } = await adminRpc({
          action: 'update',
          table: 'partner_monthly_content',
          id: existingId,
          data: { posts, stories, notes: payload.notes },
        })
        if (error) { trackerSaving.value = null; return }
        row.id = existingId
      } else {
        const { data, error } = await adminRpc({
          action: 'insert',
          table: 'partner_monthly_content',
          data: payload,
        })
        if (error) { trackerSaving.value = null; return }
        if (data?.id) row.id = data.id
      }
    }
    row._dirty = false
  }
  trackerSaving.value = null
  trackerDirty.value = { ...trackerDirty.value, [code]: false }
}

function trackerTotals(code: string): { posts: number; stories: number } {
  return (trackerByCode.value[code] || []).reduce(
    (a, r) => ({
      posts: a.posts + (Number(r.posts) || 0),
      stories: a.stories + (Number(r.stories) || 0),
    }),
    { posts: 0, stories: 0 },
  )
}

onMounted(load)
</script>

<style scoped>
.creators {
  max-width: 1100px;
}

.page-title {
  font-family: var(--serif);
  font-size: 24px;
  color: var(--text);
  font-weight: 700;
  margin: 0 0 6px;
}
.subtitle {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text-3);
  margin: 0 0 22px;
  max-width: 620px;
  line-height: 1.5;
}

.statstrip {
  display: flex;
  gap: 10px;
  margin-bottom: 26px;
  flex-wrap: wrap;
}
.stat {
  flex: 1;
  min-width: 120px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat .n {
  font-family: var(--serif);
  font-size: 26px;
  color: var(--text);
  line-height: 1;
}
.stat .n.gold {
  color: var(--gold-light);
}
.stat .l {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.section {
  margin-bottom: 30px;
}
.section-title {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text-3);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 12px;
}

.form-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 18px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.input-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.input-row label {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text-3);
}
.input-row label .opt {
  color: var(--text-3);
  opacity: 0.6;
}
.input-row input {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text);
  background: var(--bg, #0c0c0c);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 9px 11px;
  outline: none;
}
.input-row input:focus {
  border-color: var(--gold);
}
.form-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  margin-top: 16px;
}
.form-error {
  font-family: var(--sans);
  font-size: 12px;
  color: #ff6b5e;
  margin-right: auto;
}
.create-btn {
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  color: #0c0c0c;
  background: var(--gold);
  border: none;
  border-radius: 6px;
  padding: 9px 18px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.create-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.create-btn.sm {
  font-size: 12px;
  padding: 6px 14px;
}
.hint {
  font-family: var(--sans);
  font-size: 11.5px;
  color: var(--text-3);
  line-height: 1.5;
  margin: 14px 0 0;
}
.hint code {
  font-family: monospace;
  font-size: 11px;
  color: var(--text-2);
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
.data-table th.num,
.data-table td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.data-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  color: var(--text-2);
}
.data-table td.gold {
  color: var(--gold-light);
}
tr.paused {
  opacity: 0.5;
}
.empty {
  text-align: center;
  color: var(--text-3);
  padding: 32px 12px;
}

.creator-cell {
  display: flex;
  flex-direction: column;
}
.creator-name {
  color: var(--text);
}
.creator-handle {
  font-size: 11px;
  color: var(--text-3);
}
.code {
  font-family: monospace;
  font-size: 12px;
  color: var(--text);
  background: var(--surface);
  padding: 2px 7px;
  border-radius: 4px;
  margin-right: 8px;
}
.copy-btn {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--gold-light);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.copy-btn:hover {
  text-decoration: underline;
}
.status-btn {
  font-family: var(--sans);
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid var(--line);
  background: none;
  color: var(--text-3);
  cursor: pointer;
  transition: all 0.15s;
}
.status-btn.on {
  color: #34c759;
  border-color: rgba(52, 199, 89, 0.4);
}

/* ── Row actions (Edit + status) ── */
.row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.edit-btn {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--gold-light);
  background: none;
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 3px 10px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.edit-btn:hover {
  border-color: var(--gold);
}

/* ── Inline edit panel ── */
.edit-panel {
  padding: 4px 2px 6px;
}
.edit-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.edit-title {
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.edit-hint {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--text-3);
}
.edit-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}
.edit-grid .input-row input {
  width: 100%;
  box-sizing: border-box;
}
.edit-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}
.edit-ok {
  font-family: var(--sans);
  font-size: 12px;
  color: #34c759;
  margin-right: auto;
}

/* ── Link-to-user ── */
.link-cell {
  white-space: nowrap;
}
.link-btn {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--gold-light);
  background: none;
  border: 1px dashed var(--line);
  border-radius: 4px;
  padding: 3px 9px;
  cursor: pointer;
}
.link-btn:hover {
  border-color: var(--gold);
}
.linked-user {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}
.linked-user:hover {
  color: var(--gold-light);
}
.link-unlink {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--text-3);
  background: none;
  border: none;
  cursor: pointer;
  margin-left: 6px;
}
.link-unlink:hover {
  color: #ff6b5e;
}
.link-edit {
  display: flex;
  align-items: center;
  gap: 5px;
}
.link-input {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--text);
  background: var(--bg, #0c0c0c);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 4px 7px;
  outline: none;
  width: 150px;
}
.link-input:focus {
  border-color: var(--gold);
}
.link-save {
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 600;
  color: #0c0c0c;
  background: var(--gold);
  border: none;
  border-radius: 4px;
  padding: 4px 9px;
  cursor: pointer;
}
.link-save:disabled {
  opacity: 0.5;
  cursor: default;
}
.link-cancel {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--text-3);
  background: none;
  border: none;
  cursor: pointer;
}
.link-error {
  display: block;
  font-family: var(--sans);
  font-size: 10.5px;
  color: #ff6b5e;
  margin-top: 3px;
}
.link-results {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
  max-width: 220px;
}
.link-result {
  display: flex;
  align-items: baseline;
  gap: 7px;
  font-family: var(--sans);
  font-size: 11px;
  color: var(--text);
  background: var(--bg, #0c0c0c);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 5px 8px;
  cursor: pointer;
  text-align: left;
}
.link-result:hover {
  border-color: var(--gold);
}
.link-result:disabled {
  opacity: 0.5;
  cursor: default;
}
.lr-name {
  font-weight: 600;
}
.lr-handle {
  color: var(--gold);
  font-size: 10.5px;
}
.lr-id {
  margin-left: auto;
  color: var(--text-3);
  font-size: 10px;
  font-family: var(--mono, monospace);
}
.link-noresult {
  font-family: var(--sans);
  font-size: 10.5px;
  color: var(--text-3);
  padding: 3px 2px;
}
.link-uuid-btn {
  font-family: var(--sans);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--gold);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 0 0 4px;
}
.detail-link {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 4px 2px 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--line);
}
.dl-label {
  font-family: var(--sans);
  font-size: 10px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--text-3);
}
.dl-linked {
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 600;
  color: var(--gold);
}
.dl-none {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text-3);
}
.link-input.wide {
  width: 240px;
  max-width: 60vw;
}

/* ── Monthly tracker ── */
.tracker {
  padding: 4px 2px 14px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--line);
}
.tracker-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}
.tracker-sub {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--text-3);
}
.tracker-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--sans);
  font-size: 12px;
  margin-bottom: 8px;
}
.tracker-table th {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
  font-weight: 500;
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid var(--line);
}
.tracker-table th.num {
  text-align: right;
}
.tracker-table td {
  padding: 5px 8px;
  border-bottom: 0.5px solid var(--line);
  color: var(--text-2);
}
.tracker-table td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.tracker-table tfoot td {
  font-weight: 600;
  color: var(--text);
  border-bottom: none;
  border-top: 1px solid var(--line);
}
.tracker-input {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text);
  background: var(--bg, #0c0c0c);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 4px 7px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.tracker-input:focus {
  border-color: var(--gold);
}
.tracker-input.num {
  width: 64px;
  text-align: right;
}
.tracker-input.month {
  width: 130px;
}
.tracker-input.notes {
  min-width: 140px;
}
.tracker-del {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--text-3);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
}
.tracker-del:hover {
  color: #ff6b5e;
}
.tracker-del:disabled {
  opacity: 0.4;
  cursor: default;
}
.tracker-foot {
  display: flex;
  align-items: center;
  gap: 12px;
}
.tracker-add {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--gold-light);
  background: none;
  border: 1px dashed var(--line);
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
}
.tracker-add:hover {
  border-color: var(--gold);
}

/* ── Drill-down: who got referred ── */
.creator-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
}
.chev {
  color: var(--text-3);
  font-size: 11px;
  transition: transform 0.15s;
  display: inline-block;
}
.chev.open {
  transform: rotate(90deg);
  color: var(--gold-light);
}
tr.row-open td {
  border-bottom-color: transparent;
}
.detail-row td {
  padding: 0 12px 14px;
  background: rgba(255, 255, 255, 0.015);
}
.detail-note {
  font-family: var(--sans);
  font-size: 12.5px;
  color: var(--text-3);
  padding: 10px 4px;
}
.referred-list {
  display: flex;
  flex-direction: column;
  padding: 4px 0 2px;
}
.referred-head,
.referred-row {
  display: grid;
  grid-template-columns: 1fr auto 90px;
  align-items: center;
  gap: 12px;
  padding: 8px 6px;
}
.referred-head {
  font-family: var(--sans);
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
  padding-bottom: 4px;
}
.referred-head span:nth-child(2),
.referred-row .referred-date {
  text-align: right;
}
.referred-head span:nth-child(3),
.referred-row .status-pill {
  justify-self: end;
}
.referred-row {
  border-top: 0.5px solid var(--line);
  font-family: var(--sans);
  font-size: 13px;
}
.referred-who {
  display: flex;
  flex-direction: column;
}
.referred-name {
  color: var(--text);
}
.referred-handle {
  font-size: 11px;
  color: var(--text-3);
}
.referred-date {
  font-size: 12px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}
.status-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 100px;
  white-space: nowrap;
}
.status-pill.signed_up {
  color: var(--text-3);
  background: var(--surface);
}
.status-pill.trial {
  color: var(--gold-light);
  background: rgba(196, 145, 44, 0.12);
}
.status-pill.paid {
  color: #34c759;
  background: rgba(52, 199, 89, 0.12);
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .edit-grid {
    grid-template-columns: 1fr;
  }
}
</style>
