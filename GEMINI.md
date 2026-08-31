# GEMINI.md - Elden Chill

## Project Overview

**Elden Chill** is a browser-based, single-player incremental RPG inspired by the
dark atmosphere of *Elden Ring*. It is built with vanilla **HTML5, CSS3, and ES
modules** — no build tools, no package manager, no dependencies beyond two CDN
scripts (Google Fonts, Cytoscape for the world map).

The core gameplay loop:

1.  **Preparation:** at the camp, spend "Runes" on stats and equip up to 3 items.
2.  **Expedition:** pick a biome; the character fights through encounters automatically.
3.  **Risk vs. Reward:** retreat to bank the runes carried, or die and lose them all.
4.  **Progression:** the biome boss guarantees an equipment drop and may unlock the next biome. Duplicates level existing items up.

## Building and Running

No build step. ES modules require an HTTP origin — do **not** open `index.html`
from the filesystem.

```bash
python tools/devserver.py 8124
```

Use that rather than `python -m http.server`: the stock server lets the browser
cache ES modules and CSS for the whole session, across tabs. You end up testing
a fix that never ran. `devserver.py` sends `Cache-Control: no-store`.

There is no formal test suite. `save-crypto.js` exports `selfTest()`, callable
from the browser console.

## Code Structure

| File | Role |
| --- | --- |
| `index.html` | Single page, all screens as `<section class="app-screen">` |
| `style.css` | Whole stylesheet, one palette in `:root` (single theme) |
| `game.js` | Entry point: dev tools, `window.*` handler wiring, bootstrap |
| `state.js` | `gameState` (persisted) and `runtimeState` (not persisted) |
| | `setGameState` merges objects but **replaces** arrays, and assigns on key presence rather than truthiness — see the comment there before changing it |
| `save.js` | Local persistence: load, save, rotation, quarantine, import/export |
| `save-crypto.js` | Sealed-envelope format (SHA-256 / HMAC, no dependency) |
| `sprites.js` | Sprite sheets, canvas animator, stat-to-hero mapping |
| `icons.js` | Item / ash icons, sliced from the 16x16 atlases |
| `tools/pixelart.py` | Shared 16x16 render engine for the icon generators |
| `tools/build_accessory_atlas.py` | Generates the accessory icon atlas |
| `tools/build_ui_atlas.py` | Generates the stat / status-effect icon atlas |
| `tools/build_emblem_atlas.py` | Generates the monster faction-emblem atlas |
| `tools/validate_monster_frames.py` | Checks a set of monster frames before integration |
| `.claude/skills/asset-monstre/` | Skill: full pipeline for a new archetype or boss |
| `docs/brief-sprites-monstres.md` | Brief to hand to an image-generating agent |
| `tools/build_camp_scene.py` | Generates the camp backdrop layers |
| `tools/build_monster_sheets.py` | Assembles the 216 monster frames into 12 sheets |
| `monster-visuals.js` | Maps every monster to an archetype, a tint and a scale |
| `tools/devserver.py` | Static dev server with no-cache headers |
| `shared/player-profile.js` | Profile schema, normalization, stat mutations |
| `core.js` | Exploration and encounter orchestration |
| `combat.js` | Turn resolution |
| `systems.js` | Derived stats, effects, set bonuses |
| `ui.js` | All rendering and DOM updates |
| `ashes.js`, `status.js`, `spawn.js` | Ashes of War, status effects, monster spawning |
| `item.js`, `monster.js`, `biome.js`, `constants.js` | Static content data |
| `items/`, `monsters/` | Additional content modules by area |
| `world-map.js` | Cytoscape graph for the world map |

Content volume as of now: **103 monsters, 105 items, 32 biomes, 12 ashes of war.**
`monster.js` merges `monsters/v21.js`, so counting entries in one file undercounts.
Every entry is stamped with its own `id` at the bottom of `monster.js` — combat
instances are spreads of the template and would otherwise lose it, and names are
not unique (two "Loup Affame", two "Troll des Collines", two "Chimere Leonine").
Item rarities are very unevenly spread: 88 common, 9 legendary, 4 rare, 4 relic.
Beware: `item.js` merges the four modules under `items/`, so counting entries
in `item.js` alone undercounts by 35. Use `Object.keys(ITEMS).length`.

## Game State & Persistence

*   The persisted state is a single object, `gameState`, defined by
    `DEFAULT_PLAYER_PROFILE` in `shared/player-profile.js`.
