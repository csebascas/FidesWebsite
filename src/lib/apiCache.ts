// Lightweight client-side cache for read-only dashboard endpoints.
//
// Every admin view refetched its data on each mount, so navigating tabs (or
// bouncing back to one) re-ran the same query every time — the server's 30s
// warm-instance cache helped, but each visit still paid a full round-trip.
// cachedFetch memoizes successful GET responses per URL for a short TTL, so
// tab switches within the window are instant. Only 2xx responses are cached;
// errors always re-hit the network.
//
// Drop-in shape: returns a Response-like object exposing .ok / .status /
// .json(), so call sites keep their existing `if (res.ok) { await res.json() }`.

interface CachedResponse {
  ok: boolean
  status: number
  json: () => Promise<any>
}

interface Entry {
  t: number
  ok: boolean
  status: number
  data: any
}

const store = new Map<string, Entry>()
const DEFAULT_TTL = 30_000

export async function cachedFetch(url: string, ttlMs: number = DEFAULT_TTL): Promise<CachedResponse> {
  const now = Date.now()
  const hit = store.get(url)
  if (hit && now - hit.t < ttlMs) {
    return { ok: hit.ok, status: hit.status, json: async () => hit.data }
  }

  const res = await fetch(url)
  let data: any = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  // Only cache successful responses — an error should be retried, not stuck.
  if (res.ok) {
    store.set(url, { t: now, ok: res.ok, status: res.status, data })
  }

  return { ok: res.ok, status: res.status, json: async () => data }
}

/** Drop a specific URL (or everything) from the cache — e.g. after a mutation. */
export function clearApiCache(url?: string) {
  if (url) store.delete(url)
  else store.clear()
}
