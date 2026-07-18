// ═══════════════════════════════════════════════════════
//  MINE CRUSH — full game logic
// ═══════════════════════════════════════════════════════

// ── SCREEN STATE ─────────────────────────────────────────
let screen = 'start';

function showScreen(name) {
  screen = name;
  document.getElementById('screen-start').classList.toggle('active', name === 'start');
  document.getElementById('screen-levels').classList.toggle('active', name === 'levels');
  document.getElementById('screen-store').classList.toggle('active', name === 'store');
  document.getElementById('screen-game').classList.toggle('active', name === 'game');
  document.getElementById('bottom-nav').classList.toggle('visible', name === 'start' || name === 'levels' || name === 'store');
  document.getElementById('nav-home-btn').classList.toggle('nav-active', name === 'start');
  document.getElementById('nav-levels-btn').classList.toggle('nav-active', name === 'levels');
  document.getElementById('nav-store-btn').classList.toggle('nav-active', name === 'store');
  if (name === 'levels') buildLevelPath();
}

function goToLevels() {
  initSFX();
  SFX.click();
  showScreen('levels');
}

function goToStore() {
  initSFX();
  SFX.click();
  showScreen('store');
  syncStoreUI();
}

function scrollToTier(id) {
  SFX.click();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function syncStoreUI() {
  const themeKey = localStorage.getItem('mc_theme') || 'classic';
  const bgKey = localStorage.getItem('mc_bg') || 'night';
  document.querySelectorAll('#store-themes .store-card[data-key]').forEach(c => {
    const active = c.dataset.key === themeKey;
    c.classList.toggle('active-item', active);
    const tag = c.querySelector('.store-card-tag');
    tag.textContent = active ? 'فعال' : 'انتخاب';
    tag.className = 'store-card-tag ' + (active ? 'active-tag' : 'price-tag');
  });
  document.querySelectorAll('#store-backgrounds .store-card[data-key]').forEach(c => {
    const active = c.dataset.key === bgKey;
    c.classList.toggle('active-item', active);
    const tag = c.querySelector('.store-card-tag');
    tag.textContent = active ? 'فعال' : 'انتخاب';
    tag.className = 'store-card-tag ' + (active ? 'active-tag' : 'price-tag');
  });
}

function switchStoreTab(tab) {
  SFX.click();
  document.querySelectorAll('.store-tab').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
  document.querySelectorAll('.store-panel').forEach(el => el.classList.toggle('active', el.id === 'store-' + tab));
}

function selectTheme(el) {
  SFX.click();
  const key = el.dataset.key;
  document.querySelectorAll('#store-themes .store-card').forEach(c => c.classList.remove('active-item'));
  el.classList.add('active-item');
  const tag = el.querySelector('.store-card-tag');
  document.querySelectorAll('#store-themes .store-card-tag').forEach(t => {
    if (!t.closest('.store-card').classList.contains('active-item')) { t.textContent = 'انتخاب'; t.className = 'store-card-tag price-tag'; }
  });
  tag.textContent = 'فعال';
  tag.className = 'store-card-tag active-tag';
  applyBlockTheme(key);
}

function previewBooster(el) {
  SFX.click();
  el.classList.add('do-pop');
  setTimeout(() => el.classList.remove('do-pop'), 300);
  const key = el.dataset.key;
  addBooster(key, 1);
  const msgs = {
    hammer: 'چکش 🔨 اضافه شد! پایین صفحه‌ی بازی، حین انجام مرحله فعالش کن',
    shuffle: 'تعویض 🔀 اضافه شد! پایین صفحه‌ی بازی، حین انجام مرحله فعالش کن',
    extramove: 'حرکت‌اضافه ➕ اضافه شد! پایین صفحه‌ی بازی، حین انجام مرحله فعالش کن',
    colorbomb: 'بمب‌رنگی 🌈 اضافه شد! پایین صفحه‌ی بازی، حین انجام مرحله فعالش کن'
  };
  flashMsg(msgs[key] || 'این بوستر به موجودیت اضافه شد');
}

function selectBg(el) {
  SFX.click();
  const key = el.dataset.key;
  document.querySelectorAll('#store-backgrounds .store-card').forEach(c => c.classList.remove('active-item'));
  el.classList.add('active-item');
  const tag = el.querySelector('.store-card-tag');
  document.querySelectorAll('#store-backgrounds .store-card-tag').forEach(t => {
    if (!t.closest('.store-card').classList.contains('active-item')) { t.textContent = 'انتخاب'; t.className = 'store-card-tag price-tag'; }
  });
  tag.textContent = 'فعال';
  tag.className = 'store-card-tag active-tag';
  applyBgTheme(key);
}

function goToStart() {
  initSFX();
  SFX.click();
  clearInterval(musicTimer);
  showScreen('start');
}

// ── DIFFICULTY SYSTEM ────────────────────────────────────
// Block goals per level: each type has a target count to break
// Format: [diamond, redstone, emerald, gold]
function getLevelGoal(lv) {
  const tier = Math.floor((lv - 1) / 5);
  const base = 15 + lv * 3;          // grows with level
  const spread = Math.min(4, 1 + Math.floor(lv / 4)); // how many types needed
  const goals = {};
  const active = ['redstone','diamond','emerald','gold'].slice(0, spread);
  active.forEach((t, i) => {
    goals[t] = base + i * Math.floor(lv / 3);
  });
  return goals;
}

function getDifficulty(lv) {
  const tier = Math.floor((lv - 1) / 5);
  const startMoves = Math.max(16, 32 - tier * 2);
  const blockerChance = tier >= 1 ? Math.min(0.20, 0.03 + tier * 0.022) : 0;
  const lockHits = tier >= 3 ? 2 : 1;
  const lTargetBase = 500 + tier * 120;
  return { tier, startMoves, blockerChance, lockHits, lTargetBase };
}
const MAX_LOCKED_ON_BOARD = 6;

// ── LEVEL PATH (level select screen) ─────────────────────
function buildLevelPath() {
  const wrap = document.getElementById('level-path');
  wrap.innerHTML = '';
  const total = Math.max(20, maxLevel + 8);
  const zig = [50, 74, 50, 26];

  for (let i = 1; i <= total; i++) {
    const locked = i > maxLevel;
    const isCurrent = i === maxLevel;
    const node = document.createElement('div');
    node.className = 'lvl-node' + (locked ? ' locked' : '') + (isCurrent ? ' current' : '') + (i < maxLevel ? ' done' : '');
    node.style.left = zig[(i - 1) % zig.length] + '%';
    node.style.top = ((i - 1) * 78 + 10) + 'px';
    node.style.setProperty('--d', (i * 0.035) + 's');

    const diff = getDifficulty(i);
    const iceBadge = diff.blockerChance > 0 ? '<span class="lvl-ice">❄</span>' : '';
    const inner = locked
      ? '<span class="lvl-lock">🔒</span>'
      : '<span class="lvl-num">' + i + '</span>';

    node.innerHTML =
      '<div class="lvl-circle">' + inner + '</div>' +
      iceBadge +
      (isCurrent ? '<div class="lvl-pin">▼</div>' : '');

    if (!locked) {
      node.addEventListener('pointerdown', () => startLevel(i));
    } else {
      node.addEventListener('pointerdown', () => { shakeNode(node); SFX.nomatch(); toast('این مرحله هنوز قفله!'); });
    }
    wrap.appendChild(node);
  }

  requestAnimationFrame(() => {
    const cur = wrap.querySelector('.lvl-node.current') || wrap.lastElementChild;
    cur && cur.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
}

function shakeNode(node) {
  node.classList.remove('shake');
  void node.offsetWidth;
  node.classList.add('shake');
  setTimeout(() => node.classList.remove('shake'), 420);
}

let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1700);
}

// ── BLOCK IMAGES ──────────────────────────────────────────
const BLOCK_IMG = {
  diamond: 'images/gem-diamond.png',
  redstone: 'images/gem-redstone.png',
  emerald: 'images/gem-emerald.png',
  gold: 'images/gem-gold.png',
};

// ── AUDIO ENGINE ──────────────────────────────────────────
let AC = null, bgGain, sfxGain, musicTimer = null, soundOn = true;
let reverbNode = null, reverbSend = null;

function makeReverb() {
  const len = AC.sampleRate * 1.8;
  const buf = AC.createBuffer(2, len, AC.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5) * 0.4;
  }
  const conv = AC.createConvolver();
  conv.buffer = buf;
  return conv;
}

