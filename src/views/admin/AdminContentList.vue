<template>
  <div class="content-list">
    <h1 class="page-title">{{ title }}</h1>

    <div class="toolbar">
      <input
        v-model="search"
        type="text"
        class="search-input"
        :placeholder="`Search ${title.toLowerCase()}...`"
      />
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
              <template v-else-if="col.key === 'active' || col.key === 'published' || col.key === 'featured'">
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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
    { key: 'featured', label: 'Featured' },
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

const filteredRows = computed(() => {
  let result = rows.value

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

async function fetchData() {
  loading.value = true
  rows.value = []
  try {
    const res = await fetch(`/api/content/${contentType.value}`)
    if (res.ok) {
      const json = await res.json()
      const raw = json.data ?? json
      // Flatten nested relations for display
      rows.value = (Array.isArray(raw) ? raw : []).map((row: any) => {
        const flat: any = { ...row }
        // lessons: tracks(name, pillars(name)) → track, pillar, steps count
        if (row.tracks) {
          flat.track = row.tracks.name ?? '—'
          flat.pillar = row.tracks.pillars?.name ?? '—'
        }
        // tracks: pillars(name) → pillar
        if (row.pillars && !row.tracks) {
          flat.pillar = row.pillars.name ?? '—'
        }
        // lessons: count steps from lesson_steps if present, or show xp_reward
        if (contentType.value === 'lessons') {
          flat.steps = row.step_count ?? '—'
          flat.xp = row.xp_reward ?? '—'
        }
        // tracks: lesson_count
        if (contentType.value === 'tracks') {
          flat.lessons = row.lesson_count ?? '—'
        }
        // saints: format feast day
        if (contentType.value === 'saints' && row.feast_month) {
          flat.feast_day = `${row.feast_month}/${row.feast_day_number ?? '?'}`
        }
        return flat
      })
    }
  } catch {
    // ignore
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

.page-title {
  font-family: var(--serif);
  font-size: 24px;
  color: var(--text);
  font-weight: 700;
  margin: 0 0 20px;
}

.toolbar {
  margin-bottom: 16px;
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
</style>
