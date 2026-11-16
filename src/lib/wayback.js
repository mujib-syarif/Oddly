// Pure helpers for talking to the Internet Archive (Wayback Machine).
// Nothing in here touches the DOM, so it can be unit-tested with plain Node.

export const WAYBACK = 'https://web.archive.org';

/** Turn whatever the user typed into a clean, validated address. */
export function normalizeUrl(input) {
  let raw = String(input ?? '').trim();
  if (!raw) return { ok: false, reason: 'empty' };
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = 'https://' + raw;
  let u;
  try { u = new URL(raw); } catch { return { ok: false, reason: 'invalid' }; }
  if (!/^https?:$/.test(u.protocol)) return { ok: false, reason: 'invalid' };
  const host = u.hostname.toLowerCase();
  if (!host.includes('.') || host.endsWith('.') || /[^a-z0-9._-]/.test(host)) {
    return { ok: false, reason: 'invalid' };
  }
  const bare = host.replace(/^www\./, '');
  const path = u.pathname === '/' ? '' : u.pathname;
  return { ok: true, href: u.href, host, key: bare + path + u.search, display: bare + path + u.search };
}

/** URL of the CDX index query (one capture per month). */
export function buildCdxUrl(key, { filter200 = true, from = 1996, to = new Date().getUTCFullYear(), limit = 2000 } = {}) {
  const p = new URLSearchParams();
  p.set('url', key);
  p.set('output', 'json');
  p.set('fl', 'timestamp,original,statuscode,digest');
  if (filter200) p.append('filter', 'statuscode:200');
  p.set('collapse', 'timestamp:6');
  p.set('from', String(from));
  p.set('to', String(to));
  p.set('limit', String(limit));
  return WAYBACK + '/cdx/search/cdx?' + p.toString();
}

/** CDX answers with [header, ...rows]. Returns clean, sorted capture objects. */
export function parseCdx(data) {
  if (!Array.isArray(data) || data.length < 2 || !Array.isArray(data[0])) return [];
  const head = data[0];
  const iT = head.indexOf('timestamp');
  const iO = head.indexOf('original');
  const iS = head.indexOf('statuscode');
  const iD = head.indexOf('digest');
  if (iT < 0 || iO < 0) return [];
  const seen = new Set();
  const out = [];
  for (const r of data.slice(1)) {
    if (!Array.isArray(r)) continue;
    const ts = String(r[iT] ?? '');
    if (!/^\d{8,14}$/.test(ts)) continue;
    const timestamp = ts.padEnd(14, '0');
    if (seen.has(timestamp)) continue;
    seen.add(timestamp);
    out.push({
      timestamp,
      original: String(r[iO] ?? ''),
      status: iS >= 0 ? String(r[iS] ?? '200') : '200',
      digest: iD >= 0 ? String(r[iD] ?? '') : ''
    });
  }
  return out.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/** Flag the captures whose content differs from the previous capture. */
export function markChanges(rows) {
  let prev = null;
  return rows.map((r, i) => {
    const changed = i === 0 || !r.digest || !prev || r.digest !== prev;
    prev = r.digest || prev;
    return { ...r, changed };
  });
}

export const yearOf = (ts) => Number(ts.slice(0, 4));
export const monthOf = (ts) => Number(ts.slice(4, 6));

export function tsToMs(ts) {
  const t = String(ts).padEnd(14, '0');
  return Date.UTC(+t.slice(0, 4), +t.slice(4, 6) - 1, +t.slice(6, 8), +t.slice(8, 10), +t.slice(10, 12), +t.slice(12, 14));
}

export function msToTs(ms) {
  const d = new Date(ms);
  const z = (n, l = 2) => String(n).padStart(l, '0');
  return z(d.getUTCFullYear(), 4) + z(d.getUTCMonth() + 1) + z(d.getUTCDate()) + z(d.getUTCHours()) + z(d.getUTCMinutes()) + z(d.getUTCSeconds());
}

/** { year -> { count, changes, rows } } plus the sorted list of years. */
export function groupByYear(rows) {
  const map = new Map();
  for (const r of rows) {
    const y = yearOf(r.timestamp);
    if (!map.has(y)) map.set(y, { year: y, count: 0, changes: 0, rows: [] });
    const g = map.get(y);
    g.count++;
    if (r.changed) g.changes++;
    g.rows.push(r);
  }
  return { map, years: [...map.keys()].sort((a, b) => a - b) };
}

/** Index of the capture closest in time to `target` (ms). -1 when empty. */
export function nearestIndex(rows, targetMs) {
  if (!rows.length) return -1;
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < rows.length; i++) {
    const diff = Math.abs(tsToMs(rows[i].timestamp) - targetMs);
    if (diff < bestDiff) { best = i; bestDiff = diff; }
  }
  return best;
}

