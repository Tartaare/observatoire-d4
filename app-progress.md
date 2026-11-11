# Avancement

## Sprint 14 — Validation manuelle des logos

Branche : `feature/sprint-14-confirm-club-logos`.

Statut : **terminé le 11 novembre 2026**, sans fusion ni publication.

US-026 : dissocier l’aperçu importé du logo enregistré. L’import prépare uniquement une image temporaire ; « Enregistrer le logo » confirme l’écriture et la propagation. « Annuler le changement », changer de club ou fermer la modale abandonne le brouillon. La restauration du logo d’origine passe par la même validation. Une erreur de stockage conserve le logo enregistré et le brouillon pour permettre une nouvelle tentative.

Propagation : le mécanisme partagé existant est conservé, sans refonte. Après validation, matrice, paramètres, réserves du même club et autres onglets suivent la même valeur enregistrée ; les tris, changements de poule et rechargements relisent cette valeur. Avant validation, seul l’aperçu des paramètres change.

Vérifications : build Pages et typage strict réussis ; 30 tests natifs réussis. Contrôle Edge étendu : absence d’écriture et de changement dans la matrice/autre onglet avant confirmation, annulation, abandon lors du changement de club, confirmation explicite, propagation à une réserve dans l’autre poule et après tri, persistance, restauration confirmée, fichier illisible et stockage plein. Transparence, absence de débordement à 320 px et retour du focus vérifiés.

Prévention des régressions : ne jamais appeler `saveCustomLogo` pendant le décodage de l’image ; réserver cet appel au bouton de confirmation. Garder l’aperçu indépendant du stockage et ne pas propager de brouillon par les événements globaux. Conserver un seul identifiant de logo par club pour toutes ses équipes.

## Sprint 13 — Import des logos personnalisés

Branche : `feature/sprint-13-custom-club-logos`.

Statut : **terminé le 11 novembre 2026**, sans fusion ni publication.

US-025 : ajouter dans les paramètres une section repliable pour les 20 clubs du catalogue : sélection, import PNG/JPEG/WebP, aperçu immédiat, restauration individuelle. Images limitées à 2 Mo et 4096 px de côté, réencodées en PNG à 256 px maximum, proportions et transparence conservées. Stockage local versionné indépendant de la saison et de la palette ; synchronisation entre onglets de la même origine. Aucun envoi de fichier au serveur, aucune nouvelle dépendance ni modification des archives.

Design : suppression du fond blanc CSS et masquage des initiales sous les images transparentes ; retour des initiales si une image est indisponible. Paramètres accessibles au clavier, contrôles de 44 px, aperçu et retour de progression/erreur. Choix du club et import verrouillés pendant le traitement. Une erreur de décodage ou de stockage conserve le logo précédent.

Vérifications : build Pages et typage strict réussis, 30 tests natifs réussis. Edge : import d’un PNG synthétique transparent, réduction 512 × 256 vers 256 × 128 avec alpha nul en bordure, absence de fond et d’initiales sous l’image, aperçu/matrice, rechargement, multi-onglets, restauration, fichier illisible et quota dépassé. Modale vérifiée en portrait 320 px, sans débordement, retour du focus après Échap. Parcours d’apparence existant réussi en 320/390 px. Captures dans `artifacts/appearance/`, hors Git.

Prévention des régressions : garder les trois CSP alignées avec `img-src 'self' data:` ; n’accepter en stockage que des données PNG bornées et des identifiants à six chiffres. Le canvas conserve l’alpha et élimine les formats actifs ; SVG non accepté. Stockage plafonné à 3 millions de caractères, refus explicite si indisponible. Nettoyer les listeners avec le contrôleur et synchroniser les restaurations entre onglets. Le contrôle navigateur ignore uniquement l’éventuelle requête automatique `/favicon.ico` absente, jamais les erreurs JS/CSP applicatives. Les personnalisations sont propres au navigateur et disparaissent lors de l’effacement de ses données.

## Sprint 12 — Logos des clubs

Branche : `feature/sprint-12-club-logos`.