function initSFX() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    bgGain = AC.createGain(); bgGain.gain.value = 0.10;
    reverbNode = makeReverb();
    reverbSend = AC.createGain(); reverbSend.gain.value = 0.5;
    bgGain.connect(reverbSend); reverbSend.connect(reverbNode); reverbNode.connect(AC.destination);
    bgGain.connect(AC.destination);
    sfxGain = AC.createGain(); sfxGain.gain.value = 0.38; sfxGain.connect(AC.destination);
    if (soundOn) setTimeout(() => { beatIdx = 0; startMusic(); }, 150);
  } catch (e) { AC = null; }
}

function tone(freq, dur, type, vol, delay) {
  type = type || 'sine'; vol = vol || 0.28; delay = delay || 0;
  if (!AC || !soundOn) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq;
  const t = AC.currentTime + delay;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(sfxGain);
  o.start(t); o.stop(t + dur + 0.01);
}

function burst(dur, vol, fc) {
  dur = dur || 0.08; vol = vol || 0.35; fc = fc || 600;
  if (!AC || !soundOn) return;
  const len = AC.sampleRate * dur, buf = AC.createBuffer(1, len, AC.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = buf; f.type = 'bandpass'; f.frequency.value = fc; f.Q.value = 1; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(sfxGain); s.start();
}

const SFX = {
  diamond: () => { tone(1760, .28, 'sine', .32); tone(2093, .2, 'sine', .22, .06); tone(2637, .14, 'sine', .13, .13); },
  redstone: () => { burst(.09, .38, 500); tone(200, .14, 'sawtooth', .2); },
  emerald: () => { tone(1047, .28, 'triangle', .28); tone(1319, .2, 'triangle', .22, .07); tone(1568, .14, 'triangle', .15, .14); },
  gold: () => { tone(130, .42, 'triangle', .42); tone(196, .18, 'square', .14, .04); tone(261, .22, 'sine', .17, .09); },
  match: (n) => { const f = 440 * Math.pow(1.12, n); tone(f, .14, 'sine', .22); tone(f * 1.26, .1, 'sine', .17, .07); },
  special: () => { for (let i = 0; i < 4; i++) setTimeout(() => { burst(.1, .3, 100 + Math.random() * 200); tone(80 + Math.random() * 120, .3, 'sawtooth', .25); }, i * 40); tone(660, .22, 'sine', .25, .15); },
  nomatch: () => { tone(220, .12, 'square', .16); tone(165, .12, 'square', .12, .1); },
  gameover: () => { [440, 392, 349, 330, 294, 262, 220].forEach((f, i) => tone(f, .36, 'sine', .25, i * .12)); },
  levelup: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .18, 'sine', .26, i * .09)); },
  click: () => { tone(700, .05, 'square', .14); tone(900, .04, 'square', .1, .03); },
  iceCrack: () => { tone(950, .09, 'square', .16); tone(750, .07, 'square', .11, .04); },
  iceBreak: () => { burst(.12, .35, 1300); tone(1500, .14, 'sine', .22); tone(1900, .1, 'sine', .16, .06); },
};

// ── BACKGROUND MUSIC ──────────────────────────────────────
const SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 784.00, 880.00];
const MELODY = [0, 2, 4, 7, 6, 9, 7, 4, 2, 4, 6, 7, 4, 2, 0, 2, 4, 6, 9, 7, 6, 4, 2, 0, 2, 4];
const BASS_P = [0, 0, 4, 0, 0, 4, 0, 0];
let beatIdx = 0;

function playBgNote(freq, dur, vol, type) {
  type = type || 'sine';
  if (!AC || !bgGain) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq;
  const now = AC.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 0.18);
  g.gain.setValueAtTime(vol, now + dur * 0.55);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g); g.connect(bgGain);
  o.start(now); o.stop(now + dur + 0.05);
}
function playBgChord(freqs, dur, vol) { freqs.forEach(f => playBgNote(f, dur, vol / freqs.length)); }

function startMusic() {
  clearInterval(musicTimer);
  if (!AC || !soundOn || !bgGain) return;
  const BPM = 800;
  const tick = () => {
    if (!AC || !soundOn) return;
    const beat = beatIdx % 24;
    const mFreq = SCALE[MELODY[beat % MELODY.length]];
    playBgNote(mFreq, BPM / 1000 * 1.3, 0.055, 'sine');
    if (beat % 3 === 0) playBgNote(mFreq * 1.498, BPM / 1000 * 1.0, 0.022, 'sine');
    if (beat % 2 === 0) {
      const bFreq = SCALE[BASS_P[Math.floor(beat / 2) % BASS_P.length]] * 0.5;
      playBgNote(bFreq, BPM / 1000 * 1.8, 0.065, 'triangle');
    }
    if (beat % 8 === 0) {
      const r = SCALE[beat < 12 ? 0 : 4];
      playBgChord([r, r * 1.25, r * 1.5], BPM / 1000 * 6, 0.035);
    }
    beatIdx++;
  };
  tick();
  musicTimer = setInterval(tick, BPM);
}

function toggleSound() {
  soundOn = !soundOn;
  document.getElementById('snd-btn').classList.toggle('muted', !soundOn);
  if (soundOn) { if (bgGain) bgGain.gain.setTargetAtTime(0.10, AC.currentTime, 0.3); startMusic(); }
  else { if (bgGain) bgGain.gain.setTargetAtTime(0, AC.currentTime, 0.3); clearInterval(musicTimer); }
}

// ── CONSTANTS ──────────────────────────────────────────────
const G = 7;
const TYPES = ['diamond', 'redstone', 'emerald', 'gold'];

// ── STORE: BLOCK THEMES & BACKGROUNDS (visual filters, no new art needed) ──
const BLOCK_THEMES = { classic: 1, nether: 1, ocean: 1, crystal: 1 };
const BLOCK_IMAGE_SETS = {};
const CLASSIC_BLOCK_IMG = { ...BLOCK_IMG }; // snapshot of the default gem art, used to restore non-image themes

