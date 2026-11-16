// The What If Machine: six thought experiments, each backed by a small, transparent model.
// Every compute() is pure (params in, display data out) so it is unit-tested in Node.
import { makeFmt } from './format.js';

const L = (en, id) => ({ en, id });
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const logSpace = (a, b, n) => Array.from({ length: n }, (_, i) => a * Math.pow(b / a, i / (n - 1)));

// ───────────────────────────── physical constants ─────────────────────────────
export const PHYS = {
  G: 6.674e-11,
  SIGMA: 5.670374419e-8,
  AU: 1.495978707e11,
  C: 299792458,
  GM_EARTH: 3.986004418e14,
  R_EARTH_EQ: 6378137,
  M_EARTH: 5.972e24,
  M_MOON: 7.342e22,
  R_MOON: 1737.4e3,
  D_MOON: 384400e3,
  YEAR_SID: 365.25636 * 86400,
  SIDEREAL_DAY: 86164.0905,
  YEAR_S: 3.1536e7,
  V_ORBIT: 29780
};

// ─────────────────────────── 1. 100 billion humans ───────────────────────────
const POP = { HAB: 104, AG: 48, REF: 8.2, WATER_PP: 488, WATER_RENEW: 42000, ENERGY_PP: 76, SUN_EJ: 5.5e6 };

export function populationModel(p) {
  const dietFactor = 1 - 0.76 * (p.plant / 100);
  const cityLand = POP.HAB * (p.city / 100);
  const agNeed = POP.AG * (p.pop / POP.REF) * dietFactor / (p.yield / 100);
  const used = cityLand + agNeed;
  const usedPct = (used / POP.HAB) * 100;
  const capacity = (POP.HAB * (1 - p.city / 100) * POP.REF * (p.yield / 100)) / (POP.AG * dietFactor);
  const density = (p.pop * 1e9) / (cityLand * 1e6);
  const waterKm3 = p.pop * POP.WATER_PP;
  const waterPct = (waterKm3 / POP.WATER_RENEW) * 100;
  const energyEJ = p.pop * POP.ENERGY_PP;
  const sunPct = (energyEJ / POP.SUN_EJ) * 100;
  return { dietFactor, cityLand, agNeed, used, usedPct, capacity, density, waterKm3, waterPct, energyEJ, sunPct, m2pp: (cityLand * 1e12) / (p.pop * 1e9) };
}

const population = {
  id: 'population',
  accent: '#9b8cff',
  minutes: 4,
  category: L('HUMANITY', 'KEMANUSIAAN'),
  title: L('What if 100 billion people lived on Earth?', 'Bagaimana jika 100 miliar manusia hidup di Bumi?'),
  short: L('100 billion humans', '100 miliar manusia'),
  intro: L(
    'Today there are about 8.2 billion of us. Change the population, the way we farm and eat, and how much land goes to cities. Watch which limit breaks first.',
    'Saat ini kita sekitar 8,2 miliar orang. Ubah jumlah penduduk, cara bertani dan makan, serta lahan untuk kota. Lihat batas mana yang jebol lebih dulu.'
  ),
  params: [
    { key: 'pop', label: L('Human population', 'Jumlah penduduk'), min: 8.2, max: 100, step: 0.1, def: 100, show: (v, f) => f.n(v, 1) + (f.lang === 'id' ? ' miliar' : ' billion') },
    { key: 'city', label: L('Habitable land used for cities', 'Lahan layak huni untuk kota'), min: 1, max: 60, step: 1, def: 10, show: (v, f) => f.pct(v) },
    { key: 'yield', label: L('Farming productivity (today = 100%)', 'Produktivitas pertanian (sekarang = 100%)'), min: 50, max: 500, step: 10, def: 100, show: (v, f) => f.pct(v) },
    { key: 'plant', label: L('People on plant-based diets', 'Orang dengan pola makan nabati'), min: 0, max: 100, step: 5, def: 0, show: (v, f) => f.pct(v) }
  ],
  presets: [
    { label: L('Today', 'Sekarang'), set: { pop: 8.2, city: 10, yield: 100, plant: 0 } },
    { label: L('100B, same farming', '100 miliar, pertanian sama'), set: { pop: 100, city: 10, yield: 100, plant: 0 } },
    { label: L('100B, everything optimised', '100 miliar, semua dioptimalkan'), set: { pop: 100, city: 10, yield: 400, plant: 100 } }
  ],
  compute(p, lang) {
    const f = { ...makeFmt(lang), lang };
    const t = (en, id) => (lang === 'id' ? id : en);
    const m = populationModel(p);
    const room = POP.HAB - m.cityLand;
    const stage = m.usedPct > 100
      ? { tone: 'bad', title: t('Land runs out', 'Lahan tidak cukup'), text: t(`Farming and cities would need ${f.n(m.usedPct)}% of all habitable land. This setup does not fit on Earth.`, `Pertanian dan kota membutuhkan ${f.n(m.usedPct)}% seluruh lahan layak huni. Susunan ini tidak muat di Bumi.`) }
      : m.usedPct > 70
        ? { tone: 'warn', title: t('Very tight', 'Sangat sesak'), text: t('Almost every usable hectare is working. Little is left for forests or wilderness.', 'Hampir semua lahan terpakai. Hampir tak tersisa untuk hutan atau alam liar.') }
        : { tone: 'good', title: t('It could fit', 'Masih bisa muat'), text: t('On land alone the numbers hold. Check water and energy below.', 'Dari sisi lahan saja, angkanya masih cukup. Cek air dan energi di bawah.') };
    const peakWarn = Math.max(m.usedPct, m.waterPct);
    const first = m.waterPct > m.usedPct ? t('freshwater', 'air tawar') : t('land', 'lahan');
    const pts = [];
    for (let x = 8.2; x <= 100.001; x += 2.3) pts.push({ x, y: populationModel({ ...p, pop: x }).usedPct });
    return {
      stage,
      metrics: [
        { label: t('Land needed', 'Lahan dibutuhkan'), value: f.pct(m.usedPct), sub: t('of habitable land (~104M km²)', 'dari lahan layak huni (~104 jt km²)'), tone: m.usedPct > 100 ? 'bad' : m.usedPct > 70 ? 'warn' : 'good' },
        { label: t('Farmland needed', 'Lahan pertanian'), value: f.n(m.agNeed, 0) + 'M km²', sub: t('today: ~48M km²', 'sekarang: ~48 jt km²') },
        { label: t('Earth can feed', 'Bumi bisa memberi makan'), value: f.n(m.capacity, 1) + (lang === 'id' ? ' miliar' : 'B'), sub: t('with these settings', 'dengan pengaturan ini'), tone: m.capacity >= p.pop ? 'good' : 'bad' },
        { label: t('City density', 'Kepadatan kota'), value: f.n(m.density, 0) + '/km²', sub: t(`${f.n(m.m2pp, 0)} m² per person`, `${f.n(m.m2pp, 0)} m² per orang`) },
        { label: t('Freshwater demand', 'Kebutuhan air tawar'), value: f.pct(m.waterPct), sub: t('of renewable supply, at today’s per-person use', 'dari pasokan terbarukan, pada pemakaian per orang saat ini'), tone: m.waterPct > 100 ? 'bad' : m.waterPct > 60 ? 'warn' : 'good' },
        { label: t('Energy demand', 'Kebutuhan energi'), value: f.n(m.energyEJ / 620, 1) + '×', sub: t(`${f.n(m.sunPct, 2)}% of all sunlight hitting Earth`, `${f.n(m.sunPct, 2)}% dari seluruh sinar matahari yang tiba di Bumi`) }
      ],
      stack: {
        title: t('Where the land goes', 'Ke mana lahan terpakai'),
        total: Math.max(100, m.usedPct),
        segments: [
          { label: t('Cities', 'Kota'), value: (m.cityLand / POP.HAB) * 100, tone: 'a' },
          { label: t('Farming', 'Pertanian'), value: (Math.min(m.agNeed, room) / POP.HAB) * 100, tone: 'b' },
          { label: t('Left over', 'Sisa'), value: Math.max(0, 100 - m.usedPct), tone: 'free' },
          { label: t('Does not fit', 'Tidak muat'), value: Math.max(0, m.usedPct - 100), tone: 'over' }
        ]
      },
      bars: {
        title: t('What breaks first?', 'Apa yang jebol lebih dulu?'),
        note: t(`At ${f.n(p.pop, 1)}B people, ${first} is the tightest limit (${f.n(peakWarn)}%).`, `Pada ${f.n(p.pop, 1)} miliar orang, ${first} adalah batas tersempit (${f.n(peakWarn)}%).`),
        items: [
          { label: t('Habitable land', 'Lahan layak huni'), value: m.usedPct, max: 160, shown: f.pct(m.usedPct) },
          { label: t('Freshwater', 'Air tawar'), value: m.waterPct, max: 160, shown: f.pct(m.waterPct) }
        ],
        limit: 100
      },
      compare: {
        title: t('City density vs real cities', 'Kepadatan kota vs kota nyata'),
        unit: t('people / km²', 'orang / km²'),
        items: [
          { label: t('Your cities', 'Kota Anda'), value: m.density, hot: true },
          { label: 'Manila', value: 43000 },
          { label: 'Mumbai', value: 21000 },
          { label: t('Tokyo (23 wards)', 'Tokyo (23 distrik)'), value: 15400 },
          { label: 'New York City', value: 10700 }
        ]
      },
      charts: [{
        title: t('Land use as population grows', 'Pemakaian lahan saat penduduk bertambah'),
        xLabel: t('population (billions)', 'penduduk (miliar)'), yLabel: t('% of habitable land', '% lahan layak huni'),
        series: [{ name: t('land needed', 'lahan dibutuhkan'), tone: 'a', points: pts }],
        marker: { x: p.pop }, refLines: [{ y: 100, label: t('all habitable land', 'seluruh lahan layak huni') }],
        xTicks: [10, 25, 50, 75, 100].map((x) => ({ x, label: String(x) })), yMin: 0
      }],
      steps: [
        { label: t('Food comes first', 'Pangan jadi persoalan pertama'), text: t('Farming already uses about half of all habitable land. Feeding 12× more people would need 12× more farmland, or a very different way of eating and farming.', 'Pertanian kini memakai sekitar separuh lahan layak huni. Memberi makan 12× lebih banyak orang butuh 12× lahan, atau cara makan dan bertani yang sangat berbeda.') },
        { label: t('Cities are not the bottleneck', 'Kota bukan hambatan utama'), text: t('Even all 100 billion people in cities the size of today’s densest ones would fit on a surprisingly small slice of land.', 'Bahkan 100 miliar orang di kota sepadat kota terpadat hari ini hanya butuh sebagian kecil lahan.') },
        { label: t('Water and energy', 'Air dan energi'), text: t('Scaling today’s per-person water and energy use pushes against renewable freshwater and means ~12× today’s energy, mostly as waste heat.', 'Pemakaian air dan energi per orang saat ini, jika dikalikan, mendekati batas air tawar terbarukan dan butuh ~12× energi hari ini, sebagian besar jadi panas buangan.') }
      ],
      about: {
        assumptions: [
          L('Habitable land ≈ 104 million km² (ice-free, non-barren). Farming uses ≈ 48 million km² of it today for ≈ 8.2 billion people.', 'Lahan layak huni ≈ 104 juta km² (bebas es, tidak gersang). Pertanian memakai ≈ 48 juta km² saat ini untuk ≈ 8,2 miliar orang.'),
          L('Farmland scales linearly with people, shrinks with higher productivity, and a plant-based diet cuts land per person by roughly three quarters.', 'Lahan pertanian naik linear dengan jumlah penduduk, turun dengan produktivitas, dan pola makan nabati memangkas lahan per orang sekitar tiga perempat.'),
          L('Water: ~488 m³ withdrawn per person per year vs ~42,000 km³ renewable. Energy: ~76 GJ per person per year (≈ 620 EJ today).', 'Air: ~488 m³ per orang per tahun dibanding ~42.000 km³ terbarukan. Energi: ~76 GJ per orang per tahun (≈ 620 EJ hari ini).')
        ],
        formulas: ['farmland = 48 × (pop / 8.2) × (1 − 0.76 × plantShare) / productivity', 'capacity = (104 × (1 − cityShare) × 8.2 × productivity) / (48 × dietFactor)']
      }
    };
  }
};

