# Audit UI/UX en portrait — Observatoire D4

24 novembre 2026 · Version examinée `ff6d49d` · Branche `feature/sprint-22-audit-portrait`

**La matrice mérite d’être conservée.** Sur 390 × 844 px, à la journée 6, on voit les dix équipes de la poule et quatre journées entières. Les noms restent à gauche pendant le balayage. Les trois corrections prioritaires concernent la commande qui reçoit le toucher, la visibilité du focus clavier et la fiabilité de l’état affiché après actualisation. Une refonte de l’écran apporterait peu à ces trois problèmes.

## Trois défauts prioritaires

| Parcours et reproduction | Conséquence observée | Critère de correction |
|---|---|---|
| **P1 · Reculer d’une journée.** En 430 × 932, partir de J06 et toucher la flèche précédente à 4 px de son bord inférieur. Refaire le geste au centre depuis J06. | Au bord, le curseur transparent reçoit le toucher et J06 reste affichée. Au centre, la flèche passe bien à J05. Les deux surfaces actives se chevauchent sur 8 px. Reproduit avec Edge et WebKit. | Donner au curseur sa propre hauteur dans le flux. Depuis J06, le centre et les quatre coins intérieurs de la flèche doivent tous sélectionner J05. Vérifier aussi Lecture et Suivante à chaque retour à la ligne des commandes. |
| **P1 · Entrer dans la matrice au clavier.** En 320 × 568, ouvrir la saison sur J06, placer le focus sur le sélecteur de tri et appuyer sur Tab. | Le focus atteint J01, derrière la colonne Équipe. Dans Edge, le bouton s’étend de x = −10 à 38 px, alors que les journées ne sont découvertes qu’à partir de x = 156 px. Dans WebKit, le centre du bouton est recouvert par l’en-tête Équipe. On peut activer une journée sans voir laquelle. | Faire défiler la matrice quand un en-tête ou une case reçoit le focus, en tenant compte de la largeur réellement occupée par Équipe. Parcourir dans les deux sens et vérifier que le contrôle et son contour restent visibles. |
| **P1 · Actualiser une saison qui devient vide.** Afficher une poule de dix équipes, terminer une collecte simulée, puis fournir à la relecture une saison valide avec deux poules vides. | Le message « Aucune équipe disponible pour cette saison » est écrit dans une zone masquée. Les dix anciennes équipes restent visibles et interactives. Au premier chargement, la même réponse affiche correctement l’état vide. | Vérifier les deux transitions, saison pleine → vide et vide → pleine. Dès la réponse vide, afficher le message, retirer l’ancienne matrice et arrêter sa lecture éventuelle. À la prochaine réponse pleine, afficher uniquement les nouvelles données. |

Les deux premiers défauts sont directement reproductibles sur la copie locale de la saison. Le troisième a été provoqué à la frontière de l’API. Sa fréquence en production reste inconnue. Le focus masqué concerne le critère 2.4.11 d’accessibilité. [Explication du W3C](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)

## Fiches, archives et réglages