Statut : **terminé le 11 novembre 2026**, sans fusion dans `main` ni publication. Le sprint 11 reste indépendant et en attente de sa validation distante.

US-024 : remplacer les abréviations à gauche des 20 clubs réels par leur écusson FFF. Correspondances vérifiées dans le classement D4 du Onze Lotois, qui utilise les mêmes URL `cdn-transverse.azureedge.net/phlogos/BC{numéro FFF}.jpg` que l’exemple fourni. Les 20 JPEG (environ 90 Ko au total) sont versionnés et servis localement, y compris dans le build Pages. Catalogue explicite par nom normalisé, réserves partageant un logo ; aucun rapprochement approximatif ni modification des archives. Les clubs fictifs sans correspondance conservent leurs initiales.

Design : écussons de 28 px sans déformation, fond blanc discret en thème sombre, place réservée sans saut de mise en page, noms et rangs conservés. Images décoratives avec `alt` vide. Repli sur les initiales lors d’une erreur réseau ; correction de l’ancienne règle mobile qui les masquait. CSP limitée à `img-src 'self'`, aucune dépendance supplémentaire ni requête externe à l’exécution.

Vérifications : build Pages et typage strict réussis ; 29 tests natifs réussis, dont deux nouveaux couvrant catalogue, normalisation, refus des faux rapprochements, JPEG et exposition HTTP. Edge headless : chargement des 20 images, deux poules, clair/sombre, portrait 320 px sans débordement de page, tri et erreur réseau réelle avec repli visible. Aucune erreur JavaScript ou CSP, aucune requête externe. Captures inspectées et conservées dans `artifacts/appearance/` (hors Git).

Prévention des régressions : ne pas masquer les initiales sur mobile ; conserver les dimensions réservées, `object-fit:contain` et les trois CSP cohérentes (HTML, serveur, Pages). Réviser le catalogue lors d’un changement de clubs, intégrer les JPEG localement et relancer le contrôle `scripts/check-club-logos-browser.js`. Les droits des écussons restent à leurs titulaires ; usage dans le projet personnel non commercial existant.

## Sprint 11 — Accès en ligne avec Pages et Supabase

Branche : `feature/sprint-11-online-hosting`.

Statut au **11 novembre 2026 : implémentation locale validée, déploiement en attente d'accès**. Architecture Pages + Supabase choisie par l'utilisateur. Projet Supabase identifié : `sylibzlrejlwfarmbhyw`. Aucun changement distant appliqué, aucune archive envoyée et aucune fusion dans `main` ; le sprint ne sera terminé qu'après validation en ligne.

US-020 : produire un site Pages avec un véritable `dist/index.html`, des ressources publiques explicitement sélectionnées et une API de même origine relayée vers Supabase. Build sans nouvelle dépendance. L'interface existante et le mode local SQLite sont conservés.

US-021 : protéger les archives par Supabase Auth et une liste de membres explicite ; tables et fonctions `od_*` dédiées, RLS activé sans accès public, clés serveur confinées à Supabase. Connexion e-mail/mot de passe, renouvellement de session, erreurs annoncées et déconnexion. Les identifiants de l'application sont distincts du compte du tableau de bord Supabase.

US-022 : adapter la collecte aux Edge Functions par opérations courtes reprenables. Bail PostgreSQL, progression/cache/données enregistrés atomiquement, cache conditionnel, cadence et limites de téléchargement conservés, conservation des compositions plus complètes. L'onglet pilote la reprise ; sa fermeture suspend les prochaines opérations et cette limite est affichée dans le footer. Les calculs de saison sont partagés avec SQLite.

US-023 : préparer un import atomique des archives dans une saison distante vide, refusant l'écrasement d'une saison utilisée. Le contrôle en lecture seule sur la base réelle vérifie **808 rencontres et 216 archives**, avec une projection strictement identique à SQLite. Le cache HTML brut reste dans la copie locale ; les données analysées, classements et dates de suivi sont migrables.