*   It is written to `localStorage` on every meaningful action, every 30 s, and
    on `beforeunload`.
*   Each write goes through `sealSave()`: the JSON is XORed with an HMAC-derived
    keystream and accompanied by a truncated HMAC-SHA256 tag. `openSave()`
    verifies the tag before returning anything.
*   The key is rebuilt at runtime from fragments so no usable string appears in
    the bundle. **This is anti-tampering, not security** — the key ships to the
    client and can be recovered by anyone determined.
*   `loadGame()` tries, in order: sealed primary, sealed backup, legacy
    `btoa`+reverse format (migrated and resealed), then a fresh profile. A save
    that fails verification is moved to `eldenChillSaveRejected` rather than
    deleted, and the player is warned by a boot banner.

There is **no** cloud backend. An earlier version used Supabase with magic-link
auth; it blocked the boot sequence and made the game unplayable offline, so it
was removed entirely.

## Assets

`assets/` holds the camp and dungeon music tracks, plus `assets/itch-assets/`
with third-party pixel-art packs:

*   `MiniElementsHeroes/` — 5 chibi heroes, 32x32 frames, plus 5 elemental effect sheets. Used for the player character (one look per dominant stat) and combat effects. Frame counts vary per row and per hero; they are declared explicitly in `sprites.js`, not inferred.
*   `16x16 Weapons RPG Icons/` — ~480 weapon icons x 4 metal tiers.
*   `16x16 Assorted RPG Icons/` — armours, potions, consumables, books, chests.
*   `Tiny RPG Character Asset Pack 01/02` — Soldier, Orc, Demon_A, Blood Monster_A, 6-7 animations each, 100x100 frames.
*   `PNG/`, `BMP/` — small 6-frame strips: Elf, Human, Orc, Pig, Skeleton, Troll.

Never add assets ripped from Elden Ring itself. Names and atmosphere are fine;
redistributing FromSoftware files is what gets fan projects taken down.

## Rendering the player character

`sprites.js` maps the dominant investable stat to one of the five heroes
(vigor -> earth, strength -> lightning, dexterity -> wind, intelligence -> ice,
none or a perfect tie -> water as the neutral look). `SpriteAnimator` drives a
canvas, stops itself when the canvas leaves the viewport, and is kept across
`updateUI()` calls so the idle loop does not restart and flicker.

`ui.js` exports `playHeroAnimation(name)` for one-shot animations that return to
idle on their own, and `playAshEffect(ashId)` which plays both the hero's attack
animation and the ash's elemental effect over the combat zone.

## Elemental effect sheets

`EFFECT_SHEETS` in `sprites.js` describes the five sheets in
`assets/sprites/effects/`. **The frame sizes are not square and cannot be guessed
from the sheet height** — they were measured by looking for fully transparent
columns: earth and water are 48px, ice and lightning 32px, wind 40px. Earth's
image has 7 cells but the last one is empty, so it declares 6 frames.

`playEffectOnce` is deliberately separate from `SpriteAnimator`: effect sheets
are single-row, must not loop, and must clear themselves at the end rather than
resting on their last frame.

The overlay canvas lives inside `#combat-zone`, which is `position: sticky` at
desktop widths — that already establishes a containing block, so do **not** add
`position: relative` to it: doing so silently unpins the combat zone.

## Monsters

**36 sheets** in `assets/sprites/monsters/`: 12 shared archetypes at 64px
(`MONSTER_ARCHETYPES`) and 24 dedicated boss sheets at 96px (`BOSS_ARCHETYPES`),
one per boss. Every sheet shares the same grid — 6 columns x 4 rows, rows being
idle(4), attack(6), hurt(2), death(6) — only the cell size differs.

`getMonsterCell()` and `getMonsterBaseScale()` resolve the gauge. The base scale
is **not** a style choice: it compensates for cell size so a creature occupies
the same on-screen height either way. Measured on the delivered frames, a common
creature fills ~82% of its 64px cell and a boss ~91% of its 96px cell, hence
1.6 against 0.98. Applying the same scale to both rendered bosses more than
twice too large.

Bosses keep the **tint of their region** — the tint ties a boss to its biome,
the silhouette no longer has to.

`monster-visuals.js` maps each of the 103 monsters to **[archetype, tint]**;
the scale comes from the boss / rare flags, not from a hand-written value.
Two monsters sharing a silhouette stay distinguishable by colour and size —
this is variation, not uniqueness, and it is a deliberate trade-off.

