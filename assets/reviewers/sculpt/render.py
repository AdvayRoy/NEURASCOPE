"""Render sheets from the exported GLB (so renders show exactly what ships).

    blender -b --factory-startup -P assets/reviewers/sculpt/render.py [-- --quick]

Outputs (assets/reviewers/sculpt/renders/):
  <id>_front.png, <id>_34.png     512px beauty renders
  strip_70px_1x.png               4-up, head (chin->crown) exactly 70 px, #0f1013, 1x
  strip_70px_2x.png               same strip, nearest-neighbour 2x enlargement for inspection only
  side_by_side.png                canonical reference (top) vs this build at 70 px head height (bottom)
  rig_sheet.png                   per-character morphs + eye rotation
"""
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
GLB = os.path.join(ROOT, "public", "models", "reviewers.glb")
OUT = os.path.join(HERE, "renders")
TMP = os.path.join(OUT, "_tmp")
REF = os.path.join(HERE, "reference.png")
IDS = ["cold", "intent", "visual", "enthusiast"]
BG = np.array([0x0f, 0x10, 0x13]) / 255.0
ARGV = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=GLB)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.film_transparent = True
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.exposure = -0.75
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.055, 0.07, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    sc.world = w

    def light(name, kind, loc, energy, size, color=(1, 1, 1)):
        ld = bpy.data.lights.new(name, kind)
        ld.energy = energy
        ld.color = color
        if kind == "AREA":
            ld.size = size
        ob = bpy.data.objects.new(name, ld)
        sc.collection.objects.link(ob)
        ob.location = loc
        d = Vector((0, 0, 0.62)) - Vector(loc)
        ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        return ob
    light("key", "AREA", (1.3, -2.2, 2.0), 260, 1.6, (1.0, 0.96, 0.92))
    light("fill", "AREA", (-2.0, -1.6, 0.9), 70, 2.0, (0.85, 0.9, 1.0))
    light("rim", "AREA", (-0.6, 2.2, 1.9), 180, 1.2, (0.9, 0.93, 1.0))
    light("rim2", "AREA", (1.6, 1.8, 1.2), 90, 1.0)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    return sc, cam


def roots():
    return {cid: bpy.data.objects[f"reviewer_{cid}"] for cid in IDS}


def show(only):
    for cid, r in roots().items():
        for o in [r] + list(r.children_recursive):
            o.hide_render = cid != only


def aim(cam, yaw_deg, target, dist, lens=85, ortho=None):
    a = math.radians(yaw_deg)
    cam.location = Vector((dist * math.sin(a), -dist * math.cos(a), target[2] + 0.03))
    d = Vector(target) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    if ortho:
        cam.data.type = "ORTHO"
        cam.data.ortho_scale = ortho
    else:
        cam.data.type = "PERSP"
        cam.data.lens = lens


def render(sc, path, w, h, samples=32):
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    sc.eevee.taa_render_samples = samples
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return load(path)


def load(path):
    im = bpy.data.images.load(path, check_existing=False)
    w, h = im.size
    a = np.array(im.pixels[:]).reshape(h, w, 4)[::-1].copy()
    bpy.data.images.remove(im)
    return a


def save(arr, path):
    h, w = arr.shape[:2]
    if arr.shape[2] == 3:
        arr = np.concatenate([arr, np.ones((h, w, 1))], 2)
    im = bpy.data.images.new("o", w, h, alpha=True)
    im.pixels[:] = np.clip(arr[::-1], 0, 1).ravel()
    im.filepath_raw = path
    im.file_format = "PNG"
    im.save()
    bpy.data.images.remove(im)


def over(rgba, bg=BG):
    a = rgba[..., 3:4]
    return rgba[..., :3] * a + np.asarray(bg) * (1 - a)


def resize(img, w, h):
    """Box/bilinear resample via Blender's image scaler."""
    H, W = img.shape[:2]
    ch = img.shape[2]
    if ch == 3:
        img = np.concatenate([img, np.ones((H, W, 1))], 2)
    im = bpy.data.images.new("r", W, H, alpha=True)
    im.pixels[:] = img[::-1].ravel()
    im.scale(w, h)
    out = np.array(im.pixels[:]).reshape(h, w, 4)[::-1].copy()
    bpy.data.images.remove(im)
    return out[..., :ch]


def pose_reset(root):
    for pb in root.pose.bones:
        pb.matrix_basis = Matrix()
    for ch in root.children:
        if ch.data and getattr(ch.data, "shape_keys", None):
            for kb in ch.data.shape_keys.key_blocks[1:]:
                kb.value = 0.0


def set_morph(root, name, v):
    for ch in root.children:
        sk = getattr(ch.data, "shape_keys", None)
        if sk and name in sk.key_blocks:
            sk.key_blocks[name].value = v


def eye_look(root, yaw, pitch):
    for n in ("Eye_L", "Eye_R"):
        pb = root.pose.bones[n]
        b = pb.bone
        h = b.head_local
        R = Euler((math.radians(-pitch), 0, math.radians(yaw))).to_matrix().to_4x4()
        M = b.matrix_local.to_3x3()
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = (M.inverted() @ R.to_3x3() @ M).to_quaternion()
    bpy.context.view_layer.update()


