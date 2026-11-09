# Observatoire D4

Projet personnel non commercial pour explorer, par journée de D4, les apparitions de joueurs déjà vus en division supérieure.

L’interface utilise des données de démonstration. Certaines fiches comportent les liens documentaires de la page initiale.

## Lancer le projet

Prérequis : **Node.js 22.16 ou supérieur**. Aucune installation npm nécessaire : le serveur, SQLite et les tests utilisent uniquement les modules natifs de Node.js.

```powershell
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

Parcours : le navigateur charge `GET /api/season`, valide la réponse et initialise la matrice. Les filtres, le curseur et les détails fonctionnent ensuite en mémoire. Les erreurs de chargement proposent une nouvelle tentative.

Le design, les thèmes clair/sombre, les tris, les deux poules, la lecture automatique et le parcours clavier de la page initiale sont conservés. La lecture s’arrête aussi lorsque l’onglet devient invisible.

## Données SQLite

La base contient `season`, `pools`, `teams` et `appearances`. Équipes et apparitions sont relationnelles ; les dates et les exemples documentaires sont stockés en JSON dans `season`. Les requêtes d’initialisation utilisent des paramètres SQL et une transaction.

L’initialisation ne s’exécute qu’en l’absence de saison. Modifier `server/demo.js` ne remplace donc pas une base existante. Pour sauvegarder les données, arrêter le serveur puis copier `data/observatoire.sqlite`.

L’API est en lecture seule et n’expose pas le fichier SQLite. Cette version conserve le périmètre de la démonstration : deux poules de huit équipes, quatorze journées et un exemple documenté durant la phase aller. Un zéro, une feuille manquante (`null`) et une journée future sont des états distincts.

Aucun import automatique du collecteur ni formulaire de modification des données n’est inclus.

## Vérifier le projet

```powershell
npm run build
npm test
```

Le projet est servi directement : `build` vérifie la syntaxe JavaScript, les imports locaux et les ressources HTML sans créer de bundle. Les tests natifs vérifient le calendrier, les fiches, la validation des données, la persistance après réouverture de SQLite et les routes HTTP. Ils utilisent une base temporaire ou en mémoire.

Le collecteur `collecte_onze_lotois.py` est un outil indépendant. Il utilise Python et `lxml` et n’est pas exécuté par l’application.

Références : [langage visuel](design_language.md), [avancement](app-progress.md).
