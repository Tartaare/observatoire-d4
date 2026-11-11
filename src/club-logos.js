import {escapeHTML} from './dom.js';

// Correspondances du classement D4, vérifiées le 11 novembre 2026.
// Source des images : https://cdn-transverse.azureedge.net/phlogos/BC{numéro FFF}.jpg
export const clubLogos = [
  {
    "name": "U.S. Dégagnacoise",
    "id": "522122",
    "sourceURL": "https://leonzelotois.fr/club/degagnac/"
  },
  {
    "name": "Entente Bouriane F.C. 3",
    "id": "542833",
    "sourceURL": "https://leonzelotois.fr/club/entente-bouriane-f-c/"
  },
  {
    "name": "Puy-l'Évêque Prayssac F.C. 3",
    "id": "540626",
    "sourceURL": "https://leonzelotois.fr/club/puy-leveque-prayssac-f-c/"
  },
  {
    "name": "F.C. Lalbenque-Fontanes 3",
    "id": "547122",
    "sourceURL": "https://leonzelotois.fr/club/f-c-lalbenque-fontanes/"
  },
  {
    "name": "A.S. St Matré-le-Boulvé",
    "id": "531283",
    "sourceURL": "https://leonzelotois.fr/club/a-s-st-matre-le-boulve/"
  },
  {
    "name": "Cahors F.C. 3",
    "id": "545076",
    "sourceURL": "https://leonzelotois.fr/club/cahors-f-c/"
  },
  {
    "name": "Ent. ECCF Causse Sud 3",
    "id": "548858",
    "sourceURL": "https://leonzelotois.fr/club/eccf-entente-cajarc-cenevieres/"
  },
  {
    "name": "La Fortunière Labastide-Murat 2",
    "id": "517796",
    "sourceURL": "https://leonzelotois.fr/club/la-fortuniere-labastide-murat/"
  },
  {
    "name": "Football Formation Mauroux 2",
    "id": "552545",
    "sourceURL": "https://leonzelotois.fr/club/football-formation-mauroux/"
  },
  {
    "name": "Entente Mayrinhac Saint-Céré 3",
    "id": "516970",
    "sourceURL": "https://leonzelotois.fr/club/entente-mayrinhac-saint-cere/"
  },
  {
    "name": "Élan Marivalois 4",
    "id": "581896",
    "sourceURL": "https://leonzelotois.fr/club/elan-marivalois/"
  },
  {
    "name": "U.S. Labathude",
    "id": "531282",
    "sourceURL": "https://leonzelotois.fr/club/u-s-labathude/"
  },
  {
    "name": "U.S. Béduer-Faycelles",
    "id": "565091",
    "sourceURL": "https://leonzelotois.fr/club/u-s-beduer-faycelles/"
  },
  {
    "name": "C.L. Cuzance Football",
    "id": "533635",
    "sourceURL": "https://leonzelotois.fr/club/c-l-cuzance-football/"
  },
  {
    "name": "Haut Célé F.C. 3",
    "id": "582418",
    "sourceURL": "https://leonzelotois.fr/club/haut-cele-f-c/"
  },
  {
    "name": "U.S. Puybrun Tauriac 2",
    "id": "514941",
    "sourceURL": "https://leonzelotois.fr/club/u-s-puybrun-tauriac/"
  },
  {
    "name": "Entente Cazillac-Sarrazac",
    "id": "519734",
    "sourceURL": "https://leonzelotois.fr/club/entente-cazillac-sarrazac/"
  },
  {
    "name": "Causse Limargue F.C. 3",
    "id": "542832",
    "sourceURL": "https://leonzelotois.fr/club/causse-limargue-f-c/"
  },
  {
    "name": "Val Roc Foot 3",
    "id": "542831",
    "sourceURL": "https://leonzelotois.fr/club/val-roc-foot/"
  },
  {
    "name": "F.C. du Haut Quercy 3",
    "id": "541254",
    "sourceURL": "https://leonzelotois.fr/club/f-c-du-haut-quercy/"
  }
];

/** @param {string} name */
const key = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+\d+$/, '').replace(/[^a-z0-9]/g, '');
const logos = new Map(clubLogos.map(club => [key(club.name), club.id]));
// Variantes des noms présents dans la démonstration historique.
for (const [name, id] of [['US Béduer-Faycelles', '565091'], ['Haut Célé FC', '582418'], ['FC Cuzance', '533635'], ['FC Bouriane', '542833'], ['Causse Limargue', '542832']]) logos.set(key(name), id);

/** @param {string} name @returns {string | null} */
export function clubLogoURL(name) {
  const id = logos.get(key(name));
  return id ? './assets/clubs/BC' + id + '.jpg' : null;
}

/** @param {string} name @param {string} initials */
export function clubBadge(name, initials) {
  const url = clubLogoURL(name);
  return '<span class="od-crest" aria-hidden="true"><span class="od-monogram">' + escapeHTML(initials) + '</span>' +
    (url ? '<img src="' + url + '" alt="" width="28" height="28" decoding="async">' : '') + '</span>';
}

/** @param {HTMLElement} root */
export function bindClubLogoFallbacks(root) {
  root.querySelectorAll('.od-crest img').forEach(image => image.addEventListener('error', () => image.remove(), {once: true}));
}
