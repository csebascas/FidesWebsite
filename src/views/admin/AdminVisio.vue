<template>
  <div class="visio">
    <h1 class="page-title">Visio Rooms</h1>
    <p class="subtitle">
      Place painting hotspots visually. Every marker is stored in the painting's own
      <b>normalized space</b> (cx/cy/rx/ry ∈ 0–1 against intrinsic pixels) — the exact
      values the app's camera math reads, so a circle here lands on the same brushstroke
      in-app. Writes go through the service-role admin API; the app can only read.
    </p>

    <div class="mode-tabs" role="tablist" aria-label="Visio workspace">
      <button
        class="mode-tab"
        :class="{ active: activeTab === 'editor' }"
        role="tab"
        :aria-selected="activeTab === 'editor'"
        @click="activeTab = 'editor'"
      >
        Editor
      </button>
      <button
        class="mode-tab"
        :class="{ active: activeTab === 'preview' }"
        role="tab"
        :aria-selected="activeTab === 'preview'"
        @click="activeTab = 'preview'"
      >
        App preview
      </button>
    </div>

    <!-- Painting picker -->
    <div class="section">
      <h2 class="section-title">Painting</h2>
      <div class="chip-row">
        <button
          v-for="p in paintings"
          :key="p.id"
          class="chip"
          :class="{ sel: selected && selected.id === p.id }"
          @click="selectPainting(p)"
        >
          <span class="chip-name">{{ p.title }}</span>
          <span class="chip-sub">{{ p.artist }}</span>
        </button>
        <button class="chip new" @click="newPainting">+ New painting</button>
      </div>
    </div>

    <div v-if="selected && activeTab === 'editor'" class="section">
      <!-- Metadata form -->
      <h2 class="section-title">{{ selected.id ? 'Edit painting' : 'New painting' }}</h2>
      <div class="meta-grid">
        <div class="fld"><label>Slug <span class="req">*</span></label><input v-model="selected.slug" placeholder="calling-of-st-matthew" /></div>
        <div class="fld"><label>Title <span class="req">*</span></label><input v-model="selected.title" placeholder="The Calling of Saint Matthew" /></div>
        <div class="fld"><label>Artist <span class="req">*</span></label><input v-model="selected.artist" placeholder="Caravaggio" /></div>
        <div class="fld"><label>Year label <span class="req">*</span></label><input v-model="selected.year_label" placeholder="1599-1600" /></div>
        <div class="fld"><label>Medium</label><input v-model="selected.medium" placeholder="Oil on canvas" /></div>
        <div class="fld"><label>Dimensions</label><input v-model="selected.dimensions" placeholder="322 x 340 cm" /></div>
        <div class="fld"><label>Location</label><input v-model="selected.location" placeholder="Contarelli Chapel, Rome" /></div>
        <div class="fld"><label>License</label><input v-model="selected.license" placeholder="PD-Art" /></div>
        <div class="fld"><label>Width px <span class="req">*</span></label><input type="number" v-model.number="selected.width_px" placeholder="9770" /></div>
        <div class="fld"><label>Height px <span class="req">*</span></label><input type="number" v-model.number="selected.height_px" placeholder="10039" /></div>
        <div class="fld wide"><label>Storage path <span class="req">*</span></label><input v-model="selected.storage_path" placeholder="paintings/calling-of-st-matthew.jpg" /></div>
        <div class="fld wide">
          <label>Image source <span class="opt">(for placing regions — defaults to the public storage URL; paste any URL to author before upload)</span></label>
          <input v-model="imageSrc" placeholder="https://…" />
        </div>
      </div>
      <div class="row-btns">
        <button class="btn ghost" @click="savePainting" :disabled="busy">Save painting details</button>
        <span v-if="paintMsg" class="msg">{{ paintMsg }}</span>
      </div>
    </div>

    <!-- Editor stage + region list -->
    <div v-if="activeTab === 'editor' && selected && selected.id" class="editor-grid">
      <div class="stage-wrap">
        <div class="stage">
          <img
            v-if="imageSrc"
            :src="imageSrc"
            ref="imgEl"
            class="canvas-img"
            draggable="false"
            @load="onImgLoad"
            @error="imgError = true"
          />
          <div v-if="imgError" class="img-err">Image didn't load. Check the storage path / image source.</div>

          <!-- Overlay markers (screen-space, derived from normalized coords) -->
          <template v-for="r in regions" :key="r._key">
            <!-- Ellipse -->
            <div
              v-if="r.shape === 'ellipse'"
              class="marker ellipse"
              :class="{ sel: r._key === selKey }"
              :style="ellipseStyle(r)"
              @pointerdown.stop="startMove(r, $event)"
            >
              <div class="dot"></div>
              <div class="resize" @pointerdown.stop="startResize(r, $event)"></div>
              <span class="tag">{{ r.slug || '…' }}</span>
            </div>
            <!-- Rect -->
            <div
              v-else-if="r.shape === 'rect'"
              class="marker rect"
              :class="{ sel: r._key === selKey }"
              :style="rectStyle(r)"
              @pointerdown.stop="startMove(r, $event)"
            >
              <div class="resize" @pointerdown.stop="startResize(r, $event)"></div>
              <span class="tag">{{ r.slug || '…' }}</span>
            </div>
            <!-- Polygon (read-only render; vertices edited numerically for now) -->
            <svg
              v-else-if="r.shape === 'polygon' && renderedW"
              class="marker poly"
              :class="{ sel: r._key === selKey }"
              :width="renderedW"
              :height="renderedH"
              @pointerdown.stop="selKey = r._key"
            >
              <polygon :points="polyPoints(r)" />
            </svg>
          </template>
        </div>
        <p class="hint">Drag a marker to move · drag its corner handle to resize · click to select.</p>
      </div>

      <!-- Region list -->
      <div class="regions">
        <div class="regions-head">
          <h2 class="section-title">Regions ({{ regions.length }})</h2>
          <div class="add-btns">
            <button class="btn tiny" @click="addRegion('ellipse')">+ Ellipse</button>
            <button class="btn tiny" @click="addRegion('rect')">+ Rect</button>
          </div>
        </div>

        <div v-if="!regions.length" class="empty">No regions yet. Add an ellipse to begin.</div>

        <div
          v-for="r in regions"
          :key="r._key"
          class="region-row"
          :class="{ sel: r._key === selKey }"
          @click="selKey = r._key"
        >
          <div class="region-top">
            <input class="slug-in" v-model="r.slug" placeholder="region-slug" @input="r._dirty = true" />
            <span class="shape-tag">{{ r.shape }}</span>
            <button class="del" title="Delete region" @click.stop="removeRegion(r)">✕</button>
          </div>
          <input class="label-in" v-model="r.label" placeholder="Label (optional)" @input="r._dirty = true" />
          <div class="coords">{{ coordReadout(r) }}</div>
        </div>

        <div class="row-btns save-all">
          <button class="btn" @click="saveRegions" :disabled="busy || !regions.length">Save all regions</button>
          <span v-if="regionMsg" class="msg">{{ regionMsg }}</span>
        </div>
      </div>
    </div>
    <p v-else-if="activeTab === 'editor' && selected && !selected.id" class="note">Save painting details first to unlock the hotspot canvas.</p>

    <!-- Scene steps: camera placement + explore pacing, from the linked lesson -->
    <div v-if="activeTab === 'editor' && selected && selected.id" class="section scene-steps">
      <h2 class="section-title">Scene steps — camera &amp; pacing</h2>
      <p v-if="!lesson" class="empty">This painting isn't linked to a Visio lesson, so there are no scene steps to place.</p>
      <p v-else-if="!artSteps.length" class="empty">Linked lesson "{{ lesson.title }}" has no camera-driven art steps.</p>
      <template v-else>
        <p class="subtitle" style="margin-bottom: 14px">
          Place where each step frames the painting: <strong>u</strong>/<strong>v</strong> are the center (0–1),
          <strong>span</strong> is the zoom (smaller = closer). <strong>Continue after N</strong> sets how many
          hotspots the reader must tap on the explore step before Continue unlocks.
        </p>
        <div class="step-card" v-for="st in artSteps" :key="st.idx">
          <div class="step-head">
            <span class="step-type">{{ stepTypeLabel(st.type) }}</span>
            <span class="step-label">{{ st.label }}</span>
          </div>
          <div class="step-grid">
            <div class="fld"><label>Center u</label><input type="number" step="0.01" min="0" max="1" v-model.number="st.cam.u" /></div>
            <div class="fld"><label>Center v</label><input type="number" step="0.01" min="0" max="1" v-model.number="st.cam.v" /></div>
            <div class="fld"><label>Span (zoom)</label><input type="number" step="0.01" min="0.05" max="1" v-model.number="st.cam.span" /></div>
            <div class="fld" v-if="st.hasRequired"><label>Continue after N</label><input type="number" step="1" min="1" max="12" v-model.number="st.required" /></div>
          </div>
        </div>
        <div class="row-btns save-all">
          <button class="btn" @click="saveLesson" :disabled="busy">Save scene steps</button>
          <span v-if="lessonMsg" class="msg">{{ lessonMsg }}</span>
        </div>
      </template>
    </div>

    <section v-if="activeTab === 'preview'" class="preview-panel" aria-label="Visio app preview">
      <div v-if="!selected" class="empty">Choose a painting to preview it.</div>
      <template v-else-if="!previewReady">
        <p class="note">Add the painting's intrinsic width, height, and image source before opening the preview.</p>
      </template>
      <template v-else>
        <div class="preview-toolbar">
          <div>
            <h2 class="section-title">App preview</h2>
            <p class="preview-note">This is the app's 4:5 art stage at a 390-point device width. The image transform uses the same normalized camera calculation as the room player.</p>
          </div>
          <div class="preview-switch" role="group" aria-label="Preview state">
            <button :class="{ active: previewState === 'scene' }" @click="previewState = 'scene'">Opening</button>
            <button :class="{ active: previewState === 'hotspots' }" @click="previewState = 'hotspots'">Hotspots</button>
          </div>
        </div>

        <div class="preview-layout">
          <div class="phone-frame">
            <div class="phone-stage" :class="{ 'hotspot-stage': previewState === 'hotspots' }">
              <div class="preview-art" :style="previewArtStyle">
                <img :src="imageSrc" alt="" draggable="false" />
                <template v-if="previewState === 'hotspots'">
                  <button
                    v-for="r in appRegions"
                    :key="r._key"
                    class="app-marker"
                    :class="{ selected: r._key === selKey }"
                    :style="appMarkerStyle(r)"
                    :aria-label="r.label || r.slug || 'Painting region'"
                    @click="selKey = r._key"
                  ></button>
                </template>
              </div>
              <div class="preview-top-scrim" aria-hidden="true"></div>
              <div class="preview-topbar">
                <span class="preview-close">×</span>
                <span class="preview-measure"><i :style="{ width: previewState === 'scene' ? '12.5%' : '87.5%' }"></i></span>
                <em>{{ previewState === 'scene' ? 'i / viii' : 'vii / viii' }}</em>
              </div>
              <div class="preview-bottom-fade" aria-hidden="true"></div>
            </div>
            <div class="preview-label">
              <template v-if="previewState === 'scene'">
                <p class="preview-artist">{{ selected.artist }}</p>
                <h3>{{ selected.title }}</h3>
                <p>{{ selected.medium || 'Painting details' }}</p>
              </template>
              <template v-else>
                <p class="preview-artist">Look closely</p>
                <h3>{{ selected.title }}</h3>
                <p>Tap a marked detail to open its note.</p>
              </template>
            </div>
            <div class="preview-cta">{{ previewState === 'scene' ? 'Enter the painting' : 'Continue' }}</div>
          </div>

          <aside class="preview-info">
            <p><b>{{ appRegions.length }}</b> ellipse{{ appRegions.length === 1 ? '' : 's' }} shown by the app.</p>
            <p v-if="unsupportedRegionCount">{{ unsupportedRegionCount }} rectangle or polygon region{{ unsupportedRegionCount === 1 ? ' is' : 's are' }} stored here, but the current app room loader ignores those shapes.</p>
            <p>The editor and preview both write and read the same cx, cy, rx, and ry values. Select a ring to return to that region in the editor.</p>
          </aside>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * Visio hotspot editor (admin).
 *
 * COORDINATE PARITY WITH THE APP — the whole point of this tool.
 * The app (src/components/Visio/camera.ts) authors every region in the painting's
 * own NORMALIZED space: u,v ∈ [0,1] against intrinsic pixel dimensions, and for
 * ellipses rx = fraction of width, ry = fraction of height (src/.../Visio/types.ts).
 * Here we render the WHOLE painting undistorted (aspect preserved) — the degenerate
 * `span = 1` / cover case of cameraToTransform — so a normalized point (u,v) maps to
 * screen (u·renderedW, v·renderedH). A pixel drag inverts with the EXACT relation the
 * in-app editor uses: du = dxPx / renderedW, dv = dyPx / renderedH. No parallel math,
 * no per-device values — what we store is byte-for-byte what the app reads.
 */
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { adminRpc } from '../../lib/supabase'

