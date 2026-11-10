import {applyAppearance, readAppearance} from './theme.js';

// Script classique exécuté avant les styles pour restaurer le thème sans éclair de couleur.
applyAppearance(readAppearance());
