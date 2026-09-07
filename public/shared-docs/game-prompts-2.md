## 1. 雪漫城 —《上古卷軸5》

*WHITERUN*

A flyable recreation of Skyrim's Whiterun — tiered Nordic city built on raised rocky terrain, with Dragonsreach on the summit, the Wind District marketplace below it, and the main gate at the base. All geometry is procedural Three.js.

```
Build WHITERUN from The Elder Scrolls V: Skyrim as a single HTML file using Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js). No external assets — all geometry is procedural.

WORLD LAYOUT (3 tiers on raised terrain):
- Bottom tier: Main Gate (arched stone entrance), outer walls with battlements and watchtowers, Warmaiden's forge and market stalls
- Middle tier (Wind District): The Gildergreen — a massive dead ancient tree in the center plaza, surrounded by market stalls, Breezehome (player house), Dragonsreach steps begin here
- Top tier: Dragonsreach — the Jarl's longhouse/palace spanning the entire peak, with a large porch overhang, pillars, and the iconic angled timbered roof

ARCHITECTURE:
- Nordic longhouses: stone base, dark timber frame, steep angled roofs (use BoxGeometry + CylinderGeometry for rooflines)
- Warm firelight in windows (emissive orange dots)
- Stone walls with crenellations along the top
- The Gildergreen: twisted bare tree trunk, no leaves, 3x human height

VISUAL STYLE:
- Skyrim palette: grey stone (#8a8c8e), warm wood (#6b4c2a), pale morning sky (#b8c8d8)
- Distant backdrop: snow-capped Throat of the World mountain silhouette
- Ground: patchy snow and dirt
- Ambient fog in the lower city areas
- Directional warm sunrise light from the east

CONTROLS: WASD + pointer-lock mouse for first-person flight. Space/Shift to ascend/descend. E near buildings shows "Enter [building name]" prompt. Press Escape to release mouse.

Show a welcome toast "WHITERUN — Whiterun Hold" on load. Make the city feel vast and cold.
```

---

## 2. 北境 — 臨冬城與絕境長城

*THE NORTH*

A single flyable world containing three iconic locations from Game of Thrones: Winterfell with its great hall and Godswood, the 700-foot Wall of ancient ice, and Castle Black at its base.

```
Build THE NORTH from Game of Thrones as a single HTML file using Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js). Three locations in one continuous world.

LOCATION 1 — WINTERFELL (world center):
- Outer curtain wall (grey stone, battlements, 4 corner towers with flags)
- Great Hall: long rectangular building with peaked timber roof, tall arched windows with warm firelight glow
- Godswood: circular clearing with a massive Weirwood tree — white-grey bark, deep red leaves (use PlaneGeometry leaf clusters, red MeshBasicMaterial)
- Covered walkways connecting towers
- Smithy, stables (simple box shapes), well in the courtyard

LOCATION 2 — THE WALL (far north, positioned 800 units north of Winterfell):
- A sheer wall of ice 200 units tall x 2000 units wide — translucent blue-white MeshPhysicalMaterial with opacity ~0.85
- Surface texture: vertical crack lines, frost buildup
- Castle Black at the Wall's southern base: black stone towers, training yard, Lord Commander's tower
- The massive wooden lift mechanism on the Wall's face

LOCATION 3 — FOREST BETWEEN:
- Dense pine forest (dark cones) connecting the two locations
- King's Road: a dirt path cutting through

SKY: Dark grey overcast with a hint of aurora borealis (green/teal light wisps on the northern horizon).
GROUND: Snow and permafrost — white/light grey terrain with slight undulation.
ATMOSPHERE: Fog that thickens toward The Wall. Everything feels cold and forbidding.

CONTROLS: WASD + pointer-lock mouse, free flight. Show location name when approaching each area. Toast on load: "THE NORTH — Winter Is Here".
```

---

## 3. 君臨 — 紅堡

*KING'S LANDING*

The capital of the Seven Kingdoms — a sprawling Mediterranean walled city with the Red Keep on the clifftop, Blackwater Bay below, the Sept of Baelor in the center, and dense urban streets throughout.

