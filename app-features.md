# Observatoire D4 — Fonctionnalités et fonctionnement de l’interface

Référentiel fonctionnel destiné au design UI/UX, établi le **11 novembre 2026**, actualisé au sprint 16. Il décrit l’implémentation présente dans le dépôt, dont la migration de présentation vers React/TypeScript et les composants shadcn, coss et ReUI adaptés localement. Il ne constitue pas une liste de fonctionnalités futures.

L’inventaire résulte d’une lecture croisée du HTML, des composants, des styles, des contrôleurs, des règles de calcul et de la documentation. La migration du sprint 16 fait aussi l’objet de parcours automatisés dans Edge sur données synthétiques et d’une inspection de captures. Le [langage visuel](design_language.md) reste la référence de conception ; [app-progress.md](app-progress.md) précise les validations et les limites de chaque livraison.

## Sommaire

1. [Finalité, vocabulaire et fiabilité](#1-finalité-vocabulaire-et-fiabilité)
2. [Versions et accès](#2-versions-et-accès)
3. [Organisation de l’écran principal](#3-organisation-de-lécran-principal)
4. [Saison, poules et tris](#4-saison-poules-et-tris)
5. [Matrice des équipes par journée](#5-matrice-des-équipes-par-journée)
6. [Détail d’un match et historique des joueurs](#6-détail-dun-match-et-historique-des-joueurs)
7. [Navigation temporelle et lecture automatique](#7-navigation-temporelle-et-lecture-automatique)
8. [Synchronisation et état des archives](#8-synchronisation-et-état-des-archives)
9. [Apparence et palette personnelle](#9-apparence-et-palette-personnelle)
10. [Logos des clubs](#10-logos-des-clubs)
11. [Persistance et partage entre onglets](#11-persistance-et-partage-entre-onglets)
12. [États transversaux et récupération](#12-états-transversaux-et-récupération)
13. [Responsive, accessibilité et identité visuelle](#13-responsive-accessibilité-et-identité-visuelle)
14. [Parcours utilisateur de référence](#14-parcours-utilisateur-de-référence)
15. [Limites de périmètre et fonctions techniques](#15-limites-de-périmètre-et-fonctions-techniques)
16. [Correspondance avec les sources](#16-correspondance-avec-les-sources)

## 1. Finalité, vocabulaire et fiabilité

L’application permet d’explorer les équipes de **District 4 du Lot**, journée par journée, pour repérer des noms de joueurs ayant déjà participé à un championnat supérieur avec le même club pendant la même saison. C’est un outil personnel non commercial de consultation et de vérification d’archives publiques.

L’utilisateur commence par une vue d’ensemble colorée, ouvre une rencontre, déplie les joueurs puis consulte leurs antécédents et les compositions justificatives. Il peut actualiser les archives et personnaliser son espace de lecture.

| Terme | Sens fonctionnel et conséquence pour l’UI |
| --- | --- |
| Saison | Année sportive allant de juillet à juin. « 2026–2027 » désigne juillet 2026 à juin 2027. |
| Poule | Groupe A ou B d’équipes de D4 ; une seule poule est affichée à la fois. |
| Journée | Colonne de calendrier repérée J01, J02, etc. Elle peut contenir des matchs joués à des dates différentes. |
| Feuille / composition | Liste publiée pour une équipe dans un match. Un match comporte deux compositions attendues. |
| Participation attestée | Titulaire, ou remplaçant dont une entrée ou sortie permet d’attester la participation. |
| Repérage connu | Nom normalisé présent dans une participation D4 attestée et dans au moins une participation attestée en championnat supérieur, à une date strictement antérieure, dans le même club et la même saison. |
| Archive | Données déjà acquises, consultables dans l’application sans rouvrir la page source. |
| Source en ligne | Page externe permettant de vérifier l’information publiée ; son ouverture exige Internet. |

### Règles qui déterminent ce que l’utilisateur voit

- Les championnats seniors masculins D4 et supérieurs alimentent l’analyse. Les niveaux supérieurs reconnus sont D3, D2, D1, R3, R2, R1, N3, N2, N1, L2 et L1, selon la couverture disponible dans la source.
- Les coupes, compétitions de jeunes et féminines sont exclues. Un jeune surclassé ayant effectivement joué dans le championnat senior concerné peut entrer dans le périmètre.
- Le club est rapproché par son URL source, pas par une ressemblance de nom d’équipe. Les réserves d’un même club sont pertinentes ; les homonymes d’autres clubs et les feuilles sans club identifié ne servent pas au rapprochement.
- La règle métier suppose l’absence de changement de club pendant la saison. Une rencontre du même jour ne constitue jamais un antécédent.
- Le nom est comparé exactement après normalisation de la casse, des espaces, de certaines apostrophes et des caractères Unicode. Il ne s’agit pas d’une recherche approximative ni d’une identification individuelle certifiée.
- Dans une case, un même nom repéré compte une fois, même s’il possède plusieurs antécédents. Le même nom peut compter à nouveau à une autre journée : les cumuls ne sont pas des nombres de personnes distinctes.
- Tous les joueurs publiés sont conservés dans le détail, y compris ceux sans antécédent et les remplaçants sans participation attestée. Ces derniers ne contribuent pas au nombre de repérages.
- Un nombre n’est établi que pour une composition complète d’un match terminé. Une composition absente, partielle ou non acquise garde un total inconnu.
- Un forfait ne produit aucune participation jouée retenue.

**Précaution éditoriale centrale :** les noms sont souvent abrégés. Un repérage est **à confirmer**, ne certifie pas une identité et ne démontre pas une irrégularité réglementaire. Un zéro signifie « aucun repérage dans les données acquises », sans garantir l’absence d’antécédents non couverts.

## 2. Versions et accès

### 2.1 Version locale disponible

L’utilisateur démarre le serveur du projet avec `npm start`, puis ouvre `http://127.0.0.1:3000` ou le port configuré. Aucun écran de connexion n’est présenté. Ouvrir directement le fichier HTML ne permet pas de charger les données.

Après une première collecte, l’interface, la saison et les compositions archivées restent consultables sans Internet si le serveur local fonctionne et que les fichiers du projet, ses dépendances et la base SQLite sont conservés. Une nouvelle collecte et les liens sources externes nécessitent Internet.

### 2.2 Démonstration avant disponibilité des données réelles

La démonstration sert de repli automatique lorsqu’une saison réelle ne peut pas encore être construite, notamment avant la première synchronisation. Il n’existe pas de bouton pour choisir manuellement « Démonstration » ou « Réel ».

- Un badge **Démonstration** apparaît sous la saison.
- Deux poules de huit équipes et quatorze journées illustrent le fonctionnement ; les six premières journées sont renseignées.
- Les calendriers, scores et historiques simulés sont identifiés dans les détails par **SIMULATION**.
- Un exemple particulier, Élan Marivalois 4 contre US Béduer-Faycelles en J06, porte un score 2–2 et propose un **EXEMPLE DOCUMENTÉ** côté Élan Marivalois, avec cinq noms et des liens justificatifs. Cet exemple ne transforme pas le reste de la démonstration en données réelles.
- Dans ces détails, les joueurs se déplient avec statut D4, badges de divisions supérieures, dates et contexte. Certains antécédents proposent **Composition ↗**. La rencontre d’exemple propose **Feuille du match FFF ↗**.
- Le détail précise l’absence de composition ou d’antécédent lorsqu’il n’y a rien à lister. La légende porte **Repérages**, contre **Repérages connus** en données réelles.

Une collecte réussie recharge la saison ; les données réelles remplacent alors automatiquement la démonstration si elles sont suffisantes.

### 2.3 Version hébergée préparée, non encore déployée

Le code prévoit une interface Cloudflare Pages et des archives / une authentification Supabase. **Au 11 novembre 2026, la publication distante et l’import restent à effectuer.** Les comportements ci-dessous sont implémentés et décrivent cette variante, sans affirmer qu’elle est accessible en production.

| Élément de l’écran de connexion | Fonctionnement |
| --- | --- |
| Présentation | Bloc centré, filet supérieur d’accent, mention « OBSERVATOIRE D4 · ACCÈS PRIVÉ ». |
| Titre | **Retrouver vos archives**. Texte : « Connectez-vous avec les identifiants de l’application. » |
| Adresse e-mail | Champ requis de type e-mail, libellé visible et autocomplétion d’identifiant. |
| Mot de passe | Champ requis masqué, autocomplétion du mot de passe courant. |
| Se connecter | Soumet les identifiants, se désactive pendant la requête et affiche « Connexion en cours… ». |
| Vérification d’une session mémorisée | « Vérification de la connexion… », puis accès automatique si la session et l’autorisation sont valides. |
| Retour d’erreur | Message annoncé sous le bouton : identifiants refusés, compte sans accès, archives indisponibles ou connexion impossible. Le formulaire reste disponible pour réessayer. |
| Déconnexion | Bouton ajouté à l’en-tête après connexion. Efface la session locale et recharge la page, même si la déconnexion distante échoue. |

L’écran principal reste masqué avant authentification. Un compte doit être autorisé pour cet observatoire ; un compte technique du tableau de bord Supabase ne suffit pas. La session est renouvelée automatiquement à l’approche de son expiration. Un renouvellement impossible ou une réponse d’API « non authentifié » efface la session et recharge l’accès.

Cette variante exige un accès réseau aux archives ; elle ne promet pas de consultation hors ligne. Les détails portent **ARCHIVE EN LIGNE**. La collecte avance tant qu’un onglet la pilote ; sa fermeture suspend les prochaines opérations et sa réouverture reprend le travail enregistré.

## 3. Organisation de l’écran principal

L’application utilise un écran principal unique. Les détails restent insérés dans la matrice et les paramètres s’ouvrent dans une modale. Il n’y a pas de barre latérale ni de changement de page interne pour consulter une rencontre.

| Ordre vertical | Contenu visible | Rôle |
| --- | --- | --- |
| 1. En-tête | Pictogramme de signal dans un carré d’accent, marque **Observatoire D4** ; case de revérification ; bouton de mise à jour ; bascule de thème ; paramètres ; déconnexion dans la variante hébergée. | Actions globales. |
| 2. Contexte et filtres | **DISTRICT 4 DU LOT / SAISON 2026–2027**, éventuel badge Démonstration, choix de poule et tri. | Identifier le jeu de données et organiser les équipes. |
| 3. En-tête de matrice | **Équipes par journée**, nombre d’équipes de la poule, échelle des repérages. | Donner les clés de lecture. |
| 4. Tableau | Équipes en lignes, journées en colonnes, cases interactives, détail éventuel sous une équipe. | Explorer et vérifier les données. |
| 5. Légendes | Signification de `?`, `—`, `·` et V/N/D/F. | Éviter les confusions entre volume, disponibilité et résultat. |
| 6. Lecture temporelle | Lecture/Pause, précédent/suivant, journée/date courantes, frise avec curseur. | Révéler les journées dans le temps. |
| 7. Pied de page | État des archives, dernière mise à jour complète, progression, couverture, erreurs et **Méthode et limites**. | Rendre la fraîcheur et la fiabilité consultables en permanence. |

Le titre principal visible est **Les équipes, au fil des journées**. La marque propose un lien vers le contenu de consultation et le sous-titre discret **LE FOOTBALL, FEUILLE APRÈS FEUILLE**. L’état de chargement ou d’échec de la saison occupe le contenu principal ; les actions d’en-tête et le bilan du footer restent indépendants de ce contenu.

## 4. Saison, poules et tris

### 4.1 Saison et calendrier

La saison réelle suit l’année sportive courante, déterminée automatiquement. Son libellé est informatif : **aucun sélecteur de saison n’est présent dans l’interface**. Le nombre de colonnes suit le calendrier acquis ; il n’est pas fixé à quatorze comme dans la démonstration. Le jeu réel documenté comporte deux poules de dix équipes et dix-huit journées.

Chaque en-tête de journée affiche J01, J02, etc., puis une date française courte. La lecture affiche une date longue, sans année. En l’absence de date, le texte est **Date à confirmer**. Si plusieurs matchs d’une journée ont des dates différentes, l’en-tête utilise la première date connue ; le détail du match affiche sa propre date.

Sans préférence mémorisée, la consultation commence en **Poule A**, tri **Classement**, à la dernière journée comportant un match terminé dans la saison acquise, sans détail ouvert et lecture en pause. Si aucun match n’est encore terminé, le curseur se place en J01.

### 4.2 Sélecteur « Poule »

Deux options : **Poule A** et **Poule B**. Par défaut, l’application ouvre A, sauf contexte mémorisé valide.

Un changement de poule arrête la lecture, ferme le détail, conserve le mode de tri, revient à la dernière journée comportant un match terminé dans la saison acquise et met à jour le tableau, le nombre d’équipes et sa hauteur. Le retour à cette journée n’est pas calculé séparément pour chaque poule. La nouvelle colonne est ramenée dans la zone visible et un message accessible annonce la poule et son nombre d’équipes.

### 4.3 Sélecteur « Trier les équipes »

| Option | Ordre appliqué | Points d’attention |
| --- | --- | --- |
| **Classement** | Ordre des équipes fourni à l’application depuis le classement acquis ; option initiale. | Les rangs restent ceux de cet ordre, y compris après un autre tri. Ce n’est pas un classement recalculé au fil du curseur. |
| **Nom (A–Z)** | Ordre alphabétique français sur les noms affichés. | Le nom complet, y compris la réserve, reste visible. |
| **Apparitions cumulées** | Somme décroissante des nombres connus de chaque équipe sur toutes les journées acquises. | Les valeurs inconnues n’ajoutent rien. Le tri ignore la position du curseur et ne signifie ni total de joueurs uniques ni classement sportif. |

Changer le tri arrête la lecture mais conserve la journée et le match sélectionné. Le détail est reconstruit : les sections de joueurs et de preuves précédemment dépliées se referment. Le réordonnancement est immédiat, sans animation de translation. Aucun total de ligne supplémentaire n’est affiché : ce cumul sert au tri.

## 5. Matrice des équipes par journée

### 5.1 Anatomie

La première colonne, **Équipe**, rassemble le rang, un logo ou des initiales, puis le nom de l’équipe. Elle reste fixe lors du défilement horizontal. Les écussons mesurent 28 × 28 px, gardent leurs proportions et réservent leur place même sur mobile.

Chaque colonne de journée possède un bouton d’en-tête. Le sélectionner déplace le curseur temporel ; il n’ouvre pas directement une rencontre. La journée courante est soulignée par une surface d’accent dans l’en-tête et dans sa colonne. Le tableau défile automatiquement juste assez pour garder la journée demandée visible à côté des noms fixes.

Une case représente **l’équipe de la ligne dans son match de cette journée**. Les deux équipes d’une même rencontre peuvent donc afficher des comptes et des compositions différents.

### 5.2 Valeurs, couleurs et disponibilité des cases

L’échelle compte six teintes : **0, 1, 2, 3, 4, 5+**. Zéro utilise une surface neutre ; les volumes positifs des nuances croissantes d’accent. Une valeur supérieure à cinq garde son nombre exact dans la case et partage la teinte « 5+ ».

| Affichage | Signification | Interaction et information complémentaire |
| --- | --- | --- |
| **0** | Composition complète ; aucun nom repéré dans les archives acquises. | Case ouvrable ; la composition peut contenir des joueurs sans antécédent. |
| **1, 2, 3…** | Nombre de noms repérés parmi les participations attestées de l’équipe. | Case ouvrable ; détail pour vérifier les noms et preuves. |
| **?**, fond hachuré | Composition partielle, absente ou pas encore archivée pour une rencontre terminée révélée. | Case ouvrable ; le libellé et le détail précisent la cause. Un score peut être connu. |
| **—**, surface neutre | Match à venir, reporté, non joué ou rencontre non indexée. | Case désactivée. Le libellé reprend l’état connu ou « Rencontre non indexée ». |
| **—** pour un forfait révélé | Rencontre non jouée, sans participation comptabilisée. | **Exception : case ouvrable** pour lire l’explication du forfait. |
| **·** | Match terminé ou forfait situé après le curseur de lecture. | Case désactivée ; volume et résultat restent masqués jusqu’à cette journée. |

Le test « match non joué / non indexé » est prioritaire sur le masquage par le curseur : une rencontre future reste `—`, même à droite du curseur. `·` signifie un masquage temporel de données déjà connues, pas une absence de données.

Sous le tableau, les légendes visibles sont **? Feuille absente ou incomplète**, **— À venir / non joué**, **· Après le curseur**, puis la légende des résultats. La distinction plus fine entre feuille partielle, absente et non acquise se lit dans le libellé de case et dans le détail.

### 5.3 Résultat sportif indépendant du repérage

Un petit repère en bas à droite de la case indique le résultat du point de vue de l’équipe de la ligne :

| Code | Texte explicite |
| --- | --- |
| **V** | Victoire, ou **Victoire par forfait** pour l’adversaire identifié d’une équipe forfait. |
| **N** | Match nul. |
| **D** | Défaite. |
| **F** | Forfait de cette équipe. |

Le résultat est dérivé du score et des équipes, ou d’un forfait dont l’équipe est identifiée. S’il n’est pas déterminable, aucun code n’est inventé. Il peut apparaître sur une case `?` lorsque le score est connu mais la composition indisponible. Il reste masqué après le curseur.

Le survol affiche un libellé complet avec équipe, journée, nombre ou état de composition et résultat éventuel. Le même contenu sert de nom accessible au bouton ; l’UI ne repose donc pas seulement sur la couleur ou le petit code.

### 5.4 Sélection

Un clic ou une activation clavier sur une case disponible arrête la lecture et insère le détail **juste sous l’équipe concernée**, sur toute la largeur des colonnes. La case sélectionnée possède un contour intérieur et un état déplié accessible.

Un seul détail de match est ouvert à la fois. Choisir une autre case le remplace ; réactiver la même case le ferme. La croix **Fermer le détail** et la touche **Échap** ferment également le panneau et rendent le focus à la case d’origine. Une ouverture au clavier place le focus sur le bouton de fermeture. Reculer le curseur avant le match ouvert ferme son détail.

## 6. Détail d’un match et historique des joueurs

### 6.1 En-tête et état de la composition réelle

L’en-tête présente la date du match et **ARCHIVE LOCALE** ou **ARCHIVE EN LIGNE**, puis les noms domicile/extérieur et le score connu. Le texte explicatif dépend de l’état :

| État | Message ou contenu |
| --- | --- |
| Composition publiée / complète | « X repérage(s) à confirmer parmi les participations attestées. » |
| Composition partielle | **Composition partielle : le total reste inconnu.** |
| Composition absente à la source | **Composition non publiée par la source.** |
| Feuille non acquise | **Feuille non encore archivée.** |
| Forfait | Statut de forfait, suivi de **Aucune participation jouée retenue.** |
| Dernière collecte moins complète | Note additionnelle : **La dernière lecture était incomplète. La composition précédente est conservée.** |

Une note rappelle systématiquement les noms abrégés, l’absence de certification d’identité et les antécédents que des feuilles manquantes peuvent masquer. Le lien **Feuille source en ligne ↗** reste disponible, même lorsqu’aucun joueur ne peut être affiché. Aucun formulaire de modification de composition n’est proposé.

### 6.2 Liste de tous les joueurs publiés

Chaque joueur occupe un item d’accordéon shadcn/Radix, fermé initialement. Son déclencheur contient son nom, un chevron d’ouverture et l’un de ces statuts :

- **Titulaire** ;
- **Entrée en jeu attestée** ;
- **Remplaçant · participation non attestée**.

Un joueur attesté possédant des antécédents reçoit aussi le badge **À confirmer**. Les remplaçants non attestés peuvent avoir un historique visible, mais ne reçoivent pas ce badge de repérage et ne sont pas comptés dans le total.

En dépliant un joueur, l’utilisateur trouve les minutes d’entrée et/ou de sortie si elles existent, puis les antécédents. Sinon, le texte est **Aucune correspondance antérieure dans les feuilles archivées.** Plusieurs joueurs peuvent rester dépliés simultanément ; il n’y a pas d’accordéon exclusif.

### 6.3 Antécédents et preuve archivée

Chaque antécédent expose sa date, sa division, le nom de l’équipe et un repère **Même club**, puis deux accès distincts :

1. **Composition archivée** : un volet imbriqué charge la preuve à la demande, sans quitter l’application.
2. **Source en ligne ↗** : ouvre la page externe dans un nouvel onglet.

Au premier dépliage de la preuve, **Lecture de l’archive…** est annoncé. Une fois reçue, l’archive liste les compositions présentes dans la réponse : nom d’équipe, état publié/partiel/manquant, puis noms et statuts de participation des joueurs. La preuve peut donc présenter les deux côtés du match historique, pas seulement le nom recherché. Elle défile dans une zone de hauteur maximale de 260 px.

En cas d’échec : **Lecture impossible. Fermez puis rouvrez ce détail pour réessayer.** Le volet n’ajoute pas de bouton distinct de relance. Une archive déjà chargée est réutilisée tant que ce détail reste monté ; rouvrir le match ou reconstruire le tableau recrée ses sections.

Le détail principal ne change pas de page. Sa largeur suit la fenêtre visible de la matrice et reste alignée à gauche pendant le défilement horizontal. Sur grand écran, les longues compositions se consultent par défilement dans la matrice.

## 7. Navigation temporelle et lecture automatique

La zone **Lecture de la saison** se situe sous la matrice. Le curseur est une limite de révélation des journées, pas un filtre supprimant les colonnes et pas un recalcul historique du classement.

| Contrôle | Comportement |
| --- | --- |
| **Lecture** avec ▶ | Lance une progression d’une journée toutes les **780 ms** et devient **Pause** avec Ⅱ. L’état pressé est exposé aux aides techniques. |
| **Pause** | Arrête le minuteur et conserve la journée atteinte. |
| **‹ Journée précédente** | Arrête la lecture, recule d’une journée et annonce journée/date ; désactivé en J01. |
| **› Journée suivante** | Arrête la lecture, avance d’une journée et annonce journée/date ; désactivé à la dernière colonne du calendrier. |
| Frise / curseur | Saisie directe d’une journée par pointage, glissement ou touches natives d’un curseur. Arrête la lecture et actualise immédiatement la matrice. |
| Bouton d’en-tête Jxx | Même déplacement direct, avec annonce accessible et arrêt de la lecture. |

La zone affiche **Journée N · date longue**. La frise comporte un segment par journée, différenciant journée courante, journées atteintes, journées connues non encore atteintes et journées ultérieures. Trois repères affichent la première journée, celle du milieu et la dernière ; ils suivent la longueur réelle du calendrier. Le curseur Radix possède une poignée circulaire visible, un focus explicite et une zone de manipulation agrandie sur écran tactile. Les flèches précédent/suivant disposent d’infobulles au survol et au focus lorsqu’elles sont actives.

La lecture s’arrête à la dernière journée comportant un match terminé dans la saison acquise, même si le calendrier possède des journées futures. Elle annonce **Lecture terminée à la journée N**. Si elle démarre alors que le curseur est déjà à cette limite ou au-delà, elle repart de J01. Le bouton est désactivé lorsqu’il n’existe pas au moins deux journées jusqu’à cette limite.

Les flèches et la frise permettent de parcourir tout le calendrier, y compris les journées non jouées ; leurs cases restent `—`. La lecture s’interrompt aussi au changement de poule, de tri, à l’ouverture d’un match ou lorsque l’onglet devient invisible. Aucun raccourci global « espace pour lire » n’est implémenté.

## 8. Synchronisation et état des archives

### 8.1 Déclenchement explicite dans l’en-tête

**Mettre à jour** lance la collecte des calendriers et des compositions disponibles. L’application consulte automatiquement l’état de la collecte, mais ne lance pas une nouvelle collecte locale simplement parce qu’on ouvre la page.

La case **Revérifier toutes les feuilles**, décochée initialement, contourne la fraîcheur du cache lors du prochain lancement. Elle ne supprime pas les archives et ne garantit pas que la source publiera des données supplémentaires. Les validateurs HTTP peuvent toujours éviter un téléchargement identique. Son choix n’est pas mémorisé après rechargement.

Pendant le démarrage, le footer affiche **Démarrage de la mise à jour…** et les deux contrôles sont désactivés. Pendant la collecte, le bouton devient **Mise à jour en cours…** ; la revérification reste désactivée. Un clic reçu pendant une lecture du statut est mis en attente puis exécuté, sans perte de la demande. Un lancement concurrent rejoint l’état de l’opération existante au lieu de démarrer un second travail sur la même saison.

### 8.2 Progression et résultat

Les phases principales sont **Lecture des calendriers** puis **Archivage des compositions**. Une barre de progression native s’affiche : indéterminée tant que le total n’est pas connu, puis déterminée avec une valeur accessible « X sur Y ». Le compteur est propre à la phase ; son retour à zéro au changement de phase n’est pas une perte d’archives.

Le résultat peut être :

- **Archives à jour** ;
- **Mise à jour partielle ; erreurs à reprendre** ;
- **Mise à jour interrompue ; archives conservées** ;
- en local, après détection d’un travail abandonné : **Synchronisation interrompue ; reprise possible**.

La transition d’une collecte en cours vers un état terminé recharge la saison. Poule, tri, journée et sélection valides sont restaurés ; la lecture reste en pause. La date **MAJ** correspond à la dernière mise à jour intégralement réussie, et n’est pas avancée par une opération partielle ou interrompue. Si aucune n’existe : **Aucune mise à jour complète**.

En hébergement, la phase en cours est complétée par **Gardez cet onglet ouvert ; reprise à sa réouverture**. Une collecte déjà enregistrée peut reprendre automatiquement à l’ouverture de l’onglet. En local, le serveur conduit le travail : fermer l’onglet n’arrête pas à lui seul un serveur resté actif.

### 8.3 Bilan permanent du footer

Le bilan est présent au repos comme pendant la collecte, y compris si la saison ne se charge pas. Les compteurs sont globaux à la saison acquise ; changer de poule, de tri ou de curseur ne les filtre pas.

| Libellé compact | Interprétation |
| --- | --- |
| Phase + **MAJ date/heure** | État courant et dernière réussite complète ; le format de date/heure est français. Pendant le travail, la phase et l’éventuelle consigne hébergée remplacent ce résumé de date. |
| **Calendrier X/Y** | Rencontres D4 découvertes par rapport à celles attendues ; le dénominateur est omis s’il est inconnu. Inclut le calendrier, pas seulement les rencontres jouées. |
| **D4 X/Y** | Compositions complètes / attendues des matchs D4 terminés. |
| **Tous niveaux X/Y** | Compositions complètes / attendues des matchs terminés dans tout le périmètre collecté. |
| **N partielles** | Compositions acquises mais incomplètes. |
| **N absentes** | Compositions absentes de la source lors de la lecture. |
| **N à récupérer** | Compositions attendues pas encore acquises. |
| **N noms** | Entrées de joueurs publiées sur les feuilles ; ce ne sont pas des personnes distinctes. |
| **N archives conservées** | Mention conditionnelle lorsque des compositions antérieures plus complètes ont été conservées. |

Une infobulle explicite les unités de calendrier, compositions et noms. La couverture mesure ce que la source suivie permet d’acquérir, pas l’exhaustivité de tous les championnats français.

Avant les premières archives, le footer invite à lancer une mise à jour. En local, il précise de se connecter à Internet et que les archives seront ensuite consultables hors ligne ; en hébergement, il invite simplement à archiver les compositions.

### 8.4 Erreurs et reprise

**Voir les erreurs de collecte** apparaît uniquement si des erreurs existent, avec une icône d’avertissement et un badge de nombre d’erreurs. Ce volet natif dépliable liste les URL concernées et les messages. La liste défile au-delà de 180 px. Son ouverture laisse la page reprendre une hauteur naturelle.

| Incident | Retour utilisateur et action possible |
| --- | --- |
| Impossible de démarrer | **Impossible de démarrer la mise à jour. Les données affichées sont conservées.** Contrôles réactivés ; nouvel essai possible. |
| Serveur local injoignable | Invitation à relancer le serveur ; bouton **Réessayer la mise à jour**. Les derniers chiffres affichés restent visibles. |
| Accès hébergé interrompu | Message annonçant la nouvelle tentative automatique et la conservation des archives ; bouton de relance disponible. |
| Erreur d’une page source | Détail dans les erreurs ; les données déjà acquises restent conservées. Une mise à jour ultérieure reprend avec le cache et les archives. |
| Nouvelle lecture moins complète | L’ancienne composition plus complète reste utilisée ; mention dans le bilan et dans le match. |

L’état est relu environ toutes les 2 secondes pendant le travail, 30 secondes au repos et 10 secondes après une panne, avec des délais de requête supplémentaires éventuels. En hébergement, ce suivi pilote aussi des étapes courtes de collecte. Il n’y a pas de bouton d’annulation ou de barre de progression du téléchargement d’un fichier individuel.

### 8.5 Méthode et limites

Un volet **Méthode et limites**, replié au repos et distinct des erreurs, rappelle : participation D4 attestée, feuille antérieure de championnat supérieur du même club, même saison, identités à confirmer et totaux limités aux feuilles archivées. Son ouverture agrandit naturellement la page ; elle ne masque aucun compteur.

## 9. Apparence et palette personnelle

### 9.1 Bascule rapide de thème

Un bouton soleil/lune de l’en-tête bascule immédiatement entre clair et sombre. Son infobulle et son nom accessible indiquent l’action possible : **Activer le mode clair** ou **Activer le mode sombre**. L’icône reflète le thème actuellement résolu.

Cette bascule choisit un mode explicite : elle quitte donc le suivi automatique du système. Pour le rétablir, choisir **Système** dans les paramètres.

### 9.2 Modale « Apparence »

Le bouton **Paramètres**, dont le nom accessible est **Paramètres d’apparence**, ouvre une modale au-dessus d’un fond assombri. Elle présente :

1. Le surtitre **VOTRE ESPACE DE LECTURE**, le titre **Apparence**, puis « Une base sobre. Un accent à votre image. »
2. **Mode d’affichage** : choix exclusifs **Clair**, **Sombre**, **Système**, accompagnés de leurs icônes. Système est le défaut et suit les changements de l’appareil.
3. **Palette personnelle**, avec l’explication « Trois couleurs, toutes les nuances. Les textes s’ajustent pour rester lisibles. »
4. Trois lignes de couleur, chacune avec description, sélecteur natif et saisie hexadécimale.
5. Une erreur de palette si nécessaire, un aperçu **Repérages** de 0 à 5+, puis un message de sauvegarde.
6. La section repliable **Logos des clubs**, détaillée ci-dessous.
7. Un pied de modale restant accessible avec **Réinitialiser** et **Terminé**, plus une croix **Fermer les paramètres** en haut.

| Couleur | Valeur initiale | Description affichée |
| --- | --- | --- |
| **Couleur sombre** | `#18181B` | Fonds sombres et textes du mode clair. |
| **Couleur claire** | `#FAFAFA` | Fonds clairs et textes du mode sombre. |
| **Couleur d’accent** | `#F97316` | Actions, sélections et nuances de la matrice. |

### 9.3 Application, validation et fermeture

Les modifications valides de thème et de palette s’appliquent **immédiatement** à la page et à la modale et sont sauvegardées sans bouton « Enregistrer ». **Terminé** ferme les paramètres ; ce n’est pas une étape de confirmation de la palette. Fermer la modale n’annule pas les couleurs déjà appliquées.

La saisie accepte six chiffres hexadécimaux avec ou sans `#`, puis normalise la valeur. La base sombre doit être plus foncée que la claire, avec un contraste minimal de **7:1**. Si un champ est incomplet ou invalide, ou si les bases sont trop proches, un message explique le problème et précise : **La dernière palette valide reste appliquée.** La saisie en cours reste visible pour correction ; les champs concernés sont marqués invalides.

Les fonds, textes, bordures, focus, liens et six niveaux de matrice sont dérivés automatiquement. L’accent choisi est conservé pour les remplissages ; sa variante de texte et les couleurs de texte sont ajustées pour la lisibilité. L’aperçu reflète la palette valide appliquée.

Le retour indique initialement **Les modifications sont appliquées immédiatement.**, puis une sauvegarde réussie ou **Appliqué pour cette session. Le stockage du navigateur est indisponible.** Un changement reçu d’un autre onglet est signalé.

**Réinitialiser** restaure les trois couleurs initiales et le mode Système, avec application et sauvegarde immédiates. Il ne touche ni aux logos, ni à la navigation, ni aux archives.

La modale se ferme par **Terminé**, la croix, **Échap** ou l’interaction extérieure gérée par le dialogue. Le focus reste contenu dans la modale pendant son ouverture, puis revient au déclencheur à la fermeture. La page derrière ne défile pas ; la modale peut défiler intérieurement.

## 10. Logos des clubs

### 10.1 Identité dans la matrice

Les vingt clubs du catalogue disposent d’un JPEG FFF intégré localement. Aucune requête au CDN FFF n’est nécessaire pendant la consultation. Les réserves partagent le logo du club ; quelques variantes historiques de noms de démonstration sont également reconnues.

Les images utilisent leurs proportions d’origine, sans fond CSS ajouté. Les initiales sont masquées sous une image disponible, y compris transparente, et réapparaissent si l’image échoue ou si le club n’a pas de correspondance. Le logo ne sert pas de lien vers une fiche club.

### 10.2 Éditeur dans les paramètres

Le volet **Logos des clubs** est replié initialement. Il contient l’aide de format/stockage, le sélecteur **Club à personnaliser**, un aperçu sur une surface du thème, le champ fichier **Importer une image**, puis les actions de restauration, d’enregistrement et d’annulation conditionnelle.

Le sélecteur liste les clubs du catalogue, en retirant le suffixe numérique de réserve dans ses options. Il ne se limite pas à la poule actuellement affichée et ne permet pas d’ajouter un nouveau club. Au montage, le premier club du catalogue est sélectionné.

### 10.3 Import avec validation explicite

1. Choisir le club, puis un fichier **PNG, JPEG ou WebP**, non vide, de **2 Mo maximum**, avec chaque dimension limitée à **4096 px**. SVG n’est pas accepté.
2. Pendant le traitement : **Préparation de l’image…**, zone occupée, choix du club, import et actions désactivés.
3. L’image est réencodée en PNG et réduite à **256 px maximum sur le plus grand côté**, sans agrandir une petite image ni déformer ses proportions. La transparence est conservée.
4. Seul l’aperçu change. Le message invite à enregistrer pour appliquer le logo dans toute l’application. Le tableau et les autres onglets gardent le logo enregistré.
5. **Enregistrer le logo** confirme la sauvegarde locale et applique le logo à toutes les occurrences reconnues du club, y compris ses réserves et les autres onglets de la même adresse. Un message confirme l’enregistrement et le bouton est de nouveau désactivé faute de changement en attente.

L’aperçu mesure 48 px dans un cadre de 56 px ; la matrice conserve ses écussons de 28 px. Aucun fichier n’est transmis au serveur.

### 10.4 Annulation et restauration

- **Annuler le changement** apparaît uniquement lorsqu’un brouillon existe. Il revient au logo enregistré et confirme l’annulation.
- Changer de club ou fermer la modale abandonne le brouillon sans confirmation supplémentaire. Replier seulement la section « Logos des clubs » ne ferme pas la modale et n’enregistre rien.
- **Restaurer le logo d’origine** est disponible lorsqu’un logo personnalisé est enregistré. Il prépare l’original en aperçu ; il faut encore **Enregistrer le logo** pour confirmer sa restauration.
- Sans modification préparée, **Enregistrer le logo** est désactivé. Sans logo personnalisé enregistré, la restauration est désactivée.
- **Terminé** ferme la modale : il n’enregistre pas un brouillon de logo. Cette règle diffère volontairement de la palette à application immédiate.

### 10.5 Erreurs et stockage

Une erreur est annoncée pour un format refusé, un fichier vide ou trop lourd, une image illisible ou trop grande, un traitement indisponible ou une image encodée trop complexe. Le logo déjà enregistré est conservé.

Si la sauvegarde échoue parce que le stockage est bloqué ou plein, le logo enregistré reste inchangé et le brouillon reste disponible pour réessayer ou annuler. Le volume cumulé réservé aux logos est borné ; si ce plafond est atteint, le message propose de restaurer un autre logo avant l’import.

Les logos sont propres au navigateur et à l’adresse de l’application, indépendants de la saison et de la palette. Ils ne sont pas partagés entre utilisateurs ou appareils. Effacer les données du navigateur les efface ; la réinitialisation de la palette les préserve.

### 10.6 Options du catalogue actuel

U.S. Dégagnacoise ; Entente Bouriane F.C. ; Puy-l’Évêque Prayssac F.C. ; F.C. Lalbenque-Fontanes ; A.S. St Matré-le-Boulvé ; Cahors F.C. ; Ent. ECCF Causse Sud ; La Fortunière Labastide-Murat ; Football Formation Mauroux ; Entente Mayrinhac Saint-Céré ; Élan Marivalois ; U.S. Labathude ; U.S. Béduer-Faycelles ; C.L. Cuzance Football ; Haut Célé F.C. ; U.S. Puybrun Tauriac ; Entente Cazillac-Sarrazac ; Causse Limargue F.C. ; Val Roc Foot ; F.C. du Haut Quercy.

Le catalogue devra être revu si les clubs changent lors d’une nouvelle saison ; l’utilisateur ne dispose pas d’une administration de ces correspondances.

## 11. Persistance et partage entre onglets

| Donnée | Ce qui est conservé | Portée et restauration |
| --- | --- | --- |
| Navigation | Poule, tri, journée et match ouvert. | Sauvegarde locale immédiate, distincte par saison et entre démonstration/réel. Restaurée au rechargement et après collecte. |
| Identité du match ouvert | Nom de l’équipe et journée. | Retrouvée même si les équipes sont réordonnées ; abandonnée si équipe disparue, match indisponible ou après le curseur. La journée est bornée au calendrier courant. |
| Lecture | Aucun minuteur sauvegardé. | Toujours en pause au chargement. |
| Thème et palette | Derniers choix valides. | Toutes saisons ; restaurés avant les styles pour éviter un éclair de mauvais thème ; synchronisés entre onglets de même origine. |
| Logos | Logos explicitement enregistrés. | Toutes saisons ; synchronisés entre onglets de même origine. Aucun brouillon propagé. |
| Session hébergée | Session d’authentification, si le stockage le permet. | Restauration puis vérification d’accès ; renouvellement automatique. Stockage bloqué : session maintenue dans l’onglet. |
| Archives locales | Calendriers, compositions, données publiées et cache source. | Base SQLite du projet, indépendante des préférences du navigateur. |
| Archives hébergées | Données distantes de l’observatoire. | Indépendantes de la base locale après import ; pas de synchronisation bidirectionnelle entre ces stockages. |

Les préférences du navigateur dépendent de l’origine : changer de navigateur, d’hôte ou de port peut donner un contexte différent. La navigation n’est pas synchronisée en direct entre onglets, contrairement à l’apparence et aux logos.

Ne sont pas mémorisés : sections de joueurs ou preuves dépliées, position exacte du défilement, ouverture des erreurs ou de la méthode, case de revérification et brouillon de logo. Les données de stockage invalides sont ignorées ; l’indisponibilité du stockage des préférences ne bloque pas la consultation. Seules l’apparence et les logos exposent un retour spécifique de sauvegarde dans leurs contrôles ; la navigation dégradée reste silencieuse.

## 12. États transversaux et récupération

| Situation | Présentation / reprise |
| --- | --- |
| Chargement initial de saison | **Chargement de la saison…**, indicateur de chargement et squelette du tableau ; zone principale marquée occupée, tableau masqué jusqu’à réception et validation. |
| Saison invalide ou requête en échec | Alerte avec icône, titre **Impossible de lire la saison**, explication **La saison est indisponible…** adaptée au serveur local ou à la connexion hébergée, et bouton **Réessayer**. Le contenu de saison est masqué ; en-tête et footer restent accessibles après authentification. |
| HTML ouvert directement | L’ouverture directe ne constitue pas un mode pris en charge : les modules nécessitent HTTP et le serveur lancé avec `npm start`. |
| Aucune équipe dans les deux poules | État vide illustré par une icône de base, **Aucune équipe disponible pour cette saison.** et invitation à utiliser « Mettre à jour ». Aucun tableau initialisé. |
| JavaScript désactivé | Message de repli **Activez JavaScript pour explorer la saison.** Les interactions et données ne fonctionnent pas. |
| Date inconnue | **Date à confirmer** dans les repères concernés. |
| Résultat inconnu | Aucun marqueur sportif déduit ; le score peut rester `—` dans le détail. |
| Joueur sans antécédent | Texte explicite dans sa section, sans faux historique. |
| Composition sans joueur exploitable | Explication d’état et lien source, sans liste inventée. |
| Preuve archivée indisponible | Message de relance par fermeture/réouverture du volet. |
| Logo indisponible dans le tableau | Initiales, sans déplacement du nom ni disparition de l’espace réservé. |
| Préférences corrompues | Valeurs valides restaurées ou valeurs par défaut ; consultation préservée. |
| Panne pendant collecte | Archives acquises conservées ; état et erreurs du footer, relance possible. |

Les états de la saison, de la collecte et d’une preuve historique sont indépendants : consulter une archive imbriquée ne déclenche pas une collecte ; une erreur de source n’efface pas les anciennes archives ; une erreur de saison n’empêche pas de consulter le bilan et de demander une mise à jour.

## 13. Responsive, accessibilité et identité visuelle

### 13.1 Mise en page selon l’écran

- **Cadre général :** largeur maximale 1800 px, hauteur minimale de fenêtre, marges compactes. Hiérarchie en-tête → filtres → matrice → lecture → footer.
- **Ordinateur d’au moins 900 × 700 px :** la matrice utilise la hauteur restante et répartit l’espace entre les équipes après un en-tête de 48 px, avec un minimum de 48 px par ligne. En-tête du tableau fixe en haut et noms fixes à gauche pendant le défilement. Les détails longs restent accessibles dans cette zone.
- **Ordinateur de faible hauteur :** un mode plus dense réduit les espacements avec pointeur fin ; la page ne coupe pas de contenu pour simuler un ajustement parfait.
- **Fenêtre plus petite :** hauteur naturelle de page et défilement conservé ; le nombre de journées ne réduit pas les cases jusqu’à les rendre illisibles.
- **À 560 px et moins :** marque et boutons d’apparence sur la première ligne, commandes d’archives sur la suivante ; filtres sur la largeur disponible ; libellé visuel « Paramètres » masqué mais icône et nom accessible conservés. Colonne d’équipe de 155 px, noms pouvant revenir à la ligne, écusson maintenu. Le détail, ses alertes et ses historiques s’empilent dans la largeur visible.
- **Pointage tactile :** cibles d’au moins 44 px pour les contrôles de consultation concernés, dans des lignes de tableau de 52 px. Les contrôles d’apparence mesurent au moins 44 px ; ceux de connexion 48 px.
- **Footer étroit :** compteurs sur une ligne défilante horizontalement, zone focalisable au clavier ; aucune suppression de compteur. Ouvrir la méthode ou les erreurs rend de la hauteur à la page.
- **Modale :** largeur maximale 520 px et marges de fenêtre, hauteur bornée par `dvh`, défilement interne, actions basses maintenues accessibles. À 380 px et moins, descriptions et champs couleur se répartissent sur plusieurs lignes. Champs hexadécimaux à 16 px pour éviter un zoom de saisie sur mobile.

### 13.2 Accessibilité et retours d’interaction

Le tableau possède une légende accessible, des en-têtes de lignes et de colonnes et des noms complets de boutons. Les contrôles ont des libellés explicites ; les logos de matrice sont décoratifs puisque le nom de l’équipe est adjacent, tandis que l’aperçu de logo est nommé.

Le parcours utilise Tabulation et les activations natives des boutons, sélecteurs, champs, radios et sections dépliables. Le curseur accepte ses touches natives. Le focus est visible, les contrôles indisponibles sont réellement désactivés et les états sélectionné/pressé/déplié sont exposés. Échap ferme le détail de match ou le dialogue selon le contexte et les mécanismes de focus décrits plus haut.

Les changements importants sont annoncés : chargement, erreur, journée demandée par les boutons, changement de poule, ouverture de match, fin de lecture, progression d’archive, traitement de logo et sauvegarde. Les erreurs de palette et de logo disposent de zones d’alerte ; la collecte utilise une progression native nommée.

Survols, contours de sélection, état de bouton pressé, baisse d’opacité des contrôles désactivés et messages textuels donnent un retour immédiat. Les mouvements réduits désactivent les animations de tri, d’apparition et les transitions décoratives. Les changements de thème s’appliquent sans transition de couleur.

### 13.3 Références visuelles à préserver

Palette neutre sombre/claire avec accent orange personnalisable ; zéro neutre et nuances d’accent pour les volumes. Polices locales `system-ui`, `-apple-system`, `Segoe UI`, sans téléchargement ; chiffres tabulaires et repères de journée monospace.

Rayons de référence : cadre principal 14 px, panneaux 10 px, contrôles 7 px ; dialogue 16 px. Les tokens centralisent surfaces, textes, traits, focus, sélection et niveaux de repérage. Les contrastes calculés visent 4,5:1 pour les textes dérivés et 3:1 pour le focus et les contours des nouveaux contrôles, avec bases sombre/claire à 7:1 minimum. Ces règles de calcul ne constituent pas à elles seules une certification WCAG globale.

Toute la couche de présentation utilise React/TypeScript et les composants shadcn locaux : boutons, champs, sélecteurs natifs habillés, table, badges, états vides, alertes, squelette, dialogue, accordéons, curseur et infobulles. La matrice s’appuie sur **Frame de coss**, les antécédents sur une adaptation statique de **Timeline de ReUI**. Les calculs et API existants restent partagés. Les icônes sont issues de Lucide. Le langage visuel est commun à la page et à la modale ; l’ouverture des paramètres reste indépendante du chargement des données.

## 14. Parcours utilisateur de référence

### A. Comprendre une rencontre et vérifier un nom

1. Ouvrir l’application, se connecter si l’accès hébergé est utilisé.
2. Vérifier la saison et l’éventuel badge Démonstration ; choisir la poule et le tri.
3. Déplacer le curseur si la rencontre est masquée ; repérer un nombre ou un `?` et le résultat sportif éventuel.
4. Activer la case : lire date, équipes, score, état de composition et limites du rapprochement.
5. Déplier un joueur ; distinguer participation attestée et simple présence comme remplaçant.
6. Lire ses antécédents **Même club**, ouvrir **Composition archivée**, puis éventuellement la source externe.
7. Fermer par la croix, Échap ou la case sélectionnée ; reprendre la consultation dans la matrice.

### B. Parcourir chronologiquement la saison

1. Choisir une journée par frise ou en-tête, puis lancer **Lecture**.
2. Observer la révélation progressive des comptes et résultats ; les matchs réellement non joués restent `—`.
3. Mettre en pause, utiliser précédent/suivant ou ouvrir une case pour examiner une journée.
4. À la dernière journée terminée, la lecture s’arrête ; le prochain lancement depuis cette limite repart de J01.

### C. Constituer ou actualiser les archives

1. Disposer d’Internet et du service nécessaire ; au premier usage local, la démonstration peut être affichée.
2. Cocher éventuellement **Revérifier toutes les feuilles**, puis **Mettre à jour**.
3. Suivre phases, progression et couverture dans le footer ; garder l’onglet ouvert dans la variante hébergée.
4. À la fin, retrouver le contexte valide dans la saison rechargée ; vérifier la date de réussite complète.
5. Si le résultat est partiel, déplier les erreurs et relancer plus tard. Les archives précédentes restent conservées.

### D. Personnaliser la lecture

1. Utiliser la bascule de thème pour un changement immédiat ou ouvrir **Paramètres**.
2. Choisir Clair/Sombre/Système, modifier les trois couleurs et vérifier l’aperçu.
3. Corriger toute erreur de contraste ; les changements valides sont déjà appliqués et sauvegardés.
4. Fermer par **Terminé** ; **Réinitialiser** permet de retrouver les valeurs par défaut.

### E. Remplacer un écusson

1. Ouvrir **Paramètres → Logos des clubs**, choisir le club et importer une image autorisée.
2. Contrôler l’aperçu sur le thème courant. À ce stade, la matrice garde le logo enregistré.
3. Cliquer **Enregistrer le logo** pour l’appliquer au club et à ses réserves ; ou annuler le changement.
4. Pour revenir à l’original : **Restaurer le logo d’origine**, contrôler l’aperçu, puis **Enregistrer le logo**.
5. Fermer sans enregistrer abandonne un brouillon ; les autres personnalisations déjà enregistrées restent présentes.

## 15. Limites de périmètre et fonctions techniques

### 15.1 Ce que l’interface actuelle ne propose pas

Pour ne pas dessiner des écrans supposés existants : pas de recherche libre de joueur ou de club, de fiche joueur autonome, de fiche club autonome, de filtre par division/statut/date/résultat, de comparaison côte à côte de poules, de tri de colonnes, de graphique statistique supplémentaire, d’export CSV/PDF, de partage de sélection par URL, de favoris, de notification ou de modification des données sportives.

Pas de sélecteur de saison ni de bascule manuelle démo/réel. Pas d’inscription, de mot de passe oublié, de profil ou d’administration des membres dans l’UI hébergée. Pas de validation utilisateur d’un rapprochement, de signalement de fraude ni de moteur de décision réglementaire. Pas d’import/restauration de base depuis l’interface et pas de déploiement depuis l’interface.

### 15.2 Fonctions disponibles hors interface

| Fonction | Accès et effet utile |
| --- | --- |
| Démarrage local | `npm start` compile puis sert l’application ; le serveur écoute uniquement en local. `PORT` permet de choisir un autre port. |
| Collecte terminal | `npm run sync`, option `--force` ou `--season=2026`. La saison demandée ne donne pas accès à des archives que la source ne publie plus. Même protection contre les collectes concurrentes que depuis l’UI. |
| Sauvegarde des archives | Après arrêt des synchronisations et du serveur, copie de `data/observatoire.sqlite`. Les archives ne sont pas sauvegardées par Git. |
| Préparation hébergée | Build Pages, migration de stockage et import initial d’archives documentés dans [docs/cloud-deployment.md](docs/cloud-deployment.md). L’import refuse l’écrasement d’une saison distante déjà utilisée ; les bases locale et distante deviennent indépendantes. |
| Collecteur Python historique | Outil indépendant, non nécessaire à l’utilisation de l’application Node.js et sans écran dédié. |

La collecte conserve un cache : calendriers frais 15 minutes, feuilles complètes 24 heures, incomplètes 1 heure ; au maximum une requête source par seconde, 3 Mo par réponse et 20 secondes de délai réseau. Les refus 403/429 et coupures peuvent interrompre le parcours. Ces limites expliquent l’attente et la reprise ; elles ne constituent pas des réglages utilisateur.

Les archives sont enregistrées transactionnellement, les compositions plus complètes préservées et les données reçues validées. Les ressources de l’interface sont locales, les liens sources externes s’ouvrent dans un nouvel onglet avec protections de navigation ; les fichiers serveur, bases et secrets ne font pas partie des ressources publiques.

## 16. Correspondance avec les sources

Cette carte permet de retrouver l’implémentation sans avoir à découvrir tout le dépôt.

| Périmètre décrit | Sources principales |
| --- | --- |
| Entrée HTML et rendu React | [observatoire-d4.html](observatoire-d4.html), [src/ui/main.tsx](src/ui/main.tsx) |
| Chargement, validation et modes | [src/ui/main.tsx](src/ui/main.tsx), [src/season.js](src/season.js), [server/demo.js](server/demo.js) |
| Poules, tris, curseur, lecture, sélection et focus | [src/ui/season-board.tsx](src/ui/season-board.tsx), [src/ui/use-navigation.ts](src/ui/use-navigation.ts), [src/ui/model.ts](src/ui/model.ts) |
| Détails réels, joueurs, preuves historiques | [src/ui/match-detail.tsx](src/ui/match-detail.tsx) |
| Règles de rapprochement, comptes, dates et classement acquis | [server/season-projection.js](server/season-projection.js), [server/source.js](server/source.js) |
| Mise à jour, couverture, progression et conservation | [src/ui/use-sync.ts](src/ui/use-sync.ts), [src/ui/archive-footer.tsx](src/ui/archive-footer.tsx), [server/synchronize.js](server/synchronize.js), [server/collection-store.js](server/collection-store.js) |
| Navigation mémorisée | [src/navigation.js](src/navigation.js) |
| Apparence, validation, modale et palette | [src/appearance/main.tsx](src/appearance/main.tsx), [src/appearance/theme.js](src/appearance/theme.js), [src/appearance/ui/dialog.tsx](src/appearance/ui/dialog.tsx) |
| Logos, catalogue, import et brouillons | [src/club-logos.js](src/club-logos.js), [src/custom-logos.js](src/custom-logos.js), [src/appearance/club-logo-settings.tsx](src/appearance/club-logo-settings.tsx) |
| Connexion et variante hébergée | [src/ui/login.tsx](src/ui/login.tsx), [src/session.js](src/session.js), [src/runtime.js](src/runtime.js), [cloud/api.ts](cloud/api.ts), [cloud/collector.ts](cloud/collector.ts) |
| Mise en page, responsive, thèmes et états visuels | [assets/css/interface.css](assets/css/interface.css), [assets/css/observatoire.css](assets/css/observatoire.css), [assets/css/appearance.css](assets/css/appearance.css), [assets/css/auth.css](assets/css/auth.css), [design_language.md](design_language.md) |
| Composants et provenance | [docs/ui-components.md](docs/ui-components.md), [src/appearance/ui/frame.tsx](src/appearance/ui/frame.tsx), [src/appearance/ui/timeline.tsx](src/appearance/ui/timeline.tsx) |
| État de livraison et limites des vérifications | [app-progress.md](app-progress.md), [README.md](README.md), [docs/source-audit.md](docs/source-audit.md) |

Lors d’une évolution, mettre à jour ici le parcours, les libellés, les états, les règles de calcul et les effets de persistance concernés, puis aligner le langage visuel et l’avancement si nécessaire. Conserver la distinction entre comportement implémenté, comportement validé et service effectivement publié.
