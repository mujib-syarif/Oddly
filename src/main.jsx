import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Clock3, Globe2, History, Info, Layers3, Menu, Orbit, Play, Search, SlidersHorizontal, Sparkles, Users, X } from 'lucide-react';
import './style.css';

const featured = [
  { id: 'population', category: 'HUMANITY', title: 'What if 100 billion people lived on Earth?', titleId: 'Bagaimana jika 100 miliar manusia hidup di Bumi?', desc: 'A planet-scale thought experiment. Where would everyone live, what would we need, and what might break first?', descId: 'Eksperimen pikiran skala planet. Di mana semua orang tinggal, apa yang dibutuhkan, dan apa yang mungkin runtuh lebih dulu?', icon: Users, tag: 'FEATURED EXPERIMENT', time: '5 MIN READ' },
  { id: 'sun', category: 'COSMOS', title: 'What if the Sun disappeared?', titleId: 'Bagaimana jika Matahari menghilang?', desc: 'Follow the first eight minutes, the sudden darkness, and the long cold that follows.', descId: 'Ikuti delapan menit pertama, kegelapan mendadak, dan suhu dingin yang menyusul.', icon: Orbit, tag: 'COSMIC SCENARIO', time: '4 MIN READ' },
  { id: 'internet', category: 'SOCIETY', title: 'What if the internet went dark for 7 days?', titleId: 'Bagaimana jika internet mati selama 7 hari?', desc: 'Trace the ripple effects across communication, money, logistics, and daily life.', descId: 'Telusuri dampaknya terhadap komunikasi, uang, logistik, dan kehidupan sehari-hari.', icon: Globe2, tag: 'SYSTEMS SCENARIO', time: '4 MIN READ' }
];

