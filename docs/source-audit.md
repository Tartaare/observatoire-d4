# Audit de la collecte — 9 novembre 2026

## Périmètre demandé

Observer les participations dans les championnats seniors masculins à partir de la D4, puis rechercher les apparitions antérieures en division supérieure durant la même saison. La catégorie porte sur la rencontre : un jeune joueur surclassé ayant effectivement joué en seniors entre dans ce périmètre.

Le football féminin, les compétitions de jeunes, les coupes et les rencontres non terminées ne constituent pas des antécédents de championnat dans ce périmètre.

## Vérifications effectuées sur la source publique

- [D4](https://leonzelotois.fr/division/d4/) : deux poules de dix équipes et dix-huit journées ; les liens des journées passées et futures sont présents.
- [Annuaire](https://leonzelotois.fr/clubs/) : quarante liens de clubs distincts dans le HTML consulté.
- [Élan Marivalois](https://leonzelotois.fr/club/elan-marivalois/) : calendriers de toutes les équipes du club inclus dans le HTML, même lorsque la présentation utilise une pagination côté navigateur. Les équipes féminines figurent aussi sur cette page : filtrer chaque section est nécessaire.
- [Élan Marivalois 4 — Béduer-Faycelles](https://leonzelotois.fr/matchs/elan-marivalois-4-beduer-faycelles-us/) : compositions présentes dans le HTML brut (`compo-col`, `compo-list`, `compo-nom`), titulaires et remplaçants séparés, entrées et sorties indiquées lorsqu’elles sont publiées.
- Les noms sont abrégés et aucun identifiant individuel exploitable n’a été trouvé dans cette feuille. Un rapprochement par nom ne suffit pas à certifier une identité.
- Les règles robots consultées n’interdisent pas ces chemins publics. Le collecteur doit rester limité, séquentiel et s’arrêter en cas de refus ou de limitation HTTP.
- Node.js local peut accéder à la source avec `--use-system-ca`, en conservant la vérification TLS. Sans cette option, une erreur de chaîne de certificats a été observée dans cet environnement.

## Écarts de la version existante

Le prototype Python connaît les sélecteurs des compositions et distingue les titulaires des remplaçants entrés. En revanche, sa lecture d’une division ne parcourt pas les liens de journées découverts, ne conserve pas de cache durable et n’alimente pas la base de l’application.

L’interface actuelle génère un calendrier fictif de huit équipes, quatorze journées et six journées renseignées. Elle ne peut donc pas recevoir les données réelles sans adapter son modèle de calendrier.

Le collecteur ne doit pas transformer une absence de feuille ou une composition partielle en zéro joueur. Tous les noms publiés doivent être conservés ; une participation non attestée doit rester distincte d’une participation confirmée.

## Architecture proposée, soumise à validation

1. Lire le classement D4 pour établir le périmètre et les poules, puis les calendriers des clubs pour découvrir les rencontres seniors masculines de la saison.
2. Dédupliquer les rencontres par URL source avant téléchargement. Ne télécharger les feuilles que pour les rencontres terminées.
3. Conserver dans SQLite les pages sources, métadonnées, compositions, participations et erreurs. Utiliser le cache, les validateurs HTTP et une politique de rafraîchissement explicite pour réduire les lectures répétées.
4. Reprendre une synchronisation interrompue sans effacer les feuilles déjà acquises. Conserver une composition antérieure si une lecture ou une analyse échoue.
5. Afficher l’état de couverture : rencontres découvertes, feuilles récupérées, feuilles absentes ou partielles et erreurs de collecte. La complétude ne peut porter que sur les rencontres identifiées par la source, pas sur tous les championnats français.
6. Fournir une commande de synchronisation dans l’interface et afficher la dernière mise à jour. L’application reste consultable sans Internet via son serveur local et sa base SQLite.
7. Présenter les rapprochements de noms abrégés comme des repérages à confirmer, avec leurs sources, sans fusionner arbitrairement les identités.

Un analyseur HTML maintenu évite de reproduire un parseur HTML dans le projet. Une version de Cheerio compatible avec Node.js 22.16 a été identifiée dans le registre npm ; l’ajout de cette dépendance fait partie de la proposition.
