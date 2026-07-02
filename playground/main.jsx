/* ============================================================================
   OKHST Playground — wiring.

   No color math happens here. The ramp is a fixed pool of 32 swatches built
   once; every control just updates CSS custom properties and the --ghst /
   --okhst @functions re-resolve in CSS. Copy reads the browser's computed
   background-color verbatim (with a ".0" pad on bare integers) — we never
   compute the color ourselves.
   ============================================================================ */

import { createRoot } from 'react-dom/client';
import {
  loadContrastPref,
  loadSchemePref,
  resolveContrast,
  resolveScheme,
  saveContrastPref,
  saveSchemePref,
  watchSystemPrefs,
} from './preferences.js';
import { Toggles } from './toggles.jsx';

const MAX_SWATCHES = 32;
const MIN_WINDOW_GAP = 50;
const HC_WINDOW = { lo: 0, hi: 100 };

const state = {
  hue: 250,
  sat: 70,
  steps: 11,
  schemePref: loadSchemePref(),
  contrastPref: loadContrastPref(),
  scheme: 'light',
  contrast: 'normal',
  space: 'okhst', // 'okhst' | 'okhsl'
  win: {
    light: { lo: 10, hi: 100 },
    dark: { lo: 15, hi: 95 },
  },
};

const root = document.documentElement;
const $ = (id) => document.getElementById(id);

const ramp = $('ramp');
const chip = $('chip');
const toast = $('toast');
const winEl = $('win');
const winLo = $('win-lo');
const winHi = $('win-hi');
const hueEl = $('hue');
const satEl = $('sat');
const stepsEl = $('steps');
const hueVal = $('hue-val');
const satVal = $('sat-val');
const stepsVal = $('steps-val');
const winVal = $('win-val');
const inspTone = $('insp-tone');
const inspSpace = $('insp-space');
const inspValue = $('insp-value');
const segSpace = Array.from(document.querySelectorAll('#seg-space button'));

let renderToggles = () => {};

const setVar = (name, value) => root.style.setProperty(name, value);

/* ---- tone label: matches the CSS counter (rounded integer tone) ----------- */
const toneFor = (i, steps) => Math.round((i / (steps - 1)) * 100);

/* ---- copy helpers: read computed value, pad bare integers, never round ---- */
const ensureDecimals = (s) =>
  s.replace(/[-+]?\d*\.?\d+/g, (m) => (m.includes('.') ? m : m + '.0'));

let toastTimer = 0;
function showToast(msg) {
  toast.textContent = `Copied  ${msg}`;
  toast.classList.add('toast--show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('toast--show'), 1800);
}

/* ---- build the 32-swatch pool once; everything else is CSS-var updates ----- */
function buildPool() {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < MAX_SWATCHES; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.dataset.i = String(i);
    btn.style.setProperty('--i', String(i));
    frag.appendChild(btn);
  }
  ramp.replaceChildren(frag);
  ramp.addEventListener('click', onRampClick);
}

function onRampClick(event) {
  const sw = event.target.closest('.swatch');
  if (!sw || !ramp.contains(sw)) return;
  const i = Number(sw.dataset.i);
  if (i >= state.steps) return; // hidden swatch (0-width, but guard anyway)

  const raw = getComputedStyle(sw).backgroundColor;
  const value = ensureDecimals(raw);

  selectSwatch(sw, i, value);

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).then(
      () => showToast(value),
      () => showToast(value),
    );
  } else {
    showToast(value);
  }
}

function clearSelection() {
  for (const b of ramp.querySelectorAll('.swatch[aria-pressed="true"]')) {
    b.setAttribute('aria-pressed', 'false');
  }
  chip.style.backgroundColor = '';
  inspTone.textContent = '—';
  inspValue.textContent = 'Click a swatch to copy its computed color.';
}

function selectSwatch(sw, i, value) {
  clearSelection();
  sw.setAttribute('aria-pressed', 'true');
  chip.style.backgroundColor = value;
  inspTone.textContent = String(toneFor(i, state.steps));
  inspSpace.textContent = state.space.toUpperCase();
  inspValue.textContent = value;
}

/* ---- controls -> CSS vars ------------------------------------------------- */
function applyHue() {
  state.hue = Number(hueEl.value);
  setVar('--seed-h', String(state.hue));
  hueVal.textContent = `${state.hue}°`;
  clearSelection();
}

function applySat() {
  state.sat = Number(satEl.value);
  setVar('--seed-s', String(state.sat));
  satVal.textContent = `${state.sat}%`;
  clearSelection();
}

function applySteps() {
  state.steps = Number(stepsEl.value);
  setVar('--count', String(state.steps));
  stepsVal.textContent = String(state.steps);
  clearSelection();
}

