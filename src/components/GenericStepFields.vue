<template>
  <div class="gf">
    <div v-for="f in schema" :key="f.key" class="gf-field">
      <label class="gf-label">{{ f.label }}</label>

      <!-- text -->
      <input
        v-if="f.kind === 'text'"
        :value="step[f.key] ?? ''"
        class="se-input"
        :placeholder="f.placeholder"
        @input="setScalar(step, f.key, ($event.target as HTMLInputElement).value)"
      />

      <!-- textarea -->
      <textarea
        v-else-if="f.kind === 'textarea'"
        :value="step[f.key] ?? ''"
        class="se-textarea"
        :rows="f.rows || 2"
        :placeholder="f.placeholder"
        @input="setScalar(step, f.key, ($event.target as HTMLTextAreaElement).value)"
      ></textarea>

      <!-- number -->
      <input
        v-else-if="f.kind === 'number'"
        :value="step[f.key] ?? 0"
        type="number"
        class="se-input"
        style="max-width: 140px"
        @input="setScalar(step, f.key, num(($event.target as HTMLInputElement).value))"
      />

      <!-- bool -->
      <select
        v-else-if="f.kind === 'bool'"
        :value="String(step[f.key] ?? false)"
        class="se-select"
        @change="setScalar(step, f.key, ($event.target as HTMLSelectElement).value === 'true')"
      >
        <option value="true">True</option>
        <option value="false">False</option>
      </select>

      <!-- select -->
      <select
        v-else-if="f.kind === 'select'"
        :value="step[f.key] ?? (f.options && f.options[0])"
        class="se-select"
        @change="setScalar(step, f.key, ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="o in f.options" :key="o" :value="o">{{ o }}</option>
      </select>

      <!-- stringList -->
      <template v-else-if="f.kind === 'stringList'">
        <div v-for="(_, si) in arr(step, f.key)" :key="si" class="gf-inline">
          <input
            :value="step[f.key][si]"
            class="se-input flex"
            :placeholder="f.itemLabel"
            @input="setIndex(step[f.key], si, ($event.target as HTMLInputElement).value)"
          />
          <button class="se-icon del sm" @click="removeAt(step[f.key], si)">&#215;</button>
        </div>
        <button class="se-add-item" @click="push(step, f.key, '')">+ Add {{ f.itemLabel || 'item' }}</button>
      </template>

      <!-- object (single, flat itemFields) -->
      <div v-else-if="f.kind === 'object'" class="gf-object">
        <div v-for="sf in f.itemFields" :key="sf.key" class="gf-subfield">
          <label class="gf-sublabel">{{ sf.label }}</label>
          <textarea
            v-if="sf.kind === 'textarea'"
            :value="obj(step, f.key)[sf.key] ?? ''"
            class="se-textarea sm"
            :rows="sf.rows || 2"
            @input="setScalar(obj(step, f.key), sf.key, ($event.target as HTMLTextAreaElement).value)"
          ></textarea>
          <input
            v-else
            :value="obj(step, f.key)[sf.key] ?? ''"
            class="se-input sm"
            :placeholder="sf.placeholder"
            @input="setScalar(obj(step, f.key), sf.key, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <!-- objectList -->
      <template v-else-if="f.kind === 'objectList'">
        <div v-for="(item, ii) in arr(step, f.key)" :key="ii" class="gf-item">
          <div class="gf-item-head">
            <span class="gf-item-num">{{ ii + 1 }}</span>
            <button class="se-icon del sm" @click="removeAt(step[f.key], ii)">&#215;</button>
          </div>
          <div v-for="sf in f.itemFields" :key="sf.key" class="gf-subfield">
            <label class="gf-sublabel">{{ sf.label }}</label>
            <!-- nested stringList inside an item (e.g. quotematch options) -->
            <template v-if="sf.kind === 'stringList'">
              <div v-for="(_, ni) in nestedArr(item, sf.key)" :key="ni" class="gf-inline">
                <input
                  :value="item[sf.key][ni]"
                  class="se-input flex sm"
                  :placeholder="sf.itemLabel"
                  @input="setIndex(item[sf.key], ni, ($event.target as HTMLInputElement).value)"
                />
                <button class="se-icon del sm" @click="removeAt(item[sf.key], ni)">&#215;</button>
              </div>
              <button class="se-add-item" @click="pushNested(item, sf.key, '')">+ Add {{ sf.itemLabel || 'item' }}</button>
            </template>
            <textarea
              v-else-if="sf.kind === 'textarea'"
              :value="item[sf.key] ?? ''"
              class="se-textarea sm"
              :rows="sf.rows || 2"
              @input="setScalar(item, sf.key, ($event.target as HTMLTextAreaElement).value)"
            ></textarea>
            <select
              v-else-if="sf.kind === 'bool'"
              :value="String(item[sf.key] ?? false)"
              class="se-select"
              @change="setScalar(item, sf.key, ($event.target as HTMLSelectElement).value === 'true')"
            >
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
            <input
              v-else-if="sf.kind === 'number'"
              :value="item[sf.key] ?? 0"
              type="number"
              class="se-input sm"
              style="max-width: 120px"
              @input="setScalar(item, sf.key, num(($event.target as HTMLInputElement).value))"
            />
            <input
              v-else
              :value="item[sf.key] ?? ''"
              class="se-input sm"
              :placeholder="sf.placeholder"
              @input="setScalar(item, sf.key, ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
        <button class="se-add-item" @click="push(step, f.key, makeItem(f))">+ Add {{ f.itemLabel || 'item' }}</button>
      </template>

      <!-- json escape hatch for deeply nested arrays -->
      <template v-else-if="f.kind === 'json'">
        <textarea
          :value="jsonText(step, f.key)"
          class="se-textarea mono"
          rows="8"
          @input="setJson(step, f.key, ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
        <span v-if="jsonError[f.key]" class="gf-json-err">Invalid JSON — not saved</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FieldSpec } from '../lib/stepSchemas'

