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
            <input v-model="newCode" placeholder="SAMMYISCATHOLIC" maxlength="32" @input="newCode = newCode.toUpperCase().replace(/[^0-9A-Z]/g, '')" />
          </div>
          <div class="input-row">
            <label>Creator name</label>
            <input v-model="newName" placeholder="Sammy" />
          </div>
          <div class="input-row">
            <label>Handle <span class="opt">(optional)</span></label>
            <input v-model="newHandle" placeholder="@sammyiscatholic" />
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
        <p class="hint">Blank Pro-days uses the global referral <code>base_days</code>. New users get that many days of Pro when they enter the code — and see the same reveal ("Sammy invited you to Fides") they'd get from a friend invite.</p>
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
              <td>
                <button class="status-btn" :class="{ on: row.active }" @click="toggleActive(row)">
                  {{ row.active ? 'Active' : 'Paused' }}
                </button>
              </td>
            </tr>
            <tr v-if="expanded === row.code" class="detail-row">
              <td colspan="8">
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
            <td colspan="8" class="empty">No creator codes yet. Create one above.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

// Drill-down: which creator is expanded, and the per-user list per code.
const expanded = ref<string | null>(null)
const usersByCode = ref<Record<string, any[]>>({})
const usersLoading = ref<string | null>(null)

async function toggleExpand(code: string) {
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
}
</style>