interface Painting {
  id?: string
  slug: string
  title: string
  artist: string
  year_label: string
  medium: string | null
  dimensions: string | null
  location: string | null
  storage_path: string
  width_px: number
  height_px: number
  license: string
  source_url: string | null
  lesson_id?: string | null
}

// A camera-driven step inside the linked Visio lesson's content. We only expose
// the two things authors want to tune from the web: where the camera frames the
// painting (cam u/v/span) and, for the explore step, how many hotspots the reader
// must tap before Continue unlocks (required).
interface ArtStep {
  idx: number // index in lesson.content, so edits write back to the right step
  type: string // art_find | art_explore | art_mcq
  label: string
  cam: { u: number; v: number; span: number }
  hasRequired: boolean
  required: number
}

interface Region {
  _key: number
  id?: string
  painting_id: string
  slug: string
  shape: 'ellipse' | 'rect' | 'polygon'
  geometry: any
  label: string | null
  _dirty?: boolean
}

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://huwcgdlarvmmjurysqar.supabase.co'

const paintings = ref<Painting[]>([])
const selected = ref<Painting | null>(null)
const regions = ref<Region[]>([])
const deletedIds = ref<string[]>([])
const selKey = ref<number | null>(null)
const imageSrc = ref('')
const imgError = ref(false)
const busy = ref(false)
const paintMsg = ref('')
const regionMsg = ref('')
const activeTab = ref<'editor' | 'preview'>('editor')
const previewState = ref<'scene' | 'hotspots'>('scene')

