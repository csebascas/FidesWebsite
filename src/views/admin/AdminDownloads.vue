<template>
  <div class="downloads">
    <header class="head rise" style="--i: 0">
      <h1 class="page-title">Downloads</h1>
    </header>

    <!-- Stat strip -->
    <div class="statstrip rise" style="--i: 1">
      <template v-if="loading">
        <div v-for="i in 6" :key="i" class="stat">
          <div class="skeleton-number"></div>
          <div class="skeleton-label"></div>
        </div>
      </template>
      <template v-else>
        <div class="stat"><span class="n">{{ data.total ?? '—' }}</span><span class="l">Total</span></div>
        <div class="stat"><span class="n">{{ data.ios ?? '—' }}</span><span class="l">iOS</span></div>
        <div class="stat"><span class="n">{{ data.android ?? '—' }}</span><span class="l">Android</span></div>
        <div class="stat"><span class="n gold">{{ data.today ?? '—' }}</span><span class="l">Today</span></div>
        <div class="stat"><span class="n">{{ data.week ?? '—' }}</span><span class="l">This week</span></div>
        <div class="stat"><span class="n">{{ data.month ?? '—' }}</span><span class="l">This month</span></div>
      </template>
    </div>

    <!-- Chart -->
    <div class="section rise" style="--i: 2" v-if="data.daily && data.daily.length">
      <h2 class="section-title">Last 30 days</h2>
      <div class="chart-card">
        <div class="chart">
          <div class="chart-y-axis">
            <span>{{ chartMax }}</span>
            <span>{{ Math.round(chartMax / 2) }}</span>
            <span>0</span>
          </div>
          <div class="chart-bars">
            <div v-for="d in data.daily" :key="d.date" class="chart-bar-group" :title="`${d.date}: ${d.ios} iOS, ${d.android} Android`">
              <div class="chart-bar-stack">
                <div class="chart-bar bar-ios" :style="{ height: barHeight(d.ios) }"></div>
                <div class="chart-bar bar-android" :style="{ height: barHeight(d.android) }"></div>
              </div>
              <span class="chart-label">{{ d.date.slice(8) }}</span>
            </div>
          </div>
        </div>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-dot legend-ios"></span> iOS</span>
          <span class="legend-item"><span class="legend-dot legend-android"></span> Android</span>
        </div>
      </div>
    </div>

    <div class="dash-grid">
      <!-- Left column -->
      <div class="dash-col">
        <div class="section rise" style="--i: 3" v-if="data.topReferrers && data.topReferrers.length">
          <h2 class="section-title">Top Sources</h2>
          <div v-for="(r, i) in data.topReferrers" :key="r.source" class="rank">
            <span class="r">{{ Number(i) + 1 }}</span>
            <span class="rname">{{ cleanLabel(r.source) }}</span>
            <div class="bar-wrap"><div class="bar" :style="{ width: pct(r.count, data.topReferrers[0].count) + '%' }"></div></div>
            <span class="rc">{{ r.count }}</span>
          </div>
        </div>

        <div class="section rise" style="--i: 4" v-if="data.topCampaigns && data.topCampaigns.length">
          <h2 class="section-title">Campaigns</h2>
          <div v-for="(c, i) in data.topCampaigns" :key="c.campaign" class="rank">
            <span class="r">{{ Number(i) + 1 }}</span>
            <span class="rname">{{ cleanLabel(c.campaign) }}</span>
            <div class="bar-wrap"><div class="bar flame" :style="{ width: pct(c.count, data.topCampaigns[0].count) + '%' }"></div></div>
            <span class="rc">{{ c.count }}</span>
          </div>
        </div>

        <div class="section rise" style="--i: 5">
          <h2 class="section-title">Referral Link Generator</h2>
          <div class="link-gen">
            <div class="input-row">
              <label>Source</label>
              <input v-model="linkSource" placeholder="e.g. twitter, youtube, parish" />
            </div>
            <div class="input-row">
              <label>Campaign</label>
              <input v-model="linkCampaign" placeholder="e.g. launch, easter2026" />
            </div>
            <div class="generated-link" v-if="generatedLink">
              <code>{{ generatedLink }}</code>
              <button class="copy-btn" @click="copyLink">{{ copied ? 'Copied!' : 'Copy' }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div class="dash-col">
        <div class="section rise" style="--i: 3" v-if="data.topCountries && data.topCountries.length">
          <h2 class="section-title">Top Countries</h2>
          <div v-for="(c, i) in data.topCountries" :key="c.country" class="rank">
            <span class="r">{{ Number(i) + 1 }}</span>
            <span class="rname">{{ countryName(c.country) }}</span>
            <div class="bar-wrap"><div class="bar" :style="{ width: pct(c.count, data.topCountries[0].count) + '%' }"></div></div>
            <span class="rc">{{ c.count }}</span>
          </div>
        </div>

        <div class="section rise" style="--i: 4" v-if="data.topCities && data.topCities.length">
          <h2 class="section-title">Top Cities</h2>
          <div v-for="(c, i) in data.topCities.slice(0, 10)" :key="c.city" class="rank">
            <span class="r">{{ Number(i) + 1 }}</span>
            <span class="rname">{{ cityName(c.city) }}</span>
            <div class="bar-wrap"><div class="bar" :style="{ width: pct(c.count, data.topCities[0].count) + '%' }"></div></div>
            <span class="rc">{{ c.count }}</span>
          </div>
        </div>

        <div class="section rise" style="--i: 5" v-if="data.locationPins && data.locationPins.length">
          <h2 class="section-title">Download Locations</h2>
          <div class="map-card">
            <svg viewBox="0 40 800 320" class="world-map">
              <!-- Landmass (Natural Earth 110m, equirectangular) -->
              <path v-for="(p, i) in landPaths" :key="i" :d="p" fill="var(--raised)" />
              <!-- Pins -->
              <g v-for="pin in data.locationPins" :key="`${pin.lat}-${pin.lng}`">
                <circle
                  :cx="lngToX(pin.lng)"
                  :cy="latToY(pin.lat)"
                  :r="Math.min(3 + pin.count * 1.5, 12)"
                  fill="var(--gold)"
                  fill-opacity="0.55"
                  stroke="var(--gold-light)"
                  stroke-width="1"
                />
                <title>{{ cityName(pin.city) }}, {{ countryName(pin.country) }}: {{ pin.count }} downloads</title>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)
