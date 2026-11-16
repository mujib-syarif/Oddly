import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Info, Link2, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react';
import { makeFmt } from '../lib/format.js';
import { SCENARIOS, SCENARIO_BY_ID, defaultsOf, paramsFromQuery, paramsToQuery } from '../lib/scenarios.js';
import { Bars, Compare, Curve, Stack } from './charts.jsx';
import { EclipseViz, ShapeViz, TunnelViz } from './viz.jsx';

export function ScenarioIndex({ t, lang, navigate }) {
  return (
    <main className="tool-page whatif-page">
      <button className="back-link" onClick={() => navigate('home')}><ArrowLeft size={15} />{t('Back to ODDLY', 'Kembali ke ODDLY')}</button>
      <div className="tool-heading">
        <span className="eyebrow"><Sparkles size={13} /> 02 / WHAT IF MACHINE</span>
        <h1>{t('Change one thing.', 'Ubah satu hal.')}<br /><em>{t('Explore everything.', 'Jelajahi dampaknya.')}</em></h1>
        <p>{t('Six thought experiments, each with a small model you can steer. Every number is computed live from the assumptions you can read at the bottom of the page.', 'Enam eksperimen pikiran, masing-masing dengan model kecil yang bisa Anda kendalikan. Setiap angka dihitung langsung dari asumsi yang bisa dibaca di bagian bawah halaman.')}</p>
      </div>
      <div className="scenario-grid">
        {SCENARIOS.map((s, i) => (
          <button key={s.id} className="scenario-card" style={{ '--accent': s.accent }} onClick={() => navigate('whatif', s.id)}>
            <span className="scenario-no">0{i + 1}</span>
            <span className="scenario-cat">{s.category[lang]}</span>
            <strong>{s.title[lang]}</strong>
            <p>{s.intro[lang]}</p>
            <span className="scenario-go">{s.minutes} {t('min', 'mnt')} <ArrowUpRight size={15} /></span>
          </button>
        ))}
      </div>
    </main>
  );
}