// ───────────────────────────── 2. The Sun vanishes ─────────────────────────────
const LIGHT_DELAY = PHYS.AU / PHYS.C;

export function simulateCooling({ eps, depth }) {
  const fl = 0.29, Cl = 2e7, Co = 4.1e6 * depth, k = 3, FREEZE_O = 271.35, FREEZE_L = 273.15, GEO = 0.087;
  const tmax = PHYS.YEAR_S - LIGHT_DELAY;
  let Tl = 288.15, To = 288.15, tau = 0, landFreeze = null, oceanFreeze = null;
  const taus = [0], TL = [Tl], TO = [To];
  while (tau < tmax) {
    const dt = Math.min(Math.max(tau / 150, 1), 21600, tmax - tau);
    const qL = -eps * PHYS.SIGMA * Tl ** 4 + GEO + k * (To - Tl);
    const qO = -eps * PHYS.SIGMA * To ** 4 + GEO - k * (To - Tl) * (fl / (1 - fl));
    Tl += (dt * qL) / Cl;
    To = To > FREEZE_O ? Math.max(FREEZE_O, To + (dt * qO) / Co) : FREEZE_O;
    tau += dt;
    if (landFreeze === null && Tl <= FREEZE_L) landFreeze = tau;
    if (oceanFreeze === null && To <= FREEZE_O + 1e-9) oceanFreeze = tau;
    taus.push(tau); TL.push(Tl); TO.push(To);
  }
  return { taus, TL, TO, landFreeze, oceanFreeze, fl };
}

export function coolingAt(sim, tau) {
  const { taus, TL, TO } = sim;
  if (tau <= 0) return { l: TL[0], o: TO[0] };
  let hi = taus.length - 1;
  if (tau >= taus[hi]) return { l: TL[hi], o: TO[hi] };
  let lo = 0;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (taus[mid] <= tau) lo = mid; else hi = mid; }
  const f = (tau - taus[lo]) / (taus[hi] - taus[lo]);
  return { l: TL[lo] + f * (TL[hi] - TL[lo]), o: TO[lo] + f * (TO[hi] - TO[lo]) };
}

