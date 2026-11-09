# Avancement

## Sprint 1 — Architecture statique et SQLite

Branche : `feature/sprint-1-static-architecture`.

Architecture validée : HTML, CSS et JavaScript natif en modules, serveur local Node.js et SQLite sans dépendance externe.

État initial : une page autonome contenant structure, styles, données et interactions ; un collecteur Python indépendant. Aucun dépôt Git ni documentation préalable.

Périmètre : extraire les styles et les modules, stocker la démonstration dans SQLite, exposer une API locale de lecture, documenter le lancement et vérifier les parcours existants.

Le collecteur Python reste indépendant. Aucune collecte réseau ni migration vers des données réelles dans ce sprint.

## Prévention des régressions

- Préserver les états `0`, feuille manquante (`null`) et match futur : ils n’ont pas la même signification.
- Le calendrier de 8 équipes comporte 14 journées ; chaque paire se rencontre à domicile et à l’extérieur.
- Les tris conservent l’identité des équipes et la sélection en cours.
- La base existante ne doit pas être réinitialisée au démarrage.