Tinting is a **gradient map**, not a hue rotation: pixel luminance picks a
colour along a three-stop ramp. Pixels darker than 12% luminance are left
alone — that is the outline, and recolouring it dissolves the silhouette.
`getTintedSheet` caches one canvas per (archetype, tint) pair; re-tinting a
384x256 sheet every frame would be ruinous.

### Emblems

After tinting and scaling, 17 groups still had two **genuinely different**
creatures rendering identically (the count excludes variants of the same
monster: the three "Soldat d'Exil" and the two "Loup Affame" are supposed to
look alike). A small faction emblem, drawn beside the monster, separates them.

Emblems are deliberately sparse — 25 of 103 monsters carry one. Putting one on
every monster would be noise, not information. The emblem lives in its own
element rather than inside the canvas: the enemy lane is mirrored with
`scaleX(-1)` so the monster faces the player, and an emblem drawn into the
canvas would be mirrored with it.

`auditMonsterVisuals(MONSTER_ARCHETYPES)` reports monsters with no entry,
entries pointing at deleted monsters, unknown tints, unknown archetypes,
invalid emblems, and — most usefully — `unresolved`: groups where two
differently-named creatures still share archetype, tint, scale tier **and**
emblem. That list must stay empty.

### Combat rendering

`syncCombatSprites()` runs from `updateHealthBars()`, which fires several times
per second. `mountCombatEnemy` therefore claims its cache key **before**
awaiting the tinted sheet: marking it only on success meant every call started a
new mount and invalidated the previous one by token, so none ever completed and
the sprite stayed stuck on the previous enemy.

Hero scale is 4 against 1.6 for monsters. That is not arbitrary: heroes occupy
about 20 of their 32px cell, monsters about 56 of their 64. At equal scale the
monster dwarfed the hero.

Sprites are all drawn facing right; the enemy lane mirrors them with
`transform: scaleX(-1)`. The ash button reads `--combat-zone-height`, published
by a `ResizeObserver` in `ui.js` — it used to be a hard-coded offset that broke
the moment the combat zone grew.

## Icons

Weapons and armour come straight from the atlases; the weapon metal tier is
picked from the item level, so upgrades are visible without text. Accessories
have no source in the packs, so `tools/build_accessory_atlas.py` draws them and
writes `assets/sprites/atlas/accessories.png`. Re-run it after adding an
accessory, then add the cell to `ACCESSORY_CELLS` in `icons.js`.

`auditIcons()` in `icons.js` lists items with no icon and coordinates that fall
outside their atlas. Run it from the console after adding content.

`iconMarkup(icon, { scale, label, frame })` is the only render path. Pass
`frame` to wrap the icon in a decorated container:

```html
<span class="item-icon"><span class="pixel-icon" style="…atlas slice…"></span></span>
```

**That split is load-bearing.** The element carrying the atlas slice must have no
padding, no border and no `background` shorthand. Any of the three makes the
neighbouring atlas cells bleed into view: padding makes the background paint over
the whole box (`background-clip` defaults to `border-box`), and the shorthand
resets `background-clip`/`background-origin`. All decoration — padding, border,
rarity glow — belongs on the `frame` element. This bug was fixed twice before the
structure was split; do not merge them back.

Combat convention: the **player is the left column**, the enemy the right, in
both the log (`ensureBattleLogLayout` in `ui.js`) and the HP lanes. The CSS
alignments and the `.player-side` / `.enemy-side` borders follow that order —
swapping the DOM without swapping them makes both columns point the same way.

Stat and status icons come from `assets/sprites/atlas/ui.png`
(`tools/build_ui_atlas.py`). Its colours are deliberately duplicated from two
places: the status palettes mirror the `color` fields in `status.js`, and the
stat palettes mirror the `--stat-*` tokens in `style.css`. Change one, change the
other.

Rarity drives a single `--rarity-color` custom property per tier
(`.rarity-commun` … `.rarity-relique`), which the card border, the chip and the
glow behind the icon all consume. Adding a tier means one new rule.

## Camp backdrop

The three layers take a `--parallax` offset written by `initCampParallax()` in
`ui.js` on scroll (sky 0.02, mid 0.055, near 0.1 of `scrollY`). Higher values
visibly detach the horizon from the mountains. The listener is passive and
throttled through `requestAnimationFrame`; it opts out entirely under
`prefers-reduced-motion`.

