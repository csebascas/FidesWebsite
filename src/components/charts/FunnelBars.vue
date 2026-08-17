<script setup lang="ts">
defineProps<{ rows: { label: string; value: string; pct?: string; frac: number }[] }>();
</script>
<template>
  <div class="funnel">
    <div class="fr" v-for="r in rows" :key="r.label">
      <span class="fk">{{ r.label }}</span>
      <div class="ft"><div class="fb" :style="{ width: Math.round(Math.max(0, Math.min(1, r.frac)) * 100) + '%' }"></div></div>
      <span class="fv"><b>{{ r.value }}</b> <span class="pct" v-if="r.pct">{{ r.pct }}</span></span>
    </div>
  </div>
</template>
<style scoped>
.fr { display: grid; grid-template-columns: 150px 1fr 84px; align-items: center; gap: 12px; margin: 11px 0; }
.fk { font-size: 12.5px; color: var(--text-2); }
.ft { height: 26px; background: var(--raised); border-radius: 5px; overflow: hidden; }
.fb { height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold-light)); border-radius: 5px; }
.fv { text-align: right; font-size: 12.5px; font-variant-numeric: tabular-nums; }
.fv .pct { color: var(--text-3); font-size: 11px; }
</style>