// ── CUSTOM BLOCK-SKIN PACKS ──────────────────────────────────────────
// To add a new pack: copy one {...} entry below, change key/name/tier/images, done.
//   key    → unique id, English, no spaces (used internally only, never shown)
//   name   → Persian name shown on the store card
//   tier   → 'common' | 'rare' | 'epic' | 'legendary'
//   images → one file per block type; put the actual PNGs in images/
const CUSTOM_BLOCK_PACKS = [
  {
    key: 'classic2',
    name: 'کلاسیک ۲',
    tier: 'rare',
    images: {
      diamond:  'images/enderman.png',
      redstone: 'images/skeleton.png',
      emerald:  'images/villager.png',
      gold:     'images/creeper.png'
    }
  }
  // add more packs here, separated by commas, same shape as above ↑
];

function renderCustomBlockPacks() {
  CUSTOM_BLOCK_PACKS.forEach(pack => {
    BLOCK_THEMES[pack.key] = 1;
    BLOCK_IMAGE_SETS[pack.key] = pack.images;

    const grid = document.querySelector('#theme-tier-' + pack.tier + ' .store-tier-grid');
    if (!grid) { console.warn('Unknown tier "' + pack.tier + '" for pack "' + pack.key + '" — skipped.'); return; }

    const card = document.createElement('div');
    card.className = 'store-card';
    card.dataset.key = pack.key;
    card.onclick = () => selectTheme(card);
    card.innerHTML =
      '<div class="theme-preview">' +
        '<div class="theme-swatch"><img src="' + pack.images.diamond + '" alt="diamond"></div>' +
        '<div class="theme-swatch"><img src="' + pack.images.redstone + '" alt="redstone"></div>' +
        '<div class="theme-swatch"><img src="' + pack.images.emerald + '" alt="emerald"></div>' +
        '<div class="theme-swatch"><img src="' + pack.images.gold + '" alt="gold"></div>' +
      '</div>' +
      '<div class="store-card-name">' + pack.name + '</div>' +
      '<div class="store-card-tag price-tag">انتخاب</div>';
    grid.appendChild(card);
  });
}
const BG_THEMES = {
  sunset: { overlay: 'rgba(4,0,18,.5)',  filter: 'none' },
  night:  { photo: 'images/dark.png',   overlay: 'rgba(5,8,35,.3)', filter: 'none' },
  forest: { photo: 'images/noon.png',   overlay: 'rgba(6,25,10,.3)', filter: 'none' },
  cave:   { photo: 'images/rezero.png', overlay: 'rgba(2,2,4,.3)',  filter: 'none' },
  classic: { photo: 'images/classic.png', overlay: 'rgba(4,0,18,.3)', filter: 'none' },
  darkwoods: { photo: 'images/bg-photo-darkwoods.jpg', overlay: 'rgba(4,0,18,.3)', filter: 'none' },
  moonpoppy: { photo: 'images/bg-photo-moonpoppy.jpg', overlay: 'rgba(4,0,18,.3)', filter: 'none' },
  duocats:   { photo: 'images/bg-photo-duocats.jpg',   overlay: 'rgba(30,10,0,.28)', filter: 'none' }
};


function applyBlockTheme(key) {
  if (!BLOCK_THEMES[key]) key = 'classic';
  const gridEl = document.getElementById('grid');
  const goalEl = document.getElementById('goal-wrap');
  [gridEl, goalEl].forEach(el => {
    if (!el) return;
    el.classList.remove('theme-nether', 'theme-ocean', 'theme-crystal');
    if (key !== 'classic') el.classList.add('theme-' + key);
  });
  const swap = BLOCK_IMAGE_SETS[key];
  TYPES.forEach(t => { BLOCK_IMG[t] = swap ? swap[t] : CLASSIC_BLOCK_IMG[t]; });
  if (cellEls.length) render(); // refresh any grid already on screen so the swap shows immediately
  localStorage.setItem('mc_theme', key);
}

function applyBgTheme(key) {
  if (!BG_THEMES[key]) key = 'night';
  const t = BG_THEMES[key];
  const layer = document.getElementById('bg-layer'), overlay = document.getElementById('bg-overlay');
  if (layer) {
    layer.style.backgroundImage = t.photo ? `url('${t.photo}')` : '';
    layer.style.filter = t.filter;
  }
  if (overlay) overlay.style.background = t.overlay;
  localStorage.setItem('mc_bg', key);
}

const CLR = { diamond: '#5dd5f5', redstone: '#cc2200', emerald: '#17c442', gold: '#f0a000' };
const SP_ROW = 'row', SP_COL = 'col', SP_BOMB = 'bomb', SP_RAIN = 'rainbow';
const SP_SYM = { row: '↔', col: '↕', bomb: '✦', rainbow: '✸' };

// ── BOOSTER INVENTORY ───────────────────────────────────
function loadBoosterInv() {
  try {
    return Object.assign({ hammer: 0, shuffle: 0, extramove: 0, colorbomb: 0 },
      JSON.parse(localStorage.getItem('mc_boosterInv') || '{}'));
  } catch (e) {
    return { hammer: 0, shuffle: 0, extramove: 0, colorbomb: 0 };
  }
}
let boosterInv = loadBoosterInv();

function saveBoosterInv() {
  localStorage.setItem('mc_boosterInv', JSON.stringify(boosterInv));
}

function renderBoosterCounts() {
  document.querySelectorAll('.boost-count').forEach(el => {
    const n = boosterInv[el.dataset.count] || 0;
    el.textContent = n;
    el.classList.toggle('zero', n === 0);
  });
}

function addBooster(type, qty) {
  boosterInv[type] = (boosterInv[type] || 0) + qty;
  saveBoosterInv();
  renderBoosterCounts();
}

function spendBooster(type) {
  if ((boosterInv[type] || 0) <= 0) return false;
  boosterInv[type]--;
  saveBoosterInv();
  renderBoosterCounts();
  return true;
}

// ── STATE ────────────────────────────────────────────────
let grid = [], sel = null, score = 0, moves = 30, level = 1;
let armedBooster = null;
let lScore = 0, lTarget = 500, bestScore = +(localStorage.getItem('mc_best') || 0);
let maxLevel = +(localStorage.getItem('mc_maxLevel') || 1);
let busy = false, cascade = 0, ptrStart = null, ended = false;
let levelGoal = {}, goalProgress = {}, levelCleared = false;
let displayedScore = 0, scoreAnimTarget = null;

const rnd = () => TYPES[Math.random() * 4 | 0];

// ── GRID ────────────────────────────────────────────────
function makeGrid(diff) {
  grid = [];
  for (let r = 0; r < G; r++) {
    grid[r] = [];
    for (let c = 0; c < G; c++) {
      let t;
      do { t = rnd(); } while (
        (c >= 2 && grid[r][c - 1]?.type === t && grid[r][c - 2]?.type === t) ||
        (r >= 2 && grid[r - 1][c]?.type === t && grid[r - 2][c]?.type === t)
      );
      grid[r][c] = { type: t, sp: null, locked: 0 };
    }
  }
  if (diff && diff.blockerChance > 0) {
    const maxInitial = Math.min(MAX_LOCKED_ON_BOARD, Math.floor(G * G * diff.blockerChance));
    let placed = 0, attempts = 0;
    while (placed < maxInitial && attempts < 60) {
      attempts++;
      const r = Math.random() * G | 0, c = Math.random() * G | 0;
      if (grid[r][c].locked === 0) { grid[r][c].locked = diff.lockHits; placed++; }
    }
  }
}

