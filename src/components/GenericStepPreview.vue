<template>
  <div class="gp">
    <div class="gp-eyebrow">{{ label }}</div>
    <div v-for="f in schema" :key="f.key" class="gp-field">
      <span class="gp-label">{{ f.label }}</span>

      <template v-if="f.kind === 'stringList'">
        <ul class="gp-list">
          <li v-for="(s, i) in asArray(step[f.key])" :key="i">{{ s }}</li>
        </ul>
      </template>

      <template v-else-if="f.kind === 'objectList'">
        <ol class="gp-list">
          <li v-for="(it, i) in asArray(step[f.key])" :key="i">{{ summarizeItem(it) }}</li>
        </ol>
      </template>

      <template v-else-if="f.kind === 'object'">
        <div class="gp-obj">
          <div v-for="(v, k) in (step[f.key] || {})" :key="k"><span class="gp-k">{{ k }}:</span> {{ v }}</div>
        </div>
      </template>

      <template v-else-if="f.kind === 'json'">
        <span class="gp-muted">{{ asArray(step[f.key]).length }} item(s)</span>
      </template>

      <template v-else-if="f.kind === 'bool'">
        <span class="gp-val">{{ step[f.key] ? 'True' : 'False' }}</span>
      </template>

      <span v-else class="gp-val">{{ step[f.key] }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FieldSpec } from '../lib/stepSchemas'

defineProps<{ step: any; schema: FieldSpec[]; label: string }>()

function asArray(v: any): any[] {
  return Array.isArray(v) ? v : []
}

function summarizeItem(it: any): string {
  if (it == null) return ''
  if (typeof it !== 'object') return String(it)
  // Prefer a meaningful text-ish field for the one-line summary.
  const preferred = ['text', 'statement', 'quote', 'title', 'label', 'q', 'prompt']
  for (const k of preferred) if (it[k]) return String(it[k])
  const first = Object.values(it).find((v) => typeof v === 'string' && v)
  return first ? String(first) : JSON.stringify(it)
}
</script>

<style scoped>
.gp { display: flex; flex-direction: column; gap: 10px; }
.gp-eyebrow {
  font-family: var(--sans); font-size: 10px; font-weight: 700; letter-spacing: 1.2px;
  text-transform: uppercase; color: var(--gold-light);
}
.gp-field { display: flex; flex-direction: column; gap: 3px; }
.gp-label { font-family: var(--sans); font-size: 9px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-3); }
.gp-val { font-family: var(--sans); font-size: 13.5px; color: var(--text); line-height: 1.5; }
.gp-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 3px; }
.gp-list li { font-family: var(--sans); font-size: 13px; color: var(--text-2); line-height: 1.45; }
.gp-obj { display: flex; flex-direction: column; gap: 2px; font-family: var(--sans); font-size: 12.5px; color: var(--text-2); }
.gp-k { color: var(--text-3); }
.gp-muted { font-family: var(--sans); font-size: 12px; color: var(--text-3); font-style: italic; }
</style>