const sun = {
  id: 'sun',
  accent: '#ffb86b',
  minutes: 4,
  category: L('COSMOS', 'KOSMOS'),
  title: L('What if the Sun disappeared?', 'Bagaimana jika Matahari menghilang?'),
  short: L('The Sun vanishes', 'Matahari menghilang'),
  intro: L(
    'Drag the clock from one second to one year after the Sun vanishes. The first eight minutes are eerily normal. After that, a simple heat model shows how fast Earth cools.',
    'Geser jam dari satu detik hingga satu tahun setelah Matahari lenyap. Delapan menit pertama terasa normal. Setelah itu, model panas sederhana menunjukkan seberapa cepat Bumi mendingin.'
  ),
  params: [
    { key: 'lt', label: L('Time since the Sun vanished', 'Waktu sejak Matahari lenyap'), min: 0, max: 100, step: 0.5, def: 77, show: (v, f) => f.dur(Math.pow(PHYS.YEAR_S, v / 100)) },
    { key: 'eps', label: L('Heat the atmosphere keeps in', 'Panas yang ditahan atmosfer'), min: 30, max: 100, step: 1, def: 61, show: (v, f) => f.pct(100 - v) },
    { key: 'depth', label: L('Warm ocean layer depth', 'Kedalaman lapisan laut hangat'), min: 30, max: 400, step: 10, def: 100, show: (v, f) => f.n(v) + ' m' }
  ],
  presets: [
    { label: L('Before the light fades', 'Sebelum cahaya padam'), set: { lt: 33 } },
    { label: L('One week', 'Satu minggu'), set: { lt: 100 * Math.log(7 * 86400 + LIGHT_DELAY) / Math.log(PHYS.YEAR_S) } },
    { label: L('One year', 'Satu tahun'), set: { lt: 100 } }
  ],
  compute(p, lang) {
    const f = makeFmt(lang);
    const t = (en, id) => (lang === 'id' ? id : en);
    const time = Math.pow(PHYS.YEAR_S, p.lt / 100);
    const tau = Math.max(0, time - LIGHT_DELAY);
    const sim = simulateCooling({ eps: p.eps / 100, depth: p.depth });
    const s = coolingAt(sim, tau);
    const landC = s.l - 273.15, oceanC = s.o - 273.15, globalC = sim.fl * landC + (1 - sim.fl) * oceanC;
    const dist = PHYS.V_ORBIT * tau;
    const oceanFrozen = sim.oceanFreeze !== null && tau >= sim.oceanFreeze;
    const stage = tau <= 0
      ? { tone: 'good', title: t('Still looks like a normal day', 'Masih tampak seperti hari biasa'), text: t(`Light takes ${f.dur(LIGHT_DELAY)} to reach us, and gravity's pull travels at the same speed. Nobody on Earth can tell yet.`, `Cahaya butuh ${f.dur(LIGHT_DELAY)} untuk sampai, dan tarikan gravitasi bergerak secepat itu. Belum ada yang bisa merasakannya.`) }
      : globalC > 0
        ? { tone: 'warn', title: t('Dark, and cooling', 'Gelap, dan mulai mendingin'), text: t('No sunlight. Earth no longer orbits: it coasts away in a straight line. Surfaces lose heat to space.', 'Tanpa sinar matahari. Bumi tak lagi mengorbit: ia meluncur lurus menjauh. Permukaan melepas panas ke angkasa.') }
        : !oceanFrozen
          ? { tone: 'bad', title: t('Global deep freeze', 'Pembekuan global'), text: t('Average surface temperature is below freezing. The ocean surface still holds some heat.', 'Rata-rata suhu permukaan di bawah titik beku. Permukaan laut masih menyimpan sedikit panas.') }
          : { tone: 'bad', title: t('Oceans start to freeze', 'Laut mulai membeku'), text: t('Even the ocean surface reaches freezing. Life that does not depend on sunlight, like deep-sea vent communities, may persist.', 'Bahkan permukaan laut mencapai titik beku. Kehidupan yang tak bergantung cahaya, seperti komunitas ventilasi laut dalam, mungkin bertahan.') };
    const logT = logSpace(60, sim.taus[sim.taus.length - 1], 90);
    const ticks = [[60, t('1 min', '1 mnt')], [3600, t('1 h', '1 jam')], [86400, t('1 day', '1 hari')], [604800, t('1 wk', '1 mgg')], [2629800, t('1 mo', '1 bln')], [31557600, t('1 yr', '1 thn')]];
    const at = (x) => coolingAt(sim, x);
    const events = [
      { at: 0, label: t('The Sun vanishes', 'Matahari lenyap'), text: t('Nothing changes yet. Sunlight already on its way keeps arriving.', 'Belum ada yang berubah. Cahaya yang sudah dalam perjalanan terus tiba.') },
      { at: LIGHT_DELAY, label: t('Sky goes dark', 'Langit menjadi gelap'), text: t('The last light arrives, and gravity stops pulling at the same instant. Earth flies off in a straight line at ~30 km/s.', 'Cahaya terakhir tiba, dan tarikan gravitasi berhenti di saat yang sama. Bumi melesat lurus dengan ~30 km/detik.') },
      { at: 86400, label: t('The night that never ends', 'Malam yang tak berakhir'), text: t('Photosynthesis stops. Plants and plankton live on stored energy for a while.', 'Fotosintesis berhenti. Tumbuhan dan plankton hidup dari cadangan energi untuk sementara.') }
    ];
    if (sim.landFreeze !== null) events.push({ at: LIGHT_DELAY + sim.landFreeze, label: t('Land drops below 0 °C', 'Daratan di bawah 0 °C'), text: t(`In this model, after about ${f.dur(sim.landFreeze)} the average land temperature passes freezing.`, `Dalam model ini, setelah sekitar ${f.dur(sim.landFreeze)} rata-rata suhu daratan melewati titik beku.`) });
    if (sim.oceanFreeze !== null) events.push({ at: LIGHT_DELAY + sim.oceanFreeze, label: t('Ocean surface reaches freezing', 'Permukaan laut mencapai titik beku'), text: t(`After about ${f.dur(sim.oceanFreeze)} the warm ocean layer is used up. Ice starts forming.`, `Setelah sekitar ${f.dur(sim.oceanFreeze)} lapisan laut hangat habis. Es mulai terbentuk.`) });
    events.push({ at: PHYS.YEAR_S, label: t('One year later', 'Satu tahun kemudian'), text: t(`Earth has coasted about ${f.n((PHYS.V_ORBIT * (PHYS.YEAR_S - LIGHT_DELAY)) / PHYS.AU, 1)} AU away, roughly to where Jupiter orbits. Deep-sea vents still run on Earth's own heat.`, `Bumi telah melaju sekitar ${f.n((PHYS.V_ORBIT * (PHYS.YEAR_S - LIGHT_DELAY)) / PHYS.AU, 1)} SA menjauh, kira-kira sampai orbit Jupiter. Ventilasi laut dalam masih berjalan dengan panas Bumi sendiri.`) });
    events.sort((a, b) => a.at - b.at);
    const lastDone = events.reduce((acc, e, i) => (time >= e.at ? i : acc), -1);
    return {
      stage,
      metrics: [
        { label: t('Elapsed', 'Waktu berlalu'), value: f.dur(time), sub: t('since the Sun vanished', 'sejak Matahari lenyap') },
        { label: t('Sky', 'Langit'), value: tau <= 0 ? t('Still bright', 'Masih terang') : t('Dark', 'Gelap'), sub: t(`last light at ${f.dur(LIGHT_DELAY)}`, `cahaya terakhir pada ${f.dur(LIGHT_DELAY)}`), tone: tau <= 0 ? 'good' : 'bad' },
        { label: t('Earth has drifted', 'Bumi telah menjauh'), value: f.n(dist / 1000, 0) + ' km', sub: f.n(dist / PHYS.AU, 3) + t(' AU on a straight line', ' SA lurus') },
        { label: t('Land (model)', 'Daratan (model)'), value: f.n(landC, 0) + ' °C', sub: t('average, land + air', 'rata-rata, darat + udara'), tone: landC < 0 ? 'bad' : landC < 10 ? 'warn' : 'good' },
        { label: t('Ocean surface (model)', 'Permukaan laut (model)'), value: f.n(oceanC, 0) + ' °C', sub: t('warm layer', 'lapisan hangat'), tone: oceanC < 1 ? 'bad' : 'good' },
        { label: t('World average (model)', 'Rata-rata dunia (model)'), value: f.n(globalC, 0) + ' °C', sub: t('today ≈ 15 °C', 'sekarang ≈ 15 °C'), tone: globalC < 0 ? 'bad' : globalC < 10 ? 'warn' : 'good' }
      ],
      charts: [{
        title: t('Cooling after the lights go out', 'Pendinginan setelah cahaya padam'),
        xLabel: t('time after darkness', 'waktu setelah gelap'), yLabel: '°C',
        xScale: 'log', xTicks: ticks.map(([x, label]) => ({ x, label })),
        series: [
          { name: t('Land + air', 'Darat + udara'), tone: 'a', points: logT.map((x) => ({ x, y: at(x).l - 273.15 })) },
          { name: t('Ocean surface', 'Permukaan laut'), tone: 'b', points: logT.map((x) => ({ x, y: at(x).o - 273.15 })) }
        ],
        marker: tau > 60 ? { x: tau } : null, refLines: [{ y: 0, label: '0 °C' }]
      }],
      steps: events.map((e, i) => ({ label: e.label, text: e.text, when: f.dur(e.at), active: i === lastDone, done: i <= lastDone })),
      about: {
        assumptions: [
          L('Light from the Sun takes 499 s (1 AU ÷ c). Gravity is assumed to change at the same speed, so Earth keeps orbiting for those 499 s.', 'Cahaya Matahari butuh 499 detik (1 SA ÷ c). Gravitasi diasumsikan berubah dengan kecepatan sama, jadi Bumi tetap mengorbit selama 499 detik itu.'),
          L('Two heat boxes (land + air, and a warm ocean layer) radiate to space with Stefan–Boltzmann emission scaled by an effective emissivity and exchange a little heat. A small amount of geothermal heat (0.087 W/m²) is included.', 'Dua kotak panas (darat + udara, dan lapisan laut hangat) memancarkan panas ke angkasa dengan emisi Stefan–Boltzmann yang diskalakan emisivitas efektif, dan saling bertukar sedikit panas. Panas bumi kecil (0,087 W/m²) disertakan.'),
          L('The atmosphere’s insulation is held constant. In reality water vapour would fall as it cools, so real cooling would be faster later. Ice insulation, deep ocean mixing and wind are ignored.', 'Isolasi atmosfer dianggap tetap. Pada kenyataannya uap air akan berkurang saat dingin, sehingga pendinginan nyata lebih cepat nanti. Isolasi es, percampuran laut dalam, dan angin diabaikan.')
        ],
        formulas: ['C · dT/dt = −ε σ T⁴ + Q_geo ± exchange', 'distance = 29.78 km/s × (t − 499 s)']
      }
    };
  }
};

