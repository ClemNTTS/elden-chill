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

## Crit — a separate currency (`crit.js`)

Crit no longer draws on the 150-level rune budget. It has its own currency:
**one skill point every 10 levels**, so 15 at max level, split freely between
chance and damage. Points are free (they come from levels, not runes) and
`respecCritPoints()` returns them at no cost.

| | base | per point | 15 points |
| --- | --- | --- | --- |
| `critChance` | 5% | +5 points of percent | 80% |
| `critDamage` | 1.5x | +0.25x | 5.25x |

`CRIT_PER_RANK.chance` is 0.05 and not 0.04 for a reason: the Twin Blades
require **10% base crit** (`item.js`). At 5 per rank the first point clears
that gate, so the weapon becomes reachable at level 10.

The payoff curve deliberately rewards splitting — average damage multiplier at
150: 15/0 → x1.40, 9/6 → **x2.00**, 0/15 → x1.21. Going all-in on either track
is the worst use of the points.

**Super crit.** Effective crit chance above 100% is not wasted: the overflow
becomes the chance that a crit is a *super* crit, which doubles the crit
multiplier (`SUPER_CRIT_MULTIPLIER`). 135% chance = guaranteed crit, 35% of
them super. `rollCrit()` in `crit.js` is the single resolution point; combat
calls it and nothing else rolls crit.

`stats.critChance` / `stats.critDamage` remain the source of truth for every
other reader (items, combat, display). The ranks only drive them, through
`syncCritStats()`, which `hydrate()` calls on every load. Saves predating the
system are migrated by `migrateCritToSkillPoints()` in `save.js`: old crit
levels are handed back, with a pro-rata share of `runesSpent` refunded.

## Hero specialisation

`getDominantStat()` (`sprites.js`) decides which of the five hero sheets is
shown. It takes **effective** stats — equipment included — because that is what
the player reads in their own panel; a weapon granting +15 strength must be
able to change the silhouette.

A stat must take a clear lead: at least **20% above the runner-up** AND at
least **5 points** ahead (`DOMINANCE_THRESHOLD`). Below either, the appearance
stays neutral (Sans-Eclat). The two conditions cover opposite ends of the game:
the ratio stops the late-game flip where 1 point out of 60 means nothing, the
absolute gap stops the early-game flip where 3 against 2 satisfies the ratio.

Note that `getEffectiveStats()` folds `dexterity/4 + intelligence/4` into
strength, so strength is structurally favoured on balanced builds. That is the
real stat derivation, not a bug in the threshold.

## What each stat actually does

Damage equals strength, flat (`combat.js:141`). Every other stat is measured
against that, which is why they need a multiplier to compete.

| Stat | Role |
| --- | --- |
| Vigueur | HP; base of several ashes and statuses |
| Force | Damage, per attack |
| Dexterite | **extra attacks = (dex/60)^1.75**, dodge (dex/400, cap 50%), armor (dex/8), and dex/4 into strength |
| Intelligence | **+0.8 magic damage per point, added after the armor division**, +1% runes per point (cap +150%), and int/4 into strength |

The attack curve is **convex on purpose**. Damage per turn is
`attacks x strength`; with a linear divisor that product mechanically peaks
mid-budget. Measured with the old divisor of 40, the optimum sat at 76 dex —
investing *mainly* in dexterity was worse than investing half. The exponent
moves the optimum to **112** without touching the peak (263 vs 270 damage/turn),
weakens early dexterity (1.15 attacks at 20 points against 1.50 before) and
finally rewards full commitment (5.97 attacks at 150 against 4.75).

The fractional part is a **per-turn chance** of one more attack
(`extraAttackChance`), not a hard breakpoint — with a floor alone, 79 to 80
dexterity was a 48% jump on a single point.

There is no cap on total attacks; items add to `attacksPerTurn` on top of the
curve. Worth watching if a build ever stacks both hard.

Dexterity is the affliction path by design: on-hit effects roll **per attack**,
so extra attacks are extra proc rolls.

**Armor divides damage** (`damageMultiplier = 100 / armor`, `combat.js`), and
monster armor runs from ~100 to 400. Intelligence's damage is added *after*
that division, so it is the only path that does not collapse against armored
targets. That is its whole identity.

Percent penetration was deliberately **not** used for intelligence: items
already stack up to ~0.9 of it, and `armor` is clamped to 1, so crossing 100%
would multiply damage by a hundred. That latent cliff still exists if enough
penetration items are combined — worth a cap if it ever shows up in play.

Measured damage per turn over the 150-level budget, no equipment:

