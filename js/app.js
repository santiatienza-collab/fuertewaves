/* FuerteWaves web: previsión de surf de Fuerteventura (oleaje NOAA GFS Wave, viento/tiempo ECMWF IFS vía Open-Meteo). */
(function () {
  'use strict';

  const TZ = 'Atlantic/Canary';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ------------------------------------------------------------------ idioma */
  function pickLang() {
    try { const s = localStorage.getItem('fw_lang'); if (s && I18N[s]) return s; } catch (e) {}
    const n = (navigator.language || 'en').slice(0, 2);
    return I18N[n] ? n : 'en';
  }
  let lang = pickLang();
  const t = (k, ...a) => {
    let s = (I18N[lang] && I18N[lang][k]);
    if (s === undefined) s = I18N.en[k] !== undefined ? I18N.en[k] : k;
    a.forEach((v, i) => { s = s.replace('%' + (i + 1), v); });
    return s;
  };

  /* ------------------------------------------------------------------ utilidades */
  const isNum = (x) => typeof x === 'number' && !isNaN(x);
  const fmt = (v, d = 1, unit = '') => (isNum(v) ? v.toFixed(d) + unit : '-');
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp01 = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
  const angDiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
  const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  function compass(deg) {
    if (!isNum(deg)) return '-';
    const p = COMPASS[Math.floor(((deg % 360 + 360) % 360) / 22.5 + 0.5) % 16];
    return (lang === 'es' || lang === 'fr') ? p.replace(/W/g, 'O') : p;
  }
  function nowHour() {
    return new Date().toLocaleString('sv-SE', { timeZone: TZ }).replace(' ', 'T').slice(0, 13) + ':00';
  }
  function dayShort(iso) {
    return new Intl.DateTimeFormat(lang, { weekday: 'short', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'));
  }
  const dayLabel = (iso) => dayShort(iso) + ' ' + iso.slice(-2);
  function distKm(la1, lo1, la2, lo2) {
    const dy = (la1 - la2) * 111, dx = (lo1 - lo2) * 111 * Math.cos(((la1 + la2) / 2) * Math.PI / 180);
    return Math.sqrt(dx * dx + dy * dy);
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ------------------------------------------------------------------ datos (Open-Meteo) */
  async function getJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  async function cached(key, ttl, fn) {
    try {
      const c = JSON.parse(sessionStorage.getItem(key));
      if (c && Date.now() - c.t < ttl) return c.v;
    } catch (e) {}
    const v = await fn();
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v })); } catch (e) {}
    return v;
  }
  const num = (x) => (x === null || x === undefined ? NaN : x);

  async function getForecast(spot) {
    const raw = await cached('fc:' + spot.lat + ',' + spot.lon, 20 * 60e3, async () => {
      const m = (await getJSON(
        'https://marine-api.open-meteo.com/v1/marine?latitude=' + spot.lat + '&longitude=' + spot.lon +
        '&hourly=wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction,' +
        'secondary_swell_wave_height,secondary_swell_wave_period,secondary_swell_wave_direction' +
        '&models=ncep_gfswave016&forecast_days=7&timezone=' + TZ)).hourly;
      let w = null;
      try {
        w = (await getJSON(
          'https://api.open-meteo.com/v1/forecast?latitude=' + spot.lat + '&longitude=' + spot.lon +
          '&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl,precipitation,cape' +
          '&models=ecmwf_ifs025&forecast_days=7&timezone=' + TZ + '&wind_speed_unit=kn')).hourly;
      } catch (e) { w = null; }   // si el viento falla, se muestra igualmente el oleaje
      const idx = new Map(); if (w) w.time.forEach((x, i) => idx.set(x, i));
      return m.time.map((time, i) => {
        const j = idx.get(time);
        const g = (o, k, n) => (o && o[k] && o[k][n] !== undefined ? o[k][n] : null);
        return {
          time, waveH: g(m, 'wave_height', i), waveP: g(m, 'wave_period', i), waveDir: g(m, 'wave_direction', i),
          swellH: g(m, 'swell_wave_height', i), swellP: g(m, 'swell_wave_period', i), swellDir: g(m, 'swell_wave_direction', i),
          swell2H: g(m, 'secondary_swell_wave_height', i), swell2P: g(m, 'secondary_swell_wave_period', i), swell2Dir: g(m, 'secondary_swell_wave_direction', i),
          windKn: j === undefined ? null : g(w, 'wind_speed_10m', j), gustKn: j === undefined ? null : g(w, 'wind_gusts_10m', j),
          windDir: j === undefined ? null : g(w, 'wind_direction_10m', j), pressure: j === undefined ? null : g(w, 'pressure_msl', j),
          precip: j === undefined ? null : g(w, 'precipitation', j), cape: j === undefined ? null : g(w, 'cape', j),
        };
      });
    });
    return raw.map((h) => {
      const o = { time: h.time, day: h.time.slice(0, 10), hour: h.time.slice(11, 13) };
      Object.keys(h).forEach((k) => { if (k !== 'time') o[k] = num(h[k]); });
      return o;
    });
  }

  async function getTides(spot) {
    return cached('td:' + spot.lat + ',' + spot.lon, 60 * 60e3, async () => {
      const h = (await getJSON('https://marine-api.open-meteo.com/v1/marine?latitude=' + spot.lat + '&longitude=' + spot.lon +
        '&hourly=sea_level_height_msl&forecast_days=3&timezone=' + TZ)).hourly;
      const times = h.time, levels = h.sea_level_height_msl.map(num), events = [];
      for (let i = 1; i < levels.length - 1; i++) {
        const a = levels[i - 1], b = levels[i], c = levels[i + 1];
        if (!isNum(a) || !isNum(b) || !isNum(c)) continue;
        if (b > a && b >= c) events.push({ time: times[i], level: b, high: true });
        else if (b < a && b <= c) events.push({ time: times[i], level: b, high: false });
      }
      return { times, levels, events };
    });
  }

  async function getDaily(m) {
    return cached('dl:' + m.name, 60 * 60e3, async () => {
      const d = (await getJSON('https://api.open-meteo.com/v1/forecast?latitude=' + m.lat + '&longitude=' + m.lon +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max' +
        '&models=ecmwf_ifs025&forecast_days=5&timezone=' + TZ + '&wind_speed_unit=kn')).daily;
      return d.time.map((date, i) => ({ date, code: d.weather_code[i], tMax: d.temperature_2m_max[i], tMin: d.temperature_2m_min[i], precip: d.precipitation_sum[i], wind: d.wind_speed_10m_max[i] }));
    });
  }

  /* ------------------------------------------------------------------ puntuacion (misma logica que la app) */
  const swellDir = (h) => (isNum(h.swellDir) ? h.swellDir : h.waveDir);
  const swellH = (h) => (isNum(h.swellH) ? h.swellH : h.waveH);
  const swellP = (h) => (isNum(h.swellP) ? h.swellP : h.waveP);
  function energyKj(h) {
    const a = isNum(h.waveH) ? h.waveH : swellH(h), p = swellP(h);
    return isNum(a) && isNum(p) ? 1.9625 * a * a * p * p : NaN;
  }
  function windType(dir, kn, facing) {
    if (!isNum(dir) || !isNum(kn) || kn < 4) return 'calm';
    const d = angDiff(dir, facing);
    return d < 60 ? 'onshore' : d > 120 ? 'offshore' : 'cross';
  }
  /* marea normalizada (0 baja .. 1 alta) en la hora h, a partir de los 3 dias de marea; null si no hay dato */
  function tideNorm(time) {
    const td = state.td;
    if (!td || !td.times || !td.times.length) return null;
    const i = td.times.indexOf(time);
    if (i < 0) return null;
    const win = td.levels.slice(Math.max(0, i - 12), i + 13).filter(isNum);
    if (win.length < 6 || !isNum(td.levels[i])) return null;
    const lo = Math.min(...win), hi = Math.max(...win);
    return hi - lo < 0.2 ? null : (td.levels[i] - lo) / (hi - lo);
  }
  function tideScore(time, pref) {
    const n = tideNorm(time);
    if (n === null || !pref || pref === 'all') return 1;
    const r = { low: [0, 0.3], low_mid: [0, 0.65], mid: [0.25, 0.75], mid_high: [0.35, 1], high: [0.7, 1] }[pref === 'high_only' ? 'high' : pref] || [0, 1];
    const d = n < r[0] ? r[0] - n : n > r[1] ? n - r[1] : 0;
    return 1 - 0.6 * lerp01(d, 0, 0.5);
  }
  function score(h, s) {
    // oleaje: se elige entre swell principal y secundario el que mas energia util aporta al spot
    const comps = [[swellH(h), swellP(h), swellDir(h)], [h.swell2H, h.swell2P, h.swell2Dir]].filter((c) => isNum(c[0]) && isNum(c[1]) && c[0] > 0.2);
    if (!comps.length) return 1;
    const align = (dir) => (isNum(dir) ? 1 - 0.85 * lerp01(angDiff(dir, s.swell), 30, 120) : 0.5);
    let best = null;
    comps.forEach((c) => {
      const e = c[0] * c[0] * c[1] * align(c[2]) * (isNum(c[2]) && angDiff(c[2], s.facing) > 105 ? 0.3 : 1);   // swell que llega de espaldas a la costa: casi no entra
      if (!best || e > best.e) best = { e, h: c[0], p: c[1], d: c[2] };
    });
    const size = best.h, period = best.p;
    // tamano util en el spot: el swell fuera de ventana pierde altura
    const effSize = size * (0.5 + 0.5 * align(best.d));
    const sizeScore = effSize < s.min ? Math.max(0, effSize / s.min) : effSize <= s.max ? 1 : Math.max(0.2, s.max / effSize);
    const periodScore = 0.2 + 0.8 * lerp01(period, 6, 13);
    const swellScore = align(best.d);
    const windKnown = isNum(h.windKn) && isNum(h.windDir);
    let windScore = 0.6;
    if (windKnown) {
      const kn = h.windKn, ty = windType(h.windDir, kn, s.facing);
      const diff = angDiff(h.windDir, s.wind);
      const dirScore = 1 - 0.8 * lerp01(diff, 25, 120);
      // el offshore tolera mas viento; el onshore y el lateral arruinan la ola antes
      const speed = ty === 'offshore'
        ? (kn < 15 ? 1 : kn < 22 ? 0.75 : kn < 30 ? 0.45 : 0.2)
        : ty === 'cross'
          ? (kn < 8 ? 0.9 : kn < 14 ? 0.6 : kn < 20 ? 0.35 : 0.15)
          : (kn < 6 ? 0.85 : kn < 10 ? 0.5 : kn < 16 ? 0.3 : 0.12);
      windScore = kn < 4 ? 0.95 : dirScore * speed;
      if (isNum(h.gustKn) && h.gustKn - kn > 12) windScore *= 0.85;
    }
    const f = (x) => clamp(x, 0.05, 1);
    const tide = tideScore(h.time, s.tide);
    const total = Math.pow(f(sizeScore), 0.3) * Math.pow(f(windScore), 0.28) * Math.pow(f(periodScore), 0.2) * Math.pow(f(swellScore), 0.2) * Math.pow(f(tide), 0.12);
    const base = 1 + 9 * Math.pow(total, 1.5);
    // bonus: condiciones realmente alineadas (swell + viento + tamano util)
    const aligned = windKnown ? Math.min(swellScore, windScore, f(sizeScore)) : 0;
    const bonus = aligned >= 0.65 ? 1.5 * aligned + (effSize >= 1 ? Math.min(1.5, 0.5 * effSize) * aligned : 0) : 0;
    return clamp(Math.floor(base + bonus), 1, 10);
  }
  const scoreColor = (s) => (s <= 3 ? '#EF9A9A' : s <= 6 ? '#FFE082' : '#A5D6A7');
  const windColor = (ty) => ({ offshore: '#66BB6A', cross: '#FFCA28', onshore: '#EF5350', calm: '#81C784' }[ty]);
  const ratingKey = (s) => (s <= 3 ? 'rating_poor' : s <= 5 ? 'rating_fair' : s <= 7 ? 'rating_good' : 'rating_great');

  /* ------------------------------------------------------------------ piezas de interfaz */
  function arrow(dirFrom, size, color) {
    if (!isNum(dirFrom)) return '-';
    return '<span class="arrow" style="transform:rotate(' + (dirFrom + 180) + 'deg);font-size:' + size + 'px;' + (color ? 'color:' + color : '') + '">↑</span>';
  }
  function zoneLabel(z) {
    const key = z.split(' (')[0], extra = z.includes(' (') ? ' (' + z.split(' (')[1] : '';
    const map = { Norte: 'zone_north', Noroeste: 'zone_northwest', Oeste: 'zone_west', Suroeste: 'zone_southwest', Sur: 'zone_south', Este: 'zone_east' };
    return (map[key] ? t(map[key]) : key) + extra;
  }
  function dialSvg(dirFrom, good) {
    const c = 46, R = 35, pt = (deg, r) => { const a = (deg - 90) * Math.PI / 180; return [c + r * Math.cos(a), c + r * Math.sin(a)]; };
    const p1 = pt(good - 35, R), p2 = pt(good + 35, R);
    let s = '<svg viewBox="0 0 92 92" aria-hidden="true"><circle cx="46" cy="46" r="35" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="1.5"/>' +
      '<path d="M' + p1[0] + ' ' + p1[1] + ' A35 35 0 0 1 ' + p2[0] + ' ' + p2[1] + '" fill="none" stroke="rgba(102,187,106,.6)" stroke-width="7"/>';
    [0, 90, 180, 270].forEach((d) => { const a = pt(d, 30), b = pt(d, 35); s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="rgba(255,255,255,.35)"/>'; });
    s += '<text x="46" y="17" text-anchor="middle" font-size="8" fill="rgba(255,255,255,.55)">N</text>';
    if (isNum(dirFrom)) {
      const src = pt(dirFrom, R), tip = pt(dirFrom, R * 0.18), hl = 9;
      const b1 = (dirFrom - 90 + 25) * Math.PI / 180, b2 = (dirFrom - 90 - 25) * Math.PI / 180;
      s += '<g stroke="#F5A25D" stroke-width="2.6" stroke-linecap="round"><line x1="' + src[0] + '" y1="' + src[1] + '" x2="' + tip[0] + '" y2="' + tip[1] + '"/>' +
        '<line x1="' + tip[0] + '" y1="' + tip[1] + '" x2="' + (tip[0] + hl * Math.cos(b1)) + '" y2="' + (tip[1] + hl * Math.sin(b1)) + '"/>' +
        '<line x1="' + tip[0] + '" y1="' + tip[1] + '" x2="' + (tip[0] + hl * Math.cos(b2)) + '" y2="' + (tip[1] + hl * Math.sin(b2)) + '"/></g>' +
        '<circle cx="' + src[0] + '" cy="' + src[1] + '" r="5" fill="#F5A25D"/>';
    }
    return s + '</svg>';
  }
  function dial(titleKey, dirFrom, good, value, sub) {
    return '<div class="dial"><div class="lbl">' + t(titleKey) + '</div>' + dialSvg(dirFrom, good) +
      '<div class="v">' + value + '</div><div class="s">' + sub + '</div></div>';
  }
  function heroHTML(h, spot) {
    const sc = score(h, spot), ty = windType(h.windDir, h.windKn, spot.facing), known = isNum(h.windKn);
    return '<div class="hero-card">' +
      '<div><div class="lbl">' + t('lbl_wave') + '</div><div class="big">' + fmt(h.waveH, 1) + ' <small>m</small></div>' +
      '<div class="kv">' + fmt(swellP(h), 0, ' s') + '</div><div class="kv m">' + fmt(energyKj(h), 0) + ' kJ</div></div>' +
      dial('lbl_swell', swellDir(h), spot.swell, fmt(swellH(h), 1, 'm') + ' ' + compass(swellDir(h)), isNum(h.swell2H) ? '2: ' + fmt(h.swell2H, 1, 'm') + ' ' + fmt(h.swell2P, 0, 's') : '') +
      dial('lbl_wind', h.windDir, spot.wind, known ? fmt(h.windKn, 0) + ' kn ' + compass(h.windDir) : '-', known ? t('lbl_gust') + ' ' + fmt(h.gustKn, 0) + ' · <span style="color:' + windColor(ty) + '">' + t('wind_' + ty) + '</span>' : '') +
      '<div class="score"><div class="circle" style="background:' + scoreColor(sc) + '">' + sc + '</div><div class="word" style="color:' + scoreColor(sc) + '">' + t(ratingKey(sc)) + '</div></div>' +
      '<div class="legend"><i></i>' + t('dial_legend') + '</div></div>';
  }

  function hoursHTML(spot, hours, dayIdx) {
    const days = Array.from(new Set(hours.map((h) => h.day))).slice(0, 5);
    const d = days[Math.min(dayIdx, days.length - 1)];
    const hs = hours.filter((h) => h.day === d);
    const maxH = Math.max(1.5, ...hs.map((h) => (isNum(h.waveH) ? h.waveH : 0)));
    let l = '<div class="lcol"><div class="cell bar">m</div><div class="cell">s</div><div class="cell">kJ</div><div class="cell wind">kn</div><div class="cell">h</div></div>';
    let cols = '';
    hs.forEach((h) => {
      const sc = score(h, spot), ty = windType(h.windDir, h.windKn, spot.facing);
      const px = isNum(h.waveH) ? Math.max(8, Math.round(h.waveH / maxH * 72)) : 4;
      cols += '<div class="col"><div class="cell bar"><b>' + fmt(h.waveH, 1) + '</b><span class="b" style="height:' + px + 'px;background:' + scoreColor(sc) + '">' + sc + '</span></div>' +
        '<div class="cell">' + fmt(swellP(h), 0) + '</div><div class="cell muted">' + fmt(energyKj(h), 0) + '</div>' +
        '<div class="cell wind">' + (isNum(h.windKn) ? arrow(h.windDir, 15, windColor(ty)) + '<span style="color:' + windColor(ty) + '">' + fmt(h.windKn, 0) + '</span>' : '-') + '</div>' +
        '<div class="cell muted">' + h.hour + '</div></div>';
    });
    return '<h3>' + t('forecast') + '</h3><div class="chips" id="daychips">' +
      days.map((x, i) => '<button class="chip' + (i === dayIdx ? ' on' : '') + '" data-day="' + i + '">' + dayLabel(x) + '</button>').join('') + '</div>' +
      '<div class="hours card"><div class="tbl">' + l + cols + '</div></div>';
  }

  function tideTime(iso) {
    const d = iso.slice(0, 10), h = iso.slice(11, 16), today = nowHour().slice(0, 10);
    return d === today ? h : dayShort(d) + ' ' + h;
  }
  function tidesHTML(td) {
    if (!td || !td.levels.length) return '<h3>' + t('tides') + '</h3><div class="card note">' + t('tides_na') + '</div>';
    const now = nowHour();
    let ni = td.times.findIndex((x) => x >= now); if (ni < 0) ni = 0;
    const from = Math.max(0, ni - 4), to = Math.min(td.levels.length - 1, ni + 30);
    const lv = td.levels.slice(from, to + 1).filter(isNum);
    const lo = Math.min(...lv), hi = Math.max(...lv), span = Math.max(0.3, hi - lo);
    const W = 600, H = 110, pad = 10, n = to - from;
    const X = (i) => (W * i / Math.max(1, n)), Y = (v) => pad + (H - 2 * pad) * (1 - (v - lo) / span);
    let pts = ''; for (let i = 0; i <= n; i++) { const v = td.levels[from + i]; if (isNum(v)) pts += (pts ? ' L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }
    const area = pts + ' L' + W + ' ' + H + ' L0 ' + H + ' Z';
    let dots = '';
    td.events.forEach((e) => { const k = td.times.indexOf(e.time) - from; if (k >= 0 && k <= n) dots += '<circle cx="' + X(k).toFixed(1) + '" cy="' + Y(e.level).toFixed(1) + '" r="4.5" fill="' + (e.high ? '#F5A25D' : '#8CC8F0') + '"/>'; });
    const nx = X(ni - from);
    const svg = '<svg class="tide" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8CC8F0" stop-opacity=".4"/><stop offset="1" stop-color="#8CC8F0" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#tg)"/><path d="' + pts + '" fill="none" stroke="#8CC8F0" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' + dots +
      '<line x1="' + nx + '" y1="0" x2="' + nx + '" y2="' + H + '" stroke="#F5A25D" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>';
    const next = td.events.filter((e) => e.time >= now).slice(0, 4);
    const ev = next.map((e) => '<div><span style="color:' + (e.high ? '#F5A25D' : '#8CC8F0') + '">' + (e.high ? '▲' : '▼') + '</span><br>' + t(e.high ? 'tide_high' : 'tide_low') + '<b>' + tideTime(e.time) + '</b><span class="muted">' + fmt(e.level, 2, ' m') + '</span></div>').join('');
    return '<h3>' + t('tides') + '</h3><div class="card">' + svg + '<div class="tide-ev">' + ev + '</div></div>';
  }

  function infoHTML(s) {
    const mon = (m) => new Intl.DateTimeFormat(lang, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, m - 1, 15)));
    const tideMap = { all: 'tide_all', low: 'tide_low_only', mid: 'tide_mid', high: 'tide_high_only', low_mid: 'tide_low_mid', mid_high: 'tide_mid_high' };
    const rows = [
      ['info_experience', s.exp.map((e) => t('exp_' + e)).join(', ')],
      ['info_wave_type', t('type_' + s.type)],
      ['info_bottom', t('bottom_' + s.bottom)],
      ['info_best_tide', t(tideMap[s.tide] || 'tide_all')],
      ['info_good_swell', compass(s.swell)],
      ['info_wave_direction', t('wavedir_' + s.wave)],
      ['info_good_size', t('size_range', s.min.toFixed(0), s.max.toFixed(0))],
      ['info_good_wind', compass(s.wind)],
      ['info_best_season', t('season_range', mon(s.from), mon(s.to))],
    ];
    return '<div class="card info"><h3>' + t('spot_info') + '</h3><dl>' + rows.map((r) => '<div><dt>' + t(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('') + '</dl></div>';
  }

  /* ------------------------------------------------------------------ estado y render */
  const state = { tab: 'surf', spot: SPOTS[0], fc: null, fcErr: null, td: null, dayIdx: 0, muni: null, sat: 'ir', island: 'Fuerteventura' };

  function errHTML(e) {
    const rate = e && String(e.message).includes('429');
    return '<div class="err">' + t(rate ? 'err_rate' : 'err_generic') + ' <button class="btn" data-retry>' + t('retry') + '</button></div>';
  }

  function renderPanel() {
    const s = state.spot;
    $('#spothead').innerHTML = '<div class="spot-head"><div><h3>' + esc(s.name) + '</h3><div class="zone">' + zoneLabel(s.zone) + '</div></div></div>';
    const el = $('#tab-surf');
    let html = '';
    if (state.fcErr) html += errHTML(state.fcErr);
    else if (!state.fc) html += '<div class="card loading">' + t('loading') + '</div>';
    else {
      const hours = state.fc.filter((h) => h.time >= nowHour());
      if (hours.length) html += '<div class="card">' + heroHTML(hours[0], s) + '</div>' + '<div class="panel-hours">' + hoursHTML(s, hours, state.dayIdx) + '</div>';
    }
    html += '<div>' + tidesHTML(state.td) + '</div><div class="desk-only">' + infoHTML(s) + '</div>';
    el.innerHTML = html;
    $('#tab-ficha').innerHTML = infoHTML(s);
  }

  /* pestanas */
  function showTab(name) {
    state.tab = name;
    $$('.tabs button').forEach((b) => { const on = b.dataset.tab === name; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    if (name === 'ficha' && window.matchMedia('(min-width: 901px)').matches) name = 'surf';
    state.tab = name; document.body.className = 'tab-' + name;
    $$('.tabs button').forEach((b) => { const on = b.dataset.tab === name; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    ['surf', 'weather', 'cams', 'ficha'].forEach((n) => { $('#tab-' + n).hidden = n !== name; });
    if (name === 'surf' && spotMap) setTimeout(() => spotMap.invalidateSize(), 50);
    if (name === 'weather' && satMap) setTimeout(() => satMap.invalidateSize(), 50);
    $('#panel').scrollTop = 0;
    window.scrollTo(0, 0);
  }

  /* selector de spot (movil) */
  function renderSelect() {
    const sel = $('#spotsel');
    sel.innerHTML = Object.keys(ISLANDS).filter((i) => i !== 'Todas').map((isl) => '<optgroup label="' + isl + '">' + SPOTS.filter((s) => s.island === isl).sort((x, y) => x.name.localeCompare(y.name)).map((s) => '<option value="' + s.id + '"' + (s.id === state.spot.id ? ' selected' : '') + '>' + esc(s.name) + '</option>').join('') + '</optgroup>').join('');
  }

  const WX = {
    0: ['☀️', 'wx_clear'], 1: ['🌤️', 'wx_partly'], 2: ['🌤️', 'wx_partly'], 3: ['☁️', 'wx_cloudy'],
    45: ['🌫️', 'wx_fog'], 48: ['🌫️', 'wx_fog'],
    51: ['🌦️', 'wx_drizzle'], 53: ['🌦️', 'wx_drizzle'], 55: ['🌦️', 'wx_drizzle'],
    61: ['🌧️', 'wx_rain'], 63: ['🌧️', 'wx_rain'], 65: ['🌧️', 'wx_rain'], 80: ['🌧️', 'wx_rain'], 81: ['🌧️', 'wx_rain'], 82: ['🌧️', 'wx_rain'],
    71: ['❄️', 'wx_snow'], 73: ['❄️', 'wx_snow'], 75: ['❄️', 'wx_snow'],
    95: ['⛈️', 'wx_thunder'], 96: ['⛈️', 'wx_thunder'], 99: ['⛈️', 'wx_thunder'],
  };
  async function renderWeather() {
    const el = $('#wx');
    const ALLM = MUNIS.concat(MUNIS_EXTRA).filter((x) => distKm(state.spot.lat, state.spot.lon, x.lat, x.lon) < 70);
    if (!state.muni) state.muni = ALLM.reduce((a, m) => (distKm(state.spot.lat, state.spot.lon, m.lat, m.lon) < distKm(state.spot.lat, state.spot.lon, a.lat, a.lon) ? m : a), ALLM[0]);
    const m = state.muni;
    let html = '';
    const storm = state.fc && state.fc.filter((h) => h.time >= nowHour()).find((h) => h.cape > 800 || h.precip > 2 || h.gustKn > 35);
    if (storm) html += '<div class="storm">⚠️ ' + t('storm_warn', dayLabel(storm.day), storm.hour, fmt(storm.gustKn, 0), fmt(storm.precip, 1), fmt(storm.cape, 0)) + '</div>';
    html += '<div class="chips" id="munis">' + ALLM.map((x) => '<button class="chip' + (x.name === m.name ? ' on' : '') + '" data-muni="' + esc(x.name) + '">' + esc(x.name) + '</button>').join('') + '</div>';
    html += '<div class="card" id="days"><div class="loading">' + t('loading') + '</div></div><p class="small muted">' + t('five_day') + '</p>';
    el.innerHTML = html;
    try {
      const d = await getDaily(m);
      if (state.muni !== m) return;
      $('#days').innerHTML = '<div class="days">' + d.map((x) => {
        const w = WX[x.code] || WX[3];
        return '<div class="day"><div class="d">' + dayShort(x.date) + '</div><div class="e">' + w[0] + '</div><div class="l">' + t(w[1]) + '</div><div class="t">' + Math.round(x.tMax) + '°/' + Math.round(x.tMin) + '°</div><div class="w">' + Math.round(x.wind) + ' kn</div>' + (x.precip >= 0.1 ? '<div class="r">' + x.precip.toFixed(1) + ' mm</div>' : '') + '</div>';
      }).join('') + '</div>';
    } catch (e) { $('#days').innerHTML = errHTML(e); }
  }

  function renderCams() {
    const s = state.spot;
    const list = CAMS.slice().sort((x, y) => distKm(s.lat, s.lon, x.lat, x.lon) - distKm(s.lat, s.lon, y.lat, y.lon));
    const far = distKm(s.lat, s.lon, list[0].lat, list[0].lon) > 80;
    $('#cams').innerHTML = (far ? '<p class="note" style="grid-column:1/-1">' + ({ es: 'Webcams disponibles solo en Fuerteventura (a más de 80 km de este spot).', en: 'Webcams are only available for Fuerteventura (80+ km from this spot).', fr: 'Webcams disponibles uniquement à Fuerteventura (à plus de 80 km de ce spot).', de: 'Webcams nur für Fuerteventura verfügbar (über 80 km von diesem Spot).' }[lang] || '') + '</p>' : '') + list.map((c, i) => {
      const page = 'https://www.fuerteventuraplayas.com/' + (lang === 'es' ? 'es' : 'en') + '/webcams/' + c.slug + '/';
      const km = distKm(s.lat, s.lon, c.lat, c.lon);
      const frame = c.media
        ? '<div class="frame" data-play="' + esc(c.media) + '" data-title="' + esc(c.name) + '" style="background-image:url(' + c.img + ')" role="button" tabindex="0" aria-label="' + esc(c.name) + '"><span class="play"><i></i></span><span class="tag">' + km.toFixed(0) + ' km</span></div>'
        : '<a class="frame" href="' + page + '" target="_blank" rel="noopener" style="display:block;background-image:url(' + c.img + ')"><span class="nostream">' + t('cams_site_only') + '</span><span class="tag">' + km.toFixed(0) + ' km</span></a>';
      return '<article class="card cam' + (i < 2 ? ' near' : '') + '">' + frame + '<button type="button" class="camx" data-full aria-label="Fullscreen">⤢</button>' + '<h3>' + (i === 0 ? '★ ' : '') + esc(c.name) + '</h3><a href="' + page + '" target="_blank" rel="noopener">' + t('cams_open') + '</a></article>';
    }).join('');
  }

  function playCam(frame) {
    const url = 'https://www.fuerteventuraplayas.com/plyr/index.php?mediaid=' + encodeURIComponent(frame.dataset.play);
    frame.innerHTML = '<iframe src="' + url + '" allowfullscreen allow="autoplay; fullscreen" title="' + frame.dataset.title + '"></iframe>';
    frame.removeAttribute('data-play'); frame.style.cursor = 'default';
  }

  /* ------------------------------------------------------------------ mapas */
  let spotMap, markers = {}, satMap, satOverlay;
  const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
  function markerStyle(sel) { return sel ? { radius: 13, fillColor: '#fff', color: '#F5A25D', weight: 4, fillOpacity: 1 } : { radius: 9, fillColor: '#F5A25D', color: '#fff', weight: 3, fillOpacity: 1 }; }
  function initSpotMap() {
    spotMap = L.map('spotmap', { zoomControl: true, zoomSnap: 0.25 }).setView(ISLANDS['Fuerteventura'].c, ISLANDS['Fuerteventura'].z);
    L.tileLayer(ESRI, { maxZoom: 18, attribution: 'Tiles © Esri' }).addTo(spotMap);
    const mc = $('.mapcol'), eb = document.createElement('button');
    eb.className = 'expand'; eb.type = 'button'; eb.setAttribute('aria-label', 'Expand map'); eb.textContent = '⤢';
    mc.appendChild(eb);
    const mobile = () => window.matchMedia('(max-width: 900px)').matches;
    const interactive = (on) => ['dragging', 'touchZoom', 'doubleClickZoom', 'scrollWheelZoom'].forEach((k) => spotMap[k][on || !mobile() ? 'enable' : 'disable']());
    interactive(false);
    eb.addEventListener('click', () => {
      const full = mc.classList.toggle('full');
      document.body.classList.toggle('noscroll', full);
      eb.textContent = full ? '✕' : '⤢';
      interactive(full); setTimeout(() => spotMap.invalidateSize(), 60);
    });
    SPOTS.forEach((s) => {
      const m = L.circleMarker([s.lat, s.lon], markerStyle(s.id === state.spot.id)).addTo(spotMap);
      m.bindTooltip(s.name);
      m.on('click', () => selectSpot(s));
      markers[s.id] = m;
    });
  }
  function renderIslands() {
    $('#islands').innerHTML = Object.keys(ISLANDS).map((k) => '<button class="chip' + (state.island === k ? ' on' : '') + '" data-island="' + k + '">' + k + '</button>').join('');
  }
  function satURL(layer) {
    const R = 6378137, W = -28, E = -2, S = 17, N = 39;
    const mx = (lon) => lon * Math.PI / 180 * R, my = (lat) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * R;
    const w = 1400, h = Math.round(w * (my(N) - my(S)) / (mx(E) - mx(W)));
    return 'https://view.eumetsat.int/geoserver/ows?service=WMS&version=1.3.0&request=GetMap&layers=' + layer + '&styles=&format=image/png&transparent=true&crs=EPSG:3857' +
      '&bbox=' + mx(W) + ',' + my(S) + ',' + mx(E) + ',' + my(N) + '&width=' + w + '&height=' + h + '&_=' + Math.floor(Date.now() / 600000);
  }
  function initSatMap() {
    satMap = L.map('satmap', { scrollWheelZoom: false, minZoom: 4, maxZoom: 9 }).setView([28.4, -14.0], 6);
    L.tileLayer(ESRI, { maxZoom: 18, attribution: 'Tiles © Esri' }).addTo(satMap);
    satMap.setMaxBounds([[17, -28], [39, -2]]);
    setSat(state.sat);
  }
  function setSat(kind) {
    state.sat = kind;
    if (satOverlay) satMap.removeLayer(satOverlay);
    satOverlay = L.imageOverlay(satURL(kind === 'ir' ? 'msg_fes:ir108' : 'msg_fes:rgb_convection'), [[17, -28], [39, -2]], { opacity: 0.75 }).addTo(satMap);
    renderSatChips();
  }
  function renderSatChips() {
    $('#satchips').innerHTML = [['ir', 'sat_ir'], ['conv', 'sat_conv']].map((x) => '<button class="chip' + (state.sat === x[0] ? ' on' : '') + '" data-sat="' + x[0] + '">' + t(x[1]) + '</button>').join('');
  }

  /* ------------------------------------------------------------------ acciones */
  async function selectSpot(s) {
    state.spot = s; state.fc = null; state.fcErr = null; state.td = null; state.dayIdx = 0; state.muni = null;
    Object.keys(markers).forEach((id) => { markers[id].setStyle(markerStyle(id === s.id)); if (id === s.id) markers[id].bringToFront(); });
    if (state.island !== s.island) { state.island = s.island; renderIslands(); }
    if (spotMap) spotMap.panTo([s.lat, s.lon]);
    renderSelect(); renderPanel(); renderCams(); renderWeather();
    const [fc, td] = await Promise.allSettled([getForecast(s), getTides(s)]);
    if (state.spot !== s) return;
    if (fc.status === 'fulfilled') state.fc = fc.value; else state.fcErr = fc.reason;
    if (td.status === 'fulfilled') state.td = td.value; else state.td = { times: [], levels: [], events: [] };
    renderPanel(); renderWeather();
  }

  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('.lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
    document.title = 'FuerteWaves · Canarias surf forecast'; renderIslands();
    renderPanel(); renderCams(); renderWeather(); renderSatChips();
  }

  document.addEventListener('click', (e) => {
    const xb = e.target.closest('[data-full]');
    if (xb) { const c = xb.closest('.cam'), on = c.classList.toggle('full'); document.body.classList.toggle('noscroll', on); xb.textContent = on ? '✕' : '⤢'; const fr = c.querySelector('[data-play]'); if (on && fr) playCam(fr); return; }
    const fr = e.target.closest('[data-play]');
    if (fr) { playCam(fr); return; }
    const b = e.target.closest('button, a');
    if (!b) return;
    if (b.dataset.tab) { showTab(b.dataset.tab); try { history.replaceState(null, "", "#" + b.dataset.tab); } catch (x) {} }
    else if (b.dataset.lang) { lang = b.dataset.lang; try { localStorage.setItem('fw_lang', lang); } catch (x) {} applyLang(); }
    else if (b.dataset.day !== undefined) { state.dayIdx = +b.dataset.day; renderPanel(); }
    else if (b.dataset.muni) { state.muni = MUNIS.concat(MUNIS_EXTRA).find((m) => m.name === b.dataset.muni); renderWeather(); }
    else if (b.dataset.island) { state.island = b.dataset.island; renderIslands(); const v = ISLANDS[state.island]; spotMap.flyTo(v.c, v.z, { duration: 0.6 }); }
    else if (b.dataset.sat) { setSat(b.dataset.sat); }
    else if (b.dataset.retry !== undefined) {
      Object.keys(sessionStorage).filter((k) => k.startsWith('fc:') || k.startsWith('dl:')).forEach((k) => sessionStorage.removeItem(k));
      selectSpot(state.spot);
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'spotsel') selectSpot(SPOTS.find((s) => s.id === e.target.value));
  });
  document.addEventListener('keydown', (e) => {
    const fr = e.target.closest && e.target.closest('[data-play]');
    if (fr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); playCam(fr); }
  });

  /* ------------------------------------------------------------------ arranque */
  initSpotMap();
  initSatMap();
  applyLang();
  { const h = (new URLSearchParams(location.search).get("tab") || location.hash.slice(1)); if (["surf", "weather", "cams", "ficha"].includes(h)) showTab(h); }
  showTab(['surf', 'weather', 'cams', 'ficha'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'surf');
  selectSpot(SPOTS[0]);
  window.addEventListener('load', () => { spotMap.invalidateSize(); satMap.invalidateSize(); });
})();
