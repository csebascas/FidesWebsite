<template>
  <div class="downloads">
    <h1 class="page-title">Downloads</h1>

    <!-- Stats grid -->
    <div class="stats-grid">
      <div v-if="loading" v-for="i in 6" :key="i" class="stat-card skeleton">
        <div class="skeleton-number"></div>
        <div class="skeleton-label"></div>
      </div>
      <template v-if="!loading">
        <div class="stat-card accent">
          <span class="stat-number">{{ data.total ?? '—' }}</span>
          <span class="stat-label">Total Downloads</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ data.ios ?? '—' }}</span>
          <span class="stat-label">iOS</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ data.android ?? '—' }}</span>
          <span class="stat-label">Android</span>
        </div>
        <div class="stat-card accent">
          <span class="stat-number">{{ data.today ?? '—' }}</span>
          <span class="stat-label">Today</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ data.week ?? '—' }}</span>
          <span class="stat-label">This Week</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ data.month ?? '—' }}</span>
          <span class="stat-label">This Month</span>
        </div>
      </template>
    </div>

    <!-- Chart -->
    <div class="section" v-if="data.daily && data.daily.length">
      <h2 class="section-title">Downloads — Last 30 Days</h2>
      <div class="chart-container">
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
        <!-- Referrers -->
        <div class="section" v-if="data.topReferrers && data.topReferrers.length">
          <h2 class="section-title">Top Sources</h2>
          <div class="top-list">
            <div v-for="(r, i) in data.topReferrers" :key="r.source" class="top-row">
              <span class="top-rank">{{ i + 1 }}</span>
              <span class="top-name">{{ r.source }}</span>
              <div class="bar-wrap"><div class="bar" :style="{ width: pct(r.count, data.topReferrers[0].count) + '%' }"></div></div>
              <span class="top-count">{{ r.count }}</span>
            </div>
          </div>
        </div>

        <!-- Campaigns -->
        <div class="section" v-if="data.topCampaigns && data.topCampaigns.length">
          <h2 class="section-title">Campaigns</h2>
          <div class="top-list">
            <div v-for="(c, i) in data.topCampaigns" :key="c.campaign" class="top-row">
              <span class="top-rank">{{ i + 1 }}</span>
              <span class="top-name">{{ c.campaign }}</span>
              <div class="bar-wrap"><div class="bar bar-campaign" :style="{ width: pct(c.count, data.topCampaigns[0].count) + '%' }"></div></div>
              <span class="top-count">{{ c.count }}</span>
            </div>
          </div>
        </div>

        <!-- Share link generator -->
        <div class="section">
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
        <!-- Countries -->
        <div class="section" v-if="data.topCountries && data.topCountries.length">
          <h2 class="section-title">Top Countries</h2>
          <div class="top-list">
            <div v-for="(c, i) in data.topCountries" :key="c.country" class="top-row">
              <span class="top-rank">{{ i + 1 }}</span>
              <span class="top-name">{{ countryName(c.country) }}</span>
              <div class="bar-wrap"><div class="bar bar-geo" :style="{ width: pct(c.count, data.topCountries[0].count) + '%' }"></div></div>
              <span class="top-count">{{ c.count }}</span>
            </div>
          </div>
        </div>

        <!-- Cities -->
        <div class="section" v-if="data.topCities && data.topCities.length">
          <h2 class="section-title">Top Cities</h2>
          <div class="top-list">
            <div v-for="(c, i) in data.topCities.slice(0, 10)" :key="c.city" class="top-row">
              <span class="top-rank">{{ i + 1 }}</span>
              <span class="top-name">{{ c.city }}</span>
              <div class="bar-wrap"><div class="bar bar-geo" :style="{ width: pct(c.count, data.topCities[0].count) + '%' }"></div></div>
              <span class="top-count">{{ c.count }}</span>
            </div>
          </div>
        </div>

        <!-- Map -->
        <div class="section" v-if="data.locationPins && data.locationPins.length">
          <h2 class="section-title">Download Locations</h2>
          <div class="map-container">
            <svg viewBox="0 0 800 400" class="world-map">
              <!-- Simplified world outline -->
              <rect x="0" y="0" width="800" height="400" fill="var(--surface)" rx="8" />
              <line v-for="i in 7" :key="'h'+i" :x1="0" :y1="i*57" :x2="800" :y2="i*57" stroke="var(--line)" stroke-width="0.5" />
              <line v-for="i in 15" :key="'v'+i" :x1="i*53" :y1="0" :x2="i*53" :y2="400" stroke="var(--line)" stroke-width="0.5" />
              <!-- Pins -->
              <g v-for="pin in data.locationPins" :key="`${pin.lat}-${pin.lng}`">
                <circle
                  :cx="lngToX(pin.lng)"
                  :cy="latToY(pin.lat)"
                  :r="Math.min(3 + pin.count * 1.5, 14)"
                  fill="var(--gold)"
                  fill-opacity="0.6"
                  stroke="var(--gold-light)"
                  stroke-width="1"
                />
                <title>{{ pin.city }}, {{ pin.country }}: {{ pin.count }} downloads</title>
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

function lngToX(lng: number) {
  return ((lng + 180) / 360) * 800
}

function latToY(lat: number) {
  return ((90 - lat) / 180) * 400
}