| Build | armor 100 | 200 | 265 | 320 | 400 |
| --- | --- | --- | --- | --- | --- |
| Force 150 | 150 | 75 | 56 | 46 | 37 |
| 70 for / 80 dex | 270 | 135 | 99 | 84 | 66 |
| 70 for / 80 int | 154 | 109 | 97 | 92 | 86 |
| Int 150 | 157 | 138 | 133 | 131 | 129 |
| 50/50/50 | 257 | 173 | 151 | 142 | 131 |

Dexterity clears packs, intelligence kills armored bosses, the trihybrid is the
generalist. Verified in play: at 150 intelligence against 200 armor, observed
138 damage per hit for 138 expected (18 physical + 120 magic).

**Consequence to keep in mind:** attacks multiply strength, so the optimum is a
hybrid. Measured over the 150-level budget with no equipment — pure strength
150 dmg/turn, 80 dex / 70 str **270**, pure dexterity 176. Pure strength is now
the weakest of the three. Change `DEX_PER_EXTRA_ATTACK` to flatten the curve
(a larger divisor narrows the spread and weakens dexterity-heavy builds).

Intelligence's rune bonus used to cap at 50 points out of a 150 budget, so it
was a stat you finished rather than a path. It now runs the full budget.

## Endgame biomes (`monsters/endgame.js`)

Five biomes used to be unreachable: `leyndell_royal` and `consecrated_snowfield`
had no predecessor, which stranded `forbidden_land`, `mohgwyn_palace` and
`miquella_haligtree` behind them. Four of the five were also empty shells
(`monsters: ["", ""]`, `boss: ""`), so wiring the graph alone would have sent
the player into a biome with nothing to fight.