function applyGravity() {
  for (let c = 0; c < G; c++) {
    let w = G - 1;
    for (let r = G - 1; r >= 0; r--) {
      if (grid[r][c]) { grid[w][c] = grid[r][c]; if (w !== r) grid[r][c] = null; w--; }
    }
    for (let r = w; r >= 0; r--) grid[r][c] = null;
  }
}

function refill() {
  const diff = getDifficulty(level);
  let lockedCount = 0;
  for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) if (grid[r][c]?.locked > 0) lockedCount++;
  for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) {
    if (!grid[r][c]) {
      const makeLocked = diff.blockerChance > 0 && lockedCount < MAX_LOCKED_ON_BOARD && Math.random() < diff.blockerChance * 0.6;
      grid[r][c] = { type: rnd(), sp: null, locked: makeLocked ? diff.lockHits : 0 };
      if (makeLocked) lockedCount++;
    }
  }
}

function hasMoves() {
  for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < G && nc < G) {
        [grid[r][c], grid[nr][nc]] = [grid[nr][nc], grid[r][c]];
        const ok = !!findMatches().length;
        [grid[r][c], grid[nr][nc]] = [grid[nr][nc], grid[r][c]];
        if (ok) return true;
      }
    }
  }
  return false;
}

function useBooster(type) {
  if (busy || ended) return;
  if (armedBooster === type) {
    armedBooster = null;
    document.querySelectorAll('.boost-btn').forEach(b => b.classList.remove('armed'));
    document.getElementById('grid').classList.remove('booster-armed');
    flashMsg('لغو شد');
    return;
  }
  if ((boosterInv[type] || 0) <= 0) {
    initSFX(); SFX.click();
    flashMsg('این بوستر رو نداری، از فروشگاه تهیه کن 🛍️');
    return;
  }
  if (type === 'shuffle') {
    initSFX(); SFX.click();
    spendBooster('shuffle');
    reshuffleBoard();
    return;
  }
  if (type === 'extramove') {
    initSFX(); SFX.click();
    spendBooster('extramove');
    moves += 5; updateHUD();
    flashMsg('۵ حرکت اضافه شد! ➕');
    return;
  }
  if (type === 'hammer' || type === 'colorbomb') {
    initSFX(); SFX.click();
    armedBooster = type;
    document.querySelectorAll('.boost-btn').forEach(b => b.classList.toggle('armed', b.dataset.type === type));
    document.getElementById('grid').classList.add('booster-armed');
    flashMsg(type === 'hammer' ? 'یک بلوک رو لمس کن 🔨' : 'یک بلوک رو لمس کن تا رنگش پاک بشه 🌈');
  }
}

function reshuffleBoard() {
  let a = 0;
  do {
    for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) {
      let t; do { t = rnd(); } while (
        (c >= 2 && grid[r][c - 1]?.type === t && grid[r][c - 2]?.type === t) ||
        (r >= 2 && grid[r - 1][c]?.type === t && grid[r - 2][c]?.type === t)
      );
      const oldLock = grid[r][c]?.locked || 0;
      grid[r][c] = { type: t, sp: null, locked: oldLock };
    } a++;
  } while (!hasMoves() && a < 10);
  render();
  flashMsg('دوباره چیده شد! 🔀');
}

// ── LOCKED BLOCK (ICE) MECHANIC ───────────────────────────
function clearOrCrack(r, c) {
  const b = grid[r][c];
  if (!b) return false;
  if (b.locked && b.locked > 0) {
    b.locked--;
    b.type = rnd();
    crackEffect(r, c);
    if (b.locked <= 0) SFX.iceBreak(); else SFX.iceCrack();
    return false;
  }
  // Track goal progress
  if (goalProgress.hasOwnProperty(b.type)) {
    goalProgress[b.type]++;
    updateGoalHUD();
    checkLevelClear();
  }
  particles(r, c, b.type);
  grid[r][c] = null;
  return true;
}

function crackEffect(r, c) {
  const cell = cellEls[r]?.[c];
  if (!cell) return;
  cell.blk.classList.remove('do-crack'); void cell.blk.offsetWidth; cell.blk.classList.add('do-crack');
  setTimeout(() => cell.blk.classList.remove('do-crack'), 260);
  const rect = cellRects[r]?.[c] || cell.cell.getBoundingClientRect();
  for (let i = 0; i < 5; i++) {
    const p = getParticle();
    const a = Math.PI * 2 * i / 5, d = 12 + Math.random() * 16;
    p.style.cssText = `position:fixed;width:4px;height:4px;background:#bfe8ff;border-radius:1px;left:${rect.left + rect.width / 2}px;top:${rect.top + rect.height / 2}px;pointer-events:none;z-index:999;transition:transform .3s ease-out,opacity .3s;`;
    document.body.appendChild(p);
    requestAnimationFrame(() => { p.style.transform = `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px)`; p.style.opacity = '0'; });
    setTimeout(() => { try { document.body.removeChild(p); } catch (e) {} retParticle(p); }, 320);
  }
}

// ── RENDER ─────────────────────────────────────────────
let cellEls = [], cellRects = [];

function buildGrid() {
  const el = document.getElementById('grid');
  el.innerHTML = '';
  cellEls = []; cellRects = [];
  for (let r = 0; r < G; r++) {
    cellEls[r] = []; cellRects[r] = [];
    for (let c = 0; c < G; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const blk = document.createElement('div');
      blk.className = 'blk';
      const bi = document.createElement('div');
      bi.className = 'bi';
      const img = document.createElement('img');
      img.alt = '';
      const si = document.createElement('span');
      si.className = 'si';
      bi.appendChild(img); bi.appendChild(si);
      blk.appendChild(bi);
      cell.appendChild(blk);
      cell.addEventListener('pointerdown', e => { e.preventDefault(); initSFX(); onDown(e, r, c); });
      cell.addEventListener('pointerup', e => { e.preventDefault(); onUp(e, r, c); });
      el.appendChild(cell);
      cellEls[r][c] = { cell, blk, img, si };
    }
  }
  requestAnimationFrame(() => {
    for (let r = 0; r < G; r++) for (let c = 0; c < G; c++)
      cellRects[r][c] = cellEls[r][c].cell.getBoundingClientRect();
  });
}

function render() {
  for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) renderCell(r, c);
  updateHUD();
}

function renderCell(r, c) {
  const { cell, blk, img, si } = cellEls[r][c];
  const data = grid[r][c];
  const isSel = sel && sel.r === r && sel.c === c;
  cell.className = 'cell' + (isSel ? ' sel' : '');
  if (!data) { blk.style.visibility = 'hidden'; return; }
  blk.style.visibility = 'visible';
  const newSrc = BLOCK_IMG[data.type];
  if (img.src !== newSrc) img.src = newSrc;
  img.alt = data.type;
  const newCls = 'blk' + (data.sp ? ' sp-' + data.sp : '') + (data.locked > 0 ? ' locked lock-' + data.locked : '');
  if (blk.className !== newCls) blk.className = newCls;
  const newSi = data.sp ? SP_SYM[data.sp] : '';
  if (si.textContent !== newSi) si.textContent = newSi;

  let lockEl = blk.querySelector('.lock-overlay');
  if (data.locked > 0) {
    if (!lockEl) {
      lockEl = document.createElement('div');
      lockEl.className = 'lock-overlay';
      const badge = document.createElement('span');
      badge.className = 'lock-badge';
      lockEl.appendChild(badge);
      blk.appendChild(lockEl);
    }
    lockEl.querySelector('.lock-badge').textContent = data.locked;
  } else if (lockEl) {
    lockEl.remove();
  }
}

