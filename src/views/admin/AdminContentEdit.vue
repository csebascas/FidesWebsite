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
          <button type="button" class="btn-danger-sm" @click="showDeleteConfirm = true">Delete</button>
          <span v-if="saveMessage" class="save-message" :class="saveError ? 'error' : 'success'">
            {{ saveMessage }}
          </span>
        </div>
      </form>

      <!-- Delete confirmation -->
      <div v-if="showDeleteConfirm" class="modal-overlay" @click="showDeleteConfirm = false">
        <div class="modal" @click.stop>
          <h3 class="modal-title">Delete {{ singularType }}?</h3>
          <p class="modal-body">This will permanently delete <strong>{{ item?.title || item?.name || item?.term || 'this item' }}</strong>. This cannot be undone.</p>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showDeleteConfirm = false">Cancel</button>
            <button class="btn-danger" @click="handleDelete" :disabled="deleting">{{ deleting ? 'Deleting...' : 'Delete' }}</button>
          </div>
        </div>
      </div>

      <!-- Lesson step editor -->
      <div v-if="contentType === 'lessons'" class="editor-section">
        <h3 class="editor-title">Lesson Steps <span class="editor-count">{{ steps.length }} steps</span></h3>
        <StepEditor v-model="steps" @selectStep="currentStep = $event" />
        <button class="btn-gold save-content-btn" @click="saveContent" :disabled="savingContent">
          {{ savingContent ? 'Saving steps...' : 'Save Steps' }}
        </button>
        <span v-if="contentSaveMsg" class="save-message" :class="contentSaveErr ? 'error' : 'success'">{{ contentSaveMsg }}</span>
      </div>

      <!-- Article block editor -->
      <div v-if="contentType === 'articles'" class="editor-section">
        <h3 class="editor-title">Article Body <span class="editor-count">{{ blocks.length }} blocks</span></h3>
        <BlockEditor v-model="blocks" />
        <button class="btn-gold save-content-btn" @click="saveBody" :disabled="savingContent">
          {{ savingContent ? 'Saving body...' : 'Save Body' }}
        </button>
        <span v-if="contentSaveMsg" class="save-message" :class="contentSaveErr ? 'error' : 'success'">{{ contentSaveMsg }}</span>
      </div>

      <!-- Lesson step preview -->
      <div v-if="contentType === 'lessons' && steps.length > 0" class="preview-panel">
        <div class="preview-header">
          <h3 class="preview-title">Lesson Preview</h3>
          <span class="step-counter">{{ steps.length }} steps</span>
        </div>

        <div class="phone-frame">
          <div class="phone-top">
            <span class="phone-x">&times;</span>
            <div class="phone-track"><div class="phone-fill" :style="{ width: (((currentStep + 1) / steps.length) * 100) + '%' }"></div></div>
          </div>
          <div class="phone-content" v-if="step">
            <div class="step-type-badge">{{ stepType }}</div>
            <div class="step-preview-content">
              <div v-if="stepType === 'concept'">
                <h2 class="preview-heading">{{ step.title }}</h2>
                <p class="preview-body">{{ step.body }}</p>
                <p v-if="step.source" class="preview-source">— {{ step.source }}</p>
              </div>
              <div v-else-if="stepType === 'quote'">
                <blockquote class="preview-quote">"{{ step.quote || step.text }}"</blockquote>
                <p class="preview-source">— {{ step.attribution }}</p>
              </div>
              <div v-else-if="stepType === 'truefalse'">
                <p class="preview-question">{{ step.statement }}</p>
                <div class="preview-options">
                  <div class="preview-option" :class="{ correct: step.isTrue }">True</div>
                  <div class="preview-option" :class="{ correct: !step.isTrue }">False</div>
                </div>
                <p v-if="step.explanation" class="preview-explanation">{{ step.explanation }}</p>
              </div>
              <div v-else-if="stepType === 'question' || stepType === 'scenario' || stepType === 'doctrine-life'">
                <p v-if="step.scenario" class="preview-body scenario-text">{{ step.scenario }}</p>
                <p class="preview-question">{{ step.question || step.prompt }}</p>
                <div class="preview-options">
                  <div v-for="(opt, oi) in (step.options || [])" :key="oi" class="preview-option" :class="{ correct: opt.isCorrect }">
                    {{ typeof opt === 'string' ? opt : opt.text || '' }}
                  </div>
                </div>
                <p v-if="step.explanation" class="preview-explanation">{{ step.explanation }}</p>
              </div>
              <div v-else-if="stepType === 'before-after'">
                <div class="before-after-card wrong">
                  <span class="ba-label">{{ step.misconceptionLabel || 'Misconception' }}</span>
                  <p class="ba-text">{{ step.misconception }}</p>
                </div>
                <div class="before-after-card right">
                  <span class="ba-label">{{ step.truthLabel || 'Truth' }}</span>
                  <p class="ba-text">{{ step.truth }}</p>
                </div>
              </div>
              <div v-else-if="stepType === 'match' || stepType === 'quotematch'">
                <p v-if="step.instruction" class="preview-body">{{ step.instruction }}</p>
                <div v-for="pair in (step.pairs || [])" :key="pair.id" class="match-pair">
                  <div class="match-left">{{ pair.left || pair.quote }}</div>
                  <div class="match-right">{{ pair.right || pair.match }}</div>
                </div>
                <p v-if="step.explanation" class="preview-explanation">{{ step.explanation }}</p>
              </div>
              <div v-else-if="stepType === 'stat'">
                <div class="stat-display">
                  <span class="stat-value">{{ step.stat }}</span>
                  <span class="stat-label-text">{{ step.label }}</span>
                </div>
                <p class="preview-body">{{ step.body }}</p>
                <p v-if="step.source" class="preview-source">— {{ step.source }}</p>
              </div>
              <div v-else-if="stepType === 'scripture'">
                <p class="scripture-ref">{{ step.reference }}</p>
                <div v-for="(v, vi) in (step.verses || [])" :key="vi" class="scripture-verse">
                  <span class="verse-num">{{ v.number }}</span>
                  <span class="verse-text">{{ v.text }}</span>
                  <p v-if="v.annotation" class="verse-annotation">{{ v.annotation }}</p>
                </div>
              </div>
              <div v-else-if="stepType === 'vocabulary'">
                <h2 class="preview-heading">{{ step.term }}</h2>
                <p class="preview-body">{{ step.definition }}</p>
                <p v-if="step.etymology" class="preview-source">{{ step.etymology }}</p>
                <div v-if="step.context" class="vocab-example">{{ step.context }}</div>
                <div v-if="step.example" class="vocab-example">{{ step.example }}</div>
              </div>
              <div v-else-if="stepType === 'storyboard'">
                <p v-if="step.eyebrow" class="step-eyebrow">{{ step.eyebrow }}</p>
                <div v-for="(panel, pi) in (step.panels || [])" :key="pi" class="storyboard-panel">
                  <h3 v-if="panel.title" class="panel-title">{{ panel.title }}</h3>
                  <p class="panel-body">{{ typeof panel === 'string' ? panel : panel.body }}</p>
                </div>
              </div>
              <div v-else-if="stepType === 'interpretations'">
                <blockquote v-if="step.passage" class="preview-quote">"{{ step.passage }}"</blockquote>
                <div v-for="(view, vi) in (step.views || [])" :key="vi" class="interp-view">
                  <span class="interp-label">{{ view.label }}</span>
                  <p class="interp-text">{{ view.interpretation }}</p>
                </div>
              </div>
              <div v-else-if="stepType === 'fillblank'">
                <p class="preview-question">
                  <template v-for="(tok, ti) in (step.tokens || [])" :key="ti">
                    <span v-if="tok.isBlank" class="fill-blank">{{ tok.text }}</span>
                    <span v-else>{{ tok.text }}</span>
                  </template>
                </p>
                <div v-if="step.wordBank" class="preview-options">
                  <div v-for="(w, wi) in step.wordBank" :key="wi" class="preview-option">{{ w }}</div>
                </div>
                <p v-if="step.explanation" class="preview-explanation">{{ step.explanation }}</p>
              </div>
              <div v-else-if="stepType === 'tapword'">
                <p v-if="step.instruction" class="preview-body">{{ step.instruction }}</p>
                <div class="tapword-grid">
                  <span v-for="tok in (step.tokens || [])" :key="tok.id" class="tapword-chip" :class="{ target: tok.isTarget }">{{ tok.text }}</span>
                </div>
                <p v-if="step.explanation" class="preview-explanation">{{ step.explanation }}</p>
              </div>
              <div v-else-if="stepType === 'order' || stepType === 'rank'">
                <p v-if="step.instruction" class="preview-body">{{ step.instruction }}</p>
                <div class="preview-options">
                  <div v-for="(itm, ii) in (step.items || [])" :key="itm.id || ii" class="preview-option order-item">
                    <span class="order-num">{{ Number(ii) + 1 }}</span> {{ itm.text }}
                  </div>
                </div>
                <p v-if="step.explanation" class="preview-explanation">{{ step.explanation }}</p>
              </div>
              <div v-else-if="stepType === 'painting'">
                <div v-if="step.artwork" class="painting-header">
                  <h2 class="preview-heading">{{ step.artwork.title }}</h2>
                  <p class="preview-source">{{ step.artwork.artist }}, {{ step.artwork.year }}</p>
                  <img v-if="step.artwork.image_url" :src="step.artwork.image_url" :alt="step.artwork.title" class="painting-img" />
                  <p v-if="step.artwork.caption" class="preview-source">{{ step.artwork.caption }}</p>
                </div>
                <div v-for="(panel, pi) in (step.panels || [])" :key="pi">
                  <p class="preview-body">{{ panel }}</p>
                </div>
              </div>
              <div v-else-if="stepType === 'fear-reassurance'">
                <div class="before-after-card wrong">
                  <span class="ba-label">Fear</span>
                  <p class="ba-text">{{ step.fear }}</p>
                </div>
                <div class="before-after-card right">
                  <span class="ba-label">Reassurance</span>
                  <p class="ba-text">{{ step.reassurance }}</p>
                </div>
                <p v-if="step.theologicalBasis" class="preview-explanation">{{ step.theologicalBasis }}</p>
              </div>
              <div v-else-if="stepType === 'conceptmap'">
                <h2 v-if="step.title" class="preview-heading">{{ step.title }}</h2>
                <div v-for="(node, ni) in (step.nodes || [])" :key="ni" class="concept-node">
                  <span class="concept-label">{{ node.label }}</span>
                  <p class="concept-desc">{{ node.description }}</p>
                </div>
              </div>
              <div v-else-if="stepType === 'witness'">
                <p class="preview-body">{{ step.body }}</p>
                <p class="preview-source">— {{ step.name }}</p>
                <p v-if="step.summary" class="preview-explanation">{{ step.summary }}</p>
              </div>
              <div v-else-if="stepType === 'explanation'">
                <div class="step-eyebrow">{{ step.title || 'The key idea' }}</div>
                <p class="exp-lead">{{ step.body }}</p>
                <div v-if="step.quote" class="exp-pullquote">
                  <div class="exp-q">"{{ step.quote }}"</div>
                  <div v-if="step.attribution" class="exp-a">{{ step.attribution }}</div>
                </div>
              </div>
              <div v-else-if="stepType === 'xp-award'">
                <div class="preview-xp">
                  <span class="xp-number">+{{ step.xp || 0 }}</span>
                  <span class="xp-label">XP</span>
                </div>
              </div>
              <pre v-else class="preview-json">{{ JSON.stringify(step, null, 2) }}</pre>
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
              <h3 v-if="block.type === 'heading'" class="ab-heading">{{ block.text }}</h3>
              <p v-else-if="block.type === 'text'" class="ab-text">{{ block.text }}</p>
              <div v-else-if="block.type === 'quote'">
                <blockquote class="ab-quote">"{{ block.text }}"</blockquote>
                <p v-if="block.attribution" class="ab-attribution">— {{ block.attribution }}</p>
              </div>
              <ul v-else-if="block.type === 'bullet_list'" class="ab-list">
                <li v-for="(li, li_i) in (block.items || [])" :key="li_i" v-html="li"></li>
              </ul>
              <div v-else-if="block.type === 'cross_ref'" class="ab-crossref">
                <span class="crossref-icon">&#8594;</span>
                <span class="crossref-term">{{ block.term }}</span>
              </div>
              <div v-else-if="block.type === 'mention'" class="ab-mention">
                <span class="mention-icon">&#9733;</span>
                <span class="mention-name">{{ block.name }}</span>
                <span v-if="block.entityType" class="mention-type">{{ block.entityType }}</span>
              </div>
              <div v-else-if="block.type === 'image'" class="ab-image">
                <img v-if="block.url" :src="block.url" :alt="block.alt || ''" class="ab-img" />
                <div v-else class="ab-image-placeholder">Image: {{ block.alt || '' }}</div>
                <span v-if="block.caption" class="ab-image-caption">{{ block.caption }}</span>
              </div>
              <div v-else-if="block.type === 'scripture'" class="ab-scripture">
                <p class="ab-scripture-text">"{{ block.text }}"</p>
                <span class="ab-scripture-ref">{{ block.reference }}</span>
              </div>
              <div v-else-if="block.type === 'callout'" class="ab-callout">{{ block.text }}</div>
              <div v-else class="ab-generic">[{{ block.type }}] {{ block.text || JSON.stringify(block) }}</div>
            </div>
          </div>
        </div>
      </div>
      <!-- Saint preview -->
      <div v-if="contentType === 'saints' && item" class="preview-panel">
        <div class="preview-header">
          <h3 class="preview-title">Saint Preview</h3>
        </div>
        <div class="phone-frame">
          <div class="phone-content saint-preview">
            <div class="saint-rarity" :class="item.rarity || 'common'">{{ item.rarity || 'common' }}</div>
            <h2 class="saint-name">{{ item.name }}</h2>
            <p v-if="item.title" class="saint-title-text">{{ item.title }}</p>

            <div v-if="item.feast_day || item.feast_month" class="saint-meta">
              <span class="saint-meta-label">Feast Day</span>
              <span class="saint-meta-value">{{ item.feast_day || `${item.feast_month}/${item.feast_day_number || '?'}` }}</span>
            </div>
            <div v-if="item.born || item.died" class="saint-meta">
              <span class="saint-meta-label">Lived</span>
              <span class="saint-meta-value">{{ item.born || '?' }} – {{ item.died || '?' }}</span>
            </div>
            <div v-if="item.origin" class="saint-meta">
              <span class="saint-meta-label">Origin</span>
              <span class="saint-meta-value">{{ item.origin }}</span>
            </div>
            <div v-if="item.patronage" class="saint-meta">
              <span class="saint-meta-label">Patron of</span>
              <span class="saint-meta-value">{{ item.patronage }}</span>
            </div>
            <div v-if="item.unlock_method" class="saint-meta">
              <span class="saint-meta-label">Unlock</span>
              <span class="saint-meta-value">{{ item.unlock_method }}{{ item.unlock_description ? ` — ${item.unlock_description}` : '' }}</span>
            </div>

            <p v-if="item.short_bio" class="saint-bio">{{ item.short_bio }}</p>

            <blockquote v-if="item.quote" class="saint-quote">
              "{{ item.quote }}"
              <span v-if="item.quote_source" class="saint-quote-src">— {{ item.quote_source }}</span>
            </blockquote>

            <div v-if="item.known_for && item.known_for.length" class="saint-known">
              <span class="saint-meta-label">Known for</span>
              <div class="saint-tags">
                <span v-for="(tag, ti) in item.known_for" :key="ti" class="saint-tag">{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Entry (reference) preview -->
      <div v-if="contentType === 'entries' && item" class="preview-panel">
        <div class="preview-header">
          <h3 class="preview-title">Entry Preview</h3>
        </div>
        <div class="phone-frame">
          <div class="phone-content entry-preview">
            <div class="entry-type-badge">{{ item.type || 'doctrine' }}</div>
            <h2 class="entry-term">{{ item.term }}</h2>
            <span v-if="item.category" class="entry-category">{{ item.category }}</span>

            <p class="entry-definition">{{ item.definition }}</p>

            <div v-if="item.ccc_ref" class="entry-ref">
              <span class="entry-ref-label">CCC</span>
              <span class="entry-ref-value">{{ item.ccc_ref }}</span>
            </div>

            <div v-if="item.key_scripture_text" class="ab-scripture">
              <p class="ab-scripture-text">"{{ item.key_scripture_text }}"</p>
              <span v-if="item.key_scripture_ref" class="ab-scripture-ref">{{ item.key_scripture_ref }}</span>
            </div>

            <div v-if="item.related_terms && item.related_terms.length" class="entry-related">
              <span class="saint-meta-label">Related</span>
              <div class="saint-tags">
                <span v-for="(rt, rti) in item.related_terms" :key="rti" class="saint-tag">{{ rt }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminRpc } from '../../lib/supabase'
import StepEditor from '../../components/StepEditor.vue'
import BlockEditor from '../../components/BlockEditor.vue'

const route = useRoute()
const router = useRouter()

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
const step = computed(() => steps.value[currentStep.value] || null)
const stepType = computed(() => step.value?.type || '')

function formatLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function isLongText(value: any): boolean {
  return typeof value === 'string' && value.length > 100
}

onMounted(async () => {
  try {
    // Use adminRpc to bypass RLS (e.g. active=false lessons, unpublished articles)
    const result = await adminRpc({
      action: 'select', table: contentType.value,
      match: { id: contentId.value }, limit: 1,
    })
    const row = result.data?.[0]

    if (!row) {
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

  const updates = { ...editableFields }
  delete updates.id
  delete updates.created_at

  const { error } = await adminRpc({ action: 'update', table: contentType.value, id: contentId.value, data: updates })
  if (error) {
    saveError.value = true
    saveMessage.value = `Failed to save: ${error}`
  } else {
    saveMessage.value = 'Saved successfully.'
  }
  saving.value = false
}

const showDeleteConfirm = ref(false)
const deleting = ref(false)

async function handleDelete() {
  deleting.value = true
  const { error } = await adminRpc({ action: 'delete', table: contentType.value, id: contentId.value })
  if (error) {
    saveMessage.value = `Delete failed: ${error}`
    saveError.value = true
  } else {
    router.push(`/d/content/${contentType.value}`)
  }
  deleting.value = false
  showDeleteConfirm.value = false
}

const savingContent = ref(false)
const contentSaveMsg = ref('')
const contentSaveErr = ref(false)

async function saveContent() {
  savingContent.value = true
  contentSaveMsg.value = ''
  contentSaveErr.value = false
  const { error } = await adminRpc({ action: 'update', table: 'lessons', id: contentId.value, data: { content: steps.value } })
  if (error) { contentSaveErr.value = true; contentSaveMsg.value = `Failed: ${error}` }
  else { contentSaveMsg.value = 'Steps saved.' }
  savingContent.value = false
}

async function saveBody() {
  savingContent.value = true
  contentSaveMsg.value = ''
  contentSaveErr.value = false
  const { error } = await adminRpc({ action: 'update', table: 'articles', id: contentId.value, data: { body: blocks.value } })
  if (error) { contentSaveErr.value = true; contentSaveMsg.value = `Failed: ${error}` }
  else { contentSaveMsg.value = 'Body saved.' }
  savingContent.value = false
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

.editor-section {
  grid-column: 1;
  margin-top: 24px;
}
.editor-title {
  font-family: var(--sans); font-size: 14px; font-weight: 600; color: var(--text-2); margin: 0 0 12px;
  display: flex; align-items: center; gap: 8px;
}
.editor-count { font-weight: 400; font-size: 12px; color: var(--text-3); }
.btn-danger-sm {
  font-family: var(--sans); font-size: 13px; font-weight: 600; padding: 10px 20px;
  border-radius: 6px; border: 1px solid rgba(255, 59, 48, 0.3); background: none;
  color: #FF3B30; cursor: pointer; transition: all 0.15s;
}
.btn-danger-sm:hover { background: rgba(255, 59, 48, 0.08); }
.btn-danger { font-family: var(--sans); font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 6px; border: none; background: #FF3B30; color: white; cursor: pointer; }
.btn-danger:disabled { opacity: 0.5; }
.btn-cancel { font-family: var(--sans); font-size: 13px; padding: 10px 20px; border-radius: 6px; border: 1px solid var(--line); background: var(--raised); color: var(--text-2); cursor: pointer; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; display: flex; align-items: center; justify-content: center; }
.modal { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; }
.modal-title { font-family: var(--serif); font-size: 18px; color: var(--text); margin: 0 0 12px; }
.modal-body { font-family: var(--sans); font-size: 14px; color: var(--text-2); line-height: 1.6; margin: 0 0 20px; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; }

.save-content-btn { margin-top: 12px; }
.save-content-btn + .save-message { margin-left: 12px; }

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
/* Preview — matched to lesson-slides-mockup-2.html (the app's real slide look) */
.phone-frame {
  background: #0C0C0C;
  border: 1px solid #1c1c1c;
  border-radius: 36px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.phone-top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 28px 10px;
}
.phone-x { color: var(--text-2); font-size: 20px; line-height: 1; }
.phone-track { flex: 1; height: 4px; background: #222; border-radius: 100px; overflow: hidden; }
.phone-fill { height: 100%; background: var(--gold); border-radius: 100px; transition: width 0.2s; }

.phone-content {
  padding: 12px 28px 4px;
  min-height: 360px;
  max-height: 520px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.step-type-badge {
  align-self: flex-start;
  font-family: var(--sans);
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-3);
  border: 0.5px solid var(--line);
  border-radius: 100px;
  padding: 3px 9px;
  margin-bottom: 18px;
}

.step-preview-content { flex: 1; }

/* Titles — Playfair, the mockup's 500-weight editorial scale */
.preview-heading {
  font-family: var(--serif);
  font-size: 23px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.22;
  letter-spacing: -0.2px;
  margin: 4px 0 14px;
}

.preview-body {
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.6;
  color: var(--text);
  margin: 0 0 10px;
}

.preview-source {
  font-family: var(--sans);
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text-3);
  margin-top: 16px;
}

/* Quote → accented pull-quote with attribution (mockup .pullquote) */
.preview-quote {
  font-family: var(--serif);
  font-style: italic;
  font-size: 16px;
  line-height: 1.5;
  color: var(--text);
  border-left: 2px solid rgba(196,145,44,0.4);
  padding: 4px 0 4px 14px;
  margin: 6px 0 0;
}

.preview-question {
  font-family: var(--serif);
  font-size: 20px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.3;
  margin: 0 0 18px;
}

.preview-options { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }

.preview-option {
  font-family: var(--sans);
  font-size: 14px;
  color: var(--text);
  padding: 13px 15px;
  border-radius: 8px;
  border: 0.5px solid var(--line);
  background: #181818;
  line-height: 1.4;
}
.preview-option.correct {
  border-color: rgba(52,199,89,0.5);
  background: rgba(52,199,89,0.08);
  color: #4ad168;
}

.preview-xp {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 220px;
}
.xp-number { font-family: var(--serif); font-size: 52px; font-weight: 500; color: var(--gold-light); }
.xp-label { font-family: var(--sans); font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 2px; }

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
  margin-bottom: 14px;
}
.stat-value {
  font-family: var(--serif);
  font-size: 42px;
  font-weight: 500;
  color: var(--gold-light);
  display: block;
  line-height: 1;
}
.stat-label-text {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 6px;
  display: block;
}

/* Scripture — verses in a card, per the mockup (.scriptCard) */
.scripture-ref {
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 600;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 10px;
}
.scripture-verse {
  background: #181818;
  border: 0.5px solid var(--line);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 10px;
}
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
  font-style: italic;
  font-size: 16px;
  line-height: 1.55;
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

/* Interpretations — the Four Senses as colored lens tabs (mockup .lens) */
.interp-view {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  padding: 0;
  background: none;
}
.interp-view::before {
  content: '';
  width: 4px;
  border-radius: 2px;
  flex-shrink: 0;
  background: var(--gold);
}
.interp-view:nth-of-type(2)::before { background: #6B8EB8; }
.interp-view:nth-of-type(3)::before { background: #6BB887; }
.interp-view:nth-of-type(4)::before { background: #B8556B; }
.interp-label {
  font-family: var(--sans);
  font-size: 10px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--gold-light);
  display: block;
  margin-bottom: 3px;
}
.interp-view:nth-of-type(2) .interp-label { color: #8FB0D6; }
.interp-view:nth-of-type(3) .interp-label { color: #86CBA0; }
.interp-view:nth-of-type(4) .interp-label { color: #D17E91; }
.interp-text {
  font-family: var(--sans);
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--text-2);
  margin: 0;
}

/* Explanation — takeaway beat (mockup: eyebrow + lead + pull-quote) */
.exp-lead { font-family: var(--sans); font-size: 17px; line-height: 1.55; color: var(--text); margin: 0; }
.exp-pullquote { border-left: 2px solid rgba(196,145,44,0.4); padding: 4px 0 4px 14px; margin-top: 20px; }
.exp-q { font-family: var(--serif); font-style: italic; font-size: 16px; line-height: 1.5; color: var(--text); }
.exp-a { font-family: var(--sans); font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text-3); margin-top: 8px; }

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

/* Painting image */
.painting-img {
  width: 100%;
  border-radius: 6px;
  margin: 10px 0;
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
  letter-spacing: 2px;
  color: var(--gold);
  margin-bottom: 12px;
  display: block;
}

.article-title-preview {
  font-family: var(--serif);
  font-size: 27px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.16;
  letter-spacing: -0.3px;
  margin: 0 0 10px;
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

.article-block { margin-bottom: 14px; }

/* Section headings render as gold eyebrows, per the mockup (.artSecEye) */
.ab-heading {
  font-family: var(--sans);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--gold);
  margin: 22px 0 2px;
}

.ab-text {
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.62;
  color: var(--text-2);
  margin: 0;
}
/* First paragraph reads as a lead — brighter, with a serif drop-cap */
.article-block:first-of-type .ab-text { color: var(--text); }
.article-block:first-of-type .ab-text::first-letter {
  font-family: var(--serif);
  font-size: 46px;
  line-height: 38px;
  float: left;
  margin: 4px 8px -2px 0;
  color: var(--gold-light);
}

.ab-quote {
  font-family: var(--serif);
  font-style: italic;
  font-size: 16px;
  line-height: 1.5;
  color: var(--text);
  border-left: 2px solid rgba(196,145,44,0.4);
  padding-left: 14px;
  margin: 0;
}

.ab-image {
  text-align: center;
}

.ab-img {
  width: 100%;
  border-radius: 6px;
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

/* ─── Saint Preview ─── */
.saint-preview { min-height: auto; }

.saint-rarity {
  font-family: var(--sans);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 3px 10px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 12px;
}
.saint-rarity.common { background: var(--surface); color: var(--text-3); }
.saint-rarity.uncommon { background: rgba(52, 199, 89, 0.12); color: #34C759; }
.saint-rarity.rare { background: rgba(0, 122, 255, 0.12); color: #007AFF; }
.saint-rarity.legendary { background: rgba(200, 165, 90, 0.15); color: var(--gold-light); }

.saint-name {
  font-family: var(--serif);
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 4px;
}

.saint-title-text {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text-3);
  font-style: italic;
  margin: 0 0 16px;
}

.saint-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 6px 0;
  border-bottom: 1px solid var(--line);
}

.saint-meta-label {
  font-family: var(--sans);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-3);
  flex-shrink: 0;
}

.saint-meta-value {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text-2);
  text-align: right;
}

.saint-bio {
  font-family: var(--sans);
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-2);
  margin: 16px 0 0;
}

.saint-quote {
  font-family: var(--serif);
  font-size: 14px;
  line-height: 1.5;
  color: var(--text);
  border-left: 2px solid var(--gold);
  padding-left: 14px;
  margin: 16px 0 0;
}

.saint-quote-src {
  display: block;
  font-family: var(--sans);
  font-size: 11px;
  color: var(--text-3);
  font-style: italic;
  margin-top: 6px;
}

.saint-known { margin-top: 16px; }

.saint-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.saint-tag {
  font-family: var(--sans);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-2);
}

/* ─── Entry Preview ─── */
.entry-preview { min-height: auto; }

.entry-type-badge {
  font-family: var(--sans);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--gold-light);
  margin-bottom: 8px;
}

.entry-term {
  font-family: var(--serif);
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 6px;
}

.entry-category {
  font-family: var(--sans);
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-3);
  display: inline-block;
  margin-bottom: 14px;
}

.entry-definition {
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-2);
  margin: 0 0 14px;
}

.entry-ref {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.entry-ref-label {
  font-family: var(--sans);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--gold-light);
  background: rgba(200, 165, 90, 0.12);
  padding: 2px 8px;
  border-radius: 3px;
}

.entry-ref-value {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--text-2);
}

.entry-related { margin-top: 14px; }
</style>
