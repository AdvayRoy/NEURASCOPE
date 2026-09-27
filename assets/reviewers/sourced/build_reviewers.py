"""Build NEURASCOPE synthetic reviewer busts from the MakeHuman CC0 base mesh.

Run:  blender -b -P build_reviewers.py -- <out.glb> [<out.blend>]
"""
import bpy, bmesh, sys, os, math
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import head as H
import geo as G
from characters import CHARS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT_GLB = argv[0] if argv else os.path.join(HERE, '..', '..', '..', 'public', 'models', 'reviewers.glb')
OUT_BLEND = argv[1] if len(argv) > 1 else os.path.join(HERE, 'reviewers.blend')
ONLY = os.environ.get('ONLY', '').split(',') if os.environ.get('ONLY') else None

bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene

# ----------------------------------------------------------------- materials
_mats = {}
def mat(name, rgb, rough=0.7):
    key = (name, tuple(rgb), rough)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bs = m.node_tree.nodes['Principled BSDF']
    col = tuple(c / 255.0 for c in rgb) if max(rgb) > 1 else tuple(rgb)
    lin = tuple(((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92 for c in col)
    bs.inputs['Base Color'].default_value = (*lin, 1)
    bs.inputs['Metallic'].default_value = 0.0
    bs.inputs['Roughness'].default_value = rough
    m.diffuse_color = (*lin, 1)
    _mats[key] = m
    return m

def mk(name, V, F, mats, midx=None, coll=None, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in np.asarray(V)], [], [list(f) for f in F])
    me.validate(clean_customdata=False)
    me.update()
    for m in mats:
        me.materials.append(m)
    if midx is not None:
        me.polygons.foreach_set('material_index', np.asarray(midx, dtype=np.int32))
    me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), dtype=bool))
    o = bpy.data.objects.new(name, me)
    (coll or SC.collection).objects.link(o)
    return o

def add_keys(o, keys):
    o.shape_key_add(name='Basis', from_mix=False)
    for k, V in keys.items():
        sk = o.shape_key_add(name=k, from_mix=False)
        sk.data.foreach_set('co', np.asarray(V, dtype=np.float32).ravel())

def apply_mods(o):
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)

def obj_arrays(o):
    me = o.data
    V = np.zeros(len(me.vertices) * 3); me.vertices.foreach_get('co', V)
    return V.reshape(-1, 3), [list(p.vertices) for p in me.polygons]

def join_meshes(parts):
    V, F, M = [], [], []
    off = 0
    for v, f, m in parts:
        V.append(np.asarray(v)); F += [[i + off for i in ff] for ff in f]; M += [m] * len(f)
        off += len(v)
    return np.vstack(V), F, M