const props = defineProps<{ step: any; schema: FieldSpec[] }>()
const emit = defineEmits<{ change: [] }>()

const jsonError = ref<Record<string, boolean>>({})

function num(v: string): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function setScalar(target: any, key: string, value: any) {
  target[key] = value
  emit('change')
}

function arr(step: any, key: string): any[] {
  if (!Array.isArray(step[key])) step[key] = []
  return step[key]
}
function nestedArr(item: any, key: string): any[] {
  if (!Array.isArray(item[key])) item[key] = []
  return item[key]
}
function obj(step: any, key: string): any {
  if (typeof step[key] !== 'object' || step[key] === null || Array.isArray(step[key])) step[key] = {}
  return step[key]
}

function setIndex(list: any[], i: number, value: any) {
  list[i] = value
  emit('change')
}
function removeAt(list: any[], i: number) {
  list.splice(i, 1)
  emit('change')
}
function push(step: any, key: string, value: any) {
  arr(step, key).push(value)
  emit('change')
}
function pushNested(item: any, key: string, value: any) {
  nestedArr(item, key).push(value)
  emit('change')
}

// Build a blank item for an objectList from its itemFields.
function makeItem(f: FieldSpec): Record<string, any> {
  const o: Record<string, any> = {}
  for (const sf of f.itemFields || []) {
    if (sf.kind === 'number') o[sf.key] = 0
    else if (sf.kind === 'bool') o[sf.key] = false
    else if (sf.kind === 'stringList') o[sf.key] = ['']
    else o[sf.key] = ''
  }
  return o
}

function jsonText(step: any, key: string): string {
  const v = step[key]
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v ?? [], null, 2)
  } catch {
    return ''
  }
}
function setJson(step: any, key: string, text: string) {
  try {
    step[key] = JSON.parse(text)
    jsonError.value[key] = false
    emit('change')
  } catch {
    jsonError.value[key] = true
  }
}
</script>

<style scoped>
.gf { display: flex; flex-direction: column; gap: 8px; }
.gf-field { display: flex; flex-direction: column; gap: 4px; }
.gf-label { font-size: 10px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px; }
.gf-inline { display: flex; align-items: center; gap: 6px; }
.gf-object { display: flex; flex-direction: column; gap: 6px; padding: 8px; background: var(--raised); border-radius: 4px; }
.gf-item { display: flex; flex-direction: column; gap: 6px; padding: 8px; background: var(--raised); border-radius: 4px; }
.gf-item-head { display: flex; align-items: center; justify-content: space-between; }
.gf-item-num { font-size: 10px; font-weight: 700; color: var(--gold-light); }
.gf-subfield { display: flex; flex-direction: column; gap: 3px; }
.gf-sublabel { font-size: 9px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.4px; }
.gf-json-err { font-size: 10px; color: #FF3B30; }

/* Base inputs — self-contained (StepEditor's se-* styles are scoped to it) */
.se-input, .se-textarea, .se-select {
  font-family: var(--sans); font-size: 13px; color: var(--text);
  background: var(--raised); border: 1px solid transparent; border-radius: 4px;
  padding: 7px 10px; outline: none; width: 100%; transition: border-color 0.15s;
}
.gf-object .se-input, .gf-object .se-textarea,
.gf-item .se-input, .gf-item .se-textarea { background: var(--surface); }
.se-input:focus, .se-textarea:focus, .se-select:focus { border-color: var(--gold); }
.se-input.sm, .se-textarea.sm { font-size: 12px; }
.se-input.flex { flex: 1; }
.se-textarea { resize: vertical; line-height: 1.5; }
.se-textarea.mono { font-family: monospace; font-size: 11px; }
.se-select { cursor: pointer; width: auto; }
.se-icon {
  font-size: 13px; color: var(--text-3); background: none; border: none; cursor: pointer;
  width: 22px; height: 22px; border-radius: 3px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.se-icon:hover { background: var(--surface); color: var(--text); }
.se-icon.del:hover { color: #FF3B30; }
.se-icon.sm { font-size: 11px; width: 18px; height: 18px; }
.se-add-item {
  font-family: var(--sans); font-size: 11px; color: var(--gold-light);
  background: none; border: none; cursor: pointer; padding: 3px 0; text-align: left;
}
.se-add-item:hover { text-decoration: underline; }
</style>
