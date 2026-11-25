# Veille Black Friday — Darty & Électro Dépôt

Page statique HTML/CSS/JavaScript disponible sur la branche `feature/veille-black-friday`.

## Sources intégrées

À chaque ouverture, la page tente de lire les pages publiques de Darty, Électro Dépôt et les recherches Dealabs suivantes :

- https://www.darty.com/black-friday
- https://www.electrodepot.fr/black-friday
- https://www.dealabs.com/search?q=Darty
- https://www.dealabs.com/search?q=Electro%20D%C3%A9p%C3%B4t

Les résultats lisibles sont affichés avec leur source et un lien de vérification. La page inclut aussi des liens de recherche manuelle Dealabs et idealo. idealo sert ici de comparateur à ouvrir pour rechercher le modèle exact ; il ne fournit pas de flux public grand public exploitable directement par cette page.

Les dernières offres récupérées sont conservées dans le stockage local du navigateur pour servir de solution de secours.

## Limites techniques

La page utilise le lecteur public r.jina.ai pour tenter d’obtenir le texte des pages, mais ce service tiers peut être limité ou indisponible. Les sites peuvent modifier leur présentation, bloquer les robots ou faire varier les prix. Le site étant statique, il ne peut pas garantir la collecte à chaque visite. Vérifiez toujours le prix et la disponibilité sur la boutique avant achat.

Pour une veille robuste, il faudrait ensuite déplacer la collecte vers une tâche planifiée côté serveur, utiliser une API autorisée et publier un fichier JSON actualisé.
