<script setup lang="ts">
defineProps<{ rows: { label: string; size: number; w: (number | null)[] }[]; headers: string[] }>();
// Gold-scale a 0..100 retention value onto a dark→gold background.
function bg(v: number | null): string {
  if (v === null) return 'var(--raised)';
  const t = Math.max(0, Math.min(1, v / 100));
  // interpolate #4a3b1e (low) → #E8B44E (high)
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  const r = lerp(0x4a, 0xe8), g = lerp(0x3b, 0xb4), b2 = lerp(0x1e, 0x4e);
  return `rgb(${r},${g},${b2})`;
}
</script>
<template>
  <div class="heat-wrap">
    <table class="heat">
      <thead>
        <tr><th class="lab">Cohort</th><th>Size</th><th v-for="h in headers" :key="h">{{ h }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.label">
          <td class="lab">{{ r.label }}</td>
          <td class="sz">{{ r.size }}</td>
          <td v-for="(v, i) in r.w" :key="i" class="cell" :class="{ na: v === null }"
              :style="v === null ? {} : { background: bg(v), color: '#0C0C0C' }">
            {{ v === null ? '—' : v }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<style scoped>
.heat-wrap { overflow-x: auto; margin-top: 12px; }
.heat { border-collapse: separate; border-spacing: 3px; font-size: 11.5px; font-variant-numeric: tabular-nums; }
.heat th { color: var(--text-3); font-weight: 500; font-size: 10px; padding: 2px 4px; text-align: center; }
.heat td.lab { color: var(--text-2); text-align: left; white-space: nowrap; padding-right: 8px; }
.heat td.sz { color: var(--text-3); text-align: center; }
.heat td.cell { width: 46px; height: 30px; text-align: center; border-radius: 4px; font-weight: 600; }
.heat td.na { background: var(--raised); color: var(--text-3); }
</style>
