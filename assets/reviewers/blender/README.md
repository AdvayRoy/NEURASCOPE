# Synthetic Reviewers — Blender build

```bash
blender -b -P assets/reviewers/blender/build.py                 # -> public/models/reviewers.glb + reviewers.blend
python3 assets/reviewers/blender/validate.py                    # contract checks (nodes, bones, morphs, tris, size)
blender -b -P assets/reviewers/blender/render.py -- <out> all   # front/3-4, rail tiles, rig states
python3 assets/reviewers/blender/compose.py <out> <reference.png>  # views_sheet, strip_4up, rig_sheet, side_by_side
```

Contract: four top-level nodes `reviewer_{cold,intent,visual,enthusiast}` at the origin, Y up, facing +Z,
shoulders at y=0, head top ~1.0. Bones `Chest > Neck > Head > Eye_L/Eye_R` (eye pivots at eyeball centres;
hair/headwear/glasses/earrings weighted 100% to `Head`). Shape keys `blink_L blink_R wide browDown browUp mouthOpen`
live on the `<id>_face` mesh (lids, brows, mouth are part of it). Matte materials, metalness 0.
