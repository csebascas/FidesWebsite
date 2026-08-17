# Analytics Dashboard UI (FidesWebsite) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the redesigned admin analytics dashboard — an Overview redesign plus new Retention and Engagement views and a Growth channel-quality table — reading the analytics RPCs shipped by the Fides pipeline PR.

**Architecture:** New `?view=` handlers on the existing `api/dashboard.ts` (respecting the Vercel Hobby 12-function cap — do NOT add new API function files), each calling one service-role RPC through the existing 30s in-memory cache. New Vue views under `src/views/admin/` consume those payloads and render them with a small set of hand-rolled SVG chart components (no chart library) styled with the existing dark/gold tokens in `src/style.css`.

**Tech Stack:** Vue 3 (`<script setup>` + scoped CSS), Vite, Vue Router 4, `@supabase/supabase-js` (service-role, server-side only), Vercel serverless functions.

**Spec:** `../../Fides/docs/superpowers/specs/2026-08-17-analytics-dashboard-redesign-design.md` (in the sibling Fides repo)
**Layout source of truth:** `docs/superpowers/reference/analytics-dashboard-mockup.html` (approved mockup — the section order, tiles, chart placements, and copy come from here).

## Global Constraints

- **RPC contracts are fixed** (shipped by Fides PR #70; consume them verbatim):
  - `admin_retention_data(p_days int)` → `{ headline:{d1,d7,d30,median_lifetime_days}, curve:[{day,pct}] (0..30, pct may be int), dau_mau:[{day,dau,wau,mau,stickiness}], cohorts:[{week_start,size,w:[9 numbers, some null]}] }`
  - `admin_engagement_data(p_days int)` → `{ offer_funnel:[{offer_key,placement,users_sent,users_tapped,users_converted,sent_to_tap_pct,tap_to_paid_pct}], offer_ttc_median_hours (nullable), notif_optin:[{kind,on_pct}], notif_sends:[{kind,sends}], smart_timing:{on_pct}, league:{active_competitors,promoted,relegated,cohort_fill_avg,human_vs_bot_pace (nullable)} }`
  - `admin_attribution_data(p_days int)` → `[{source,signups,d7_ret_pct (nullable),pro_conv_pct,verdict:'best'|'sticky'|'volume'|'weak'}]`
  - `admin_dashboard_data()` → existing keys + `dau,wau,mau,stickiness,today:{lessons,reviews,signups,new_pro}`
- **Nullable values render as "N/A"/"—", never as 0.** `cohorts[].w[i]`, `d7_ret_pct`, `offer_ttc_median_hours`, `league.human_vs_bot_pace` can be null by design (not-yet-measurable).
- **Package manager: `bun`.** Build gate: `bun run build` (runs `vue-tsc -b && vite build`) must pass clean.
- **Service-role only, server-side:** all RPCs are called from `api/dashboard.ts` via `getAdminClient()`; NEVER from the browser/anon client. Views fetch from `/api/dashboard?view=...`.
- **Design tokens** from `src/style.css` (`--bg #0C0C0C`, `--surface #111`, `--raised #181818`, `--line/--hair`, `--text/--text-2/--text-3`, `--gold #C4912C`, `--gold-light #E8B44E`, `--streak #D4673A`, `--serif` Playfair, `--sans` DM Sans). No new colors except semantic good/warn already used in views (`#7FB08A`/`#D4673A`). Match the scoped-CSS idiom of `AdminGrowth.vue`/`AdminRevenue.vue` (stat strips, `.bar`, funnel rows, RAG pills, `.rise` entrance). No chart library. `font-variant-numeric: tabular-nums` on figures; wide tables/heatmap in `overflow-x:auto`.
- **Copy** follows `../../Fides/md-files/FIDES_CONTENT_GUIDE.md`: no AI tics, no em dashes, sentence-case section labels, no eyebrows.
- **Read-only:** these views only display. No send/config/partner controls. The existing operational Offers/Creators tabs are NOT modified.
- Auth: every handler already sits behind `verifyAdmin`; new views are children of `/d` (guarded). No auth changes.

---

## File Structure

- **Modify** `api/dashboard.ts` — add `?view=retention`, `?view=engagement`, `?view=attribution` handlers (cached, one RPC each). `?view=default` (overview) already returns the extended `admin_dashboard_data` — no change needed there beyond confirming the new keys pass through.
- **Create** `src/components/charts/Sparkline.vue` — tiny inline SVG polyline for stat tiles.
- **Create** `src/components/charts/LineChart.vue` — SVG line/area with faint grid + endpoint dot; supports 1–2 series (retention curve, DAU/MAU).
- **Create** `src/components/charts/CohortHeatmap.vue` — the weekly cohort grid; null cells render as "—".
- **Create** `src/components/charts/FunnelBars.vue` — extracted reusable funnel-row list (label / bar / value / pct), matching the existing `.funnel` pattern.
- **Create** `src/views/admin/AdminRetention.vue` — new Retention tab.
- **Create** `src/views/admin/AdminEngagement.vue` — new Engagement tab.
- **Modify** `src/views/admin/AdminDashboard.vue` — Overview redesign (north-star tiles + DAU/MAU area + health snapshot + today).
- **Modify** `src/views/admin/AdminGrowth.vue` — add the attribution channel-quality table (move the cohort table out; cohorts now live in Retention).
- **Modify** `src/router/index.ts` — add `retention` + `engagement` child routes under `/d`.
- **Modify** `src/views/admin/AdminLayout.vue` — add Retention + Engagement to the Analytics nav group.

> **Testing reality:** this repo has no component test harness. The gate per task is `bun run build` (vue-tsc typecheck + vite build) clean, plus a visual check against the mockup by running `bun run dev:full` (Vercel dev, so `/api` works) and loading the tab. Where a task changes an API handler, verify the JSON shape with a curl against the running `dev:full` server (admin cookie required) or by asserting the RPC shape is passed through unchanged. These build+visual checks replace unit tests.

---

### Task 1: API handlers for retention / engagement / attribution

**Files:**
- Modify: `api/dashboard.ts`

**Interfaces:**
- Produces: `GET /api/dashboard?view=retention` → `admin_retention_data(30)` JSON; `?view=engagement` → `admin_engagement_data(30)`; `?view=attribution` → `admin_attribution_data(90)`. Each cached 30s, admin-gated, `Cache-Control: private, max-age=30`.

- [ ] **Step 1: Add the three handlers** following the exact pattern of the existing `growth` handler.

Insert after the `bible-path` handler block (before the `offers` block), inside the `try`:

```ts
    // ?view=retention serves the Retention tab: Day-N curve, DAU/MAU series,
    // cohort heatmap. admin_retention_data is service_role only.
    if (view === 'retention') {
      const data = await cached('retention', async () => {
        const { data, error } = await supabase.rpc('admin_retention_data', { p_days: 30 });
        if (error) throw error;
        return data;
      });
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.status(200).json(data);
    }

    // ?view=engagement serves the Engagement tab: offer funnel, notification
    // opt-in/sends, league competition. Read-only reporting.
    if (view === 'engagement') {
      const data = await cached('engagement', async () => {
        const { data, error } = await supabase.rpc('admin_engagement_data', { p_days: 30 });
        if (error) throw error;
        return data;
      });
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.status(200).json(data);
    }

    // ?view=attribution serves the Growth tab's channel-quality table.
    if (view === 'attribution') {
      const data = await cached('attribution', async () => {
        const { data, error } = await supabase.rpc('admin_attribution_data', { p_days: 90 });
        if (error) throw error;
        return data;
      });
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.status(200).json(data);
    }
```

- [ ] **Step 2: Build check**

Run: `bun run build`
Expected: passes clean (no vue-tsc/vite errors).

- [ ] **Step 3: Shape check (if `dev:full` available)**

Run the Vercel dev server (`bun run dev:full`), then with an admin session cookie:
`curl -s 'http://localhost:3000/api/dashboard?view=retention' -H "cookie: fides_admin_session=<session>" | jq 'keys'`
Expected: `["cohorts","curve","dau_mau","headline"]` (or an admin 401 if no cookie — that still proves the route resolves). If `dev:full` is impractical, note it and rely on the build check; the handler is a copy of the proven `growth` pattern.

- [ ] **Step 4: Commit**

```bash
git add api/dashboard.ts
git commit -m "feat(admin): retention/engagement/attribution API views"
```

---

### Task 2: SVG chart components

**Files:**
- Create: `src/components/charts/Sparkline.vue`, `LineChart.vue`, `CohortHeatmap.vue`, `FunnelBars.vue`

**Interfaces:**
- Produces (props consumed by Tasks 3–6):
  - `<Sparkline :points="number[]" :color="string" />` — auto-scales to its own min/max, fixed 200×34 viewBox, `preserveAspectRatio="none"`.
  - `<LineChart :series="{name,color,points:{x:number,y:number}[]}[]" :y-max="number" :x-labels="string[]" :y-labels="string[]" />` — faint grid, area fill under the first series, endpoint dots. `points` are pre-normalized value coords (component maps to viewBox).
  - `<CohortHeatmap :rows="{label:string,size:number,w:(number|null)[]}[]" :headers="string[]" />` — null cell → "—" on `--raised`; value cell → gold-scaled background.
  - `<FunnelBars :rows="{label:string,value:string,pct?:string,frac:number}[]" />` — `frac` 0..1 sets bar width; reuses the `.funnel`/`.ft`/`.fb` visual from the mockup.

- [ ] **Step 1: Write `Sparkline.vue`**

```vue
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
```

- [ ] **Step 2: Write `LineChart.vue`** — SVG with grid lines, area under first series, endpoint dots. Full component:

```vue
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
```

- [ ] **Step 3: Write `CohortHeatmap.vue`** — table with null → "—". Full component:

```vue
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
```

- [ ] **Step 4: Write `FunnelBars.vue`**

```vue
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
```

- [ ] **Step 5: Build check + commit**

Run: `bun run build` → passes.
```bash
git add src/components/charts
git commit -m "feat(admin): SVG chart components (sparkline, line, heatmap, funnel)"
```

---

### Task 3: Retention view

**Files:**
- Create: `src/views/admin/AdminRetention.vue`
- Modify: `src/router/index.ts` (add `retention` child route), `src/views/admin/AdminLayout.vue` (nav entry)

**Interfaces:**
- Consumes: `GET /api/dashboard?view=retention` (Task 1); chart components (Task 2).

- [ ] **Step 1: Write `AdminRetention.vue`** — fetch on mount, render the sections from the mockup's Retention tab (`docs/superpowers/reference/analytics-dashboard-mockup.html`, the `#retention` section): D1/D7/D30 + median-lifetime tiles; `LineChart` for the retention curve (`curve` → points `{x:day,y:pct}`, yMax 100, xLabels D0/D1/D7/D14/D30); `FunnelBars` for retention-by-attribution (from the attribution view, optional — or a simple bar list); `CohortHeatmap` for `cohorts` (headers `['W0','W1','W2','W3','W4','W6','W8']` — note: the RPC returns 9 offsets 0..8; show all 9 or map to the mockup's subset, pick 9 for fidelity). Follow the fetch/loading/error idiom of `AdminGrowth.vue` (skeleton `.rise`, error state). Nullable `median_lifetime_days`/`d7`/heatmap cells render "—".

  The data mapping (script):
