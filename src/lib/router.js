// Tiny hash router: #/time?u=google.com&t=20010101000000  ·  #/whatif/moon?dist=0.5

export function parseHash(hash) {
  const h = String(hash || '').replace(/^#\/?/, '');
  const qi = h.indexOf('?');
  const pathPart = qi >= 0 ? h.slice(0, qi) : h;
  const query = qi >= 0 ? h.slice(qi + 1) : '';
  const parts = pathPart.split('/').filter(Boolean).map((s) => {
    try { return decodeURIComponent(s); } catch { return s; }
  });
  const params = {};
  for (const [k, v] of new URLSearchParams(query)) params[k] = v;
  return { page: parts[0] || 'home', id: parts[1] || null, params };
}

export function buildHash(page = 'home', id = null, params = {}) {
  let out = '#/' + (page === 'home' ? '' : page);
  if (id) out += '/' + encodeURIComponent(id);
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? out + '?' + s : out;
}
