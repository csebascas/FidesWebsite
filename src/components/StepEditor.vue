<template>
  <div class="step-editor">
    <div class="se-toolbar">
      <span class="se-label">Add step:</span>
      <div class="se-groups">
        <div class="se-group">
          <span class="se-group-label">Content</span>
          <button v-for="t in contentTypes" :key="t.type" class="se-btn" @click="addStep(t.type)">{{ t.label }}</button>
        </div>
        <div class="se-group">
          <span class="se-group-label">Quiz</span>
          <button v-for="t in quizTypes" :key="t.type" class="se-btn" @click="addStep(t.type)">{{ t.label }}</button>
        </div>
        <div class="se-group">
          <span class="se-group-label">Other</span>
          <button v-for="t in otherTypes" :key="t.type" class="se-btn" @click="addStep(t.type)">{{ t.label }}</button>
        </div>
        <div class="se-group">
          <span class="se-group-label">More</span>
          <select class="se-more" @change="onPickMore($event)">
            <option value="">+ type…</option>
            <optgroup v-for="g in moreGroups" :key="g.category" :label="g.category">
              <option v-for="t in g.types" :key="t.type" :value="t.type">{{ t.label }}</option>
            </optgroup>
          </select>
        </div>
      </div>
    </div>

    <div class="se-list">
      <div
        v-for="(step, i) in steps"
        :key="step._key"
        class="se-step"
        :class="{ active: activeIndex === i }"
        @click="activeIndex = i; $emit('selectStep', i)"
      >
        <div class="se-step-header">
          <span class="se-step-num">{{ i + 1 }}</span>
          <span class="se-step-type">{{ step.type }}</span>
          <span class="se-step-summary">{{ getSummary(step) }}</span>
          <div class="se-step-actions">
            <button class="se-icon" :disabled="i === 0" @click.stop="move(i, -1)">&#8593;</button>
            <button class="se-icon" :disabled="i === steps.length - 1" @click.stop="move(i, 1)">&#8595;</button>
            <button class="se-icon del" @click.stop="remove(i)">&#215;</button>
          </div>
        </div>

        <div v-if="activeIndex === i" class="se-step-body">
          <!-- concept -->
          <template v-if="step.type === 'concept'">
            <input v-model="step.title" class="se-input bold" placeholder="Title" @input="emitUpdate" />
            <textarea v-model="step.body" class="se-textarea" placeholder="Body text" rows="3" @input="emitUpdate"></textarea>
            <input v-model="step.source" class="se-input sm" placeholder="Source (optional)" @input="emitUpdate" />
          </template>

          <!-- quote -->
          <template v-else-if="step.type === 'quote'">
            <textarea v-model="step.quote" class="se-textarea" placeholder="Quote text" rows="2" @input="emitUpdate"></textarea>
            <input v-model="step.attribution" class="se-input sm" placeholder="Attribution" @input="emitUpdate" />
          </template>

          <!-- truefalse -->
          <template v-else-if="step.type === 'truefalse'">
            <textarea v-model="step.statement" class="se-textarea" placeholder="Statement" rows="2" @input="emitUpdate"></textarea>
            <div class="se-row">
              <label class="se-label-inline">Answer:</label>
              <select v-model="step.isTrue" class="se-select" @change="emitUpdate">
                <option :value="true">True</option>
                <option :value="false">False</option>
              </select>
            </div>
            <textarea v-model="step.explanation" class="se-textarea sm" placeholder="Explanation" rows="2" @input="emitUpdate"></textarea>
          </template>

          <!-- question / scenario / doctrine-life -->
          <template v-else-if="step.type === 'question' || step.type === 'scenario' || step.type === 'doctrine-life'">
            <textarea v-if="step.type !== 'question'" v-model="step.scenario" class="se-textarea" placeholder="Scenario description" rows="3" @input="emitUpdate"></textarea>
            <textarea v-model="step.question" class="se-textarea" placeholder="Question" rows="2" @input="emitUpdate"></textarea>
            <div class="se-options-label">Options:</div>
            <div v-for="(opt, oi) in (step.options || [])" :key="oi" class="se-option-row">
              <input type="checkbox" :checked="opt.isCorrect" @change="opt.isCorrect = ($event.target as HTMLInputElement).checked; emitUpdate()" />
              <input v-model="opt.text" class="se-input flex" placeholder="Option text" @input="emitUpdate" />
              <button class="se-icon del sm" @click="step.options.splice(oi, 1); emitUpdate()">&#215;</button>
            </div>
            <button class="se-add-item" @click="if (!step.options) step.options = []; step.options.push({ id: String.fromCharCode(97 + step.options.length), text: '', isCorrect: false }); emitUpdate()">+ Add option</button>
            <textarea v-model="step.explanation" class="se-textarea sm" placeholder="Explanation" rows="2" @input="emitUpdate"></textarea>
          </template>

          <!-- before-after -->
          <template v-else-if="step.type === 'before-after'">
            <input v-model="step.misconceptionLabel" class="se-input sm" placeholder="Misconception label" @input="emitUpdate" />
            <textarea v-model="step.misconception" class="se-textarea" placeholder="Common misconception" rows="2" @input="emitUpdate"></textarea>
            <input v-model="step.truthLabel" class="se-input sm" placeholder="Truth label" @input="emitUpdate" />
            <textarea v-model="step.truth" class="se-textarea" placeholder="Actual truth" rows="2" @input="emitUpdate"></textarea>
          </template>

          <!-- stat -->
          <template v-else-if="step.type === 'stat'">
            <div class="se-row">
              <input v-model="step.stat" class="se-input" placeholder="Stat value (e.g. 1891)" style="max-width: 120px;" @input="emitUpdate" />
              <input v-model="step.label" class="se-input flex" placeholder="Label" @input="emitUpdate" />
            </div>
            <textarea v-model="step.body" class="se-textarea" placeholder="Body text" rows="2" @input="emitUpdate"></textarea>
            <input v-model="step.source" class="se-input sm" placeholder="Source" @input="emitUpdate" />
          </template>

          <!-- vocabulary -->
          <template v-else-if="step.type === 'vocabulary'">
            <input v-model="step.term" class="se-input bold" placeholder="Term" @input="emitUpdate" />
            <textarea v-model="step.definition" class="se-textarea" placeholder="Definition" rows="2" @input="emitUpdate"></textarea>
            <input v-model="step.etymology" class="se-input sm" placeholder="Etymology" @input="emitUpdate" />
            <textarea v-model="step.context" class="se-textarea sm" placeholder="Context" rows="2" @input="emitUpdate"></textarea>
            <textarea v-model="step.example" class="se-textarea sm" placeholder="Example" rows="2" @input="emitUpdate"></textarea>
          </template>

          <!-- scripture -->
          <template v-else-if="step.type === 'scripture'">
            <input v-model="step.reference" class="se-input" placeholder="e.g. Genesis 12:1-4" @input="emitUpdate" />
            <div v-for="(v, vi) in (step.verses || [])" :key="vi" class="se-verse-row">
              <span class="se-verse-num">{{ v.number }}</span>
              <textarea v-model="v.text" class="se-textarea flex" placeholder="Verse text" rows="1" @input="emitUpdate"></textarea>
              <button class="se-icon del sm" @click="step.verses.splice(vi, 1); emitUpdate()">&#215;</button>
            </div>
            <button class="se-add-item" @click="if (!step.verses) step.verses = []; step.verses.push({ number: step.verses.length + 1, text: '' }); emitUpdate()">+ Add verse</button>
          </template>

          <!-- match -->
          <template v-else-if="step.type === 'match'">
            <input v-model="step.instruction" class="se-input sm" placeholder="Instruction" @input="emitUpdate" />
            <div v-for="(pair, pi) in (step.pairs || [])" :key="pi" class="se-match-row">
              <input v-model="pair.left" class="se-input flex" placeholder="Left" @input="emitUpdate" />
              <span class="se-match-arrow">→</span>
              <input v-model="pair.right" class="se-input flex" placeholder="Right" @input="emitUpdate" />
              <button class="se-icon del sm" @click="step.pairs.splice(pi, 1); emitUpdate()">&#215;</button>
            </div>
            <button class="se-add-item" @click="if (!step.pairs) step.pairs = []; step.pairs.push({ id: String(step.pairs.length + 1), left: '', right: '' }); emitUpdate()">+ Add pair</button>
            <textarea v-model="step.explanation" class="se-textarea sm" placeholder="Explanation" rows="2" @input="emitUpdate"></textarea>
          </template>

          <!-- xp-award -->
          <template v-else-if="step.type === 'xp-award'">
            <div class="se-row">
              <label class="se-label-inline">XP:</label>
              <input v-model.number="step.xp" class="se-input" type="number" style="max-width: 100px;" @input="emitUpdate" />
            </div>
          </template>

          <!-- storyboard -->
          <template v-else-if="step.type === 'storyboard'">
            <input v-model="step.eyebrow" class="se-input sm" placeholder="Eyebrow label" @input="emitUpdate" />
            <div v-for="(panel, pi) in (step.panels || [])" :key="pi" class="se-panel-row">
              <input v-model="panel.title" class="se-input sm" placeholder="Panel title" @input="emitUpdate" />
              <textarea v-model="panel.body" class="se-textarea" placeholder="Panel body" rows="2" @input="emitUpdate"></textarea>
              <button class="se-icon del sm" @click="step.panels.splice(pi, 1); emitUpdate()">&#215;</button>
            </div>
            <button class="se-add-item" @click="if (!step.panels) step.panels = []; step.panels.push({ title: '', body: '' }); emitUpdate()">+ Add panel</button>
          </template>

          <!-- schema-driven editor for the long tail of step types -->
          <GenericStepFields
            v-else-if="schemaFor(step.type)"
            :step="step"
            :schema="schemaFor(step.type)!.fields"
            @change="emitUpdate"
          />

          <!-- fallback: raw JSON for genuinely unknown types -->
          <template v-else>
            <textarea v-model="step._rawJson" class="se-textarea mono" rows="6" @input="handleRawEdit(step)"></textarea>
          </template>
        </div>
      </div>

      <div v-if="steps.length === 0" class="se-empty">No steps yet. Use the toolbar to add lesson content.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import GenericStepFields from './GenericStepFields.vue'