```
Build KING'S LANDING from Game of Thrones as a single HTML file using Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js). Everything procedural — no external assets.

GEOGRAPHY:
- The city sits on a promontory above Blackwater Bay — steep cliffs on the south/east sides
- Blackwater Bay: flat water plane (deep blue-green MeshStandardMaterial, slight metalness), ships at anchor (simplified hull + mast shapes)
- Terrain: gentle hill rising from the city walls to the Red Keep on the clifftop

THE RED KEEP (clifftop, northeast):
- Massive crimson-red stone castle — use a warm red (#8b2020) for all stone
- 4 large towers + central keep, battlemented walls
- The throne room: a large rectangular hall accessible by flying through the main gate
- Dragon skulls: long low-poly skull shapes arranged in the throne room

CITY (within the walls):
- City walls with the King's Gate (main entrance), River Gate (bay side)
- The Sept of Baelor: domed cathedral, 7 spires, white stone — placed in the city center
- Dense procedural housing: 200+ small box buildings with terracotta rooftop geometry, packed close together
- The Street of Steel (smithy district), Fleabottom (denser/darker housing)
- Market squares with stalls

VISUAL STYLE:
- Warm Mediterranean light — golden late afternoon
- Red Keep: deep crimson (#8b2020)
- City buildings: warm sandstone/terracotta (#c4956a, #d4a574)
- Bay: deep blue-green water with subtle wave animation
- Haze over the city from cookfires

CONTROLS: WASD + pointer-lock mouse, free flight. Soar from the bay up to the Red Keep. Toast: "KING'S LANDING — The Red Keep".
```

---

## 4. 米那斯提力斯 — 剛鐸白城

*MINAS TIRITH*

The White City of Gondor — seven concentric stone rings carved into the slope of Mount Mindolluin, rising to the Citadel and the Tower of Ecthelion at the summit. The most architecturally complex build in the library.

```
Build MINAS TIRITH, the White City of Gondor from The Lord of the Rings, as a single HTML file using Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js).

STRUCTURE (7 levels, each higher than the last):
- All stone is white/pale grey (#dce0e8, #e8ecf0) — this is the white city
- The mountain: Mount Mindolluin rises behind the city as a large grey cone/shape
- Level 1 (base): The Great Gate — massive iron-grey double doors in the outer wall. Wide lower ring with housing
- Levels 2–6: Progressively smaller rings, each with housing blocks (use BoxGeometry arrays), gates leading up
- The Prow: a sharp rock wedge/fin of stone that cuts between all 7 rings on the south face — a long triangular protrusion
- Level 7 (summit): The Citadel — a fortified palace complex with the Tower of Ecthelion: a tall, slender white spire with a star-shaped top
- Banners: thin PlaneGeometry rectangles in black (Gondor = black tree on white — use emissive white plane with a black circle)

SURROUNDINGS:
- Pelennor Fields: a wide flat green/brown plain stretching south from the city walls
- The Anduin river: a silver-grey ribbon cutting through the fields
- Minas Morgul visible as a faint green-glowing spire in the far southeast

VISUAL STYLE:
- Golden dawn/dusk light (DirectionalLight warm orange from the east)
- The tower glows softly white at the very top
- Atmosphere: slight haze over the plains

CONTROLS: First-person WASD + mouse, free flight. Player can fly through each gate level upward. Toast on load: "MINAS TIRITH — City of Gondor". Make it feel like you're approaching from across the Pelennor.
```

---

## 5. 哈比屯 — 夏爾

*THE SHIRE*

Hobbiton — the most pastoral and cozy build in the library. Rolling green hills dotted with hobbit holes, Bag End at the top of the hill, the Party Tree in the field, and a lazy river winding through.

