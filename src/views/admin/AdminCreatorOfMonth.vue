<template>
  <div class="com">
    <h1 class="page-title">Creator of the Month</h1>
    <p class="subtitle">The monthly spotlight on the Learn tab. It shows only when a spotlight is <b>active</b> and its <b>month matches the current month</b> ({{ currentMonth }}).</p>

    <!-- Existing spotlights -->
    <div class="section">
      <h2 class="section-title">Spotlights</h2>
      <div class="chip-row">
        <button
          v-for="r in rows"
          :key="r.id"
          class="chip"
          :class="{ sel: form.id === r.id, live: r.active && r.month === currentMonth }"
          @click="selectRow(r)"
        >
          <span class="chip-month">{{ r.month }}</span>
          <span class="chip-name">{{ r.name }}</span>
          <span v-if="r.active && r.month === currentMonth" class="chip-live">LIVE</span>
          <span v-else-if="r.active" class="chip-active">active</span>
        </button>
        <button class="chip new" @click="newRow">+ New spotlight</button>
      </div>
    </div>

    <!-- Editor -->
    <div class="section">
      <h2 class="section-title">{{ form.id ? 'Edit spotlight' : 'New spotlight' }}</h2>

      <div v-if="form.active && form.month !== currentMonth" class="warn">
        Heads up: this month ({{ form.month || '—' }}) isn't the current month ({{ currentMonth }}), so it won't appear on the Learn tab until then.
      </div>

      <div class="editor">
        <div class="grid2">
          <div class="fld">
            <label>Month <span class="req">*</span></label>
            <input type="month" v-model="form.month" />
          </div>
          <div class="fld toggle-fld">
            <label>Active <span class="opt">(live on Learn tab)</span></label>
            <button class="status-btn" :class="{ on: form.active }" @click="form.active = !form.active">
              {{ form.active ? 'Active' : 'Off' }}
            </button>
          </div>
          <div class="fld">
            <label>Name <span class="req">*</span></label>
            <input v-model="form.name" placeholder="Creator's name" />
          </div>
          <div class="fld">
            <label>Role <span class="req">*</span></label>
            <input v-model="form.role" placeholder="e.g. Catholic content creator" />
          </div>
        </div>

        <div class="fld">
          <label>Tagline <span class="req">*</span></label>
          <input v-model="form.tagline" placeholder="One line under the name" />
        </div>
        <div class="fld">
          <label>Subheading <span class="req">*</span></label>
          <input v-model="form.subheading" placeholder="Short intro above the story" />
        </div>

        <div class="grid2">
          <div class="fld">
            <label>Portrait URL <span class="req">*</span></label>
            <input v-model="form.portrait_url" placeholder="https://…" />
          </div>
          <div class="fld portrait-prev-wrap">
            <img v-if="form.portrait_url" :src="form.portrait_url" class="portrait-prev" alt="Portrait preview" @error="portraitError = true" @load="portraitError = false" />
            <span v-if="portraitError" class="portrait-err">Image didn't load</span>
          </div>
        </div>

        <div class="fld">
          <label>Quote <span class="opt">(optional)</span></label>
          <input v-model="form.quote" placeholder="A short pull-quote" />
        </div>

        <div class="fld">
          <label>Story (markdown) <span class="req">*</span></label>
          <textarea v-model="form.body_md" rows="5" placeholder="The main spotlight story. Markdown supported."></textarea>
        </div>
        <div class="fld">
          <label>Why we partnered (markdown) <span class="req">*</span></label>
          <textarea v-model="form.why_partnered_md" rows="4" placeholder="Why this creator, in your words."></textarea>
        </div>

        <div class="fld">
          <label>Socials <span class="opt">(up to 4)</span></label>
          <div v-for="(s, i) in form.socials" :key="i" class="social-row">
            <select v-model="s.type">
              <option v-for="t in SOCIAL_TYPES" :key="t" :value="t">{{ SOCIAL_LABEL[t] }}</option>
            </select>
            <input v-model="s.url" :placeholder="`https://… (${SOCIAL_LABEL[s.type]})`" />
          </div>
        </div>

        <div class="foot">
          <span class="err" v-if="error">{{ error }}</span>
          <span class="ok" v-if="saved">Saved.</span>
          <button class="save-btn" :disabled="saving" @click="save">{{ saving ? 'Saving…' : (form.id ? 'Save changes' : 'Create spotlight') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { adminRpc } from '../../lib/supabase'

type SocialType = 'website' | 'instagram' | 'youtube' | 'x'
const SOCIAL_TYPES: SocialType[] = ['website', 'instagram', 'youtube', 'x']
const SOCIAL_LABEL: Record<string, string> = { website: 'Website', instagram: 'Instagram', youtube: 'YouTube', x: 'X' }

const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

const rows = ref<any[]>([])
const saving = ref(false)
const saved = ref(false)
const error = ref('')
const portraitError = ref(false)

function blankSocials() {
  return SOCIAL_TYPES.map((t) => ({ type: t as SocialType, url: '' }))
}

const form = reactive<any>({
  id: null,
  month: currentMonth,
  name: '',
  role: '',
  tagline: '',
  subheading: '',
  portrait_url: '',
  quote: '',
  body_md: '',
  why_partnered_md: '',
  socials: blankSocials(),
  active: true,
})

function makeSlots(socials: any): { type: SocialType; url: string }[] {
  const arr = Array.isArray(socials) ? socials : []
  const slots = arr.slice(0, 4).map((s: any) => ({ type: (s.type as SocialType) || 'website', url: s.url || '' }))
  const used = new Set(slots.map((s) => s.type))
  for (const t of SOCIAL_TYPES) {
    if (slots.length >= 4) break
    if (!used.has(t)) slots.push({ type: t, url: '' })
  }
  while (slots.length < 4) slots.push({ type: 'website', url: '' })
  return slots
}

function selectRow(r: any) {
  portraitError.value = false
  form.id = r.id
  form.month = r.month
  form.name = r.name
  form.role = r.role
  form.tagline = r.tagline
  form.subheading = r.subheading
  form.portrait_url = r.portrait_url
  form.quote = r.quote || ''
  form.body_md = r.body_md
  form.why_partnered_md = r.why_partnered_md
  form.socials = makeSlots(r.socials)
  form.active = !!r.active
}

function newRow() {
  portraitError.value = false
  form.id = null
  form.month = currentMonth
  form.name = ''
  form.role = ''
  form.tagline = ''
  form.subheading = ''
  form.portrait_url = ''
  form.quote = ''
  form.body_md = ''
  form.why_partnered_md = ''
  form.socials = blankSocials()
  form.active = true
}

async function load() {
  const { data } = await adminRpc({
    action: 'select',
    table: 'partner_of_month',
    order: { column: 'month', ascending: false },
    limit: 100,
  })
  rows.value = data ?? []
}

function selectById(id: string) {
  const r = rows.value.find((x) => x.id === id)
  if (r) selectRow(r)
}

async function save() {
  error.value = ''
  const req = ['month', 'name', 'role', 'tagline', 'subheading', 'portrait_url', 'body_md', 'why_partnered_md']
  for (const k of req) {
    if (!String(form[k] ?? '').trim()) {
      error.value = 'Fill in every required field (month, name, role, tagline, subheading, portrait URL, story, and why-partnered).'
      return
    }
  }
  saving.value = true
  const socials = form.socials
    .filter((s: any) => s.url.trim())
    .map((s: any) => ({ type: s.type, url: s.url.trim(), label: SOCIAL_LABEL[s.type as SocialType] }))
  const payload = {
    month: form.month,
    name: form.name.trim(),
    role: form.role.trim(),
    tagline: form.tagline.trim(),
    subheading: form.subheading.trim(),
    portrait_url: form.portrait_url.trim(),
    quote: form.quote.trim() || null,
    body_md: form.body_md,
    why_partnered_md: form.why_partnered_md,
    socials,
    active: form.active,
  }

  let savedId = form.id
  if (form.id) {
    const { error: e } = await adminRpc({ action: 'update', table: 'partner_of_month', id: form.id, data: payload })
    if (e) { error.value = e; saving.value = false; return }
  } else {
    const { data, error: e } = await adminRpc({ action: 'insert', table: 'partner_of_month', data: payload })
    if (e) { error.value = e; saving.value = false; return }
    savedId = data?.id
  }

  // One active spotlight per month: turn off any sibling that's still active.
  if (form.active) {
    const sibs = rows.value.filter((r) => r.month === form.month && r.id !== savedId && r.active)
    for (const s of sibs) {
      await adminRpc({ action: 'update', table: 'partner_of_month', id: s.id, data: { active: false } })
    }
  }

  saving.value = false
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
  await load()
  if (savedId) selectById(savedId)
}

onMounted(async () => {
  await load()
  // Preselect the current live one, else the newest, else a blank new form.
  const live = rows.value.find((r) => r.active && r.month === currentMonth)
  if (live) selectRow(live)
  else if (rows.value.length) selectRow(rows.value[0])
})
</script>

<style scoped>
.com { max-width: 780px; }
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
  line-height: 1.5;
}
.section { margin-bottom: 26px; }
.section-title {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text-3);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 12px;
}

