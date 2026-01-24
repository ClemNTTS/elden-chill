# GEMINI.md - Elden Chill

## Project Overview

**Elden Chill** is a browser-based, single-player incremental RPG inspired by the dark atmosphere of *Elden Ring*. It's built with vanilla **HTML5, CSS3, and modern JavaScript (ES6 Modules)**, requiring no external build tools or dependencies. The game runs entirely in the browser and saves progress to `localStorage`.

The core gameplay loop involves:
1.  **Preparation:** At the camp, the player spends "Runes" to upgrade stats and equips up to 3 items.
2.  **Expedition:** The player chooses a "Biome" to explore. The character automatically progresses through a series of monster encounters.
3.  **Risk vs. Reward:** The player can retreat to the camp at any time to secure the runes collected during the expedition. If the player's character dies, all carried runes are lost.
4.  **Progression:** Defeating the biome's boss guarantees an equipment drop and may unlock the next biome. Duplicate equipment drops serve to level up existing items.

## Building and Running

This project is written in vanilla web technologies and does not have a build process.

*   **To run the game:** Simply open the `index.html` file in a modern web browser.
*   **To run tests:** There is no formal test suite for this project.

## Development Conventions

### Code Structure

The project is organized into a few key files:

*   `index.html`: The main entry point and structure of the application. It defines the UI elements for the game.
*   `style.css`: Contains all the styles for the application, using a dark, gothic theme inspired by the source material. It uses CSS variables for theming.
*   `game.js`: The main logic file. It handles game state management, the combat loop, UI updates, and player actions. It imports data from `gameData.js`.
*   `gameData.js`: A module that exports all the static game data, including definitions for Items, Monsters, Biomes, and Loot Tables.

### Game State & Persistence

*   The entire game state is stored in a single JavaScript object (`gameState`) in `game.js`.
*   Progress is automatically saved to the browser's `localStorage` every 30 seconds via the `saveGame()` function.
*   The save data is obfuscated using a simple `btoa` (Base64) encoding followed by a string reversal. This is not a security feature but prevents trivial manual editing of the save file.

### Key Functions & Logic

*   `updateUI()`: A central function that refreshes all visual elements based on the current `gameState`.
*   `getEffectiveStats()`: Calculates the player's final stats by applying bonuses from equipped items to the base stats.
*   `startExploration(biomeId)`: Kicks off an expedition into a biome, resetting progress and starting the encounter loop.
*   `combatLoop(sessionId)`: An asynchronous, recursive function that manages the turn-based combat between the player and an enemy.
*   `dropItem(itemId)`: Handles the logic for receiving a new item or leveling up an existing one.

### Developer Tools

A `dev` object is exposed on the `window` object for debugging purposes, allowing for actions like giving runes (`dev.giveRunes(1000)`), granting items (`dev.giveItem('iron_sword')`), and unlocking all biomes (`dev.unlockAll()`).
