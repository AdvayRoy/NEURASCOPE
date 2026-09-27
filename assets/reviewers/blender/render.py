"""Review renders from the exported GLB (proves the shipped asset, not the .blend).

Run: blender -b -P assets/reviewers/blender/render.py -- <outdir> [views|strip|rig|all]
"""
import bpy, math, os, sys
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
GLB = os.path.join(REPO, "public", "models", "reviewers.glb")
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else os.path.join(HERE, "renders")
MODE = argv[1] if len(argv) > 1 else "all"
IDS = ["cold", "intent", "visual", "enthusiast"]
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE"
sc.eevee.taa_render_samples = 64
sc.render.film_transparent = True
sc.view_settings.view_transform = "Standard"
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGBA"

world = bpy.data.worlds.new("w")
sc.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.045, 0.047, 0.055, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 1.0


def light(name, loc, energy, size, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy, ld.size, ld.color = energy, size, color
    ob = bpy.data.objects.new(name, ld)
    sc.collection.objects.link(ob)
    ob.location = loc
    d = Vector((0, 0, 0.62)) - Vector(loc)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return ob


light("key", (-2.0, -2.2, 2.0), 300, 2.0, (1.0, 0.97, 0.93))
light("fill", (2.2, -1.8, 0.9), 70, 2.5, (0.92, 0.95, 1.0))
light("rim", (1.4, 2.2, 2.0), 260, 1.5, (0.9, 0.93, 1.0))
light("rimL", (-1.8, 1.8, 1.2), 120, 1.5)

cam_d = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_d)
sc.collection.objects.link(cam)
sc.camera = cam


def aim(yaw_deg, target_z, frame_h, dist=3.0, pitch_deg=0.0):
    cam_d.sensor_fit = "VERTICAL"
    cam_d.sensor_height = 24
    cam_d.lens = 24 / (2 * math.tan(math.atan(frame_h / 2 / dist)))
    a = math.radians(yaw_deg)
    p = math.radians(pitch_deg)
    cam.location = (dist * math.sin(a) * math.cos(p), -dist * math.cos(a) * math.cos(p), target_z + dist * math.sin(p))
    d = Vector((0, 0, target_z)) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


roots = {i: bpy.data.objects.get(f"reviewer_{i}") for i in IDS}


def descendants(ob):
    out = [ob]
    for c in ob.children:
        out += descendants(c)
    return out


def show(cid):
    for i, r in roots.items():
        for o in descendants(r):
            o.hide_render = (i != cid)


def render(path, w, h):
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


def face_mesh(cid):
    return [o for o in descendants(roots[cid]) if o.type == "MESH" and o.data.shape_keys]


def set_keys(cid, vals):
    for o in face_mesh(cid):
        for kb in o.data.shape_keys.key_blocks[1:]:
            kb.value = vals.get(kb.name, 0.0)


def set_eyes(cid, yaw=0.0, pitch=0.0):
    arm = roots[cid] if roots[cid].type == "ARMATURE" else next(o for o in descendants(roots[cid]) if o.type == "ARMATURE")
    for n in ("Eye_L", "Eye_R"):
        pb = arm.pose.bones[n]
        R = (Matrix.Rotation(math.radians(yaw), 4, "Z") @ Matrix.Rotation(math.radians(pitch), 4, "X"))
        h = pb.bone.head_local
        pb.matrix = Matrix.Translation(h) @ R @ Matrix.Translation(-h) @ pb.bone.matrix_local
    bpy.context.view_layer.update()


if MODE in ("views", "all"):
    for cid in IDS:
        show(cid)
        aim(0, 0.6, 1.2)
        render(os.path.join(OUT, f"{cid}_front.png"), 512, 512)
        aim(35, 0.6, 1.2)
        render(os.path.join(OUT, f"{cid}_34.png"), 512, 512)

if MODE in ("strip", "all"):
    for cid in IDS:
        show(cid)
        aim(20, 0.62, 0.8, pitch_deg=3)
        render(os.path.join(OUT, f"tile_{cid}.png"), 104, 112)
        render(os.path.join(OUT, f"tile2x_{cid}.png"), 208, 224)

if MODE in ("rig", "all"):
    states = [("neutral", {}, (0, 0)), ("blink", {"blink_L": 1, "blink_R": 1}, (0, 0)), ("half blink", {"blink_L": 0.5, "blink_R": 0.5}, (0, 0)),
              ("wide", {"wide": 1}, (0, 0)), ("browDown", {"browDown": 1}, (0, 0)), ("browUp", {"browUp": 1}, (0, 0)),
              ("mouthOpen", {"mouthOpen": 1}, (0, 0)), ("look left", {}, (25, 0)), ("look right", {}, (-25, 0)), ("look up", {}, (0, 18)),
              ("look down", {"browDown": 0.4}, (0, -15))]
    for cid in IDS:
        show(cid)
        aim(0, 0.66, 0.62)
        for k, (label, keys, (yw, pt)) in enumerate(states):
            set_keys(cid, keys)
            set_eyes(cid, yw, pt)
            render(os.path.join(OUT, f"rig_{cid}_{k:02d}.png"), 200, 200)
        set_keys(cid, {})
        set_eyes(cid, 0, 0)
    with open(os.path.join(OUT, "rig_states.txt"), "w") as f:
        f.write("\n".join(s[0] for s in states))