// ─────────────────────────── 3. Internet dark for 7 days ───────────────────────────
export const SECTORS = [
  { id: 'pay', s: 0.9, tau: 0.6, mit: 0.8, label: L('Payments', 'Pembayaran'), note: L('Cards and apps fail first; cash keeps shops going.', 'Kartu dan aplikasi gagal lebih dulu; uang tunai menjaga toko tetap jalan.') },
  { id: 'com', s: 0.8, tau: 0.8, mit: 0.6, label: L('Communication', 'Komunikasi'), note: L('Messaging and video calls vanish; radio and SMS help.', 'Pesan dan video call hilang; radio dan SMS membantu.') },
  { id: 'log', s: 0.7, tau: 2.5, mit: 0.5, label: L('Logistics', 'Logistik'), note: L('Routing, tracking and orders degrade slowly, then pile up.', 'Rute, pelacakan dan pesanan menurun pelan-pelan, lalu menumpuk.') },
  { id: 'hlt', s: 0.55, tau: 2, mit: 0.7, label: L('Healthcare', 'Kesehatan'), note: L('Paper fallbacks exist, but records and scheduling suffer.', 'Ada cadangan kertas, tapi rekam medis dan penjadwalan terganggu.') },
  { id: 'enr', s: 0.5, tau: 3, mit: 0.6, label: L('Energy & utilities', 'Energi & utilitas'), note: L('Many control systems are on private networks, but not all.', 'Banyak sistem kendali berada di jaringan privat, tapi tidak semua.') },
  { id: 'wrk', s: 0.85, tau: 1, mit: 0.5, label: L('Work & school', 'Kerja & sekolah'), note: L('Cloud tools and remote classes stop almost at once.', 'Alat berbasis cloud dan kelas jarak jauh berhenti hampir seketika.') }
];

export function sectorImpact(sector, day, dep, prep) {
  return clamp(100 * (dep / 100) * sector.s * (1 - Math.exp(-day / sector.tau)) * (1 - sector.mit * (prep / 100)), 0, 100);
}
export const overallImpact = (day, dep, prep) => SECTORS.reduce((a, s) => a + sectorImpact(s, day, dep, prep), 0) / SECTORS.length;

const internet = {
  id: 'internet',
  accent: '#76b8ff',
  minutes: 3,
  category: L('SOCIETY', 'MASYARAKAT'),
  title: L('What if the internet went dark for 7 days?', 'Bagaimana jika internet mati selama 7 hari?'),
  short: L('Internet dark for 7 days', 'Internet mati 7 hari'),
  intro: L(
    'Pick a day, how digital a place is, and how prepared it is with cash, paper and radio. The scores are an illustrative model, not measured data.',
    'Pilih hari, seberapa digital suatu tempat, dan seberapa siap ia dengan uang tunai, kertas dan radio. Skor adalah model ilustratif, bukan data terukur.'
  ),
  params: [
    { key: 'day', label: L('Day of the outage', 'Hari ke-'), min: 1, max: 7, step: 1, def: 3, show: (v, f) => f.n(v) },
    { key: 'dep', label: L('How digital the place is', 'Seberapa digital tempat itu'), min: 10, max: 100, step: 5, def: 70, show: (v, f) => f.pct(v) },
    { key: 'prep', label: L('Offline preparedness', 'Kesiapan offline'), min: 0, max: 100, step: 5, def: 30, show: (v, f) => f.pct(v) }
  ],
  presets: [
    { label: L('Highly digital city', 'Kota sangat digital'), set: { dep: 90, prep: 15 } },
    { label: L('Mixed economy', 'Ekonomi campuran'), set: { dep: 55, prep: 40 } },
    { label: L('Well prepared', 'Sangat siap'), set: { dep: 70, prep: 90 } }
  ],
  compute(p, lang) {
    const f = makeFmt(lang);
    const t = (en, id) => (lang === 'id' ? id : en);
    const l = (o) => o[lang] || o.en;
    const rows = SECTORS.map((s) => ({ s, v: sectorImpact(s, p.day, p.dep, p.prep) }));
    const overall = overallImpact(p.day, p.dep, p.prep);
    const noPrep = overallImpact(p.day, p.dep, 0);
    const worst = rows.reduce((a, b) => (b.v > a.v ? b : a));
    const best = rows.reduce((a, b) => (b.v < a.v ? b : a));
    const stage = overall > 60
      ? { tone: 'bad', title: t('Severe disruption', 'Gangguan berat'), text: t('Most daily systems are failing at once. Recovery would take weeks.', 'Sebagian besar sistem harian gagal sekaligus. Pemulihan butuh berminggu-minggu.') }
      : overall > 30
        ? { tone: 'warn', title: t('Widespread disruption', 'Gangguan meluas'), text: t('Many services fail or slow down. Offline habits make a big difference.', 'Banyak layanan gagal atau melambat. Kebiasaan offline sangat membantu.') }
        : { tone: 'good', title: t('Manageable', 'Masih terkendali'), text: t('Life is slower and more awkward, but essential services keep running.', 'Hidup lebih lambat dan canggung, tapi layanan penting tetap berjalan.') };
    const days = [0, 1, 2, 3, 4, 5, 6, 7];
    const steps = [
      { from: 1, to: 1, label: t('Day 1', 'Hari 1'), text: t('Cloud services, messaging, online payments and many business workflows fail or degrade.', 'Layanan cloud, pesan, pembayaran daring dan banyak alur kerja bisnis gagal atau menurun.') },
      { from: 2, to: 3, label: t('Days 2–3', 'Hari 2–3'), text: t('Organisations switch to backup procedures. Supply chains struggle where coordination depends on connected systems.', 'Organisasi beralih ke prosedur cadangan. Rantai pasok kesulitan bila koordinasinya bergantung pada sistem terhubung.') },
      { from: 4, to: 5, label: t('Days 4–5', 'Hari 4–5'), text: t('Cash, local networks, radio and offline records matter more. Effects vary enormously by region.', 'Uang tunai, jaringan lokal, radio dan catatan offline makin penting. Dampak sangat berbeda antar wilayah.') },
      { from: 6, to: 7, label: t('Days 6–7', 'Hari 6–7'), text: t('Recovery would be uneven. Some systems return fast; others need reconciliation and manual repair.', 'Pemulihan tidak merata. Sebagian sistem pulih cepat; lainnya butuh rekonsiliasi dan perbaikan manual.') }
    ].map((x) => ({ label: x.label, text: x.text, active: p.day >= x.from && p.day <= x.to, done: p.day > x.to }));
    return {
      stage,
      metrics: [
        { label: t('Disruption index', 'Indeks gangguan'), value: f.n(overall, 0) + '/100', sub: t(`day ${p.day}`, `hari ke-${p.day}`), tone: overall > 60 ? 'bad' : overall > 30 ? 'warn' : 'good' },
        { label: t('Hardest hit', 'Paling terdampak'), value: l(worst.s.label), sub: f.n(worst.v, 0) + '/100', tone: 'bad' },
        { label: t('Least affected', 'Paling kecil dampaknya'), value: l(best.s.label), sub: f.n(best.v, 0) + '/100', tone: 'good' },
        { label: t('Preparedness saves', 'Kesiapan menghemat'), value: f.n(noPrep - overall, 0) + t(' pts', ' poin'), sub: t('vs no offline backups', 'dibanding tanpa cadangan offline'), tone: noPrep - overall > 5 ? 'good' : undefined }
      ],
      bars: {
        title: t('Impact by sector', 'Dampak per sektor'), note: t('Higher = more of that sector is out of action.', 'Makin tinggi = makin banyak sektor itu lumpuh.'),
        items: rows.map(({ s, v }) => ({ label: l(s.label), value: v, max: 100, shown: f.n(v, 0), note: l(s.note) })), limit: null
      },
      charts: [{
        title: t('How the outage builds', 'Bagaimana gangguan menumpuk'),
        xLabel: t('day', 'hari'), yLabel: t('disruption index', 'indeks gangguan'),
        series: [
          { name: t('Your settings', 'Pengaturan Anda'), tone: 'a', points: days.map((d) => ({ x: d, y: overallImpact(d, p.dep, p.prep) })) },
          { name: t('No offline backups', 'Tanpa cadangan offline'), tone: 'b', points: days.map((d) => ({ x: d, y: overallImpact(d, p.dep, 0) })) }
        ],
        marker: { x: p.day }, xTicks: days.map((d) => ({ x: d, label: String(d) })), yMin: 0, yMax: 100
      }],
      steps,
      about: {
        assumptions: [
          L('Each sector has a dependence on the internet (0–1), a speed at which it breaks down, and how much cash, paper and radio can cushion it.', 'Setiap sektor punya tingkat ketergantungan pada internet (0–1), kecepatan memburuk, dan seberapa besar uang tunai, kertas dan radio bisa menahannya.'),
          L('Impact = digital dependence × sector sensitivity × (1 − e^(−day / τ)) × (1 − cushion × preparedness).', 'Dampak = ketergantungan digital × sensitivitas sektor × (1 − e^(−hari / τ)) × (1 − bantalan × kesiapan).'),
          L('These parameters are designed for illustration. They are not drawn from outage data, so treat the numbers as relative, not literal.', 'Parameter ini dirancang untuk ilustrasi. Tidak diambil dari data gangguan nyata, jadi anggap angkanya relatif, bukan harfiah.')
        ],
        formulas: ['impact = 100 · dep · s · (1 − e^(−d/τ)) · (1 − mit · prep)']
      }
    };
  }
};

