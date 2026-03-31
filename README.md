# Capital Pilot

Application web locale pour piloter ses finances personnelles, comparer son allocation a une strategie cible et traduire cette strategie en actions mensuelles.

## Ce que fait l'application

- consolide comptes, placements, dettes et objectifs
- calcule patrimoine net, cashflow libre, buffer de securite et allocation
- propose un plan 30 jours et des recommandations adaptees au mode choisi
- permet d'ajuster la strategie pour obtenir d'autres conseils
- fonctionne sur desktop et mobile avec support PWA

## Lancer l'application

Depuis le dossier du projet :

```bash
python3 -m http.server 4173
```

Puis ouvre [http://127.0.0.1:4173](http://127.0.0.1:4173).

## Donnees

- les donnees sont stockees en local dans `localStorage`
- tu peux exporter/importer un snapshot JSON depuis l'interface
- la demo inclut un jeu de donnees initial pour montrer les ecrans

## Important

Les suggestions produites sont indicatives. Elles reposent sur les regles et hypotheses de l'application, pas sur une connexion bancaire temps reel ni sur un conseil financier personnalise et reglemente.