```ts
// dau_mau is also used by Overview; here we only need curve + cohorts + headline.
const curveSeries = [{ name: 'ret', color: '#E8B44E', points: data.curve.map((c) => ({ x: c.day, y: c.pct ?? 0 })) }];
const cohortRows = data.cohorts.map((c) => ({ label: fmtWeek(c.week_start), size: c.size, w: c.w }));
```
  `fmtWeek` formats an ISO date to e.g. `Jul 28` (no year). Headers: `['W0','W1','W2','W3','W4','W5','W6','W7','W8']`.

- [ ] **Step 2: Add the route** — in `src/router/index.ts`, inside the `/d` children array (alongside `growth`):
```ts
{ path: 'retention', component: () => import('../views/admin/AdminRetention.vue'), meta: { requiresAuth: true } },
```
(Match the exact `meta`/shape the other admin children use — copy a sibling entry.)

- [ ] **Step 3: Add the nav entry** — in `AdminLayout.vue`, add to the analytics nav group (the array that holds Overview/Growth), after Retention's intended position:
```ts
{ to: '/d/retention', label: 'Retention' },
```
(Match the existing nav item object shape used in that file.)

- [ ] **Step 4: Build + visual check**

Run: `bun run build` → passes. Then `bun run dev:full`, log in at `/d/login`, open `/d/retention`, and compare against the mockup Retention tab: tiles, curve shape, heatmap with "—" for future cells. Confirm no console errors and the page matches the mockup layout.