def remesh_obj(o, voxel, target_tris, smooth_iters=6, smooth_f=0.5):
    """Voxel-remesh (union of overlapping masses) -> smooth -> decimate."""
    bpy.context.view_layer.objects.active = o
    m = o.modifiers.new('rm', 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = voxel; m.adaptivity = 0.0
    m.use_smooth_shade = True
    s = o.modifiers.new('sm', 'SMOOTH'); s.iterations = smooth_iters; s.factor = smooth_f
    apply_mods(o)
    ntri = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if ntri > target_tris:
        d = o.modifiers.new('dec', 'DECIMATE'); d.ratio = target_tris / ntri
        d.use_symmetry = True; d.symmetry_axis = 'X'
        apply_mods(o)
    o.data.polygons.foreach_set('use_smooth', np.ones(len(o.data.polygons), dtype=bool))
    return o

def decimate_transfer(o, V, F, keys, attrs, target_tris, dec_w=None):
    """Symmetric decimation of the basis, then re-derive every shape key / attribute on the
    reduced mesh by barycentric lookup into the original (triangulated) surface."""
    ntri = sum(len(f) - 2 for f in F)
    if ntri > target_tris:
        d = o.modifiers.new('dec', 'DECIMATE'); d.ratio = target_tris / ntri
        d.use_symmetry = True; d.symmetry_axis = 'X'
        if dec_w is not None:
            vg = o.vertex_groups.new(name='dec')
            for i, x in enumerate(dec_w):
                vg.add([i], float(x), 'REPLACE')
            d.vertex_group = 'dec'; d.vertex_group_factor = 1.0
        apply_mods(o)
        for vg in list(o.vertex_groups):
            o.vertex_groups.remove(vg)
    T = []
    for f in F:
        for k in range(1, len(f) - 1):
            T.append((f[0], f[k], f[k + 1]))
    T = np.array(T)
    bvh = BVHTree.FromPolygons([tuple(v) for v in V], T.tolist())
    Vn, _ = obj_arrays(o)
    tri = np.zeros(len(Vn), dtype=np.int64); bary = np.zeros((len(Vn), 3))
    for i, p in enumerate(Vn):
        loc, nrm, fi, dist = bvh.find_nearest(Vector(p))
        a, b, c = V[T[fi]]
        v0, v1, v2 = b - a, c - a, np.array(loc) - a
        d00, d01, d11 = v0 @ v0, v0 @ v1, v1 @ v1
        d20, d21 = v2 @ v0, v2 @ v1
        den = d00 * d11 - d01 * d01
        wv = (d11 * d20 - d01 * d21) / den; ww = (d00 * d21 - d01 * d20) / den
        tri[i] = fi; bary[i] = (1 - wv - ww, wv, ww)
    def interp(A):
        A = np.asarray(A)
        G_ = A[T[tri]]
        return np.einsum('nk,nk...->n...', bary, G_)
    off = Vn - interp(V)
    add_keys(o, {k: interp(v) + off for k, v in keys.items()})
    return {k: interp(v) for k, v in attrs.items()}

# ----------------------------------------------------------------- base data
B = H.base()
BODY_F = [f for g, f in B['faces'] if g == 'body']
E_BODY = H.edges(BODY_F)
NV = len(B['verts'])

def lid_profile(V, c, r, w, upper):
    d = V - c
    dist = np.linalg.norm(d, axis=1)
    elev = np.arctan2(d[:, 2], -d[:, 1])
    sel = (dist < r * 1.2) & (-d[:, 1] > r * 0.35) & (w > 0.02)
    sel &= (d[:, 2] > 0) if upper else (d[:, 2] < 0)
    xs = d[sel, 0] / r; es = elev[sel]
    bins = np.linspace(-1.2, 1.2, 13)
    cx, ce = [], []
    for a, b_ in zip(bins[:-1], bins[1:]):
        m = (xs >= a) & (xs < b_)
        if m.sum():
            cx.append((a + b_) / 2); ce.append(es[m].max() if upper else es[m].min())
    return np.array(cx), np.array(ce), sel

def lid_setup(V, eyes):
    """Precompute per-eye lid rotation data from MakeHuman eyelid weights."""
    data = {}
    for s, (c, r) in eyes.items():
        wu, wl = B['lidU'][s], B['lidD'][s]
        ux, ue, selu = lid_profile(V, c, r, wu, True)
        lx, le, sell = lid_profile(V, c, r, wl, False)
        mu = np.median(wu[selu]) if selu.any() else 1
        ml = np.median(wl[sell]) if sell.any() else 1
        d = V - c
        x = d[:, 0] / r
        thu = np.interp(x, ux, ue); thl = np.interp(x, lx, le)
        data[s] = dict(c=c, r=r, wu=np.clip(wu / mu, 0, 1), wl=np.clip(wl / ml, 0, 1), thu=thu, thl=thl)
    return data

def lids(V, L, amounts):
    """amounts: side -> blink amount (1 = closed, <0 = wider)."""
    V = V.copy()
    for s, a in amounts.items():
        D = L[s]
        span = np.maximum(D['thu'] - D['thl'], 0)
        if a >= 0:
            up = a * 0.78 * span * D['wu']
            lo = -a * 0.22 * span * D['wl']
        else:
            up = a * 0.35 * span * D['wu']
            lo = -a * 0.12 * span * D['wl']
        V = G.rot_axis(V, D['c'], (1, 0, 0), up)
        V = G.rot_axis(V, D['c'], (1, 0, 0), lo)
    return V

# ----------------------------------------------------------------- character
def build_character(key, C):
    coll = bpy.data.collections.new('reviewer_' + key)
    SC.collection.children.link(coll)
    R = H.build(C['head'])
    V0 = R['V']; eyes = R['eyes']; wh = R['wh']
    rE = eyes['L'][1]
    eyed = np.min([np.linalg.norm(V0 - c, axis=1) / r for c, r in eyes.values()], axis=0)
    st = C['head'].get('style', {})
    strength = np.clip(wh * G.smoothstep(1.1, 1.4, eyed) * st.get('smooth', 1.0) + 0.6 * (wh < 0.5), 0, 1)
    V0 = H.laplacian(V0, E_BODY, strength, iters=st.get('smooth_iters', 45))
    # flatten the anatomical socket hollow: pull the orbit ring onto a soft shell around each eyeball
    for c, r in eyes.values():
        d = V0 - c; dist = np.linalg.norm(d, axis=1)
        front = np.clip(-d[:, 1] / (r * 0.4), 0, 1) * wh
        shell = r * 1.06
        w = (1 - G.smoothstep(1.05 * r, 1.9 * r, dist)) * front * (dist < 1.9 * r)
        target = np.maximum(dist, shell)
        new = dist + (np.maximum(target, dist) - dist) * w
        V0 = c + d * (new / np.maximum(dist, 1e-9))[:, None]
    V0 = H.laplacian(V0, E_BODY, strength * 0.7, iters=6)
    L = lid_setup(V0, eyes)
    rest = st.get('rest_lid', 0.16)
    Vb = lids(V0, L, {'L': rest, 'R': rest})
    # ---- landmarks
    ec = (eyes['L'][0] + eyes['R'][0]) / 2
    om = B['oris'] > 0.3
    mouth = V0[om].mean(0); mouth[0] = 0
    mouth_front = V0[om][:, 1].min()
    # ---- brow curves on the skin
    tmpF = BODY_F
    bvh = BVHTree.FromPolygons([tuple(v) for v in Vb], tmpF)
    brow_pts = {}
    bc = C.get('brow', {})
    for s, (c, r) in eyes.items():
        sg = 1 if s == 'L' else -1
        pts = []; nrm = []
        for t in np.linspace(0, 1, 14):
            x = c[0] + sg * r * (-0.95 + bc.get('len', 2.2) * t)
            z = c[2] + r * (bc.get('h', 1.5) + bc.get('arch', 0.35) * math.sin(math.pi * t ** 0.85) - bc.get('tilt', 0.15) * t)
            hit = bvh.ray_cast(Vector((x, c[1] - 20 * r, z)), Vector((0, 1, 0)))
            pts.append(np.array(hit[0])); nrm.append(np.array(hit[1]))
        brow_pts[s] = (np.array(pts), G.norm(np.array(nrm)))
    def brow_disp(P, kind):
        """Displacement field for brow keys, applied to skin + brow mesh."""
        out = np.zeros_like(P)
        for s, (bp, bn) in brow_pts.items():
            sg = 1 if s == 'L' else -1
            d = np.linalg.norm(P[:, None, :] - bp[None], axis=2)
            j = d.argmin(1); dm = d.min(1)
            t = j / (len(bp) - 1)
            w = np.exp(-(dm / (0.75 * rE)) ** 2)
            if kind == 'up':
                v = np.stack([sg * 0.02 * rE * np.ones_like(t), np.zeros_like(t), (0.30 - 0.06 * t) * rE], 1)
            else:
                v = np.stack([-sg * (0.12 - 0.08 * t) * rE, -0.02 * rE * np.ones_like(t), -(0.26 - 0.14 * t) * rE], 1)
            out += v * w[:, None]
        return out
    skin_w = wh * G.smoothstep(1.12, 1.45, eyed)
    keys = {}
    keys['blink_L'] = lids(V0, L, {'L': 1.0, 'R': rest})
    keys['blink_R'] = lids(V0, L, {'L': rest, 'R': 1.0})
    keys['wide'] = lids(V0, L, {'L': -0.6, 'R': -0.6})
    keys['browDown'] = Vb + brow_disp(Vb, 'down') * skin_w[:, None]
    keys['browUp'] = Vb + brow_disp(Vb, 'up') * skin_w[:, None]
    piv = np.array([0, ec[1] + 2.2 * rE, ec[2] - 1.9 * rE])
    jw = np.clip(B['jaw'], 0, 1) * G.smoothstep(4.5 * rE, 2.0 * rE, np.linalg.norm(Vb - mouth, axis=1))
    keys['mouthOpen'] = G.rot_axis(Vb, piv, (1, 0, 0), math.radians(C.get('mouth_open_deg', 4.5)) * jw)

    # ---- bust extents (MH units): cut plane below the shoulders
    chin = Vb[(wh > 0.9) & (np.abs(Vb[:, 0]) < 0.3)][:, 2].min()
    head_h = Vb[wh > 0.5][:, 2].max() - chin
    zc = chin - head_h * C.get('bust_below_chin', 0.5)

    # ---- head/neck mesh (hidden torso removed; clothing covers the rest)
    wneck = wh + np.clip(B['wn'], 0, 1)
    # ---- eyes: pole faces forward, concentric iris / pupil rings
    parts = {}
    for s, (c, r) in eyes.items():
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=r * 0.985)
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
        me = bpy.data.meshes.new('eye'); bm.to_mesh(me); bm.free()
        Ve = np.array([v.co[:] for v in me.vertices]); Fe = [list(p.vertices) for p in me.polygons]
        mi = []
        for f in Fe:
            n = G.norm(Ve[f].mean(0))
            ang = math.degrees(math.acos(max(-1, min(1, -n[1]))))
            mi.append(2 if ang < C.get('pupil_deg', 19) else (1 if ang < C.get('iris_deg', 41) else 0))
        bpy.data.meshes.remove(me)
        # catchlight: a tiny white lens on the cornea, up-left of the pupil (moves with the eye)
        cl = G.norm(np.array([-0.32, -1.0, 0.38])) * r * 0.99
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=5, radius=r * 0.13)
        cv = np.array([v.co[:] for v in bm.verts]); cf = [[v.index for v in fc.verts] for fc in bm.faces]; bm.free()
        nrm = G.norm(cl); cv = cv - nrm * (cv @ nrm)[:, None] * 0.75 + cl
        Fe = Fe + [[i + len(Ve) for i in f] for f in cf]; mi = mi + [3] * len(cf); Ve = np.vstack([Ve, cv])
        o = mk('eye_%s_%s' % (s, key), Ve + c, Fe, [mat('sclera', (236, 232, 226), 0.5), mat('iris_' + key, C.get('iris', (74, 42, 24)), 0.5), mat('pupil', (12, 10, 10), 0.5), mat('catchlight', (255, 255, 255), 0.5)], mi, coll)
        parts['Eye_' + s] = o

    # ---- brows: tapered sculpted strips following the skin, with shape keys
    bpV, bpF = [], []
    for s, (bp, bn) in brow_pts.items():
        path = G.catmull(bp + bn * 0.04 * rE, 16)
        nn = G.norm(G.catmull(bn, 16))
        t = np.linspace(0, 1, 16)
        th = rE * bc.get('thick', 0.30) * (1.0 - 0.55 * t ** 1.3) * (0.55 + 0.45 * np.sin(np.clip(t * 6, 0, math.pi / 2)))
        v, f = G.sweep(path, th * 0.5, 8, up=nn, rad2=0.075 * rE)
        bpF += [[i + len(bpV) for i in ff] for ff in f]; bpV += list(v)
    bpV = np.array(bpV)
    bobj = mk('brows_' + key, bpV, bpF, [mat('brow_' + key, C['brow_col'], 0.8)], None, coll)
    add_keys(bobj, {'blink_L': bpV, 'blink_R': bpV, 'wide': bpV, 'browDown': bpV + brow_disp(bpV, 'down'),
                    'browUp': bpV + brow_disp(bpV, 'up'), 'mouthOpen': bpV})

    ctx = dict(key=key, C=C, V=Vb, V0=V0, keys=keys, eyes=eyes, rE=rE, wh=wh, wn=np.clip(B['wn'], 0, 1),
               zc=zc, chin=chin, head_h=head_h, ec=ec, mouth=mouth, coll=coll,
               bvh=BVHTree.FromPolygons([tuple(v) for v in Vb], BODY_F), eyed=eyed)
    import parts as P
    rigid = P.build_parts(ctx, sys.modules[__name__])
    # ---- head mesh: drop faces fully hidden under hair/headwear/clothing, then reduce
    occ = [o for o, g in rigid if o.name.split('_')[0] in ('hair', 'cap', 'outfit', 'hood', 'collar')]
    ov, of = [], []
    for o in occ:
        v_, f_ = obj_arrays(o); of += [[i + len(ov) for i in ff] for ff in f_]; ov += [tuple(x) for x in v_]
    obvh = BVHTree.FromPolygons(ov, of) if ov else None
    def hidden(f):
        if obvh is None:
            return False
        P = Vb[f]; c = P.mean(0)
        n = np.cross(P[1] - P[0], P[2] - P[0]); n = n / max(np.linalg.norm(n), 1e-12)
        if np.min(eyed[f]) < 2.2 or n @ (c - ec) < 0 and wh[f].min() > 0.5:
            return False
        for d in (n, G.norm(n + np.array([0, -0.5, 0])), G.norm(n + np.array([0, 0, 0.5]))):
            if obvh.ray_cast(Vector(c.tolist()), Vector(d.tolist()), (3.0 if wh[f].min() > 0.5 else 1.2) * rE)[0] is None:
                return False
        return True
    keepF = [f for f in BODY_F if wneck[f].max() > 0.03 and Vb[f][:, 2].min() > zc]
    keepF = [f for f in keepF if not hidden(f)]
    used = np.unique(np.concatenate([np.array(f) for f in keepF]))
    remap = -np.ones(NV, dtype=np.int64); remap[used] = np.arange(len(used))
    HF = [[int(remap[i]) for i in f] for f in keepF]
    skin = mat('skin_' + key, C['skin'], 0.62)
    lip = mat('lip_' + key, C.get('lip', C['skin']), 0.6)
    mdark = mat('mouth_' + key, (120, 62, 56), 0.8)
    fb = BVHTree.FromPolygons([tuple(v) for v in Vb], keepF)
    midx = []
    for fi, f in enumerate(keepF):
        c = Vb[f].mean(0)
        inside = False
        if abs(c[0]) < 1.1 * rE and abs(c[2] - mouth[2]) < 0.5 * rE:
            hit = fb.ray_cast(Vector((c[0], c[1] - 10 * rE, c[2])), Vector((0, 1, 0)))
            inside = hit[2] is not None and hit[2] != fi and hit[0][1] < c[1] - 0.05 * rE
        midx.append(2 if inside else 0)
    hobj = mk('head_' + key, Vb[used], HF, [skin, lip, mdark], midx, coll)
    hw = decimate_transfer(hobj, Vb[used], HF, {k: v[used] for k, v in keys.items()},
                           {'wh': wh[used], 'wn': np.clip(B['wn'], 0, 1)[used]}, int(os.environ.get('HEAD_TRIS', C.get('head_tris', 3900))),
                           dec_w=np.clip(G.smoothstep(2.6 * rE, 4.2 * rE, np.linalg.norm((Vb[used] - (ec + mouth) / 2) * np.array([1, 0.6, 1]), axis=1)), 0.02, 1)
                                 if os.environ.get('DECW', '1') == '1' else None)

    ctx.update(hobj=hobj, used=used, hw=hw)
    return ctx, parts, rigid, bobj

