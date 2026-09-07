## 1. 洋基球場 — 可探索的 3D 球場

Yankee Stadium — the new stadium in the Bronx, built as an explorable 3D world. Fly through the Great Hall, down onto the field, out to Monument Park, or up into the upper deck.

```
Build YANKEE STADIUM as a single HTML file using Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js). A flyable 3D recreation of the 2009 Yankee Stadium in the Bronx.

EXTERIOR:
- The stadium exterior: a large oval/rounded-rectangle footprint, 5 levels of white/limestone-colored facade
- Classical frieze detailing: use repeated arch/column patterns around the top of the exterior
- Exterior lighting towers at intervals
- The Great Hall entrance (main entry on the south side — tall arched opening)

INTERIOR FIELD LEVEL:
- Playing field: bright green grass (MeshStandardMaterial, #2d8020)
- Accurate baseball diamond: white baselines, white bases (BoxGeometry, slightly raised), pitcher's mound (small hemisphere), home plate
- Warning track: reddish-brown clay ring around the grass (#8b5a2b)
- Outfield wall: padded blue wall (use Yankee blue #1e3a6e)
- The short porch in right field: the famous 314ft right field line

GRANDSTANDS:
- Three tiers of seating — field level, main deck, upper deck
- Seats: InstancedMesh of small box seats in navy blue, filling all tiers
- The Main Deck facade: the famous white copper frieze pattern along the main deck roof edge
- Suite windows: golden-lit horizontal strips in the mezzanine level

CENTERFIELD:
- Giant scoreboard/video board above centerfield
- Monument Park visible just beyond the centerfield wall: small monument plaques on a flat plaza (Babe Ruth, Lou Gehrig, Mickey Mantle — labeled text planes)

VISUAL STYLE:
- Daytime game — bright sunlight from the south
- Yankee colors: navy blue (#1e3a6e), white, grey
- Crowd: InstancedMesh of colored small cylinders in the seats (mix of navy and grey)

CONTROLS: WASD + pointer-lock mouse, free flight. Start the player at field level behind home plate. Toast: "YANKEE STADIUM — The Bronx". Press P to animate a pitch (fast-moving white sphere toward the plate).
```

---

## 2. VOXELCRAFT — 功能最完整的 Minecraft 仿作

The most feature-complete Minecraft clone — parallel-built with multiple AI agents. Full tool tiers (wood→diamond), crafting grid, furnace, mob spawning, day/night cycle, and localStorage save/load.

```
Build a complete Minecraft-style voxel survival game called VOXELCRAFT in a single HTML file. Vanilla JS + WebGL (or Three.js via ESM import map at unpkg.com/three@0.160.0). No external assets.

CORE WORLD SYSTEM:
- Chunk-based infinite terrain (16x16x256 chunks), Perlin noise heightmap
- Block types: Air, Grass (top/side/bottom textures), Dirt, Stone, Sand, Gravel, Wood (log), Leaves, Water, Lava, Ore blocks (Coal, Iron, Gold, Diamond, Emerald), Bedrock
- Greedy meshing for chunk geometry (merge adjacent same-block faces)
- Biome variation: plains, forest, desert, mountains
- Caves: 3D Perlin noise carving underground

GAMEPLAY:
- Break blocks: hold left mouse (progress bar), place blocks: right mouse
- Tool tiers: Wood → Stone → Iron → Gold → Diamond (each breaks different block types, with durability)
- Inventory: 9-slot hotbar + 4x9 backpack grid, press E to open
- Crafting: 2x2 grid at hand, 3x3 at crafting table
- Smelting furnace: place ore + fuel → refined material
- Health (10 hearts) + Hunger (10 drumsticks) bars
- Fall damage, drowning, burning

MOBS:
- Passive: Pig, Cow, Sheep (drop food when killed)
- Hostile: Zombie (slow, melee), Skeleton (ranged arrows), Creeper (approaches, explodes — removes blocks), Spider (can climb)
- All with simple patrol/aggro AI

DAY/NIGHT CYCLE:
- 20-minute full cycle, dynamic sky color shift
- Mobs spawn at night, burn at sunrise

SAVE/LOAD: localStorage — auto-save every 30 seconds, load on page refresh

CONTROLS: WASD move, Space jump, Shift crouch/sneak, E inventory, Left click break, Right click place, 1-9 hotbar slots. Pointer-lock FPS view.
```