// Scene-step editing (camera placement + explore pacing) from the linked lesson.
const lesson = ref<{ id: string; title: string; content: any[] } | null>(null)
const artSteps = ref<ArtStep[]>([])
const lessonMsg = ref('')

const imgEl = ref<HTMLImageElement | null>(null)
const renderedW = ref(0)
const renderedH = ref(0)

const appRegions = computed(() => regions.value.filter((r) => r.shape === 'ellipse'))
const unsupportedRegionCount = computed(() => regions.value.length - appRegions.value.length)
const previewReady = computed(
  () => !!imageSrc.value && !!selected.value?.width_px && !!selected.value?.height_px,
)

// Mirrors Fides/src/components/Visio/camera.ts for the two live player states:
// the opening scene uses contain; an interactive hotspot step uses cover. Values
// are normalized by the stage dimensions so CSS can render the same transform.
const previewArtStyle = computed(() => {
  const p = selected.value
  if (!p || !p.width_px || !p.height_px) return {}
  const stageAspect = 5 / 4
  const paintingAspect = p.height_px / p.width_px
  const span = previewState.value === 'scene'
    ? Math.max(1, paintingAspect / stageAspect)
    : Math.min(1, paintingAspect / stageAspect)
  const scale = 1 / span
  const imageW = scale
  const imageH = paintingAspect * scale
  let tx = 0.5 - 0.5 * imageW
  let ty = 0.5 - 0.5 * imageH / stageAspect
  if (imageW <= 1) tx = (1 - imageW) / 2
  else tx = Math.min(0, Math.max(1 - imageW, tx))
  if (imageH <= stageAspect) ty = (stageAspect - imageH) / (2 * stageAspect)
  else ty = Math.min(0, Math.max((stageAspect - imageH) / stageAspect, ty))
  return {
    left: `${tx * 100}%`,
    top: `${ty * 100}%`,
    aspectRatio: `${p.width_px} / ${p.height_px}`,
    transform: `scale(${scale})`,
  }
})