function clampWindow(win) {
  let { lo, hi } = win;
  if (hi - lo < MIN_WINDOW_GAP) {
    hi = Math.min(100, lo + MIN_WINDOW_GAP);
    if (hi - lo < MIN_WINDOW_GAP) {
      lo = Math.max(0, hi - MIN_WINDOW_GAP);
    }
  }
  return { lo, hi };
}

function activeWindow() {
  const raw =
    state.contrast === 'high' ? HC_WINDOW : state.win[state.scheme];
  return state.contrast === 'high' ? raw : clampWindow(raw);
}

function syncWindowControls() {
  const highContrast = state.contrast === 'high';
  const w = activeWindow();

  setVar('--tone-lo', String(w.lo));
  setVar('--tone-hi', String(w.hi));
  winEl.style.setProperty('--lo', String(w.lo));
  winEl.style.setProperty('--hi', String(w.hi));
  winLo.value = String(w.lo);
  winHi.value = String(w.hi);
  winVal.textContent = `${w.lo} – ${w.hi}`;
  winLo.disabled = highContrast;
  winHi.disabled = highContrast;
  winEl.classList.toggle('range-dual--locked', highContrast);
}

function applyWindow() {
  syncWindowControls();
  clearSelection();
}

/* ---- scheme + contrast + space toggles ------------------------------------ */
function applyResolvedPrefs() {
  state.scheme = resolveScheme(state.schemePref);
  state.contrast = resolveContrast(state.contrastPref);
}

function setSchemePref(pref) {
  state.schemePref = pref;
  saveSchemePref(pref);
  applyResolvedPrefs();
  root.classList.toggle('dark', state.scheme === 'dark');
  applyWindow();
  renderToggles();
}

function setContrastPref(pref) {
  state.contrastPref = pref;
  saveContrastPref(pref);
  applyResolvedPrefs();
  applyWindow();
  renderToggles();
}

function setSpace(space) {
  state.space = space;
  setVar('--okhst-space', space === 'okhsl' ? '1' : '0');
  for (const b of segSpace) {
    b.setAttribute('aria-pressed', b.dataset.space === space ? 'true' : 'false');
  }
  inspSpace.textContent = space.toUpperCase();
  clearSelection();
}

/* ---- dual-thumb lo/hi (single track, per-scheme values) ------------------- */
function onWinLo() {
  if (state.contrast === 'high') return;
  let lo = Number(winLo.value);
  const hi = Number(winHi.value);
  if (hi - lo < MIN_WINDOW_GAP) {
    lo = hi - MIN_WINDOW_GAP;
    if (lo < 0) lo = 0;
    winLo.value = String(lo);
  }
  state.win[state.scheme].lo = lo;
  state.win[state.scheme] = clampWindow(state.win[state.scheme]);
  applyWindow();
}

function onWinHi() {
  if (state.contrast === 'high') return;
  const lo = Number(winLo.value);
  let hi = Number(winHi.value);
  if (hi - lo < MIN_WINDOW_GAP) {
    hi = lo + MIN_WINDOW_GAP;
    if (hi > 100) hi = 100;
    winHi.value = String(hi);
  }
  state.win[state.scheme].hi = hi;
  state.win[state.scheme] = clampWindow(state.win[state.scheme]);
  applyWindow();
}

function mountToggles() {
  const togglesRoot = $('toggles-root');
  const reactRoot = createRoot(togglesRoot);
  renderToggles = () => {
    reactRoot.render(
      <Toggles
        scheme={state.schemePref}
        contrast={state.contrastPref}
        onSchemeChange={setSchemePref}
        onContrastChange={setContrastPref}
      />,
    );
  };
  renderToggles();
}

/* ---- init ----------------------------------------------------------------- */
function init() {
  buildPool();
  mountToggles();

  hueEl.addEventListener('input', applyHue);
  satEl.addEventListener('input', applySat);
  stepsEl.addEventListener('input', applySteps);
  winLo.addEventListener('input', onWinLo);
  winHi.addEventListener('input', onWinHi);

  for (const b of segSpace) {
    b.addEventListener('click', () => setSpace(b.dataset.space));
  }

  watchSystemPrefs(() => {
    const prevScheme = state.scheme;
    const prevContrast = state.contrast;
    applyResolvedPrefs();
    if (state.scheme !== prevScheme) {
      root.classList.toggle('dark', state.scheme === 'dark');
    }
    if (state.scheme !== prevScheme || state.contrast !== prevContrast) {
      applyWindow();
      renderToggles();
    }
  });

  // seed initial CSS state
  applyHue();
  applySat();
  applySteps();
  applyResolvedPrefs();
  root.classList.toggle('dark', state.scheme === 'dark');
  applyWindow();
  setSpace(state.space);
}

init();
