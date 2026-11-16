import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeUrl, buildCdxUrl, parseCdx, markChanges, groupByYear, nearestIndex, pickForYear,
  snapshotUrl, tsToMs, msToTs, fetchCaptures, prettyDate
} from '../src/lib/wayback.js';
import { parseHash, buildHash } from '../src/lib/router.js';
import { makeFmt } from '../src/lib/format.js';
import {
  SCENARIOS, SCENARIO_BY_ID, defaultsOf, paramsFromQuery, paramsToQuery,
  moonModel, rotationModel, tunnelModel, populationModel, simulateCooling, coolingAt, sectorImpact, overallImpact, PHYS
} from '../src/lib/scenarios.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b} ± ${tol}, got ${a}`);

// ───────────── Wayback client ─────────────
test('normalizeUrl accepts bare domains and strips www for the CDX key', () => {
  const r = normalizeUrl('  www.Google.com  ');
  assert.equal(r.ok, true);
  assert.equal(r.href, 'https://www.google.com/');
  assert.equal(r.key, 'google.com');
  assert.equal(normalizeUrl('https://example.org/a/b?x=1').key, 'example.org/a/b?x=1');
});

test('normalizeUrl rejects junk', () => {
  for (const bad of ['', '   ', 'localhost', 'ftp://x.com', 'not a url', 'a b.com']) assert.equal(normalizeUrl(bad).ok, false, bad);
});

test('buildCdxUrl uses a real filter param and monthly collapse', () => {
  const u = new URL(buildCdxUrl('google.com', { to: 2026 }));
  assert.equal(u.origin + u.pathname, 'https://web.archive.org/cdx/search/cdx');
  assert.equal(u.searchParams.get('url'), 'google.com');
  assert.equal(u.searchParams.get('collapse'), 'timestamp:6');
  assert.deepEqual(u.searchParams.getAll('filter'), ['statuscode:200']);
  assert.equal(u.searchParams.get('filter2'), null);
  assert.deepEqual(new URL(buildCdxUrl('a.com', { filter200: false })).searchParams.getAll('filter'), []);
});

const CDX = [
  ['timestamp', 'original', 'statuscode', 'digest'],
  ['20010615120000', 'http://www.google.com:80/', '200', 'AAA'],
  ['20010715120000', 'http://www.google.com:80/', '200', 'AAA'],
  ['20020101000000', 'http://www.google.com/', '200', 'BBB'],
  ['2003010100', 'http://www.google.com/', '200', 'CCC'],
  ['bad', 'x', '200', 'Z'],
  ['20010615120000', 'dup', '200', 'DUP']
];

test('parseCdx cleans, pads, dedupes and sorts', () => {
  const rows = parseCdx(CDX);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].timestamp, '20010615120000');
  assert.equal(rows[3].timestamp, '20030101000000');
  assert.deepEqual(parseCdx([]), []);
  assert.deepEqual(parseCdx([['timestamp']]), []);
  assert.deepEqual(parseCdx({}), []);
});

test('markChanges flags only content changes', () => {
  const rows = markChanges(parseCdx(CDX));
  assert.deepEqual(rows.map((r) => r.changed), [true, false, true, true]);
});

test('groupByYear / nearestIndex / pickForYear', () => {
  const rows = markChanges(parseCdx(CDX));
  const { years, map } = groupByYear(rows);
  assert.deepEqual(years, [2001, 2002, 2003]);
  assert.equal(map.get(2001).count, 2);
  assert.equal(map.get(2001).changes, 1);
  assert.equal(rows[nearestIndex(rows, Date.UTC(2001, 6, 1))].timestamp, '20010715120000');
  assert.equal(rows[nearestIndex(rows, Date.UTC(2002, 5, 1))].timestamp, '20020101000000');
  assert.equal(pickForYear(rows, 2001).timestamp, '20010615120000');
  assert.equal(pickForYear(rows, 1999), null);
  assert.equal(nearestIndex([], 0), -1);
});

