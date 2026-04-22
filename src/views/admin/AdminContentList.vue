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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase, TABLE_MAP } from '../../lib/supabase'

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
  lessons: { title: 'Untitled Lesson', sort_order: 0, active: false },
  articles: { title: 'Untitled Article', slug: `new-article-${Date.now()}`, type: 'article', summary: '', body: [] },
  entries: { term: 'New Term', type: 'doctrine', definition: '' },
  saints: { name: 'New Saint', unlock_method: 'track_completion', rarity: 'common' },
  tracks: { name: 'New Track', sort_order: 0, active: false },
  pillars: { name: 'New Pillar', slug: `new-pillar-${Date.now()}`, color: '#C8A55A', sort_order: 0 },
}

async function handleCreate() {
  const tableName = TABLE_MAP[contentType.value]
  const defaults = NEW_DEFAULTS[contentType.value]
  if (!tableName || !defaults) return

  creating.value = true
  try {
    // For articles, generate a unique slug
    const insertData = { ...defaults }
    if (contentType.value === 'articles') {
      insertData.slug = `new-article-${Date.now()}`
    } else if (contentType.value === 'pillars') {
      insertData.slug = `new-pillar-${Date.now()}`
    }

    const { data, error } = await supabase
      .from(tableName)
      .insert(insertData)
      .select('id')
      .single()

    if (error) {
      errorMsg.value = `Failed to create: ${error.message}`
    } else if (data) {
      router.push(`/d/content/${contentType.value}/${data.id}`)
    }
  } catch (e: any) {
    errorMsg.value = `Error: ${e.message}`
  } finally {
    creating.value = false
  }
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