// ───────────────────────────── 4. The Moon moves ─────────────────────────────
export const SUN_TIDE_RATIO = 0.46;
const SUN_ANGULAR_DEG = 0.533;
const ROCHE_RHO_EARTH = 5514;

export function moonModel({ dist, mass }) {
  const d = PHYS.D_MOON * dist;
  const tide = mass / dist ** 3;
  const spring = (tide + SUN_TIDE_RATIO) / (1 + SUN_TIDE_RATIO);
  const neap = Math.abs(tide - SUN_TIDE_RATIO) / (1 + SUN_TIDE_RATIO);
  const periodDays = mass > 0 ? (2 * Math.PI * Math.sqrt(d ** 3 / (PHYS.G * (PHYS.M_EARTH + mass * PHYS.M_MOON)))) / 86400 : null;
  const angular = mass > 0 ? (2 * Math.atan(PHYS.R_MOON / d) * 180) / Math.PI : 0;
  const light = mass > 0 ? 1 / dist ** 2 : 0;
  const rhoMoon = (mass * PHYS.M_MOON) / ((4 / 3) * Math.PI * PHYS.R_MOON ** 3);
  const roche = mass > 0 ? 2.44 * PHYS.R_EARTH_EQ * Math.cbrt(ROCHE_RHO_EARTH / rhoMoon) : 0;
  return { d, tide, spring, neap, periodDays, angular, light, roche, inRoche: mass > 0 && d < roche };
}