test('timestamp helpers round-trip', () => {
  assert.equal(msToTs(tsToMs('20010615123456')), '20010615123456');
  assert.equal(prettyDate('20010615120000', 'id'), '15 Jun 2001');
});

test('snapshotUrl builds an embeddable replay URL', () => {
  assert.equal(snapshotUrl('20010615120000', 'http://www.google.com/'), 'https://web.archive.org/web/20010615120000if_/http://www.google.com/');
  assert.equal(snapshotUrl('20010615120000', 'www.google.com', ''), 'https://web.archive.org/web/20010615120000/http://www.google.com');
});

function fakeFetch(handler) {
  return async (url) => {
    const out = handler(String(url));
    if (out instanceof Error) throw out;
    return { ok: out.ok !== false, status: out.status || 200, text: async () => out.body };
  };
}
const direct = [(u) => u];

test('fetchCaptures returns rows from the first working route', async () => {
  const res = await fetchCaptures('google.com', { fetchImpl: fakeFetch(() => ({ body: JSON.stringify(CDX) })), proxies: direct });
  assert.equal(res.reachable, true);
  assert.equal(res.rows.length, 4);
});

test('fetchCaptures relaxes the filter when the first answer is empty', async () => {
  const calls = [];
  const res = await fetchCaptures('google.com', {
    proxies: direct,
    fetchImpl: fakeFetch((u) => { calls.push(u); return { body: u.includes('filter=') ? '[]' : JSON.stringify(CDX) }; })
  });
  assert.equal(res.rows.length, 4);
  assert.equal(calls.length, 2);
});

test('fetchCaptures reports unreachable only when every route fails', async () => {
  const res = await fetchCaptures('google.com', { proxies: direct, fetchImpl: fakeFetch(() => new Error('offline')) });
  assert.equal(res.reachable, false);
  assert.deepEqual(res.rows, []);
});

test('fetchCaptures falls back through proxies and to the availability API', async () => {
  const proxies = [(u) => 'https://bad.example/?u=' + encodeURIComponent(u), (u) => u];
  const res = await fetchCaptures('google.com', {
    proxies,
    fetchImpl: fakeFetch((u) => {
      if (u.startsWith('https://bad.example')) return new Error('blocked');
      if (u.includes('/cdx/')) return { body: '' };
      return { body: JSON.stringify({ archived_snapshots: { closest: { status: '200', timestamp: '20050101000000', url: 'http://web.archive.org/web/20050101000000/http://google.com/' } } }) };
    })
  });
  assert.equal(res.reachable, true);
  assert.equal(res.rows.length, 1);
  assert.equal(res.rows[0].original, 'http://google.com/');
});

// ───────────── router & formatting ─────────────
test('router round-trips pages and params', () => {
  const h = buildHash('whatif', 'moon', { dist: 0.5, empty: '', mass: 0 });
  assert.equal(h, '#/whatif/moon?dist=0.5&mass=0');
  const r = parseHash(h);
  assert.deepEqual(r, { page: 'whatif', id: 'moon', params: { dist: '0.5', mass: '0' } });
  assert.equal(parseHash('').page, 'home');
  assert.equal(buildHash('home'), '#/');
  assert.equal(parseHash('#/time?u=a.com%2Fx').params.u, 'a.com/x');
});

test('formatter handles both languages', () => {
  const en = makeFmt('en'), id = makeFmt('id');
  assert.equal(en.big(8.2e9), '8.2 billion');
  assert.equal(id.big(8.2e9), '8,2 miliar');
  assert.equal(en.dur(499), '8.3 min');
  assert.equal(id.dur(86400 * 3), '3 hari');
  assert.equal(id.dur(86400 * 2.5), '2,5 hari');
  assert.equal(en.n(NaN), '—');
});

// ───────────── physics ─────────────
test('light delay and Earth orbital speed', () => {
  near(PHYS.AU / PHYS.C, 499, 0.1, 'light delay');
});

