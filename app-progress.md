# Avancement

## Sprint 2 — Collecte fiable et consultation hors ligne

Branche : `feature/sprint-2-offline-sync`.

Statut : **terminé le 9 novembre 2026**, sur la branche de sprint, sans fusion dans `main`. Architecture et présentation des repérages validées par l’utilisateur.

Résultats de l’audit et proposition détaillée : [audit de la source](docs/source-audit.md).

Livré :

- US-006 : audit de couverture et des limites des identités publiques.
- US-007 : analyse des calendriers et des compositions avec Cheerio, limitée aux championnats seniors masculins D4 et supérieurs.
- US-008 : archives SQLite, cache conditionnel, reprise, transactions et verrou entre processus ; conservation des archives en cas de dégradation.
- US-009 : API locale pour saison réelle, statut de synchronisation et consultation des feuilles archivées ; protection du déclenchement HTTP.
- US-010 : matrice adaptée aux journées réelles et affichage de tous les joueurs publiés, y compris remplaçants non attestés, sans les compter comme participations.
- US-011 : bouton de mise à jour, progression, couverture et erreurs ; consultation hors ligne avec le serveur local lancé.

Vérifications : `npm run build` réussi (21 modules) ; 12 tests réussis, dont persistance après réouverture et panne réseau simulée. Typage strict du frontend vérifié avec TypeScript 5.9.3 et `jsconfig.json`, sans ajout de dépendance au projet. Contrôle HTTP réel sur `127.0.0.1:3001` : deux poules de dix équipes, dix-huit journées, saison et archives valides. Navigateur automatisé indisponible : rendu visuel et score Lighthouse non mesurés.

Première collecte réelle : 40 calendriers examinés ; 180/180 rencontres du calendrier D4 indexées ; 216 rencontres terminées, 432 compositions attendues, 403 complètes, 19 partielles et 10 absentes ; 5 834 entrées de joueurs publiées (pas 5 834 personnes distinctes). D4 : 82 compositions complètes, 8 partielles et 6 absentes sur 96 attendues pour les matchs terminés. Deux forfaits D4 sont indexés sans participation retenue. Aucun échec de collecte restant ; les absences de composition sont des états de la source.

Une reprise immédiate a réutilisé 258 pages en cache sans requête Internet. L’application relancée affiche les données réelles depuis SQLite. Le collecteur Python est inchangé.

Prévention des régressions : les clubs à une seule équipe utilisent une autre présentation HTML, désormais testée. L’annuaire présente U.S. Nozacoise comme D3 mais son calendrier ne contient que des matchs féminins : le filtrage des cartes prévaut et les exclut. Les correspondances restent fondées sur un nom abrégé, sans certification d’identité ; les matchs du même jour ne servent pas d’antécédent.

## Sprint 1 — Architecture statique et SQLite

Branche : `feature/sprint-1-static-architecture`.

Architecture validée : HTML, CSS et JavaScript natif en modules, serveur local Node.js et SQLite sans dépendance externe.

État initial : une page autonome contenant structure, styles, données et interactions ; un collecteur Python indépendant. Aucun dépôt Git ni documentation préalable.

Périmètre : extraire les styles et les modules, stocker la démonstration dans SQLite, exposer une API locale de lecture, documenter le lancement et vérifier les parcours existants.

Statut : **terminé le 9 novembre 2026**, sur la branche de sprint, sans fusion dans `main`.

## Livré

- US-001 : dépôt local et documents de référence, version initiale conservée dans Git.
- US-002 : serveur Node.js natif, API locale de lecture, stockage SQLite et initialisation transactionnelle sans écrasement.
- US-003 : modèle de saison séparé, contrats JSDoc et validation des données à la frontière API.
- US-004 : HTML, CSS, rendu et interactions séparés ; identité visuelle et fonctions existantes conservées.
- US-005 : chargement, erreur avec nouvelle tentative et absence de données ; contrôles métier et HTTP exécutables.

## Vérification

- `npm run build` : réussi, 11 modules JavaScript et références de ressources vérifiés.
- `npm test` : 5 tests réussis, 0 échec.
- Démarrage réel : SQLite créé, page et API répondant en HTTP 200 sur `127.0.0.1:3001` ; le port 3000 était déjà occupé.
- Revue : aucune dépendance externe, aucun script/style intégré au HTML, données textuelles échappées et liens sources limités à HTTPS sur les domaines attendus.
- Limite de vérification : navigateur automatisé indisponible dans cette session ; rendu visuel, interactions DOM et score Lighthouse non mesurés. Le typage JSDoc est configuré pour l’IDE ; le contrôle de build porte sur la syntaxe et les ressources.

Le collecteur Python reste indépendant. Aucune collecte réseau ni migration vers des données réelles dans ce sprint.

## Prévention des régressions

- Préserver les états `0`, feuille manquante (`null`) et match futur : ils n’ont pas la même signification.
- Le calendrier de 8 équipes comporte 14 journées ; chaque paire se rencontre à domicile et à l’extérieur.
- Les tris conservent l’identité des équipes et la sélection en cours.
- La base existante ne doit pas être réinitialisée au démarrage.
- Les textes français sont enregistrés en UTF-8 ; éviter les conversions implicites lors de générations via PowerShell.
- Les données de démonstration restent limitées au calendrier initial, avec l’exemple documenté dans la phase aller.
- En environnement sandbox Windows, Node peut nécessiter les options `--preserve-symlinks --preserve-symlinks-main` pour résoudre les fichiers ; les commandes npm standard ont également été exécutées avec succès hors de cette restriction.
