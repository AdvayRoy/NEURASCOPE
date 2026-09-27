# Reviewer characters (`sourced` approach) — provenance & licenses

Output: `public/models/reviewers.glb` (built by `build_reviewers.py`, source scene `reviewers.blend`).

## Candidate comparison

| Candidate | License | Verdict | Reason |
|---|---|---|---|
| **MakeHuman base mesh hm08 + targets + default weights** (makehumancommunity/makehuman) | CC0 1.0 (explicit, Sept 2020; headers in each file) | **Chosen** | One shared topology + skin weights + ~1,000 parametric shape targets → four genuinely different face shapes/ages/ethnicities from the same base, fully scriptable headless, redistributable with no conditions. Needs heavy stylisation (done here). |
| Quaternius "Universal Base Characters" / Ultimate Modular packs | CC0 | Evaluated, rejected | Clean low-poly and rigged, but one generic face per body; faces are flat/game-like (Roblox-adjacent), no eyelids/brow topology for blink/brow shape keys, no parametric face variation. |
| Kenney character packs | CC0 | Rejected | Blocky/voxel/minifig style — explicitly the "Minecraft/Roblox look" to avoid. |
| VRoid Studio sample avatars / open VRM models | VRoid sample terms / per-model VRM licenses | Rejected | Anime style off-brief; most samples forbid redistribution of the model file or modification outside VRoid; per-model licenses inconsistent. |
| Poly Pizza / Sketchfab CC0 & CC-BY heads | CC0 / CC-BY (per asset) | Rejected | No consistent set of four matching busts; mixed topology/abstraction levels, few rigged, CC-BY attribution chains per asset. |
| Blender Studio characters (Sprite Fright, Charge, etc.) | CC-BY | Rejected | Very high-poly film rigs, specific IP characters, not adaptable into four new people within 12k tris. |
| Open-source toon-head generators | mixed / often unlicensed | Rejected | No generator found with a clear redistribution license and bust/clothing output. |
| Ready Player Me | proprietary ToS | Rejected | Avatars may not be redistributed as files in a public repo. |

## Third-party pieces actually shipped

| File | Source | Author | License |
|---|---|---|---|
| `vendor/makehuman/base.obj.gz` | https://github.com/makehumancommunity/makehuman (`makehuman/data/3dobjs/base.obj`, commit a8bc2d54ff0ac92e78ff71431b1023eda42bf482) | Data Collection AB, Joel Palmius, Jonas Hauquier (orig. Manuel Bastioni) | CC0 1.0 |
| `vendor/makehuman/default_weights.mhw.gz` | same repo, `makehuman/data/rigs/default_weights.mhw` | same | CC0 1.0 |
| `vendor/makehuman/targets/**.target.gz` (50 files) | same repo, `makehuman/data/targets/` | same | CC0 1.0 |

No textures, hair, clothing or accessory assets from third parties are used; all of those are original procedural geometry in `parts.py` (original work, same license as this repository).

## Modifications (all performed by the scripts here)
- Only the head/neck region of the MakeHuman body is kept; body/eyes/teeth/tongue helper geometry discarded.
- Per-character mix of MakeHuman macro (gender/age/ethnicity) and face targets (`characters.py`), then stylisation in `head.py`: head enlarged ~1.5×, eyes enlarged ~1.45×, fuller cheeks, simplified nose/mouth, Laplacian smoothing of skin detail, neck lowered/widened.
- New eyeballs (sclera/iris/pupil/catchlight), eyelid and brow shape keys (`blink_L/R`, `wide`, `browDown`, `browUp`, `mouthOpen`) authored procedurally.
- Hidden faces culled, mesh decimated (symmetric) with shape keys re-projected.
- MakeHuman skin weights collapsed to a 5-bone bust rig (`Chest`, `Neck`, `Head`, `Eye_L`, `Eye_R`).
- Original clothing, hair, cap, glasses, earrings, ghutra, agal and beard geometry added.
- Converted to glTF (Y up, facing +Z), normalised to bust height 1.0.

## Rebuild
```
blender -b -P assets/reviewers/sourced/build_reviewers.py -- public/models/reviewers.glb assets/reviewers/sourced/reviewers.blend
blender -b assets/reviewers/sourced/reviewers.blend -P assets/reviewers/sourced/render_reviewers.py -- <outdir> all
python3 assets/reviewers/sourced/compose_sheets.py <outdir> <reference.png> <sheets_dir>   # needs Pillow
```