Vérifications : `npm run build:pages` réussi, syntaxe de 37 modules et typage strict du frontend et du code cloud. Suite existante de 20 tests et 7 nouveaux tests réussis : équivalence des projections, qualité des archives, reprise et refus des lancements concurrents, parcours complet par étapes, cache/limites réseau, authentification/autorisation, proxy Pages et démarrage de la fonction générée avec les seules API Web. Aucun réseau source utilisé dans les tests. Contrôle réel d'import exécuté sans écriture ni envoi.

Accès au 11 novembre 2026 : plugin Supabase installé ; connexion MCP distante `supabase-observatoire` configurée pour le seul projet `sylibzlrejlwfarmbhyw`, serveur joignable et authentification OAuth réussie. Les outils distants ne sont pas encore exposés dans la session ayant créé la connexion ; rouvrir Codex dans ce dossier pour les charger, puis vérifier les tables avant toute migration. Aucun identifiant secret n'est enregistré dans le dépôt.

Limites : navigateur et accès natif précédemment indisponibles. Migrations PostgreSQL et baux non exécutés sur une base réelle ; contrôle visuel et parcours d'authentification distant non réalisés. Le dossier Pages et la fonction sont générés localement, sans publication. Configuration et ordre des opérations documentés dans [le guide de déploiement](docs/cloud-deployment.md). Aucun code applicatif modifié lors du diagnostic de connexion ; compilation et tests précédents restent inchangés.

Prévention des régressions : ne jamais publier la racine du dépôt ou une clé serveur ; déployer aussi les Functions Pages ; importer avant la première collecte en ligne ; conserver SQLite en lecture seule pendant l'import ; vérifier le propriétaire du bail lors de chaque écriture ; refuser les comptes absents de `od_members` même si leur jeton Auth est valide. Le stockage cloud et local reste indépendant après import. Surveiller le quota de base et la croissance du cache HTML ; la projection en mémoire est limitée au volume d'une saison personnelle.

## Sprint 10 — Publication GitHub et suivi du développement

Branche : `feature/sprint-10-github`.

Statut : **terminé le 10 novembre 2026**. Dépôt privé : [Tartaare/observatoire-d4](https://github.com/Tartaare/observatoire-d4), avec tickets et projets activés. La version validée devient `main` ; les dix branches de sprint et l'historique des commits sont conservés.

US-019 : publier l'application et son historique pour suivre son développement. Les modifications locales préexistantes (ponctuation du message d'apparence et document `web-ui-guidelines.md`) sont enregistrées dans un commit distinct. Aucun changement d'architecture ni de parcours utilisateur. Le README précise le clonage, les branches et la sauvegarde séparée des archives.

Vérifications : `npm run build` réussi, 29 modules et ressources vérifiés, typage strict réussi ; `npm test` : 20 tests réussis, aucun échec. Exécution hors des restrictions de lecture du sandbox Windows. Revue des fichiers suivis et recherche des signatures courantes de secrets avant envoi. Les données SQLite, dépendances, captures et ressources compilées restent exclues ; les règles ignorent aussi les fichiers `.env` et les formats courants de clés privées.

Prévention des régressions : développer chaque sprint sur sa branche, vérifier compilation et tests avant fusion dans `main`, conserver le dépôt privé et sauvegarder la base SQLite séparément. Ne jamais enregistrer de jeton GitHub dans les fichiers ou l'URL du dépôt distant.

## Sprint 9 — Thèmes et palette personnalisable

Branche : `feature/sprint-9-appearance`.

Statut : **terminé le 10 novembre 2026**, sans fusion dans `main`. Intégration React/TypeScript ciblée et parcours d’apparence validés par l’utilisateur avant implémentation.

US-018 : remplacer la palette verte par des surfaces neutres sombre/claire et un accent orange ; proposer une bascule directe clair/sombre, un mode système et une modale « Paramètres → Apparence » basée sur les composants officiels shadcn/ui Dialog, Button et Input. Les trois couleurs se modifient par sélecteur natif ou champ hexadécimal. Application immédiate, aperçu de l’échelle, réinitialisation, persistance locale versionnée, restauration avant les styles et partage entre onglets. Une saisie invalide conserve la dernière palette valide ; un stockage bloqué conserve l’usage en session et affiche son état.