const countryNames: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
  DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain', BR: 'Brazil',
  MX: 'Mexico', PH: 'Philippines', IN: 'India', NG: 'Nigeria', PL: 'Poland',
  IE: 'Ireland', PT: 'Portugal', AR: 'Argentina', CO: 'Colombia', CL: 'Chile',
  PE: 'Peru', KE: 'Kenya', ZA: 'South Africa', NL: 'Netherlands', BE: 'Belgium',
  AT: 'Austria', CH: 'Switzerland', HR: 'Croatia', CZ: 'Czech Republic',
  SK: 'Slovakia', HU: 'Hungary', RO: 'Romania', UA: 'Ukraine', KR: 'South Korea',
  JP: 'Japan', SG: 'Singapore', MY: 'Malaysia', ID: 'Indonesia', NZ: 'New Zealand',
}

function countryName(code: string) {
  return countryNames[code] || code
}

onMounted(async () => {
  try {
    const res = await fetch('/api/downloads/stats')
    if (res.ok) {
      data.value = await res.json()
    }
  } catch { /* keep defaults */ }
  loading.value = false
})
</script>

<style scoped>
.downloads { max-width: 1100px; }
.page-title { font-family: var(--serif); font-size: 24px; color: var(--text); font-weight: 700; margin: 0 0 24px; }

/* Stats */
.stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
.stat-card {
  background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
  padding: 18px; display: flex; flex-direction: column; gap: 4px;
}
.stat-card.accent { border-left: 3px solid var(--gold); }
.stat-number { font-family: var(--sans); font-size: 24px; font-weight: 700; color: var(--text); }
.stat-label { font-family: var(--sans); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-3); }
.stat-card.skeleton { min-height: 80px; }
.skeleton-number { width: 50px; height: 24px; background: var(--raised); border-radius: 4px; animation: pulse 1.5s ease-in-out infinite; }
.skeleton-label { width: 70px; height: 10px; background: var(--raised); border-radius: 3px; animation: pulse 1.5s ease-in-out infinite; animation-delay: 0.1s; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

/* Chart */
.chart-container { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 20px; }
.chart { display: flex; gap: 8px; height: 180px; }
.chart-y-axis { display: flex; flex-direction: column; justify-content: space-between; font-family: var(--sans); font-size: 10px; color: var(--text-3); width: 28px; text-align: right; padding: 0 4px 16px 0; }
.chart-bars { display: flex; flex: 1; align-items: flex-end; gap: 2px; }
.chart-bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.chart-bar-stack { display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 20px; height: 140px; justify-content: flex-end; }
.chart-bar { width: 100%; border-radius: 2px 2px 0 0; min-height: 0; transition: height 0.3s; }
.bar-ios { background: var(--gold); }
.bar-android { background: #5B8DEF; }
.chart-label { font-family: var(--sans); font-size: 9px; color: var(--text-3); }
.chart-legend { display: flex; gap: 16px; justify-content: center; margin-top: 12px; }
.legend-item { font-family: var(--sans); font-size: 11px; color: var(--text-3); display: flex; align-items: center; gap: 6px; }
.legend-dot { width: 8px; height: 8px; border-radius: 2px; }
.legend-ios { background: var(--gold); }
.legend-android { background: #5B8DEF; }

/* Two-column layout */
.dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 28px; }
.section { margin-bottom: 28px; }
.section-title { font-family: var(--sans); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-3); margin: 0 0 10px; }

/* Top lists */
.top-list { display: flex; flex-direction: column; gap: 2px; }
.top-row {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  background: var(--surface); border-radius: 6px; font-family: var(--sans); font-size: 12px;
}
.top-rank { font-weight: 700; color: var(--gold-light); width: 18px; text-align: center; flex-shrink: 0; }
.top-name { flex: 1; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.top-count { font-weight: 600; color: var(--text); width: 32px; text-align: right; flex-shrink: 0; }
.bar-wrap { flex: 1; height: 6px; background: var(--raised); border-radius: 3px; overflow: hidden; max-width: 120px; }
.bar { height: 100%; background: var(--gold); border-radius: 3px; transition: width 0.3s; }
.bar-geo { background: #5B8DEF; }
.bar-campaign { background: #D4673A; }

/* Link generator */
.link-gen { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 16px; }
.input-row { margin-bottom: 12px; }
.input-row label { display: block; font-family: var(--sans); font-size: 11px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.input-row input {
  width: 100%; padding: 8px 10px; font-family: var(--sans); font-size: 13px;
  background: var(--raised); border: 1px solid var(--line); border-radius: 6px;
  color: var(--text); outline: none; box-sizing: border-box;
}
.input-row input:focus { border-color: var(--gold); }
.input-row input::placeholder { color: var(--text-3); }
.generated-link {
  display: flex; align-items: center; gap: 8px; padding: 10px;
  background: var(--raised); border-radius: 6px; margin-top: 4px;
}
.generated-link code { flex: 1; font-size: 11px; color: var(--gold-light); word-break: break-all; }
.copy-btn {
  font-family: var(--sans); font-size: 11px; font-weight: 600;
  background: var(--gold); color: var(--bg); border: none; padding: 6px 14px;
  border-radius: 4px; cursor: pointer; flex-shrink: 0;
}
.copy-btn:hover { opacity: 0.88; }

/* Map */
.map-container { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 12px; }
.world-map { width: 100%; height: auto; display: block; }

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: repeat(3, 1fr); }
  .dash-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