let keySeq = 1

// ── Load ────────────────────────────────────────────────────────────────────
onMounted(async () => {
  const { data, error } = await adminRpc({
    action: 'select',
    table: 'paintings',
    order: { column: 'created_at', ascending: true },
  })
  if (!error && data) paintings.value = data
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => window.removeEventListener('resize', measure))

function publicUrl(path: string): string {
  if (!path) return ''
  // Supabase public object URL: /storage/v1/object/public/<bucket>/<path>.
  // storage_path already carries the bucket prefix (e.g. 'paintings/foo.jpg').
  return `${SUPABASE_URL}/storage/v1/object/public/${path.replace(/^\/+/, '')}`
}

// Prefer the seeded source_url (e.g. a Wikimedia file) for placing regions —
// the real image isn't uploaded to Supabase storage yet. Fall back to the
// public storage URL once storage_path is populated. Either way the displayed
// image preserves the painting's intrinsic aspect ratio, so normalized markers
// (cx/cy/rx/ry against the rendered box) land in the same place.
function imageUrlFor(p: Painting): string {
  return (p.source_url && p.source_url.trim()) || publicUrl(p.storage_path)
}

async function selectPainting(p: Painting) {
  selected.value = { ...p }
  imageSrc.value = imageUrlFor(p)
  imgError.value = false
  selKey.value = null
  deletedIds.value = []
  await loadRegions(p.id!)
  await loadLesson(p.lesson_id)
}

function stepTypeLabel(t: string): string {
  if (t === 'art_find') return 'Find'
  if (t === 'art_explore') return 'Explore'
  if (t === 'art_mcq') return 'Question'
  return t
}

// Load the painting's linked Visio lesson and pull out its camera-driven steps.
async function loadLesson(lessonId: string | null | undefined) {
  lesson.value = null
  artSteps.value = []
  lessonMsg.value = ''
  if (!lessonId) return
  const { data, error } = await adminRpc({
    action: 'select',
    table: 'lessons',
    match: { id: lessonId },
    limit: 1,
  })
  const row = Array.isArray(data) ? data[0] : data
  if (error || !row) return
  const content: any[] = Array.isArray(row.content) ? row.content : []
  lesson.value = { id: row.id, title: row.title, content }
  const steps: ArtStep[] = []
  content.forEach((s: any, idx: number) => {
    if (s && s.cam && (s.type === 'art_find' || s.type === 'art_explore' || s.type === 'art_mcq')) {
      steps.push({
        idx,
        type: s.type,
        label: s.prompt || s.question || (s.type === 'art_explore' ? 'Explore the painting' : s.type),
        cam: {
          u: Number(s.cam.u ?? 0.5),
          v: Number(s.cam.v ?? 0.5),
          span: Number(s.cam.span ?? 1),
        },
        hasRequired: s.type === 'art_explore',
        required: Number(s.required ?? 3),
      })
    }
  })
  artSteps.value = steps
}

function newPainting() {
  selected.value = {
    slug: '', title: '', artist: '', year_label: '',
    medium: '', dimensions: '', location: '',
    storage_path: '', width_px: 0, height_px: 0,
    license: 'PD-Art', source_url: null,
  }
  imageSrc.value = ''
  regions.value = []
  selKey.value = null
  deletedIds.value = []
}

async function loadRegions(paintingId: string) {
  const { data, error } = await adminRpc({
    action: 'select',
    table: 'painting_regions',
    match: { painting_id: paintingId },
    order: { column: 'created_at', ascending: true },
  })
  regions.value =
    !error && data
      ? data.map((r: any) => ({ ...r, _key: keySeq++ }))
      : []
}

// ── Measure the rendered image box ───────────────────────────────────────────
function measure() {
  const el = imgEl.value
  if (!el) return
  renderedW.value = el.clientWidth
  renderedH.value = el.clientHeight
}
function onImgLoad() {
  imgError.value = false
  measure()
}

// ── Marker screen styles (normalized → px) ──────────────────────────────────
function ellipseStyle(r: Region) {
  const g = r.geometry
  const rxPx = (g.rx || 0) * renderedW.value
  const ryPx = (g.ry || 0) * renderedH.value
  return {
    left: `${(g.cx || 0) * renderedW.value - rxPx}px`,
    top: `${(g.cy || 0) * renderedH.value - ryPx}px`,
    width: `${rxPx * 2}px`,
    height: `${ryPx * 2}px`,
  }
}
function appMarkerStyle(r: Region) {
  const g = r.geometry
  return {
    left: `${((g.cx || 0) - (g.rx || 0)) * 100}%`,
    top: `${((g.cy || 0) - (g.ry || 0)) * 100}%`,
    width: `${(g.rx || 0) * 200}%`,
    height: `${(g.ry || 0) * 200}%`,
  }
}
function rectStyle(r: Region) {
  const g = r.geometry
  return {
    left: `${(g.x || 0) * renderedW.value}px`,
    top: `${(g.y || 0) * renderedH.value}px`,
    width: `${(g.w || 0) * renderedW.value}px`,
    height: `${(g.h || 0) * renderedH.value}px`,
  }
}
function polyPoints(r: Region): string {
  const pts: [number, number][] = r.geometry.points || []
  return pts.map(([u, v]) => `${u * renderedW.value},${v * renderedH.value}`).join(' ')
}

function coordReadout(r: Region): string {
  const g = r.geometry
  const f = (n: number) => (n ?? 0).toFixed(3)
  if (r.shape === 'ellipse') return `cx ${f(g.cx)}  cy ${f(g.cy)}  rx ${f(g.rx)}  ry ${f(g.ry)}`
  if (r.shape === 'rect') return `x ${f(g.x)}  y ${f(g.y)}  w ${f(g.w)}  h ${f(g.h)}`
  return `${(g.points || []).length} vertices`
}

// ── Add / remove ─────────────────────────────────────────────────────────────
function addRegion(shape: 'ellipse' | 'rect') {
  if (!selected.value?.id) return
  const geometry =
    shape === 'ellipse'
      ? { cx: 0.5, cy: 0.5, rx: 0.06, ry: 0.06 }
      : { x: 0.42, y: 0.42, w: 0.16, h: 0.16 }
  const r: Region = {
    _key: keySeq++,
    painting_id: selected.value.id,
    slug: '',
    shape,
    geometry,
    label: '',
    _dirty: true,
  }
  regions.value.push(r)
  selKey.value = r._key
}
function removeRegion(r: Region) {
  if (r.id) deletedIds.value.push(r.id)
  regions.value = regions.value.filter((x) => x._key !== r._key)
  if (selKey.value === r._key) selKey.value = null
}

// ── Drag to move / resize (pointer events) ──────────────────────────────────
let drag:
  | { r: Region; mode: 'move' | 'resize'; startX: number; startY: number; g0: any }
  | null = null

function startMove(r: Region, e: PointerEvent) {
  selKey.value = r._key
  drag = { r, mode: 'move', startX: e.clientX, startY: e.clientY, g0: { ...r.geometry } }
  bindDrag(e)
}
function startResize(r: Region, e: PointerEvent) {
  selKey.value = r._key
  drag = { r, mode: 'resize', startX: e.clientX, startY: e.clientY, g0: { ...r.geometry } }
  bindDrag(e)
}
function bindDrag(e: PointerEvent) {
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', endDrag)
}
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

function onDrag(e: PointerEvent) {
  if (!drag || !renderedW.value || !renderedH.value) return
  // Invert the exact display transform: pixel delta → normalized delta.
  const du = (e.clientX - drag.startX) / renderedW.value
  const dv = (e.clientY - drag.startY) / renderedH.value
  const g = drag.g0
  const r = drag.r
  if (r.shape === 'ellipse') {
    if (drag.mode === 'move') r.geometry = { ...g, cx: clamp01(g.cx + du), cy: clamp01(g.cy + dv) }
    else r.geometry = { ...g, rx: Math.max(0.005, g.rx + du), ry: Math.max(0.005, g.ry + dv) }
  } else if (r.shape === 'rect') {
    if (drag.mode === 'move') r.geometry = { ...g, x: clamp01(g.x + du), y: clamp01(g.y + dv) }
    else r.geometry = { ...g, w: Math.max(0.01, g.w + du), h: Math.max(0.01, g.h + dv) }
  }
  r._dirty = true
}
function endDrag() {
  drag = null
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', endDrag)
}

// ── Save ─────────────────────────────────────────────────────────────────────
const round3 = (n: number) => Math.round(n * 1000) / 1000
function roundGeom(g: any): any {
  const out: any = {}
  for (const k of Object.keys(g)) {
    out[k] = k === 'points'
      ? g.points.map(([u, v]: number[]) => [round3(u), round3(v)])
      : round3(g[k])
  }
  return out
}

async function savePainting() {
  const p = selected.value
  if (!p) return
  if (!p.slug || !p.title || !p.artist || !p.year_label || !p.storage_path || !p.width_px || !p.height_px) {
    paintMsg.value = 'Slug, title, artist, year, storage path, and both dimensions are required.'
    return
  }
  busy.value = true
  paintMsg.value = ''
  const payload = {
    slug: p.slug, title: p.title, artist: p.artist, year_label: p.year_label,
    medium: p.medium || null, dimensions: p.dimensions || null, location: p.location || null,
    storage_path: p.storage_path, width_px: p.width_px, height_px: p.height_px,
    license: p.license || 'PD-Art', source_url: p.source_url || null,
  }
  const res = p.id
    ? await adminRpc({ action: 'update', table: 'paintings', id: p.id, data: payload })
    : await adminRpc({ action: 'insert', table: 'paintings', data: payload })
  busy.value = false
  if (res.error) { paintMsg.value = res.error; return }
  const saved: Painting = res.data
  selected.value = { ...saved }
  imageSrc.value = imageUrlFor(saved)
  const idx = paintings.value.findIndex((x) => x.id === saved.id)
  if (idx >= 0) paintings.value[idx] = saved
  else paintings.value.push(saved)
  paintMsg.value = 'Saved.'
}

async function saveRegions() {
  if (!selected.value?.id) return
  // Validate slugs (unique, non-empty).
  const slugs = new Set<string>()
  for (const r of regions.value) {
    if (!r.slug) { regionMsg.value = 'Every region needs a slug.'; return }
    if (slugs.has(r.slug)) { regionMsg.value = `Duplicate slug: ${r.slug}`; return }
    slugs.add(r.slug)
  }
  busy.value = true
  regionMsg.value = ''
  try {
    for (const id of deletedIds.value) {
      const res = await adminRpc({ action: 'delete', table: 'painting_regions', id })
      if (res.error) throw new Error(res.error)
    }
    deletedIds.value = []
    for (const r of regions.value) {
      const data = {
        painting_id: selected.value.id,
        slug: r.slug,
        shape: r.shape,
        geometry: roundGeom(r.geometry),
        label: r.label || null,
      }
      const res = r.id
        ? await adminRpc({ action: 'update', table: 'painting_regions', id: r.id, data })
        : await adminRpc({ action: 'insert', table: 'painting_regions', data })
      if (res.error) throw new Error(res.error)
      if (!r.id && res.data?.id) r.id = res.data.id
      r._dirty = false
    }
    regionMsg.value = `Saved ${regions.value.length} region(s).`
  } catch (e: any) {
    regionMsg.value = e.message || 'Save failed.'
  } finally {
    busy.value = false
  }
}

// Write the edited camera placement + explore pacing back into the lesson content.
// Only the cam and required fields of the matched steps change; every other step
// and field is preserved exactly.
async function saveLesson() {
  if (!lesson.value) return
  busy.value = true
  lessonMsg.value = ''
  const content = lesson.value.content.map((s: any) => ({ ...s }))
  for (const st of artSteps.value) {
    const s = content[st.idx]
    if (!s) continue
    s.cam = {
      u: round3(clamp01(st.cam.u)),
      v: round3(clamp01(st.cam.v)),
      span: round3(Math.min(1, Math.max(0.05, st.cam.span))),
    }
    if (st.hasRequired) s.required = Math.max(1, Math.round(st.required))
  }
  const res = await adminRpc({
    action: 'update',
    table: 'lessons',
    id: lesson.value.id,
    data: { content },
  })
  busy.value = false
  if (res.error) { lessonMsg.value = res.error; return }
  lesson.value.content = content
  lessonMsg.value = 'Scene steps saved.'
}
</script>

<style scoped>
.page-title { font-family: var(--serif); font-size: 24px; color: var(--text); margin: 0 0 6px; }
.subtitle { font-family: var(--sans); font-size: 12.5px; color: var(--text-2); max-width: 720px; line-height: 1.5; margin: 0 0 22px; }
.section { margin-bottom: 22px; }
.section-title { font-family: var(--sans); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; color: var(--text-3); margin: 0 0 10px; }

.mode-tabs { display: flex; width: fit-content; margin: 0 0 24px; padding: 3px; gap: 3px; background: var(--surface); border: 0.5px solid var(--line); border-radius: 6px; }
.mode-tab { border: 0; border-radius: 4px; padding: 7px 12px; background: transparent; color: var(--text-3); font: 600 12px var(--sans); cursor: pointer; }
.mode-tab.active { background: var(--raised); color: var(--text); }

.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; background: var(--surface); border: 0.5px solid var(--line); border-radius: 8px; padding: 8px 12px; cursor: pointer; color: var(--text); }
.chip:hover { border-color: var(--gold); }
.chip.sel { border-color: var(--gold); background: rgba(196,145,44,0.06); }
.chip.new { color: var(--gold-light); justify-content: center; }
.chip-name { font-family: var(--sans); font-size: 12.5px; font-weight: 600; }
.chip-sub { font-family: var(--sans); font-size: 10.5px; color: var(--text-3); }

.meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 16px; }
.fld { display: flex; flex-direction: column; gap: 5px; }
.fld.wide { grid-column: 1 / -1; }
.fld label { font-family: var(--sans); font-size: 11px; color: var(--text-2); }
.fld .req { color: var(--gold); }
.fld .opt { color: var(--text-3); font-weight: 400; }
.fld input { background: var(--raised); border: 0.5px solid var(--line); border-radius: 6px; padding: 8px 10px; color: var(--text); font-family: var(--sans); font-size: 12.5px; }
.fld input:focus { outline: none; border-color: var(--gold); }

.row-btns { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
.btn { background: var(--gold); color: #0C0C0C; border: none; border-radius: 6px; padding: 9px 16px; font-family: var(--sans); font-size: 12.5px; font-weight: 600; cursor: pointer; }
.btn:disabled { opacity: 0.5; cursor: default; }
.btn.ghost { background: var(--raised); color: var(--text); border: 0.5px solid var(--line); }
.btn.tiny { padding: 5px 10px; font-size: 11px; }
.msg { font-family: var(--sans); font-size: 12px; color: var(--text-2); }
.note { font-family: var(--sans); font-size: 12.5px; color: var(--text-2); }

.editor-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 24px; align-items: start; }
.stage-wrap { min-width: 0; }
.stage { position: relative; background: #080808; border: 0.5px solid var(--line); border-radius: 8px; overflow: hidden; line-height: 0; user-select: none; }
.canvas-img { display: block; width: 100%; height: auto; }
.img-err { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: var(--sans); font-size: 12px; color: var(--streak); }
.hint { font-family: var(--sans); font-size: 11px; color: var(--text-3); margin-top: 8px; }

.marker { position: absolute; box-sizing: border-box; cursor: move; touch-action: none; }
.marker.ellipse { border: 1.5px solid var(--gold); border-radius: 50%; }
.marker.rect { border: 1.5px solid var(--gold); }
.marker.sel { border-color: var(--gold-light); box-shadow: 0 0 0 1px var(--gold-light); }
.marker .dot { position: absolute; left: 50%; top: 50%; width: 5px; height: 5px; margin: -2.5px 0 0 -2.5px; border-radius: 50%; background: var(--gold); }
.marker.sel .dot { background: var(--gold-light); }
.marker .resize { position: absolute; right: -5px; bottom: -5px; width: 12px; height: 12px; border-radius: 3px; background: var(--gold-light); cursor: nwse-resize; touch-action: none; }
.marker .resize::before { content: ''; position: absolute; inset: -14px; }
.marker .tag { position: absolute; left: 50%; top: -18px; transform: translateX(-50%); font-family: var(--sans); font-size: 9px; color: var(--gold-light); background: rgba(10,9,8,0.85); padding: 1px 5px; border-radius: 3px; white-space: nowrap; }
.marker.poly { position: absolute; left: 0; top: 0; overflow: visible; }
.marker.poly polygon { fill: rgba(196,145,44,0.12); stroke: var(--gold); stroke-width: 1.5; }
.marker.poly.sel polygon { stroke: var(--gold-light); }

.regions { position: sticky; top: 20px; }
.regions-head { display: flex; align-items: center; justify-content: space-between; }
.add-btns { display: flex; gap: 6px; }
.empty { font-family: var(--sans); font-size: 12px; color: var(--text-3); padding: 14px 0; }

.scene-steps { max-width: 720px; }
.step-card { background: var(--surface); border: 0.5px solid var(--line); border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
.step-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
.step-type { font-family: var(--sans); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--gold); background: rgba(196,145,44,0.1); border-radius: 4px; padding: 2px 7px; }
.step-label { font-family: var(--sans); font-size: 12.5px; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.step-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.region-row { border: 0.5px solid var(--line); border-radius: 6px; padding: 9px 10px; margin-bottom: 8px; cursor: pointer; background: var(--surface); }
.region-row.sel { border-color: var(--gold-light); }
.region-top { display: flex; align-items: center; gap: 8px; }
.slug-in { flex: 1; background: var(--raised); border: 0.5px solid var(--line); border-radius: 5px; padding: 5px 8px; color: var(--text); font-family: var(--sans); font-size: 12px; }
.slug-in:focus { outline: none; border-color: var(--gold); }
.shape-tag { font-family: var(--sans); font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-3); }
.del { background: none; border: none; color: var(--text-3); cursor: pointer; font-size: 13px; padding: 2px 4px; }
.del:hover { color: var(--streak); }
.label-in { width: 100%; box-sizing: border-box; margin-top: 6px; background: var(--raised); border: 0.5px solid var(--line); border-radius: 5px; padding: 5px 8px; color: var(--text-2); font-family: var(--sans); font-size: 11.5px; }
.label-in:focus { outline: none; border-color: var(--gold); }
.coords { font-family: var(--sans); font-size: 10.5px; color: var(--text-3); margin-top: 6px; }
.save-all { margin-top: 14px; }

/* ─── App preview ───────────────────────────────────────────────────────── */
.preview-panel { max-width: 900px; }
.preview-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.preview-note { max-width: 510px; color: var(--text-2); font: 12px/1.5 var(--sans); }
.preview-switch { display: flex; flex: 0 0 auto; padding: 3px; gap: 3px; border: 0.5px solid var(--line); border-radius: 6px; background: var(--surface); }
.preview-switch button { border: 0; border-radius: 4px; padding: 6px 9px; background: transparent; color: var(--text-3); font: 600 11px var(--sans); cursor: pointer; }
.preview-switch button.active { background: var(--raised); color: var(--gold-light); }
.preview-layout { display: flex; align-items: flex-start; gap: 24px; }
.phone-frame { width: min(100%, 390px); flex: 0 0 390px; overflow: hidden; border: 0.5px solid #292825; border-radius: 10px; background: var(--bg); }
.phone-stage { position: relative; width: 100%; aspect-ratio: 4 / 5; overflow: hidden; background: var(--bg); }
.preview-art { position: absolute; width: 100%; transform-origin: top left; line-height: 0; }
.preview-art > img { display: block; width: 100%; height: 100%; object-fit: fill; user-select: none; }
.preview-top-scrim, .preview-bottom-fade { position: absolute; left: 0; right: 0; pointer-events: none; }
.preview-top-scrim { top: 0; height: 76px; background: linear-gradient(to bottom, rgba(12,12,12,.66), transparent); }
.preview-bottom-fade { bottom: 0; height: 40px; background: linear-gradient(to bottom, transparent, var(--bg)); }
.preview-topbar { position: absolute; inset: 0 0 auto; display: grid; grid-template-columns: 24px 1fr 54px; align-items: center; gap: 10px; padding: 31px 22px 0; color: var(--text-2); }
.preview-close { font: 24px/16px var(--sans); font-weight: 200; }
.preview-measure { display: block; height: 2px; background: rgba(242,237,228,.15); overflow: hidden; }
.preview-measure i { display: block; height: 100%; background: var(--gold); }
.preview-topbar em { font: italic 12px var(--serif); text-align: right; }
.app-marker { position: absolute; display: block; box-sizing: border-box; border: 1.5px solid rgba(196,145,44,.95); border-radius: 50%; background: rgba(196,145,44,.07); cursor: pointer; animation: ring-breathe 2.6s ease-in-out infinite alternate; }
.app-marker::after { content: ''; position: absolute; top: 50%; left: 50%; width: 5px; height: 5px; margin: -2.5px; border-radius: 50%; background: var(--gold); }
.app-marker.selected { border-color: var(--gold-light); background: rgba(232,180,78,.14); }
.app-marker.selected::after { background: var(--gold-light); }
.preview-label { min-height: 154px; padding: 16px 22px 10px; }
.preview-artist { margin-bottom: 5px; color: var(--text-2); font: 600 11px var(--sans); }
.preview-label h3 { margin-bottom: 8px; color: var(--text); font: 22px/1.17 var(--serif); }
.preview-label p:last-child { color: var(--text-2); font: 12px/1.48 var(--sans); }
.preview-cta { margin: 0 22px 22px; padding: 14px; border-radius: 6px; background: var(--gold); color: var(--bg); text-align: center; font: 500 15px var(--sans); }
.preview-info { max-width: 240px; padding-top: 8px; color: var(--text-2); font: 12px/1.5 var(--sans); }
.preview-info p + p { margin-top: 12px; }
.preview-info b { color: var(--gold-light); }

@keyframes ring-breathe { from { opacity: .38; } to { opacity: .95; } }

@media (max-width: 900px) {
  .editor-grid { grid-template-columns: 1fr; }
  .meta-grid { grid-template-columns: 1fr; }
  .regions { position: static; }
  .preview-layout { flex-direction: column; }
  .preview-info { max-width: 540px; padding-top: 0; }
}

@media (max-width: 600px) {
  .visio { -webkit-text-size-adjust: 100%; }
  .chip-row { gap: 6px; }
  .chip { padding: 7px 10px; }
  .stage { touch-action: pan-y; }
  .marker .resize { width: 20px; height: 20px; right: -9px; bottom: -9px; }
  .marker .tag { font-size: 10px; top: -20px; }
  .region-row { padding: 11px 12px; }
  .del { font-size: 16px; padding: 4px 8px; }
  .row-btns { flex-wrap: wrap; }
  .add-btns .btn.tiny { padding: 7px 12px; font-size: 12px; }
  .preview-toolbar { flex-direction: column; }
  .phone-frame { flex-basis: auto; width: 100%; }
}
</style>