# ----------------------------------------------------------------- rigging
def rig(ctx, eyeobjs, rigid, bobj, S, T):
    key = ctx['key']
    arm = bpy.data.armatures.new('rig_' + key)
    ao = bpy.data.objects.new('reviewer_' + key, arm)
    ctx['coll'].objects.link(ao)
    bpy.context.view_layer.objects.active = ao
    bpy.ops.object.mode_set(mode='EDIT')
    X = lambda p: Vector(((np.asarray(p) + T) * S).tolist())
    chest = np.array([0, ctx['V'][ctx['wh'] > 0.9][:, 1].mean(), ctx['zc'] + (ctx['chin'] - ctx['zc']) * 0.35])
    neckb = np.array([0, chest[1] + 0.0, ctx['chin'] - ctx['head_h'] * 0.22])
    headb = np.array([0, chest[1], ctx['chin'] + ctx['head_h'] * 0.08])
    def bone(n, h, ln, parent=None):
        b = arm.edit_bones.new(n); b.head = X(h); b.tail = X(h) + Vector((0, 0, ln))
        if parent: b.parent = arm.edit_bones[parent]
        return b
    bone('Chest', chest, 0.12)
    bone('Neck', neckb, 0.1, 'Chest')
    bone('Head', headb, 0.25, 'Neck')
    for s in ('L', 'R'):
        bone('Eye_' + s, ctx['eyes'][s][0], 0.05, 'Head')
    bpy.ops.object.mode_set(mode='OBJECT')
    def skin_to(o, groups):
        o.parent = ao
        mod = o.modifiers.new('Armature', 'ARMATURE'); mod.object = ao
        for gname, w in groups.items():
            vg = o.vertex_groups.new(name=gname)
            w = np.broadcast_to(np.asarray(w, float), (len(o.data.vertices),))
            for i, x in enumerate(w):
                if x > 1e-4:
                    vg.add([i], float(x), 'REPLACE')
    wh = np.clip(ctx['hw']['wh'], 0, 1); wn = np.clip(ctx['hw']['wn'], 0, 1)
    tot = wh + wn
    wc = np.clip(1 - tot, 0, 1)
    ssum = wh + wn + wc
    skin_to(ctx['hobj'], {'Head': wh / ssum, 'Neck': wn / ssum, 'Chest': wc / ssum})
    for s, o in eyeobjs.items():
        skin_to(o, {s: 1.0})
    skin_to(bobj, {'Head': 1.0})
    for o, grp in rigid:
        skin_to(o, {grp: 1.0})
    return ao