const moon = {
  id: 'moon',
  accent: '#c9d2ff',
  minutes: 3,
  category: L('COSMOS', 'KOSMOS'),
  title: L('What if the Moon moved, or vanished?', 'Bagaimana jika Bulan bergeser, atau lenyap?'),
  short: L('The Moon moves', 'Bulan bergeser'),
  intro: L(
    'Tides, months, moonlight and eclipses all depend on the Moon’s distance and mass. Slide them and see what the physics says.',
    'Pasang surut, bulan kalender, cahaya bulan, dan gerhana bergantung pada jarak dan massa Bulan. Geser dan lihat apa kata fisika.'
  ),
  params: [
    { key: 'dist', label: L('Distance (today = 1×)', 'Jarak (sekarang = 1×)'), min: 0.04, max: 3, step: 0.01, def: 0.5, show: (v, f) => f.n(v, 2) + '× · ' + f.n(v * 384.4, 0) + 'k km' },
    { key: 'mass', label: L('Moon’s mass (today = 1×)', 'Massa Bulan (sekarang = 1×)'), min: 0, max: 2, step: 0.05, def: 1, show: (v, f) => f.n(v, 2) + '×' }
  ],
  presets: [
    { label: L('Today', 'Sekarang'), set: { dist: 1, mass: 1 } },
    { label: L('Half the distance', 'Separuh jarak'), set: { dist: 0.5, mass: 1 } },
    { label: L('No Moon', 'Tanpa Bulan'), set: { dist: 1, mass: 0 } },
    { label: L('Too close', 'Terlalu dekat'), set: { dist: 0.05, mass: 1 } }
  ],
  compute(p, lang) {
    const f = makeFmt(lang);
    const t = (en, id) => (lang === 'id' ? id : en);
    const m = moonModel(p);
    const stage = p.mass === 0
      ? { tone: 'warn', title: t('A Moonless Earth', 'Bumi tanpa Bulan'), text: t('Tides shrink to roughly a third of today’s, nights get much darker, and Earth’s axial tilt may become less stable over very long times.', 'Pasang surut menyusut menjadi sekitar sepertiga dari sekarang, malam jauh lebih gelap, dan kemiringan sumbu Bumi bisa kurang stabil dalam waktu sangat panjang.') }
      : m.inRoche
        ? { tone: 'bad', title: t('Inside the Roche limit', 'Di dalam batas Roche'), text: t(`Closer than ~${f.n(m.roche / 1000, 0)} km, Earth’s tides would pull a Moon-like body apart into a ring.`, `Lebih dekat dari ~${f.n(m.roche / 1000, 0)} km, gaya pasang Bumi akan menarik benda seperti Bulan menjadi cincin.`) }
        : m.spring > 5
          ? { tone: 'bad', title: t('Catastrophic tides', 'Pasang surut dahsyat'), text: t('Coastlines would be flooded and scoured twice a day, and tidal heating would stress the crust.', 'Pesisir terendam dan terkikis dua kali sehari, dan pemanasan pasang menekan kerak Bumi.') }
          : m.spring > 1.3
            ? { tone: 'warn', title: t('Much stronger tides', 'Pasang surut jauh lebih kuat'), text: t('Bigger swings, faster months, and a huge, bright Moon.', 'Ayunan lebih besar, bulan lebih singkat, dan Bulan tampak besar dan terang.') }
            : m.spring < 0.8
              ? { tone: 'warn', title: t('Gentler tides', 'Pasang surut lebih lemah'), text: t('A smaller, dimmer Moon and weaker tides. The Sun’s share grows.', 'Bulan lebih kecil dan redup, pasang lebih lemah. Peran Matahari makin besar.') }
              : { tone: 'good', title: t('Close to today', 'Mendekati kondisi sekarang'), text: t('Not very different from the Moon we know.', 'Tidak jauh berbeda dari Bulan yang kita kenal.') };
    const xs = logSpace(0.05, 3, 70);
    const eclipse = p.mass === 0 ? t('no Moon', 'tanpa Bulan') : m.angular > SUN_ANGULAR_DEG * 1.02 ? t('total eclipses, wide shadow', 'gerhana total, bayangan lebar') : m.angular < SUN_ANGULAR_DEG * 0.98 ? t('only ring (annular) eclipses', 'hanya gerhana cincin') : t('total and ring eclipses', 'gerhana total dan cincin');
    return {
      stage,
      metrics: [
        { label: t('Spring tide strength', 'Kekuatan pasang purnama'), value: f.n(m.spring * 100, m.spring > 10 ? 0 : 0) + '%', sub: t('of today’s spring tide', 'dari pasang purnama sekarang'), tone: m.spring > 1.3 ? 'bad' : m.spring < 0.8 ? 'warn' : 'good' },
        { label: t('Neap tide strength', 'Kekuatan pasang perbani'), value: f.n(m.neap * 100, 0) + '%', sub: t('of today’s spring tide', 'dari pasang purnama sekarang') },
        { label: t('Month length', 'Panjang bulan'), value: m.periodDays ? f.n(m.periodDays, m.periodDays < 10 ? 1 : 1) + t(' days', ' hari') : '—', sub: t('today: 27.3 days', 'sekarang: 27,3 hari') },
        { label: t('Moon’s apparent size', 'Ukuran tampak Bulan'), value: m.angular ? f.n(m.angular, 2) + '°' : '—', sub: t(`Sun is ${SUN_ANGULAR_DEG}° · ${eclipse}`, `Matahari ${SUN_ANGULAR_DEG}° · ${eclipse}`) },
        { label: t('Moonlight', 'Cahaya bulan'), value: f.n(m.light, m.light < 10 ? 2 : 0) + '×', sub: t('vs a full Moon today', 'dibanding purnama sekarang') },
        { label: t('Roche limit', 'Batas Roche'), value: m.roche ? f.n(m.roche / 1000, 0) + ' km' : '—', sub: t(`Moon at ${f.n(m.d / 1000, 0)} km`, `Bulan di ${f.n(m.d / 1000, 0)} km`), tone: m.inRoche ? 'bad' : undefined }
      ],
      charts: [{
        title: t('Spring tide vs distance', 'Pasang purnama vs jarak'),
        xLabel: t('distance (× today)', 'jarak (× sekarang)'), yLabel: t('% of today', '% dari sekarang'), xScale: 'log', yScale: 'log',
        xTicks: [0.05, 0.1, 0.25, 0.5, 1, 2].map((x) => ({ x, label: x + '×' })), yTicks: [10, 100, 1000, 10000].map((y) => ({ y, label: y + '%' })),
        series: [{ name: t('spring tide', 'pasang purnama'), tone: 'a', points: xs.map((x) => ({ x, y: Math.max(10, moonModel({ dist: x, mass: p.mass }).spring * 100) })) }],
        marker: { x: p.dist }, refLines: [{ y: 100, label: t('today', 'sekarang') }]
      }],
      viz: { type: 'eclipse', moonDeg: m.angular, sunDeg: SUN_ANGULAR_DEG, inRoche: m.inRoche, dist: p.dist, mass: p.mass },
      steps: [
        { label: t('Tides', 'Pasang surut'), text: t('Tidal force falls with the cube of distance. Halve the distance and the Moon’s pull becomes 8× stronger. The Sun adds about 46% as much as the Moon does today.', 'Gaya pasang turun dengan pangkat tiga jarak. Jarak separuh membuat tarikan Bulan 8× lebih kuat. Matahari menyumbang sekitar 46% dari yang disumbang Bulan hari ini.') },
        { label: t('Months and light', 'Bulan dan cahaya'), text: t('Kepler’s third law shortens the month as the Moon comes closer. Moonlight scales with the square of its apparent size.', 'Hukum Kepler ketiga memendekkan bulan saat Bulan mendekat. Cahaya bulan mengikuti kuadrat ukuran tampaknya.') },
        { label: t('Eclipses', 'Gerhana'), text: t('Today the Moon and Sun look almost the same size, a coincidence that gives us total eclipses. Move the Moon and that changes.', 'Hari ini Bulan dan Matahari tampak hampir sama besar, kebetulan yang memberi kita gerhana total. Geser Bulan dan itu berubah.') }
      ],
      about: {
        assumptions: [
          L('Tidal force ∝ mass ÷ distance³. The Sun’s tidal effect is fixed at 46% of today’s lunar tide. Real tides also depend on coastlines and ocean basins, so results are relative strengths, not metres.', 'Gaya pasang ∝ massa ÷ jarak³. Efek pasang Matahari tetap 46% dari pasang Bulan sekarang. Pasang nyata juga bergantung pada garis pantai dan cekungan laut, jadi hasilnya kekuatan relatif, bukan meter.'),
          L('Month length from Kepler’s third law with Earth’s plus the Moon’s mass. The Moon’s radius is kept fixed, so changing its mass changes its density.', 'Panjang bulan dari hukum Kepler ketiga dengan massa Bumi plus Bulan. Jari-jari Bulan dibuat tetap, jadi mengubah massa mengubah kepadatannya.'),
          L('Roche limit uses the fluid-body formula 2.44 R⊕ (ρ⊕ / ρ_moon)^⅓.', 'Batas Roche memakai rumus benda cair 2,44 R⊕ (ρ⊕ / ρ_bulan)^⅓.')
        ],
        formulas: ['tide ∝ m / d³', 'T = 2π √(d³ / G(M⊕ + m))', 'd_Roche = 2.44 R⊕ (ρ⊕/ρm)^⅓']
      }
    };
  }
};

// ───────────────────────────── 5. A different day length ─────────────────────────────
export function rotationModel({ hours }) {
  const R = PHYS.R_EARTH_EQ, GM = PHYS.GM_EARTH;
  const Tsol = hours * 3600;
  const Tsid = 1 / (1 / Tsol + 1 / PHYS.YEAR_SID);
  const w = (2 * Math.PI) / Tsid, w0 = (2 * Math.PI) / PHYS.SIDEREAL_DAY;
  const g0 = GM / R ** 2;
  const weight = ((g0 - w ** 2 * R) / (g0 - w0 ** 2 * R)) * 100;
  const vEq = w * R;
  const flat = 0.00335 * (w / w0) ** 2;
  const geoR = Math.cbrt((GM * Tsid ** 2) / (4 * Math.PI ** 2));
  const breakupSid = 2 * Math.PI * Math.sqrt(R ** 3 / GM);
  return {
    Tsol, Tsid, weight, vEq, flat,
    bulgeKm: 21.385 * (w / w0) ** 2,
    geoAltKm: (geoR - R) / 1000,
    daysPerYear: PHYS.YEAR_SID / Tsol,
    breakupHours: 1 / (1 / breakupSid - 1 / PHYS.YEAR_SID) / 3600
  };
}

