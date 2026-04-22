<template>
  <div class="content-edit">
    <router-link :to="`/d/content/${contentType}`" class="back-link">
      &larr; Back to {{ contentType }}
    </router-link>

    <h1 class="page-title">Edit {{ singularType }}</h1>

    <div v-if="loading" class="loading-text">Loading...</div>
    <div v-if="!loading && !item" class="loading-text">Not found.</div>

    <div v-if="!loading && item" class="edit-layout">
      <!-- Fields -->
      <form @submit.prevent="handleSave" class="edit-form">
        <div class="field" v-for="(value, key) in editableFields" :key="key">
          <label :for="String(key)">{{ formatLabel(String(key)) }}</label>
          <template v-if="typeof value === 'boolean'">
            <select :id="String(key)" v-model="editableFields[key]">
              <option :value="true">Yes</option>
              <option :value="false">No</option>
            </select>
          </template>
          <template v-else-if="isLongText(value)">
            <textarea
              :id="String(key)"
              v-model="editableFields[key]"
              rows="4"
            ></textarea>
          </template>
          <template v-else>
            <input
              :id="String(key)"
              v-model="editableFields[key]"
              type="text"
            />
          </template>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-gold" :disabled="saving">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
          <span v-if="saveMessage" class="save-message" :class="saveError ? 'error' : 'success'">
            {{ saveMessage }}
          </span>
        </div>
      </form>

      <!-- Lesson step preview -->
      <div v-if="contentType === 'lessons' && steps.length > 0" class="preview-panel">
        <div class="preview-header">
          <h3 class="preview-title">Lesson Preview</h3>
          <span class="step-counter">{{ steps.length }} steps</span>
        </div>

        <div class="phone-frame">
          <div class="phone-status">
            <span class="step-progress">{{ currentStep + 1 }} / {{ steps.length }}</span>
          </div>
          <div class="phone-content">
            <div class="step-type-badge">{{ steps[currentStep]?.type || 'unknown' }}</div>
            <div class="step-preview-content">
              <template v-if="steps[currentStep]">
                <!-- Concept -->
                <template v-if="steps[currentStep].type === 'concept'">
                  <h2 class="preview-heading">{{ steps[currentStep].title }}</h2>
                  <p class="preview-body">{{ steps[currentStep].body }}</p>
                  <p v-if="steps[currentStep].source" class="preview-source">— {{ steps[currentStep].source }}</p>
                </template>

                <!-- Quote -->
                <template v-else-if="steps[currentStep].type === 'quote'">
                  <blockquote class="preview-quote">"{{ steps[currentStep].text }}"</blockquote>
                  <p class="preview-source">— {{ steps[currentStep].attribution }}</p>
                </template>

                <!-- Question / Multiple Choice -->
                <template v-else-if="steps[currentStep].type === 'question' || steps[currentStep].type === 'multiple_choice'">
                  <p class="preview-question">{{ steps[currentStep].question || steps[currentStep].prompt }}</p>
                  <div class="preview-options">
                    <div
                      v-for="(opt, oi) in (steps[currentStep].options || [])"
                      :key="oi"
                      class="preview-option"
                      :class="{ correct: opt === steps[currentStep].correct_answer || (steps[currentStep].correct_index !== undefined && oi === steps[currentStep].correct_index) }"
                    >
                      {{ typeof opt === 'string' ? opt : opt.text || opt.label || JSON.stringify(opt) }}
                    </div>
                  </div>
                </template>

                <!-- True/False -->
                <template v-else-if="steps[currentStep].type === 'true_false'">
                  <p class="preview-question">{{ steps[currentStep].statement }}</p>
                  <div class="preview-options">
                    <div class="preview-option" :class="{ correct: steps[currentStep].isTrue }">True</div>
                    <div class="preview-option" :class="{ correct: !steps[currentStep].isTrue }">False</div>
                  </div>
                </template>

                <!-- Fill Blank -->
                <template v-else-if="steps[currentStep].type === 'fill_blank'">
                  <p class="preview-question">{{ steps[currentStep].sentence_before }} ___ {{ steps[currentStep].sentence_after }}</p>
                  <div class="preview-options">
                    <div v-for="(opt, oi) in (steps[currentStep].options || [])" :key="oi" class="preview-option">
                      {{ typeof opt === 'string' ? opt : opt.text || '' }}
                    </div>
                  </div>
                </template>

                <!-- Explanation -->
                <template v-else-if="steps[currentStep].type === 'explanation'">
                  <h2 class="preview-heading">{{ steps[currentStep].title }}</h2>
                  <p class="preview-body">{{ steps[currentStep].body }}</p>
                </template>

                <!-- XP Award -->
                <template v-else-if="steps[currentStep].type === 'xp-award' || steps[currentStep].type === 'xp_award'">
                  <div class="preview-xp">
                    <span class="xp-number">+{{ steps[currentStep].xp || 0 }}</span>
                    <span class="xp-label">XP</span>
                  </div>
                </template>

                <!-- Fallback: show raw JSON -->
                <template v-else>
                  <pre class="preview-json">{{ JSON.stringify(steps[currentStep], null, 2) }}</pre>
                </template>
              </template>
            </div>
          </div>
          <div class="phone-nav">
            <button class="nav-btn" :disabled="currentStep === 0" @click="currentStep--">&larr;</button>
            <button class="nav-btn" :disabled="currentStep >= steps.length - 1" @click="currentStep++">Continue &rarr;</button>
          </div>
        </div>
      </div>

      <!-- Article block preview -->
      <div v-if="contentType === 'articles' && blocks.length > 0" class="preview-panel">
        <div class="preview-header">
          <h3 class="preview-title">Article Preview</h3>
          <span class="step-counter">{{ blocks.length }} blocks</span>
        </div>
        <div class="phone-frame">
          <div class="phone-content article-preview">
            <div class="article-header">
              <span v-if="item?.category" class="article-category">{{ item.category }}</span>
              <h2 class="article-title-preview">{{ item?.title || 'Untitled' }}</h2>
              <span v-if="item?.type" class="article-type-badge">{{ item.type }}</span>
            </div>
            <div v-for="(block, i) in blocks" :key="i" class="article-block">
              <template v-if="block.type === 'heading'">
                <h3 class="ab-heading">{{ block.text }}</h3>
              </template>
              <template v-else-if="block.type === 'text'">
                <p class="ab-text">{{ block.text }}</p>
              </template>
              <template v-else-if="block.type === 'quote'">
                <blockquote class="ab-quote">"{{ block.text }}"</blockquote>
              </template>
              <template v-else-if="block.type === 'image'">
                <div class="ab-image">
                  <div class="ab-image-placeholder">Image: {{ block.alt || block.url || '' }}</div>
                  <span v-if="block.caption" class="ab-image-caption">{{ block.caption }}</span>
                </div>
              </template>
              <template v-else-if="block.type === 'scripture'">
                <div class="ab-scripture">
                  <p class="ab-scripture-text">"{{ block.text }}"</p>
                  <span class="ab-scripture-ref">{{ block.reference }}</span>
                </div>
              </template>
              <template v-else-if="block.type === 'callout'">
                <div class="ab-callout">{{ block.text }}</div>
              </template>
              <template v-else-if="block.type === 'list'">
                <ul class="ab-list">
                  <li v-for="(li, li_i) in (block.items || [])" :key="li_i">{{ li }}</li>
                </ul>
              </template>
              <template v-else>
                <div class="ab-generic">[{{ block.type }}] {{ block.text || '' }}</div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const contentType = computed(() => route.params.type as string)