---

## 3. TERRAVOX — 從零重寫的體素世界

A from-scratch Minecraft clone built without following the VOXELCRAFT pattern. The visual quality comes from two specific tricks: padded texture atlas with mipmaps, and cutout-but-opaque leaves that look lush without transparency sorting.

```
Build TERRAVOX, an original Minecraft-style voxel world, as a single fully self-contained HTML file (must work offline — no CDN, inline all JS). Use raw WebGL or Three.js embedded.

KEY VISUAL QUALITY TRICKS (these are what make it look good):
1. PADDED TEXTURE ATLAS: Each block face texture has 1-2px padding in the atlas to prevent texture bleeding at chunk seams. Pack all textures into a single canvas-generated atlas.
2. MIPMAP LEAVES: Leaf textures use a cutout approach — the texture alpha is either 0 or 1 (no partial), rendered with alphaTest=0.5, but the leaf MESH itself is opaque (not transparent). This prevents Z-sorting artifacts while keeping leaves looking lush.
3. PBR LIGHTING: MeshStandardMaterial with ambient occlusion baked per-vertex (darker at block bottom edges, lighter at top).

WORLD:
- Perlin noise terrain (plains, forest, hills)
- Block types with distinct canvas-drawn textures: Grass (green top, brown sides, dirt bottom), Dirt, Stone, Wood, Leaves (using the padded mipmap technique), Water (flat plane, not voxel), Sand
- Trees: 4-log trunk, 3x3x3 leaf cluster on top
- Simple greedy mesh chunks (16x16x128)

GAMEPLAY:
- First-person movement (WASD + pointer-lock mouse)
- Break blocks (left click + hold), place blocks (right click)
- Hotbar of 6 block types
- Day/night cycle with sky color shift

DELIVER as a single .html file that works by opening directly in a browser with no server. Embed Three.js inline or use an approach that doesn't need network access.
```

---

## 4. MINEFALL — 內建除錯 API 的體素世界

The third Minecraft clone — intentionally a fresh start, not a copy. Notable for the built-in debug API: window.__mf exposes forceChunks(), render(), and state inspection for automated testing even when the tab is hidden.

```
Build MINEFALL, an original Minecraft-style voxel survival game, as a single HTML file served at port 5620. Use Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js).

CRITICAL FEATURE — DEBUG API:
Expose window.__mf = { forceChunks(x,z,r), render(), getState(), spawnMob(type,x,y,z), setBlock(x,y,z,type), getBlock(x,y,z) } so the game can be tested programmatically even when the browser tab is hidden (requestAnimationFrame stops firing in hidden tabs, so render() forces a single frame).

WORLD GENERATION:
- Biome system with 4 biomes: Plains (flat, grass), Forest (trees, slight hills), Desert (sand, cacti, no trees), Mountains (steep rocky terrain, snow cap above y=80)
- Ore veins: Coal (y 0-60), Iron (y 0-40), Gold (y 0-30), Diamond (y 0-16)
- Structure generation: Villages (4-8 houses, dirt path between), Dungeons (underground room with mob spawner + chest)

CORE GAMEPLAY:
- Break/place blocks, full inventory (press E), crafting (press C at any crafting table)
- Tool durability system
- Health + hunger bars
- Hostile mobs (Zombie, Skeleton with arrows, Creeper with explosion damage) — despawn when far from player
- Death screen with respawn button (keep inventory)

VISUAL:
- Sky gradient (day: light blue, dusk: orange/red, night: deep blue with star points)
- Basic torch lighting (point light when torch placed)
- Water: flat translucent blue plane per water column top

CONTROLS: WASD + pointer-lock mouse, E inventory, C crafting, F3 debug overlay (shows chunk coords, fps, block you're looking at). Include ?test in URL enables window.__mf exposure.
```

---

## 5. WYRD — 讓 AI 當地下城主的地城遊戲

WYRD turns Claude itself into a dungeon master. Type any spell into the spellbar and the LLM evaluates whether it works based on context, your skill, and the situation. The world is static; the outcomes are not.

