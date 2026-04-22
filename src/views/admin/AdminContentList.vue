<template>
  <div class="content-list">
    <div class="page-header">
      <h1 class="page-title">{{ title }} <span v-if="rows.length" class="row-count">({{ rows.length }})</span></h1>
      <button class="btn-gold" @click="handleCreate" :disabled="creating">
        {{ creating ? 'Creating...' : '+ New' }}
      </button>
    </div>

    <div class="toolbar">
      <input
        v-model="search"
        type="text"
        class="search-input"
        :placeholder="`Search ${title.toLowerCase()}...`"
      />
      <select v-if="contentType === 'lessons' && trackOptions.length" v-model="trackFilter" class="filter-select">
        <option value="">All tracks</option>
        <option v-for="t in trackOptions" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
      <select v-if="contentType === 'lessons' && pillarOptions.length" v-model="pillarFilter" class="filter-select">
        <option value="">All pillars</option>
        <option v-for="p in pillarOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              @click="sortBy(col.key)"
              class="sortable"
            >
              {{ col.label }}
              <span v-if="sortKey === col.key" class="sort-arrow">
                {{ sortDir === 'asc' ? '\u2191' : '\u2193' }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in filteredRows"
            :key="row.id"
            @click="goToEdit(row.id)"
            class="clickable"
          >
            <td v-for="col in columns" :key="col.key">
              <template v-if="col.key === 'color'">
                <span class="color-dot" :style="{ background: row[col.key] }"></span>
              </template>
              <template v-else-if="col.key === 'active' || col.key === 'published' || col.key === 'featured' || col.key === 'is_featured'">
                <span class="bool-badge" :class="row[col.key] ? 'yes' : 'no'">
                  {{ row[col.key] ? 'Yes' : 'No' }}
                </span>
              </template>
              <template v-else>
                {{ row[col.key] ?? '—' }}
              </template>
            </td>
          </tr>
          <tr v-if="!loading && filteredRows.length === 0">
            <td :colspan="columns.length" class="empty">No results found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="loading-text">Loading...</div>
    <div v-if="errorMsg" class="error-text">{{ errorMsg }}</div>

    <!-- Create modal for types that need required fields -->
    <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <div class="modal" @click.stop>
        <h3 class="modal-title">New {{ singularType }}</h3>
        <div class="modal-fields">
          <div v-if="contentType === 'lessons'" class="modal-field">
            <label>Track</label>
            <select v-model="createFields.track_id" class="modal-input">
              <option value="">Select a track...</option>
              <option v-for="t in trackOptions" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div v-if="contentType === 'lessons'" class="modal-field">
            <label>Title</label>
            <input v-model="createFields.title" class="modal-input" placeholder="Lesson title" />
          </div>
          <div v-if="contentType === 'articles'" class="modal-field">
            <label>Title</label>
            <input v-model="createFields.title" class="modal-input" placeholder="Article title" />
          </div>
          <div v-if="contentType === 'articles'" class="modal-field">
            <label>Type</label>
            <select v-model="createFields.type" class="modal-input">
              <option value="article">Article</option>
              <option value="question">Question</option>
              <option value="cheatsheet">Cheatsheet</option>
              <option value="guide">Guide</option>
            </select>
          </div>
          <div v-if="contentType === 'articles'" class="modal-field">
            <label>Category</label>
            <input v-model="createFields.category" class="modal-input" placeholder="e.g. Doctrine, Scripture" />
          </div>
          <div v-if="contentType === 'tracks'" class="modal-field">
            <label>Track Name</label>
            <input v-model="createFields.name" class="modal-input" placeholder="Track name" />
          </div>
          <div v-if="contentType === 'tracks'" class="modal-field">
            <label>Pillar</label>
            <select v-model="createFields.pillar_id" class="modal-input">
              <option value="">Select a pillar...</option>
              <option v-for="p in pillarOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showCreateModal = false">Cancel</button>
          <button class="btn-gold" @click="doCreate" :disabled="creating">{{ creating ? 'Creating...' : 'Create' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase, TABLE_MAP, adminRpc } from '../../lib/supabase'

const route = useRoute()
const router = useRouter()

const contentType = computed(() => route.params.type as string)
const title = computed(() => {
  const t = contentType.value
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Content'
})

interface Column {
  key: string
  label: string
}

const columnMap: Record<string, Column[]> = {
  lessons: [
    { key: 'title', label: 'Title' },
    { key: 'track', label: 'Track' },
    { key: 'pillar', label: 'Pillar' },
    { key: 'steps', label: 'Steps' },
    { key: 'xp', label: 'XP' },
    { key: 'active', label: 'Active' },
  ],
  articles: [
    { key: 'title', label: 'Title' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'published', label: 'Published' },
    { key: 'featured', label: 'Featured' },
  ],
  entries: [
    { key: 'term', label: 'Term' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'is_featured', label: 'Featured' },
  ],
  saints: [
    { key: 'name', label: 'Name' },
    { key: 'feast_day', label: 'Feast Day' },
    { key: 'rarity', label: 'Rarity' },
    { key: 'unlock_method', label: 'Unlock Method' },
  ],
  tracks: [
    { key: 'name', label: 'Name' },
    { key: 'pillar', label: 'Pillar' },
    { key: 'lessons', label: 'Lessons' },
    { key: 'active', label: 'Active' },
  ],
  pillars: [
    { key: 'name', label: 'Name' },
    { key: 'color', label: 'Color' },
    { key: 'active', label: 'Active' },
  ],
}

const columns = computed(() => columnMap[contentType.value] || [{ key: 'id', label: 'ID' }])

const rows = ref<any[]>([])
const search = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
const loading = ref(true)
const creating = ref(false)
const errorMsg = ref('')
const showCreateModal = ref(false)
const createFields = ref<Record<string, any>>({})

const singularType = computed(() => {
  const t = contentType.value
  return t?.endsWith('s') ? t.slice(0, -1) : t
})
const trackFilter = ref('')
const pillarFilter = ref('')
const trackOptions = ref<any[]>([])
const pillarOptions = ref<any[]>([])
const trackToPillar = ref<Record<string, string>>({})

const filteredRows = computed(() => {
  let result = rows.value

  if (trackFilter.value) {
    result = result.filter((row) => row.track_id === trackFilter.value)
  }
  if (pillarFilter.value) {
    result = result.filter((row) => {
      if (row.pillar_id) return row.pillar_id === pillarFilter.value
      return trackToPillar.value[row.track_id] === pillarFilter.value
    })
  }

  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(q)
      )
    )
  }

  if (sortKey.value) {
    result = [...result].sort((a, b) => {
      const aVal = a[sortKey.value] ?? ''
      const bVal = b[sortKey.value] ?? ''
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
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
    sortDir.value = 'asc'
  }
}

function goToEdit(id: string) {
  router.push(`/d/content/${contentType.value}/${id}`)
}

const NEW_DEFAULTS: Record<string, Record<string, any>> = {
  lessons: { title: 'Untitled Lesson', sort_order: 0, active: true, content: [], xp_reward: 25, estimated_minutes: 5 },
  articles: { title: 'Untitled Article', slug: `new-article-${Date.now()}`, type: 'article', summary: 'New article', body: [], published: false },
  entries: { term: 'New Term', type: 'doctrine', definition: 'Definition here' },
  saints: { name: 'New Saint', unlock_method: 'track_completion', rarity: 'common' },
  tracks: { name: 'New Track', slug: `new-track-${Date.now()}`, sort_order: 0, active: true, lesson_count: 0 },
  pillars: { name: 'New Pillar', slug: `new-pillar-${Date.now()}`, color: '#C8A55A', sort_order: 0, active: true },
}

async function handleCreate() {
  if (contentType.value === 'lessons') {
    createFields.value = { title: '', track_id: '' }
    showCreateModal.value = true
    return
  }
  if (contentType.value === 'articles') {
    createFields.value = { title: '', type: 'article', category: '' }
    showCreateModal.value = true
    return
  }
  if (contentType.value === 'tracks') {
    createFields.value = { name: '', pillar_id: '' }
    // Load pillar options if not already loaded
    if (pillarOptions.value.length === 0) {
      const { data: pillars } = await supabase.from('pillars').select('id, name')
      pillarOptions.value = (pillars ?? []).sort((a: any, b: any) => a.name.localeCompare(b.name))
    }
    showCreateModal.value = true
    return
  }
  doCreate()
}

async function doCreate() {
  const defaults = NEW_DEFAULTS[contentType.value]
  if (!defaults) return

  // Validate required FK fields
  if (contentType.value === 'lessons' && !createFields.value.track_id) {
    errorMsg.value = 'Please select a track.'
    return
  }
  if (contentType.value === 'tracks' && !createFields.value.pillar_id) {
    errorMsg.value = 'Please select a pillar.'
    return
  }

  creating.value = true
  const insertData = { ...defaults, ...createFields.value }
  // Auto-generate slugs
  if (contentType.value === 'articles') {
    const title = insertData.title || 'untitled'
    insertData.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now()
    if (!insertData.summary) insertData.summary = insertData.title || 'New article'
  } else if (contentType.value === 'tracks') {
    const name = insertData.name || 'new-track'
    insertData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now()
  } else if (contentType.value === 'pillars') {
    insertData.slug = `new-pillar-${Date.now()}`
  }

  // Remove empty strings for required FK fields
  for (const [k, v] of Object.entries(insertData)) {
    if (v === '') delete insertData[k]
  }

  const { data, error } = await adminRpc({ action: 'insert', table: contentType.value, data: insertData })
  if (error) {
    errorMsg.value = `Failed to create: ${error}`
  } else if (data) {
    showCreateModal.value = false
    router.push(`/d/content/${contentType.value}/${data.id}`)
  }
  creating.value = false
}

async function fetchData() {
  loading.value = true
  rows.value = []
  errorMsg.value = ''

  const tableName = TABLE_MAP[contentType.value]
  if (!tableName) {
    errorMsg.value = `Unknown content type: ${contentType.value}`
    loading.value = false
    return
  }

  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(500)

    if (error) {
      errorMsg.value = `Failed to load: ${error.message}`
      loading.value = false
      return
    }

    // Look up track/pillar names for enrichment
    let trackMap: Record<string, any> = {}
    let pillarMap: Record<string, string> = {}

    if (contentType.value === 'lessons' || contentType.value === 'tracks') {
      const { data: pillars } = await supabase.from('pillars').select('id, name')
      pillarMap = Object.fromEntries((pillars ?? []).map((p: any) => [p.id, p.name]))
      pillarOptions.value = (pillars ?? []).sort((a: any, b: any) => a.name.localeCompare(b.name))
    }

    if (contentType.value === 'lessons') {
      const { data: tracks } = await supabase.from('tracks').select('id, name, pillar_id')
      trackMap = Object.fromEntries((tracks ?? []).map((t: any) => [t.id, t]))
      trackOptions.value = (tracks ?? []).sort((a: any, b: any) => a.name.localeCompare(b.name))
      trackToPillar.value = Object.fromEntries((tracks ?? []).map((t: any) => [t.id, t.pillar_id]))
    }

    rows.value = (data ?? []).map((row: any) => {
      const flat: any = { ...row }
      // Remove heavy fields from display
      delete flat.content
      delete flat.body

      if (contentType.value === 'lessons') {
        const track = trackMap[row.track_id]
        flat.track = track?.name ?? '—'
        flat.pillar = track ? (pillarMap[track.pillar_id] ?? '—') : '—'
        flat.xp = row.xp_reward ?? '—'
      }
      if (contentType.value === 'tracks') {
        flat.pillar = pillarMap[row.pillar_id] ?? '—'
        flat.lessons = row.lesson_count ?? '—'
      }
      if (contentType.value === 'saints' && row.feast_month) {
        flat.feast_day = `${row.feast_month}/${row.feast_day_number ?? '?'}`
      }
      return flat
    })
  } catch (e: any) {
    errorMsg.value = `Error: ${e.message || 'could not load data'}`
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

watch(contentType, () => {
  search.value = ''
  sortKey.value = ''
  fetchData()
})
</script>

<style scoped>
.content-list {
  max-width: 1100px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  font-family: var(--serif);
  font-size: 24px;
  color: var(--text);
  font-weight: 700;
  margin: 0;
}

.row-count {
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 400;
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
  white-space: nowrap;
}
.btn-gold:hover { opacity: 0.9; }
.btn-gold:disabled { opacity: 0.5; cursor: not-allowed; }

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-select {
  font-family: var(--sans);
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--raised);
  color: var(--text);
  cursor: pointer;
  outline: none;
}

.search-input {
  font-family: var(--sans);
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--raised);
  color: var(--text);
  width: 100%;
  max-width: 320px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input::placeholder {
  color: var(--text-3);
}

.search-input:focus {
  border-color: var(--gold);
}

.table-wrap {
  overflow-x: auto;
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
  user-select: none;
}

.data-table th.sortable {
  cursor: pointer;
}

.data-table th.sortable:hover {
  color: var(--text-2);
}

.sort-arrow {
  margin-left: 4px;
  font-size: 11px;
}

.data-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  color: var(--text-2);
}

.data-table tr.clickable {
  cursor: pointer;
  transition: background 0.15s;
}

.data-table tr.clickable:hover {
  background: var(--raised);
}

.color-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid var(--line);
}