Embers (`#fire-particles`) get a random size, drift, colour and peak opacity per
particle, driven by CSS custom properties. Without that randomisation all 46
rise in parallel columns and read as rain. Sizes are integers so the squares
stay crisp.


`tools/build_camp_scene.py` draws three 480x270 layers into
`assets/sprites/scene/` (sky with the Erdtree, mid silhouettes, ground). The
markup lives at **body level**, next to `#fire-particles`, not inside
`#camp-view`: `#game-container` has a `backdrop-filter`, which makes it a
containing block for fixed descendants and would anchor the scene to the
container's 2000px box instead of the viewport. `toggleView()` hides it during
combat, the same way it hides the fire particles.

Panel translucency runs on tokens — `--shell-veil`, `--shell-sheen`,
`--shell-blur`, `--panel-veil`, `--panel-sheen` — kept nearly transparent so the
backdrop reads through. Combat panels stay opaque on purpose: no backdrop behind
them, and readability matters more during the action.

## Theming

**There is one theme.** The light parchment theme was removed: a night backdrop
cannot work under it, and it doubled the surface to verify on every screen. The
palette lives in a single `:root` block, `<body>` carries no theme class, and the
26 `body.theme-dark X` overrides were flattened to plain `X` rules (each one
already sat after its base rule, so source order still resolves the cascade the
same way). Do not reintroduce a theme class without re-checking that ordering.

## World map

`BIOME_GUIDE` in `world-map.js` now covers **all 34 biomes**. The seven WIP ones
had no entry, so they fell back to the automatic layout, which lives in a
completely different coordinate space (`depth * 240` against `x * 18`) — they
landed hundreds of pixels away and wrecked the framing. They carry `wip: true`
and render dimmed.

`frameMap()` fits the graph, but stops at `MIN_OVERVIEW_ZOOM` (0.28): squeezing
34 nodes into a narrow column produced a 0.11 zoom where nothing was clickable.
Below the floor it centres on the selected zone instead and the chapter browser
takes over navigation.

A `ResizeObserver` on `#world-map` re-frames the graph. The map screen goes from
`display: none` to `block` on navigation, so Cytoscape initialises against a
container with no dimensions and draws into nothing; a single
`requestAnimationFrame` is not enough because the size can arrive later.

Node labels use `min-zoomed-font-size: 11` so they only appear once zoomed in —
34 labels at overview zoom overlap into mush. Do **not** try to force the
selected/current labels visible by zeroing that threshold: it was tried, and at
0.36 zoom a 13px font renders at under 5px. Those two nodes are marked by
**size and colour** instead, and the legend names the convention.

Above 1000px the map column is **sticky** and takes `min(760px, 100vh - 140px)`.
The side column runs to ~1200px while the map was 520px, so scrolling meant
dragging past 800px of emptiness on the left. Two constraints on that rule:

*   it must sit **after** the base `#world-map-shell` rule in the file — a media
    query adds no specificity, and `position: relative` wins on source order
    otherwise. This was gotten wrong once.
*   the height must stay under the viewport, or the pinned element scrolls out
    and stickiness buys nothing.

Chapters group the side panel. `chapterState` only holds chapters the player
explicitly toggled — an earlier version let the "open the chapter holding the
selection" heuristic override the click, making that chapter impossible to
collapse.

## Deliberate behaviours — do not "fix"

*   Enemy HP is allowed to display **below zero** after a lethal blow
    (`-116 / 13`). This is an intentional UX choice: it shows overkill.

## Key Functions & Logic

*   `updateUI()` — `ui.js`, central refresh of every visual element from `gameState`.
*   `getEffectiveStats()` — `state.js`, final stats after item, set and effect bonuses.
*   `startExploration(biomeId)` — `core.js`, starts an expedition and the encounter loop.
*   `combatLoop(sessionId)` — `combat.js`, async recursive turn-based combat.
*   `dropItem(itemId)` — `core.js` (module-private), new item or level up an existing one.

## Developer Tools

`game.js` defines a `dev` object with `giveRunes`, `giveItem`, `giveAllItems`,
`maxAllItems`, `giveAsh`, `unlockAll`, `unlockBiome`, `resetBiomes`,
`spawnEnemy`, `forceResetToCamp`, `toggleCombat`, `addOfflineTime`,
`removeOfflineTime` and `setOfflineSpeed`. The `window.dev = dev` line is
commented out — uncomment it to reach them from the console.
