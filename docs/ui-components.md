# Composants de l’interface

Depuis le sprint 16, toute la présentation est rendue par `src/ui/main.tsx` en
React/TypeScript. Les calculs de saison, la validation, les préférences, la session,
les API et les archives existants restent partagés. Les anciens contrôleurs DOM
sont conservés pour la compatibilité et les vérifications historiques, mais ne
constituent plus l’entrée de la page.

Les composants vivent dans `src/appearance/ui/` pour réutiliser le socle déjà
installé : Button, Input, Dialog, Accordion, Table, NativeSelect, Badge, Alert,
Empty, Skeleton, Spinner et Tooltip. Le curseur repose sur Radix Slider.
Les sélecteurs courts, la case de revérification, la progression et les preuves
dépliables conservent les éléments natifs adaptés à leur usage.

## Compositions coss et ReUI

- `frame.tsx` adapte [Frame de coss](https://coss.com/ui/docs/components/frame),
  [source du registre](https://coss.com/ui/r/frame.json) : encadrement, en-tête,
  panneau et pied de la matrice. Composant de présentation sans Base UI ; classes
  ajustées aux tokens du projet et à Tailwind 3, conservé pour limiter la migration.
- `timeline.tsx` adapte [Timeline de ReUI, variante Radix](https://reui.io/docs/components/radix/timeline),
  [source du registre](https://reui.io/r/radix-nova/timeline.json) : date et contenu
  des antécédents. Adaptation statique en liste ordonnée, date sémantique et
  repères CSS ; les états d’étapes interactives, orientations inutilisées et
  abstractions associées ne sont pas importés.

Ces adaptations libres sont locales ; aucune offre Pro, licence payante, requête
de registre ni CDN n’intervient à l’exécution. Les sources ont été lues avant
adaptation. Les API génériques sont volontairement réduites aux usages présents.

## Accessibilité, compilation et sécurité

Les accordéons Radix gèrent les états, les liens entre déclencheurs/contenus et
le parcours clavier. Le curseur possède une poignée visible, des touches natives
de slider et des valeurs annoncées. Les infobulles sont disponibles au focus et
au survol des boutons actifs ; un contrôle désactivé ne dépend pas d’une infobulle.
Les cibles tactiles, états occupés, erreurs, squelettes et retours de focus sont
vérifiés par les scripts navigateur du projet.

Le bundle ESM `assets/generated/appearance.js` contient désormais l’application.
`theme.js` reste un script classique avant les styles. Le module `src/runtime.js`
reste **externe au bundle** afin que Pages puisse choisir le mode hébergé sans
figer `hosted=false` pendant la compilation. Ne pas retirer le plugin de résolution
de `scripts/build-ui.js` ni ce contrôle dans les tests.

Les styles de page sont dans `assets/css/interface.css`, avec les tokens
existants ; Tailwind compile les utilitaires partagés sans reset global. Les
ressources, y compris ce fichier CSS, sont inscrites dans la liste publique du
serveur et copiées dans le build Pages. La CSP ne comporte pas `unsafe-inline`.

## Provenance shadcn

`src/appearance/ui/{button,dialog,input}.tsx` proviennent du registre officiel
[shadcn/ui, style New York](https://ui.shadcn.com/r/styles/new-york/dialog.json),
sous [licence MIT](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md)
(Copyright (c) 2023 shadcn).

Les sources sont conservées dans le projet et adaptées : libellés français,
cibles tactiles de 44 px, styles de la modale, absence d’animations de thème et
retrait des variantes inutilisées. Dialog s’appuie sur Radix pour le confinement
du focus, Échap, l’inertie du contenu et le retour au déclencheur.
L’overlay et le verrouillage du défilement utilisent du CSS local : la CSP reste
`style-src 'self'`, sans autoriser les styles inline injectés par react-remove-scroll.

Les icônes proviennent de Lucide ; React, Radix, Tailwind CSS et les utilitaires
sont distribués gratuitement sous leurs licences libres respectives, conservées
dans `node_modules`. Aucun service ni CDN n’est utilisé à l’exécution.

Table et Accordion sont adaptés des mêmes registres officiels New York ; les
primitives de présentation suivent la composition shadcn avec les classes locales.
Les variables de palette vivent sur `<html>` afin de couvrir aussi les portails.

Notice de licence des composants shadcn/ui :

```text
MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Notices des adaptations coss et ReUI

Sources : [licence coss](https://github.com/cosscom/ui/blob/main/LICENSE) et
[licence ReUI](https://github.com/keenthemes/reui/blob/main/LICENSE.md).
Le texte MIT ci-dessous s’applique à chacune des deux notices de copyright :

```text
Copyright (c) 2025 coss.com and Origin UI
Copyright (c) 2025 Keenthemes Inc

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
