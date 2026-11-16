import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { makeFmt } from '../lib/format.js';

export function EclipseViz({ v, t }) {
  const sunR = 62;
  const ratio = v.moonDeg / v.sunDeg;
  const moonR = Math.min(118, sunR * ratio);
  const cx = 320, cy = 100;
  const x0 = 48, span = 540;
  const moonX = x0 + (v.dist / 3) * span;
  const roche = x0 + ((18400e3 / 384400e3) / 3) * span;
  return (
    <figure className="viz">
      <svg viewBox="0 0 640 270" role="img" aria-label={t('Sun and Moon apparent sizes', 'Ukuran tampak Matahari dan Bulan')}>
        <defs>
          <radialGradient id="sunGlow"><stop offset="0" stopColor="#ffe9a8" /><stop offset=".6" stopColor="#ffb86b" /><stop offset="1" stopColor="#ff8a3d" /></radialGradient>
          <radialGradient id="corona"><stop offset=".5" stopColor="#ffb86b" stopOpacity=".5" /><stop offset="1" stopColor="#ffb86b" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={sunR * 1.9} fill="url(#corona)" />
        <circle cx={cx} cy={cy} r={sunR} fill="url(#sunGlow)" />
        {v.mass > 0 && <circle cx={cx} cy={cy} r={moonR} className="moon-disc" />}
        <text className="viz-label" x={cx} y={cy + 140 - 30} textAnchor="middle">
          {v.mass === 0 ? t('No Moon, no eclipses', 'Tanpa Bulan, tanpa gerhana') : ratio >= 1.02 ? t(`Moon looks ${ratio.toFixed(1)}× wider than the Sun`, `Bulan tampak ${ratio.toFixed(1)}× lebih lebar dari Matahari`) : ratio <= 0.98 ? t(`Moon looks ${(ratio * 100).toFixed(0)}% as wide as the Sun`, `Bulan tampak ${(ratio * 100).toFixed(0)}% selebar Matahari`) : t('Moon and Sun look equally wide', 'Bulan dan Matahari tampak sama lebar')}
        </text>
        <line className="orbit-line" x1={x0} x2={x0 + span} y1={232} y2={232} />
        <circle cx={x0} cy={232} r="9" className="earth-dot" />
        <text className="viz-small" x={x0} y={256} textAnchor="middle">{t('Earth', 'Bumi')}</text>
        <line className="roche" x1={roche} x2={roche} y1={218} y2={246} />
        <text className="viz-small" x={roche + 4} y={216}>{t('Roche limit', 'Batas Roche')}</text>
        {v.mass > 0 && <circle cx={moonX} cy={232} r="6" className={v.inRoche ? 'moon-dot bad' : 'moon-dot'} />}
        <text className="viz-small" x={x0 + span} y={256} textAnchor="end">3× {t('today’s distance', 'jarak sekarang')}</text>
        <line className="roche" style={{ stroke: 'var(--muted)' }} x1={x0 + span / 3} x2={x0 + span / 3} y1={224} y2={240} />
      </svg>
    </figure>
  );
}

export function ShapeViz({ v, t }) {
  const R = 86;
  const ex = Math.min(0.6, v.flat * 6);
  const ry = R * (1 - ex);
  return (
    <figure className="viz">
      <svg viewBox="0 0 640 230" role="img" aria-label={t('Shape of the spinning Earth', 'Bentuk Bumi yang berputar')}>
        <circle cx="320" cy="112" r={R} className="ref-circle" />
        <ellipse cx="320" cy="112" rx={R} ry={ry} className="planet-ellipse" />
        <ellipse cx="320" cy="112" rx={R} ry={Math.max(2, ry * 0.18)} className="equator" />
        <line x1="320" x2="320" y1={112 - R - 12} y2={112 + R + 12} className="axis" />
        <text className="viz-label" x="320" y="222" textAnchor="middle">{t('Shape exaggerated about 6× for visibility', 'Bentuk diperbesar sekitar 6× agar terlihat')}</text>
      </svg>
    </figure>
  );
}

export function TunnelViz({ v, t, lang }) {
  const f = makeFmt(lang);
  const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [u, setU] = useState(0.0);
  const [playing, setPlaying] = useState(!reduced);
  const raf = useRef(0);
  const last = useRef(0);
  useEffect(() => {
    if (!playing) return undefined;
    const tick = (now) => {
      if (last.current) setU((x) => x + ((now - last.current) / 1000) / 6);
      last.current = now;
      raf.current = requestAnimationFrame(tick);
    };
    last.current = 0;
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);
  const R = 96, cx = 320, cy = 112;
  const half = R * v.frac;
  const chordY = cy + R * Math.sqrt(Math.max(0, 1 - v.frac * v.frac));
  const s = Math.cos(Math.PI * u);
  const x = cx + half * s;
  const speed = v.vMax * Math.abs(Math.sin(Math.PI * u));
  const elapsed = u * v.oneWay;
  const trail = [0.04, 0.08, 0.12].map((d) => cx + half * Math.cos(Math.PI * (u - d)));
  return (
    <figure className="viz tunnel-viz">
      <svg viewBox="0 0 640 230" role="img" aria-label={t('Animated fall through a tunnel', 'Animasi jatuh melewati terowongan')}>
        <circle cx={cx} cy={cy} r={R} className="planet-fill" />
        <circle cx={cx} cy={cy} r="3" className="core-dot" />
        <line x1={cx - half} x2={cx + half} y1={chordY} y2={chordY} className="tunnel-line" />
        {trail.map((tx, i) => <circle key={i} cx={tx} cy={chordY} r={6 - i * 1.4} className="trail" style={{ opacity: 0.35 - i * 0.1 }} />)}
        <circle cx={x} cy={chordY} r="7.5" className="rider" />
        <text className="viz-small" x={cx - half} y={chordY + 22} textAnchor="middle">{t('A', 'A')}</text>
        <text className="viz-small" x={cx + half} y={chordY + 22} textAnchor="middle">{t('B', 'B')}</text>
      </svg>
      <div className="tunnel-hud">
        <button className="chip-btn" onClick={() => { last.current = 0; setPlaying((p) => !p); }} aria-label={playing ? t('Pause', 'Jeda') : t('Play', 'Putar')}>{playing ? <Pause size={15} /> : <Play size={15} />} {playing ? t('Pause', 'Jeda') : t('Play', 'Putar')}</button>
        <button className="chip-btn" onClick={() => setU(0)} aria-label={t('Restart', 'Ulangi')}><RotateCcw size={15} /> {t('Restart', 'Ulangi')}</button>
        <span className="mono">{f.dur(elapsed)} · {f.n(speed * 3.6, 0)} km/h</span>
        <span className="hint">{t('1 s on screen ≈', '1 dtk di layar ≈')} {f.dur(v.oneWay / 6)}</span>
      </div>
    </figure>
  );
}