import { STEP_SCHEMAS, SCHEMA_TYPES, type StepSchema } from '../lib/stepSchemas'

const props = defineProps<{ modelValue: any[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: any[]], 'selectStep': [index: number] }>()

function schemaFor(type: string): StepSchema | undefined {
  return STEP_SCHEMAS[type]
}

// "More types" picker — every schema-backed type, grouped by category.
const moreGroups = computed(() => {
  const cats = ['Content', 'Quiz', 'Interactive', 'Other'] as const
  return cats
    .map((category) => ({
      category,
      types: SCHEMA_TYPES.filter((t) => STEP_SCHEMAS[t].category === category).map((t) => ({ type: t, label: STEP_SCHEMAS[t].label })),
    }))
    .filter((g) => g.types.length > 0)
})

function onPickMore(e: Event) {
  const sel = e.target as HTMLSelectElement
  const type = sel.value
  if (type) addStep(type)
  sel.value = ''
}

const steps = ref<any[]>([])
const activeIndex = ref(-1)
let keyCounter = 0

const contentTypes = [
  { type: 'concept', label: 'Concept' },
  { type: 'quote', label: 'Quote' },
  { type: 'stat', label: 'Stat' },
  { type: 'scripture', label: 'Scripture' },
  { type: 'vocabulary', label: 'Vocab' },
  { type: 'storyboard', label: 'Story' },
]
const quizTypes = [
  { type: 'truefalse', label: 'True/False' },
  { type: 'question', label: 'Question' },
  { type: 'scenario', label: 'Scenario' },
  { type: 'before-after', label: 'Before/After' },
  { type: 'match', label: 'Match' },
]
const otherTypes = [
  { type: 'xp-award', label: 'XP Award' },
  { type: 'explanation', label: 'Explanation' },
]

