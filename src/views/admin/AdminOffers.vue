<template>
  <div class="offers">
    <h1 class="page-title">Offers</h1>
    <p class="subtitle">Win-back / notification offers: how many lapsed users we sent an offer to, how many tapped it, and how many re-subscribed from the deal (a purchase within 7 days of a tap).</p>

    <div v-if="loading" class="note">Loading…</div>
    <div v-else-if="error" class="note err">{{ error }}</div>
    <div v-else-if="!funnel.length" class="note">No offers sent yet. Once <code>send-daily-engagement</code> sends win-back offers to lapsed users, they show up here.</div>

    <template v-else>
      <!-- Headline totals -->
      <div class="statstrip">
        <div class="stat"><span class="n">{{ totals.sent }}</span><span class="l">Sent</span><span class="d">lapsed users nudged</span></div>
        <div class="stat"><span class="n">{{ totals.tapped }}</span><span class="l">Tapped</span><span class="d">{{ pct(totals.tapped, totals.sent) }}% of sent</span></div>
        <div class="stat"><span class="n gold">{{ totals.converted }}</span><span class="l">Re-subscribed</span><span class="d">from the deal</span></div>
        <div class="stat"><span class="n" :class="ragClass(pct(totals.converted, totals.tapped), 20, 40)">{{ pct(totals.converted, totals.tapped) }}%</span><span class="l">Tap → paid</span></div>
      </div>

      <!-- Per-offer funnel -->
      <div class="section">
        <h2 class="section-title">By offer</h2>
        <div class="table-scroll">
          <table class="tbl">
            <thead>
              <tr>
                <th>Offer</th>
                <th>Placement</th>
                <th class="num">Sent</th>
                <th class="num">Tapped</th>
                <th class="num">Converted</th>
                <th class="num">Sent → tap</th>
                <th class="num">Tap → paid</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in funnel" :key="o.offer_key">
                <td class="you">{{ o.offer_key }}</td>
                <td class="muted">{{ o.placement }}</td>
                <td class="num">{{ o.users_sent ?? 0 }}</td>
                <td class="num">{{ o.users_tapped ?? 0 }}</td>
                <td class="num you">{{ o.users_converted ?? 0 }}</td>
                <td class="num cell" :class="ragClass(o.sent_to_tap_pct, 10, 25)">{{ fmtPct(o.sent_to_tap_pct) }}</td>
                <td class="num cell" :class="ragClass(o.tap_to_paid_pct, 20, 40)">{{ fmtPct(o.tap_to_paid_pct) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="hint">Copy must match the real App Store offer attached to the <code>notification_offer</code> paywall. Only lapsed, eligible users are sent these.</p>
      </div>

      <!-- Conversions drill-down -->
      <div class="section">
        <h2 class="section-title">Recent conversions · re-subscribed after tapping</h2>
        <div v-if="!conversions.length" class="note small">No conversions attributed yet.</div>
        <div v-else class="table-scroll">
          <table class="tbl">
            <thead>
              <tr>
                <th>Offer</th>
                <th>Product</th>
                <th>Tapped</th>
                <th>Purchased</th>
                <th class="num">Time to convert</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(c, i) in conversions" :key="i">
                <td>{{ c.offer_key }}</td>
                <td class="muted">{{ c.product_id || '—' }}<span v-if="c.period_type" class="bnote"> · {{ c.period_type }}</span></td>
                <td class="muted">{{ fmtDate(c.tapped_at) }}</td>
                <td>{{ fmtDate(c.purchased_at) }}</td>
                <td class="num muted">{{ ttc(c.tapped_at, c.purchased_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface FunnelRow {
  offer_key: string
  placement: string
  users_sent: number | null
  users_tapped: number | null
  users_converted: number | null
  sent_to_tap_pct: number | null
  tap_to_paid_pct: number | null
}
interface ConversionRow {
  offer_key: string
  placement: string
  tapped_at: string
  purchased_at: string
  product_id: string | null
  period_type: string | null
}

const loading = ref(true)
const error = ref('')
const funnel = ref<FunnelRow[]>([])
const conversions = ref<ConversionRow[]>([])

const totals = computed(() => {
  const t = { sent: 0, tapped: 0, converted: 0 }
  for (const o of funnel.value) {
    t.sent += Number(o.users_sent ?? 0)
    t.tapped += Number(o.users_tapped ?? 0)
    t.converted += Number(o.users_converted ?? 0)
  }
  return t
})

function pct(n: number, d: number): number {
  return d ? Math.round((n / d) * 100) : 0
}
function fmtPct(v: number | null): string {
  return v == null ? '—' : `${v}%`
}
// Numeric RAG: green at/above the good band, amber on-par, red below.
function ragClass(v: any, mid: number, high: number): string {
  const n = Number(v)
  if (v == null || Number.isNaN(n)) return ''
  return n >= high ? 'good' : n >= mid ? 'mid' : 'bad'
}
function fmtDate(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
// Time between the tap and the purchase, in a compact "Xd Yh" / "Xh" form.
function ttc(tapped: string | null, purchased: string | null): string {
  if (!tapped || !purchased) return '—'
  const ms = new Date(purchased).getTime() - new Date(tapped).getTime()
  if (Number.isNaN(ms) || ms < 0) return '—'
  const hrs = Math.round(ms / 36e5)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  const rem = hrs % 24
  return rem ? `${days}d ${rem}h` : `${days}d`
}

onMounted(async () => {
  try {
    const res = await fetch('/api/dashboard?view=offers')
    if (!res.ok) {
      error.value =
        res.status === 500
          ? 'Could not load offers. The offer-tracking views may not be deployed to prod yet (merge the offer_tracking migration first).'
          : 'Failed to load offers data.'
      loading.value = false
      return
    }
    const d = await res.json()
    funnel.value = d.funnel ?? []
    conversions.value = d.conversions ?? []
  } catch {
    error.value = 'Network error.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.offers { max-width: 900px; }
.page-title { font-family: var(--serif); font-size: 24px; color: var(--text); font-weight: 700; margin: 0 0 6px; }
.subtitle { font-family: var(--sans); font-size: 13px; color: var(--text-3); margin: 0 0 22px; line-height: 1.5; }
.note { font-family: var(--sans); font-size: 13px; color: var(--text-3); padding: 20px 0; }
.note.small { padding: 8px 0; }
.note.err { color: #ff6b5e; }
.note code, .hint code { font-family: var(--mono, ui-monospace, monospace); font-size: 12px; color: var(--text-2); }

.statstrip { display: flex; gap: 10px; margin-bottom: 26px; flex-wrap: wrap; }
.stat { flex: 1; min-width: 130px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 3px; }
.stat .n { font-family: var(--serif); font-size: 26px; color: var(--text); line-height: 1; }
.stat .n.gold { color: var(--gold-light); }
.stat .n.good { color: #34c759; }
.stat .n.mid { color: var(--gold-light); }
.stat .n.bad { color: #D4673A; }
.stat .l { font-family: var(--sans); font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; }
.stat .d { font-family: var(--sans); font-size: 11px; color: var(--text-3); }

.section { margin-bottom: 34px; }
.section-title { font-family: var(--sans); font-size: 13px; color: var(--text-3); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 14px; }
.hint { font-family: var(--sans); font-size: 12px; color: var(--text-3); margin: 10px 0 0; line-height: 1.5; }

.table-scroll { overflow-x: auto; }
.tbl { width: 100%; border-collapse: collapse; font-family: var(--sans); font-size: 13px; }
.tbl th { background: var(--surface); color: var(--text-3); font-weight: 500; text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--line); white-space: nowrap; }
.tbl th.num, .tbl td.num { text-align: right; font-variant-numeric: tabular-nums; }
.tbl td { padding: 9px 12px; border-bottom: 1px solid var(--line); color: var(--text-2); white-space: nowrap; }
.tbl td.you { color: var(--text); font-weight: 600; }
.tbl td.muted { color: var(--text-3); }
.tbl td.cell { border-radius: 4px; }
.tbl td.cell.good { background: rgba(52,199,89,0.18); color: #4ad168; }
.tbl td.cell.mid { background: rgba(196,145,44,0.16); color: var(--gold-light); }
.tbl td.cell.bad { background: rgba(212,103,58,0.16); color: #e0805c; }
.bnote { color: var(--text-3); font-size: 11px; }
</style>