# ----------------------------------------------------------------- main
built = []
for key, C in CHARS.items():
    if ONLY and key not in ONLY:
        continue
    built.append((key,) + build_character(key, C))

for key, ctx, eyeobjs, rigid, bobj in built:
    objs = [o for o in ctx['coll'].objects if o.type == 'MESH']
    zmax = max((o.matrix_world @ Vector(v.co)).z for o in objs for v in o.data.vertices)
    zc = ctx['zc']
    S = 1.0 / (zmax - zc)
    T = np.array([0, -ctx['ec'][1], -zc])
    M = Matrix.Scale(S, 4) @ Matrix.Translation(Vector(T.tolist()))
    for o in objs:
        o.data.transform(M, shape_keys=True)
        o.data.update()
    ao = rig(ctx, eyeobjs, rigid, bobj, S, T)
    ntri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
    xs = [(o.matrix_world @ Vector(v.co)).x for o in objs for v in o.data.vertices if (o.matrix_world @ Vector(v.co)).z > 0.45]
    print('CHAR', key, 'tris', ntri, 'width@head', max(xs) - min(xs))

os.makedirs(os.path.dirname(os.path.abspath(OUT_GLB)), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(OUT_BLEND))
bpy.ops.export_scene.gltf(filepath=os.path.abspath(OUT_GLB), export_format='GLB', export_yup=True,
                          export_apply=False, export_morph=True, export_morph_normal=True, export_skins=True,
                          export_animations=False, export_materials='EXPORT', export_texcoords=False,
                          export_image_format='NONE', export_extras=False, export_cameras=False, export_lights=False)
print('WROTE', OUT_GLB)
