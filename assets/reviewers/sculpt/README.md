# Synthetic Reviewers — sculpt pipeline

Independent, fully procedural build of the four reviewer busts (`cold`, `intent`, `visual`, `enthusiast`)
in headless Blender 5.2 (no external assets, deterministic output).

```bash
blender -b --factory-startup -P assets/reviewers/sculpt/build.py      # -> public/models/reviewers.glb (+ renders/meta.json)
blender -b --factory-startup --python-exit-code 1 -P assets/reviewers/sculpt/validate.py   # contract checks
blender -b --factory-startup -P assets/reviewers/sculpt/render.py     # -> renders/*.png
```

## Technique

Every organic volume (heads, ears, noses, hair locks, curls, cap crown, ghutra, beard, hoodies, kandura) goes
through the same pipeline in `volume()`:

1. **Metaball blockout** — soft ellipsoid/capsule elements (positive and negative) describe the form;
   `chain()` strings dense metaballs along a polyline for continuous locks and cords.
2. **Voxel remesh** (0.004–0.006 m) → uniform quad-dominant mesh with no primitive seams.
3. **Smooth** (Laplacian, masked).
4. **Sculpt brushes** implemented in numpy (`Sculpt`): `grab` (falloff translate), `inflate`
   (normal push), `crease_path` (sharp valleys along a stroke: curl separation, cap panel seams,
   ghutra folds, garment folds, lip line, nasolabial), plus cavity extraction that is baked into
   vertex colours (occlusion tint in creases, cheek flush, lip tone).
5. **Decimate** (collapse) to a per-part budget, smooth shading, cavity/tint transferred from the dense mesh.

Face features that must animate (lids, brows, mouth slab, teeth) are parametric meshes conformed onto the
dense sculpt surface via BVH ray casts, so their shape keys are exact:
`blink_L/R` (upper lid closes over the eye, lower lid rises), `wide`, `browUp`, `browDown`, `mouthOpen`
(jaw region of the head mesh, beard and mouth slab). Eyes are dark 1.35:1 ovals set behind skin lid rims
with one catch-light each.

## Contract (verified by validate.py)

- `public/models/reviewers.glb`, ≤ 3 MB, no Draco/meshopt, no textures (vertex colours × base colour).
- Top-level `reviewer_cold|intent|visual|enthusiast`, identity transforms, Y-up, facing +Z,
  bust bottom y≈0, head top y=1.0, head width at eye line 0.5–0.65, ≤ 12k triangles each.
- Bones `Chest > Neck > Head > Eye_L, Eye_R`; eye pivots at the eyeball centres (checked from inverse
  bind matrices vs. eye mesh bounds). `<id>_eyes` (eyeballs + catch-lights) rigid to eye bones,
  `<id>_hair` (hair, cap, glasses, earrings, ghutra, agal) rigid to `Head`, `<id>_face` carries the six
  morph targets (each checked to move vertices), `<id>_body` rigid to `Chest`; the head skin blends Head/Neck at the neck.
- All materials metallic 0, roughness 0.5–0.9.

## Renders (`renders/`)

- `<id>_front.png`, `<id>_34.png` — beauty views.
- `strip_70px_1x.png` — 4-up, exactly 70 px chin-to-crown head height on `#0f1013`, view at 1×
  (`strip_70px_2x.png` is a nearest-neighbour enlargement for review only).
- `side_by_side.png` — canonical reference (`reference.png`) above the 70 px strip, reference scaled so its
  heads are also ≈70 px.
- `rig_sheet.png` — per character: rest, blink_L, blink_R, wide, browUp, browDown, mouthOpen, eyes left,
  eyes right, eyes up (column labels in `rig_sheet_columns.json`).

Renders use Eevee with a key/fill/rim rig; the runtime uses three.js lighting, so treat them as a
look-dev reference rather than a pixel match.
