<template>
  <Teleport to="body">
    <div v-if="modelValue" class="qs-overlay" @click="close">
      <div class="qs-panel" @click.stop>
        <div class="qs-input-wrap">
          <span class="qs-icon">&#8984;K</span>
          <input
            ref="inputEl"
            v-model="query"
            class="qs-input"
            placeholder="Search lessons, articles, saints..."
            @keydown.escape="close"
            @keydown.down.prevent="moveDown"
            @keydown.up.prevent="moveUp"
            @keydown.enter.prevent="go"
          />
        </div>
        <div v-if="results.length" class="qs-results">
          <div
            v-for="(r, i) in results"
            :key="r.route"
            class="qs-result"
            :class="{ active: i === selectedIndex }"
            @click="goTo(r)"
            @mouseenter="selectedIndex = i"
          >
            <span class="qs-type" :class="r.type">{{ r.type }}</span>
            <span class="qs-name">{{ r.name }}</span>
            <span v-if="r.sub" class="qs-sub">{{ r.sub }}</span>
          </div>
        </div>
        <div v-else-if="query.length > 0" class="qs-empty">No results</div>
        <div class="qs-footer">
          <span class="qs-hint"><kbd>↑↓</kbd> navigate <kbd>↵</kbd> open <kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const router = useRouter()
const inputEl = ref<HTMLInputElement | null>(null)
const query = ref('')
const selectedIndex = ref(0)

interface SearchItem {
  name: string
  type: string
  route: string
  sub?: string
}

const index = ref<SearchItem[]>([])
let indexLoaded = false

async function loadIndex() {
  if (indexLoaded) return
  const [lessons, articles, entries, saints, tracks, pillars] = await Promise.all([
    supabase.from('lessons').select('id, title, track_id'),
    supabase.from('articles').select('id, title, type'),
    supabase.from('reference_entries').select('id, term, type'),
    supabase.from('saints').select('id, name, rarity'),
    supabase.from('tracks').select('id, name'),
    supabase.from('pillars').select('id, name'),
  ])

  const trackMap = Object.fromEntries((tracks.data ?? []).map((t: any) => [t.id, t.name]))

  const items: SearchItem[] = [
    ...(lessons.data ?? []).map((l: any) => ({ name: l.title, type: 'lesson', route: `/d/content/lessons/${l.id}`, sub: trackMap[l.track_id] || '' })),
    ...(articles.data ?? []).map((a: any) => ({ name: a.title, type: 'article', route: `/d/content/articles/${a.id}`, sub: a.type || '' })),
    ...(entries.data ?? []).map((e: any) => ({ name: e.term, type: 'entry', route: `/d/content/entries/${e.id}`, sub: e.type || '' })),
    ...(saints.data ?? []).map((s: any) => ({ name: s.name, type: 'saint', route: `/d/content/saints/${s.id}`, sub: s.rarity || '' })),
    ...(tracks.data ?? []).map((t: any) => ({ name: t.name, type: 'track', route: `/d/content/tracks/${t.id}` })),
    ...(pillars.data ?? []).map((p: any) => ({ name: p.name, type: 'pillar', route: `/d/content/pillars/${p.id}` })),
  ]
  index.value = items
  indexLoaded = true
}

const results = computed(() => {
  if (!query.value) return []
  const q = query.value.toLowerCase()
  return index.value
    .filter(item => item.name.toLowerCase().includes(q))
    .slice(0, 12)
})

watch(() => props.modelValue, async (open) => {
  if (open) {
    query.value = ''
    selectedIndex.value = 0
    loadIndex()
    await nextTick()
    inputEl.value?.focus()
  }
})

watch(results, () => { selectedIndex.value = 0 })

function close() { emit('update:modelValue', false) }
function moveDown() { if (selectedIndex.value < results.value.length - 1) selectedIndex.value++ }
function moveUp() { if (selectedIndex.value > 0) selectedIndex.value-- }
function go() {
  const r = results.value[selectedIndex.value]
  if (r) goTo(r)
}
function goTo(r: SearchItem) {
  router.push(r.route)
  close()
}
</script>

<style scoped>
.qs-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 300;
  display: flex; align-items: flex-start; justify-content: center; padding-top: 15vh;
}
.qs-panel {
  background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
  width: 90%; max-width: 560px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.qs-input-wrap {
  display: flex; align-items: center; gap: 10px; padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}
.qs-icon {
  font-family: var(--sans); font-size: 11px; color: var(--text-3);
  background: var(--raised); padding: 3px 8px; border-radius: 4px; flex-shrink: 0;
}
.qs-input {
  flex: 1; font-family: var(--sans); font-size: 16px; color: var(--text);
  background: none; border: none; outline: none;
}
.qs-input::placeholder { color: var(--text-3); }
.qs-results { max-height: 400px; overflow-y: auto; padding: 6px; }
.qs-result {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  border-radius: 8px; cursor: pointer; transition: background 0.1s;
}
.qs-result.active { background: var(--raised); }
.qs-type {
  font-family: var(--sans); font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.5px; padding: 2px 8px; border-radius: 4px; flex-shrink: 0;
}
.qs-type.lesson { background: rgba(0, 122, 255, 0.12); color: #007AFF; }
.qs-type.article { background: rgba(52, 199, 89, 0.12); color: #34C759; }
.qs-type.entry { background: rgba(255, 159, 10, 0.12); color: #FF9F0A; }
.qs-type.saint { background: rgba(200, 165, 90, 0.15); color: var(--gold-light); }
.qs-type.track { background: rgba(175, 82, 222, 0.12); color: #AF52DE; }
.qs-type.pillar { background: rgba(255, 55, 95, 0.12); color: #FF375F; }
.qs-name { flex: 1; font-family: var(--sans); font-size: 14px; color: var(--text); }
.qs-sub { font-family: var(--sans); font-size: 11px; color: var(--text-3); flex-shrink: 0; }
.qs-empty {
  padding: 24px; text-align: center; font-family: var(--sans); font-size: 13px; color: var(--text-3);
}
.qs-footer {
  padding: 10px 20px; border-top: 1px solid var(--line);
}
.qs-hint { font-family: var(--sans); font-size: 11px; color: var(--text-3); }
.qs-hint kbd {
  font-family: var(--sans); font-size: 10px; background: var(--raised);
  padding: 2px 5px; border-radius: 3px; margin: 0 2px;
}
</style>