function animateGridEntrance() {
  for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) {
    const { blk } = cellEls[r][c];
    blk.classList.remove('enter-drop');
    void blk.offsetWidth;
    blk.style.setProperty('--ed', ((r + c) * 0.026) + 's');
    blk.classList.add('enter-drop');
  }
}

function updateHUD() {
  animateScoreTo(score);
  document.getElementById('bsc-val').textContent = bestScore.toLocaleString('en-US');
  document.getElementById('mv-val').textContent = moves;
  document.getElementById('lv-val').textContent = level;
  document.getElementById('lbar-inner').style.width = Math.min(100, lScore / lTarget * 100) + '%';
  const mv = document.getElementById('mv-val');
  mv.style.color = moves <= 5 ? '#ff2222' : moves <= 10 ? '#ff8844' : '#ffd700';
  mv.classList.toggle('low-pulse', moves <= 5 && moves > 0);
}

function animateScoreTo(target) {
  if (scoreAnimTarget === target) return;
  scoreAnimTarget = target;
  const el = document.getElementById('sc-val');
  const start = displayedScore;
  const diff = target - start;
  if (diff <= 0) { displayedScore = target; el.textContent = target.toLocaleString('en-US'); return; }
  const dur = Math.min(700, 150 + diff * 0.12);
  const t0 = performance.now();
  function step(now) {
    if (scoreAnimTarget !== target) return;
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    displayedScore = Math.floor(start + diff * eased);
    el.textContent = displayedScore.toLocaleString('en-US');
    if (p < 1) requestAnimationFrame(step); else displayedScore = target;
  }
  requestAnimationFrame(step);
}

const getCell = (r, c) => cellEls[r]?.[c]?.cell;

// ── INPUT ─────────────────────────────────────────────
function onDown(e, r, c) { if (ended || busy) return; ptrStart = { r, c, x: e.clientX, y: e.clientY }; }

function onUp(e, r, c) {
  if (armedBooster) {
    const type = armedBooster;
    armedBooster = null;
    document.querySelectorAll('.boost-btn').forEach(b => b.classList.remove('armed'));
    document.getElementById('grid').classList.remove('booster-armed');
    ptrStart = null;
    if (busy || ended || !grid[r][c]) return;
    spendBooster(type);
    busy = true; cascade = 0;
    if (type === 'hammer') {
      processMatches([{ r, c }]);
    } else {
      const t = grid[r][c].type;
      const cells = [];
      for (let rr = 0; rr < G; rr++) for (let cc = 0; cc < G; cc++) if (grid[rr][cc]?.type === t) cells.push({ r: rr, c: cc });
      processMatches(cells);
    }
    return;
  }
  if (!ptrStart || busy || ended) { ptrStart = null; return; }
  const dx = e.clientX - ptrStart.x, dy = e.clientY - ptrStart.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 14) {
    if (!sel) { sel = { r, c }; renderCell(r, c); }
    else if (sel.r === r && sel.c === c) { sel = null; renderCell(r, c); }
    else if (Math.abs(sel.r - r) + Math.abs(sel.c - c) === 1) {
      const pr = sel.r, pc = sel.c; sel = null; doSwap(pr, pc, r, c);
    } else {
      const pr = sel.r, pc = sel.c;
      sel = { r, c }; renderCell(pr, pc); renderCell(r, c);
    }
  } else {
    if (sel) { const pr = sel.r, pc = sel.c; sel = null; renderCell(pr, pc); }
    let tr = ptrStart.r, tc = ptrStart.c;
    if (Math.abs(dx) > Math.abs(dy)) tc += dx > 0 ? 1 : -1;
    else tr += dy > 0 ? 1 : -1;
    if (tr >= 0 && tr < G && tc >= 0 && tc < G) doSwap(ptrStart.r, ptrStart.c, tr, tc);
  }
  ptrStart = null;
}

// ── SWAP ──────────────────────────────────────────────
function doSwap(r1, c1, r2, c2) {
  if (busy) return;
  busy = true; cascade = 0;
  const b1 = grid[r1][c1], b2 = grid[r2][c2];
  if (b1?.sp && b2?.sp) { moves--; updateHUD(); specialCombo(r1, c1, r2, c2, b1, b2); return; }

  // Calculate pixel offset between cells
  const cell1 = cellEls[r1]?.[c1], cell2 = cellEls[r2]?.[c2];
  const horiz = (r1 === r2);
  const cellSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell')) || 43;
  const gap = 2;
  const step = cellSize + gap;
  const dx = (c2 - c1) * step;
  const dy = (r2 - r1) * step;

  // Animate blocks moving toward each other
  if (cell1 && cell2) {
    const blk1 = cell1.blk, blk2 = cell2.blk;
    blk1.classList.add('swap-anim');
    blk2.classList.add('swap-anim');
    blk1.style.transform = `translate(${dx}px, ${dy}px) translateZ(0)`;
    blk2.style.transform = `translate(${-dx}px, ${-dy}px) translateZ(0)`;
  }

  setTimeout(() => {
    // Reset visual transform before re-render
    if (cell1 && cell2) {
      cell1.blk.style.transform = '';
      cell2.blk.style.transform = '';
      cell1.blk.classList.remove('swap-anim');
      cell2.blk.classList.remove('swap-anim');
    }

    // Now do the actual data swap
    [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
    const m = findMatches();

    if (!m.length) {
      // No match — animate back
      [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
      SFX.nomatch();
      renderCell(r1, c1); renderCell(r2, c2);

      // Bounce back animation
      const blk1 = cellEls[r1]?.[c1]?.blk, blk2 = cellEls[r2]?.[c2]?.blk;
      if (blk1 && blk2) {
        blk1.classList.add('swap-anim');
        blk2.classList.add('swap-anim');
        blk1.style.transform = `translate(${dx * 0.28}px, ${dy * 0.28}px) translateZ(0)`;
        blk2.style.transform = `translate(${-dx * 0.28}px, ${-dy * 0.28}px) translateZ(0)`;
        setTimeout(() => {
          blk1.style.transform = '';
          blk2.style.transform = '';
          blk1.classList.remove('swap-anim');
          blk2.classList.remove('swap-anim');
          busy = false;
        }, 160);
      } else {
        busy = false;
      }
      return;
    }

    moves--;
    render();
    setTimeout(() => processMatches(m), 60);
  }, 185);
}

// ── SPECIAL COMBO ─────────────────────────────────────
function specialCombo(r1, c1, r2, c2, b1, b2) {
  const sp1 = b1.sp, sp2 = b2.sp;
  const rm = new Set();
  const addRow = r => { for (let c = 0; c < G; c++) rm.add(r + ',' + c); };
  const addCol = c => { for (let r = 0; r < G; r++) rm.add(r + ',' + c); };

  if ((sp1 === SP_ROW && sp2 === SP_COL) || (sp1 === SP_COL && sp2 === SP_ROW)) {
    addRow(sp1 === SP_ROW ? r1 : r2); addCol(sp1 === SP_COL ? c1 : c2); flashMsg('✚ انفجار ضربدری!');
  } else if (sp1 === SP_ROW && sp2 === SP_ROW) {
    for (let d = -1; d <= 1; d++) { const r = r1 + d; if (r >= 0 && r < G) addRow(r); } flashMsg('↔↔ سه‌ردیفی!');
  } else if (sp1 === SP_COL && sp2 === SP_COL) {
    for (let d = -1; d <= 1; d++) { const c = c1 + d; if (c >= 0 && c < G) addCol(c); } flashMsg('↕↕ سه‌ستونی!');
  } else if (sp1 === SP_BOMB && sp2 === SP_BOMB) {
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const nr = r1 + dr, nc = c1 + dc; if (nr >= 0 && nr < G && nc >= 0 && nc < G) rm.add(nr + ',' + nc); }
    flashMsg('✦✦ بمب مگا!');
  } else if (((sp1 === SP_ROW || sp1 === SP_COL) && sp2 === SP_BOMB) || ((sp2 === SP_ROW || sp2 === SP_COL) && sp1 === SP_BOMB)) {
    const ls = sp1 === SP_BOMB ? sp2 : sp1;
    if (ls === SP_ROW) { for (let d = -1; d <= 1; d++) { const r = r1 + d; if (r >= 0 && r < G) addRow(r); } }
    else { for (let d = -1; d <= 1; d++) { const c = c1 + d; if (c >= 0 && c < G) addCol(c); } }
    flashMsg('✦↔ انفجار قدرتمند!');
  } else if (sp1 === SP_RAIN || sp2 === SP_RAIN) {
    const t = sp1 === SP_RAIN ? b2.type : b1.type;
    for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) if (grid[r][c]?.type === t) rm.add(r + ',' + c);
    flashMsg('✸ پاکسازی رنگین‌کمان!');
  } else {
    [{ b: b1, r: r1, c: c1 }, { b: b2, r: r2, c: c2 }].forEach(({ b, r, c }) => {
      if (b.sp === SP_ROW) addRow(r);
      else if (b.sp === SP_COL) addCol(c);
      else if (b.sp === SP_BOMB) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < G && nc >= 0 && nc < G) rm.add(nr + ',' + nc); }
    });
  }
  rm.add(r1 + ',' + c1); rm.add(r2 + ',' + c2);
  const list = [...rm].map(s => { const [r, c] = s.split(','); return { r: +r, c: +c }; });
  const bonus = list.length * 80 + 500;
  score += bonus; lScore += bonus;
  if (score > bestScore) { bestScore = score; localStorage.setItem('mc_best', bestScore); }
  checkLevel(); updateHUD();

  SFX.special(); setTimeout(() => SFX.special(), 180);
  screenShake(2.2); screenFlash();
  render();
  requestAnimationFrame(() => {
    list.forEach(({ r, c }) => { if (cellEls[r]?.[c]) { cellEls[r][c].blk.style.willChange='transform,opacity'; cellEls[r][c].blk.classList.add('do-pop'); } });
  });
  if (list[0]) showPts(bonus, list[0]);

  setTimeout(() => {
    list.forEach(({ r, c }) => { clearOrCrack(r, c); });
    applyGravity(); refill(); cascade = 2; render();
    setTimeout(() => processMatches(findMatches()), 180);
  }, 220);
}