test('tunnel: ~42.2 min through Earth, independent of chord length', () => {
  const full = tunnelModel({ body: 'earth', chord: 100 });
  near(full.oneWay / 60, 42.2, 0.2, 'one-way minutes');
  near(full.vMax / 1000, 7.9, 0.05, 'top speed km/s');
  near(full.aStart / (3.986004418e14 / 6.371e6 ** 2), 1, 1e-9, 'starts at 1 g');
  const short = tunnelModel({ body: 'earth', chord: 20 });
  near(short.oneWay, full.oneWay, 1e-6, 'same time for any chord');
  assert.ok(short.vMax < full.vMax);
  near(tunnelModel({ body: 'moon', chord: 100 }).oneWay / 60, 54.2, 0.3, 'moon');
});

test('rotation: breakup near 84.5 min and today’s day gives sidereal 86164 s', () => {
  const today = rotationModel({ hours: 24 });
  near(today.Tsid, 86164.1, 0.5, 'sidereal day');
  near(today.weight, 100, 1e-3, 'weight today');
  near(today.vEq * 3.6, 1674, 5, 'equator km/h');
  near(today.geoAltKm, 35786, 150, 'geostationary altitude');
  near(today.daysPerYear, 365.25, 0.3, 'days per year');
  near(rotationModel({ hours: 24 }).breakupHours * 60, 84.5, 0.3, 'breakup minutes');
  assert.ok(rotationModel({ hours: 1.7 }).weight < 40);
  assert.ok(rotationModel({ hours: 6 }).weight < 100 && rotationModel({ hours: 6 }).weight > 80);
  assert.ok(rotationModel({ hours: 72 }).weight > 100);
});

test('moon: today is the reference, tides follow 1/d³, Roche ≈ 18,400 km', () => {
  const now = moonModel({ dist: 1, mass: 1 });
  near(now.spring, 1, 1e-9, 'spring');
  near(now.periodDays, 27.3, 0.1, 'sidereal month');
  near(now.angular, 0.518, 0.01, 'angular size');
  near(now.roche / 1000, 18400, 400, 'roche');
  const half = moonModel({ dist: 0.5, mass: 1 });
  near(half.tide, 8, 1e-9, 'tide ×8');
  assert.ok(half.periodDays < 10.5 && half.periodDays > 9);
  near(moonModel({ dist: 1, mass: 0 }).spring, 0.46 / 1.46, 1e-9, 'no moon');
  assert.equal(moonModel({ dist: 1, mass: 0 }).periodDays, null);
  assert.equal(moonModel({ dist: 0.04, mass: 1 }).inRoche, true);
  assert.equal(moonModel({ dist: 0.5, mass: 1 }).inRoche, false);
});

test('population: today fits, 100B at today’s farming does not', () => {
  const today = populationModel({ pop: 8.2, city: 10, yield: 100, plant: 0 });
  near(today.agNeed, 48, 1e-9);
  assert.ok(today.usedPct < 100);
  const big = populationModel({ pop: 100, city: 10, yield: 100, plant: 0 });
  assert.ok(big.usedPct > 400);
  near(big.waterPct, (100 * 488) / 42000 * 100, 1e-9);
  const opt = populationModel({ pop: 100, city: 10, yield: 400, plant: 100 });
  assert.ok(opt.usedPct < big.usedPct / 10);
  near(populationModel({ pop: 8.2, city: 10, yield: 100, plant: 0 }).capacity, 8.2 * 0.9 * 104 / 48 * 1, 0.01);
});