Les tokens communs à la page et au portail dérivent surfaces, textes, bordures, focus et six niveaux de repérage. Contraste minimal de 7:1 entre les bases, 4,5:1 pour les textes calculés et 3:1 pour le focus et les nouveaux contours de contrôle. La matrice, la navigation et le serveur conservent leur architecture native. Compilation locale isolée avec esbuild/Tailwind sans reset global, déclenchée au lancement ; aucun CDN. En portrait, l’en-tête se répartit sur deux lignes et la modale défile dans la fenêtre avec actions fixes et cibles de 44 px.

Vérifications : build et typage strict de tout le frontend réussis ; 20 tests natifs réussis. Parcours Playwright dans Edge headless avec base synthétique : clair/sombre, palette, validation, réinitialisation, suivi du système, rechargement, multi-onglets, stockage corrompu/bloqué, confinement du focus et retour après Échap. Rendu inspecté sur captures en 1440 × 900 et en portrait tactile 320/390 × 844 ; aucun débordement de page ou de modale, bouton Terminé visible, lignes tactiles d’au moins 48 px. Aucune erreur JavaScript ni violation CSP. Les captures restent locales dans `artifacts/appearance/`. Le connecteur navigateur était indisponible ; les vérifications ont utilisé un profil de test isolé. Lighthouse non mesuré.

Prévention des régressions : initialiser les variables Tailwind via `@tailwind base` même quand preflight est désactivé ; appliquer `box-sizing:border-box` à la racine du portail ; garder les tokens sur `<html>` et supprimer les transitions pendant le changement de thème. Ne pas utiliser l’overlay Radix qui injecte les styles de react-remove-scroll sous la CSP stricte : overlay et verrou de défilement restent en CSS local, focus et fermeture restent gérés par Radix. Normaliser les hexadécimaux avant tout calcul, conserver une couleur de texte propre à chaque niveau et utiliser la variante d’accent à 4,5:1 pour les textes. Les actions et préférences d’apparence restent indépendantes du chargement de saison. Décoder les URL de fichiers avec `fileURLToPath` dans les outils de capture.

## Sprint 8 — Répartition des hauteurs et footer sur une ligne

Branche : `feature/sprint-8-layout-gaps`.

Statut : **terminé le 10 novembre 2026**, sans fusion dans `main`.

US-017 : corriger l’espace signalé au-dessus du tableau et maintenir le bilan du footer sur une seule ligne. La hauteur globale `100%` du tableau est supprimée pour éviter sa redistribution native entre les groupes de lignes. Un conteneur CSS de taille connue et les unités `cqh` attribuent directement la hauteur restante aux lignes des équipes, après les 40 px de l’en-tête. Le nombre d’équipes est actualisé à chaque rendu de poule ; les minima tactiles et les compositions longues restent pris en compte.

Le footer aligne état, date, couverture et progression. Les libellés sont raccourcis sans retrait de compteur ; une infobulle précise les unités. Le bilan dispose d’un défilement horizontal sur écran étroit, d’un accès clavier et d’un focus visible. Les détails ouverts restent autorisés à se déployer verticalement.

Vérifications : build réussi (24 modules), 17 tests réussis avec `node --preserve-symlinks --preserve-symlinks-main --test`, contrôles du format compact adaptés. Diff vérifié sans erreur d’espacement. L’accès au navigateur reste indisponible : l’élimination visuelle de l’espace signalé n’a pas pu être mesurée dans un moteur de rendu.

Prévention des régressions : ne pas réintroduire une hauteur globale de tableau pour remplir la fenêtre ; répartir l’espace directement entre les équipes et conserver un en-tête borné. Désactiver la contenance de taille quand les détails du footer rendent à la page sa hauteur naturelle. Ne pas remplacer l’absence de retour à la ligne par une troncature des compteurs.

## Sprint 7 — Hauteur adaptative et bilan permanent

Branche : `feature/sprint-7-responsive-footer`.