| Priorité et situation | Ce que rencontre l’utilisateur | Ajustement proposé et vérification |
|---|---|---|
| **P2 · Ouverture d’un match au bord inférieur** | En 320 × 568, toucher une case de J06 située vers y = 535 px. Le titre de la fiche apparaît vers y = 612 px et sa fermeture vers y = 595 px. Les deux sont sous l’écran. La bordure de sélection est le seul retour immédiatement visible sur la case. | À l’ouverture, faire défiler juste assez pour montrer le titre du match et la fermeture. Conserver la position si ces deux éléments sont déjà visibles. La fiche des statistiques utilise déjà ce principe. |
| **P2 · Échec de « Mettre à jour »** | Lors d’un refus simulé du serveur à 320 × 568, le bouton reprend son aspect habituel, l’estimation disparaît et l’explication commence à y = 1 087 px. Une personne qui regarde le bouton peut croire que la collecte a réussi. Le bilan de 734 px ne dispose que de 171 px visibles dans le pied de page. | Réutiliser l’emplacement de l’estimation pour un retour court près du bouton. Conserver le bilan détaillé et ses chiffres en bas. Après l’échec, l’utilisateur doit voir la cause ou l’action de reprise sans déplacer la page. |
| **P2 · Feuille future et feuille manquante** | La case « — » d’une rencontre future et la case « ? » d’une feuille manquante reçoivent le même fond hachuré. Le symbole et l’opacité les distinguent, mais le motif le plus présent contredit la légende. C’est particulièrement visible sur ordinateur, où les journées futures dominent la grille. | Réserver les hachures aux feuilles absentes ou partielles. Comparer côte à côte un zéro, une feuille manquante, un match futur et une journée masquée, dans les deux thèmes. |
| **P2 · Accéder à la source d’une composition** | En 390 px, le résumé d’un joueur offre 44 px de hauteur tactile. Le lien « Source en ligne » dans son historique n’en offre que 17,4. Le passage de la composition à sa preuve est le geste le plus précis du parcours. | Agrandir la surface active du lien sur sa propre ligne en gardant sa typographie discrète. Mesurer au moins 44 px de hauteur tactile et vérifier que les zones voisines restent indépendantes. |
| **P2 · Corriger une couleur sur petit écran** | À 320 × 568, saisir le blanc comme couleur sombre. Le champ finit vers y = 435 px, le pied fixe commence à 486 px et l’explication de l’erreur à 679 px. Le champ a une bordure d’erreur, mais sa raison se lit après défilement. La modale dispose de 294 px intérieurs pour 308 px de contenu. | Placer l’explication au contact du champ invalide, conserver son association accessible et permettre aux éléments de la grille de rétrécir. Vérifier le cas invalide puis corrigé avec les logos ouverts, une largeur intérieure sans débordement et « Terminé » accessible. |