// Only load from props once on mount — after that, component owns the state
let initialized = false
watch(() => props.modelValue, (val) => {
  if (initialized) return
  initialized = true
  steps.value = (val || []).map((s: any) => {
    const copy = { ...s, _key: `k${keyCounter++}` }
    // Bespoke-template types + schema-driven types both have real editors;
    // only genuinely unknown types fall back to the raw-JSON textarea.
    const bespoke = [...contentTypes, ...quizTypes, ...otherTypes].map(t => t.type)
    const known = new Set([...bespoke, ...SCHEMA_TYPES])
    if (!known.has(s.type)) {
      copy._rawJson = JSON.stringify(s, null, 2)
    }
    return copy
  })
}, { immediate: true })

function getSummary(step: any): string {
  return step.title || step.statement || step.question || step.term || step.quote || step.stat || ''
}

function emitUpdate() {
  const clean = steps.value.map((s: any) => {
    const { _key, _rawJson, ...rest } = s
    return rest
  })
  emit('update:modelValue', clean)
}

function handleRawEdit(step: any) {
  try {
    const parsed = JSON.parse(step._rawJson)
    Object.assign(step, parsed)
    emitUpdate()
  } catch { /* invalid JSON, skip */ }
}

function addStep(type: string) {
  const defaults: Record<string, any> = {
    concept: { type: 'concept', title: '', body: '' },
    quote: { type: 'quote', quote: '', attribution: '' },
    truefalse: { type: 'truefalse', statement: '', isTrue: true, explanation: '' },
    question: { type: 'question', question: '', options: [{ id: 'a', text: '', isCorrect: true }, { id: 'b', text: '', isCorrect: false }], explanation: '' },
    scenario: { type: 'scenario', scenario: '', question: '', options: [{ id: 'a', text: '', isCorrect: true }, { id: 'b', text: '', isCorrect: false }], explanation: '' },
    'doctrine-life': { type: 'doctrine-life', scenario: '', question: '', options: [{ id: 'a', text: '', isCorrect: true }, { id: 'b', text: '', isCorrect: false }], explanation: '' },
    'before-after': { type: 'before-after', misconceptionLabel: '', misconception: '', truthLabel: '', truth: '' },
    match: { type: 'match', instruction: '', pairs: [{ id: '1', left: '', right: '' }], explanation: '' },
    stat: { type: 'stat', stat: '', label: '', body: '', source: '' },
    scripture: { type: 'scripture', reference: '', verses: [{ number: 1, text: '' }] },
    vocabulary: { type: 'vocabulary', term: '', definition: '', etymology: '', context: '', example: '' },
    storyboard: { type: 'storyboard', eyebrow: '', panels: [{ title: '', body: '' }] },
    'xp-award': { type: 'xp-award', xp: 25 },
  }
  // Bespoke default → schema default → bare {type}.
  const base = defaults[type] || STEP_SCHEMAS[type]?.make() || { type }
  const step = { ...base, _key: `k${keyCounter++}` }
  steps.value.push(step)
  activeIndex.value = steps.value.length - 1
  emit('selectStep', activeIndex.value)
  emitUpdate()
}

