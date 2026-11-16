import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Columns2, History, Info, Link2, Pause, Play, Search, Shuffle, X } from 'lucide-react';
import {
  CLASSICS, fetchCaptures, formatTs, groupByYear, monthName, nearestIndex, normalizeUrl, pickForYear,
  prettyDate, snapshotUrl, tsToMs, yearOf, monthOf
} from '../lib/wayback.js';

const RECENT_KEY = 'oddly-recent-sites';
const readRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 6); } catch { return []; } };
const writeRecent = (list) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ } };

function Frame({ capture, t, label }) {
  const [state, setState] = useState('loading');
  useEffect(() => {
    setState('loading');
    const id = setTimeout(() => setState((s) => (s === 'loading' ? 'slow' : s)), 12000);
    return () => clearTimeout(id);
  }, [capture.timestamp, capture.original]);
  const src = snapshotUrl(capture.timestamp, capture.original);
  const open = snapshotUrl(capture.timestamp, capture.original, '');
  return (
    <div className="frame">
      <div className="frame-bar">
        <span className="frame-dots"><i /><i /><i /></span>
        <span className="frame-url" title={capture.original}>{label || prettyDate(capture.timestamp, t.lang)}</span>
        <a className="frame-open" href={open} target="_blank" rel="noreferrer" aria-label={t('Open on the Internet Archive', 'Buka di Internet Archive')}><ArrowUpRight size={15} /></a>
      </div>
      <div className="frame-body">
        {state !== 'loaded' && (
          <div className="frame-status">
            <span className="spinner" />
            <p>{state === 'slow'
              ? t('The Archive is slow to answer, or this page refuses to be embedded.', 'Arsip lambat merespons, atau halaman ini menolak ditampilkan di sini.')
              : t('Fetching the past…', 'Mengambil masa lalu…')}</p>
            {state === 'slow' && <a className="button button-ghost" href={open} target="_blank" rel="noreferrer">{t('Open it directly', 'Buka langsung')} <ArrowUpRight size={14} /></a>}
          </div>
        )}
        <iframe
          key={src}
          title={t('Archived website snapshot', 'Arsip tampilan website')}
          src={src}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="no-referrer"
          onLoad={() => setState('loaded')}
        />
      </div>
    </div>
  );
}

