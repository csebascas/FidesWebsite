<template>
  <div class="block-editor">
    <div class="be-toolbar">
      <span class="be-toolbar-label">Add block:</span>
      <button v-for="t in blockTypes" :key="t.type" class="be-add-btn" @click="addBlock(t.type)">
        <span class="be-add-icon">{{ t.icon }}</span> {{ t.label }}
      </button>
    </div>

    <div class="be-blocks">
      <div
        v-for="(block, i) in blocks"
        :key="block._key"
        class="be-block"
        :class="{ active: activeIndex === i }"
        @click="activeIndex = i"
      >
        <div class="be-block-header">
          <span class="be-block-type">{{ block.type }}</span>
          <div class="be-block-actions">
            <button class="be-icon-btn" :disabled="i === 0" @click.stop="move(i, -1)" title="Move up">&#8593;</button>
            <button class="be-icon-btn" :disabled="i === blocks.length - 1" @click.stop="move(i, 1)" title="Move down">&#8595;</button>
            <button class="be-icon-btn del" @click.stop="remove(i)" title="Remove">&#215;</button>
          </div>
        </div>

        <div class="be-block-body">
          <!-- heading -->
          <input v-if="block.type === 'heading'" v-model="block.text" class="be-input heading" placeholder="Heading text" @input="emitUpdate" />

          <!-- text -->
          <textarea v-else-if="block.type === 'text'" v-model="block.text" class="be-textarea" placeholder="Paragraph text" rows="3" @input="emitUpdate"></textarea>

          <!-- quote -->
          <div v-else-if="block.type === 'quote'" class="be-fields">
            <textarea v-model="block.text" class="be-textarea" placeholder="Quote text" rows="2" @input="emitUpdate"></textarea>
            <input v-model="block.attribution" class="be-input sm" placeholder="Attribution" @input="emitUpdate" />
          </div>

          <!-- bullet_list -->
          <div v-else-if="block.type === 'bullet_list'" class="be-fields">
            <div v-for="(_item, li) in (block.items || [])" :key="li" class="be-list-item">
              <span class="be-bullet">&#8226;</span>
              <input v-model="block.items[li]" class="be-input flex" @input="emitUpdate" />
              <button class="be-icon-btn del sm" @click="block.items.splice(li, 1); emitUpdate()">&#215;</button>
            </div>
            <button class="be-add-item" @click="if (!block.items) block.items = []; block.items.push(''); emitUpdate()">+ Add item</button>
          </div>

          <!-- scripture -->
          <div v-else-if="block.type === 'scripture'" class="be-fields">
            <textarea v-model="block.text" class="be-textarea" placeholder="Scripture text" rows="2" @input="emitUpdate"></textarea>
            <input v-model="block.reference" class="be-input sm" placeholder="e.g. Matthew 28:19" @input="emitUpdate" />
          </div>

          <!-- callout -->
          <textarea v-else-if="block.type === 'callout'" v-model="block.text" class="be-textarea" placeholder="Callout text" rows="2" @input="emitUpdate"></textarea>

          <!-- cross_ref -->
          <input v-else-if="block.type === 'cross_ref'" v-model="block.term" class="be-input" placeholder="Referenced term" @input="emitUpdate" />

          <!-- mention -->
          <div v-else-if="block.type === 'mention'" class="be-fields row">
            <input v-model="block.name" class="be-input flex" placeholder="Name" @input="emitUpdate" />
            <select v-model="block.entityType" class="be-input sm" @change="emitUpdate">
              <option value="saint">Saint</option>
              <option value="person">Person</option>
            </select>
          </div>

          <!-- image -->
          <div v-else-if="block.type === 'image'" class="be-fields">
            <input v-model="block.url" class="be-input" placeholder="Image URL" @input="emitUpdate" />
            <input v-model="block.alt" class="be-input sm" placeholder="Alt text" @input="emitUpdate" />
            <input v-model="block.caption" class="be-input sm" placeholder="Caption" @input="emitUpdate" />
            <img v-if="block.url" :src="block.url" class="be-img-preview" />
          </div>

          <!-- fallback -->
          <textarea v-else v-model="block._raw" class="be-textarea mono" rows="3" @input="emitUpdate"></textarea>
        </div>
      </div>

      <div v-if="blocks.length === 0" class="be-empty">No blocks yet. Use the toolbar above to add content.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ modelValue: any[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: any[]] }>()

const blocks = ref<any[]>([])
const activeIndex = ref(-1)
let keyCounter = 0

const blockTypes = [
  { type: 'heading', label: 'Heading', icon: 'H' },
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'quote', label: 'Quote', icon: '"' },
  { type: 'bullet_list', label: 'List', icon: '•' },
  { type: 'scripture', label: 'Scripture', icon: '†' },
  { type: 'callout', label: 'Callout', icon: '!' },
  { type: 'cross_ref', label: 'Ref', icon: '→' },
  { type: 'mention', label: 'Mention', icon: '★' },
  { type: 'image', label: 'Image', icon: '▣' },
]