Statut : **terminé le 10 novembre 2026**, sans fusion dans `main`.

US-016 : exploiter l’espace vertical de la fenêtre et déplacer les informations d’acquisition dans le footer. Sur les fenêtres d’au moins 900 × 700 px, la matrice prend la hauteur restante et les lignes s’étirent ; sa zone défile si nécessaire. Les en-têtes et noms restent fixes. La largeur maximale passe à 1800 px. Les petites fenêtres conservent une hauteur naturelle ; les cibles tactiles de 44 px occupent des lignes de 48 px pour éviter leur chevauchement.

Le footer est désormais un enfant direct de l’application, indépendant du chargement de saison : état, dernière mise à jour complète, couverture détaillée, progression et erreurs. Le volet « Suivi » et sa logique d’ouverture sont supprimés. La couverture précédente reste affichée en cas d’échec réseau. Méthode et erreurs se déplient dans le footer, avec retour à une hauteur naturelle de page. Aucun ajout de dépendance ni modification des données archivées.

Vérifications : build réussi (24 modules) et 17 tests réussis avec `node --preserve-symlinks --preserve-symlinks-main --test`. Les contrôles adaptés vérifient le footer hors du contenu masqué, la date et les compteurs de couverture, la progression, le rechargement de saison en fin de collecte, les erreurs, la revérification et la conservation des chiffres pendant une panne. Diff vérifié sans erreur d’espacement. Vérification visuelle aux différentes tailles non réalisée : accès au navigateur et aux applications indisponible après deux tentatives ; absence de défilement et étirement des lignes non mesurés dans un moteur de rendu.

Prévention des régressions : ne pas placer le bilan dans `[data-content]` ou dans un volet fermé ; supprimer les sélecteurs du volet retiré. Les hauteurs de fenêtre utilisent `dvh` et le même token de marge que la page. Les minima tactiles doivent aussi être portés par les cellules du tableau lorsque les boutons remplissent leur surface. L’ouverture d’une composition conserve la hauteur naturelle de ses lignes et un accès par défilement, sans étirer artificiellement le détail.

## Sprint 6 — Vue principale compacte

Branche : `feature/sprint-6-compact-layout`.

Statut : **terminé le 9 novembre 2026**, sans fusion dans `main`.

US-015 : déplacer « Mettre à jour » et la case de revérification dans l’en-tête ; retirer le libellé d’archives et la carte de synchronisation ; déplacer la lecture sous le tableau ; retirer les textes introductifs répétitifs. Le suivi devient un volet natif contextuel, replié au repos. La méthode reste accessible à la demande et le mode démonstration reste signalé. La modification HTML préexistante (libellé « DISTRICT 4 DU LOT » et retrait du titre visible) est préservée ; un titre principal masqué visuellement assure la hiérarchie accessible.

La matrice et les espacements sont compactés ; transport, journée et frise partagent une ligne lorsque la largeur le permet. Un mode plus dense s’applique aux fenêtres d’ordinateur de faible hauteur. Les cibles tactiles, les légendes et le défilement des compositions longues restent disponibles. Aucun masquage du débordement vertical ne force artificiellement le contenu à tenir dans la fenêtre.

Vérifications : build réussi (24 modules), 17 tests réussis avec `node --preserve-symlinks --preserve-symlinks-main --test`. Les deux nouveaux contrôles couvrent la structure HTML et les transitions du suivi, y compris l’échec du démarrage, l’option de revérification et le respect de la fermeture manuelle pendant une panne persistante. Revue du diff sans erreur d’espacement. Le serveur existant répond en HTTP 200 avec dix équipes et dix-huit journées. Vérification visuelle et mesure de l’absence de défilement impossibles : accès natif et navigateur indisponible après deux tentatives. Contrôle TypeScript non exécuté.

Prévention des régressions : adapter les sélecteurs du chargement lors du retrait des textes ; maintenir les actions de synchronisation hors du contenu masqué pendant les erreurs de chargement ; rendre progression et erreurs visibles automatiquement sans rouvrir continuellement un volet fermé. Ne pas couper le volet de suivi aux limites du conteneur, y compris quand la saison est indisponible. Conserver le défilement sur mobile, avec zoom ou détail long.

