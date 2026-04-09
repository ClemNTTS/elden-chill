# Elden Chill

![Elden Ring Inspired](https://img.shields.io/badge/inspired%20by-Elden%20Ring-black?style=for-the-badge&logo=appveyor)

**Elden Chill** est un jeu de rôle incrémental (idle/clicker) développé par un fan, inspiré de l'univers et de l'atmosphère d'Elden Ring. Il se joue directement dans le navigateur.

##  Gameplay & Fonctionnalités

Le jeu se concentre sur une boucle de gameplay simple mais exigeante : préparez votre personnage, partez en expédition, et revenez plus fort!

*   **Progression Continue :** Votre personnage combat automatiquement, accumulant des runes même lorsque vous êtes inactif.
*   **Gestion du Risque :** Les runes collectées lors d'une expédition ne sont pas sécurisées. Vous devez choisir le bon moment pour vous replier au camp, au risque de tout perdre en cas de défaite.
*   **Optimisation de "Build" :** Avec seulement 3 emplacements d'équipement, chaque choix est crucial. Combinez les objets pour créer des synergies puissantes.
*   **Système de Butin (Loot) :** Vaincre les boss garantit l'obtention d'un objet. Trouver des copies d'un même objet permet de l'améliorer.
*   **Plusieurs Zones :** Explorez différents biomes, chacun avec ses propres monstres et son boss redoutable.
*   **Profil Cloud Autoritaire :** Votre progression persistante est désormais chargee via Supabase avec authentification par magic link.

## Configuration cloud

Le front attend une configuration Supabase dans `config.js` :

```js
window.__ELDEN_CHILL_CONFIG__ = {
  SUPABASE_URL: "https://<project-ref>.supabase.co",
  SUPABASE_ANON_KEY: "<public-anon-key>",
};
```

Le schema SQL est fourni dans `supabase/migrations/20260409_server_authoritative.sql` et les Edge Functions dans `supabase/functions/`.

## Comment Jouer ?

Servez le dossier sur un hebergement statique ou local, configurez Supabase, puis ouvrez `index.html` dans un navigateur web moderne (Chrome, Firefox, Edge, etc.).

## Technologies Utilisées

Ce projet est volontairement simple et est construit avec des technologies web de base :

*   **JavaScript** (ES6+ Modules)
*   **HTML5**
*   **CSS3**

Il n'y a pas de frameworks, de dépendances ou d'outils de build.

---

### Clause de non-responsabilité (Disclaimer)

Ce projet est une œuvre de fan à but non lucratif, créée par pur divertissement. Il n'est en aucun cas affilié, approuvé ou sponsorisé par FromSoftware.

**Elden Ring** et tous les éléments associés (noms, personnages, univers) sont la propriété intellectuelle exclusive de **FromSoftware Inc.** Tous les droits leur sont réservés.