const rotation = {
  id: 'rotation',
  accent: '#7be0b5',
  minutes: 3,
  category: L('PLANET', 'PLANET'),
  title: L('What if a day lasted 6 hours, or 72?', 'Bagaimana jika sehari hanya 6 jam, atau 72 jam?'),
  short: L('A different day length', 'Panjang hari berbeda'),
  intro: L(
    'Spin Earth faster or slower. You get lighter at the equator, the planet bulges, and the number of sunrises per year changes. The breakup speed is only about 84 minutes per turn.',
    'Putar Bumi lebih cepat atau lambat. Berat badan di khatulistiwa berkurang, planet menggembung, dan jumlah matahari terbit per tahun berubah. Batas hancur hanya sekitar 84 menit per putaran.'
  ),
  params: [
    { key: 'hours', label: L('Length of a day', 'Panjang satu hari'), min: 1.6, max: 72, step: 0.1, def: 6, show: (v, f) => f.n(v, 1) + (f.lang === 'id' ? ' jam' : ' h') }
  ],
  presets: [
    { label: L('Today (24 h)', 'Sekarang (24 j)'), set: { hours: 24 } },
    { label: L('6-hour day', 'Hari 6 jam'), set: { hours: 6 } },
    { label: L('Barely holding together', 'Nyaris tak utuh'), set: { hours: 1.7 } },
    { label: L('3-day days', 'Hari 3×24 jam'), set: { hours: 72 } }
  ],
  compute(p, lang) {
    const f = { ...makeFmt(lang), lang };
    const t = (en, id) => (lang === 'id' ? id : en);
    const m = rotationModel(p);
    const stage = m.weight < 50
      ? { tone: 'bad', title: t('Near breakup speed', 'Mendekati kecepatan hancur'), text: t('The equator is almost in orbit. Loose material would start to leave the surface.', 'Khatulistiwa hampir mengorbit. Material lepas akan mulai meninggalkan permukaan.') }
      : m.weight < 95
        ? { tone: 'warn', title: t('Noticeably lighter and flatter', 'Lebih ringan dan pepat'), text: t('Oceans pile toward the equator, jet streams change, and days feel brief.', 'Laut menumpuk ke khatulistiwa, jet stream berubah, dan hari terasa singkat.') }
        : p.hours > 40
          ? { tone: 'warn', title: t('Long days and nights', 'Siang dan malam panjang'), text: t('Each side of the planet bakes, then freezes, for many hours. Weather becomes more extreme.', 'Tiap sisi planet terpanggang, lalu membeku, selama berjam-jam. Cuaca jadi lebih ekstrem.') }
          : { tone: 'good', title: t('Very similar to today', 'Sangat mirip hari ini'), text: t('Small shifts in weight and shape. Mostly a change to daily rhythms.', 'Perubahan kecil pada berat dan bentuk. Terutama berubahnya ritme harian.') };
    const xs = logSpace(1.6, 72, 70);
    return {
      stage,
      metrics: [
        { label: t('Your weight at the equator', 'Berat Anda di khatulistiwa'), value: f.n(m.weight, m.weight > 99 ? 2 : 1) + '%', sub: t('compared with today', 'dibanding sekarang'), tone: m.weight < 50 ? 'bad' : m.weight < 95 ? 'warn' : 'good' },
        { label: t('Equator speed', 'Kecepatan khatulistiwa'), value: f.n(m.vEq * 3.6, 0) + ' km/h', sub: t('today ≈ 1,670 km/h', 'sekarang ≈ 1.670 km/jam') },
        { label: t('Sunrises per year', 'Matahari terbit per tahun'), value: f.n(m.daysPerYear, 0), sub: t('today ≈ 365', 'sekarang ≈ 365') },
        { label: t('Equatorial bulge', 'Tonjolan khatulistiwa'), value: f.n(m.bulgeKm, 0) + ' km', sub: t('today ≈ 21 km (first-order)', 'sekarang ≈ 21 km (orde pertama)') },
        { label: t('Stationary orbit height', 'Tinggi orbit geostasioner'), value: f.n(m.geoAltKm, 0) + ' km', sub: t('today ≈ 35,786 km', 'sekarang ≈ 35.786 km') },
        { label: t('Breakup day length', 'Panjang hari saat hancur'), value: f.n(m.breakupHours * 60, 0) + t(' min', ' mnt'), sub: t('equator weightless', 'khatulistiwa tanpa bobot') }
      ],
      charts: [{
        title: t('Equatorial weight vs day length', 'Berat di khatulistiwa vs panjang hari'),
        xLabel: t('day length (hours)', 'panjang hari (jam)'), yLabel: t('% of today', '% dari sekarang'), xScale: 'log',
        xTicks: [2, 3, 6, 12, 24, 48, 72].map((x) => ({ x, label: String(x) })),
        series: [{ name: t('weight', 'berat'), tone: 'a', points: xs.map((x) => ({ x, y: rotationModel({ hours: x }).weight })) }],
        marker: { x: p.hours }, refLines: [{ y: 100, label: t('today', 'sekarang') }], yMin: 0, yMax: 105
      }],
      viz: { type: 'shape', flat: m.flat },
      steps: [
        { label: t('Why you get lighter', 'Mengapa Anda jadi ringan'), text: t('At the equator the ground moves in a circle, and part of gravity is used up as centripetal force. Spin fast enough and that equals all of gravity.', 'Di khatulistiwa tanah bergerak melingkar, dan sebagian gravitasi terpakai sebagai gaya sentripetal. Jika cukup cepat, itu sama dengan seluruh gravitasi.') },
        { label: t('Why the planet bulges', 'Mengapa planet menggembung'), text: t('A spinning body flattens. Today the equator is about 21 km farther from the centre than the poles. The bulge grows with the square of the spin rate.', 'Benda berputar menjadi pepat. Hari ini khatulistiwa sekitar 21 km lebih jauh dari pusat dibanding kutub. Tonjolan naik dengan kuadrat laju putar.') },
        { label: t('Sunrises and satellites', 'Matahari terbit dan satelit'), text: t('A solar day mixes spin and Earth’s orbit. Satellites that hover over one spot would need a different altitude.', 'Hari matahari adalah gabungan putaran dan orbit Bumi. Satelit yang diam di satu titik perlu ketinggian berbeda.') }
      ],
      about: {
        assumptions: [
          L('Treats Earth as a sphere (equatorial radius 6,378 km). Equator weight uses g_eff = GM/R² − ω²R compared with today’s spin.', 'Memperlakukan Bumi sebagai bola (jari-jari khatulistiwa 6.378 km). Berat di khatulistiwa memakai g_eff = GM/R² − ω²R dibanding putaran sekarang.'),
          L('Day length means the solar day. The spin period is slightly shorter because Earth also orbits the Sun.', 'Panjang hari berarti hari matahari. Periode putar sedikit lebih pendek karena Bumi juga mengorbit Matahari.'),
          L('The bulge is a first-order scaling from today’s 21 km. Near breakup the real shape would be far more complex.', 'Tonjolan adalah penskalaan orde pertama dari 21 km saat ini. Mendekati titik hancur, bentuk nyata jauh lebih rumit.')
        ],
        formulas: ['g_eff = GM/R² − ω²R', 'T_breakup = 2π √(R³/GM) ≈ 84.5 min', 'r_sync = (GM T² / 4π²)^⅓']
      }
    };
  }
};

// ───────────────────────────── 6. Fall through the planet ─────────────────────────────
export const BODIES = {
  earth: { GM: 3.986004418e14, R: 6.371e6, name: L('Earth', 'Bumi') },
  moon: { GM: 4.9028e12, R: 1.7374e6, name: L('the Moon', 'Bulan') },
  mars: { GM: 4.2828e13, R: 3.3895e6, name: L('Mars', 'Mars') },
  mercury: { GM: 2.2032e13, R: 2.4397e6, name: L('Mercury', 'Merkurius') },
  jupiter: { GM: 1.26687e17, R: 6.9911e7, name: L('Jupiter (as pure maths)', 'Jupiter (hanya hitungan)') }
};