- [ ] **Step 5: Commit**
```bash
git add src/views/admin/AdminRetention.vue src/router/index.ts src/views/admin/AdminLayout.vue
git commit -m "feat(admin): Retention tab (curve, cohort heatmap, DAU/MAU)"
```

---

### Task 4: Engagement view

**Files:**
- Create: `src/views/admin/AdminEngagement.vue`
- Modify: `src/router/index.ts`, `src/views/admin/AdminLayout.vue`

**Interfaces:**
- Consumes: `GET /api/dashboard?view=engagement` (Task 1); `FunnelBars` (Task 2).

- [ ] **Step 1: Write `AdminEngagement.vue`** — render the mockup's `#engagement` section: offer funnel (`FunnelBars` from `offer_funnel[0]` → sent/tapped/converted rows with pct; caption shows `offer_ttc_median_hours` or "no conversions yet" when null); notification opt-in (`FunnelBars` from `notif_optin`, each `on_pct` as `frac`/value); a small `notif_sends` list; league card (4 stat tiles: `active_competitors`, `promoted`, `relegated`, `human_vs_bot_pace` — render pace as "N/A" when null). Reuse `AdminGrowth.vue`'s card/stat/section CSS idiom. This is read-only; NO send/config controls (those stay in the existing Offers tab).

  Offer-funnel mapping (guard empty array):