let initialized = false
watch(() => props.modelValue, (val) => {
  if (initialized) return
  initialized = true
  blocks.value = (val || []).map((b: any) => ({ ...b, _key: `k${keyCounter++}` }))
}, { immediate: true })

function emitUpdate() {
  const clean = blocks.value.map((b: any) => {
    const { _key, _raw, ...rest } = b
    return rest
  })
  emit('update:modelValue', clean)
}

function addBlock(type: string) {
  const defaults: Record<string, any> = {
    heading: { type: 'heading', text: '' },
    text: { type: 'text', text: '' },
    quote: { type: 'quote', text: '', attribution: '' },
    bullet_list: { type: 'bullet_list', items: [''] },
    scripture: { type: 'scripture', text: '', reference: '' },
    callout: { type: 'callout', text: '' },
    cross_ref: { type: 'cross_ref', term: '' },
    mention: { type: 'mention', name: '', entityType: 'saint' },
    image: { type: 'image', url: '', alt: '', caption: '' },
  }
  const newBlock = { ...(defaults[type] || { type }), _key: `k${keyCounter++}` }
  blocks.value.push(newBlock)
  activeIndex.value = blocks.value.length - 1
  emitUpdate()
}

function move(index: number, dir: number) {
  const target = index + dir
  if (target < 0 || target >= blocks.value.length) return
  const temp = blocks.value[index]
  blocks.value[index] = blocks.value[target]
  blocks.value[target] = temp
  activeIndex.value = target
  emitUpdate()
}

function remove(index: number) {
  blocks.value.splice(index, 1)
  if (activeIndex.value >= blocks.value.length) activeIndex.value = blocks.value.length - 1
  emitUpdate()
}
</script>

<style scoped>
.block-editor { font-family: var(--sans); }

.be-toolbar {
  display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
  padding: 8px; background: var(--surface); border: 1px solid var(--line);
  border-radius: 8px; margin-bottom: 8px;
}
.be-toolbar-label { font-size: 11px; color: var(--text-3); margin-right: 4px; }
.be-add-btn {
  font-family: var(--sans); font-size: 11px; color: var(--text-2);
  background: var(--raised); border: 1px solid var(--line); border-radius: 4px;
  padding: 4px 8px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 3px;
}
.be-add-btn:hover { border-color: var(--gold); color: var(--text); }
.be-add-icon { font-size: 12px; color: var(--gold-light); }

.be-blocks { display: flex; flex-direction: column; gap: 4px; }

.be-block {
  background: var(--surface); border: 1px solid var(--line); border-radius: 8px;
  padding: 8px 10px; transition: border-color 0.15s; cursor: pointer;
}
.be-block.active { border-color: var(--gold); }
.be-block-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.be-block-type {
  font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
  color: var(--text-3); background: var(--raised); padding: 2px 6px; border-radius: 3px;
}
.be-block-actions { display: flex; gap: 2px; }
.be-icon-btn {
  font-size: 14px; color: var(--text-3); background: none; border: none; cursor: pointer;
  width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center;
}
.be-icon-btn:hover:not(:disabled) { background: var(--raised); color: var(--text); }
.be-icon-btn:disabled { opacity: 0.3; cursor: default; }
.be-icon-btn.del:hover:not(:disabled) { color: #FF3B30; }
.be-icon-btn.sm { font-size: 12px; width: 20px; height: 20px; }

.be-block-body { display: flex; flex-direction: column; gap: 4px; }

.be-input, .be-textarea {
  font-family: var(--sans); font-size: 13px; color: var(--text);
  background: var(--raised); border: 1px solid transparent; border-radius: 4px;
  padding: 8px 10px; outline: none; width: 100%; transition: border-color 0.15s;
}
.be-input:focus, .be-textarea:focus { border-color: var(--gold); }
.be-input.heading { font-family: var(--serif); font-size: 16px; font-weight: 700; }
.be-input.sm { font-size: 12px; padding: 6px 8px; }
.be-input.flex { flex: 1; }
.be-textarea { resize: vertical; line-height: 1.6; }
.be-textarea.mono { font-family: monospace; font-size: 11px; }

.be-fields { display: flex; flex-direction: column; gap: 4px; }
.be-fields.row { flex-direction: row; gap: 6px; }

.be-list-item { display: flex; align-items: center; gap: 4px; }
.be-bullet { color: var(--gold-light); font-size: 14px; flex-shrink: 0; width: 16px; text-align: center; }
.be-add-item {
  font-family: var(--sans); font-size: 11px; color: var(--gold-light);
  background: none; border: none; cursor: pointer; padding: 4px 0; text-align: left;
}
.be-add-item:hover { text-decoration: underline; }

.be-img-preview { max-height: 120px; border-radius: 6px; margin-top: 4px; object-fit: cover; }

.be-empty {
  padding: 32px; text-align: center; font-size: 13px; color: var(--text-3);
  background: var(--surface); border: 1px dashed var(--line); border-radius: 8px;
}
</style>
