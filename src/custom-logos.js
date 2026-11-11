export const LOGOS_KEY = 'observatoire-d4:club-logos:v1';
export const LOGOS_EVENT = 'od:club-logos';
const MAX_LOGO_LENGTH = 400_000;

/** @param {unknown} value @returns {value is string} */
function validLogo(value) {
  return typeof value === 'string' && value.length <= MAX_LOGO_LENGTH &&
    /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(value);
}

/** @returns {Record<string, string>} */
export function readCustomLogos() {
  try {
    const raw = localStorage.getItem(LOGOS_KEY);
    if (!raw || raw.length > 3_000_000) return {};
    const values = JSON.parse(raw);
    if (!values || typeof values !== 'object' || Array.isArray(values)) return {};
    return Object.fromEntries(Object.entries(values).filter(([id, image]) => /^\d{6}$/.test(id) && validLogo(image)));
  } catch { return {}; }
}

/** @param {string} id @param {string | null} image */
export function saveCustomLogo(id, image) {
  if (!/^\d{6}$/.test(id) || image !== null && !validLogo(image)) throw new Error('Logo invalide.');
  const values = readCustomLogos();
  if (image === null) delete values[id];
  else values[id] = image;
  const serialized = JSON.stringify(values);
  if (serialized.length > 3_000_000) throw new Error('Espace réservé aux logos rempli. Restaurez un autre logo avant cet import.');
  try { localStorage.setItem(LOGOS_KEY, serialized); }
  catch { throw new Error('Enregistrement impossible : stockage du navigateur indisponible ou plein. Le logo précédent est conservé.'); }
  window.dispatchEvent(new Event(LOGOS_EVENT));
}

/** @param {File} file @returns {Promise<string>} */
export async function importClubImage(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choisissez une image PNG, JPEG ou WebP.');
  if (!file.size || file.size > 2 * 1024 * 1024) throw new Error('L’image doit peser au maximum 2 Mo.');
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error('Cette image est illisible. Choisissez un autre fichier.'); }
  try {
    if (bitmap.width > 4096 || bitmap.height > 4096) throw new Error('L’image doit mesurer au maximum 4096 × 4096 pixels.');
    const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Le navigateur ne permet pas de préparer cette image.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/png');
    if (!validLogo(image)) throw new Error('Image trop complexe. Choisissez un fichier plus simple.');
    return image;
  } finally { bitmap.close(); }
}