## Sprint 5 — Persistance du contexte de consultation

Branche : `feature/sprint-5-persist-navigation`.

Statut : **terminé le 9 novembre 2026**, sans fusion dans `main`.

US-014 : conserver la poule, le tri, le curseur de journée et le match ouvert après rechargement ou actualisation des données. Sauvegarde immédiate dans `localStorage`, clé versionnée distincte par saison et pour la démonstration. Restauration des contrôles avant le premier rendu ; aucune reprise automatique de la lecture. Aucun changement visuel et aucune nouvelle dépendance.

Vérifications : build réussi (23 modules), 15 tests réussis avec `node --preserve-symlinks --preserve-symlinks-main --test`. `npm.cmd test` rencontre la restriction de résolution des chemins du sandbox Windows ; le contournement documenté passe. Contrôle HTTP du nouveau module inclus. Revue du diff sans erreur d’espacement. Parcours visuel dans le navigateur et contrôle TypeScript non exécutés.

Prévention des régressions : retrouver l’équipe sélectionnée par son nom plutôt que par sa position ; écarter les équipes supprimées, rencontres futures ou reportées et sélections après le curseur. Borner la journée au calendrier courant. Ne jamais persister le minuteur. Les erreurs de lecture/écriture du stockage ne doivent pas bloquer l’application. La conservation concerne le contexte principal, pas les sections dépliées des compositions ni la position exacte du défilement.

## Sprint 4 — Résultats dans la matrice

Branche : `feature/sprint-4-match-results`.

Statut : **terminé le 9 novembre 2026**, sans fusion dans `main`.

US-013 : repère discret V/N/D/F en bas à droite des cases, légende, infobulle et résultat explicite dans le libellé accessible. Le résultat est calculé du point de vue de chaque équipe, depuis le score archivé ou le calendrier simulé. Le forfait nomme l’équipe concernée : F pour celle-ci, V avec la précision « Victoire par forfait » pour son adversaire. Aucun score ni compteur de participation n’est créé pour un forfait ; son détail explique l’absence de participation jouée.

Vérifications : build réussi et 14 tests réussis avec `node --preserve-symlinks --preserve-symlinks-main --test` (contournement de la résolution des chemins dans le sandbox Windows). Le nouveau test couvre les deux côtés, les nuls, les séparateurs de score, les forfaits et les résultats inconnus. Revue du diff sans erreur d’espacement. Rendu visuel dans un navigateur non vérifié.

Prévention des régressions : ne pas assimiler les forfaits à des matchs futurs ni à des feuilles manquantes ; conserver le masquage des résultats après le curseur et distinguer résultat connu et composition inconnue. Un forfait dont l’équipe ne peut pas être identifiée ne produit aucun résultat déduit.

## Sprint 3 — Rapprochements limités au même club

Branche : `feature/sprint-3-same-club-matching`.

Statut : **terminé le 9 novembre 2026**, sans fusion dans `main`.

US-012 : application de la règle métier précisée par l’utilisateur — aucun changement de club en cours de saison. Les antécédents sont indexés par URL de club et nom normalisé. Seules les feuilles dont les clubs sont identifiés et identiques alimentent l’historique et les totaux. L’indicateur interclubs et la mention d’homonymie entre clubs sont retirés du détail.

Vérifications : build réussi, 13 tests réussis. Le nouveau test contrôle un rapprochement du même club, son exclusion pour un autre club, et l’absence de rapprochement si le club manque d’un côté ou de l’autre. Contrôle des données réelles : les 236 antécédents conservés appartiennent tous au même club que leur feuille D4.

Prévention des régressions : comparer l’URL du club, pas le nom de l’équipe ; les équipes réserves du même club restent pertinentes. Les archives collectées restent disponibles hors ligne ; le filtrage est appliqué lors de la construction de la saison et ne nécessite aucune nouvelle collecte.

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