.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text-2);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
}
.chip.sel { border-color: var(--gold); }
.chip.live { border-color: rgba(52, 199, 89, 0.4); }
.chip-month { color: var(--text-3); font-variant-numeric: tabular-nums; }
.chip-name { color: var(--text); }
.chip-live { font-size: 10px; font-weight: 700; color: #34c759; }
.chip-active { font-size: 10px; color: var(--gold-light); }
.chip.new { color: var(--gold-light); }

.warn {
  font-family: var(--sans);
  font-size: 12.5px;
  color: var(--gold-light);
  background: rgba(196, 145, 44, 0.1);
  border: 0.5px solid rgba(196, 145, 44, 0.3);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 14px;
  line-height: 1.5;
}

.editor {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.fld { display: flex; flex-direction: column; gap: 5px; }
.fld label { font-family: var(--sans); font-size: 12px; color: var(--text-3); }
.fld .req { color: var(--gold-light); }
.fld .opt { color: var(--text-3); opacity: 0.6; }
.fld input,
.fld select,
.fld textarea {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text);
  background: var(--bg, #0c0c0c);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 9px 11px;
  outline: none;
  width: 100%;
}
.fld textarea { resize: vertical; line-height: 1.5; }
.fld input:focus,
.fld select:focus,
.fld textarea:focus { border-color: var(--gold); }

.toggle-fld { align-items: flex-start; }
.status-btn {
  font-family: var(--sans);
  font-size: 12px;
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: none;
  color: var(--text-3);
  cursor: pointer;
}
.status-btn.on { color: #34c759; border-color: rgba(52, 199, 89, 0.4); }

.portrait-prev-wrap { align-items: flex-start; justify-content: flex-end; }
.portrait-prev {
  width: 64px;
  height: 76px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--line);
}
.portrait-err { font-family: var(--sans); font-size: 11px; color: #ff6b5e; }

.social-row { display: grid; grid-template-columns: 130px 1fr; gap: 8px; margin-bottom: 8px; }

.foot { display: flex; align-items: center; justify-content: flex-end; gap: 14px; margin-top: 4px; }
.err { font-family: var(--sans); font-size: 12px; color: #ff6b5e; margin-right: auto; }
.ok { font-family: var(--sans); font-size: 12px; color: #34c759; margin-right: auto; }
.save-btn {
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  color: #0c0c0c;
  background: var(--gold);
  border: none;
  border-radius: 6px;
  padding: 9px 18px;
  cursor: pointer;
}
.save-btn:disabled { opacity: 0.5; cursor: default; }

@media (max-width: 640px) {
  .grid2 { grid-template-columns: 1fr; }
  .social-row { grid-template-columns: 110px 1fr; }
}
</style>
