import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowRight, ArrowUpRight, History, Menu, Orbit, Sparkles, X } from 'lucide-react';
import './style.css';
import './extra.css';
import { buildHash, parseHash } from './lib/router.js';
import { SCENARIOS } from './lib/scenarios.js';
import TimeMachine from './components/TimeMachine.jsx';
import WhatIf, { ScenarioIndex } from './components/WhatIf.jsx';

const LANG_KEY = 'oddly-lang';
const readLang = () => {
  try { const v = localStorage.getItem(LANG_KEY); if (v === 'en' || v === 'id') return v; } catch { /* storage unavailable */ }
  return (navigator.language || 'en').toLowerCase().startsWith('id') ? 'id' : 'en';
};

function useRoute() {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => { setRoute(parseHash(location.hash)); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const navigate = useCallback((page, id = null, params = {}, opts = {}) => {
    const hash = buildHash(page, id, params);
    if (opts.quiet) { history.replaceState(null, '', hash); return; }
    if (location.hash === hash) { setRoute(parseHash(hash)); return; }
    location.hash = hash;
  }, []);
  return [route, navigate];
}

function Home({ t, lang, navigate }) {
  return (
    <main>
      <section className="hero">
        <div className="hero-kicker"><span className="live-dot" /> {t('AN EXPERIMENT IN CURIOSITY', 'EKSPERIMEN RASA INGIN TAHU')}</div>
        <h1>{t('Reality is only', 'Realitas hanyalah')}<br /><span>{t('one version', 'satu versi')}</span> {t('of the story.', 'dari cerita.')}</h1>
        <p className="hero-copy">{t('Travel through the internet’s past. Run thought experiments about the impossible. Two ways to look at the world a little differently.', 'Jelajahi masa lalu internet. Jalankan eksperimen pikiran tentang hal yang mustahil. Dua cara untuk melihat dunia dari sudut yang berbeda.')}</p>
        <div className="hero-ctas">
          <button className="button button-primary" onClick={() => navigate('time')}><History size={16} />{t('Explore the past', 'Jelajahi masa lalu')}<ArrowUpRight size={16} /></button>
          <button className="button button-ghost" onClick={() => navigate('whatif')}><Sparkles size={16} />{t('Question reality', 'Pertanyakan realitas')}<ArrowRight size={16} /></button>
        </div>
        <div className="hero-orbit"><div className="orbit-ring ring-a" /><div className="orbit-ring ring-b" /><div className="orbit-core"><Orbit size={48} /></div><span className="orbit-label label-a">PAST</span><span className="orbit-label label-b">POSSIBLE</span><span className="orbit-label label-c">UNKNOWN</span></div>
        <div className="hero-foot"><span>01 / THE PAST</span><span>02 / THE POSSIBLE</span><span>SCROLL TO EXPLORE <ArrowDown size={12} /></span></div>
      </section>

      <section className="section-intro">
        <div><span className="eyebrow">{t('TWO WAYS TO EXPLORE', 'DUA CARA MENJELAJAH')}</span><h2>{t('Curiosity has', 'Rasa ingin tahu punya')} <em>{t('no timeline.', 'tanpa batas waktu.')}</em></h2></div>
        <p>{t('One tool looks backward at what the web preserved. The other looks forward into questions we have not answered.', 'Satu alat melihat kembali jejak yang disimpan web. Satu lagi menjelajahi pertanyaan yang belum terjawab.')}</p>
      </section>

      <section className="feature-grid">
        <article className="feature-card time-card">
          <div className="card-top"><span className="card-index">01 / ARCHIVE</span><span className="card-icon"><History size={20} /></span></div>
          <div className="card-art archive-art"><div className="archive-window"><div className="window-bar"><i /><i /><i /><span>web.archive.org</span></div><div className="archive-content"><b>GOOGLE</b><div className="fake-search" /><div className="fake-lines"><i /><i /><i /></div><span className="archive-year">2001</span></div></div><div className="art-orbit" /></div>
          <div className="card-body"><span className="eyebrow">{t('INTERNET TIME MACHINE', 'MESIN WAKTU INTERNET')}</span><h3>{t('The web has a past.', 'Internet juga punya masa lalu.')}</h3><p>{t('Scrub through decades of a site’s history, compare two moments side by side, or let it time-travel for you.', 'Telusuri riwayat puluhan tahun sebuah situs, bandingkan dua momen berdampingan, atau biarkan ia menjelajah waktu untuk Anda.')}</p><button className="text-link" onClick={() => navigate('time')}>{t('Enter the archive', 'Masuk ke arsip')} <ArrowUpRight size={16} /></button></div>
        </article>
        <article className="feature-card whatif-card">
          <div className="card-top"><span className="card-index">02 / HYPOTHESIS</span><span className="card-icon"><Sparkles size={20} /></span></div>
          <div className="card-art whatif-art"><div className="planet planet-main" /><div className="planet planet-small" /><div className="planet-orbit" /><span className="art-caption">WHAT IF<br />THINGS WERE<br />DIFFERENT?</span></div>
          <div className="card-body"><span className="eyebrow">{t('WHAT IF MACHINE', 'MESIN BAGAIMANA JIKA')}</span><h3>{t('Question the ordinary.', 'Pertanyakan hal biasa.')}</h3><p>{t('Six live physics and systems models. Drag a slider and watch the consequences recalculate.', 'Enam model fisika dan sistem yang hidup. Geser slider dan lihat konsekuensinya dihitung ulang.')}</p><button className="text-link" onClick={() => navigate('whatif')}>{t('Start an experiment', 'Mulai eksperimen')} <ArrowUpRight size={16} /></button></div>
        </article>
      </section>

      <section className="featured-section">
        <div className="section-heading"><div><span className="eyebrow">{t('A QUESTION WORTH ASKING', 'PERTANYAAN YANG LAYAK DIUJI')}</span><h2>{t('Start with the', 'Mulai dari')} <em>{t('big questions.', 'pertanyaan besar.')}</em></h2></div><button className="text-link" onClick={() => navigate('whatif')}>{t('All experiments', 'Semua eksperimen')} <ArrowRight size={15} /></button></div>
        <div className="question-grid six">
          {SCENARIOS.map((s, i) => (
            <button className="question-card" key={s.id} style={{ '--accent': s.accent }} onClick={() => navigate('whatif', s.id)}>
              <span className="question-number">0{i + 1}</span>
              <span className="question-category">{s.category[lang]}</span>
              <strong>{s.title[lang]}</strong>
              <span className="question-arrow"><ArrowUpRight size={17} /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="manifesto" id="about"><span className="eyebrow">A NOTE FROM ODDLY</span><p>{t('Not every question needs a perfect answer. Sometimes the best discovery is learning how much there is to wonder about.', 'Tidak semua pertanyaan membutuhkan jawaban sempurna. Terkadang penemuan terbaik adalah menyadari betapa banyak hal yang masih bisa kita pertanyakan.')}</p><span className="manifesto-sign">STAY CURIOUS <span>✳</span></span></section>
    </main>
  );
}

function App() {
  const [route, navigate] = useRoute();
  const [lang, setLang] = useState(readLang);
  const [menu, setMenu] = useState(false);
  const isId = lang === 'id';
  const t = (en, id) => (isId ? id : en);
  const page = route.page;

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* storage unavailable */ }
  }, [lang]);
  useEffect(() => { setMenu(false); }, [route.page, route.id]);

  const goAbout = () => {
    if (page !== 'home') { navigate('home'); setTimeout(() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }), 80); }
    else document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <button className="brand" onClick={() => navigate('home')} aria-label="ODDLY home"><span className="brand-mark"><Orbit size={19} /></span><span>ODDLY<span className="brand-dot">.</span></span></button>
        <nav className={menu ? 'nav nav-open' : 'nav'}>
          <button className={page === 'time' ? 'nav-link active' : 'nav-link'} onClick={() => navigate('time')}><History size={15} /> {t('TIME MACHINE', 'MESIN WAKTU')}</button>
          <button className={page === 'whatif' ? 'nav-link active' : 'nav-link'} onClick={() => navigate('whatif')}><Sparkles size={15} /> WHAT IF?</button>
          <button className="nav-link nav-about" onClick={goAbout}>{t('ABOUT', 'TENTANG')}</button>
        </nav>
        <div className="top-actions">
          <button className="lang-toggle" onClick={() => setLang(isId ? 'en' : 'id')} aria-label="Language">{isId ? 'ID' : 'EN'} <span>/</span> {isId ? 'EN' : 'ID'}</button>
          <button className="menu-button" onClick={() => setMenu(!menu)} aria-label="Toggle menu">{menu ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>

      {page === 'time' && <TimeMachine t={t} lang={lang} route={route} navigate={navigate} />}
      {page === 'whatif' && (route.id ? <WhatIf key={route.id} id={route.id} t={t} lang={lang} route={route} navigate={navigate} /> : <ScenarioIndex t={t} lang={lang} navigate={navigate} />)}
      {page !== 'time' && page !== 'whatif' && <Home t={t} lang={lang} navigate={navigate} />}

      <footer className="footer">
        <button className="brand footer-brand" onClick={() => navigate('home')}><span className="brand-mark"><Orbit size={17} /></span><span>ODDLY<span className="brand-dot">.</span></span></button>
        <span>{t('A playground for curious minds.', 'Ruang bermain untuk pikiran yang penasaran.')}</span>
        <span className="footer-right">MADE FOR THE CURIOUS <span>{'✳'}</span></span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