const contentId = computed(() => route.params.id as string)
const singularType = computed(() => {
  const t = contentType.value
  return t?.endsWith('s') ? t.slice(0, -1) : t
})

const loading = ref(true)
const saving = ref(false)
const saveMessage = ref('')
const saveError = ref(false)
const item = ref<any>(null)
const editableFields = reactive<Record<string, any>>({})
const steps = ref<any[]>([])
const blocks = ref<any[]>([])
const currentStep = ref(0)

function formatLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function isLongText(value: any): boolean {
  return typeof value === 'string' && value.length > 100
}

onMounted(async () => {
  try {
    const res = await fetch(`/api/content/${contentType.value}/${contentId.value}`)
    if (res.ok) {
      const json = await res.json()
      const row = json.data ?? json
      item.value = row

      // Extract lesson steps
      if (contentType.value === 'lessons' && row.content) {
        const content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content
        steps.value = Array.isArray(content) ? content : (content.steps || [])
      }

      // Extract article blocks
      if (contentType.value === 'articles' && row.body) {
        const body = typeof row.body === 'string' ? JSON.parse(row.body) : row.body
        blocks.value = Array.isArray(body) ? body : []
      }

      // Populate editable fields (exclude complex nested objects)
      for (const [key, val] of Object.entries(row)) {
        if (['id', 'content', 'body', 'steps'].includes(key)) continue
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) continue
        if (Array.isArray(val)) continue
        editableFields[key] = val
      }
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
})

async function handleSave() {
  saving.value = true
  saveMessage.value = ''
  saveError.value = false

  try {
    const res = await fetch(`/api/content/${contentType.value}/${contentId.value}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editableFields),
    })

    if (res.ok) {
      saveMessage.value = 'Saved successfully.'
    } else {
      saveError.value = true
      saveMessage.value = 'Failed to save.'
    }
  } catch {
    saveError.value = true
    saveMessage.value = 'Network error.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.content-edit {
  max-width: 1100px;
}

.edit-layout {
  display: grid;
  grid-template-columns: 1fr 375px;
  gap: 32px;
  align-items: start;
}

@media (max-width: 900px) {
  .edit-layout { grid-template-columns: 1fr; }
}

.back-link {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text-3);
  text-decoration: none;
  transition: color 0.15s;
}
.back-link:hover { color: var(--gold-light); }

.page-title {
  font-family: var(--serif);
  font-size: 24px;
  color: var(--text);
  font-weight: 700;
  margin: 12px 0 24px;
}

.loading-text {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text-3);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-family: var(--sans);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-3);
}

.field input,
.field textarea,
.field select {
  font-family: var(--sans);
  font-size: 14px;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--raised);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  border-color: var(--gold);
}

.field textarea { resize: vertical; }
.field select { cursor: pointer; }

.form-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
}

.btn-gold {
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  padding: 10px 24px;
  border-radius: 6px;
  border: none;
  background: var(--gold);
  color: var(--bg);
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-gold:hover { opacity: 0.9; }
.btn-gold:disabled { opacity: 0.5; cursor: not-allowed; }

.save-message { font-family: var(--sans); font-size: 13px; }
.save-message.success { color: #34C759; }
.save-message.error { color: var(--streak); }

/* ─── Preview Panel ─── */
.preview-panel {
  position: sticky;
  top: 32px;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.preview-title {
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
  margin: 0;
}

.step-counter {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--text-3);
}

/* ─── Phone Frame ─── */
.phone-frame {
  background: var(--bg);
  border: 1px solid #222;
  border-radius: 28px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.phone-status {
  padding: 16px 20px 8px;
  text-align: center;
}

.step-progress {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--text-3);
}

.phone-content {
  padding: 16px 20px;
  min-height: 360px;
  display: flex;
  flex-direction: column;
}

.step-type-badge {
  font-family: var(--sans);
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--gold-light);
  margin-bottom: 16px;
}

.step-preview-content {
  flex: 1;
}

.preview-heading {
  font-family: var(--serif);
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.3;
  margin: 0 0 12px;
}

.preview-body {
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.65;
  color: var(--text-2);
  margin: 0;
}

.preview-source {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text-3);
  margin-top: 12px;
  font-style: italic;
}

.preview-quote {
  font-family: var(--serif);
  font-size: 18px;
  line-height: 1.5;
  color: var(--text);
  border-left: 2px solid var(--gold);
  padding-left: 16px;
  margin: 0;
}

.preview-question {
  font-family: var(--serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.35;
  margin: 0 0 16px;
}

.preview-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-option {
  font-family: var(--sans);
  font-size: 14px;
  color: var(--text-2);
  padding: 12px 14px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--surface);
}

.preview-option.correct {
  border-color: #34C759;
  color: #34C759;
}

.preview-xp {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.xp-number {
  font-family: var(--sans);
  font-size: 48px;
  font-weight: 700;
  color: var(--gold-light);
}

.xp-label {
  font-family: var(--sans);
  font-size: 14px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.preview-json {
  font-family: monospace;
  font-size: 11px;
  color: var(--text-3);
  background: var(--surface);
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.phone-nav {
  display: flex;
  gap: 8px;
  padding: 12px 20px 20px;
}

.nav-btn {
  flex: 1;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 500;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.15s;
}

.nav-btn:hover:not(:disabled) {
  border-color: var(--gold);
  color: var(--text);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* ─── Article Preview ─── */
.article-preview {
  min-height: auto;
  max-height: 600px;
  overflow-y: auto;
}

.article-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
}

.article-category {
  font-family: var(--sans);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--gold-light);
  margin-bottom: 8px;
  display: block;
}

.article-title-preview {
  font-family: var(--serif);
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.25;
  margin: 0 0 8px;
}

.article-type-badge {
  font-family: var(--sans);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-3);
  background: var(--surface);
  padding: 3px 8px;
  border-radius: 4px;
}

.article-block { margin-bottom: 16px; }

.ab-heading {
  font-family: var(--serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.ab-text {
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-2);
  margin: 0;
}

.ab-quote {
  font-family: var(--serif);
  font-size: 15px;
  line-height: 1.5;
  color: var(--text);
  border-left: 2px solid var(--gold);
  padding-left: 14px;
  margin: 0;
}

.ab-image {
  text-align: center;
}

.ab-image-placeholder {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text-3);
  background: var(--surface);
  border: 1px dashed var(--line);
  border-radius: 8px;
  padding: 32px 16px;
}

.ab-image-caption {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--text-3);
  margin-top: 6px;
  display: block;
  font-style: italic;
}

.ab-scripture {
  background: var(--surface);
  border-radius: 6px;
  padding: 14px;
}

.ab-scripture-text {
  font-family: var(--serif);
  font-size: 14px;
  line-height: 1.5;
  color: var(--text);
  margin: 0 0 6px;
}

.ab-scripture-ref {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--gold-light);
}

.ab-callout {
  font-family: var(--sans);
  font-size: 13px;
  line-height: 1.6;
  color: var(--text);
  background: var(--raised);
  border-left: 2px solid var(--gold);
  padding: 12px 14px;
  border-radius: 0 6px 6px 0;
}

.ab-list {
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-2);
  margin: 0;
  padding-left: 20px;
}

.ab-list li {
  margin-bottom: 4px;
}

.ab-generic {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text-3);
  padding: 8px;
  border: 1px dashed var(--line);
  border-radius: 4px;
}
</style>
