# Cloudflare Pages + Supabase

Projet Supabase cible : `sylibzlrejlwfarmbhyw`. Projet Pages existant : `usbf-d4-analyzer`.
Le déploiement distant reste à réaliser ; les fichiers ci-dessous constituent la configuration à appliquer.

## Architecture

Pages sert `dist/index.html`, les styles et les modules. Les Functions Pages relaient uniquement les routes `/api/*` autorisées vers Supabase, sur la même origine que l'interface. La CSP reste limitée à `self`. Il n'y a ni serveur Node.js permanent ni SQLite sur Pages.

L'Edge Function `observatoire` vérifie chaque jeton auprès de Supabase Auth, puis exige une entrée dans `od_members`. Elle seule accède aux tables grâce à la clé serveur fournie par Supabase. RLS est activé sans politique publique ; `anon` et `authenticated` n'ont aucun accès aux archives ni aux fonctions SQL. Les noms des tables et des fonctions sont préfixés par `od_`.

L'utilisateur se connecte par e-mail et mot de passe, consulte les archives puis lance une mise à jour. Chaque opération traite une page source, sous un bail PostgreSQL de 120 secondes. La progression, la page en cache et les données analysées sont enregistrées dans la même transaction. Un ancien bail ne peut pas écraser une opération plus récente. Le cache, la cadence maximale d'une requête source par seconde, la limite de 3 Mo, le délai de 20 secondes et la conservation des compositions les plus complètes sont préservés.

**Garder l'onglet ouvert pendant la collecte.** Sa fermeture suspend les prochaines opérations ; sa réouverture reprend automatiquement une collecte en cours. La dernière opération interrompue redevient disponible après expiration du bail. Un refus source 403/429 arrête la collecte ; un nouveau clic explicite permet une reprise. Les données déjà acquises restent consultables.

## 1. Préparer Supabase

1. Appliquer dans l'ordre les migrations de `supabase/migrations/` avec le connecteur, le SQL Editor ou la CLI. Elles créent uniquement les objets `od_*` ; vérifier leur absence avant application.
2. Créer un utilisateur de l'application dans **Authentication → Users**, avec adresse confirmée et mot de passe. Le compte du tableau de bord Supabase n'est pas automatiquement un utilisateur de l'application.
3. Ajouter son UUID dans `public.od_members`, colonne `user_id`. Les autres utilisateurs du projet ne reçoivent pas d'accès. Il n'y a pas d'inscription publique dans cette application.
4. Compiler avec `npm run build:cloud` puis déployer `supabase/functions/observatoire/index.ts` sous le nom **observatoire**. Ce fichier est généré, autonome et ignoré par Git.
5. Désactiver la vérification JWT de la passerelle pour cette fonction uniquement, conformément à `supabase/config.toml` : le handler effectue la vérification Auth et l'autorisation de membre. Ne pas supprimer ces contrôles.

Les variables `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont disponibles dans l'environnement des Edge Functions. La clé serveur ne doit jamais être copiée dans Pages, le frontend, le dépôt ou une conversation.

## 2. Importer les archives existantes

Avant la première collecte en ligne, vérifier l'équivalence sans envoyer de données :

```powershell
npm run import:cloud -- --check
```

Le script ouvre SQLite en lecture seule et compare, saison par saison, la totalité des résultats projetés. Il migre les rencontres, compositions, joueurs, classements, couverture et dates de synchronisation. Les pages HTML brutes du cache restent dans la base locale ; le cache Supabase se remplit lors des collectes suivantes.

Pour importer, fournir `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` au processus via un environnement sécurisé, puis lancer `npm run import:cloud`. Ne pas écrire la clé dans une commande conservée dans l'historique. L'import est atomique par saison et refuse une saison distante déjà utilisée ou une collecte en cours. La copie SQLite reste intacte. Ne pas lancer « Mettre à jour » en ligne avant cet import.

## 3. Configurer Cloudflare Pages

Dans les paramètres du projet **usbf-d4-analyzer** :

| Paramètre | Valeur |
| --- | --- |
| Framework | None |
| Répertoire racine | Racine du dépôt |
| Commande de compilation | `npm run build:pages` |
| Dossier de sortie | `dist` |
| Version Node.js | `NODE_VERSION=22.16.0` ou une version 22/24 plus récente |
| `SUPABASE_URL` | `https://sylibzlrejlwfarmbhyw.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Clé publique/publishable du projet, ou ancienne clé `anon` |

Configurer ces variables pour la production et pour la prévisualisation si cette dernière est utilisée. La clé serveur `service_role` est interdite ici. Les sources de `functions/` doivent être incluses dans le déploiement : un simple glisser-déposer de fichiers statiques ne déploie pas cette API. Utiliser l'intégration Git de Pages ou la CLI Wrangler.

La branche de travail est `feature/sprint-11-online-hosting`. Tester son déploiement de prévisualisation avant fusion stable dans `main`. L'adresse de production reste `https://usbf-d4-analyzer.pages.dev/` ; les URL préfixées par un hash désignent un déploiement particulier et ne représentent pas nécessairement la dernière version.

## Vérifications avant publication

Exécuter `npm run build:pages`, `npm test` et le contrôle d'import. Vérifier ensuite sur le déploiement : accueil sans 404, connexion refusée pour un non-membre, connexion du propriétaire, conservation des résultats importés, consultation d'une composition, mise à jour et reprise après fermeture, déconnexion, absence d'erreur CSP. Vérifier les tables et droits PostgreSQL réellement appliqués ; les tests locaux utilisent un stockage simulé et ne remplacent pas cette vérification.

L'import et le déploiement n'ont pas lieu pendant une compilation ou un test. Le build produit uniquement un dossier public fermé et une fonction serveur distincte. Aucun secret ni fichier SQLite n'est copié dans `dist`.

## Gratuité et limites

Les offres gratuites ont des quotas ; elles ne garantissent pas une disponibilité ou une capacité illimitée. Supabase annonce 500 Mo de base gratuite et peut suspendre un projet après une période de faible activité. Le cache HTML grandit avec les feuilles collectées : surveiller sa taille dans le tableau de bord. La projection charge la saison en mémoire ; cette simplification convient au volume actuel. Pour plusieurs saisons volumineuses ou beaucoup d'utilisateurs, prévoir une projection SQL et une politique explicite de rétention du cache avant d'élargir le périmètre.

Références vérifiées le 11 novembre 2026 : [limites Supabase](https://supabase.com/docs/guides/functions/limits), [offre gratuite](https://supabase.com/pricing), [suspension des projets](https://supabase.com/docs/guides/platform/free-project-pausing), [Functions Pages](https://developers.cloudflare.com/pages/functions/routing/).

Le mode local `npm start` continue à utiliser SQLite et ne demande pas de connexion. Les bases locale et distante évoluent indépendamment après l'import ; les préférences de navigation et d'apparence sont également propres à chaque adresse.