export default function TimeMachine({ t, lang, route, navigate }) {
  const initial = route.params.u || '';
  const [input, setInput] = useState(initial);
  const [site, setSite] = useState(null);       // { key, display, host }
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('idle');  // idle | loading | ok | empty | offline | invalid
  const [selTs, setSelTs] = useState(null);
  const [compare, setCompare] = useState(false);
  const [cmpTs, setCmpTs] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recent, setRecent] = useState(readRecent);
  const runId = useRef(0);

  const { map: byYear, years } = useMemo(() => groupByYear(rows), [rows]);
  const selected = useMemo(() => rows.find((r) => r.timestamp === selTs) || null, [rows, selTs]);
  const cmpSel = useMemo(() => rows.find((r) => r.timestamp === cmpTs) || null, [rows, cmpTs]);
  const selYear = selected ? yearOf(selected.timestamp) : null;
  const selIndex = selected ? rows.indexOf(selected) : -1;
  const maxCount = Math.max(1, ...years.map((y) => byYear.get(y).count));

  const search = useCallback(async (raw, wantTs) => {
    const parsed = normalizeUrl(raw);
    if (!parsed.ok) { setStatus('invalid'); setRows([]); setSelTs(null); setSite(null); return; }
    const id = ++runId.current;
    setStatus('loading'); setPlaying(false); setCompare(false); setCmpTs(null);
    setSite({ key: parsed.key, display: parsed.display, host: parsed.host });
    setInput(parsed.display);
    const { rows: found, reachable } = await fetchCaptures(parsed.key);
    if (id !== runId.current) return;
    setRows(found);
    if (!found.length) { setSelTs(null); setStatus(reachable ? 'empty' : 'offline'); return; }
    let pick = null;
    if (wantTs) pick = found[nearestIndex(found, tsToMs(wantTs))];
    if (!pick) pick = found[0];
    setSelTs(pick.timestamp);
    setStatus('ok');
    const next = [parsed.display, ...readRecent().filter((x) => x !== parsed.display)].slice(0, 6);
    writeRecent(next); setRecent(next);
  }, []);

  // Initial load from a shared link.
  useEffect(() => { if (route.params.u) search(route.params.u, route.params.t); /* eslint-disable-next-line */ }, []);

  // Keep the address bar in sync so any state is shareable.
  useEffect(() => {
    if (status !== 'ok' || !site || !selTs) return;
    navigate('time', null, { u: site.display, t: selTs }, { replace: true, quiet: true });
  }, [status, site, selTs]); // eslint-disable-line

  // Auto "time travel": hop through the years.
  useEffect(() => {
    if (!playing || status !== 'ok') return undefined;
    const id = setInterval(() => {
      setSelTs((cur) => {
        const y = yearOf(cur);
        const idx = years.indexOf(y);
        const nextYear = years[(idx + 1) % years.length];
        return pickForYear(rows, nextYear)?.timestamp || cur;
      });
    }, 4500);
    return () => clearInterval(id);
  }, [playing, status, years, rows]);

  const go = (delta) => {
    const i = Math.min(rows.length - 1, Math.max(0, selIndex + delta));
    setSelTs(rows[i].timestamp); setPlaying(false);
  };
  const jumpYear = (y) => { const pick = pickForYear(rows, y); if (pick) { setSelTs(pick.timestamp); setPlaying(false); } };
  const surprise = () => { if (rows.length) { setSelTs(rows[Math.floor(Math.random() * rows.length)].timestamp); setPlaying(false); } };
  const toggleCompare = () => {
    if (!compare) {
      const first = rows[0], last = rows[rows.length - 1];
      setCmpTs((selected && selected.timestamp !== last.timestamp ? last : first).timestamp);
    }
    setCompare((c) => !c);
  };
  const share = async () => {
    const link = location.origin + location.pathname + '#/time?u=' + encodeURIComponent(site.display) + '&t=' + selTs;
    try { await navigator.clipboard.writeText(link); } catch { window.prompt(t('Copy this link', 'Salin tautan ini'), link); }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  const monthsOfYear = selYear ? byYear.get(selYear)?.rows || [] : [];
  const submit = (e) => { e.preventDefault(); search(input); };
  const tt = Object.assign((a, b) => t(a, b), { lang });

  return (
    <main className="tool-page">
      <button className="back-link" onClick={() => navigate('home')}><ArrowLeft size={15} />{t('Back to ODDLY', 'Kembali ke ODDLY')}</button>
      <div className="tool-heading">
        <span className="eyebrow"><History size={13} /> 01 / INTERNET TIME MACHINE</span>
        <h1>{t('Take a trip', 'Kembali')} <em>{t('back in time.', 'ke masa lalu.')}</em></h1>
        <p>{t('Enter a website. Scrub through its archived history. Compare how it looked then and now.', 'Masukkan alamat website. Telusuri riwayat arsipnya. Bandingkan tampilannya dulu dan sekarang.')}</p>
      </div>

      <form className="search-panel" onSubmit={submit}>
        <label htmlFor="url-input">{t('WEBSITE ADDRESS', 'ALAMAT WEBSITE')}</label>
        <div className="search-row">
          <Search size={18} />
          <input id="url-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="example.com" autoComplete="off" autoCapitalize="off" spellCheck="false" inputMode="url" />
          <button className="button button-primary" disabled={status === 'loading'}>{status === 'loading' ? t('SEARCHING…', 'MENCARI…') : t('Find history', 'Cari arsip')}</button>
        </div>
        <div className="suggestions">
          <span>{t('TRY A CLASSIC', 'COBA WEBSITE INI')}</span>
          {CLASSICS.slice(0, 8).map((x) => <button type="button" key={x} onClick={() => search(x)}>{x}</button>)}
          <button type="button" className="shuffle" onClick={() => search(CLASSICS[Math.floor(Math.random() * CLASSICS.length)])}><Shuffle size={12} /> {t('Random', 'Acak')}</button>
        </div>
        {recent.length > 0 && (
          <div className="suggestions recent">
            <span>{t('RECENT', 'TERAKHIR')}</span>
            {recent.map((x) => <button type="button" key={x} onClick={() => search(x)}>{x}</button>)}
            <button type="button" className="clear" onClick={() => { writeRecent([]); setRecent([]); }}><X size={12} /> {t('Clear', 'Hapus')}</button>
          </div>
        )}
      </form>

      {status === 'loading' && <div className="notice"><span className="spinner small" />{t('Searching the Internet Archive… this can take a few seconds.', 'Mencari di Internet Archive… bisa memakan beberapa detik.')}</div>}
      {status === 'invalid' && <div className="notice error-notice"><Info size={17} />{t('That address does not look valid. Try something like example.com.', 'Alamat itu sepertinya tidak valid. Coba seperti example.com.')}</div>}
      {status === 'empty' && <div className="notice error-notice"><Info size={17} />{t('The Archive answered, but has no saved copies of this address. Try the homepage without a path.', 'Arsip menjawab, tetapi tidak punya salinan alamat ini. Coba halaman utama tanpa path.')}</div>}
      {status === 'offline' && <div className="notice error-notice"><Info size={17} /><span>{t('Could not reach the Internet Archive. Check your connection and try again. ', 'Tidak dapat menjangkau Internet Archive. Periksa koneksi lalu coba lagi. ')}<button className="text-link inline" onClick={() => search(input)}>{t('Retry', 'Coba lagi')}</button></span></div>}

      {status === 'ok' && selected && (
        <>
          <div className="results-meta">
            <div>
              <span className="eyebrow">{site.display}</span>
              <h2>{rows.length.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')} <em>{t('snapshots found', 'arsip ditemukan')}</em></h2>
            </div>
            <span className="mono">{years[0]} — {years[years.length - 1]}</span>
          </div>

          <section className="timeline-panel" aria-label={t('Timeline', 'Linimasa')}>
            <div className="timeline-top">
              <span>{t('SELECT A YEAR', 'PILIH TAHUN')}</span>
              <span>{t('Taller bar = more captures', 'Batang lebih tinggi = lebih banyak arsip')}</span>
            </div>
            <div className="histogram" role="list">
              {years.map((y) => {
                const g = byYear.get(y);
                return (
                  <button key={y} role="listitem" className={y === selYear ? 'hist-col selected' : 'hist-col'} onClick={() => jumpYear(y)} title={`${y}: ${g.count} ${t('captures', 'arsip')}, ${g.changes} ${t('changes', 'perubahan')}`} aria-label={`${y}, ${g.count} ${t('captures', 'arsip')}`}>
                    <i style={{ height: Math.max(8, (g.count / maxCount) * 100) + '%' }} />
                    <span>{String(y).slice(2)}</span>
                  </button>
                );
              })}
            </div>
            <input className="year-slider" type="range" min={0} max={rows.length - 1} value={selIndex} onChange={(e) => { setSelTs(rows[Number(e.target.value)].timestamp); setPlaying(false); }} aria-label={t('Scrub through snapshots', 'Geser antar arsip')} />
            <div className="year-labels"><span>{prettyDate(rows[0].timestamp, lang)}</span><strong>{prettyDate(selected.timestamp, lang)}</strong><span>{prettyDate(rows[rows.length - 1].timestamp, lang)}</span></div>
            <div className="month-grid" aria-label={t('Months with captures', 'Bulan dengan arsip')}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const hit = monthsOfYear.find((r) => monthOf(r.timestamp) === m);
                return <button key={m} disabled={!hit} className={hit && hit.timestamp === selected.timestamp ? 'month selected' : hit ? (hit.changed ? 'month has changed' : 'month has') : 'month'} onClick={() => { setSelTs(hit.timestamp); setPlaying(false); }} title={hit ? (hit.changed ? t('Page changed this month', 'Halaman berubah bulan ini') : '') : ''}>{monthName(m, lang)}</button>;
              })}
            </div>
            <p className="legend-note"><i className="dot-changed" /> {t('Highlighted months mean the page content changed since the previous capture.', 'Bulan yang disorot berarti isi halaman berubah dibanding arsip sebelumnya.')}</p>
          </section>

          <div className="toolbar">
            <button className="chip-btn" onClick={() => go(-1)} disabled={selIndex <= 0}><ArrowLeft size={15} /> {t('Earlier', 'Lebih lama')}</button>
            <button className="chip-btn" onClick={() => go(1)} disabled={selIndex >= rows.length - 1}>{t('Later', 'Lebih baru')} <ArrowRight size={15} /></button>
            <button className={playing ? 'chip-btn active' : 'chip-btn'} onClick={() => setPlaying((p) => !p)} disabled={years.length < 2}>{playing ? <Pause size={15} /> : <Play size={15} />} {playing ? t('Stop', 'Berhenti') : t('Time travel', 'Jelajah waktu')}</button>
            <button className="chip-btn" onClick={surprise}><Shuffle size={15} /> {t('Surprise me', 'Kejutkan saya')}</button>
            <button className={compare ? 'chip-btn active' : 'chip-btn'} onClick={toggleCompare}><Columns2 size={15} /> {t('Compare', 'Bandingkan')}</button>
            <button className="chip-btn" onClick={share}>{copied ? <Check size={15} /> : <Link2 size={15} />} {copied ? t('Copied', 'Tersalin') : t('Share link', 'Bagikan tautan')}</button>
          </div>

          {compare && cmpSel && (
            <div className="compare-pick">
              <label>{t('Compare with', 'Bandingkan dengan')}
                <select value={cmpTs} onChange={(e) => setCmpTs(e.target.value)}>
                  {years.map((y) => (
                    <optgroup key={y} label={String(y)}>
                      {byYear.get(y).rows.map((r) => <option key={r.timestamp} value={r.timestamp}>{prettyDate(r.timestamp, lang)}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
            </div>
          )}

          <section className={compare && cmpSel ? 'snapshot-preview two' : 'snapshot-preview'}>
            <div className="preview-head">
              <div>
                <span className="eyebrow">{t('SELECTED SNAPSHOT', 'ARSIP TERPILIH')}{playing ? ' · ' + t('AUTO', 'OTOMATIS') : ''}</span>
                <h3>{prettyDate(selected.timestamp, lang)} <small>{formatTs(selected.timestamp).hh}:{formatTs(selected.timestamp).mm} UTC</small></h3>
              </div>
            </div>
            <div className={compare && cmpSel ? 'frames two' : 'frames'}>
              <Frame capture={selected} t={tt} />
              {compare && cmpSel && <Frame capture={cmpSel} t={tt} />}
            </div>
          </section>
        </>
      )}

      <div className="notice"><Info size={17} />{t('Archive coverage varies. Some captures load incompletely or refuse to display inside a preview. Use the arrow on any frame to open the snapshot directly on the Internet Archive.', 'Ketersediaan arsip berbeda-beda. Beberapa arsip tampil tidak lengkap atau menolak ditampilkan di preview. Gunakan panah di bingkai mana pun untuk membuka langsung di Internet Archive.')}</div>
    </main>
  );
}
