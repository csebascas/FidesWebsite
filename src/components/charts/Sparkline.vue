<script setup lang="ts">
const props = defineProps<{ points: number[]; color?: string }>();
const W = 200, H = 34;
const stroke = props.color ?? '#C4912C';
function path(): string {
  const p = props.points;
  if (!p.length) return '';
  const min = Math.min(...p), max = Math.max(...p);
  const span = max - min || 1;
  return p
    .map((v, i) => {
      const x = (i / (p.length - 1 || 1)) * W;
      const y = H - ((v - min) / span) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
</script>
<template>
  <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="spark">
    <polyline :points="path()" fill="none" :stroke="stroke" stroke-width="1.6" />
  </svg>
</template>
<style scoped>
.spark { width: 100%; height: 34px; display: block; margin-top: 12px; }
</style>