function Slider({ param, value, onChange, f, lang }) {
  const l = param.label[lang];
  if (param.type === 'choice') {
    return (
      <div className="control-group">
        <div className="control-label"><label>{l}</label></div>
        <div className="choice-row">
          {param.options.map((o) => <button key={o.v} className={value === o.v ? 'choice active' : 'choice'} onClick={() => onChange(o.v)}>{o.label[lang]}</button>)}
        </div>
      </div>
    );
  }
  const id = 'p-' + param.key;
  return (
    <div className="control-group">
      <div className="control-label"><label htmlFor={id}>{l}</label><strong>{param.show(value, f)}</strong></div>
      <input id={id} type="range" min={param.min} max={param.max} step={param.step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Timeline({ steps }) {
  return (
    <ol className="steps">
      {steps.map((s, i) => (
        <li key={i} className={s.active ? 'step active' : s.done ? 'step done' : 'step'}>
          <span className="step-when">{s.when || String(i + 1).padStart(2, '0')}</span>
          <div><strong>{s.label}</strong><p>{s.text}</p></div>
        </li>
      ))}
    </ol>
  );
}

export default function WhatIf({ id, t, lang, route, navigate }) {
  const sc = SCENARIO_BY_ID[id];
  const [values, setValues] = useState(() => (sc ? paramsFromQuery(sc, route.params) : {}));
  const [copied, setCopied] = useState(false);

  // Reset when switching scenario or when a different shared link is opened.
  useEffect(() => { if (sc) setValues(paramsFromQuery(sc, route.params)); /* eslint-disable-next-line */ }, [id]);

  // Mirror controls into the URL (debounced) so every state is shareable.
  useEffect(() => {
    if (!sc) return undefined;
    const h = setTimeout(() => navigate('whatif', sc.id, paramsToQuery(sc, values), { replace: true, quiet: true }), 350);
    return () => clearTimeout(h);
  }, [values, sc]); // eslint-disable-line

  const f = useMemo(() => ({ ...makeFmt(lang), lang }), [lang]);
  const out = useMemo(() => (sc ? sc.compute(values, lang) : null), [sc, values, lang]);
  if (!sc) return <ScenarioIndex t={t} lang={lang} navigate={navigate} />;

  const idx = SCENARIOS.indexOf(sc);
  const next = SCENARIOS[(idx + 1) % SCENARIOS.length];
  const isDefault = JSON.stringify(paramsToQuery(sc, values)) === '{}';
  const share = async () => {
    const q = new URLSearchParams(paramsToQuery(sc, values)).toString();
    const link = location.origin + location.pathname + '#/whatif/' + sc.id + (q ? '?' + q : '');
    try { await navigator.clipboard.writeText(link); } catch { window.prompt(t('Copy this link', 'Salin tautan ini'), link); }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };
  const set = (key) => (v) => setValues((cur) => ({ ...cur, [key]: v }));
  const tt = Object.assign((a, b) => t(a, b), { lang });

  return (
    <main className="tool-page whatif-page" style={{ '--accent': sc.accent }}>
      <button className="back-link" onClick={() => navigate('whatif')}><ArrowLeft size={15} />{t('All experiments', 'Semua eksperimen')}</button>
      <div className="scenario-tabs">
        {SCENARIOS.map((s) => <button key={s.id} className={s.id === sc.id ? 'scenario-tab active' : 'scenario-tab'} onClick={() => navigate('whatif', s.id)}>{s.short[lang]}</button>)}
      </div>

      <div className="experiment-title big">
        <span className="eyebrow">0{idx + 1} / {sc.category[lang]}</span>
        <h1>{sc.title[lang]}</h1>
        <p>{sc.intro[lang]}</p>
      </div>

      <section className="experiment-layout">
        <aside className="control-panel">
          <div className="control-heading"><SlidersHorizontal size={17} /><span>{t('EXPERIMENT CONTROLS', 'KONTROL EKSPERIMEN')}</span></div>
          <div className="preset-row">
            {sc.presets.map((p, i) => <button key={i} className="chip-btn small" onClick={() => setValues((cur) => ({ ...cur, ...p.set }))}>{p.label[lang]}</button>)}
          </div>
          {sc.params.map((p) => <Slider key={p.key} param={p} value={values[p.key]} onChange={set(p.key)} f={f} lang={lang} />)}
          <div className="control-actions">
            <button className="chip-btn" disabled={isDefault} onClick={() => setValues(defaultsOf(sc))}><RotateCcw size={14} /> {t('Reset', 'Atur ulang')}</button>
            <button className="chip-btn" onClick={share}>{copied ? <Check size={14} /> : <Link2 size={14} />} {copied ? t('Copied', 'Tersalin') : t('Share this setup', 'Bagikan pengaturan ini')}</button>
          </div>
        </aside>

        <div className="experiment-main">
          <div className={'verdict tone-' + out.stage.tone} role="status" aria-live="polite">
            <span className="verdict-dot" />
            <div><strong>{out.stage.title}</strong><p>{out.stage.text}</p></div>
          </div>

          <div className="metric-grid">
            {out.metrics.map((m, i) => (
              <div className={'metric ' + (m.tone ? 'tone-' + m.tone : '')} key={i}>
                <span>{m.label}</span><strong>{m.value}</strong><small>{m.sub}</small>
              </div>
            ))}
          </div>

          {out.viz?.type === 'eclipse' && <EclipseViz v={out.viz} t={tt} />}
          {out.viz?.type === 'shape' && <ShapeViz v={out.viz} t={tt} />}
          {out.viz?.type === 'tunnel' && <TunnelViz v={out.viz} t={tt} lang={lang} />}
          {out.stack && <Stack data={out.stack} />}
          {out.bars && <Bars data={out.bars} />}
          {out.compare && <Compare data={out.compare} />}
          {(out.charts || []).map((c, i) => <Curve key={i} chart={c} />)}

          <section className="panel">
            <h3>{t('How it unfolds', 'Bagaimana ini berlangsung')}</h3>
            <Timeline steps={out.steps} />
          </section>
        </div>
      </section>

      <section className="assumptions">
        <span className="eyebrow"><Info size={13} /> {t('HOW THIS IS CALCULATED', 'CARA PERHITUNGANNYA')}</span>
        <h3>{t('A model is a lens, not a prophecy.', 'Model adalah lensa, bukan ramalan.')}</h3>
        <ul>{out.about.assumptions.map((a, i) => <li key={i}>{a[lang]}</li>)}</ul>
        <div className="formulas">{out.about.formulas.map((fm, i) => <code key={i}>{fm}</code>)}</div>
      </section>

      <button className="next-card" onClick={() => navigate('whatif', next.id)}>
        <span>{t('NEXT EXPERIMENT', 'EKSPERIMEN BERIKUTNYA')}</span>
        <strong>{next.title[lang]}</strong>
        <ArrowRight size={20} />
      </button>
    </main>
  );
}
