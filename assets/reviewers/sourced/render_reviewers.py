"""Render review sheets from reviewers.blend.  blender -b reviewers.blend -P render_reviewers.py -- <outdir> [mode]"""
import bpy, sys, os, math
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]; MODE = argv[1] if len(argv) > 1 else 'all'
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene
KEYS = ['cold', 'intent', 'visual', 'enthusiast']
sc.render.engine = 'BLENDER_EEVEE_NEXT'
sc.eevee.taa_render_samples = 64
sc.render.film_transparent = True
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Medium High Contrast'
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.006, 0.0065, 0.008, 1); bg.inputs[1].default_value = 1.0
def light(name, kind, loc, energy, size, col=(1, 1, 1)):
    l = bpy.data.lights.new(name, kind); l.energy = energy; l.color = col
    if kind == 'AREA': l.size = size
    o = bpy.data.objects.new(name, l); sc.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector((0, 0, 0.6)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o
light('key', 'AREA', (-1.6, -2.4, 2.0), 260, 2.0, (1, 0.96, 0.92))
light('fill', 'AREA', (2.0, -2.0, 0.8), 70, 2.5, (0.85, 0.9, 1))
light('rim', 'AREA', (1.2, 2.0, 1.8), 180, 1.5, (0.8, 0.85, 1))
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 85
def show(key):
    for k in KEYS:
        c = bpy.data.collections.get('reviewer_' + k)
        if c: c.hide_render = (k != key)
def aim(yaw_deg, dist=2.9, target=(0, 0, 0.52), ortho=None):
    a = math.radians(yaw_deg)
    t = Vector(target)
    cam.location = t + Vector((math.sin(a) * dist, -math.cos(a) * dist, 0.05 * dist))
    cam.rotation_euler = (t - cam.location).to_track_quat('-Z', 'Y').to_euler()
    if ortho:
        cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho
    else:
        cam.data.type = 'PERSP'
def shot(path, res=(512, 512)):
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
def set_key(key, name, val):
    for o in bpy.data.collections['reviewer_' + key].objects:
        if o.type == 'MESH' and o.data.shape_keys and name in o.data.shape_keys.key_blocks:
            o.data.shape_keys.key_blocks[name].value = val
def reset(key):
    for o in bpy.data.collections['reviewer_' + key].objects:
        if o.type == 'MESH' and o.data.shape_keys:
            for kb in o.data.shape_keys.key_blocks[1:]:
                kb.value = 0
        if o.type == 'ARMATURE':
            for pb in o.pose.bones:
                pb.rotation_mode = 'XYZ'; pb.rotation_euler = (0, 0, 0)
keys = [k for k in KEYS if bpy.data.collections.get('reviewer_' + k)]
if MODE in ('all', 'views'):
    for k in keys:
        show(k); reset(k)
        aim(0); shot(os.path.join(OUT, '%s_front.png' % k))
        aim(-35); shot(os.path.join(OUT, '%s_34.png' % k))
if MODE in ('all', 'rig'):
    tests = [('rest', None), ('blink_L', ('blink_L', 1)), ('blink_R', ('blink_R', 1)), ('blink', 'both'), ('wide', ('wide', 1)),
             ('browDown', ('browDown', 1)), ('browUp', ('browUp', 1)), ('mouthOpen', ('mouthOpen', 1)),
             ('eyes_left', 'eyeL'), ('eyes_up', 'eyeU')]
    for k in keys:
        show(k)
        for name, t in tests:
            reset(k)
            if t == 'both':
                set_key(k, 'blink_L', 1); set_key(k, 'blink_R', 1)
            elif t in ('eyeL', 'eyeU'):
                arm = bpy.data.objects['reviewer_' + k]
                for s in ('Eye_L', 'Eye_R'):
                    pb = arm.pose.bones[s]; pb.rotation_mode = 'XYZ'
                    # bones point up (+Z): local Z = world up. yaw about bone Y? use world-aligned
                    pb.rotation_euler = (0, 0, math.radians(25)) if t == 'eyeL' else (math.radians(-18), 0, 0)
            elif t:
                set_key(k, *t)
            aim(0, dist=2.6, target=(0, 0, 0.55))
            shot(os.path.join(OUT, 'rig_%s_%s.png' % (k, name)), (320, 320))
        reset(k)
if MODE in ('all', 'rail'):
    for k in keys:
        show(k); reset(k)
        aim(-8, dist=2.35, target=(0, 0, 0.6)); shot(os.path.join(OUT, 'rail_%s.png' % k), (132, 132))