```
Build WYRD, an LLM-powered dungeon RPG, as a single HTML file using Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js) and the Claude API for the dungeon master system.

CONCEPT:
The player explores a 3D dungeon world. An LLM dungeon master evaluates spell attempts in real-time — the player types a spell, the LLM responds with: {verdict: "success"|"fail"|"partial", narration: "...", effect: "..."} and the world responds accordingly.

3D WORLD:
- Surface town: Inn (NPC: Oswin — friendly, gives quest "The Thing in the Dark"), Blacksmith (sells gear), Well, Dungeon mouth to the north
- Dungeon: 3 floors of stone corridors with torch lighting (point lights, flickering animation). Floor layout is semi-random per load.
- Enemies: Skeletons (patrol), Brute (the quest target — heavy armored figure in the deepest room)

GRIMOIRE SYSTEM:
- Player types spells into a text input bar (bottom center)
- 9 bindable spell slots (click ★ to bind current spell to a number key 1-9)
- Spell history panel on the right shows last 5 casts + outcomes
- The LLM receives: {spell: "...", context: "standing in dungeon level 2, skeleton approaching", playerStats: {...}, gameState: "..."}
- LLM returns: verdict, narration, and optional gameEffect (damage number, heal, unlock door, etc.)

LLM INTEGRATION:
- Use the Anthropic Messages API (claude-haiku-4-5 for speed)
- System prompt: "You are a dungeon master for WYRD. Adjudicate spell attempts with narrative flair. Consider context, player level, and logical spell effects. Return JSON: {verdict, narration, reason, gameEffect}"
- The API key should be loaded from a config at the top of the file (const CLAUDE_API_KEY = '')

VISUAL STYLE:
- Dark dungeon — black/deep grey stone, warm orange torch pools
- Rune-carved walls (texture using canvas-drawn runes)
- Spell effects: particle burst on success, smoke puff on fail

CONTROLS: WASD + pointer-lock mouse. Tab = open Grimoire panel. Enter = cast typed spell. 1-9 = cast bound spell slot. Show spell narration as floating text that fades.
```

---

## 6. OSRS RPG — 古老世紀 RuneScape 風小鎮

A love letter to Old School RuneScape — a lowpoly town slice with OSRS's iconic warm palette, chunky character models, NPC pathing, skill bars, and the unmistakable Lumbridge aesthetic.

```
Build "LOWPOLY TOWN — an OSRS-like slice", a single HTML file using Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js). Capture the exact feel of Old School RuneScape.

OSRS AESTHETIC:
- Lowpoly geometry — everything has very few polygons, visible facets
- Color palette: bright saturated flat colors (no PBR), like a 2001 game upscaled
  - Grass: #4a9a3a, Tree leaves: #2a7a20, Stone: #8a8078, Wood: #8a5a28, Water: #1a5a9a
- No shadows from geometry — use vertex colors for "fake" ambient occlusion
- Characters: Box-based (head box, torso box, limb boxes), exactly like OSRS blocky style

TOWN LAYOUT:
- Lumbridge-style: central castle, river to the east with watermill, market area, church/chapel
- Castle: square keep, 4 corner towers, courtyardd entrance with drawbridge
- Market: 8-10 market stalls arranged in a grid, NPC merchants standing still
- Bank: a sandstone building with blue banker NPCs inside
- General Store, Fishing spot on the river
- Goblin camp just outside the south town wall

NPC SYSTEM:
- 20+ NPCs walking predefined paths using a waypoint system
- Types: Citizens (random walk), Guards (patrol walls), Goblins (camp pathing)
- Click an NPC → dialogue panel appears with OSRS-style chat options

SKILLS UI:
- Right-side panel showing OSRS skills: Attack, Strength, Defence, Ranged, Magic, Prayer, Cooking, Fishing, Woodcutting, Mining, Smithing — all at level 1 with XP bar
- Classic OSRS skill icon colors

CONTROLS: WASD or click-to-move (hold right mouse + WASD for camera rotation). Click NPCs/objects to interact. Classic OSRS cursor on hover. Match the retro pixel-art UI style.
```

---

## 7. BREAKTHROUGH — GLSL 碎形視覺

BREAKTHROUGH — a peak psychedelic experience simulation using real GLSL Kali-fractal mathematics. Five phases from onset to breakthrough to return. Geometric entities emerge. Everything is procedural shader mathematics.