.bool-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.bool-badge.yes {
  background: rgba(52, 199, 89, 0.15);
  color: #34C759;
}

.bool-badge.no {
  background: rgba(142, 142, 147, 0.1);
  color: var(--text-3);
}

.empty {
  text-align: center;
  color: var(--text-3);
  padding: 32px 12px;
}

.loading-text {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text-3);
  margin-top: 16px;
}

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200;
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: var(--surface); border: 1px solid var(--line); border-radius: 12px;
  padding: 24px; max-width: 420px; width: 90%;
}
.modal-title { font-family: var(--serif); font-size: 18px; color: var(--text); margin: 0 0 16px; }
.modal-fields { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.modal-field { display: flex; flex-direction: column; gap: 4px; }
.modal-field label { font-family: var(--sans); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-3); }
.modal-input {
  font-family: var(--sans); font-size: 14px; padding: 10px 14px; border-radius: 6px;
  border: 1px solid var(--line); background: var(--raised); color: var(--text); outline: none;
}
.modal-input:focus { border-color: var(--gold); }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-cancel {
  font-family: var(--sans); font-size: 13px; padding: 10px 20px; border-radius: 6px;
  border: 1px solid var(--line); background: var(--raised); color: var(--text-2); cursor: pointer;
}

.error-text {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--streak, #FF3B30);
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(255, 59, 48, 0.08);
  border-radius: 6px;
}
</style>
