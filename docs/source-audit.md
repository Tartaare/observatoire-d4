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

## Architecture validée et implémentée

1. Lire le classement D4 pour établir le périmètre et les poules, puis les calendriers des clubs pour découvrir les rencontres seniors masculines de la saison.
2. Dédupliquer les rencontres par URL source avant téléchargement. Ne télécharger les feuilles que pour les rencontres terminées.
3. Conserver dans SQLite les pages sources, métadonnées, compositions, participations et erreurs. Utiliser le cache, les validateurs HTTP et une politique de rafraîchissement explicite pour réduire les lectures répétées.
4. Reprendre une synchronisation interrompue sans effacer les feuilles déjà acquises. Conserver une composition antérieure si une lecture ou une analyse échoue.
5. Afficher l’état de couverture : rencontres découvertes, feuilles récupérées, feuilles absentes ou partielles et erreurs de collecte. La complétude ne peut porter que sur les rencontres identifiées par la source, pas sur tous les championnats français.
6. Fournir une commande de synchronisation dans l’interface et afficher la dernière mise à jour. L’application reste consultable sans Internet via son serveur local et sa base SQLite.
7. Présenter les rapprochements de noms abrégés comme des repérages à confirmer, avec leurs sources, sans fusionner arbitrairement les identités.

Un analyseur HTML maintenu évite de reproduire un parseur HTML dans le projet. Cheerio 1.2.0, compatible avec Node.js 22.16, est l’unique dépendance directe ajoutée après validation.

## Résultat de la collecte réelle

Cheerio 1.2.0 a été installé avec un verrou de versions npm. Les quarante calendriers ont été examinés, puis 216 rencontres terminées dédupliquées ont été collectées. Les 180 rencontres du calendrier D4 sont indexées. Les compositions sont complètes pour 403 équipes, partielles pour 19 et absentes pour 10 ; les 5 834 noms enregistrés sont des entrées sur feuilles et non des personnes distinctes.

Deux présentations de club ont été vérifiées : sections par équipe pour les clubs multiples et section « Matchs » avec division dans l’en-tête pour les clubs à une équipe. Le cas U.S. Nozacoise expose une incohérence de la source : en-tête D3 mais seules des cartes féminines ; aucune participation n’est retenue. Les forfaits ne sont pas assimilés à une participation jouée.

La reprise immédiate n’a nécessité aucune requête réseau : 258 lectures ont été satisfaites par le cache local. Les feuilles non publiées restent explicitement absentes ; aucune exhaustivité au-delà des informations accessibles sur cette source n’est affirmée.