```
Build BREAKTHROUGH — a peak DMT simulation — as a single HTML file using Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js) with inline GLSL shaders.

VISUAL SYSTEM:
- Full-screen shader pass (use Three.js ShaderMaterial on a quad)
- Base fractal: Kali-set (Kaleidoscopic IFS) — 6-fold symmetry, recursive self-similar geometry
- The fractal evolves over time — parameters animate slowly (fold count, scale, offset)

5 TRIP PHASES (advance with Space bar):
1. ONSET (0-60s): Slow gentle fractal patterns, muted blues and purples, slight movement
2. COMING UP (60-120s): Patterns speed up, colors saturate, tunnel effect emerging
3. ACCELERATION (120-180s): Full tunnel, geometric complexity maxes out, rainbow bloom
4. BREAKTHROUGH (at phase 4): White flash → full open fractal realm. Geometric entity beings emerge (bright crystalline shapes orbiting screen center). Colors are electric: magenta, cyan, gold
5. RETURN: Slow fade, patterns simplify, soft blues return, fade to white/black

ENTITY SYSTEM (Phase 4):
- 8 geometric "beings" — each is an instanced recursive tetrahedron/octahedron shape
- They rotate, pulse, and appear to gesture/wave (sine-wave animation on their position)
- Machine elf aesthetic: faceted crystalline, bright emissive material

AUDIO (Web Audio API):
- Base drone: 55Hz sine wave (low rumble)
- Harmonics: 110Hz, 165Hz at lower volume
- Phase transitions: pitch shift up
- Onset → Breakthrough: slow LFO on drone frequency (vibrato)

POST-PROCESSING:
- Bloom: bright areas glow and bleed (use UnrealBloomPass or custom shader)
- Additive blending for the entities
- Chromatic aberration: RG channels offset by 2-3px at edges

CONTROLS: Space = advance phase. R = restart. The experience is mostly passive — sit back and let it happen. Full-screen, no UI except a subtle phase name in the corner (small, fading text).
```

---

## 8. 機械玫瑰 — 蒸汽龐克互動藝術

MECHANICAL ROSE — a steampunk clockwork art piece. The rose starts as a closed bud of interlocking gears. Click to begin the bloom animation — brass petals unfold, gears spin, steam vents, and mechanical birds perch on the stem.

```
Build MECHANICAL ROSE, a steampunk clockwork art piece, as a single HTML file using Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js).

THE ROSE STRUCTURE:
- Stem: a coiled copper tube (TubeGeometry following a helical path), wrapped with thin copper wire (smaller tube following tighter helix)
- Edison bulb lights along the stem: small sphere glass + tungsten wire inside, warm amber emissive glow
- Thorns: 6 small angular protrusions along the stem

PETALS (5 layers, 5 petals per layer = 25 total):
- Each petal is a CatmullRomCurve3 extruded shape — thin, curved, with visible gear teeth along the edges
- Material: brass (#b8860b) MeshStandardMaterial, metalness 0.9, roughness 0.3
- Petal hinge: a visible gear joint where each petal connects to the center
- When CLOSED (initial state): all petals fold inward, forming a tight bud
- When OPEN: petals rotate outward and back on their hinge axes (animation)

THE CLOCKWORK HEART (center of rose, revealed when fully bloomed):
- A sphere of interlocking gears — 12 gears of varying sizes, all spinning at different rates
- Emissive golden glow from the heart
- A compass rose pattern on the largest gear (canvas texture)

GEAR ANIMATIONS:
- 8 large decorative gears visible throughout the piece, all spinning (different speeds, alternating CW/CCW where meshed)
- Gears: TorusGeometry for ring + custom teeth using repeated BoxGeometry

STEAM EFFECTS:
- 4 steam vents (copper tube openings at petal base)
- Steam: upward particle system (white low-opacity spheres, fade out over 2 seconds)

MECHANICAL BIRDS (2):
- Small bird shapes perching on stem thorns — box body, wing planes, gear eyes
- Slowly animate: head tilt, wing flap cycle

BLOOM SEQUENCE (on click):
- Petals animate open over 3 seconds (staggered — outer petals first)
- Gears spin up in speed during opening
- Steam releases from vents
- Heart glow intensifies as last petals open
- Click again: rose closes

CONTROLS: Mouse drag to orbit, scroll to zoom. Click rose to bloom/close. Autorotate slowly when idle. Warm spotlight from above, rim light from below.
```

---