test('sun: gravity/light delay and cooling behave sensibly', () => {
  const sim = simulateCooling({ eps: 0.61, depth: 100 });
  near(coolingAt(sim, 0).l, 288.15, 1e-9);
  const week = coolingAt(sim, 7 * 86400);
  assert.ok(week.l < 288.15 && week.l > 260, 'land after a week');
  assert.ok(week.o > week.l, 'ocean holds heat longer than land');
  assert.ok(sim.landFreeze > 86400 && sim.landFreeze < 86400 * 120, 'land freezes in days–months: ' + sim.landFreeze);
  const monotone = sim.TL.every((v, i, a) => i === 0 || v <= a[i - 1] + 1e-9);
  assert.ok(monotone, 'land temperature never rises');
  assert.ok(sim.TO.every((v) => v >= 271.35 - 1e-9), 'ocean floor');
  const deep = simulateCooling({ eps: 0.61, depth: 400 });
  assert.ok(deep.oceanFreeze === null || deep.oceanFreeze > sim.oceanFreeze, 'deeper warm layer lasts longer');
});

test('internet: impact grows with days and dependence, preparedness helps', () => {
  const s = SCENARIO_BY_ID.internet;
  assert.ok(overallImpact(1, 70, 30) < overallImpact(7, 70, 30));
  assert.ok(overallImpact(3, 90, 30) > overallImpact(3, 40, 30));
  assert.ok(overallImpact(3, 70, 90) < overallImpact(3, 70, 0));
  assert.equal(s.params.length, 3);
  assert.ok(sectorImpact({ s: 1, tau: 1, mit: 0 }, 100, 100, 0) <= 100);
});

// ───────────── every scenario, every language, extreme inputs ─────────────
test('every scenario computes cleanly for defaults, extremes and both languages', () => {
  for (const sc of SCENARIOS) {
    const variants = [defaultsOf(sc)];
    for (const x of sc.params) {
      if (x.type === 'choice') continue;
      variants.push({ ...defaultsOf(sc), [x.key]: x.min }, { ...defaultsOf(sc), [x.key]: x.max });
    }
    if (sc.id === 'tunnel') for (const o of sc.params[0].options) variants.push({ ...defaultsOf(sc), body: o.v });
    for (const pr of sc.presets) variants.push({ ...defaultsOf(sc), ...pr.set });
    for (const lang of ['en', 'id']) {
      const f = { ...makeFmt(lang), lang };
      for (const v of variants) {
        const out = sc.compute(v, lang);
        const where = `${sc.id}/${lang}/${JSON.stringify(v)}`;
        assert.ok(out.stage && out.stage.title && out.stage.text, 'stage ' + where);
        assert.ok(out.metrics.length >= 4, 'metrics ' + where);
        for (const m of out.metrics) {
          assert.equal(typeof m.value, 'string', 'metric value ' + where);
          assert.ok(!/NaN|undefined|Infinity/.test(m.value + (m.sub || '') + m.label), `bad text "${m.label}: ${m.value} ${m.sub}" in ${where}`);
        }
        assert.ok(!/NaN|undefined|\[object/.test(JSON.stringify(out.stage) + JSON.stringify(out.steps)), 'text ' + where);
        for (const c of out.charts || []) {
          for (const s of c.series) for (const pt of s.points) assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.y), `chart point ${where}`);
        }
        for (const x of sc.params) if (x.show) assert.ok(!/NaN/.test(x.show(v[x.key], f)), 'show ' + where);
      }
    }
  }
});

test('param query round-trip is lossless and clamped', () => {
  for (const sc of SCENARIOS) {
    const d = defaultsOf(sc);
    assert.deepEqual(paramsToQuery(sc, d), {});
    assert.deepEqual(paramsFromQuery(sc, {}), d);
  }
  const moon = SCENARIO_BY_ID.moon;
  assert.deepEqual(paramsFromQuery(moon, { dist: '99', mass: 'abc' }), { dist: 3, mass: 1 });
  assert.deepEqual(paramsToQuery(moon, { dist: 1, mass: 1 }), { dist: 1 });
  const tun = SCENARIO_BY_ID.tunnel;
  assert.equal(paramsFromQuery(tun, { body: 'pluto' }).body, 'earth');
  assert.equal(paramsFromQuery(tun, { body: 'mars' }).body, 'mars');
});
