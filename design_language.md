# Langage visuel — Observatoire D4

Référence initiale : interface de `observatoire-d4.html`, conservée pendant le sprint 1.

- Palette végétale : vert forêt, surfaces papier, nuances de vert pour les volumes ; thèmes clair et sombre selon le système.
- Hiérarchie : marque discrète et actions de synchronisation dans l’en-tête, saison et filtres compacts, matrice des équipes, lecture temporelle sous le tableau. Le détail reste contextuel dans la matrice.
- Typographie : pile locale de l’interface existante, chiffres tabulaires, repères de journée monospace. Aucun téléchargement de police.
- Espacement et couleurs centralisés dans les propriétés CSS. Rayon principal de 14 px, panneaux de 10 px, contrôles de 7 px.
- Responsive : matrice défilante horizontalement avec noms d’équipes fixes ; adaptation à 560 px ; cibles tactiles de 44 px.
- Accessibilité : libellés explicites, focus visible, annonces de changements, clavier, retour du focus après fermeture et réduction des animations.
- États : chargement annoncé, erreur avec nouvelle tentative, absence de données, feuille manquante, match futur et journée masquée distincts.
- Les données fictives restent identifiées comme démonstration. Les liens documentaires existants sont conservés.
- Les actions « Mettre à jour » et « Revérifier toutes les feuilles » restent directement accessibles dans l’en-tête. Le bilan des archives, la date de mise à jour et la couverture restent visibles dans le footer, hors des états masqués de la saison. La progression native et les erreurs dépliables s’affichent au même endroit. La mise à jour reste une action explicite.
- L’application utilise au minimum la hauteur de la fenêtre et s’élargit jusqu’à 1800 px. Sur ordinateur (fenêtre d’au moins 900 × 700 px), la matrice occupe la hauteur restante entre filtres, lecture et footer ; ses lignes grandissent avec l’espace disponible. Les noms d’équipes et l’en-tête du tableau restent fixes pendant le défilement. Sur petite fenêtre, le flux de page reste naturel.
- Conserver les cibles tactiles de 44 px dans des lignes de 48 px et le défilement nécessaire aux compositions longues. Le détail d’un match défile dans la matrice sur ordinateur ; l’ouverture des détails du footer rend à la page sa hauteur naturelle. Ne jamais masquer du contenu pour forcer son ajustement à l’écran.
- Les textes introductifs répétitifs sont retirés. Le mode démonstration reste identifié près de la saison et la méthode reste accessible dans un volet natif replié en pied de page.
- Les compositions historiques sont consultables dans le détail sans quitter l’application. « Archive locale », « À confirmer » et les statuts de participation exposent les limites des données.
- Zéro repérage connu, feuille absente/partielle et rencontre non jouée restent visuellement et sémantiquement distincts.
