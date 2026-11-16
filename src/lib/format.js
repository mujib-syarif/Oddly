// Locale-aware number and duration formatting shared by every scenario.

const WORDS = {
  en: { k: 'thousand', m: 'million', b: 'billion', t: 'trillion', u: { s: 's', min: 'min', h: 'h', d: 'days', mo: 'months', y: 'years' }, one: { d: 'day', mo: 'month', y: 'year' } },
  id: { k: 'ribu', m: 'juta', b: 'miliar', t: 'triliun', u: { s: 'dtk', min: 'mnt', h: 'jam', d: 'hari', mo: 'bulan', y: 'tahun' }, one: { d: 'hari', mo: 'bulan', y: 'tahun' } }
};

export function makeFmt(lang = 'en') {
  const loc = lang === 'id' ? 'id-ID' : 'en-US';
  const w = WORDS[lang] || WORDS.en;
  const n = (v, d = 0) => (Number.isFinite(v) ? new Intl.NumberFormat(loc, { maximumFractionDigits: d }).format(v) : '—');
  const big = (v, d = 1) => {
    if (!Number.isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1e12) return n(v / 1e12, d) + ' ' + w.t;
    if (a >= 1e9) return n(v / 1e9, d) + ' ' + w.b;
    if (a >= 1e6) return n(v / 1e6, d) + ' ' + w.m;
    return n(v, a < 100 ? d : 0);
  };
  const dur = (sec) => {
    if (!Number.isFinite(sec)) return '—';
    const a = Math.abs(sec);
    const num = (x) => n(x, x < 10 ? 1 : 0);
    const withUnit = (x, key) => {
      const shown = num(x);
      return shown + ' ' + (shown === '1' && w.one[key] ? w.one[key] : w.u[key]);
    };
    if (a < 60) return num(sec) + ' ' + w.u.s;
    if (a < 3600) return num(sec / 60) + ' ' + w.u.min;
    if (a < 86400) return num(sec / 3600) + ' ' + w.u.h;
    if (a < 86400 * 60) return withUnit(sec / 86400, 'd');
    if (a < 86400 * 365) return withUnit(sec / (86400 * 30.4375), 'mo');
    return withUnit(sec / (86400 * 365.25), 'y');
  };
  return { n, big, dur, pct: (v, d = 0) => n(v, d) + '%' };
}