function move(index: number, dir: number) {
  const target = index + dir
  if (target < 0 || target >= steps.value.length) return
  const temp = steps.value[index]
  steps.value[index] = steps.value[target]
  steps.value[target] = temp
  activeIndex.value = target
  emit('selectStep', target)
  emitUpdate()
}

function remove(index: number) {
  steps.value.splice(index, 1)
  if (activeIndex.value >= steps.value.length) activeIndex.value = steps.value.length - 1
  emitUpdate()
}
</script>

<style scoped>
.step-editor { font-family: var(--sans); }

.se-toolbar {
  padding: 10px; background: var(--surface); border: 1px solid var(--line);
  border-radius: 8px; margin-bottom: 8px;
}
.se-label { font-size: 11px; color: var(--text-3); display: block; margin-bottom: 6px; }
.se-groups { display: flex; gap: 12px; flex-wrap: wrap; }
.se-group { display: flex; align-items: center; gap: 3px; flex-wrap: wrap; }
.se-group-label { font-size: 10px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px; margin-right: 2px; }
.se-btn {
  font-family: var(--sans); font-size: 11px; color: var(--text-2);
  background: var(--raised); border: 1px solid var(--line); border-radius: 4px;
  padding: 3px 7px; cursor: pointer; transition: all 0.15s;
}
.se-btn:hover { border-color: var(--gold); color: var(--text); }
.se-more {
  font-family: var(--sans); font-size: 11px; color: var(--text-2);
  background: var(--raised); border: 1px solid var(--line); border-radius: 4px;
  padding: 3px 6px; cursor: pointer; outline: none;
}
.se-more:hover { border-color: var(--gold); color: var(--text); }

