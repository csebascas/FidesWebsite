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
            <div class="step-preview-content" v-if="steps[currentStep]">
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

              <!-- True/False -->
              <template v-else-if="steps[currentStep].type === 'truefalse'">
                <p class="preview-question">{{ steps[currentStep].statement }}</p>
                <div class="preview-options">
                  <div class="preview-option" :class="{ correct: steps[currentStep].isTrue }">True</div>
                  <div class="preview-option" :class="{ correct: !steps[currentStep].isTrue }">False</div>
                </div>
                <p v-if="steps[currentStep].explanation" class="preview-explanation">{{ steps[currentStep].explanation }}</p>
              </template>

              <!-- Question / Scenario / Doctrine-Life -->
              <template v-else-if="steps[currentStep].type === 'question' || steps[currentStep].type === 'scenario' || steps[currentStep].type === 'doctrine-life'">
                <p v-if="steps[currentStep].scenario" class="preview-body scenario-text">{{ steps[currentStep].scenario }}</p>
                <p class="preview-question">{{ steps[currentStep].question || steps[currentStep].prompt }}</p>
                <div class="preview-options">
                  <div
                    v-for="(opt, oi) in (steps[currentStep].options || [])"
                    :key="oi"
                    class="preview-option"
                    :class="{ correct: opt.isCorrect || opt === steps[currentStep].correct_answer || (steps[currentStep].correct_index !== undefined && oi === steps[currentStep].correct_index) }"
                  >
                    {{ typeof opt === 'string' ? opt : opt.text || opt.label || '' }}
                  </div>
                </div>
                <p v-if="steps[currentStep].explanation" class="preview-explanation">{{ steps[currentStep].explanation }}</p>
              </template>

              <!-- Before-After -->
              <template v-else-if="steps[currentStep].type === 'before-after'">
                <div class="before-after-card wrong">
                  <span class="ba-label">{{ steps[currentStep].misconceptionLabel || 'Misconception' }}</span>
                  <p class="ba-text">{{ steps[currentStep].misconception }}</p>
                </div>
                <div class="before-after-card right">
                  <span class="ba-label">{{ steps[currentStep].truthLabel || 'Truth' }}</span>
                  <p class="ba-text">{{ steps[currentStep].truth }}</p>
                </div>
              </template>

              <!-- Match -->
              <template v-else-if="steps[currentStep].type === 'match' || steps[currentStep].type === 'quotematch'">
                <p v-if="steps[currentStep].instruction" class="preview-body">{{ steps[currentStep].instruction }}</p>
                <div v-for="pair in (steps[currentStep].pairs || [])" :key="pair.id" class="match-pair">
                  <div class="match-left">{{ pair.left || pair.quote }}</div>
                  <div class="match-right">{{ pair.right || pair.match }}</div>
                </div>
                <p v-if="steps[currentStep].explanation" class="preview-explanation">{{ steps[currentStep].explanation }}</p>
              </template>

              <!-- Stat -->
              <template v-else-if="steps[currentStep].type === 'stat'">
                <div class="stat-display">
                  <span class="stat-value">{{ steps[currentStep].stat }}</span>
                  <span class="stat-label-text">{{ steps[currentStep].label }}</span>
                </div>
                <p class="preview-body">{{ steps[currentStep].body }}</p>
                <p v-if="steps[currentStep].source" class="preview-source">— {{ steps[currentStep].source }}</p>
              </template>

              <!-- Scripture -->
              <template v-else-if="steps[currentStep].type === 'scripture'">
                <p class="scripture-ref">{{ steps[currentStep].reference }}</p>
                <div v-for="(v, vi) in (steps[currentStep].verses || [])" :key="vi" class="scripture-verse">
                  <span class="verse-num">{{ v.number }}</span>
                  <span class="verse-text">{{ v.text }}</span>
                  <p v-if="v.annotation" class="verse-annotation">{{ v.annotation }}</p>
                </div>
              </template>

              <!-- Vocabulary -->
              <template v-else-if="steps[currentStep].type === 'vocabulary'">
                <h2 class="preview-heading">{{ steps[currentStep].term }}</h2>
                <p class="preview-body">{{ steps[currentStep].definition }}</p>
                <p v-if="steps[currentStep].etymology" class="preview-source">{{ steps[currentStep].etymology }}</p>
                <div v-if="steps[currentStep].example" class="vocab-example">{{ steps[currentStep].example }}</div>
              </template>

              <!-- Storyboard -->
              <template v-else-if="steps[currentStep].type === 'storyboard'">
                <p v-if="steps[currentStep].eyebrow" class="step-eyebrow">{{ steps[currentStep].eyebrow }}</p>
                <div v-for="(panel, pi) in (steps[currentStep].panels || [])" :key="pi" class="storyboard-panel">
                  <h3 v-if="panel.title" class="panel-title">{{ panel.title }}</h3>
                  <p class="panel-body">{{ typeof panel === 'string' ? panel : panel.body }}</p>
                </div>
              </template>

              <!-- Interpretations -->
              <template v-else-if="steps[currentStep].type === 'interpretations'">
                <blockquote v-if="steps[currentStep].passage" class="preview-quote">"{{ steps[currentStep].passage }}"</blockquote>
                <div v-for="(view, vi) in (steps[currentStep].views || [])" :key="vi" class="interp-view">
                  <span class="interp-label">{{ view.label }}</span>
                  <p class="interp-text">{{ view.interpretation }}</p>
                </div>
              </template>

              <!-- Fill Blank -->
              <template v-else-if="steps[currentStep].type === 'fillblank'">
                <p class="preview-question">
                  <template v-for="(tok, ti) in (steps[currentStep].tokens || [])" :key="ti">
                    <span v-if="tok.isBlank" class="fill-blank">{{ tok.text }}</span>
                    <span v-else>{{ tok.text }}</span>
                  </template>
                </p>
                <div v-if="steps[currentStep].wordBank" class="preview-options">
                  <div v-for="(w, wi) in steps[currentStep].wordBank" :key="wi" class="preview-option">{{ w }}</div>
                </div>
                <p v-if="steps[currentStep].explanation" class="preview-explanation">{{ steps[currentStep].explanation }}</p>
              </template>

              <!-- Tap Word -->
              <template v-else-if="steps[currentStep].type === 'tapword'">
                <p v-if="steps[currentStep].instruction" class="preview-body">{{ steps[currentStep].instruction }}</p>
                <div class="tapword-grid">
                  <span v-for="tok in (steps[currentStep].tokens || [])" :key="tok.id" class="tapword-chip" :class="{ target: tok.isTarget }">{{ tok.text }}</span>
                </div>
                <p v-if="steps[currentStep].explanation" class="preview-explanation">{{ steps[currentStep].explanation }}</p>
              </template>

              <!-- Order / Rank -->
              <template v-else-if="steps[currentStep].type === 'order' || steps[currentStep].type === 'rank'">
                <p v-if="steps[currentStep].instruction" class="preview-body">{{ steps[currentStep].instruction }}</p>
                <div class="preview-options">
                  <div v-for="(item, ii) in (steps[currentStep].items || [])" :key="item.id || ii" class="preview-option order-item">
                    <span class="order-num">{{ ii + 1 }}</span> {{ item.text }}
                  </div>
                </div>
                <p v-if="steps[currentStep].explanation" class="preview-explanation">{{ steps[currentStep].explanation }}</p>
              </template>

              <!-- Painting -->
              <template v-else-if="steps[currentStep].type === 'painting'">
                <div v-if="steps[currentStep].artwork" class="painting-header">
                  <h2 class="preview-heading">{{ steps[currentStep].artwork.title }}</h2>
                  <p class="preview-source">{{ steps[currentStep].artwork.artist }}, {{ steps[currentStep].artwork.year }}</p>
                </div>
                <div v-for="(panel, pi) in (steps[currentStep].panels || [])" :key="pi">
                  <p class="preview-body">{{ panel }}</p>
                </div>
              </template>

              <!-- Fear-Reassurance -->
              <template v-else-if="steps[currentStep].type === 'fear-reassurance'">
                <div class="before-after-card wrong">
                  <span class="ba-label">Fear</span>
                  <p class="ba-text">{{ steps[currentStep].fear }}</p>
                </div>
                <div class="before-after-card right">
                  <span class="ba-label">Reassurance</span>
                  <p class="ba-text">{{ steps[currentStep].reassurance }}</p>
                </div>
                <p v-if="steps[currentStep].theologicalBasis" class="preview-explanation">{{ steps[currentStep].theologicalBasis }}</p>
              </template>

              <!-- Concept Map -->
              <template v-else-if="steps[currentStep].type === 'conceptmap'">
                <h2 v-if="steps[currentStep].title" class="preview-heading">{{ steps[currentStep].title }}</h2>
                <div v-for="(node, ni) in (steps[currentStep].nodes || [])" :key="ni" class="concept-node">
                  <span class="concept-label">{{ node.label }}</span>
                  <p class="concept-desc">{{ node.description }}</p>
                </div>
              </template>

              <!-- Witness -->
              <template v-else-if="steps[currentStep].type === 'witness'">
                <p class="preview-body">{{ steps[currentStep].body }}</p>
                <p class="preview-source">— {{ steps[currentStep].name }}</p>
                <p v-if="steps[currentStep].summary" class="preview-explanation">{{ steps[currentStep].summary }}</p>
              </template>

              <!-- Explanation -->
              <template v-else-if="steps[currentStep].type === 'explanation'">
                <h2 class="preview-heading">{{ steps[currentStep].title }}</h2>
                <p class="preview-body">{{ steps[currentStep].body }}</p>
              </template>

              <!-- XP Award -->
              <template v-else-if="steps[currentStep].type === 'xp-award'">
                <div class="preview-xp">
                  <span class="xp-number">+{{ steps[currentStep].xp || 0 }}</span>
                  <span class="xp-label">XP</span>
                </div>
              </template>

              <!-- Fallback -->
              <template v-else>
                <pre class="preview-json">{{ JSON.stringify(steps[currentStep], null, 2) }}</pre>
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
                <p v-if="block.attribution" class="ab-attribution">— {{ block.attribution }}</p>
              </template>
              <template v-else-if="block.type === 'bullet_list'">
                <ul class="ab-list">
                  <li v-for="(li, li_i) in (block.items || [])" :key="li_i" v-html="li"></li>
                </ul>
              </template>
              <template v-else-if="block.type === 'cross_ref'">
                <div class="ab-crossref">
                  <span class="crossref-icon">&#8594;</span>
                  <span class="crossref-term">{{ block.term }}</span>
                </div>
              </template>
              <template v-else-if="block.type === 'mention'">
                <div class="ab-mention">
                  <span class="mention-icon">&#9733;</span>
                  <span class="mention-name">{{ block.name }}</span>
                  <span v-if="block.entityType" class="mention-type">{{ block.entityType }}</span>
                </div>
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
              <template v-else>
                <div class="ab-generic">[{{ block.type }}] {{ block.text || JSON.stringify(block) }}</div>
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
import { supabase, TABLE_MAP } from '../../lib/supabase'

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
  const tableName = TABLE_MAP[contentType.value] || contentType.value
  try {
    const { data: row, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', contentId.value)
      .single()

    if (error || !row) {
      loading.value = false
      return
    }

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

  const tableName = TABLE_MAP[contentType.value] || contentType.value
  const updates = { ...editableFields }
  delete updates.id
  delete updates.created_at

  try {
    const { error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', contentId.value)

    if (error) {
      saveError.value = true
      saveMessage.value = `Failed to save: ${error.message}`
    } else {
      saveMessage.value = 'Saved successfully.'
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

.preview-explanation {
  font-family: var(--sans);
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-3);
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.scenario-text {
  margin-bottom: 14px;
  padding: 12px;
  background: var(--surface);
  border-radius: 6px;
}

/* Before-After / Fear-Reassurance */
.before-after-card {
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
}
.before-after-card.wrong { background: rgba(255, 59, 48, 0.08); }
.before-after-card.right { background: rgba(52, 199, 89, 0.08); }
.ba-label {
  font-family: var(--sans);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-3);
  display: block;
  margin-bottom: 6px;
}
.ba-text {
  font-family: var(--sans);
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
  margin: 0;
}

/* Match pairs */
.match-pair {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.match-left, .match-right {
  flex: 1;
  font-family: var(--sans);
  font-size: 12px;
  line-height: 1.5;
  padding: 10px;
  border-radius: 6px;
  color: var(--text-2);
}
.match-left { background: var(--surface); }
.match-right { background: rgba(52, 199, 89, 0.08); }

/* Stat */
.stat-display {
  text-align: center;
  margin-bottom: 14px;
}
.stat-value {
  font-family: var(--sans);
  font-size: 36px;
  font-weight: 700;
  color: var(--gold-light);
  display: block;
}
.stat-label-text {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Scripture */
.scripture-ref {
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 600;
  color: var(--gold-light);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px;
}
.scripture-verse { margin-bottom: 8px; }
.verse-num {
  font-family: var(--sans);
  font-size: 10px;
  font-weight: 700;
  color: var(--gold-light);
  vertical-align: super;
  margin-right: 4px;
}
.verse-text {
  font-family: var(--serif);
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
}
.verse-annotation {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text-3);
  font-style: italic;
  margin: 4px 0 0;
  padding-left: 14px;
}

/* Vocabulary */
.vocab-example {
  font-family: var(--sans);
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-2);
  background: var(--surface);
  padding: 10px;
  border-radius: 6px;
  margin-top: 10px;
}

/* Storyboard */
.step-eyebrow {
  font-family: var(--sans);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--gold-light);
  margin: 0 0 12px;
}
.storyboard-panel {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
}
.storyboard-panel:last-child { border-bottom: none; }
.panel-title {
  font-family: var(--serif);
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 6px;
}
.panel-body {
  font-family: var(--sans);
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
  margin: 0;
}

/* Interpretations */
.interp-view {
  margin-bottom: 10px;
  padding: 10px;
  background: var(--surface);
  border-radius: 6px;
}
.interp-label {
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 600;
  color: var(--gold-light);
  display: block;
  margin-bottom: 4px;
}
.interp-text {
  font-family: var(--sans);
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-2);
  margin: 0;
}

/* Fill blank */
.fill-blank {
  background: var(--gold);
  color: var(--bg);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

/* Tap word */
.tapword-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.tapword-chip {
  font-family: var(--sans);
  font-size: 13px;
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text-2);
}
.tapword-chip.target {
  border-color: #34C759;
  color: #34C759;
}

/* Order items */
.order-item { display: flex; align-items: baseline; gap: 8px; }
.order-num {
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 700;
  color: var(--gold-light);
  flex-shrink: 0;
}

/* Concept map */
.concept-node {
  padding: 10px;
  background: var(--surface);
  border-radius: 6px;
  margin-bottom: 8px;
}
.concept-label {
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  display: block;
  margin-bottom: 4px;
}
.concept-desc {
  font-family: var(--sans);
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-3);
  margin: 0;
}

/* Article: cross_ref, mention */
.ab-crossref {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--surface);
  border-radius: 6px;
  border-left: 2px solid var(--gold);
}
.crossref-icon {
  color: var(--gold-light);
  font-size: 14px;
}
.crossref-term {
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 500;
  color: var(--gold-light);
}

.ab-mention {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--raised);
  border-radius: 6px;
}
.mention-icon {
  color: var(--gold-light);
  font-size: 12px;
}
.mention-name {
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}
.mention-type {
  font-family: var(--sans);
  font-size: 10px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ab-attribution {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--text-3);
  margin-top: 6px;
  font-style: italic;
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
