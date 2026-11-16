import React from 'react';

const W = 640, H = 300, M = { l: 54, r: 18, t: 18, b: 44 };

function niceTicks(min, max, count = 5) {
  if (!(max > min)) return [min];
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Math.round(v / step) * step);
  return out;
}

function interp(points, x) {
  if (!points.length) return null;
  if (x <= points[0].x) return points[0].y;
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i].x) {
      const a = points[i - 1], b = points[i];
      return a.y + ((x - a.x) / (b.x - a.x || 1)) * (b.y - a.y);
    }
  }
  return points[points.length - 1].y;
}

export function Curve({ chart }) {
  const pts = chart.series.flatMap((s) => s.points);
  const logX = chart.xScale === 'log', logY = chart.yScale === 'log';
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const xMin = chart.xMin ?? Math.min(...xs), xMax = chart.xMax ?? Math.max(...xs);
  let yMin = chart.yMin ?? Math.min(...ys), yMax = chart.yMax ?? Math.max(...ys);
  const refYs = (chart.refLines || []).map((r) => r.y);
  yMin = Math.min(yMin, ...refYs); yMax = Math.max(yMax, ...refYs);
  if (chart.yMin === undefined && !logY) yMin -= (yMax - yMin) * 0.06;
  if (chart.yMax === undefined && !logY) yMax += (yMax - yMin) * 0.06;
  if (yMax === yMin) { yMax += 1; yMin -= 1; }
  const fx = (x) => {
    const a = logX ? Math.log(xMin) : xMin, b = logX ? Math.log(xMax) : xMax;
    return M.l + (((logX ? Math.log(Math.max(x, xMin)) : x) - a) / (b - a || 1)) * (W - M.l - M.r);
  };
  const fy = (y) => {
    const a = logY ? Math.log(yMin) : yMin, b = logY ? Math.log(yMax) : yMax;
    return H - M.b - (((logY ? Math.log(Math.max(y, yMin)) : y) - a) / (b - a || 1)) * (H - M.t - M.b);
  };
  const yTicks = chart.yTicks || niceTicks(yMin, yMax, 5).map((y) => ({ y, label: String(Math.round(y * 100) / 100) }));
  const xTicks = chart.xTicks || niceTicks(xMin, xMax, 6).map((x) => ({ x, label: String(x) }));
  const mk = chart.marker && chart.marker.x != null ? chart.marker : null;
  return (
    <figure className="chart">
      <figcaption>{chart.title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={chart.title}>
        {yTicks.filter((tk) => tk.y >= yMin && tk.y <= yMax).map((tk) => (
          <g key={'y' + tk.y}>
            <line className="grid" x1={M.l} x2={W - M.r} y1={fy(tk.y)} y2={fy(tk.y)} />
            <text className="tick" x={M.l - 8} y={fy(tk.y) + 4} textAnchor="end">{tk.label}</text>
          </g>
        ))}
        {xTicks.filter((tk) => tk.x >= xMin && tk.x <= xMax).map((tk) => (
          <g key={'x' + tk.x}>
            <line className="grid grid-v" x1={fx(tk.x)} x2={fx(tk.x)} y1={M.t} y2={H - M.b} />
            <text className="tick" x={fx(tk.x)} y={H - M.b + 18} textAnchor="middle">{tk.label}</text>
          </g>
        ))}
        {(chart.refLines || []).map((r) => (
          <g key={'r' + r.y}>
            <line className="ref" x1={M.l} x2={W - M.r} y1={fy(r.y)} y2={fy(r.y)} />
            <text className="ref-label" x={W - M.r - 4} y={fy(r.y) - 6} textAnchor="end">{r.label}</text>
          </g>
        ))}
        {chart.series.map((s, i) => (
          <path key={i} className={'line tone-' + (s.tone || 'a')} fill="none" d={s.points.map((p, j) => (j ? 'L' : 'M') + fx(p.x).toFixed(1) + ' ' + fy(p.y).toFixed(1)).join('')} />
        ))}
        {mk && <line className="marker" x1={fx(mk.x)} x2={fx(mk.x)} y1={M.t} y2={H - M.b} />}
        {mk && chart.series.map((s, i) => {
          const y = interp(s.points, mk.x);
          return y == null ? null : <circle key={'d' + i} className={'dot tone-' + (s.tone || 'a')} cx={fx(mk.x)} cy={fy(y)} r="5.5" />;
        })}
        <text className="axis-label" x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle">{chart.xLabel}</text>
        <text className="axis-label" transform={`translate(13 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle">{chart.yLabel}</text>
      </svg>
      {chart.series.length > 1 && (
        <div className="legend">{chart.series.map((s, i) => <span key={i}><i className={'sw tone-' + (s.tone || 'a')} />{s.name}</span>)}</div>
      )}
    </figure>
  );
}

export function Bars({ data }) {
  const limit = data.limit;
  return (
    <section className="panel bars">
      <h3>{data.title}</h3>
      {data.note && <p className="panel-note">{data.note}</p>}
      <div className="bar-list">
        {data.items.map((it, i) => {
          const pct = Math.min(100, (it.value / it.max) * 100);
          const over = limit != null && it.value > limit;
          return (
            <div className="bar-row" key={i}>
              <div className="bar-head"><span>{it.label}</span><b className={over ? 'bad' : ''}>{it.shown}</b></div>
              <div className="bar-track">
                <i className={over ? 'fill over' : 'fill'} style={{ width: pct + '%' }} />
                {limit != null && <u style={{ left: (limit / it.max) * 100 + '%' }} />}
              </div>
              {it.note && <small>{it.note}</small>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Stack({ data }) {
  const total = data.total || 100;
  return (
    <section className="panel stack">
      <h3>{data.title}</h3>
      <div className="stack-track">
        {data.segments.filter((s) => s.value > 0.05).map((s, i) => (
          <i key={i} className={'seg seg-' + s.tone} style={{ width: (s.value / total) * 100 + '%' }} title={s.label} />
        ))}
        {total > 100 && <u style={{ left: (100 / total) * 100 + '%' }} />}
      </div>
      <div className="legend">
        {data.segments.filter((s) => s.value > 0.05).map((s, i) => <span key={i}><i className={'sw seg-' + s.tone} />{s.label} · {Math.round(s.value)}%</span>)}
      </div>
    </section>
  );
}

export function Compare({ data }) {
  const max = Math.max(...data.items.map((i) => i.value), 1);
  const fmt = (v) => new Intl.NumberFormat('en-US').format(Math.round(v));
  return (
    <section className="panel compare">
      <h3>{data.title}</h3>
      <p className="panel-note">{data.unit}</p>
      <div className="bar-list">
        {data.items.map((it, i) => (
          <div className="bar-row" key={i}>
            <div className="bar-head"><span>{it.label}</span><b>{fmt(it.value)}</b></div>
            <div className="bar-track"><i className={it.hot ? 'fill hot' : 'fill'} style={{ width: Math.max(1.5, (it.value / max) * 100) + '%' }} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}