```
Build THE SHIRE — specifically Hobbiton from The Lord of the Rings — as a single HTML file using Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js).

SCENE LAYOUT:
- Rolling green hills as the main terrain (use SphereGeometry or custom heightmap with Perlin-like displacement)
- BAG END HILL: the tallest hill at scene center-north. Bag End is carved INTO the hillside — a round green door (CylinderGeometry disc, painted green), round window beside it, small garden of flowers on the hill slope
- 12–15 OTHER HOBBIT HOLES: smaller versions scattered along the hillsides — each with a round door (different colors: yellow, red, blue, green), flower garden, wooden mailbox

KEY LANDMARKS:
- The Party Tree: a massive, full, round-canopied oak in the flat field east of Bag End hill (use many SpherGeometry leaf clusters, green)
- Bywater Mill: a watermill on the stream, large wooden wheel turning slowly (animate rotation)
- The Green Dragon Inn: a low hobbit-style building near the bridge, warm amber window glow
- Stone bridge over the stream
- Bywater stream/river: a flat water plane winding through the scene, slight blue-green tint

VISUAL STYLE:
- Lush English countryside — deep greens (#2d6030, #4a8040), golden meadow grass (#c8b060)
- Golden afternoon sunlight (warm DirectionalLight from the southwest, long shadows)
- Fluffy clouds (white SphereGeometry clusters slowly drifting)
- The whole scene should feel warm, magical, and impossibly cozy

DETAILS:
- Vegetable gardens (small green box rows) beside each hobbit hole
- Wooden fences along garden paths
- Smoke rising lazily from chimneys (simple particle emitters, upward drift)
- Sheep grazing in the far fields (low-poly white blobs)

CONTROLS: WASD + pointer-lock mouse, first-person flight. Toast: "THE SHIRE — Hobbiton". Make the scale feel intimate — hobbit architecture is small and low to the ground.
```

---

## 6. 死星 — 星戰 DS-1 戰鬥站

*DEATH STAR*

DS-1 — the Death Star from Star Wars. Full spherical station with the superlaser dish on the northern hemisphere, the equatorial trench, exhaust port, and surface detail panels throughout. Press F to fire.

```
Build the DEATH STAR (DS-1 Orbital Battle Station) from Star Wars as a single HTML file using Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js).

THE STATION:
- A large sphere (radius ~1500 units) as the main hull — grey metal color (#5a6070)
- Hull surface: tile it with a 32x32 grid of thin rectangular panel lines (use a canvas texture or MeshStandardMaterial with grid pattern)
- Greebling: scattered box protrusions of different heights on the hull surface (use InstancedMesh for performance, ~500 greeble boxes)
- Add antenna arrays (long thin cylinders) at various points

SUPERLASER DISH (northern hemisphere):
- A large concave circular indentation — use a SphereGeometry with only the cap region, inverted
- Center: the 8-beam focusing array (8 thin tubes converging at center)
- Rim: raised circular rim around the dish

EQUATORIAL TRENCH:
- A groove/channel running exactly around the sphere's equator, about 40 units wide and 30 units deep
- Along the trench: towers, vents, targeting systems (box shapes at intervals)

POLAR EXHAUST PORT:
- A small circular opening near the south pole — the one weakness
- Slightly glowing interior (emissive red-orange glow)

SUPERLASER EFFECT (press F):
- 8 tributary beams converge at the dish center (green emissive lines)
- Main beam fires from dish toward a target point 5000 units away
- Bloom/glow effect on the beam (use additive blending, opacity 0.5-0.7)
- Screen flash on fire

SCENE:
- Dense starfield background (5000 small points)
- A planet partially visible at the beam's target point
- Camera: orbit around the station (mouse drag), scroll to zoom
- Press B for wide view, V for exhaust port view, G for equatorial trench

Toast on load: "DS-1 ORBITAL BATTLE STATION". Station hum: Web Audio API oscillator at ~55Hz with slow LFO.
```

---

## 7. 魔法尖塔學院 — 霍格華茲風城堡

*SPELLSPIRE*

SPELLSPIRE ACADEMY — a Hogwarts-inspired wizard castle using entirely original names and designs. First-person broom flight across a Scottish Highland setting, with 9 warp points (1-9 keys) covering every major building.