// ── MATCH DETECTION ────────────────────────────────────
function findMatches() {
  const ms = new Set();
  for (let r = 0; r < G; r++) {
    let s = 0;
    for (let c = 1; c <= G; c++) {
      const ok = c < G && grid[r][c]?.type && grid[r][c]?.type === grid[r][c - 1]?.type;
      if (!ok) { if (c - s >= 3) for (let k = s; k < c; k++) ms.add(r + ',' + k); s = c; }
    }
  }
  for (let c = 0; c < G; c++) {
    let s = 0;
    for (let r = 1; r <= G; r++) {
      const ok = r < G && grid[r][c]?.type && grid[r][c]?.type === grid[r - 1][c]?.type;
      if (!ok) { if (r - s >= 3) for (let k = s; k < r; k++) ms.add(k + ',' + c); s = r; }
    }
  }
  return [...ms].map(s => { const [r, c] = s.split(','); return { r: +r, c: +c }; });
}

// ── SPECIAL DETECTION ──────────────────────────────────
function detectSpecials(matches) {
  const ms = new Set(matches.map(({ r, c }) => r + ',' + c));
  const used = new Set(), out = [];
  const hR = [], vR = [];
  for (let r = 0; r < G; r++) { let run = []; for (let c = 0; c <= G; c++) { if (c < G && ms.has(r + ',' + c)) run.push(c); else { if (run.length >= 3) hR.push({ r, cols: [...run] }); run = []; } } }
  for (let c = 0; c < G; c++) { let run = []; for (let r = 0; r <= G; r++) { if (r < G && ms.has(r + ',' + c)) run.push(r); else { if (run.length >= 3) vR.push({ c, rows: [...run] }); run = []; } } }
  const pl = (r, c, sp, type) => { const k = r + ',' + c; if (!used.has(k)) { used.add(k); out.push({ r, c, sp, type }); } };
  for (const { r, cols } of hR.filter(h => h.cols.length >= 5)) { const mc = cols[cols.length >> 1]; pl(r, mc, SP_RAIN, grid[r][cols[0]]?.type || rnd()); }
  for (const { c, rows } of vR.filter(v => v.rows.length >= 5)) { const mr = rows[rows.length >> 1]; pl(mr, c, SP_RAIN, grid[rows[0]][c]?.type || rnd()); }
  for (const { r, cols } of hR) for (const { c, rows } of vR) if (cols.includes(c) && rows.includes(r)) pl(r, c, SP_BOMB, grid[r][c]?.type || rnd());
  for (const { r, cols } of hR.filter(h => h.cols.length === 4)) pl(r, cols[1], SP_ROW, grid[r][cols[0]]?.type || rnd());
  for (const { c, rows } of vR.filter(v => v.rows.length === 4)) pl(rows[1], c, SP_COL, grid[rows[0]][c]?.type || rnd());
  return out;
}

// ── EXPAND SPECIALS ─────────────────────────────────────
function expandSpecials(initial) {
  const all = new Set(initial.map(({ r, c }) => r + ',' + c));
  const queue = [...initial];
  let bonus = 0;
  while (queue.length) {
    const { r, c } = queue.shift();
    const blk = grid[r][c];
    if (!blk?.sp) continue;
    SFX.special();
    let ex = [];
    if (blk.sp === SP_ROW) { ex = Array.from({ length: G }, (_, cc) => ({ r, c: cc })); bonus += 200; }
    else if (blk.sp === SP_COL) { ex = Array.from({ length: G }, (_, rr) => ({ r: rr, c })); bonus += 200; }
    else if (blk.sp === SP_BOMB) { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < G && nc >= 0 && nc < G) ex.push({ r: nr, c: nc }); } bonus += 300; }
    else if (blk.sp === SP_RAIN) { const t = TYPES[Math.random() * 4 | 0]; for (let rr = 0; rr < G; rr++) for (let cc = 0; cc < G; cc++) if (grid[rr][cc]?.type === t) ex.push({ r: rr, c: cc }); bonus += 500; }
    for (const p of ex) { const k = p.r + ',' + p.c; if (!all.has(k)) { all.add(k); queue.push(p); } }
  }
  return { list: [...all].map(s => { const [r, c] = s.split(','); return { r: +r, c: +c }; }), bonus };
}