```ts
const f = data.offer_funnel[0];
const offerRows = f ? [
  { label: 'Push sent',        value: String(f.users_sent),      frac: 1 },
  { label: 'Tapped',           value: String(f.users_tapped),    pct: f.sent_to_tap_pct != null ? f.sent_to_tap_pct + '%' : '', frac: f.users_sent ? f.users_tapped / f.users_sent : 0 },
  { label: 'Converted to Pro', value: String(f.users_converted), pct: f.tap_to_paid_pct != null ? f.tap_to_paid_pct + '%' : '', frac: f.users_sent ? f.users_converted / f.users_sent : 0 },
] : [];
```

- [ ] **Step 2: Route + nav** — add `engagement` child route and `{ to: '/d/engagement', label: 'Engagement' }` nav entry, same as Task 3 Steps 2–3.

- [ ] **Step 3: Build + visual check** — `bun run build` passes; `/d/engagement` matches the mockup, null pace shows "N/A", empty offer funnel degrades to an empty/placeholder state without errors.

- [ ] **Step 4: Commit**
```bash
git add src/views/admin/AdminEngagement.vue src/router/index.ts src/views/admin/AdminLayout.vue
git commit -m "feat(admin): Engagement tab (offers, notifications, leagues)"
```

---

### Task 5: Overview (Dashboard) redesign

**Files:**
- Modify: `src/views/admin/AdminDashboard.vue`

**Interfaces:**
- Consumes: `GET /api/dashboard` default (already returns `dau/wau/mau/stickiness/today` + existing keys); `Sparkline`, `LineChart` (Task 2).