```
Build SPELLSPIRE ACADEMY, an original Hogwarts-inspired wizard castle (no copyrighted HP names), as a single HTML file using Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js).

SETTING:
- A dramatic clifftop above a dark lake — Scottish Highlands
- Misty mountains in the background (layered fog planes)
- Dark conifer forest at the base of the cliffs
- The lake: flat water plane with slight shimmer

CASTLE STRUCTURE (all Gothic — pointed arches, flying buttresses, crenellated towers):
- Main Towers (varying heights): The Astronomy Tower (tallest, has open platform at top), The Defense Tower (squat and thick), The Clock Tower (animated clock face), The Alchemy Spire (leaning slightly), The North Tower
- The Great Hall: long central building, vaulted ceiling visible through tall lancet windows (warm candlelight orange glow from inside), wide double-door entrance
- The Covered Bridge: a long wooden covered walkway connecting two towers over a gorge
- The Greenhouses: glass panels framing (3 connected greenhouse structures, green tint)
- The Boathouse: stone structure at the base of the cliff on the lake's edge, wooden dock
- The Owlery: circular stone tower, open-air arched windows
- The Pitch: a large flat field with 6 tall goal hoops (3 per side)
- The Dungeon entrance: low stone archway descending into the cliff
- A Whomping-style tree in the courtyard: twisted, animated swaying branches

VISUAL STYLE:
- Stone: mossy grey (#5a6055)
- Sky: dark dramatic overcast, purple-grey
- Warm amber/gold light from all windows (emissive)
- Moving staircases: 3 visible through windows — animated rotating staircase geometry
- Torches on walls (small flame particle emitters, orange)

CONTROLS: WASD + pointer-lock mouse, broom flight (slightly faster than walking). SHIFT = broom speed boost. Keys 1-9 warp to: 1=Courtyard, 2=Great Hall, 3=Moving Staircases, 4=Library, 5=Potions Lab, 6=Astronomy Tower, 7=Pitch, 8=Boathouse, 9=Owlery. Show location name on warp. Toast: "SPELLSPIRE ACADEMY — Night Flying Open". The castle is open for night flying. Mind the moving staircases.
```

---

## 8. 龍窖 — 第三人稱 RPG

*WYRMHOLD*

An original Elder Scrolls-inspired RPG built from scratch. Third-person movement, melee sword combat, fireball/ice lance magic, a 3-floor dungeon, and a dragon boss finale with multiple combat phases.

```
Build WYRMHOLD, an original fantasy open-world RPG, as a single HTML file using Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js). Inspired by Elder Scrolls-style games but entirely original.

WORLD STRUCTURE:
- Village hub (center of map): 6 houses, blacksmith (NPC shop), inn (NPC, quest board), well, market
- Open overworld: rolling terrain with forest areas, a river, mountain range to the north
- Dungeon entrance: a stone archway in the mountainside, 3 underground floors
- Dragon Lair: the deepest chamber — a massive vaulted cave with the final boss

PLAYER SYSTEMS:
- Third-person camera (orbit style, follows player, distance adjustable with scroll)
- WASD movement, Space to jump, Left click = sword attack (swing animation, hitbox check)
- Right click = cast spell (toggle active spell: Fireball, Ice Lance, Heal)
- Equipment slots: Weapon (sword, dagger, axe), Armor (robe, chainmail, plate), Helmet
- Stats: HP, Mana, Stamina bars + XP bar
- Leveling: every 1000 XP → level up → stat points to distribute

ENEMY AI:
- Patrol state: walk a defined path
- Aggro state: player within 15 units → charge + attack
- Types: Skeleton (melee), Dark Mage (ranged), Ogre (heavy, slow)
- Drop gold + items on death

DRAGON BOSS (final chamber):
- Phase 1: Dragon on ground, melee tail/claw attacks, occasional fire breath
- Phase 2 (50% HP): Dragon takes flight, swoops + aerial fire
- Phase 3 (25% HP): Enraged — faster attacks, AOE fire slam on landing
- Death: collapse + dissolve + chest spawns with legendary weapon

VISUAL STYLE: Low-poly fantasy, warm PBR lighting, god rays through dungeon openings. Quest complete → fireworks particle burst.

CONTROLS: WASD + mouse orbit. Press I for inventory, J for journal (quest log), M for map. Include ?test in URL to expose window.__game for testing.
```

---

## 9. 積木疾風大獎賽 — 樂高卡丁車

*BRICKBLITZ GP*

BRICKBLITZ GP — a Lego-style kart racing game set on a space rocket launch facility track. Everything is built from Lego bricks (procedural brick geometry). Drift to boost, dodge AI opponents, race 3 laps.