// ── PROCESS MATCHES ────────────────────────────────────
function processMatches(matches) {
  if (ended) { busy = false; return; }
  if (!matches.length) {
    cascade = 0; busy = false;
    if (moves <= 0) { setTimeout(gameOver, 200); return; }
    if (!hasMoves()) setTimeout(reshuffleBoard, 500);
    return;
  }
  const newSp = detectSpecials(matches);
  const { list: toRemove, bonus } = expandSpecials(matches);
  const base = toRemove.length * 50;
  const total = Math.floor(base + base * (cascade > 0 ? cascade * 0.6 : 0) + bonus);
  score += total; lScore += total;
  if (score > bestScore) { bestScore = score; localStorage.setItem('mc_best', bestScore); }

  SFX.match(cascade);
  const ms = Math.min(3, matches.length);
  for (let i = 0; i < ms; i++) setTimeout(() => { if (matches[i] && grid[matches[i].r]?.[matches[i].c]) SFX[grid[matches[i].r][matches[i].c].type]?.(); }, i * 70);

  if (cascade > 0) showCombo(cascade + 1);
  if (cascade >= 2) screenShake(1.2);
  if (toRemove[0]) showPts(total, toRemove[0]);
  // Pop animation — GPU only, no layout thrash
  requestAnimationFrame(() => {
    toRemove.forEach(({ r, c }) => {
      const el = cellEls[r]?.[c];
      if (el) { el.blk.style.willChange = 'transform,opacity'; el.blk.classList.add('do-pop'); }
    });
  });

  checkLevel(); updateHUD();

  setTimeout(() => {
    // Clear matched cells
    toRemove.forEach(({ r, c }) => { clearOrCrack(r, c); });
    for (const { r, c, sp, type } of newSp) if (!grid[r][c]) grid[r][c] = { type, sp, locked: 0 };
    applyGravity(); refill(); cascade++;

    // Only re-render cells that actually changed — avoid full DOM rebuild
    const changed = new Set();
    toRemove.forEach(({ r, c }) => { for (let rr = 0; rr <= r; rr++) changed.add(rr + ',' + c); });
    if (newSp.length) newSp.forEach(({ r, c }) => changed.add(r + ',' + c));

    // Batch DOM writes in one rAF
    requestAnimationFrame(() => {
      changed.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        if (cellEls[r]?.[c]) {
          // Reset will-change before updating
          cellEls[r][c].blk.style.willChange = '';
          renderCell(r, c);
          // Drop-in animation for newly filled cells
          if (grid[r][c] && !toRemove.find(p => p.r === r && p.c === c)) {
            cellEls[r][c].blk.style.setProperty('--ed', (r * 0.018) + 's');
            cellEls[r][c].blk.classList.remove('enter-drop');
            void cellEls[r][c].blk.offsetWidth;
            cellEls[r][c].blk.classList.add('enter-drop');
          }
        }
      });
      updateHUD(); updateGoalHUD();
    });

    setTimeout(() => processMatches(findMatches()), 200);
  }, 230);
}

// ── VISUAL EFFECTS ──────────────────────────────────────
function showPts(n, { r, c }) {
  const rect = cellRects[r]?.[c] || cellEls[r]?.[c]?.cell.getBoundingClientRect();
  if (!rect) return;
  const p = document.createElement('div');
  p.className = 'ptspop'; p.textContent = '+' + n.toLocaleString('en-US');
  p.style.left = (rect.left + rect.width / 2) + 'px'; p.style.top = rect.top + 'px';
  document.body.appendChild(p); setTimeout(() => p.remove(), 900);
}

function showCombo(n) {
  const el = document.getElementById('combo');
  el.textContent = 'کمبو ×' + n + '! 🔥';
  el.classList.remove('show-combo'); void el.offsetWidth; el.classList.add('show-combo');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show-combo'), 1100);
}

function flashMsg(msg) {
  const el = document.getElementById('flash');
  el.textContent = msg;
  el.classList.remove('show-flash'); void el.offsetWidth; el.classList.add('show-flash');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show-flash'), 1500);
}

function screenShake(intensity) {
  intensity = intensity || 1;
  const g = document.getElementById('gbox');
  if (!g) return;
  g.style.setProperty('--shx', (intensity * 5) + 'px');
  g.classList.remove('shake-anim'); void g.offsetWidth; g.classList.add('shake-anim');
  setTimeout(() => g.classList.remove('shake-anim'), 400);
}

function screenFlash() {
  const f = document.getElementById('flash-overlay');
  f.classList.remove('flash-on'); void f.offsetWidth; f.classList.add('flash-on');
}

const PPOOL = [];
function getParticle() { return PPOOL.pop() || document.createElement('div'); }
function retParticle(p) { p.style.cssText = ''; PPOOL.push(p); }

function particles(r, c, type) {
  const rect = cellRects[r]?.[c] || cellEls[r]?.[c]?.cell.getBoundingClientRect();
  if (!rect) return;
  const color = CLR[type] || '#fff';
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  for (let i = 0; i < 5; i++) {
    const p = getParticle();
    const a = Math.PI * 2 * i / 5, d = 14 + Math.random() * 18;
    p.style.cssText = `position:fixed;width:4px;height:4px;background:${color};border-radius:1px;left:${cx}px;top:${cy}px;pointer-events:none;z-index:999;transition:transform .32s ease-out,opacity .32s;`;
    document.body.appendChild(p);
    requestAnimationFrame(() => { p.style.transform = `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px)`; p.style.opacity = '0'; });
    setTimeout(() => { try { document.body.removeChild(p); } catch (e) {} retParticle(p); }, 350);
  }
}

function confettiBurst() {
  const colors = ['#5dd5f5', '#cc2200', '#17c442', '#f0a000', '#fff', '#ffd700'];
  const cx = window.innerWidth / 2, cy = 150;
  for (let i = 0; i < 26; i++) {
    const p = document.createElement('div');
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 130, size = 4 + Math.random() * 4;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:${color};z-index:1600;pointer-events:none;border-radius:${Math.random() > .5 ? '50%' : '1px'};transition:transform .9s cubic-bezier(.15,.8,.3,1),opacity .9s;`;
    document.body.appendChild(p);
    requestAnimationFrame(() => { p.style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + 90}px) rotate(${Math.random() * 720}deg)`; p.style.opacity = '0'; });
    setTimeout(() => p.remove(), 950);
  }
}

// ── LEVEL ────────────────────────────────────────────────
function checkLevelClear() {
  if (levelCleared) return;
  const done = Object.keys(levelGoal).every(t => (goalProgress[t] || 0) >= levelGoal[t]);
  if (!done) return;
  levelCleared = true;
  ended = true; busy = true;

  // Unlock next level
  if (level + 1 > maxLevel) { maxLevel = level + 1; localStorage.setItem('mc_maxLevel', maxLevel); }
  if (score > bestScore) { bestScore = score; localStorage.setItem('mc_best', bestScore); }

  SFX.levelup();
  confettiBurst();
  setTimeout(confettiBurst, 300);
  setTimeout(confettiBurst, 600);

  setTimeout(() => {
    document.getElementById('win-lv').textContent  = 'مرحله ' + level + ' تمام شد!';
    document.getElementById('win-sc').textContent  = 'امتیاز: ' + score.toLocaleString('en-US');
    document.getElementById('win-mv').textContent  = 'حرکت باقی‌مانده: ' + moves;
    const wp = document.getElementById('win-panel');
    wp.style.display = 'flex';
    wp.style.transform = 'translateY(100%)';
    wp.style.transition = 'transform .45s cubic-bezier(.2,.8,.3,1)';
    requestAnimationFrame(() => requestAnimationFrame(() => { wp.style.transform = 'translateY(0)'; }));
  }, 700);
}