Fixed on both fronts: two edges added (`altus_plateau -> leyndell_royal`,
`mountaintops -> consecrated_snowfield`, matching the source game's geography),
and 21 monsters authored in `monsters/endgame.js`, calibrated to sit between
`mount_gelmir` (3200 hp standard, 24800 boss) and `crumbling_farum_azula`
(7200 / 44800). Runes follow the ratios already in use: ~7.7x hp for a
standard, ~7.6x for a rare, ~5.3x for a boss.

`mountaintops_bird` was referenced by the **reachable** Mountaintops biome but
never defined — spawning it threw on `template.groupCombinations`. It now
exists, and `spawnMonster()` refuses an unknown id with a console error instead
of breaking the run.

All 24 boss sheets were already assigned, so the four new bosses reuse an
existing sheet with a different tint plus a distinguishing emblem. Re-run the
audit after any change here — `unresolved` must stay empty:

```js
const mv = await import("./monster-visuals.js");
const sp = await import("./sprites.js");
mv.auditMonsterVisuals(sp.MONSTER_ARCHETYPES);
```

## Expedition automation

A biome already loops forever on its own (`currentLoopCount`, enemies x1.25 per
cycle). What was missing was everything around it, so `gameState.automation`
adds two switches — pure convenience, neither changes any rule:

*   `autoRestart` — relaunch the same biome after a death. Guarded: after
    `MAX_AUTO_DEATHS` (5) consecutive deaths **without clearing a single
    cycle**, it switches itself off and says so. Without that guard a player
    who enables it on too hard a biome loops on their own death forever.
    The counter resets whenever a cycle completes.
*   `stopAfterCycle` — retreat to camp once that many cycles are cleared.
    0 means never, the original behaviour. It matters because carried runes are
    banked at each cleared cycle but **lost on death**: stopping on purpose is
    how you keep them.

## Rebirth and trials (`rebirth.js`)

The game stopped dead once the level cap and the 32 biomes were done. Rebirth
makes that content replayable at a growing yield.

**Rebirth** unlocks when the boss of `FINAL_BIOME_ID` falls. That constant is
`crumbling_farum_azula` today, which is **not** the intended ending — the map
still announces Leyndell Ash and the Erdtree in chapter X, neither of which
exists in `biome.js` yet. Move the constant when they do; nothing else needs
touching.

Each rebirth grants **+25% rune gain** and **+10 max level**, permanently. It
resets level, stats, crit ranks, runes, inventory, equipment and unlocked
biomes. It keeps the codex, ashes of war and preparation unlocks — the rule is
*keep what was discovered, return what was accumulated*. Without that, every
cycle would restart an empty game and rebirth would read as a punishment.

`normalisePlayerProfile` must **not** force `maxLevel` back to `MAX_LEVEL`; it
derives it as `MAX_LEVEL + 10 * rebirth.count`. Forcing it wiped the bonus on
every load.

**The rebirth tree** turns each rebirth into a choice rather than a flat
multiplier. `POINTS_PER_REBIRTH` (2) points buy ranks in five nodes: rune gain,
max level, effective vigour, ash charges, rare-encounter chance. 21 ranks in
total, so a full tree takes 11 rebirths. Respec is free — the points come from
rebirths, not runes, so returning them creates nothing.

**Hard constraint on any new node:** nothing may add an equipment slot or raise
an item's level cap. The build rests on the synergy of exactly three items; a
fourth slot would rewrite the game rather than extend it. Rebirths accelerate
and amplify, they never change the rules. Every node hooks into a lever the
engine already had.

`getMaxLevel()` is the **single source of truth** for the level cap — it folds
in both the rebirth count and the `will` node. `gameState.save.maxLevel` is only
a mirror, refreshed by `hydrate()`; `normalisePlayerProfile` cannot compute it
(it would need `rebirth.js`, which imports `MAX_LEVEL` from it — a cycle).
Letting the two formulas diverge already cost a real bug: after a reload, the 25
levels from a maxed `will` node vanished from the cap.

**Trials** are four out-of-progression bosses (180k to 4.5M hp) with no loot and
no runes — the reward is the achievement alone. They are biomes deliberately
outside the unlock graph (`isTrial: true`, `length: 1`), entered only from the
endgame panel. They are available *before* rebirthing, so a player can delay
the reset to attempt them. The only power a rebirth grants is +10 levels, so
the last trial stays out of reach for many cycles by design.

## Combat frame sizing

`.fighter-stage` height comes from `--fighter-stage-height`, set by the
`is-tier-boss` / `is-tier-rare` classes that `mountCombatEnemy` puts on
`#combat-zone`. Measured render heights across the bestiary: standard 102px,
rare 118px, boss 136px, and **148px** for bosses that reuse a 64px common sheet
(base scale 1.6 x boss scale 1.45 = 2.32). A fixed 104px frame clipped 75 of
128 monsters.

The class goes on the combat zone, not on one lane, so both sides grow together
and the ground shadow stays aligned. The sticky stack re-adapts on its own —
the `ResizeObserver` republishes `--combat-zone-height`.

Note for later: those scales (2.32, 1.42) are fractional, and
`image-rendering: pixelated` at a non-integer scale gives uneven pixels.

## The complete version — 14 added biomes

The base game now runs from Necrolimbe to the Elden Throne: **46 playable
biomes**, 184 monsters, 147 items, 29 sets, 18 ashes, 10 blessings,
6 consumables, 11 statuses.

**Difficulty is interpolated, never hand-written.** The 32 original biomes trace
a curve from 14 hp (Necrolimbe Ouest) to 7200 (Farum Azula), roughly x1.22 per
biome. New tiers sit on that curve, and reuse the ratios measured on it:

    rare = std x1.2      boss = std x6.8
    atkStd = hp x0.052   atkBoss = atkStd x1.35
    runes = hp x7.7 (std), x7.6 (rare), x5.3 (boss)

`MAX_LEVEL` went from 150 to **220** to follow the biome count at the same
~4.8 levels per biome. Raising it without adding content would have broken the
cost curve, which grows with the square of the level.

### Biome traits (`biome-traits.js`)

Every added biome carries a `traits` entry — the local rule that distinguishes
it from a pure stat tier. Three hooks only, so combat stays readable:

| hook | where | what it can do |
| --- | --- | --- |
| `runBuff` | `startExploration` -> `activeRunBuffs` | anything `getRunModifier()` reads |
| `enemyModifier` | `spawn.js`, per created enemy | hp, atk, armor |
| `onTurn` | `combat.js`, once per player turn | statuses, healing, escalation |

New modifier keys read by the engine: `noHeal`, `dodgeMult`, `armorMult`,
`noRetreat`, `lootChanceMult`.

A trait **must** declare `name` and `detail`, and `renderBiomeDetail` shows
them on the zone sheet as a `.biome-trait` card. That rendering was missing for
a while: all 14 traits had descriptions, this file claimed the sheet displayed
them, and nothing did. Players met the rule by suffering it. A rule you cannot
read before departing is a bad surprise, not a mechanic.

### Statuses

`MADNESS`, `DEATH_BLIGHT` and `SLEEP` were added. Madness fills a real hole:
`folie` existed as a resistance and as a biome hazard from the start, but no
status ever applied it — biomes declaring it had no effect of their own.

Madness and Death Blight **stack** (`STACKING_EFFECTS` in `combat.js`) and fire
at a threshold, like frostbite. Sleep is duration-based and breaks on the first
hit taken — that is what separates it from stun.

### Healing goes through one door

`healPlayer()` in `state.js` is the only place that raises `playerCurrentHp`.
Eight sites used to write it by hand; missing one would have made the
"Grace scellee" trait a lie. Known cosmetic gap: a few item heal logs still
print their amount in a sealed biome even though nothing was healed.

### Traps found while writing this

*   `funcOnKill` does not exist. The only item combat hooks the engine calls are
    `funcOnHit`, `funcOnBeingHit` and `passiveStatusReduction`. An item written
    against any other name is dead code that fails silently.
*   Ash effects may only return `damageMult`, `status` and `msg`. Returning
    `flatDamage` or `splash` does nothing.
*   `dropItem()` returns silently on an unknown id. A loot table entry
    `{ id: "great_shield" }` — an ash slipped into Caelid Ouest's table — had
    been quietly voiding 10% of that biome's rolls since the original split.
    Loot tables now accept `{ ashId }` properly.

## Balance tooling

Two tools, deliberately separate because they have different levels of trust.

### `tools/audit-curve.mjs` — no combat model, fully trustworthy

Measures only ratios internal to the data: boss/standard HP, rare/standard, and
the power jump from one biome to the next, in true progression order. It makes
**no assumption about combat**, so an anomaly it reports is a real anomaly.

Reference medians across the 46 biomes: **boss/std x8.4**, rare/std x1.41,
bossAtk/stdAtk x1.76. It flags anything past 2.2x those medians.

Current findings, **16 of 18 in the original 32 biomes**:

| Biome | boss/std | comment |
| --- | --- | --- |
| Marais de Liurnia | **x84.6** | 78 hp standard, 6600 hp boss |
| Chateau du Lion Rouge | **x55.6** | Radahn at 10000 against 180 hp trash |
| Tertre Draconique | x30.2 | |
| Peninsule larmoyante | x29.5 | |
| Riviere Ainsel | x28.9 | |
| Academie de Raya Lucaria | x25.0 | |

Sharpest jumps between consecutive biomes: Nokron **x8.0**, Riviere Ainsel
x5.5, Lac de la Putrefaction x5.4, Entree de Caelid x4.7.

### `tools/simulate-balance.mjs` — plays the game headless

Runs the **real** `getEffectiveStats()` (items, sets, traits, rebirth,
stat conversions) and greedily equips the best 3-piece loadout out of what the
cleared biomes could have dropped. It then farms each biome, counting the
cycles needed before its boss becomes beatable.

The combat loop is reimplemented, because the real one is async and
UI-coupled. It mirrors `combat.js` in order and was checked against the live
game: at 150 intelligence against 200 armor, the game deals 138 per hit, the
model predicts 138.

It does **not** model ashes, blessings, item on-hit effects, statuses or boss
phases, so its absolute verdicts are pessimistic — a biome it calls playable
certainly is; a biome it calls a wall is worth looking at. Its **relative**
signal between builds and between biomes is the useful part.

`tools/headless-stub.mjs` provides the inert DOM both tools need. Import
`game.js` first: it is the real entry point, and that order avoids the temporal
dead zones of the `ui.js` / `core.js` import cycle.

## What the simulator found, and what it changed

Three **multiplicative loops** the tool surfaced, none of which were visible by
reading the code:

1.  `silver_tear_mask` multiplied strength by `1 + floor(baseDex/5) * 0.046`,
    **unbounded**. At 154 dexterity that was already x2.38 on top of its x1.15.
    Now capped at +100%.
2.  Extra attacks were computed from **effective** dexterity, so dex-percent
    items fed the exponent: +21% dexterity gave +39% attacks, and every attack
    then multiplied all strength gained elsewhere. Now computed from **base**
    dexterity, which is also what dodge and item gates already use.
3.  Magic damage applied **per attack**, so dexterity and intelligence
    multiplied each other — the optimiser had a pure-dex build equipping
    intelligence gear. Magic now lands once per turn (`castsMagic: i === 0`).

**Curve smoothing.** Boss/standard ratios are now clamped into
`[x4.2, x16.8]` around the x8.4 median. Worst case went from **x84.6 to x17.1**.
Where a biome's standard monsters are exclusive to it, the correction was split
between raising the trash and lowering the boss, so story bosses keep their
weight. Where they are shared (`clayman`, Raya Lucaria's monsters), only the
boss moved — raising a shared monster would have changed several biomes at once.

`tools/apply-curve-fix.py` records exactly which monsters were touched.

### The root cause: strength was a sink

`tools/audit-conversions.mjs` counts how many items convert each stat into
another. The result explains everything the simulator measured:

| conversion | items |
| --- | --- |
| dexterity -> strength | 8 |
| armor -> strength | 6 |
| vigor -> strength | 5 |
| intelligence -> strength | 4 |
| **strength -> anything** | **1** |

Every path gave its own benefit **plus** strength. Investing in strength gave
strength alone, so it was strictly dominated — even the vigour build beat it.
No constant could fix that; the topology had to change.

Two levers were added, both on **base** stats so they cannot feed item loops:

*   **Strength grants flat armour penetration** (`base / 1.3`). Nothing else
    touches penetration, and it is worth most exactly where strength suffered:
    armoured late-game targets.
*   **Vigour grants boss mitigation** (`base / 900`, capped at 25%).
    `bossMitigation` already existed in the engine with no stat feeding it.

Then the eight dexterity conversions were rebased onto **base** dexterity and
their ratios cut by roughly 40%, and intelligence's magic went 0.8 -> 0.6.

**Result** — cycles to finish the game at equal investment:

| build | before | after |
| --- | --- | --- |
| Dexterite | 605 | 687 |
| Intelligence | 666 | 699 |
| Force | 918 | 717 |
| Vigueur | 764 | 725 |
| Trihybride | 794 | 844 |

The four pure paths sit within **5.5%** of each other, down from a 40%+ spread.
The trihybrid is now the slowest by 17%: specialisation is rewarded, which is a
deliberate outcome rather than a defect — but it is the number to watch if the
mix is meant to be competitive.

## Afflictions were the real endgame

Two afflictions deal a **percentage of the target's max HP**: frostbite (10%,
x0.7 on bosses) and death blight (originally 25%). Percentage damage does not
follow the damage curve — it grows with the target. Boss HP went x9 between
chapter I and chapter X; player damage did not.

Measured against the Elden Beast (78 000 hp), per turn at 6 attacks:

| source | before | after |
| --- | --- | --- |
| raw damage, good build | ~700 | ~700 |
| frostbite | **3 276** | 421 |
| death blight | **8 970** | 323 |

One death blight proc was worth 28 turns of normal damage. Afflictions were not
a complement, they were the only thing that mattered.

`AFFLICTION_CAP = 6` in `combat.js` now bounds any percentage affliction to six
times the hit that triggered it. Early on the percentage still binds (a small
monster's 10% is under the cap), late the cap binds. Death blight also went
25% -> 12%.

**Armour floor.** Penetration can no longer take armour below **25%** of its
original value. `armor` is clamped to 1 to avoid a division by zero, so any
penetration exceeding armour turned into a x100 multiplier. That cliff was
reachable: items stack up to 0.9 percent-penetration, and strength now grants
flat penetration too. Verified at 220 strength (169 penetration): armour 175
against 250 gives x1.85, not x100.

## Auditing conversions: watch the target list

`tools/audit-conversions.mjs` first tracked only the five main stats **as
targets**, and reported "strength converts into 1 thing". Widening the targets
to splash, crit, penetration and rune gain changed the ranking entirely:

| stat | conversions leaving it |
| --- | --- |
| intelligence | 13 |
| dexterity | 7 |
| vigor | 7 |
| armor | 6 |
| strength | 5 |

The strength fix still held up empirically (918 -> 776 cycles), but the
headline that justified it was wrong. Widen the target list before trusting
this tool.

The simulator also ignored splash entirely, which mattered: the average biome
group is **1.3**, and 8 items convert intelligence into splash. Its equipment
optimiser was scoring candidates against a single target, so it never picked a
splash item.

## Sound effects (`sfx.js`)

Nine sounds, deliberately few, from the itch.io pack in `assets/itch-assets`.
Three guards, all of them necessary:

*   **Throttle** per sound (`minGap`). Combat fires up to six attacks a turn;
    without it a dexterity build machine-guns the speakers. Measured: 20 rapid
    calls produce **1** play, one more after a 400 ms pause.
*   **Pool** of three `Audio` tags per sound, so two close hits overlap instead
    of cutting each other.
*   **Its own volume**, `save.sfxVolume`, separate from the music slider. Plenty
    of players mute one and keep the other.

Sounds hang off the animation hooks that already existed
(`playHeroCombatAttack`, `playEnemyDeath`, ...) rather than new call sites, so
there is one place to maintain. `playSfx()` never throws: a browser refusing
autoplay must not interrupt a run.

## Discord webhook — rotate it

`core.js` used to hold a live Discord webhook URL **in plain text**. A webhook
is not an API key: anyone holding it can post anything into that channel,
unauthenticated and unlimited. The repo is public.

The URL is out of the working tree, but **it is still in git history**
(commit `06ef90c`). The only real fix is to delete that webhook in the Discord
channel settings and create a new one.

Note also that a webhook cannot be called from the browser at all — Discord
sends no CORS header, which is why the old code routed through a third-party
proxy that saw every announcement. Reliable announcements need a small
server-side component holding the secret.

## Descriptions must match the code

`tools/audit-descriptions.mjs` compares the numbers an item's description
announces against the numbers its code actually contains. A lying description
is worse than no description: the player builds around it, and the mismatch is
invisible in review because text and code sit twenty lines apart and are almost
never edited together.

It found two distinct classes of error.

**Stale numbers.** Seven descriptions still announced the dexterity conversion
ratios from before the rebalance (30%, 25%, 65%...). The ratios were cut by
roughly 40%; the texts were not.

**Effects that were never written.** Six items promised a mechanic no code
implemented — "heals halved", "cancels the eternal-night dodge penalty",
"+60% against sleeping targets", "+25% against frozen targets", "death blight
builds twice as fast", "cancels the ashen veil". They had no `funcOnHit` and no
matching stat: the sentence was pure fiction.

Two were implemented (halved healing via a new `healReceivedMult` read by
`healPlayer`, and the death blight stacks via `funcOnHit`); the other four were
rewritten to state what the item really does.

An item that promises a *conditional* behaviour needs one of the three real
hooks — `funcOnHit`, `funcOnBeingHit`, `passiveStatusReduction` — or a stat the
engine already reads. Anything else is flavour text pretending to be a
mechanic.

## Judging a weapon: the rule, and three ways I got it wrong

**A weapon is judged on the build it serves, at damage per turn, with its own
conditions satisfied.** Anything less produces false alarms. I produced three
in a row on the same question, so the failure modes are worth recording.

1.  **Measured at 0 stats.** 24 weapons showed "0 strength, therefore 0 damage".
    But a converting or multiplying weapon is *supposed* to give nothing until
    you invest in its stat. Checked on the matching build at 40 points, every
    one beats fists: Cimeterre 37 vs 22 at dex 40, Baton de la Reine 35 vs 15
    at int 40.
2.  **Measured raw strength.** Twin Blades looked 5 strength behind fists — it
    grants a whole extra attack. Comparing one dimension of a multiplicative
    system proves nothing.
3.  **Ignored the items' own conditions.** Seven weapons still looked weak
    because they require e.g. 20 base dexterity *and* 10% base crit, and the
    test build had no crit points.

On the strength of the first false alarm I added a flat damage floor to four
weapons, which erased their identity as scaling weapons. All four were
restored. `git diff` on the mechanics is empty; only the descriptions changed.

The lesson is not about weapons. It is that a single-dimension measurement in
this engine is almost always wrong, because everything here multiplies.

## Known content oddities, not yet addressed

*   `wolf2`, `chanting_dame` and `servant_poison_companion` look unplaced but
    are **companions**, summoned alongside other monsters via the `companion`
    field. Any audit that only reads `monsters`/`rareMonsters`/`boss` will
    wrongly report them as orphans — deleting them would break three spawns.
*   `assets/sprites/insecte/insecte_idle_01.png` is clipped: the silhouette
    spans the full 64px cell, 6 pixels stuck to the left edge and 10 to the
    right. Pre-existing, surfaced by the edge check added to
    `validate_monster_frames.py`. One frame to redraw narrower.
*   Audit regexes over `biome.js` must be **case-insensitive**. Two stub biomes
    (`Leyndell_ash`, `erdTree`) hid behind a lowercase-only `^  [a-z0-9_]+:`
    pattern through several audits. They are gone now, superseded by the real
    chapter X, but the lesson stands.

## Sticky layers of the combat screen

Three elements are pinned to the bottom and must not overlap. Each reads the
height of the one below it, published by the `ResizeObserver` in
`watchCombatZoneHeight()` (`ui.js`) as `--combat-actions-height` and
`--combat-zone-height`:

1.  `#combat-actions` (retreat button) — `bottom: 0`, the floor.
2.  `#combat-zone` (sprites and HP bars) — above the actions bar.
3.  `.ash-container` — above both.

Hard-coding any of these heights breaks the stack as soon as the sprites or a
narrow layout change a row's height.

## The sprite flicker: the rAF loop re-armed itself

`SpriteAnimator.start()` used to end its tick with an unconditional
`this.rafId = requestAnimationFrame(tick)`, placed right after `this.step()`.

`step()` calls `stop()` when a non-looping animation ends, and the end of an
animation runs `onAnimationEnd`, which can reach game code and go as far as
`destroy()` — all synchronously, inside `tick`. So the cancellation was undone
in the same frame. A **destroyed animator kept ticking**, and `draw()` had no
`destroyed` guard, so it repainted the canvas forever. Two animators on
`#enemy-sprite` then alternate frame by frame: that is the flicker.

It is **not** boss-specific. Any non-looping animation — hurt, attack, death —
opens the door. I wasted two rounds hunting a boss-only race because the first
report happened to involve a boss.

`tick` now checks `destroyed` and a new `running` flag before re-arming, and
`draw()` bails out on a destroyed animator.

`tools/test-animator-loop.mjs` covers the four cases and **fails on the old
code** with `draw() sur un animateur DETRUIT` — always check a regression test
fails before trusting it.

### Do not measure animation in the driven browser

`requestAnimationFrame` is suspended while the Browser pane is hidden. Every
pixel-sampling probe I ran there reported "no flicker" because the loop was
frozen, not because the bug was gone. Drive the frames by hand in Node instead,
as that test does.

## Music: a shuffle bag, and a new track per section entry

Only the `ended` event used to advance the track. An expedition is far shorter
than a track, so `ended` almost never fired and the same song replayed forever.
The dungeon index also started at a hard-coded `0`, so every exploration opened
on `dungeon_song_1`.

A new track is drawn on each **entry** into a section, not on each call:
`playCampMusic()` is re-called on every tab switch, and re-starting playback
there would cut the music constantly. A `currentSection` flag separates the two.

The draw goes through a shuffle bag, so every track plays before any repeats,
and the last one played never heads the next bag.

Files live in `assets/music/`. Adding one is a single line in `campSongs` or
`dungeonSongs` — no naming convention to respect.

## Per-track gain (`TRACK_GAIN` in `ui.js`)

Generated tracks came back spanning 5.1 dB — from -12.9 dBFS RMS
(`camp_song_7`) to -18.0 (`dungeon_song_4`). The volume slider writes the same
value to both `Audio` elements, so every camp/expedition switch jumped.

`applyTrackVolume()` multiplies the master volume by a per-track gain. Two
things constrain the table:

- **`HTMLMediaElement.volume` throws above 1**, so gains can only attenuate.
  There is no boosting a quiet track without Web Audio and a `GainNode`, which
  is not worth the rewiring here.
- The target is therefore **-16 dBFS with a clamp at 1**. Tracks already below
  the target keep gain 1 and sit up to 2 dB under it, which is inaudible.
  Aligning everything on the quietest track would have closed the gap
  completely but cost 5 dB of headroom across the whole game.

Residual spread: **2.0 dB**. A track missing from the table plays at full gain,
so adding music without measuring is safe.

Recalibrate with `tools/mesure-volume.js` — a console snippet, not a Node
script: decoding mp3 outside a browser needs ffmpeg, which this machine lacks.
It prints the `TRACK_GAIN` block ready to paste.

The volume is read from `gameState` on every call rather than cached in a
module variable: `playCampMusic()` fires at load, before the options slider is
initialised, and two sources of truth drift apart.

## The narrator button

`toggleNarrator()` in the Audio panel of the options. Three things it has to
get right:

- **One narrator at a time.** A single `narratorAudio` element, plus a
  `narratorPlaying` flag; `playCampMusic()` and `playDungeonMusic()` return
  early while it is set, so entering an expedition mid-narration does not stack
  music over the voice.
- **Resume in the right section.** `endNarrator()` reads `currentSection`, not
  wherever playback started — the player may have left camp during the 1 min 47.
  Verified: start in camp, leave on expedition, and the dungeon track is what
  comes back.
- **A second press stops it.** Nearly two minutes is too long to be stuck in.

`onerror` routes to `endNarrator` as well, so a missing file leaves the game
with music rather than silence.

## Conversions must read the BASE stat, never the effective one

`gameState.stats.X` is what the player invested. `stats.X` is the running
effective value, already raised by every item applied so far — including the
item doing the conversion.

Reading the effective value builds a loop. The Queen's Staff applied
`stats.intelligence *= 1.1`, then converted 58% of the *effective* value into
strength. At 48 invested intelligence it returned **42 strength with zero
points spent on strength** — 87% of what a pure strength build gets from
spending all 48 — and magic damage on top, which ignores armour because it is
added after the armour division.

That, not the magic formula, is why intelligence dominated the first 25 levels.
Fixed on the Queen's Staff, Astronomer's Staff, Sickle, and the three later
shard staves.

`tools/audit-boucles.mjs` finds the rest. **Twelve conversions still read the
effective stat** — mostly into `splashDamage`, plus four `vigor -> strength`
and one `dexterity -> strength`. Those last five are left alone deliberately:
fixing them would nerf vigour and dexterity, which are already the weakest
early. Loops and ratios have to move together, never one without the other.

Watch the shape of the regex when auditing this. The first version looked for
`Math.floor(` immediately followed by `stats.X` and found **nothing**, because
the stat is often on the right of the multiplication and the call often spans
several lines. A clean "no problems found" from a pattern this narrow means
nothing.

## Early-game balance is not visible in the full simulator

`simulate-balance.mjs` farms to level 55 before facing Godrick. A real player
gets there around 24. Whole-run totals therefore hid a large imbalance in the
first tier — the four pure builds sat within 11% over 46 biomes while
intelligence was ahead of everything for the first 25 levels.

`tools/diag-debut.mjs` freezes a level and the items reachable before the boss,
and compares the four builds there.

**Trust it only early.** Its damage model treats attacks per turn as a plain
multiplier; with the full item pool at level 220 it reports 113,959 damage per
turn for dexterity, which the real simulator flatly contradicts. It also cannot
reproduce a player's actual screenshot exactly. What it gives is a *relative*
comparison under one identical method, which is enough to size a gap and not
enough to state an absolute.

After the fixes: early spread x1.8-2.0 -> x1.5, whole-run spread across the
four pure builds 11.1% -> 8.8%.

## Item icons are a lookup table, and 48 entries are missing

`getItemIcon` returns null when the id is absent from `WEAPON_CELLS` /
`ARMOUR_CELLS` / `ACCESSORY_CELLS`, and the UI draws a hatched square. Nothing
warns; it shows up only when a player picks the item up.

All 48 gaps are content added for the complete version — 14 weapons, 14
armours, 14 accessories, 6 ashes — and every one sits 8 to 17 biomes from the
start. `tools/audit-icones.mjs` lists them sorted by how early they appear.

## Four requirements per item — `tools/audit-items-complet.mjs`

Every item must have an icon, a description that states its numbers, level
scaling unless `isAlwaysMax`, and an effect the engine actually reads.

**Describe the value AT LEVEL 1**, not the literal in the code. `30 + itemLevel
* 4` is announced as "+34 Armure (+4 / Niv)". Announcing "+30" would be wrong:
that value never occurs at any level.

`isAlwaysMax: true` is the codebase's own answer to "an item without scaling".
An item carrying it is always at max level and has nothing to vary; anything
else that ignores `itemLevel` silently wastes the player's upgrade runes.

### The audit lied to me four times before it was usable

Each false positive taught the same lesson — a probe must resemble a real
character:

- probing with **stats at zero** made every conversion return 0 at both levels:
  44 items looked unscaled;
- starting from **armour 10** hid a +0.5%/level scaling inside `Math.floor`;
- several items require a minimum of **base crit** to activate, so their branch
  never ran;
- **resistances at zero** did the same to items that sum resistances.

Then the comparison approach itself failed: scaling often lives behind a
`Math.random()` that does not fire during a probe, or behind a cap already
reached. The check is now **static** — does the item body mention `itemLevel`
at all? No false positives, and it is certain.

`audit-descriptions.mjs` had the mirror problem: it searched for literals, so
the level-1 values above looked absent and it reported 68 false positives. It
now evaluates each item at levels 1 and 10 and treats the produced values as
present. Strong suspicions: 20 -> 1.

### Fictional effects found

- **Marionette Mask** wrote `stats.dodgeChance` and announced +5% dodge, but
  nothing read the key — player dodge came only from
  `gameState.stats.dexterity / 400`. The stat is now real and capped together
  with the dexterity share at 50%.
- **Giant-breaker Maul** ran `stats.attacksPerTurn = Math.max(1,
  stats.attacksPerTurn)`, a no-op, while promising a slower cadence. The malus
  is now applied.
- **Godslayer Greatsword** claimed to eat a share of a boss's maximum HP; it
  only applies Burn. **Scarlet Bloom Charm** claimed to extend afflictions; it
  does not. **Wayfarer Talisman** promised rarer loot; it only gives runes.
  Descriptions corrected to what the code does.
- **Jarburg Charm** announced +40% runes and gives 43% at level 1.

One key is exempt: `customStunChance` is not an engine stat but the Nokron
Flaming Dagger writes it and reads it back itself.

## Item icons

All 147 items and 18 ashes have a cell. The 48 that were missing came from the
complete-version content; every one was found in the existing sheets, so **no
SVG fallback was needed**.

The accessory sheet was full (42 of 48 cells, the last 6 empty) and is
regenerated at 8x7 by `tools/build_accessory_atlas.py`. Its rendering depends
only on the shape/palette pair, so two accessories sharing that pair produce
the **same image** — five collisions on the first attempt.

`tools/audit-icones.mjs` finds missing cells; `tools/audit-icones-doublons.mjs`
finds shared or empty ones, which the first cannot see. Choosing cells by eye
put two items on cells already taken. One share is deliberate and predates
this: fists reuse the gauntlet.

The armour sheet holds only chest pieces, so the Serpent King Crown and the
Haligtree Crest Shield were showing as breastplates. They now come from
`armour-extras.png`, drawn with the same `pixelart.py` pipeline as the
accessories rather than as SVG: an SVG would be the only smooth image among 164
pixel-art icons, and would need its own render path. An `ARMOUR_CELLS` entry may
carry a third element naming another sheet.

Drawing 16x16 shapes against `render_cell` has one trap worth knowing: it
shades by VERTICAL POSITION, lightening the accent in the top third and
darkening it below. A gem placed low in the crown's band came out darker than
the metal and read as a hole; the shield's tree canopy, placed high, merged
with the already-light top of the shield. Both were fixed by moving the accent,
not by changing colours.

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