```
Build BRICKBLITZ GP, an original brick-built kart racing game, as a single HTML file using Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js). Inspired by classic 1999 kart racers. All assets are procedural — no external files.

VISUAL AESTHETIC — LEGO BRICKS:
- All environment geometry uses Lego brick proportions (1 stud = 1 unit wide, 1.2 units tall, 0.5 unit stud bump on top)
- Use BoxGeometry + CylinderGeometry (stud) to build brick-like building elements
- Bright primary Lego colors: red (#cc0000), blue (#0055aa), yellow (#ffd700), green (#00aa44), white, grey
- Karts: small boxy brick-built karts with minifig-style drivers (head sphere + torso box)

TRACK — SPACE ROCKET LAUNCH FACILITY:
- ~2km circuit through a rocket launch facility
- Straight: passes by a massive red rocket on a launch pad (3 sections tall, fins, exhaust nozzle)
- Banked curve: elevated spiral around a rocket assembly building
- Tunnel: through the base of a giant fuel tank
- Boost pads: yellow stripe panels on the track surface (speed x1.5 for 2 seconds)
- Oil slick hazard: dark circular area that causes spin-out
- Finish line: blue/white checkered stripe with overhead gantry

KART PHYSICS:
- Forward/reverse, left/right steering
- Drift: hold Shift while turning → kart slides outward → release Shift → boost burst
- Speed: 0-80 km/h, top speed with boost: 120 km/h
- 3 AI opponents with rubber-band difficulty (catch up when behind, back off when ahead)

RACE SYSTEMS:
- 3 laps, checkpoint system to prevent shortcuts
- Position tracker (1st–4th)
- Lap timer + best lap
- Finish: podium screen + confetti particles

CONTROLS: WASD to steer, Shift to drift, Space to use collected item. Third-person camera behind kart. Include ?test in URL to expose window.__game.
```

---

## 10. 鋼鐵戰術 — 回合制戰棋

*STEEL TACTICS*

STEEL TACTICS — an Advance Wars-style turn-based strategy game. Blue Army vs Red Army, 6 unit types, terrain defense bonuses, city capturing, CO Power abilities, and a full turn sequence. Single HTML file.

```
Build STEEL TACTICS, an Advance Wars-style turn-based strategy game, as a single HTML file using canvas 2D rendering (no Three.js needed — this is top-down 2D).

MAP:
- 16x16 grid of tiles, top-down perspective with slight isometric tilt (optional)
- Tile types: Plains (def +1), Forest (def +2, hides units), Mountain (def +3, slow movement), Road (fast movement), River (impassable without bridge), Bridge (crosses river), City (capturable, def +2, heals unit on it), HQ (home base), Sea (impassable ground), Shore

FACTIONS:
- Blue Army (player, left side): HQ on left, navy blue units
- Red Army (AI, right side): HQ on right, red units

UNIT TYPES (each has: movement, range, attack, defense, fuel, ammo):
1. Infantry — move 3, capture cities, melee only
2. Mech Infantry — move 2, can capture, anti-tank rocket
3. Tank — move 5, attack range 1, heavy damage
4. Artillery — move 4, indirect attack range 2-3, cannot move+fire same turn
5. APC — move 6, transports infantry, no attack, resupplies adjacents
6. Fighter — move 9, air unit, attacks air/ground

TURN SEQUENCE:
- Select unit (click) → see move range highlighted (blue) + attack range (red)
- Move to tile (click within range)
- Action menu: Attack / Capture / Wait / Load (into APC)
- Attack: defender gets counterattack if adjacent and has ammo
- End Turn button → AI executes moves (simple AI: advance + attack if adjacent)

CO POWER:
- Charge bar fills as units take/deal damage
- Full bar → Activate Power: heals all units +2HP, boosts attack by 20% for 1 turn

WIN/LOSE:
- Capture enemy HQ OR destroy all enemy units = win
- Enemy captures your HQ or destroys all your units = lose

UI: Side panel showing selected unit stats. Mini-map in corner. Turn counter. Terrain info on hover.
```

---

## 11. 冠冕采邑 — 王國建造

*CROWNSTEAD*

CROWNSTEAD — a We Rule-style kingdom builder in isometric 3D. Sandbox Edition: infinite treasury so you can focus on building the perfect kingdom. 18 building types, 5 upgrade tiers, royal orders, and realm expansion.