export function tunnelModel({ body, chord }) {
  const b = BODIES[body] || BODIES.earth;
  const w = Math.sqrt(b.GM / b.R ** 3);
  const frac = chord / 100;
  const L2 = b.R * frac; // half length
  return {
    oneWay: Math.PI / w,
    vMax: w * L2,
    length: 2 * L2,
    aStart: w ** 2 * L2,
    vOrbit: Math.sqrt(b.GM / b.R),
    w, R: b.R, frac
  };
}

const tunnel = {
  id: 'tunnel',
  accent: '#ff8fa3',
  minutes: 3,
  category: L('PHYSICS', 'FISIKA'),
  title: L('What if you fell through a tunnel across the planet?', 'Bagaimana jika Anda jatuh lewat terowongan menembus planet?'),
  short: L('Fall through a planet', 'Jatuh menembus planet'),
  intro: L(
    'Drop into a perfect frictionless tunnel. Surprise: the trip takes the same time whether it crosses the centre or a short chord. Press play to ride it.',
    'Jatuhlah ke terowongan sempurna tanpa gesekan. Kejutan: perjalanannya sama lama baik lewat pusat maupun tali busur pendek. Tekan putar untuk menaikinya.'
  ),
  params: [
    { key: 'body', type: 'choice', label: L('Which world?', 'Dunia mana?'), def: 'earth', options: Object.entries(BODIES).map(([v, b]) => ({ v, label: b.name })) },
    { key: 'chord', label: L('Tunnel length (% of diameter)', 'Panjang terowongan (% diameter)'), min: 5, max: 100, step: 5, def: 100, show: (v, f) => f.pct(v) }
  ],
  presets: [
    { label: L('Straight through the centre', 'Lurus lewat pusat'), set: { body: 'earth', chord: 100 } },
    { label: L('A short shortcut', 'Jalan pintas pendek'), set: { body: 'earth', chord: 20 } },
    { label: L('On the Moon', 'Di Bulan'), set: { body: 'moon', chord: 100 } }
  ],
  compute(p, lang) {
    const f = makeFmt(lang);
    const t = (en, id) => (lang === 'id' ? id : en);
    const b = BODIES[p.body] || BODIES.earth;
    const m = tunnelModel(p);
    const g = b.GM / b.R ** 2;
    return {
      stage: { tone: 'good', title: t('Same time, any tunnel', 'Waktu sama, terowongan apa pun'), text: t('In a uniform-density world, gravity along a straight tunnel pulls back like a spring, so every tunnel is a half-oscillation of the same duration.', 'Pada dunia berkepadatan seragam, gravitasi sepanjang terowongan lurus menarik kembali seperti pegas, sehingga setiap terowongan adalah setengah osilasi dengan durasi sama.') },
      metrics: [
        { label: t('One-way trip', 'Perjalanan sekali jalan'), value: f.n(m.oneWay / 60, 1) + t(' min', ' mnt'), sub: t(`on ${b.name.en}`, `di ${b.name.id}`), tone: 'good' },
        { label: t('There and back', 'Pulang pergi'), value: f.n((2 * m.oneWay) / 60, 1) + t(' min', ' mnt'), sub: t('if you do not catch the edge', 'jika tidak berpegangan di tepi') },
        { label: t('Top speed', 'Kecepatan tertinggi'), value: f.n(m.vMax / 1000, 2) + ' km/s', sub: f.n(m.vMax * 3.6, 0) + ' km/h' },
        { label: t('Tunnel length', 'Panjang terowongan'), value: f.n(m.length / 1000, 0) + ' km', sub: t(`${f.n(m.frac * 100)}% of the diameter`, `${f.n(m.frac * 100)}% diameter`) },
        { label: t('Pull at the start', 'Tarikan di awal'), value: f.n(m.aStart / g, 2) + ' g', sub: t(`surface gravity ${f.n(g, 2)} m/s²`, `gravitasi permukaan ${f.n(g, 2)} m/s²`) },
        { label: t('Skimming orbit speed', 'Kecepatan orbit rendah'), value: f.n(m.vOrbit / 1000, 2) + ' km/s', sub: t('a full-length tunnel reaches this', 'terowongan penuh mencapainya') }
      ],
      viz: { type: 'tunnel', oneWay: m.oneWay, vMax: m.vMax, length: m.length, frac: m.frac, body: p.body },
      steps: [
        { label: t('Start: at rest', 'Awal: diam'), text: t('You drop in and begin to accelerate. Gravity along the tunnel is strongest at the ends.', 'Anda jatuh dan mulai dipercepat. Gravitasi sepanjang terowongan paling kuat di ujung.') },
        { label: t('Middle: top speed', 'Tengah: kecepatan puncak'), text: t('At the midpoint the pull is zero and you are moving fastest. A full tunnel equals the speed of a satellite skimming the surface.', 'Di titik tengah tarikan nol dan Anda paling cepat. Terowongan penuh setara kecepatan satelit yang melayang rendah di permukaan.') },
        { label: t('End: arrive and stop', 'Akhir: tiba dan berhenti'), text: t('Without friction you stop exactly at the far entrance. Real analyses that use Earth’s true density profile give about 38 minutes.', 'Tanpa gesekan, Anda berhenti tepat di pintu seberang. Analisis nyata dengan profil kepadatan Bumi memberi sekitar 38 menit.') },
        { label: t('Why no one can do this', 'Mengapa tak ada yang bisa'), text: t('The deepest hole ever drilled, the Kola borehole, is about 12 km. Earth’s centre is 6,371 km down, and far hotter and more pressured.', 'Lubang terdalam yang pernah dibor, Kola, sekitar 12 km. Pusat Bumi 6.371 km ke bawah, jauh lebih panas dan bertekanan.') }
      ].map((s, i) => ({ ...s, active: false, done: false, idx: i })),
      about: {
        assumptions: [
          L('The planet has uniform density, so gravity inside grows linearly with distance from the centre, like a spring.', 'Planet berkepadatan seragam, sehingga gravitasi di dalamnya naik linear terhadap jarak dari pusat, seperti pegas.'),
          L('Vacuum tunnel, no friction, no rotation effects, straight path. The one-way time is π √(R³/GM), independent of the chord.', 'Terowongan hampa, tanpa gesekan, tanpa efek rotasi, lintasan lurus. Waktu sekali jalan adalah π √(R³/GM), tidak bergantung pada tali busur.'),
          L('Jupiter has no solid surface; it is included only to show the maths.', 'Jupiter tidak punya permukaan padat; disertakan hanya untuk menunjukkan hitungannya.')
        ],
        formulas: ['ω = √(GM/R³)', 't_one-way = π/ω', 'v_max = ω · (L/2)']
      }
    };
  }
};

export const SCENARIOS = [population, sun, internet, moon, rotation, tunnel];
export const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));

export const defaultsOf = (sc) => Object.fromEntries(sc.params.map((x) => [x.key, x.def]));

/** Read params from a URL query, falling back to defaults and clamping to range. */
export function paramsFromQuery(sc, query = {}) {
  const out = defaultsOf(sc);
  for (const x of sc.params) {
    const raw = query[x.key];
    if (raw === undefined) continue;
    if (x.type === 'choice') { if (x.options.some((o) => o.v === raw)) out[x.key] = raw; continue; }
    const n = Number(raw);
    if (Number.isFinite(n)) out[x.key] = clamp(n, x.min, x.max);
  }
  return out;
}

/** Only the values that differ from the defaults, so share links stay short. */
export function paramsToQuery(sc, values) {
  const out = {};
  for (const x of sc.params) {
    const v = values[x.key];
    if (v !== x.def) out[x.key] = typeof v === 'number' ? Math.round(v * 1000) / 1000 : v;
  }
  return out;
}