/** Best capture to show when jumping to a whole year: nearest to 30 June. */
export function pickForYear(rows, year) {
  const inYear = rows.filter((r) => yearOf(r.timestamp) === year);
  if (!inYear.length) return null;
  return inYear[nearestIndex(inYear, Date.UTC(year, 5, 30))];
}

export function snapshotUrl(timestamp, original, mode = 'if_') {
  const target = /^https?:\/\//i.test(original) ? original : 'http://' + original;
  return `${WAYBACK}/web/${timestamp}${mode}/${target}`;
}

export function formatTs(ts) {
  return { y: ts.slice(0, 4), m: ts.slice(4, 6), d: ts.slice(6, 8), hh: ts.slice(8, 10), mm: ts.slice(10, 12) };
}

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
};
export const monthName = (m, lang = 'en') => (MONTHS[lang] || MONTHS.en)[m - 1];

export function prettyDate(ts, lang = 'en') {
  const f = formatTs(ts);
  return `${Number(f.d)} ${monthName(Number(f.m), lang)} ${f.y}`;
}

const DEFAULT_PROXIES = [
  (u) => u,
  (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
  (u) => 'https://corsproxy.io/?url=' + encodeURIComponent(u)
];

async function getJson(url, fetchImpl, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    if (!text.trim()) return [];
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Look a site up in the archive.
 * Returns { rows, reachable }. `reachable` is false only when no request
 * to the archive (direct or through a proxy) succeeded at all, so the UI can
 * tell "no captures" apart from "could not connect".
 */
export async function fetchCaptures(key, { fetchImpl = globalThis.fetch, timeout = 20000, proxies = DEFAULT_PROXIES } = {}) {
  let reachable = false;
  for (const filter200 of [true, false]) {
    const target = buildCdxUrl(key, { filter200 });
    for (const wrap of proxies) {
      try {
        const data = await getJson(wrap(target), fetchImpl, timeout);
        reachable = true;
        const rows = markChanges(parseCdx(data));
        if (rows.length) return { rows, reachable: true };
        break; // archive answered but had nothing: relax the filter instead of trying proxies
      } catch { /* try the next route */ }
    }
    if (!reachable) break;
  }
  // Last resort: the "closest snapshot" API only knows one capture, still better than nothing.
  for (const wrap of proxies) {
    try {
      const api = 'https://archive.org/wayback/available?url=' + encodeURIComponent(key);
      const data = await getJson(wrap(api), fetchImpl, Math.min(timeout, 10000));
      reachable = true;
      const snap = data?.archived_snapshots?.closest;
      if (snap?.timestamp && snap?.url) {
        const original = String(snap.url).replace(/^https?:\/\/web\.archive\.org\/web\/\d+(?:[a-z_]+)?\//i, '');
        return { rows: markChanges([{ timestamp: String(snap.timestamp).padEnd(14, '0'), original, status: String(snap.status || 200), digest: '' }]), reachable: true };
      }
      break;
    } catch { /* next */ }
  }
  return { rows: [], reachable };
}

export const CLASSICS = [
  'google.com', 'apple.com', 'nasa.gov', 'wikipedia.org', 'yahoo.com', 'amazon.com', 'bbc.com',
  'cnn.com', 'microsoft.com', 'ebay.com', 'craigslist.org', 'whitehouse.gov', 'mozilla.org',
  'netflix.com', 'stackoverflow.com', 'github.com', 'imdb.com', 'espn.com', 'nytimes.com', 'archive.org'
];