def main():
    os.makedirs(TMP, exist_ok=True)
    sc, cam = setup()
    meta = json.load(open(os.path.join(OUT, "meta.json")))
    quick = "--quick" in ARGV
    # ---- beauty: front + 3/4
    if not quick:
        for cid in IDS:
            show(cid)
            for tag, yaw in (("front", 0), ("34", 32)):
                aim(cam, yaw, (0, 0, 0.55), 4.2, lens=125)
                img = render(sc, os.path.join(TMP, f"{cid}_{tag}.png"), 512, 560, 64)
                save(over(img, (0.075, 0.078, 0.09)), os.path.join(OUT, f"{cid}_{tag}.png"))
    # ---- 70 px strip: ortho, head (chin->top of head incl. hair/headwear) = 70 px exactly
    cells = []
    for cid in IDS:
        show(cid)
        chin, top = meta[cid]["chin"], 1.0
        px_per_unit = 70.0 / (top - chin)
        W, Hh = 118, 124
        aim(cam, 12, (0, 0, 0), 5.0, ortho=Hh / px_per_unit)
        cz = top + 8 / px_per_unit - (Hh / 2) / px_per_unit
        cam.location.z = cz
        cam.rotation_euler = Vector((0, 1, 0)).to_track_quat("-Z", "Y").to_euler()
        a = math.radians(12)
        cam.location = Vector((5 * math.sin(a), -5 * math.cos(a), cz))
        cam.rotation_euler = Vector((-math.sin(a), math.cos(a), 0)).to_track_quat("-Z", "Y").to_euler()
        cam.data.ortho_scale = max(W, Hh) / px_per_unit
        # square sensor fit: set resolution W x Hh and fit by height
        cam.data.sensor_fit = "VERTICAL"
        cam.data.ortho_scale = Hh / px_per_unit
        img = render(sc, os.path.join(TMP, f"strip_{cid}.png"), W, Hh, 64)
        cells.append(over(img))
    gap = 10
    strip = np.concatenate(sum([[c, np.broadcast_to(BG, (c.shape[0], gap, 3))] for c in cells], [])[:-1], 1)
    pad = np.broadcast_to(BG, (strip.shape[0], 12, 3))
    strip = np.concatenate([pad, strip, pad], 1)
    save(strip, os.path.join(OUT, "strip_70px_1x.png"))
    save(np.repeat(np.repeat(strip, 2, 0), 2, 1), os.path.join(OUT, "strip_70px_2x.png"))
    # ---- side-by-side vs reference, reference scaled so ITS heads are ~70 px too
    if os.path.exists(REF):
        ref = load(REF)[..., :3]
        rh = float(ARGV[ARGV.index("--refhead") + 1]) if "--refhead" in ARGV else 140.0  # chin->crown px in reference.png
        s = 70.0 / rh if rh else strip.shape[1] / ref.shape[1]
        ref = resize(ref, max(1, int(ref.shape[1] * s)), max(1, int(ref.shape[0] * s)))
        W = max(ref.shape[1], strip.shape[1])

        def padw(a):
            return np.concatenate([a, np.broadcast_to(BG, (a.shape[0], W - a.shape[1], 3))], 1)
        sep = np.broadcast_to(np.array([0.25, 0.25, 0.3]), (2, W, 3))
        sbs = np.concatenate([padw(ref), sep, padw(strip)], 0)
        save(sbs, os.path.join(OUT, "side_by_side.png"))
        save(np.repeat(np.repeat(sbs, 2, 0), 2, 1), os.path.join(OUT, "side_by_side_2x.png"))
    # ---- rig sheet
    if not quick:
        states = [("rest", {}, None), ("blink_L", {"blink_L": 1}, None), ("blink_R", {"blink_R": 1}, None),
                  ("wide", {"wide": 1}, None), ("browUp", {"browUp": 1}, None), ("browDown", {"browDown": 1}, None),
                  ("mouthOpen", {"mouthOpen": 1}, None), ("eyes L", {}, (30, 0)), ("eyes R", {}, (-30, 0)), ("eyes up", {}, (0, 20))]
        rows = []
        for cid in IDS:
            show(cid)
            r = roots()[cid]
            row = []
            for tag, morphs, look in states:
                pose_reset(r)
                for k, v in morphs.items():
                    set_morph(r, k, v)
                if look:
                    eye_look(r, *look)
                bpy.context.view_layer.update()
                aim(cam, 0, (0, 0, 0.64), 4.2, lens=135)
                row.append(over(render(sc, os.path.join(TMP, f"rig_{cid}_{tag}.png"), 200, 220, 16)))
            pose_reset(r)
            rows.append(np.concatenate(row, 1))
        save(np.concatenate(rows, 0), os.path.join(OUT, "rig_sheet.png"))
        json.dump([s[0] for s in states], open(os.path.join(OUT, "rig_sheet_columns.json"), "w"))
    print("RENDERED")


main()
