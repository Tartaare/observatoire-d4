# Composants d’apparence

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

Tailwind ne génère que les utilitaires des contrôles d’apparence. Son reset global
est désactivé pour préserver les styles de la matrice native. Les variables de
palette vivent sur `<html>` afin de couvrir également le portail de la modale.

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