const data = ref<any>({})
const landPaths = ref<string[]>([])

const linkSource = ref('')
const linkCampaign = ref('')
const copied = ref(false)

const generatedLink = computed(() => {
  if (!linkSource.value) return ''
  const params = new URLSearchParams()
  params.set('utm_source', linkSource.value)
  params.set('utm_medium', 'referral')
  if (linkCampaign.value) params.set('utm_campaign', linkCampaign.value)
  return `https://joinfides.com/download?${params.toString()}`
})

function copyLink() {
  navigator.clipboard.writeText(generatedLink.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

const chartMax = computed(() => {
  if (!data.value.daily) return 10
  const max = Math.max(...data.value.daily.map((d: any) => d.ios + d.android), 1)
  return Math.ceil(max / 5) * 5 || 10
})

function barHeight(count: number) {
  return Math.max((count / chartMax.value) * 100, 0) + '%'
}

function pct(value: number, max: number) {
  return max ? Math.round((value / max) * 100) : 0
}

// Equirectangular projection onto the 800×400 viewBox
function lngToX(lng: number) {
  return ((lng + 180) / 360) * 800
}

function latToY(lat: number) {
  return ((90 - lat) / 180) * 400
}

// Geo values arrive URL-encoded from the tracking pixel ("Fort%20Mill")
function cleanLabel(s: string): string {
  if (!s) return s
  try { return decodeURIComponent(s) } catch { return s }
}

function cityName(s: string): string {
  return cleanLabel(s)
}

const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null

function countryName(code: string) {
  if (!code) return code
  try { return regionNames?.of(code.toUpperCase()) || code } catch { return code }
}

// Convert GeoJSON land polygons to SVG paths in our projection
function geoToPaths(geojson: any): string[] {
  const paths: string[] = []
  const ringToPath = (ring: number[][]) =>
    ring.map(([lng, lat], i) => `${i === 0 ? 'M' : 'L'}${lngToX(lng).toFixed(1)},${latToY(lat).toFixed(1)}`).join('') + 'Z'
  for (const f of geojson.features || []) {
    const g = f.geometry
    if (!g) continue
    if (g.type === 'Polygon') {
      paths.push(g.coordinates.map(ringToPath).join(''))
    } else if (g.type === 'MultiPolygon') {
      paths.push(g.coordinates.map((poly: number[][][]) => poly.map(ringToPath).join('')).join(''))
    }
  }
  return paths
}

onMounted(async () => {
  try {
    const res = await fetch('/api/downloads/stats')
    if (res.ok) {
      data.value = await res.json()
    }
  } catch { /* keep defaults */ }
  loading.value = false

  // Land outline (Natural Earth 110m via geojson.xyz) — map still renders
  // pins-on-dark if this fetch fails.
  try {
    const res = await fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_land.geojson')
    if (res.ok) landPaths.value = geoToPaths(await res.json())
  } catch { /* pins-only fallback */ }
})
</script>

<style scoped>
.downloads { max-width: 1080px; }

.rise {
  opacity: 0;
  animation: rise 0.18s ease-out forwards;
  animation-delay: calc(var(--i, 0) * 30ms);
}
@keyframes rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

.head { margin-bottom: 22px; }
.page-title { font-family: var(--serif); font-size: 23px; color: var(--text); font-weight: 600; margin: 0; }

/* Stat strip — one surface, no accent borders */
.statstrip {
  display: flex;
  background: var(--surface);
  border-radius: 10px;
  padding: 18px 0;
  margin-bottom: 26px;
}
.stat {
  flex: 1;
  padding: 0 20px;
  border-right: 0.5px solid #242424;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.stat:last-child { border-right: none; }
.stat .n { font-family: var(--sans); font-size: 24px; font-weight: 700; letter-spacing: -0.3px; color: var(--text); }
.stat .n.gold { color: var(--gold-light); }
.stat .l { font-family: var(--sans); font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text-3); }

.skeleton-number { width: 44px; height: 24px; background: var(--raised); border-radius: 4px; animation: pulse 1.5s ease-in-out infinite; }
.skeleton-label { width: 62px; height: 9px; background: var(--raised); border-radius: 3px; animation: pulse 1.5s ease-in-out infinite; animation-delay: 0.1s; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.section { margin-bottom: 26px; }
.section-title {
  font-family: var(--sans); font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.8px; color: var(--text-3); margin: 0 0 6px;
}

/* Chart — quiet surface, app palette only */
.chart-card { background: var(--surface); border-radius: 10px; padding: 18px 18px 14px; }
.chart { display: flex; gap: 8px; height: 170px; }
.chart-y-axis { display: flex; flex-direction: column; justify-content: space-between; font-family: var(--sans); font-size: 10px; color: var(--text-3); width: 28px; text-align: right; padding: 0 4px 16px 0; }
.chart-bars { display: flex; flex: 1; align-items: flex-end; gap: 2px; }
.chart-bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.chart-bar-stack { display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 18px; height: 134px; justify-content: flex-end; }
.chart-bar { width: 100%; border-radius: 1.5px 1.5px 0 0; min-height: 0; transition: height 0.25s ease-out; }
.bar-ios { background: var(--gold); }
.bar-android { background: #5C5A55; }
.chart-label { font-family: var(--sans); font-size: 9px; color: var(--text-3); }
.chart-legend { display: flex; gap: 16px; justify-content: center; margin-top: 10px; }
.legend-item { font-family: var(--sans); font-size: 11px; color: var(--text-3); display: flex; align-items: center; gap: 6px; }
.legend-dot { width: 8px; height: 8px; border-radius: 2px; }
.legend-ios { background: var(--gold); }
.legend-android { background: #5C5A55; }

/* Two-column layout */
.dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 34px; }

/* Ranked hairline rows */
.rank {
  display: flex; align-items: center; gap: 10px; padding: 8px 2px;
  border-bottom: 0.5px solid var(--line);
  font-family: var(--sans); font-size: 12px;
}
.rank:last-child { border-bottom: none; }
.r { width: 16px; text-align: center; font-size: 10.5px; font-weight: 700; color: var(--gold-light); flex-shrink: 0; }
.rname { flex: 1; color: var(--text-2); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc { width: 30px; text-align: right; font-weight: 600; color: var(--text-2); flex-shrink: 0; font-variant-numeric: tabular-nums; font-size: 11px; }
.bar-wrap { flex: 0 0 110px; height: 4px; background: var(--raised); border-radius: 2px; overflow: hidden; }
.bar { height: 100%; background: var(--gold); border-radius: 2px; transition: width 0.25s ease-out; }
.bar.flame { background: var(--streak); }

/* Link generator */
.link-gen { background: var(--surface); border-radius: 10px; padding: 16px; }
.input-row { margin-bottom: 12px; }
.input-row label { display: block; font-family: var(--sans); font-size: 10px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 5px; }
.input-row input {
  width: 100%; padding: 10px 12px; font-family: var(--sans); font-size: 13px;
  background: var(--raised); border: none; border-radius: 6px;
  color: var(--text); outline: none; box-sizing: border-box;
  transition: box-shadow 0.15s ease;
}
.input-row input:focus { box-shadow: 0 0 0 1px var(--gold); }
.input-row input::placeholder { color: var(--text-3); }
.generated-link {
  display: flex; align-items: center; gap: 8px; padding: 10px;
  background: var(--raised); border-radius: 6px; margin-top: 4px;
}
.generated-link code { flex: 1; font-size: 11px; color: var(--gold-light); word-break: break-all; }
.copy-btn {
  font-family: var(--sans); font-size: 11px; font-weight: 700;
  background: var(--gold); color: var(--bg); border: none; padding: 6px 14px;
  border-radius: 4px; cursor: pointer; flex-shrink: 0;
  transition: transform 0.12s ease;
}
.copy-btn:active { transform: scale(0.97); }

/* Map */
.map-card { background: var(--surface); border-radius: 10px; padding: 6px; overflow: hidden; }
.world-map { width: 100%; height: auto; display: block; }

@media (max-width: 900px) {
  .statstrip { flex-wrap: wrap; padding: 8px 0; }
  .stat { flex: 1 1 33%; padding: 10px 20px; border-right: none; }
  .dash-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .stat { flex: 1 1 50%; }
}
</style>