.se-list { display: flex; flex-direction: column; gap: 3px; }

.se-step {
  background: var(--surface); border: 1px solid var(--line); border-radius: 6px;
  padding: 6px 10px; cursor: pointer; transition: border-color 0.15s;
}
.se-step.active { border-color: var(--gold); }
.se-step-header { display: flex; align-items: center; gap: 8px; }
.se-step-num { font-size: 10px; font-weight: 700; color: var(--gold-light); width: 18px; flex-shrink: 0; }
.se-step-type {
  font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
  color: var(--text-3); background: var(--raised); padding: 2px 6px; border-radius: 3px; flex-shrink: 0;
}
.se-step-summary { flex: 1; font-size: 12px; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.se-step-actions { display: flex; gap: 1px; flex-shrink: 0; }
.se-icon {
  font-size: 13px; color: var(--text-3); background: none; border: none; cursor: pointer;
  width: 22px; height: 22px; border-radius: 3px; display: flex; align-items: center; justify-content: center;
}
.se-icon:hover:not(:disabled) { background: var(--raised); color: var(--text); }
.se-icon:disabled { opacity: 0.3; cursor: default; }
.se-icon.del:hover:not(:disabled) { color: #FF3B30; }
.se-icon.sm { font-size: 11px; width: 18px; height: 18px; }

.se-step-body { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; padding-top: 8px; border-top: 1px solid var(--line); }

.se-input, .se-textarea, .se-select {
  font-family: var(--sans); font-size: 13px; color: var(--text);
  background: var(--raised); border: 1px solid transparent; border-radius: 4px;
  padding: 7px 10px; outline: none; width: 100%; transition: border-color 0.15s;
}
.se-input:focus, .se-textarea:focus { border-color: var(--gold); }
.se-input.bold { font-weight: 600; }
.se-input.sm, .se-textarea.sm { font-size: 12px; }
.se-input.flex { flex: 1; }
.se-textarea { resize: vertical; line-height: 1.5; }
.se-textarea.mono { font-family: monospace; font-size: 11px; }
.se-textarea.flex { flex: 1; }
.se-select { cursor: pointer; width: auto; }

.se-row { display: flex; align-items: center; gap: 8px; }
.se-label-inline { font-size: 12px; color: var(--text-3); flex-shrink: 0; }

.se-options-label { font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px; }
.se-option-row { display: flex; align-items: center; gap: 6px; }
.se-option-row input[type="checkbox"] { accent-color: var(--gold); flex-shrink: 0; }

.se-add-item {
  font-family: var(--sans); font-size: 11px; color: var(--gold-light);
  background: none; border: none; cursor: pointer; padding: 3px 0; text-align: left;
}
.se-add-item:hover { text-decoration: underline; }

.se-verse-row { display: flex; align-items: flex-start; gap: 6px; }
.se-verse-num { font-size: 10px; font-weight: 700; color: var(--gold-light); margin-top: 8px; width: 16px; flex-shrink: 0; }

.se-match-row { display: flex; align-items: center; gap: 6px; }
.se-match-arrow { color: var(--gold-light); font-size: 14px; flex-shrink: 0; }

.se-panel-row { display: flex; flex-direction: column; gap: 4px; padding: 6px; background: var(--raised); border-radius: 4px; }

.se-empty {
  padding: 32px; text-align: center; font-size: 13px; color: var(--text-3);
  background: var(--surface); border: 1px dashed var(--line); border-radius: 8px;
}
</style>
