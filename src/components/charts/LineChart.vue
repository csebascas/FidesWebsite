<script setup lang="ts">
const props = defineProps<{
  series: { name: string; color: string; points: { x: number; y: number }[] }[];
  yMax: number;
  xLabels?: string[];
  yLabels?: string[];
  height?: number;
}>();
const W = 620, PAD_L = 40, PAD_B = 22, PAD_T = 12;
const H = props.height ?? 170;
const plotH = H - PAD_B - PAD_T;
const xMax = Math.max(1, ...props.series.flatMap((s) => s.points.map((p) => p.x)));
function sx(x: number): number { return PAD_L + (x / xMax) * (W - PAD_L - 8); }
function sy(y: number): number { return PAD_T + plotH - (y / (props.yMax || 1)) * plotH; }
function line(s: { points: { x: number; y: number }[] }): string {
  return s.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
}
function area(s: { points: { x: number; y: number }[] }): string {
  if (!s.points.length) return '';
  const first = s.points[0], last = s.points[s.points.length - 1];
  return `${line(s)} L${sx(last.x).toFixed(1)},${sy(0).toFixed(1)} L${sx(first.x).toFixed(1)},${sy(0).toFixed(1)} Z`;
}
const grid = [0.25, 0.5, 0.75, 1].map((f) => PAD_T + plotH * f);
</script>
<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="lc">
    <defs>
      <linearGradient v-for="s in series" :key="s.name" :id="`fill-${s.name}`" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" :stop-color="s.color" stop-opacity="0.26" />
        <stop offset="1" :stop-color="s.color" stop-opacity="0" />
      </linearGradient>
    </defs>
    <line v-for="(gy, i) in grid" :key="i" x1="0" :x2="W" :y1="gy" :y2="gy" stroke="#1c1c1c" />
    <path :d="area(series[0])" :fill="`url(#fill-${series[0].name})`" />
    <path v-for="s in series" :key="s.name" :d="line(s)" fill="none" :stroke="s.color" stroke-width="1.8" />
    <circle v-for="s in series" :key="s.name + '-dot'"
      :cx="sx(s.points[s.points.length - 1]?.x ?? 0)" :cy="sy(s.points[s.points.length - 1]?.y ?? 0)"
      r="3" :fill="s.color" />
    <text v-for="(l, i) in (yLabels ?? [])" :key="'y' + i" x="16" :y="PAD_T + (plotH / ((yLabels!.length - 1) || 1)) * i + 4"
      fill="#5C5A55" font-size="9">{{ l }}</text>
    <text v-for="(l, i) in (xLabels ?? [])" :key="'x' + i" :x="PAD_L + ((W - PAD_L - 8) / ((xLabels!.length - 1) || 1)) * i"
      :y="H - 6" fill="#5C5A55" font-size="9">{{ l }}</text>
  </svg>
</template>
<style scoped>
.lc { width: 100%; height: auto; margin-top: 8px; }
</style>
