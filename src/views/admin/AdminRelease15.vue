<template>
  <div class="r15">
    <h1 class="page-title">Release 1.5</h1>
    <p class="subtitle">One free track per new account, the pillar picker, the one-year slider and the Pro sale. Accounts that existed before 1.5 keep the old free content and are not counted here.</p>

    <div v-if="loading" class="note">Loading…</div>
    <div v-else-if="error" class="note err">{{ error }}</div>

    <template v-else>
      <div class="statstrip">
        <div class="stat"><span class="n">{{ d.new_accounts?.total ?? 0 }}</span><span class="l">New accounts</span><span class="d">on the one-track rule</span></div>
        <div class="stat"><span class="n">{{ d.new_accounts?.with_pick ?? 0 }}</span><span class="l">Picked a pillar</span><span class="d">{{ pct(d.new_accounts?.with_pick, d.new_accounts?.total) }}% of new</span></div>
        <div class="stat"><span class="n gold">{{ d.new_accounts?.pro ?? 0 }}</span><span class="l">Pro</span><span class="d">{{ pct(d.new_accounts?.pro, d.new_accounts?.total) }}% of new</span></div>
        <div class="stat"><span class="n">{{ gate.shown }}</span><span class="l">Track gate shown</span><span class="d">{{ gate.unlocked }} unlocked · {{ d.window_days }}d</span></div>
      </div>

      <div class="section">
        <h2 class="section-title">Pillar picked</h2>
        <div v-if="!d.pillar_picks?.length" class="note small">No new accounts yet. Each account's pillar shows here once people sign up on 1.5.</div>
        <div v-else class="table-scroll">
          <table class="tbl">
            <thead><tr><th>Pillar</th><th class="num">Accounts</th><th class="num">Share</th><th class="num">Pro</th><th class="num">Pro rate</th></tr></thead>
            <tbody>
              <tr v-for="p in d.pillar_picks" :key="p.slug">
                <td class="you">{{ p.name }}</td>
                <td class="num">{{ p.accounts }}</td>
                <td class="num">{{ pct(p.accounts, d.new_accounts?.with_pick) }}%</td>
                <td class="num">{{ p.pro }}</td>
                <td class="num">{{ pct(p.pro, p.accounts) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Onboarding steps added in 1.5</h2>
        <div v-if="!newSteps.length" class="note small">No views yet for the pillar, roadmap or year steps in the last 14 days.</div>
        <div v-else class="table-scroll">
          <table class="tbl">
            <thead><tr><th>Step</th><th class="num">Viewed</th><th class="num">Stopped here</th><th class="num">Left the app</th><th class="num">Median secs</th></tr></thead>
            <tbody>
              <tr v-for="s in newSteps" :key="s.step">
                <td class="you">{{ s.name || 'Step ' + s.step }}</td>
                <td class="num">{{ s.viewed }}</td>
                <td class="num">{{ s.stopped_here }} <span class="muted">({{ pct(s.stopped_here, s.viewed) }}%)</span></td>
                <td class="num">{{ s.abandons }}</td>
                <td class="num">{{ s.median_secs ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="hint">Last 14 days. The full funnel is under Growth.</p>
      </div>

      <div class="section">
        <h2 class="section-title">Picker and slider answers</h2>
        <div v-if="!d.picker_events?.length && !d.year_minutes?.length" class="note small">Empty until the build that mirrors these events (next release after 1.5.0) is in people's hands. The pillar table above is already live.</div>
        <div v-else class="cols">
          <div class="table-scroll">
            <table class="tbl">
              <thead><tr><th>Pillar picked</th><th class="num">Devices</th></tr></thead>
              <tbody><tr v-for="p in d.picker_events" :key="p.pillar"><td class="you">{{ p.pillar }}</td><td class="num">{{ p.devices }}</td></tr></tbody>
            </table>
          </div>
          <div class="table-scroll">
            <table class="tbl">
              <thead><tr><th>Minutes a day</th><th class="num">Devices</th></tr></thead>
              <tbody><tr v-for="m in d.year_minutes" :key="m.minutes"><td class="you">{{ m.minutes }}</td><td class="num">{{ m.devices }}</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Paywalls tied to 1.5</h2>
        <div v-if="!d.paywalls?.length" class="note small">No paywall events in the last {{ d.window_days }} days.</div>
        <div v-else class="table-scroll">
          <table class="tbl">
            <thead><tr><th>Placement</th><th class="num">Shown</th><th class="num">Unlocked</th><th class="num">Dismissed</th><th class="num">Unlock rate</th></tr></thead>
            <tbody>
              <tr v-for="p in d.paywalls" :key="p.placement + p.source">
                <td class="you">{{ p.placement }}</td>
                <td class="num">{{ p.shown }}</td>
                <td class="num">{{ p.unlocked }}</td>
                <td class="num">{{ p.dismissed }}</td>
                <td class="num">{{ pct(p.unlocked, p.shown) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="hint">Track gate is a free user opening a lesson outside their free track. Unlocked includes Pro users who pass straight through, so read the rate as a ceiling. Review gate is the free review limit.</p>
      </div>

      <div class="section">
        <h2 class="section-title">Pro sale</h2>
        <div class="statstrip">
          <div class="stat"><span class="n">{{ d.sale?.popup_devices ?? 0 }}</span><span class="l">Saw the popup</span><span class="d">{{ d.sale?.popup_shown ?? 0 }} times</span></div>
          <div class="stat"><span class="n">{{ d.sale?.card_tap_devices ?? 0 }}</span><span class="l">Tapped the card</span><span class="d">{{ d.sale?.card_taps ?? 0 }} taps</span></div>
          <div class="stat"><span class="n">{{ salePaywall.shown }}</span><span class="l">Sale paywall shown</span><span class="d">{{ salePaywall.unlocked }} bought</span></div>
        </div>
        <p class="hint">The sale is off in prod until you turn it on, and the popup and card counts start with the build after 1.5.0. The sale paywall row comes from Superwall events and counts once the sale is live.</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const loading = ref(true)
const error = ref('')
const d = ref<any>({})

const NEW_STEPS = [29, 30, 31]
const newSteps = computed<any[]>(() => (d.value.onboarding?.steps ?? []).filter((s: any) => NEW_STEPS.includes(s.step)))

function sumPlacement(placement: string) {
  const rows = (d.value.paywalls ?? []).filter((p: any) => p.placement === placement)
  return {
    shown: rows.reduce((a: number, p: any) => a + Number(p.shown ?? 0), 0),
    unlocked: rows.reduce((a: number, p: any) => a + Number(p.unlocked ?? 0), 0),
  }
}
const gate = computed(() => sumPlacement('track_gate'))
const salePaywall = computed(() => sumPlacement('pro_sale'))

function pct(n: number | null | undefined, den: number | null | undefined): number {
  return den ? Math.round((Number(n ?? 0) / Number(den)) * 100) : 0
}

onMounted(async () => {
  try {
    const res = await fetch('/api/dashboard?view=release-15')
    if (!res.ok) {
      error.value = res.status === 500
        ? 'Could not load. The admin_release_15_data function may not be deployed to prod yet.'
        : 'Failed to load Release 1.5 data.'
      return
    }
    d.value = await res.json()
  } catch {
    error.value = 'Network error.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.r15 { max-width: 900px; }
.page-title { font-family: var(--serif); font-size: 24px; color: var(--text); font-weight: 700; margin: 0 0 6px; }
.subtitle { font-family: var(--sans); font-size: 13px; color: var(--text-3); margin: 0 0 22px; line-height: 1.5; }
.note { font-family: var(--sans); font-size: 13px; color: var(--text-3); padding: 20px 0; }
.note.small { padding: 8px 0; }
.note.err { color: #ff6b5e; }
.statstrip { display: flex; gap: 10px; margin-bottom: 26px; flex-wrap: wrap; }
.stat { flex: 1; min-width: 130px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 3px; }
.stat .n { font-family: var(--serif); font-size: 26px; color: var(--text); line-height: 1; }
.stat .n.gold { color: var(--gold-light); }
.stat .l { font-family: var(--sans); font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; }
.stat .d { font-family: var(--sans); font-size: 11px; color: var(--text-3); }
.section { margin-bottom: 34px; }
.section-title { font-family: var(--sans); font-size: 13px; color: var(--text-3); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 14px; }
.hint { font-family: var(--sans); font-size: 12px; color: var(--text-3); margin: 10px 0 0; line-height: 1.5; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 640px) { .cols { grid-template-columns: 1fr; } }
.table-scroll { overflow-x: auto; }
.tbl { width: 100%; border-collapse: collapse; font-family: var(--sans); font-size: 13px; }
.tbl th { background: var(--surface); color: var(--text-3); font-weight: 500; text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--line); white-space: nowrap; }
.tbl th.num, .tbl td.num { text-align: right; font-variant-numeric: tabular-nums; }
.tbl td { padding: 9px 12px; border-bottom: 1px solid var(--line); color: var(--text-2); white-space: nowrap; }
.tbl td.you { color: var(--text); font-weight: 600; }
.muted { color: var(--text-3); }
</style>
