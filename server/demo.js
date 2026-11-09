// Données de démonstration issues de la page initiale.
const lastPlayed = 5;
const dates = ["2026-09-06","2026-09-20","2026-10-04","2026-10-18","2026-11-01","2026-11-07","2026-11-22","2026-12-06","2027-01-24","2027-02-07","2027-03-07","2027-03-21","2027-04-11","2027-05-02"];
const clubs = {
  a: [
    ["Élan Marivalois 4","EM",[0,2,1,3,2,5]],["Haut Célé FC 3","HC",[2,1,0,0,3,2]],
    ["US Béduer-Faycelles","BF",[0,0,1,0,0,0]],["Entente Ségala 3","ES",[3,0,2,4,1,0]],
    ["FC Cuzance","CZ",[0,null,0,1,0,1]],["FC Bouriane 3","BO",[1,0,0,2,0,2]],
    ["Causse Limargue 3","CL",[4,2,3,1,2,1]],["US Saint-Germain 2","SG",[0,1,0,null,0,0]]
  ],
  b: [
    ["FC Quercy Sud 3","QS",[1,0,3,3,2,0]],["US Vallée du Lot 2","VL",[0,2,0,0,1,3]],
    ["AS du Causse 2","AC",[0,1,1,0,0,0]],["Entente des Causses 3","EC",[3,1,0,1,2,2]],
    ["FC des Vallons","FV",[0,0,0,0,null,0]],["US Basse Vallée 2","BV",[2,2,1,1,2,3]],
    ["Stade du Quercy 3","SQ",[4,1,0,2,1,1]],["AS des Plateaux","AP",[0,0,null,0,0,0]]
  ]
};


const examplePlayers = [
  ["Benjamin S.","Titulaire",[
    ["17 oct.","D1","Entente Bouriane · titulaire"],
    ["3 oct.","D1","Souillac Lachapelle Gignac · titulaire"],
    ["20 sept.","D3","Entente Ségala Foot 2 · titulaire"],
    ["5 sept.","R3","US Saint-Sulpice · titulaire"]]],
  ["Théo P.","Titulaire",[
    ["24 oct.","D1","Cazals-Montcléra · entré en jeu"],
    ["17 oct.","D3","Saint-Germain · titulaire"],
    ["3 oct.","D1","Souillac Lachapelle Gignac · titulaire"],
    ["19 sept.","D1","Puy-l’Évêque Prayssac · entré en jeu"],
    ["5 sept.","D1","Causse Limargue · titulaire"]]],
  ["Ilian C.","Titulaire",[
    ["24 oct.","D1","Cazals-Montcléra · entré en jeu"],
    ["17 oct.","D1","Entente Bouriane · titulaire"],
    ["3 oct.","D1","Souillac Lachapelle Gignac · titulaire"],
    ["19 sept.","D1","Puy-l’Évêque Prayssac · titulaire"],
    ["5 sept.","D1","Causse Limargue · titulaire"]]],
  ["Sacha J.","Titulaire",[
    ["1 nov.","D3","Entente Bouriane 2 · titulaire"],
    ["17 oct.","D3","Saint-Germain · entré en jeu"]]],
  ["Lucas A.","Titulaire",[
    ["4 oct.","D3","Haut Célé 2 · entré en jeu"]]]
];
const exampleURL = "https://epreuves.fff.fr/competition/match/56260272-elan-marivalois-union-sportive-beduer-faycelles/match";
const exampleSources = {
  "17 oct.|D1":"https://leonzelotois.fr/matchs/ent-bouriane-f-c-elan-marivalois-2-2/",
  "3 oct.|D1":"https://leonzelotois.fr/matchs/elan-marivalois-2-e-s-l-g/",
  "5 sept.|R3":"https://leonzelotois.fr/matchs/st-sulpice-us-elan-marivalois/",
  "24 oct.|D1":"https://leonzelotois.fr/matchs/elan-marivalois-2-cazals-montcl/",
  "17 oct.|D3":"https://leonzelotois.fr/matchs/st-germain-elan-marivalois-3/",
  "19 sept.|D1":"https://leonzelotois.fr/matchs/puyleveque-prayssac-elan-marivalois-2/",
  "5 sept.|D1":"https://leonzelotois.fr/matchs/causse-limargue-f-c-elan-marivalois-2/",
  "1 nov.|D3":"https://leonzelotois.fr/matchs/elan-marivalois-3-ent-bouriane-f-c-2/",
  "4 oct.|D3":"https://leonzelotois.fr/matchs/elan-marivalois-3-haut-cele-f-c-2-2/"
};
const mockNames = ["Jules V.","Mathis R.","Noé B.","Éliot D.","Robin F.","Malo L.","Paul T.","Nils P.","Louan M.","Romain V.","Gaël D.","Léo R."];

/** @type {import("../src/types.js").SeasonData} */
export const demo = {lastPlayed, dates, clubs, examplePlayers, exampleURL, exampleSources, mockNames};
