# Veille Black Friday — Darty & Électro Dépôt

Page statique HTML/CSS/JavaScript remplaçant l’ancienne démonstration de casino sur la branche `feature/veille-black-friday`.

## Mise à jour

À chaque chargement de la page, `offers.js` tente d’interroger les pages officielles Black Friday :

- https://www.darty.com/black-friday
- https://www.electrodepot.fr/black-friday

Les offres sont stock��es en cache dans le navigateur uniquement pour les afficher si une boutique devient temporairement indisponible.

## Limite technique

Les boutiques peuvent afficher des données dynamiques, utiliser des protections anti-robot ou modifier leur structure HTML. Une page GitHub Pages entièrement statique ne dispose pas de serveur pour contourner durablement ces restrictions. Si une boutique bloque l’accès automatique, la page affiche les liens officiels et conserve les dernières données disponibles dans le cache navigateur.

Pour une mise à jour métier encore plus fiable, le projet peut être complété par un petit processus automatisé quotidien qui récupère les données côté serveur et met à jour un fichier JSON.