function updateGoalHUD() {
  const wrap = document.getElementById('goal-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  Object.keys(levelGoal).forEach(type => {
    const got  = Math.min(goalProgress[type] || 0, levelGoal[type]);
    const need = levelGoal[type];
    const done = got >= need;
    const item = document.createElement('div');
    item.className = 'goal-item' + (done ? ' goal-done' : '');
    const img = document.createElement('img');
    img.src = BLOCK_IMG[type]; img.className = 'goal-img'; img.alt = type;
    const bar = document.createElement('div');
    bar.className = 'goal-bar';
    const fill = document.createElement('div');
    fill.className = 'goal-fill';
    fill.style.width = Math.min(100, got / need * 100) + '%';
    bar.appendChild(fill);
    const txt = document.createElement('div');
    txt.className = 'goal-txt';
    txt.textContent = done ? '✓' : got + '/' + need;
    item.appendChild(img); item.appendChild(bar); item.appendChild(txt);
    wrap.appendChild(item);
  });
}

function closeWin() {
  const wp = document.getElementById('win-panel');
  wp.style.transition = 'transform .3s ease-in';
  wp.style.transform = 'translateY(100%)';
  setTimeout(() => { wp.style.display = 'none'; }, 310);
}

function winNextLevel() {
  closeWin();
  setTimeout(() => startLevel(level + 1), 340);
}
function winRetry() {
  closeWin();
  setTimeout(() => startLevel(level), 340);
}
function winLobby() {
  closeWin();
  setTimeout(() => { clearInterval(musicTimer); showScreen('levels'); }, 340);
}

function checkLevel() {
  // Score-based bonus moves (keep for in-level bonuses every 500pts)
  if (lScore >= lTarget) {
    lScore -= lTarget;
    lTarget = Math.floor(lTarget * 1.3);
    const bonus = Math.min(5, Math.floor(2 + level * 0.3));
    moves += bonus;
    flashMsg('+' + bonus + ' حرکت هدیه! ⚡');
  }
}

// ── GAME FLOW ─────────────────────────────────────────────
function startLevel(lv) {
  if (lv > maxLevel) return;
  SFX.click();
  level = lv;
  const diff = getDifficulty(lv);
  moves = diff.startMoves;
  score = 0; lScore = 0; lTarget = diff.lTargetBase;
  cascade = 0; sel = null; busy = false; ended = false; levelCleared = false;
  displayedScore = 0; scoreAnimTarget = null;
  levelGoal = getLevelGoal(lv);
  goalProgress = {};
  Object.keys(levelGoal).forEach(t => goalProgress[t] = 0);
  const ov = document.getElementById('over'); ov.style.display = 'none'; ov.style.transform = 'translateY(100%)'; ov.style.transition = '';
  showScreen('game');
  makeGrid(diff);
  buildGrid();
  render();
  setTimeout(animateGridEntrance, 30);
  updateGoalHUD();
  clearInterval(musicTimer);
  beatIdx = 0;
  if (AC && soundOn) startMusic();
}

function voluntaryLose() {
  ended = true; busy = true;
  SFX.gameover();
  document.getElementById('over-sc').textContent = 'امتیاز: ' + score.toLocaleString('en-US');
  document.getElementById('over-lv').textContent = 'مرحله: ' + level;
  document.getElementById('over-best').textContent = 'بهترین: ' + bestScore.toLocaleString('en-US');
  const ov = document.getElementById('over');
  ov.style.display = 'flex';
  ov.style.transform = 'translateY(100%)';
  ov.style.transition = 'transform .45s cubic-bezier(.2,.8,.3,1)';
  requestAnimationFrame(() => requestAnimationFrame(() => { ov.style.transform = 'translateY(0)'; }));
}

function confirmRestart() {
  document.getElementById('confirm-overlay').style.display = 'flex';
}
function closeConfirm() {
  document.getElementById('confirm-overlay').style.display = 'none';
}
function doRestart() {
  document.getElementById('confirm-overlay').style.display = 'none';
  startLevel(level);
}

function gameOver() {
  ended = true; busy = true;
  SFX.gameover();
  document.getElementById('over-sc').textContent = 'امتیاز: ' + score.toLocaleString('en-US');
  document.getElementById('over-lv').textContent = 'مرحله: ' + level;
  document.getElementById('over-best').textContent = 'بهترین: ' + bestScore.toLocaleString('en-US');
  const ov = document.getElementById('over');
  ov.style.display = 'flex';
  ov.style.transform = 'translateY(100%)';
  ov.style.transition = 'transform .45s cubic-bezier(.2,.8,.3,1)';
  requestAnimationFrame(() => requestAnimationFrame(() => { ov.style.transform = 'translateY(0)'; }));
}

// ── RIPPLE EFFECT (buttons) ───────────────────────────────
function addRipple(el) {
  el.addEventListener('pointerdown', e => {
    const rect = el.getBoundingClientRect();
    const r = document.createElement('span');
    const size = Math.max(rect.width, rect.height) * 1.3;
    r.className = 'ripple';
    r.style.width = r.style.height = size + 'px';
    r.style.left = (e.clientX - rect.left - size / 2) + 'px';
    r.style.top = (e.clientY - rect.top - size / 2) + 'px';
    el.appendChild(r);
    setTimeout(() => r.remove(), 500);
  });
}

function setupRipples() {
  document.querySelectorAll('.big-btn,#play-btn,#snd-btn,#rst-btn,#lose-btn,.cbtn,.lvl-circle,#back-btn,#store-back-btn,.store-tab,.tier-jump-pill').forEach(addRipple);
}

// ── FLOATING BLOCKS (start screen bg) ─────────────────────
function spawnFloatingBlocks() {
  const wrap = document.getElementById('float-blocks');
  wrap.innerHTML = '';
  const imgs = ['images/gem-diamond.png', 'images/gem-redstone.png', 'images/gem-emerald.png', 'images/gem-gold.png'];
  for (let i = 0; i < 9; i++) {
    const img = document.createElement('img');
    img.src = imgs[i % 4];
    img.className = 'float-block';
    const left = Math.random() * 92;
    const dur = 14 + Math.random() * 12;
    const delay = -Math.random() * dur;
    const size = 24 + Math.random() * 22;
    img.style.left = left + '%';
    img.style.width = size + 'px';
    img.style.height = size + 'px';
    img.style.animationDuration = dur + 's';
    img.style.animationDelay = delay + 's';
    wrap.appendChild(img);
  }
}

// ── INIT ───────────────────────────────────────────────────
function initApp() {
  document.getElementById('best-display').textContent = bestScore.toLocaleString('en-US');
  renderCustomBlockPacks();
  applyBlockTheme(localStorage.getItem('mc_theme') || 'classic');
  applyBgTheme(localStorage.getItem('mc_bg') || 'night');
  renderBoosterCounts();
  spawnFloatingBlocks();
  setupRipples();
  showScreen('start');
}
initApp();
