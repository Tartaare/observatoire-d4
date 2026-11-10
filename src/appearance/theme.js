/** @typedef {'light' | 'dark' | 'system'} ThemeMode */
/** @typedef {{dark: string, light: string, accent: string}} Palette */
/** @typedef {{theme: ThemeMode, palette: Palette}} Appearance */

export const STORAGE_KEY = 'observatoire-d4:appearance:v1';
/** @type {Appearance} */
export const DEFAULT_APPEARANCE = {theme: 'system', palette: {
  dark: '#18181B', light: '#FAFAFA', accent: '#F97316',
}};

/** @param {string} value */
export function normalizeHex(value) {
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  return match ? `#${match[1].toUpperCase()}` : null;
}

/** @param {string} color */
function channels(color) {
  return [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16));
}

/** @param {string} color */
function luminance(color) {
  const [r, g, b] = channels(color).map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** @param {string} first @param {string} second */
export function contrast(first, second) {
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** @param {string} from @param {string} to @param {number} amount */
export function mix(from, to, amount) {
  const target = channels(to);
  return '#' + channels(from).map((value, index) =>
    Math.round(value + (target[index] - value) * amount).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** @param {Palette} palette */
export function paletteError(palette) {
  const dark = normalizeHex(palette.dark), light = normalizeHex(palette.light);
  if (!dark || !light || !normalizeHex(palette.accent)) return 'Saisissez six chiffres hexadécimaux, par exemple #F97316.';
  if (luminance(dark) >= luminance(light)) return 'La couleur sombre doit être plus foncée que la couleur claire.';
  if (contrast(dark, light) < 7) return 'Éloignez les couleurs sombre et claire : un contraste de 7:1 est nécessaire pour dériver des surfaces lisibles.';
  return '';
}

/** @param {string[]} backgrounds @param {string} preferred @param {number} [minimum] */
function readable(backgrounds, preferred, minimum = 4.5) {
  const score = (/** @type {string} */ color) => Math.min(...backgrounds.map(bg => contrast(bg, color)));
  const target = score('#000000') > score('#FFFFFF') ? '#000000' : '#FFFFFF';
  // 26 échantillons au maximum par couleur ; une recherche binaire suffit si la palette s'élargit.
  for (let step = 0; step <= 25; step++) {
    const color = mix(preferred, target, step / 25);
    if (score(color) >= minimum) return color;
  }
  return target;
}

/** @param {ThemeMode} theme @param {boolean} systemDark @returns {'light' | 'dark'} */
export function resolveTheme(theme, systemDark) {
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
}

/** @param {Palette} palette @param {'light' | 'dark'} theme @returns {Record<string, string>} */
export function buildTokens(palette, theme) {
  const surface = theme === 'dark' ? palette.dark : palette.light;
  const foreground = theme === 'dark' ? palette.light : palette.dark;
  const paper = mix(surface, foreground, 0.025);
  const quiet = mix(surface, foreground, 0.065);
  const selected = mix(surface, palette.accent, 0.12);
  const backgrounds = [surface, paper, quiet, selected];
  const tokens = {
    '--surface': surface, '--paper': paper, '--quiet': quiet, '--selected': selected,
    '--ink': readable(backgrounds, foreground),
    '--sub': readable(backgrounds, mix(surface, foreground, 0.72)),
    '--line': mix(surface, foreground, 0.19),
    '--control-line': readable(backgrounds, mix(surface, foreground, 0.4), 3),
    '--accent': palette.accent,
    '--accent-ink': readable(backgrounds, palette.accent),
    '--on-accent': readable([palette.accent], foreground),
    '--focus': readable(backgrounds, palette.accent, 3),
    '--track': mix(surface, foreground, 0.3),
  };
  /** @type {Record<string, string>} */
  const tones = {};
  [0, 0.12, 0.26, 0.44, 0.7, 1].forEach((amount, index) => {
    const background = index === 0 ? quiet : mix(surface, palette.accent, amount);
    tones[`--tone${index}`] = background;
    tones[`--tone${index}-ink`] = readable([background], foreground);
  });
  return {...tokens, ...tones};
}

/** @param {Pick<Storage, 'getItem'>} [storage] @returns {Appearance} */
export function readAppearance(storage) {
  try {
    const value = JSON.parse((storage ?? localStorage).getItem(STORAGE_KEY) ?? 'null');
    if (!value || !['system', 'dark', 'light'].includes(value.theme)) throw new TypeError('Thème invalide');
    const palette = value.palette;
    if (!palette || !['dark', 'light', 'accent'].every(key => typeof palette[key] === 'string')) throw new TypeError('Palette invalide');
    const normalized = {dark: normalizeHex(palette.dark), light: normalizeHex(palette.light), accent: normalizeHex(palette.accent)};
    if (!normalized.dark || !normalized.light || !normalized.accent) throw new TypeError('Couleur invalide');
    const valid = {dark: normalized.dark, light: normalized.light, accent: normalized.accent};
    if (paletteError(valid)) throw new TypeError('Contraste insuffisant');
    return {theme: value.theme, palette: valid};
  } catch {
    return structuredClone(DEFAULT_APPEARANCE);
  }
}

/** @param {Appearance} appearance @param {Pick<Storage, 'setItem'>} [storage] */
export function saveAppearance(appearance, storage) {
  try {
    (storage ?? localStorage).setItem(STORAGE_KEY, JSON.stringify(appearance));
    return true;
  } catch {
    return false;
  }
}

/** @param {Appearance} appearance */
export function applyAppearance(appearance) {
  const root = document.documentElement;
  root.classList.add('od-theme-changing');
  const theme = resolveTheme(appearance.theme, matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  for (const [key, value] of Object.entries(buildTokens(appearance.palette, theme))) root.style.setProperty(key, value);
  // Laisser le navigateur peindre le thème avant de réactiver les transitions interactives.
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('od-theme-changing')));
}
