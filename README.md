# Observatoire D4

Projet personnel non commercial pour explorer, par journée de D4, les apparitions de joueurs déjà vus en division supérieure.

L’interface affiche les données réelles archivées depuis [Le Onze Lotois](https://leonzelotois.fr/division/d4/). Avant la première synchronisation, la démonstration reste disponible et clairement identifiée.

## Lancer le projet

Prérequis : **Node.js 22.16 ou supérieur**. Le serveur et SQLite sont natifs ; Cheerio est l’unique dépendance directe, pour analyser le HTML de la source.

```powershell
npm ci --ignore-scripts
npm start
```

Ouvrir **http://127.0.0.1:3000**. Les modules JavaScript et l’API nécessitent le serveur ; ouvrir directement le fichier HTML ne suffit plus.

Si le port est occupé :

```powershell
$env:PORT = '3001'
npm start
```

Ouvrir alors **http://127.0.0.1:3001**. Arrêt : `Ctrl+C` dans le terminal. Le serveur écoute exclusivement sur `127.0.0.1`.

La version locale Node.js 22.16 affiche un avertissement expérimental pour `node:sqlite` ; il n’empêche pas le fonctionnement.

## Architecture

```text
observatoire-d4.html         Structure et points d’entrée accessibles
assets/css/observatoire.css  Styles, tokens, thèmes et responsive
src/
  app.js                    Chargement API, états de chargement/erreur/vide
  controller.js             État de navigation, événements et lecture
  view.js                   Matrice et détail des matchs
  season.js                 Calendrier, fiches et validation des données
  dom.js                    Requêtes DOM typées et échappement HTML
  types.js                  Contrats JSDoc partagés
server/
  index.js                  Serveur HTTP et liste explicite des fichiers publics
  database.js               Schéma SQLite et accès aux données
  demo.js                   Données initiales de démonstration
data/observatoire.sqlite    Base locale, créée au premier lancement et ignorée par Git
scripts/check.js            Validation de syntaxe et des ressources
tests/observatoire.test.js  Vérifications métier, SQLite et HTTP
jsconfig.json               Vérification stricte du JavaScript dans un IDE compatible
```

Les modules de collecte sont `server/source.js` (analyse HTML), `source-reader.js` (HTTP/cache), `collection-store.js` (archives SQLite), `synchronize.js` (orchestration) et `live-season.js` (projection de la saison réelle). L’interface utilise aussi `src/sync-panel.js` pour la synchronisation et `src/detail.js` pour les compositions archivées.

Parcours : le navigateur charge `GET /api/season`, valide la réponse et initialise la matrice. La poule, le tri, la journée et le match ouvert sont mémorisés dans le stockage local du navigateur par `src/navigation.js`, séparément pour chaque saison et pour la démonstration. Ils sont restaurés après rechargement et après mise à jour des données ; la lecture automatique reste en pause. Le match est retrouvé par nom d’équipe, puis vérifié dans les données courantes. Les détails historiques sont lus dans les archives locales. Le contrôleur est nettoyé avant de charger une nouvelle version des données.

Ces préférences sont propres au navigateur et à l’adresse utilisée (hôte et port compris). Si le stockage local est bloqué, plein ou corrompu, la consultation reste disponible ; seules les préférences valides sont restaurées. Les sections dépliées dans les compositions ne sont pas mémorisées.

Le design, les thèmes clair/sombre, les tris, les deux poules, la lecture automatique et le parcours clavier de la page initiale sont conservés. La lecture s’arrête aussi lorsque l’onglet devient invisible.

La vue principale utilise la hauteur disponible : saison et filtres au-dessus de la matrice, commandes de lecture et curseur en dessous, puis bilan des archives dans le footer. Sur les fenêtres d’au moins 900 × 700 px, la matrice s’étend verticalement et ses lignes grandissent pour éviter l’espace inutilisé en bas de page. Les longues compositions défilent dans la matrice avec noms d’équipes et en-tête fixes. Les petites fenêtres gardent un défilement naturel et les cibles tactiles restent accessibles. La largeur maximale est de 1800 px. La méthode et ses limites se consultent à la demande dans le footer ; leur ouverture rend à la page sa hauteur naturelle.

Chaque case visible porte un repère discret si le résultat est connu : **V** (victoire), **N** (nul), **D** (défaite), **F** (forfait de cette équipe). Le résultat complet est disponible au survol et dans le libellé accessible. L’adversaire d’une équipe forfait est indiqué « Victoire par forfait » ; ces rencontres restent sans participation jouée comptabilisée. Les repères suivent le curseur de journée, y compris lorsque le résultat est connu mais la composition manque.

## Consultation hors ligne et mise à jour

Après une première synchronisation, conserver le dossier du projet, `node_modules` et `data/observatoire.sqlite`. Lancer `npm start` permet de consulter les données **sans connexion Internet**. Le serveur local doit rester lancé ; aucun service distant n’est nécessaire pour charger l’interface, la saison ou les compositions archivées.

Avec une connexion, cliquer sur **Mettre à jour** dans l’en-tête. La case **Revérifier toutes les feuilles**, au même endroit, contourne la durée de fraîcheur du cache ; les validateurs HTTP restent utilisés si la source en fournit. Le footer indique en permanence l’état des archives, la date de dernière mise à jour complète, la couverture du calendrier, les compositions complètes/partielles/absentes et les noms sur feuilles. Il affiche aussi la progression pendant la collecte et les erreurs dépliables. Il reste disponible si le chargement de la saison échoue ; une panne du serveur conserve les derniers chiffres affichés.

La même opération est disponible dans le terminal :

```powershell
npm run sync
npm run sync -- --force
npm run sync -- --season=2026
```

La saison courante est déduite de l’année sportive commençant en juillet. `--season=2026` désigne juillet 2026 à juin 2027 ; cette option ne permet pas d’obtenir des archives que le site ne publie plus.

Les calendriers restent frais 15 minutes, les feuilles complètes 24 heures et les feuilles incomplètes 1 heure. Une requête réseau au maximum par seconde, téléchargement limité à 3 Mo et délai de réponse de 20 secondes. Les refus HTTP 403/429 ou une coupure interrompent le parcours ; une nouvelle mise à jour reprend avec les données déjà acquises. Un verrou SQLite empêche deux synchronisations simultanées de la même saison, y compris entre le serveur et la commande terminal.

## Périmètre et fiabilité

La collecte découvre les calendriers des clubs référencés par la source, filtre chaque compétition senior masculine D4 et supérieure, puis déduplique les URL de match. Seules les rencontres terminées donnent lieu à une collecte de participations. Les coupes, jeunes, féminines et forfaits ne constituent pas des participations jouées dans cette analyse.

Tous les joueurs publiés sont conservés. Les titulaires et remplaçants dont une entrée ou sortie est attestée sont distingués des remplaçants sans preuve de participation. Une composition partielle ou manquante produit `?`, jamais un faux zéro.

Un repérage est une correspondance exacte de nom normalisé dans une participation D4 attestée et une participation en championnat supérieur **du même club, à une date strictement antérieure**, pendant la même saison. Le club est identifié par son URL source : les homonymes d’autres clubs et les feuilles sans club identifié sont exclus des historiques et des compteurs. Règle métier retenue : aucun changement de club pendant la saison. Les rencontres du même jour ne servent pas à établir une antériorité. Les liens et compositions locales permettent de contrôler les correspondances.

Les noms de la source sont abrégés, sans identifiant individuel exploitable : **un repérage ne certifie pas une identité**. Un zéro signifie aucun repérage dans les feuilles acquises ; des antécédents peuvent manquer si la source est incomplète ou ne couvre pas une compétition. La couverture affichée porte sur cette source, pas sur tous les championnats français.

## Données SQLite

Les tables initiales `season`, `pools`, `teams` et `appearances` conservent la démonstration. Une migration additive ajoute `source_pages`, `collected_fixtures`, `collected_sheets`, `collected_players`, `collection_meta` et `collection_locks`. Les joueurs sont stockés par feuille et ne sont pas fusionnés artificiellement en identités.

La mise à jour des feuilles utilise des transactions et des paramètres SQL. Une erreur conserve l’archive précédente ; une nouvelle composition moins complète ne remplace pas une archive plus complète et cette conservation est signalée. Les pages HTML sources et leurs validateurs sont également conservés.

Pour sauvegarder les données, arrêter les synchronisations et le serveur puis copier `data/observatoire.sqlite`. La base et les captures d’audit sont ignorées par Git. La page s’adapte au calendrier réel sans créer de rencontres ou scores fictifs.

L’API locale expose `GET /api/season`, `GET /api/sync`, `GET /api/sheet?url=…` et `POST /api/sync` (`?force=1` pour revérifier). Le déclenchement HTTP est réservé à l’application locale ; les fichiers de base et de serveur ne sont pas exposés.

## Vérifier le projet

```powershell
npm run build
npm test
```

Le projet est servi directement : `build` vérifie la syntaxe JavaScript, les imports locaux et les ressources HTML sans créer de bundle. Les 17 tests natifs couvrent notamment le placement des actions et de la lecture, le bilan permanent dans le footer (couverture, progression, erreurs et conservation des chiffres après une panne), la persistance de navigation (saisons distinctes, équipes réordonnées ou retirées, sélection invalide, stockage corrompu ou indisponible), les résultats par équipe et forfaits, les compositions, le filtrage strict par club, le cache conditionnel, les transactions, la persistance après réouverture de SQLite avec panne réseau simulée, les protections HTTP et l’échappement du rendu. Les tests utilisent uniquement des données synthétiques locales et n’effectuent pas de collecte réelle.

Le prototype `collecte_onze_lotois.py` reste disponible comme outil indépendant. Ses sélecteurs ont servi de référence au collecteur Node.js ; Python et `lxml` ne sont pas requis pour l’application.

Références : [langage visuel](design_language.md), [avancement](app-progress.md).