La cible tactile de 44 px est un engagement du projet. Le critère WCAG 2.5.8 de niveau AA prévoit 24 px et des exceptions, notamment d’espacement. La hauteur mesurée du lien établit ici un écart au langage de design. [Référentiel du projet](../design_language.md) · [Taille des cibles selon le W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

## Hiérarchie et première lecture

Sur téléphone, l’action orange la plus visible est « Mettre à jour ». Le contenu qui permet de décider quoi consulter commence plus bas. Pour une personne qui ouvre régulièrement l’application afin de lire les résultats, la première amélioration visuelle serait de donner davantage de présence à la journée active et de réduire le poids de la synchronisation au repos. Les deux actions d’archives peuvent rester directement accessibles comme le prévoit le langage de design.

| Fenêtre en px CSS | Journées entièrement visibles au départ | Équipes entièrement visibles au premier écran | Début des commandes de lecture depuis le haut |
|---|---:|---:|---:|
| 320 × 568 | 2 | 4 sur 10 | 911 px |
| 360 × 640 | 3 | 6 sur 10 | 911 px |
| 375 × 667 | 3 | 6 sur 10 | 911 px |
| 390 × 844 | 4 | 10 sur 10 | 911 px |
| 430 × 932 | 4 | 10 sur 10 | 889 px |
| 768 × 1 024, tablette portrait | 8 | 10 sur 10 | 746 px |
| 1 440 × 900, témoin ordinateur | 18 dans Edge | 10 sur 10 | 789 px |

Mesures à l’ouverture de la poule A, tri par classement, J06 active. Les cinq formats téléphone placent la première équipe à y = 342 px. À 320 px, la colonne Équipe occupe 136 des 280 px disponibles dans la matrice. Le rang, l’écusson et le nom restent identifiables, mais certains noms s’étendent sur trois lignes et les marques V/N/D/F mesurent 9 px. Pour gagner en lisibilité, essayer d’abord de récupérer de l’espace vertical entre les filtres, le titre et sa légende. Conserver la taille des écussons, les cibles de la grille et les noms complets. Comparer le nombre de lignes lisibles avec les valeurs ci-dessus avant de retenir une variante.

La modale possède déjà un titre explicite, « Apparence ». Retirer « VOTRE ESPACE DE LECTURE » et « Une base sobre. Un accent à votre image. » rapprocherait le premier choix de thème du haut de l’écran. La place gagnée serait mieux employée à expliquer une saisie invalide près du champ.

## Parcours vérifiés et points à préserver

| Parcours | Résultat |
|---|---|
| Matrice et navigation temporelle | Aucun débordement horizontal du document aux sept dimensions. La matrice défile indépendamment. Changement de poule et de tri, restauration après rechargement, flèches au centre, lecture et pause fonctionnent dans les parcours exercés. |
| Statistiques d’équipe | Le toucher d’un nom ouvre sa fiche. À 390 px, les statistiques défilent dans 316 px pour 633 px de contenu. Le tri des buts passe de décroissant à croissant. Le bouton trié garde le focus, puis la fermeture le rend à l’équipe. |
| Composition et antécédent | Une feuille réelle s’ouvre sous l’équipe. Déplier le joueur puis « Composition archivée » affiche la composition antérieure dans la même page. Le volet et ses statuts restent lisibles en thème sombre. |
| Apparence et logos | Thèmes clair, sombre et système, palette invalide, retour à la palette valide, fermeture, persistance et stockage indisponible exercés. Les parcours dédiés aux logos valident notamment l’aperçu, l’annulation, la confirmation, la propagation et le repli sur initiales. |
| Connexion hébergée simulée | À 320 × 568, les champs ont une hauteur de 48 px et un texte de 16 px. Le refus simulé est expliqué dans le formulaire. Une seconde soumission acceptée ouvre la matrice et affiche Déconnexion. |
| États de la saison et de la collecte | Chargement initial, erreur, réessai et premier affichage vide visibles. La collecte simulée affiche son estimation, désactive le double lancement, retire la progression à la fin et donne accès au détail des erreurs. Les deux défauts de transition et de retour d’échec sont décrits plus haut. |
| Accessibilité et mouvement | Les tests des contrastes de palette réussissent. Le zoom à 200 % est possible dans Edge. Le tri ne déclenche aucune animation avec la réduction des mouvements activée. Le piège de focus des réglages fonctionne pendant la navigation au clavier. |

**Fiabilité de la recette clavier.** Le script d’apparence du dépôt a échoué deux fois sur l’assertion qui vérifie le focus immédiatement après Échap, puis a réussi sans modification. Dans le parcours mobile isolé, le focus est revenu au déclencheur après Échap et après « Terminé ». Vérifier la stabilisation du focus à la fermeture avant de classer cet échec intermittent comme un défaut utilisateur. Le focus caché par la colonne Équipe est, lui, reproductible.

## Performances et portée

Trois ouvertures à cache froid dans Edge, en 390 × 844, avec un débit descendant simulé de 1,6 Mbit/s, une latence de 150 ms et un ralentissement CPU ×4, placent les premières lignes de la matrice dans le DOM entre **5,38 et 5,45 s**. Le rendu du plus grand élément visible (LCP) intervient entre **5,62 et 5,84 s**. La réponse de saison du serveur local pèse **467 499 octets**. Avant de proposer une optimisation, mesurer ce même parcours sur Pages avec la compression et le cache de production. Le délai observé suffit déjà à justifier de préserver le message de chargement.

L’audit utilise une copie SQLite isolée de la saison archivée, deux poules de dix équipes et dix-huit journées. Les mesures portent sur Edge 158 et WebKit 27.2 automatisés sous Windows. Le parcours hébergé utilise les composants de connexion du projet avec des réponses d’authentification locales simulées. Les scénarios d’erreur et de collecte utilisent également des réponses contrôlées. La compilation Pages, les vérifications de types et les **35 tests natifs** réussissent.

La validation sur appareils physiques reste ouverte pour Safari iOS et Chrome Android, notamment avec clavier virtuel, agrandissement du texte système, VoiceOver et TalkBack. Les essais de performance fournissent des mesures de laboratoire. La performance de production et le score Lighthouse restent à mesurer.

## Points d’entrée pour la correction

- Commandes de lecture, matrice, cibles et fiches — [styles de l’application](../assets/css/observatoire.css), [rendu et visibilité des journées](../src/view.js), [événements de navigation](../src/controller.js).
- Chargement, saison vide et retour d’actualisation — [états de la saison](../src/app.js), [états de synchronisation](../src/sync-panel.js).
- Saisie des couleurs et largeur de la modale — [formulaire d’apparence](../src/appearance/main.tsx), [styles d’apparence](../assets/css/appearance.css).
