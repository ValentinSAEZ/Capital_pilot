# Capital Pilot

Application web locale pour piloter ses finances personnelles, comparer son allocation a une strategie cible et traduire cette strategie en actions mensuelles.

## IA temps reel

La partie conseil IA utilise la Supabase Edge Function `finance-advisor` versionnee dans [supabase/functions/finance-advisor/index.ts](/Users/valentinsaez/Documents/GESTION%20FINANCIERE/supabase/functions/finance-advisor/index.ts).

Pour l'activer en production il faut :

- definir `ANTHROPIC_API_KEY` dans les secrets Supabase
- deployer la function `finance-advisor`

Exemple :

```bash
supabase functions deploy finance-advisor
```

## Ce que fait l'application

- consolide comptes, placements, dettes et objectifs
- calcule patrimoine net, cashflow libre, buffer de securite et allocation
- propose un plan 30 jours et des recommandations adaptees au mode choisi
- permet d'ajuster la strategie pour obtenir d'autres conseils
- fonctionne sur desktop et mobile avec support PWA
