const STORAGE_SCHEME = 'okhst-playground-scheme';
const STORAGE_CONTRAST = 'okhst-playground-contrast';

const VALID_SCHEME = new Set(['system', 'light', 'dark']);
const VALID_CONTRAST = new Set(['system', 'normal', 'high']);

export function loadSchemePref() {
  const stored = localStorage.getItem(STORAGE_SCHEME);
  return VALID_SCHEME.has(stored) ? stored : 'system';
}

export function loadContrastPref() {
  const stored = localStorage.getItem(STORAGE_CONTRAST);
  return VALID_CONTRAST.has(stored) ? stored : 'system';
}

export function saveSchemePref(value) {
  localStorage.setItem(STORAGE_SCHEME, value);
}

export function saveContrastPref(value) {
  localStorage.setItem(STORAGE_CONTRAST, value);
}

export function getSystemScheme() {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getSystemContrast() {
  return matchMedia('(prefers-contrast: more)').matches ||
    matchMedia('(prefers-contrast: high)').matches
    ? 'high'
    : 'normal';
}

export function resolveScheme(pref) {
  return pref === 'system' ? getSystemScheme() : pref;
}

export function resolveContrast(pref) {
  return pref === 'system' ? getSystemContrast() : pref;
}

export function watchSystemPrefs(onChange) {
  const schemeMq = matchMedia('(prefers-color-scheme: dark)');
  const contrastMoreMq = matchMedia('(prefers-contrast: more)');
  const contrastHighMq = matchMedia('(prefers-contrast: high)');

  const handler = () => onChange();
  schemeMq.addEventListener('change', handler);
  contrastMoreMq.addEventListener('change', handler);
  contrastHighMq.addEventListener('change', handler);

  return () => {
    schemeMq.removeEventListener('change', handler);
    contrastMoreMq.removeEventListener('change', handler);
    contrastHighMq.removeEventListener('change', handler);
  };
}