```
Build CROWNSTEAD, an original We Rule-style kingdom builder game, as a single HTML file using Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js). Isometric 3D camera.

SANDBOX EDITION: Treasury is infinite — gold never runs out. Focus is on building and visual arrangement, not resource grinding.

WORLD:
- An isometric grid (20x20 tiles initially, expandable)
- Terrain: green grass base, some decorative trees/rocks on starting tiles
- River on the right edge with a bridge
- The player starts with a Level 1 Castle and 5 open tiles

18 BUILDING TYPES (each is a distinct 3D model using Three.js geometry):
Farms: Wheat Farm, Apple Orchard, Grape Vineyard, Sheep Ranch
Production: Flour Mill, Bakery, Winery, Forge, Sawmill
Commerce: General Market, Spice Bazaar, Gem Exchange
Military: Archer Tower, Guard Barracks, Knight Hall
Civic: Town Hall, Chapel, Inn

CASTLE (special building, center tile):
- Tier 1: Small stone keep (box shape, small tower)
- Tier 2: Keep + outer wall + gatehouse
- Tier 3: Full castle with 4 towers, great hall, courtyard
- Tier 4: Grand castle with imposing towers, banners, drawbridge

BUILDING SYSTEM:
- Click empty tile → building picker panel appears
- Place building → building appears with construction animation (scaling up)
- Each building has ★1-5 upgrade path (click building → Upgrade button → building grows/changes)
- Buildings produce resources over time (collect by clicking, though no limit needed)

CITIZENS:
- 5-15 citizen figures (small box-body characters) wander the kingdom on paths between buildings
- More buildings = more citizens appear

ROYAL ORDERS:
- Right panel: 3 active orders (e.g. "Build 2 Bakeries → get 50 XP", "Upgrade Castle to Tier 2 → unlock new region")
- Completing orders awards XP and unlocks new expandable land tiles at the kingdom edge

REALM EXPANSION:
- Grey locked tiles at kingdom edges with a lock icon
- Complete orders or spend XP to unlock tiles (they flip to grass with a reveal animation)

CONTROLS: Drag to pan, scroll to zoom, click to place/interact. Isometric camera angle locked (can rotate with Q/E keys).
```

---

## 12. MWM 城 — GTA 風開放世界

*MWM CITY*

MARKET WITH MARK CITY — a GTA-style top-down open world city with a marketing theme. Drive through the Market District, the Port, Residential areas. Get stars. Cause chaos.

```
Build MARKET WITH MARK CITY, an original GTA-style top-down open world city, as a single HTML file using Three.js via ESM import map (https://unpkg.com/three@0.160.0/build/three.module.js). Top-down or slight isometric camera.

CITY LAYOUT (procedural grid):
- City grid: ~40x40 blocks with roads (2-lane streets, 4-lane avenues)
- Districts:
  - The Market District (center): billboards, storefronts, neon signs ("LEADS HERE", "FUNNEL BLVD")
  - The Port (south): warehouses, shipping containers, cranes, a cargo ship
  - Residential (north): houses, a park, a school
  - Industrial (east): factories, smokestacks, rail yard
  - The Strip (west): nightclub buildings, bright neon, luxury car dealership

VEHICLES:
- Player vehicle: top-down sprite-style box car, WASD to drive
- Traffic: 20+ AI cars on the road grid, following road lanes, stopping at intersections
- Cop cars: white/blue, patrol the streets

CRIME SYSTEM (Wanted Stars):
- Hit a pedestrian or AI car: 1 star
- 2 stars: cops begin pursuing
- 3 stars: roadblocks appear
- Evade for 30 seconds: stars clear

PEDESTRIANS:
- 40+ box-figure pedestrians walking on sidewalks with random paths
- They scatter when the player car approaches fast

CITY DETAILS:
- Traffic lights at intersections (red/yellow/green animated)
- Trees on boulevards
- Parked cars on side streets
- Billboard textures (use canvas-drawn text: "GET MORE LEADS", "OPTIMIZE YOUR FUNNEL")
- Police station, hospital, fire station (landmark buildings)

CONTROLS: WASD to drive, E to exit/enter vehicle, run on foot without vehicle. Minimap in corner. Wanted star display top-right. Include ?test for window.__game exposure.
```

---