- [ ] **Step 1: Add the north-star row + DAU/MAU chart + today row** to `AdminDashboard.vue`, per the mockup `#overview` section, WITHOUT removing the existing overview content the tab already shows (recent activity, content health, streak distribution — keep them below the new sections). Add:
  - A north-star stat row: DAU / WAU / MAU / stickiness tiles, each with a `Sparkline` (build the sparkline arrays from `dau_mau` if present, else omit the sparkline — the default payload may not include `dau_mau`; if it doesn't, fetch `?view=retention` for the series OR add `dau/wau/mau` point history later. For now: render the four headline numbers from `dau/wau/mau/stickiness`; show a sparkline only if a series is available).
  - A DAU-vs-MAU `LineChart` sourced from `?view=retention`'s `dau_mau` (the Overview may make a second fetch to `?view=retention` for the series, or skip the chart if you choose to keep Overview to one request — pick one and note it; simplest: one extra fetch to `?view=retention`, reuse its `dau_mau`).
  - A "today" row: `today.lessons / today.reviews / today.signups / today.new_pro` tiles.

  > **Decision to make and record in the report:** whether Overview issues a second fetch to `?view=retention` for the `dau_mau` series/sparklines, or shows only the scalar tiles. Recommended: one extra fetch to `?view=retention` (cached 30s server-side, cheap) to power the area chart + sparklines, matching the mockup.

- [ ] **Step 2: Build + visual check** — `bun run build` passes; `/d/dashboard` shows the north-star tiles + area chart + today row above the retained existing content; numbers match `admin_dashboard_data`.

- [ ] **Step 3: Commit**
```bash
git add src/views/admin/AdminDashboard.vue
git commit -m "feat(admin): Overview north-star tiles + DAU/MAU chart + today row"
```

---

### Task 6: Growth channel-quality table

**Files:**
- Modify: `src/views/admin/AdminGrowth.vue`

**Interfaces:**
- Consumes: `GET /api/dashboard?view=attribution` (Task 1).

- [ ] **Step 1: Add a channel-quality section** to `AdminGrowth.vue` per the mockup `#growth` section: a table with columns Source / Signups / D7 ret. / Pro conv. / Verdict, rows from `admin_attribution_data`. Verdict → a RAG pill using the existing pill classes (`best`→good, `sticky`→good, `volume`→gold, `weak`→warn). Nullable `d7_ret_pct` → "—". Fetch `?view=attribution` alongside the existing growth fetch (two requests, or `Promise.all`). Remove the existing weekly-cohort TABLE from this file (cohorts now live in the Retention tab) — keep the activation funnel, churn, and streak-health sections.

- [ ] **Step 2: Build + visual check** — `bun run build` passes; `/d/growth` shows the channel-quality table with correct verdict pills and "—" for null D7; the old cohort table is gone; activation/churn remain.

- [ ] **Step 3: Commit**
```bash
git add src/views/admin/AdminGrowth.vue
git commit -m "feat(admin): Growth channel-quality table; move cohorts to Retention"
```

---

## Self-Review

**Spec coverage:**
- Retention view (curves, DAU/MAU, cohort heatmap): Tasks 1, 2, 3. ✓
- Engagement view (offers, notifications, leagues), read-only: Tasks 1, 2, 4. ✓
- Overview redesign (north-star + stickiness + today): Task 5. ✓
- Growth attribution channel quality; cohort table relocated: Tasks 1, 6. ✓
- New `?view=` handlers on the shared function (12-function cap respected): Task 1. ✓
- Hand-rolled SVG charts, no library: Task 2. ✓
- Nullable-as-"—" (not 0): enforced in CohortHeatmap (Task 2), and in Tasks 3/4/6 mappings. ✓
- Read-only (non-goal): no send/config/partner controls added; existing Offers/Creators tabs untouched. ✓

**Placeholder scan:** the only intentional deferrals are the two recorded decisions (Overview second-fetch for `dau_mau`; heatmap header count 9 vs mockup's visual subset) — each has a stated recommended resolution, not a TODO. No "add error handling"/"similar to Task N".

**Type/interface consistency:** chart component prop names (`points`, `series`, `rows`, `w`, `frac`) are identical between Task 2's definitions and their consumers in Tasks 3–6. The RPC field names used in the view mappings (`users_sent`, `sent_to_tap_pct`, `d7_ret_pct`, `human_vs_bot_pace`, `today.*`) match the locked Global-Constraints contracts verbatim.

**Known risks for the executor:** (1) match each modified `.vue` file's existing fetch/loading/error idiom rather than inventing one — read the file first; (2) the router/nav object shapes must be copied from existing sibling entries (do not guess `meta`); (3) if `bun run dev:full` (Vercel dev) is unavailable in the environment, the API shape checks fall back to the build gate + the fact that the handlers are line-for-line copies of the proven `growth` handler.