function App() {
  const [page, setPage] = useState('home');
  const [lang, setLang] = useState('en');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [recent, setRecent] = useState(() => JSON.parse(localStorage.getItem('oddly-recent') || '[]'));
  const [url, setUrl] = useState('https://www.google.com');
  const [year, setYear] = useState(2000);
  const [captures, setCaptures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scenario, setScenario] = useState('population');
  const [population, setPopulation] = useState(100);
  const [land, setLand] = useState(10);
  const [foodEfficiency, setFoodEfficiency] = useState(100);
  const [urbanShare, setUrbanShare] = useState(60);
  const [natureReserve, setNatureReserve] = useState(20);
  const [density, setDensity] = useState(10000);
  const [activeCapture, setActiveCapture] = useState(null);
  const isId = lang === 'id';
  const t = (en, id) => isId ? id : en;

  const openPage = (next, item) => {
    setPage(next);
    setMobileMenu(false);
    if (item) {
      const nextRecent = [{ id: item, at: Date.now() }, ...recent.filter(x => x.id !== item)].slice(0, 4);
      setRecent(nextRecent); localStorage.setItem('oddly-recent', JSON.stringify(nextRecent));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const lookup = async (e) => {
    e?.preventDefault();
    let clean = url.trim();
    if (!clean) return;
    if (!/^https?:\\/\\//i.test(clean)) clean = 'https://' + clean;
    setUrl(clean); setLoading(true); setError(''); setCaptures([]); setActiveCapture(null);
    try {
      const parsed = new URL(clean);
      const host = parsed.hostname.replace(/^www\\./i, '');
      const timeoutFetch = async (resource, ms=9000) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        try { return await fetch(resource, {signal:controller.signal, cache:'no-store'}); }
        finally { clearTimeout(timer); }
      };
      let rows = [];
      // Fast path: the Availability API usually returns one known-good snapshot.
      try {
        const available = await timeoutFetch('https://archive.org/wayback/available?url=' + encodeURIComponent(clean), 8000);
        if (available.ok) {
          const snap = (await available.json())?.archived_snapshots?.closest;
          if (snap?.timestamp && snap?.url) rows.push({timestamp:snap.timestamp, original:snap.url, status:String(snap.status || 200), digest:''});
        }
      } catch (_) {}
      // Rich path: query the CDX index through a CORS-readable relay.
      try {
        const cdx = 'https://web.archive.org/cdx/search/cdx?' + new URLSearchParams({
          url: host, matchType:'domain', output:'json', filter:'statuscode:200',
          filter2:'mimetype:text/html', collapse:'timestamp:4',
          fl:'timestamp,original,statuscode,digest', from:'1996', to:'2026',
          limit:'250', gzip:'false'
        }).toString();
        const relay = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(cdx);
        const response = await timeoutFetch(relay, 12000);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const indexed = data.slice(1).filter(row => row?.[0] && row?.[1]).map(row => ({
              timestamp:String(row[0]), original:String(row[1]), status:String(row[2] || 200), digest:String(row[3] || '')
            }));
            if (indexed.length) rows = indexed;
          }
        }
      } catch (_) {}
      const unique = new Map();
      rows.forEach(row => unique.set(row.timestamp + '|' + row.original, row));
      rows = [...unique.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
      setCaptures(rows);
      setYear(rows.length ? Number(rows[rows.length - 1].timestamp.slice(0,4)) : 2000);
      if (!rows.length) setError(t('No archived snapshot was found, or the archive services are temporarily unavailable. Try a full page URL or another domain.', 'Snapshot arsip tidak ditemukan atau layanan arsip sedang tidak tersedia. Coba alamat halaman lengkap atau domain lain.'));
    } catch (err) {
      setError(t('That address does not look valid. Check it and try again.', 'Alamat tersebut sepertinya tidak valid. Periksa kembali lalu coba lagi.'));
    } finally { setLoading(false); }
  };

  const years = useMemo(() => [...new Set(captures.map(c => Number(c.timestamp.slice(0,4))))].sort((a,b)=>a-b), [captures]);
  const selectedCaptures = captures.filter(c => Number(c.timestamp.slice(0,4)) === year);
  const chosen = activeCapture || selectedCaptures[selectedCaptures.length - 1];
  const archiveUrl = c => 'https://web.archive.org/web/' + c.timestamp + '/' + c.original;

  const scenarios = {
    population: { title: t('100 billion humans on Earth', '100 miliar manusia di Bumi'), subtitle: t('A planet-scale population thought experiment.', 'Eksperimen pikiran populasi skala planet.'), icon: Users },
    sun: { title: t('The Sun disappears', 'Matahari menghilang'), subtitle: t('A sudden change to the centre of our solar system.', 'Perubahan mendadak pada pusat tata surya kita.'), icon: Orbit },
    internet: { title: t('The internet goes dark for 7 days', 'Internet mati selama 7 hari'), subtitle: t('A global outage with cascading consequences.', 'Gangguan global dengan konsekuensi berantai.'), icon: Globe2 }
  };
  const areaPerPerson = land * 1e12 / (population * 1e9);
  const footprint = Math.sqrt(areaPerPerson);
  const peoplePerKm = population * 1e9 / (land * 1e6);
  const worldDensity = peoplePerKm;
  const populationFactor = population / 8.2;
  const foodMillionTonnesPerDay = population * 0.7 / (foodEfficiency / 100);
  const waterTrillionLitresPerDay = population * 0.05;
  const activeScenario = scenarios[scenario];
  const urbanLand = land * (urbanShare / 100);
  const natureLand = land * (natureReserve / 100);
  const usableLand = Math.max(0.1, land - natureLand);
  const urbanDensity = population * 1e9 / (urbanLand * 1e6);
  const foodGap = Math.max(0, (population * 0.7) - foodMillionTonnesPerDay);
  const pressure = Math.min(100, Math.round((population / 100) * 55 + (natureReserve / 100) * 25 + (100 - foodEfficiency) * 0.2));

  return <div className="app-shell">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <header className="topbar">
      <button className="brand" onClick={()=>openPage('home')} aria-label="ODDLY home"><span className="brand-mark"><Orbit size={19}/></span><span>ODDLY<span className="brand-dot">.</span></span></button>
      <nav className={mobileMenu ? 'nav nav-open' : 'nav'}>
        <button className={page==='time'?'nav-link active':'nav-link'} onClick={()=>openPage('time')}> <History size={15}/> {t('TIME MACHINE','MESIN WAKTU')}</button>
        <button className={page==='whatif'?'nav-link active':'nav-link'} onClick={()=>openPage('whatif')}><Sparkles size={15}/> WHAT IF?</button>
        <button className="nav-link nav-about" onClick={()=>document.getElementById('about')?.scrollIntoView({behavior:'smooth'})}>{t('ABOUT','TENTANG')}</button>
      </nav>
      <div className="top-actions"><button className="lang-toggle" onClick={()=>setLang(isId?'en':'id')}>{isId?'ID':'EN'} <span>/</span> {isId?'EN':'ID'}</button><button className="menu-button" onClick={()=>setMobileMenu(!mobileMenu)} aria-label="Toggle menu">{mobileMenu?<X size={20}/>:<Menu size={20}/>}</button></div>
    </header>

    {page==='home' && <main>
      <section className="hero">
        <div className="hero-kicker"><span className="live-dot"/> {t('AN EXPERIMENT IN CURIOSITY','EKSPERIMEN RASA INGIN TAHU')}</div>
        <h1>{t('Reality is only','Realitas hanyalah')}<br/><span>{t('one version','satu versi')}</span> {t('of the story.','dari cerita.')}</h1>
        <p className="hero-copy">{t('Travel through the internet’s past. Run thought experiments about the impossible. Two ways to look at the world a little differently.','Jelajahi masa lalu internet. Jalankan eksperimen pikiran tentang hal yang mustahil. Dua cara untuk melihat dunia dari sudut yang berbeda.')}</p>
        <div className="hero-ctas"><button className="button button-primary" onClick={()=>openPage('time')}><History size={16}/>{t('Explore the past','Jelajahi masa lalu')}<ArrowUpRight size={16}/></button><button className="button button-ghost" onClick={()=>openPage('whatif')}><Sparkles size={16}/>{t('Question reality','Pertanyakan realitas')}<ArrowRight size={16}/></button></div>
        <div className="hero-orbit"><div className="orbit-ring ring-a"/><div className="orbit-ring ring-b"/><div className="orbit-core"><Orbit size={48}/></div><span className="orbit-label label-a">PAST</span><span className="orbit-label label-b">POSSIBLE</span><span className="orbit-label label-c">UNKNOWN</span></div>
        <div className="hero-foot"><span>01 / THE PAST</span><span>02 / THE POSSIBLE</span><span>SCROLL TO EXPLORE <ArrowDown size={12}/></span></div>
      </section>
      <section className="section-intro"><div><span className="eyebrow">{t('TWO WAYS TO EXPLORE','DUA CARA MENJELAJAH')}</span><h2>{t('Curiosity has','Rasa ingin tahu punya')} <em>{t('no timeline.','tanpa batas waktu.')}</em></h2></div><p>{t('One tool looks backward at what the web preserved. The other looks forward into questions we have not answered.','Satu alat melihat kembali jejak yang disimpan web. Satu lagi menjelajahi pertanyaan yang belum terjawab.')}</p></section>
      <section className="feature-grid">
        <article className="feature-card time-card"><div className="card-top"><span className="card-index">01 / ARCHIVE</span><span className="card-icon"><History size={20}/></span></div><div className="card-art archive-art"><div className="archive-window"><div className="window-bar"><i/><i/><i/><span>web.archive.org</span></div><div className="archive-content"><b>GOOGLE</b><div className="fake-search"/><div className="fake-lines"><i/><i/><i/></div><span className="archive-year">2001</span></div></div><div className="art-orbit"/></div><div className="card-body"><span className="eyebrow">{t('INTERNET TIME MACHINE','MESIN WAKTU INTERNET')}</span><h3>{t('The web has a past.','Internet juga punya masa lalu.')}</h3><p>{t('Revisit old versions of websites and see how the digital world changed, one snapshot at a time.','Kunjungi kembali versi lama website dan lihat bagaimana dunia digital berubah, satu arsip demi satu arsip.')}</p><button className="text-link" onClick={()=>openPage('time')}>{t('Enter the archive','Masuk ke arsip')} <ArrowUpRight size={16}/></button></div></article>
        <article className="feature-card whatif-card"><div className="card-top"><span className="card-index">02 / HYPOTHESIS</span><span className="card-icon"><Sparkles size={20}/></span></div><div className="card-art whatif-art"><div className="planet planet-main"/><div className="planet planet-small"/><div className="planet-orbit"/><span className="art-caption">WHAT IF<br/>THINGS WERE<br/>DIFFERENT?</span></div><div className="card-body"><span className="eyebrow">{t('WHAT IF MACHINE','MESIN BAGAIMANA JIKA')}</span><h3>{t('Question the ordinary.','Pertanyakan hal biasa.')}</h3><p>{t('Change a condition. Explore the consequences. Follow a question further than your imagination usually goes.','Ubah sebuah kondisi. Jelajahi konsekuensinya. Ikuti pertanyaan melampaui batas imajinasimu.')}</p><button className="text-link" onClick={()=>openPage('whatif')}>{t('Start an experiment','Mulai eksperimen')} <ArrowUpRight size={16}/></button></div></article>
      </section>
      <section className="featured-section"><div className="section-heading"><div><span className="eyebrow">{t('A QUESTION WORTH ASKING','PERTANYAAN YANG LAYAK DIUJI')}</span><h2>{t('Start with the','Mulai dari')} <em>{t('big questions.','pertanyaan besar.')}</em></h2></div><button className="text-link" onClick={()=>openPage('whatif')}>{t('All experiments','Semua eksperimen')} <ArrowRight size={15}/></button></div><div className="question-grid">{featured.map((f,i)=><button className="question-card" key={f.id} onClick={()=>{setScenario(f.id);openPage('whatif',f.id)}}><span className="question-number">0{i+1}</span><f.icon size={21}/><span className="question-category">{f.category}</span><strong>{isId?f.titleId:f.title}</strong><span className="question-arrow"><ArrowUpRight size={17}/></span></button>)}</div></section>
      <section className="manifesto" id="about"><span className="eyebrow">A NOTE FROM ODDLY</span><p>{t('Not every question needs a perfect answer. Sometimes the best discovery is learning how much there is to wonder about.','Tidak semua pertanyaan membutuhkan jawaban sempurna. Terkadang penemuan terbaik adalah menyadari betapa banyak hal yang masih bisa kita pertanyakan.')}</p><span className="manifesto-sign">STAY CURIOUS <span>✳</span></span></section>
    </main>}

    {page==='time' && <main className="tool-page">
      <button className="back-link" onClick={()=>openPage('home')}><ArrowLeft size={15}/>{t('Back to ODDLY','Kembali ke ODDLY')}</button>
      <div className="tool-heading"><span className="eyebrow"><History size={13}/> 01 / INTERNET TIME MACHINE</span><h1>{t('Take a trip','Kembali')} <em>{t('back in time.','ke masa lalu.')}</em></h1><p>{t('Enter a website. Find its archived footprints. See the web as it used to be.','Masukkan alamat website. Temukan jejak arsipnya. Lihat internet seperti dahulu.')}</p></div>
      <form className="search-panel" onSubmit={lookup}><label htmlFor="url-input">{t('WEBSITE ADDRESS','ALAMAT WEBSITE')}</label><div className="search-row"><Globe2 size={18}/><input id="url-input" value={url} onChange={e=>setUrl(e.target.value)} placeholder="example.com"/><button className="button button-primary" disabled={loading}>{loading?'SEARCHING...':t('Find history','Cari arsip')} <Search size={15}/></button></div><div className="suggestions"><span>{t('TRY A CLASSIC','COBA WEBSITE INI')}</span>{['google.com','youtube.com','wikipedia.org','yahoo.com'].map(x=><button type="button" key={x} onClick={()=>setUrl('https://www.'+x)}>{x}</button>)}</div></form>
      {error && <div className="notice error-notice"><Info size={17}/>{error}</div>}
      {captures.length>0 && <><div className="results-meta"><div><span className="eyebrow">{t('ARCHIVE RESULTS','HASIL ARSIP')}</span><h2>{captures.length.toLocaleString()} <em>{t('snapshots found','arsip ditemukan')}</em></h2></div><span className="mono">{years[0]} — {years[years.length-1]}</span></div><div className="timeline-panel"><div className="timeline-top"><span>{t('SELECT A YEAR','PILIH TAHUN')}</span><span>{selectedCaptures.length} {t('captures','arsip')}</span></div><input className="year-slider" type="range" min={years[0]} max={years[years.length-1]} value={year} onChange={e=>{setYear(Number(e.target.value));setActiveCapture(null)}}/><div className="year-labels"><span>{years[0]}</span><strong>{year}</strong><span>{years[years.length-1]}</span></div><div className="year-chips">{years.map(y=><button className={year===y?'selected':''} key={y} onClick={()=>{setYear(y);setActiveCapture(null)}}>{y}</button>)}</div></div><div className="capture-list"><div className="capture-list-head">{t('AVAILABLE SNAPSHOTS','ARSIP YANG TERSEDIA')}</div>{selectedCaptures.slice(-12).reverse().map(c=><button key={c.timestamp} className={chosen?.timestamp===c.timestamp?'capture-row selected':'capture-row'} onClick={()=>setActiveCapture(c)}><CalendarDays size={16}/><span>{c.timestamp.slice(0,4)}.{c.timestamp.slice(4,6)}.{c.timestamp.slice(6,8)}</span><span className="capture-time">{c.timestamp.slice(8,10)}:{c.timestamp.slice(10,12)} UTC</span><ArrowUpRight size={15}/></button>)}</div>{chosen&&<div className="snapshot-preview"><div className="preview-head"><div><span className="eyebrow">{t('SELECTED SNAPSHOT','ARSIP TERPILIH')}</span><h3>{chosen.timestamp.slice(0,4)} / {chosen.timestamp.slice(4,6)} / {chosen.timestamp.slice(6,8)}</h3></div><a className="button button-primary" href={archiveUrl(chosen)} target="_blank" rel="noreferrer">{t('Open archived page','Buka halaman arsip')} <ArrowUpRight size={15}/></a></div><iframe title="Archived website snapshot" src={archiveUrl(chosen)} loading="lazy" sandbox="allow-scripts allow-same-origin allow-forms" referrerPolicy="no-referrer"/></div>}</>}
      <div className="notice"><Info size={17}/>{t('Archive coverage varies. Some pages may load incompletely or refuse to display inside the preview. Use “Open archived page” to view the snapshot directly on the Internet Archive.','Ketersediaan arsip berbeda-beda. Beberapa halaman mungkin tidak tampil sempurna di preview. Gunakan tombol “Buka halaman arsip” untuk melihatnya langsung di Internet Archive.')}</div>
    </main>}

    {page==='whatif' && <main className="tool-page whatif-page">
      <button className="back-link" onClick={()=>openPage('home')}><ArrowLeft size={15}/>{t('Back to ODDLY','Kembali ke ODDLY')}</button>
      <div className="tool-heading"><span className="eyebrow"><Sparkles size={13}/> 02 / WHAT IF MACHINE</span><h1>{t('Change one thing.','Ubah satu hal.')}<br/><em>{t('Explore everything.','Jelajahi dampaknya.')}</em></h1><p>{t('A small change can lead to a very different world. Choose a scenario and explore the ripple effects.','Perubahan kecil bisa menghasilkan dunia yang sangat berbeda. Pilih skenario dan jelajahi dampaknya.')}</p></div>
      <div className="scenario-tabs">{Object.entries(scenarios).map(([id,s])=><button key={id} className={scenario===id?'scenario-tab active':'scenario-tab'} onClick={()=>setScenario(id)}><s.icon size={17}/><span>{s.title}</span></button>)}</div>
      <section className="experiment-layout"><div className="experiment-main"><div className="experiment-cover"><div className="cover-stars"/><div className="cover-planet"/><span className="cover-label">ODDLY / THOUGHT EXPERIMENT 0{Object.keys(scenarios).indexOf(scenario)+1}</span><span className="cover-big">{scenario==='population'?'100B':scenario==='sun'?'SUN':'OFFLINE'}</span></div><div className="experiment-title"><span className="eyebrow">{t('THE SCENARIO','SKENARIO')}</span><h2>{activeScenario.title}</h2><p>{activeScenario.subtitle}</p></div>
      {scenario==='population' && <div className="population-results"><div className="metric-grid"><div className="metric"><span>{t('TOTAL POPULATION','TOTAL POPULASI')}</span><strong>{population}B</strong><small>{t('people','orang')}</small></div><div className="metric"><span>{t('LAND ALLOCATED','DARATAN TERSEDIA')}</span><strong>{land}M</strong><small>km²</small></div><div className="metric"><span>{t('PEOPLE PER KM²','ORANG PER KM²')}</span><strong>{Math.round(peoplePerKm).toLocaleString()}</strong><small>{t('average density','kepadatan rata-rata')}</small></div></div><div className="insight-box"><span className="eyebrow">{t('A QUICK WAY TO PICTURE IT','CARA MEMBAYANGKANNYA')}</span><div className="square-visual"><div className="square-person"/><div><strong>{footprint.toFixed(1)} m × {footprint.toFixed(1)} m</strong><p>{t('Theoretical square per person if the selected land area were divided equally. Not a realistic settlement plan.','Luas persegi teoritis per orang jika daratan dibagi rata. Ini bukan rancangan permukiman realistis.')}</p></div></div></div><div className="impact-list"><h3>{t('The scale of daily needs','Skala kebutuhan harian')}</h3><div><span>{t('Food required / day','Kebutuhan pangan / hari')}</span><strong>{foodMillionTonnesPerDay.toFixed(1)} million tonnes</strong></div><div><span>{t('Water at 50 L per person','Air pada 50 liter per orang')}</span><strong>{waterTrillionLitresPerDay.toFixed(2)} trillion L</strong></div><div><span>{t('Population vs today (~8.2B)','Populasi dibanding saat ini (~8,2M)')}</span><strong>{populationFactor.toFixed(1)}×</strong></div><div><span>{t('Urban density (allocated city land)','Kepadatan area urban')}</span><strong>{Math.round(urbanDensity).toLocaleString()} / km²</strong></div></div><div className="simulation-panel"><div className="simulation-head"><span className="eyebrow">{t('PLANETARY PRESSURE INDEX','INDEKS TEKANAN PLANET')}</span><strong>{pressure}/100</strong></div><div className="pressure-track"><i style={{width:pressure+'%'}}/></div><div className="simulation-grid"><div><small>{t('LAND FOR NATURE','DARATAN UNTUK ALAM')}</small><b>{natureLand.toFixed(1)}M km²</b></div><div><small>{t('USABLE LAND','DARATAN TERPAKAI')}</small><b>{usableLand.toFixed(1)}M km²</b></div><div><small>{t('FOOD SAVED BY EFFICIENCY','PANGAN DIAKALI EFISIENSI')}</small><b>{foodGap.toFixed(1)}M t/day</b></div></div><div className="land-bar"><i style={{width:urbanShare+'%'}}/><i style={{width:natureReserve+'%'}}/></div><div className="land-legend"><span>{t('Urban','Urban')}</span><span>{t('Nature reserve','Kawasan alam')}</span><span>{t('Other uses','Penggunaan lain')}</span></div><p className="model-warning">{t('Illustrative scenario model, not a scientific forecast. Pressure index is a designed indicator, not a measured planetary metric.','Model skenario ilustratif, bukan ramalan ilmiah. Indeks tekanan adalah indikator simulasi, bukan metrik planet yang terukur.')}</p></div></div>}
      {scenario==='sun' && <div className="impact-list"><h3>{t('A timeline of consequences','Linimasa konsekuensi')}</h3>{[[t('0–8 minutes','0–8 menit'),t('Nothing seems different yet. Sunlight already in transit continues reaching Earth.','Belum ada yang terasa berbeda. Cahaya yang sedang dalam perjalanan masih mencapai Bumi.')],[t('After ~8 minutes','Setelah ~8 menit'),t('The sky goes dark. Earth would no longer feel the Sun’s gravitational pull after the same delay.','Langit menjadi gelap. Bumi juga tidak lagi merasakan tarikan gravitasi Matahari setelah jeda yang sama.')],[t('Days to weeks','Hari hingga minggu'),t('The surface cools. Weather and ecosystems begin changing as photosynthesis stops.','Permukaan mendingin. Cuaca dan ekosistem mulai berubah saat fotosintesis berhenti.')],[t('Long term','Jangka panjang'),t('Most surface life faces catastrophic conditions. Deep-ocean and geothermal ecosystems may persist.','Sebagian besar kehidupan di permukaan menghadapi kondisi ekstrem. Ekosistem laut dalam dan geotermal mungkin bertahan.')]].map(([a,b])=><div className="impact-row"><span>{a}</span><p>{b}</p></div>)}</div>}
      {scenario==='internet' && <div className="impact-list"><h3>{t('Seven days offline','Tujuh hari tanpa internet')}</h3>{[[t('Day 1','Hari 1'),t('Cloud services, messaging, online payments, and many business workflows fail or degrade.','Layanan cloud, pesan, pembayaran daring, dan banyak alur kerja bisnis terganggu.')],[t('Days 2–3','Hari 2–3'),t('Organizations switch to backup procedures. Supply chains struggle where coordination relies on connected systems.','Organisasi beralih ke prosedur cadangan. Rantai pasok kesulitan jika koordinasinya bergantung pada sistem terhubung.')],[t('Days 4–5','Hari 4–5'),t('Cash access, local networks, radio, and offline records become more important. Effects vary enormously by region.','Akses uang tunai, jaringan lokal, radio, dan catatan offline menjadi lebih penting. Dampaknya sangat berbeda di tiap wilayah.')],[t('Days 6–7','Hari 6–7'),t('A recovery would be uneven. Some systems return quickly; others need reconciliation and manual repair.','Pemulihan tidak akan seragam. Sebagian sistem pulih cepat; lainnya perlu rekonsiliasi dan perbaikan manual.')]].map(([a,b])=><div className="impact-row"><span>{a}</span><p>{b}</p></div>)}</div>}
      </div>
      <aside className="control-panel"><div className="control-heading"><SlidersHorizontal size={17}/><span>{t('EXPERIMENT CONTROLS','KONTROL EKSPERIMEN')}</span></div>{scenario==='population' ? <><div className="control-group"><div className="control-label"><label>{t('Human population','Populasi manusia')}</label><strong>{population} billion</strong></div><input type="range" min="10" max="100" step="1" value={population} onChange={e=>setPopulation(Number(e.target.value))}/><div className="range-ends"><span>10B</span><span>100B</span></div></div><div className="control-group"><div className="control-label"><label>{t('Land area allocated','Luas daratan yang dialokasikan')}</label><strong>{land} million km²</strong></div><input type="range" min="1" max="149" step="1" value={land} onChange={e=>setLand(Number(e.target.value))}/><div className="range-ends"><span>1M</span><span>149M</span></div></div><div className="control-group"><div className="control-label"><label>{t('Food-system efficiency','Efisiensi sistem pangan')}</label><strong>{foodEfficiency}%</strong></div><input type="range" min="50" max="200" step="5" value={foodEfficiency} onChange={e=>setFoodEfficiency(Number(e.target.value))}/><div className="range-ends"><span>50%</span><span>200%</span></div></div><div className="control-group"><div className="control-label"><label>{t('Land used for cities','Daratan untuk kota')}</label><strong>{urbanShare}%</strong></div><input type="range" min="5" max="90" step="5" value={urbanShare} onChange={e=>setUrbanShare(Number(e.target.value))}/><div className="range-ends"><span>5%</span><span>90%</span></div></div><div className="control-group"><div className="control-label"><label>{t('Nature protected','Alam dilindungi')}</label><strong>{natureReserve}%</strong></div><input type="range" min="0" max="60" step="5" value={natureReserve} onChange={e=>setNatureReserve(Number(e.target.value))}/><div className="range-ends"><span>0%</span><span>60%</span></div></div><div className="control-note"><Info size={15}/>{t('Earth has about 149 million km² of land. The slider lets you reserve only a portion for this simplified thought experiment.','Bumi memiliki sekitar 149 juta km² daratan. Slider ini menentukan bagian yang dialokasikan dalam eksperimen sederhana ini.')}</div></> : <><div className="control-note"><Info size={15}/>{t('This scenario uses a fixed explanatory timeline rather than a predictive numerical simulation.','Skenario ini menggunakan linimasa penjelasan, bukan simulasi numerik prediktif.')}</div><button className="button button-ghost reset-button" onClick={()=>setScenario(scenario==='sun'?'internet':'sun')}>{t('Try another scenario','Coba skenario lain')} <ArrowRight size={15}/></button></>}<div className="control-footer"><span>MODEL TYPE</span><strong>{scenario==='population'?'Interactive scenario model':'Qualitative timeline'}</strong></div></aside></section>
      <section className="assumptions"><span className="eyebrow"><Info size={13}/> {t('IMPORTANT CONTEXT','KONTEKS PENTING')}</span><h3>{t('A model is a lens, not a prophecy.','Model adalah lensa, bukan ramalan.')}</h3><p>{t('The population experiment uses transparent arithmetic to illustrate scale. It does not model food systems, climate feedback, housing, migration, technology, or ecological limits. The daily food figure assumes 0.7 kg per person and is a rough mass estimate, not a nutrition plan. Real outcomes would depend on countless interacting factors.','Eksperimen populasi memakai perhitungan sederhana untuk menggambarkan skala. Model ini tidak menghitung sistem pangan, iklim, perumahan, migrasi, teknologi, atau batas ekologis. Angka pangan harian mengasumsikan 0,7 kg per orang dan hanya perkiraan massa, bukan rancangan nutrisi. Dampak nyata bergantung pada banyak faktor yang saling berinteraksi.')}</p></section>
    </main>}

    <footer className="footer"><button className="brand footer-brand" onClick={()=>openPage('home')}><span className="brand-mark"><Orbit size={17}/></span><span>ODDLY<span className="brand-dot">.</span></span></button><span>{t('A playground for curious minds.','Ruang bermain untuk pikiran yang penasaran.')}</span><span className="footer-right">MADE FOR THE CURIOUS <span>✳</span></span></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);