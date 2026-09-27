"""NEURASCOPE Synthetic Reviewers -- sculpt pipeline.

Run from the repo root:
    blender -b --factory-startup -P assets/reviewers/sculpt/build.py [-- cold intent ...]

Every head, hair mass, headwear volume and garment is blocked out with metaballs, converted, voxel
remeshed and smoothed, then shaped with sculpt-style brushes (grab / inflate / crease / conform)
applied to the dense vertex set, decimated to budget and smooth shaded. Face parts that must animate
(lids, brows, mouth) are parametric pieces laid onto the sculpted surface so their shape keys are exact.

Blender axes: +Z up, character faces -Y (glTF export converts to Y-up / +Z forward).
"""
import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
OUT_GLB = os.path.join(ROOT, "public", "models", "reviewers.glb")
OUT_META = os.path.join(HERE, "renders", "meta.json")
IDS = ["cold", "intent", "visual", "enthusiast"]
MORPHS = ["blink_L", "blink_R", "wide", "browDown", "browUp", "mouthOpen"]
BONES = ["Chest", "Neck", "Head", "Eye_L", "Eye_R"]
MB_K = 1.0 / 0.575  # lone metaball (stiffness 2, threshold 0.6) surfaces at 0.575 * radius
TAU = math.pi * 2


# ------------------------------------------------------------------ small math
def ss(e0, e1, x):
    t = np.clip((np.asarray(x, dtype=float) - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def fall(t):
    """Brush falloff: 1 at centre, 0 at t>=1, smooth."""
    t = np.clip(np.asarray(t, dtype=float), 0.0, 1.0)
    return (1 - t * t) ** 2


def lin(c):
    c = np.asarray(c, dtype=float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def hexc(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def V(*a):
    return Vector(a)


def rotz(deg):
    return Quaternion((0, 0, 1), math.radians(deg))


def rotx(deg):
    return Quaternion((1, 0, 0), math.radians(deg))


def roty(deg):
    return Quaternion((0, 1, 0), math.radians(deg))


# ------------------------------------------------------------------ materials
MATS = {}


def material(name, rough=0.75, color=(1, 1, 1), vcol=True, emit=None):
    if name in MATS:
        return name
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Base Color"].default_value = (*lin(color), 1.0)
    if vcol:
        vc = nt.nodes.new("ShaderNodeVertexColor")
        vc.layer_name = "Col"
        nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    if emit is not None:
        bsdf.inputs["Emission Color"].default_value = (*lin(emit[:3]), 1.0)
        bsdf.inputs["Emission Strength"].default_value = emit[3]
    MATS[name] = m
    return name


# ------------------------------------------------------------------ mesh plumbing
def mesh_arrays(me):
    n = len(me.vertices)
    co = np.zeros(n * 3)
    me.vertices.foreach_get("co", co)
    polys = [tuple(p.vertices) for p in me.polygons]
    return co.reshape(-1, 3), polys


def normals_of(me):
    me.update()
    n = np.zeros(len(me.vertices) * 3)
    me.vertex_normals.foreach_get("vector", n)
    return n.reshape(-1, 3)


def set_co(me, co):
    me.vertices.foreach_set("co", np.ascontiguousarray(co, dtype=float).ravel())
    me.update()


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def evaluated_mesh(obj, name):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    me.name = name
    return me


def kill(obj):
    data = obj.data
    bpy.data.objects.remove(obj, do_unlink=True)
    if isinstance(data, bpy.types.MetaBall):
        bpy.data.metaballs.remove(data)
    elif isinstance(data, bpy.types.Mesh) and data.users == 0:
        bpy.data.meshes.remove(data)


_MB_COUNT = [0]


def blob(elements, res=0.009):
    """Metaball blockout -> mesh. elements: dicts(kind, co, semi|r, rot, neg, s)."""
    _MB_COUNT[0] += 1
    name = "mbfam" + "abcdefghijklmnopqrstuvwxyz"[_MB_COUNT[0] % 26] + "x" * (_MB_COUNT[0] // 26)
    mb = bpy.data.metaballs.new(name)
    mb.resolution = res
    mb.render_resolution = res
    mb.threshold = 0.6
    ob = link(bpy.data.objects.new(name, mb))
    for e in elements:
        s = e.get("s", 2.0)
        k = 1.0 / math.sqrt(max(1e-6, 1 - (0.6 / s) ** (1 / 3)))
        el = mb.elements.new(type="ELLIPSOID")
        semi = e["semi"] if "semi" in e else (e["r"],) * 3
        m = max(semi)
        el.radius = m * k
        el.size_x, el.size_y, el.size_z = (semi[0] / m, semi[1] / m, semi[2] / m)
        el.co = Vector(e["co"])
        el.stiffness = s
        if "rot" in e:
            el.rotation = e["rot"]
        el.use_negative = e.get("neg", False)
    bpy.context.view_layer.update()
    me = evaluated_mesh(ob, name + "_m")
    kill(ob)
    return me


def mod_apply(me, mods):
    """Run a modifier stack on a mesh datablock and return the evaluated mesh."""
    ob = link(bpy.data.objects.new("tmp_mod", me))
    for kind, props in mods:
        m = ob.modifiers.new(kind.lower(), kind)
        for k, v in props.items():
            setattr(m, k, v)
    bpy.context.view_layer.update()
    out = evaluated_mesh(ob, me.name)
    kill(ob)
    return out


def remesh(me, voxel=0.006, smooth=6, smooth_f=0.5):
    return mod_apply(me, [("REMESH", {"mode": "VOXEL", "voxel_size": voxel, "adaptivity": 0.0}),
                          ("SMOOTH", {"factor": smooth_f, "iterations": smooth})])


def decimate(me, tris):
    cur = sum(len(p.vertices) - 2 for p in me.polygons)
    me = mod_apply(me, [("TRIANGULATE", {})])
    if cur > tris:
        me = mod_apply(me, [("DECIMATE", {"decimate_type": "COLLAPSE", "ratio": tris / cur, "use_symmetry": False})])
    me = mod_apply(me, [("TRIANGULATE", {})])
    return me


def bisect(me, co, no, keep_above=True):
    bm = bmesh.new()
    bm.from_mesh(me)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=Vector(co), plane_no=Vector(no),
                           clear_inner=keep_above, clear_outer=not keep_above)
    bm.to_mesh(me)
    bm.free()
    me.update()
    return me


class Sculpt:
    """Sculpt-style brushes on a dense mesh (numpy). All brushes take world positions."""

    def __init__(self, me):
        self.me = me
        self.co, self.polys = mesh_arrays(me)
        self.cav = np.zeros(len(self.co))  # accumulated crease depth (drives cavity tint)

    def normals(self):
        set_co(self.me, self.co)
        return normals_of(self.me)

    def dist(self, c, scale=(1, 1, 1)):
        d = (self.co - np.asarray(c)) / np.asarray(scale)
        return np.sqrt((d * d).sum(1))

    def grab(self, c, r, delta, scale=(1, 1, 1)):
        w = fall(self.dist(c, scale) / r)
        self.co += w[:, None] * np.asarray(delta)

    def inflate(self, c, r, amt, scale=(1, 1, 1), mask=None):
        n = self.normals()
        w = fall(self.dist(c, scale) / r) * amt
        if mask is not None:
            w = w * mask
        self.co += n * w[:, None]
        if amt < 0:
            self.cav += -w

    def crease_path(self, pts, r, depth, sharp=2.0):
        """Push inward along a polyline with a sharp falloff (crease brush)."""
        n = self.normals()
        pts = np.asarray(pts)
        best = np.full(len(self.co), 1e9)
        for a, b in zip(pts[:-1], pts[1:]):
            ab = b - a
            t = np.clip(((self.co - a) @ ab) / max(1e-12, ab @ ab), 0, 1)
            q = a + t[:, None] * ab
            best = np.minimum(best, np.linalg.norm(self.co - q, axis=1))
        w = fall(best / r) ** sharp * depth
        self.co -= n * w[:, None]
        self.cav += w

    def smooth(self, iters=2, f=0.5, mask=None):
        nb = [[] for _ in range(len(self.co))]
        for p in self.polys:
            for i in range(len(p)):
                a, b = p[i], p[(i + 1) % len(p)]
                nb[a].append(b)
                nb[b].append(a)
        idx = [np.array(sorted(set(x)) or [i]) for i, x in enumerate(nb)]
        m = np.ones(len(self.co)) if mask is None else mask
        for _ in range(iters):
            avg = np.array([self.co[ix].mean(0) for ix in idx])
            self.co += (avg - self.co) * (f * m)[:, None]

    def done(self):
        set_co(self.me, self.co)
        return self.me


# ------------------------------------------------------------------ geometry builders (numpy)
def ellipsoid(center, semi, nu=16, nv=10, rot=None):
    verts, faces = [], []
    for j in range(1, nv):
        th = math.pi * j / nv - math.pi / 2
        for i in range(nu):
            ph = TAU * i / nu
            verts.append((math.cos(th) * math.sin(ph), -math.cos(th) * math.cos(ph), math.sin(th)))
    verts += [(0, 0, -1), (0, 0, 1)]
    bot, top = len(verts) - 2, len(verts) - 1
    for j in range(nv - 2):
        for i in range(nu):
            a, b = j * nu + i, j * nu + (i + 1) % nu
            faces.append((a, b, b + nu, a + nu))
    for i in range(nu):
        faces.append((bot, (i + 1) % nu, i))
        a = (nv - 2) * nu
        faces.append((a + i, a + (i + 1) % nu, top))
    v = np.array(verts) * np.asarray(semi)
    if rot is not None:
        R = np.array(rot.to_matrix())
        v = v @ R.T
    return v + np.asarray(center), faces


def tube(pts, ra, rb, ring=8, up=(0, 0, 1), closed=False, cap=True, ups=None):
    pts = [np.asarray(p, dtype=float) for p in pts]
    n = len(pts)
    ra = np.broadcast_to(np.asarray(ra, dtype=float), (n,))
    rb = np.broadcast_to(np.asarray(rb, dtype=float), (n,))
    verts, faces = [], []
    for k in range(n):
        if closed:
            T = pts[(k + 1) % n] - pts[k - 1]
        else:
            T = pts[min(n - 1, k + 1)] - pts[max(0, k - 1)]
        T = T / np.linalg.norm(T)
        u = np.asarray(ups[k] if ups is not None else up, dtype=float)
        N1 = u - (u @ T) * T
        N1 /= np.linalg.norm(N1)
        N2 = np.cross(T, N1)
        for i in range(ring):
            a = TAU * i / ring
            verts.append(pts[k] + N1 * math.cos(a) * ra[k] + N2 * math.sin(a) * rb[k])
    segs = n if closed else n - 1
    for k in range(segs):
        k2 = (k + 1) % n
        for i in range(ring):
            i2 = (i + 1) % ring
            faces.append((k * ring + i, k * ring + i2, k2 * ring + i2, k2 * ring + i))
    if cap and not closed:
        for end, sgn in ((0, -1), (n - 1, 1)):
            T = pts[end] - pts[end - sgn] if n > 1 else np.array([0, 0, 1.0])
            T = T / np.linalg.norm(T)
            c = len(verts)
            verts.append(pts[end] + T * min(ra[end], rb[end]) * 0.6)
            for i in range(ring):
                i2 = (i + 1) % ring
                f = (end * ring + i, end * ring + i2, c)
                faces.append(f if sgn > 0 else f[::-1])
    return np.array(verts), faces


def grid_faces(nu, nv, wrap_u=False):
    faces = []
    for j in range(nv - 1):
        for i in range(nu if wrap_u else nu - 1):
            i2 = (i + 1) % nu
            faces.append((j * nu + i, j * nu + i2, (j + 1) * nu + i2, (j + 1) * nu + i))
    return faces


def slab(outer, inner, wrap_u=False):
    """Closed shell from two (nv, nu, 3) grids with the rims stitched (cloth with thickness)."""
    nv, nu, _ = outer.shape
    v = np.concatenate([outer.reshape(-1, 3), inner.reshape(-1, 3)])
    off = nu * nv
    f = grid_faces(nu, nv, wrap_u)
    faces = [tuple(x) for x in f] + [tuple(off + i for i in x[::-1]) for x in f]

    def rim(idx):
        for a, b in zip(idx[:-1], idx[1:]):
            faces.append((a, b, b + off, a + off))

    rim([(nv - 1) * nu + i for i in range(nu)] + ([(nv - 1) * nu] if wrap_u else []))
    rim([i for i in range(nu)][::-1] + ([nu - 1] if wrap_u else []))
    if not wrap_u:
        rim([j * nu for j in range(nv)][::-1])
        rim([j * nu + nu - 1 for j in range(nv)])
    return v, faces


# ------------------------------------------------------------------ part accumulator
class Part:
    def __init__(self, name):
        self.name = name
        self.segs = []  # (verts, keys)
        self.F, self.FM, self.C, self.W = [], [], [], []
        self.mats = []
        self.n = 0

    def add(self, v, faces, mat, col, weights, keys=None):
        v = np.asarray(v, dtype=float)
        base = self.n
        if mat not in self.mats:
            self.mats.append(mat)
        mi = self.mats.index(mat)
        self.segs.append((v, keys or {}))
        self.F += [tuple(base + i for i in f) for f in faces]
        self.FM += [mi] * len(faces)
        self.C.append(np.broadcast_to(np.asarray(col, dtype=float), (len(v), 3)).copy())
        self.W += [weights] * len(v) if isinstance(weights, dict) else list(weights)
        self.n += len(v)
        return base

    def verts(self):
        return np.concatenate([v for v, _ in self.segs]) if self.segs else np.zeros((0, 3))

    def key(self, k):
        return np.concatenate([kk.get(k, v) for v, kk in self.segs])

    def tris(self):
        return sum(len(f) - 2 for f in self.F)


def build_object(part, arm, keys=()):
    co = part.verts()
    me = bpy.data.meshes.new(part.name)
    me.from_pydata([tuple(p) for p in co], [], part.F)
    for m in part.mats:
        me.materials.append(MATS[m])
    me.polygons.foreach_set("material_index", part.FM)
    me.shade_smooth()
    col = np.concatenate(part.C)
    lc = lin(np.clip(col, 0, 1))
    attr = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    rgba = np.concatenate([lc, np.ones((len(lc), 1))], 1)
    attr.data.foreach_set("color", rgba.ravel())
    ob = link(bpy.data.objects.new(part.name, me))
    for b in BONES:
        ob.vertex_groups.new(name=b)
    for i, w in enumerate(part.W):
        for b, x in w.items():
            if x > 1e-4:
                ob.vertex_groups[b].add([i], float(x), "REPLACE")
    ob.parent = arm
    md = ob.modifiers.new("Armature", "ARMATURE")
    md.object = arm
    if keys:
        ob.shape_key_add(name="Basis", from_mix=False)
        for k in keys:
            sk = ob.shape_key_add(name=k, from_mix=False)
            kv = part.key(k)
            sk.data.foreach_set("co", kv.ravel())
    return ob


# ------------------------------------------------------------------ surface helpers
def bvh(co, polys):
    return BVHTree.FromPolygons([tuple(p) for p in co], [tuple(p) for p in polys])


def cast(tree, o, d):
    d = Vector(d).normalized()
    loc, nrm, _, _ = tree.ray_cast(Vector(o), d, 5.0)
    if loc is None:
        return None, None
    return np.array(loc), np.array(nrm)


def front(tree, x, z):
    return cast(tree, (x, -1.0, z), (0, 1, 0))


def on_face(tree, x, z, lift):
    p, n = front(tree, x, z)
    if p is None:
        return np.array([x, -0.2, z])
    return p + n * lift


def kd_map(src, dst, vals):
    from mathutils.kdtree import KDTree
    kd = KDTree(len(src))
    for i, p in enumerate(src):
        kd.insert(Vector(p), i)
    kd.balance()
    out = np.zeros(len(dst))
    for i, p in enumerate(dst):
        found = kd.find_n(Vector(p), 4)
        w = np.array([1 / (1e-4 + d) for _, _, d in found])
        out[i] = (w * np.array([vals[j] for _, j, _ in found])).sum() / w.sum()
    return out


def volume(elems, budget, voxel=0.005, smooth=4, sculpt=None, res=0.009, cut_z=None, cut=None):
    """metaball blockout -> voxel remesh -> smooth -> sculpt brushes -> (cut) -> decimate."""
    me = blob(elems, res)
    me = remesh(me, voxel, smooth)
    S = Sculpt(me)
    if sculpt:
        sculpt(S)
    S.done()
    dense, cav = S.co.copy(), S.cav.copy()
    if cut_z is not None:
        bisect(me, (0, 0, cut_z), (0, 0, 1))
    if cut is not None:
        bisect(me, cut[0], cut[1])
    me = decimate(me, budget)
    co, polys = mesh_arrays(me)
    c = kd_map(dense, co, cav) if len(co) else np.zeros(0)
    bpy.data.meshes.remove(me)
    return co, [tuple(p) for p in polys], c


def cav_tint(base, cav, k, tint=(0.55, 0.5, 0.52)):
    base = np.asarray(base, dtype=float)
    a = np.clip(cav * k, 0, 1)[:, None]
    return base * (1 - a) + base * np.asarray(tint) * a


def ell(co, semi, **kw):
    return dict(co=co, semi=semi, **kw)


def sph_dir(az, el):
    az, el = math.radians(az), math.radians(el)
    return np.array([math.cos(el) * math.sin(az), -math.cos(el) * math.cos(az), math.sin(el)])


# ------------------------------------------------------------------ head
class Head:
    def __init__(self, P):
        self.P = P
        me = blob(P["head"], res=0.008)
        me = remesh(me, 0.0045, 4, 0.5)
        S = Sculpt(me)
        tree = bvh(S.co, S.polys)
        ex, ez, (a, d, c) = P["ex"], P["ez"], P["eye"]
        self.E = {}
        for side in (1, -1):
            p, _ = front(tree, side * ex, ez)
            self.E[side] = np.array([side * ex, p[1] + P["eye_back"], ez])
        # nose: soft bulb (inflate), tip slightly lower and fuller
        zn, zm = P["zn"], P["zm"]
        pn, _ = front(tree, 0, zn)
        S.inflate(pn + [0, 0, 0.012], 0.05, P["nose"][0], scale=(1.0, 1.0, 1.2))
        S.inflate(pn - [0, 0, 0.004], 0.032, P["nose"][1])
        # cheeks
        for side in (1, -1):
            pc, _ = front(tree, side * P["cheek"][0], P["cheek"][1])
            S.inflate(pc, P["cheek"][2], P["cheek"][3])
        # ear bowls
        for side in (1, -1):
            pe, _ = cast(tree, (side * 1.0, P["ear"][0], P["ear"][1]), (-side, 0, 0))
            if pe is not None:
                S.inflate(pe + [0, -0.01, 0], 0.028, -0.009)
        # brow ridge / lid fat above the socket
        for side in (1, -1):
            E = self.E[side]
            S.inflate(E + [0, -0.02, c * 1.15], 0.05, 0.004, scale=(1.0, 1, 0.6))
        # eye sockets: flat floor at the eyeball centre plane, soft crater wall
        for side in (1, -1):
            E = self.E[side]
            dx = (S.co[:, 0] - E[0]) / a
            dz = (S.co[:, 2] - E[2]) / c
            e = np.sqrt(dx * dx + dz * dz)
            fr = S.co[:, 1] < E[1] + 0.01
            target = E[1] + 0.001
            w = 1 - ss(1.04, 1.5, e)
            push = np.maximum(0.0, target - S.co[:, 1]) * w * fr
            S.co[:, 1] += push
            S.cav += push * 2.0 * (e > 1.0)
        rim = np.zeros(len(S.co))
        for side in (1, -1):
            E = self.E[side]
            e = np.sqrt(((S.co[:, 0] - E[0]) / a) ** 2 + ((S.co[:, 2] - E[2]) / c) ** 2)
            rim = np.maximum(rim, (e > 0.95) * (1 - ss(1.3, 1.8, e)) * (S.co[:, 1] < E[1] + 0.02))
        S.smooth(3, 0.5, rim)
        # mouth crease + corner dimples
        tree = bvh(S.co, S.polys)
        xs = np.linspace(-P["mw"], P["mw"], 9)
        pts = [on_face(tree, x, P["mouth_up"](x), 0.0) for x in xs]
        S.crease_path(pts, 0.009, 0.003)
        for side in (1, -1):
            x = side * P["mw"]
            S.crease_path([on_face(tree, x * 1.02, P["mouth_up"](x) + 0.008, 0), on_face(tree, x * 1.08, P["mouth_up"](x) - 0.006, 0)], 0.007, 0.0035)
        # philtrum and under-lip soft shape
        S.inflate(on_face(tree, 0, zm - 0.022, 0), 0.03, 0.004)
        S.done()
        dense, cav = S.co.copy(), S.cav.copy()
        self.dtree = bvh(dense, S.polys)
        me = decimate(me, P["budget_head"])
        self.co, polys = mesh_arrays(me)
        self.polys = [tuple(p) for p in polys]
        self.cav = kd_map(dense, self.co, cav)
        self.n = normals_of(me)
        bpy.data.meshes.remove(me)
        self.tree = bvh(self.co, self.polys)

    def colors(self):
        P = self.P
        x, y, z = self.co[:, 0], self.co[:, 1], self.co[:, 2]
        skin = np.asarray(P["skin"])
        col = np.broadcast_to(skin, self.co.shape).copy()
        blush = skin * np.array([1.0, 0.8, 0.8])
        b = np.zeros(len(x))
        for side in (1, -1):
            b += np.exp(-(((x - side * P["cheek"][0]) / 0.05) ** 2 + ((z - P["cheek"][1] + 0.005) / 0.035) ** 2)) * (y < -0.05)
        b = np.clip(b * P["blush"], 0, 1)
        col = col * (1 - b[:, None]) + blush * b[:, None]
        nose = np.exp(-((x / 0.03) ** 2 + ((z - P["zn"] + 0.004) / 0.025) ** 2)) * (y < -0.1) * 0.35
        col = col * (1 - nose[:, None]) + blush * nose[:, None]
        lip = np.exp(-((x / (P["mw"] * 0.75)) ** 2 + ((z - P["zm"] + 0.011) / 0.008) ** 2)) * (y < -0.1) * 0.32
        col = col * (1 - lip[:, None]) + np.asarray(P["lip"]) * lip[:, None]
        ear = np.exp(-(((np.abs(x) - 0.23) / 0.03) ** 2 + ((z - P["ear"][1]) / 0.05) ** 2)) * 0.25
        col = col * (1 - ear[:, None]) + blush * ear[:, None]
        under = ss(P["chin"] + 0.02, P["chin"] - 0.06, z) * 0.18
        col = col * (1 - under[:, None])
        return cav_tint(col, self.cav, 25, (0.72, 0.58, 0.55))


def head_weights(co, chin):
    out = []
    for x, y, z in co:
        r = math.hypot(x, y - 0.035)
        if z > chin + 0.01 or r > 0.12:
            h = 1.0 if z > 0.36 else float(ss(0.30, 0.36, z))
        else:
            h = float(ss(chin - 0.10, chin + 0.01, z))
        out.append({"Head": h, "Neck": 1 - h} if 0 < h < 1 else ({"Head": 1.0} if h >= 1 else {"Neck": 1.0}))
    return out


# ------------------------------------------------------------------ face pieces (parametric, exact morphs)
def lid(E, semi, th_edge, upper, nphi=15, nth=5, gap=0.0022, thick=0.0045):
    a, d, c = semi
    phis = np.linspace(-1.8, 1.8, nphi)
    t0 = math.radians(86 if upper else -86)
    ths = np.linspace(t0, th_edge, nth)
    O, I = np.zeros((nth, nphi, 3)), np.zeros((nth, nphi, 3))
    for j, th in enumerate(ths):
        for i, ph in enumerate(phis):
            u = np.array([math.cos(th) * math.sin(ph), -math.cos(th) * math.cos(ph), math.sin(th)])
            p = E + u * semi
            n = u / np.asarray(semi)
            n /= np.linalg.norm(n)
            # thicker, rounder at the rim so the lid edge reads as a skin roll
            k = 1.0 + 0.6 * (j == nth - 1)
            O[j, i] = p + n * (gap + thick * k)
            I[j, i] = p + n * gap
    return slab(O, I)


def eye_parts(H, side, P, eyes, face):
    E = H.E[side]
    a, d, c = P["eye"]
    bone = "Eye_L" if side > 0 else "Eye_R"
    v, f = ellipsoid(E, (a, d, c), 20, 12)
    eyes.add(v, f, "eye", P["iris"], {bone: 1.0})
    # catch-light on the eye's front surface, upper right (viewer's)
    ph, th = math.radians(24), math.radians(30)
    u = np.array([math.cos(th) * math.sin(ph), -math.cos(th) * math.cos(ph), math.sin(th)])
    p = E + u * np.array([a, d, c])
    n = u / np.array([a, d, c])
    n /= np.linalg.norm(n)
    q = Vector((0, -1, 0)).rotation_difference(Vector(n))
    v, f = ellipsoid((0, 0, 0), (P["catch"], 0.0015, P["catch"] * 1.15), 10, 6, rot=q)
    eyes.add(v + p + n * 0.0006, f, "catch", (1, 1, 1), {bone: 1.0})
    # lids
    th_u, th_l = P["lid"]
    blink = "blink_L" if side > 0 else "blink_R"
    closed = math.radians(-38)
    vu, fu = lid(E, (a, d, c), th_u, True)
    ku = {blink: lid(E, (a, d, c), closed, True)[0], "wide": lid(E, (a, d, c), math.radians(82), True)[0]}
    face.add(vu, fu, "skin", P["skin"] * 0.93, {"Head": 1.0}, ku)
    vl, fl = lid(E, (a, d, c), th_l, False, nth=3, thick=0.0028)
    kl = {blink: lid(E, (a, d, c), closed - 0.01, False, nth=3, thick=0.0028)[0], "wide": lid(E, (a, d, c), math.radians(-80), False, nth=3, thick=0.0028)[0]}
    face.add(vl, fl, "skin", P["skin"] * 0.9, {"Head": 1.0}, kl)
    # lash line: a thin dark roll on the upper-lid rim (reads as the lid edge at small sizes)
    def lash(th):
        pts = []
        for ph in np.linspace(-1.25, 1.35 if side < 0 else 1.25, 9) * (1 if side > 0 else -1):
            u = np.array([math.cos(th) * math.sin(ph), -math.cos(th) * math.cos(ph), math.sin(th)])
            n = u / np.array([a, d, c])
            n /= np.linalg.norm(n)
            pts.append(E + u * np.array([a, d, c]) + n * 0.0075)
        return pts
    prof = np.sin(np.linspace(0.25, math.pi - 0.1, 9)) * P["lash"] + 0.0012
    vv, ff = tube(lash(th_u), prof, prof * 0.8, ring=6, up=(0, -1, 0.3))
    kk = {blink: tube(lash(closed), prof, prof * 0.8, ring=6, up=(0, -1, 0.3))[0],
          "wide": tube(lash(math.radians(82)), prof, prof * 0.8, ring=6, up=(0, -1, 0.3))[0]}
    face.add(vv, ff, "brow", P["lashc"], {"Head": 1.0}, kk)


def brow(H, side, P, face, dz=0.0, inner=0.0, tilt=0.0):
    E = H.E[side]
    a, d, c = P["eye"]
    bz, blen, bh, arch, btilt = P["brow"]
    n = 9
    pts = []
    for t in np.linspace(0, 1, n):
        x = side * (E[0] * 1.0 - blen * 0.48 + blen * t) * 1.0
        x = side * (abs(E[0]) - blen * 0.5 + blen * t)
        z = E[2] + c + bz + dz + arch * math.sin(math.pi * t) + (btilt + tilt) * (t - 0.5) + inner * (1 - t) ** 1.5
        pts.append(on_face(H.dtree, x, z, 0.006))
    t = np.linspace(0, 1, n)
    ra = bh * (1.0 - 0.45 * t ** 1.4) * np.clip(np.sin(np.pi * (0.12 + 0.88 * t)) * 1.6, 0.35, 1.0)
    return tube(pts, ra, 0.0065, ring=8, up=(0, 0, 1))


def mouth(H, P, open_amt=0.0):
    nu, nv = 17, 5
    xs = np.linspace(-P["mw"], P["mw"], nu)
    O = np.zeros((nv, nu, 3))
    I = np.zeros((nv, nu, 3))
    for i, x in enumerate(xs):
        zu = P["mouth_up"](x)
        zl = P["mouth_lo"](x) - open_amt * max(0.0, 1 - (x / P["mw"]) ** 2) ** 0.8
        for j in range(nv):
            t = j / (nv - 1)
            z = zu * (1 - t) + zl * t
            O[j, i] = on_face(H.dtree, x, z, 0.0026)
            I[j, i] = on_face(H.dtree, x, z, -0.001)
    return slab(O, I)


def mouth_colors(P):
    nu, nv = 17, 5
    rows = []
    for j in range(nv):
        t = j / (nv - 1)
        rows.append(P["teeth"] if (P.get("teeth") is not None and t < 0.3) else P["mouthc"])
    c = np.array([rows[j] for j in range(nv) for _ in range(nu)])
    return np.concatenate([c, c * 0.8])


def jaw_delta(co, P, amt=1.0):
    x, y, z = co[:, 0], co[:, 1], co[:, 2]
    zm = P["zm"]
    w = ss(zm - 0.004, zm - 0.04, z) * ss(0.2, 0.09, np.abs(x)) * ss(0.02, -0.08, y) * ss(P["chin"] - 0.07, P["chin"] - 0.01, z)
    return co + np.stack([0 * w, 0.004 * w, -0.022 * w * amt], 1)


# ------------------------------------------------------------------ garments
def torso_elems(w=1.0, P=None):
    return [ell((0, 0.03, 0.06), (0.35 * w, 0.2, 0.2)),
            ell((0.2 * w, 0.03, 0.15), (0.15, 0.13, 0.1), s=2.4), ell((-0.2 * w, 0.03, 0.15), (0.15, 0.13, 0.1), s=2.4),
            ell((0, -0.04, 0.12), (0.2 * w, 0.13, 0.14)), ell((0, 0.04, 0.24), (0.1, 0.09, 0.08))]


def torso_sculpt(folds):
    def f(S):
        for p, r, d in folds:
            S.crease_path(p, r, d)
    return f


def add_torso(body, P, color, w=1.0, folds=(), budget=1300):
    co, polys, cav = volume(torso_elems(w, P), budget, voxel=0.007, smooth=5, sculpt=torso_sculpt(folds), res=0.012, cut_z=0.004)
    P["_torso_tree"] = bvh(co, polys)
    body.add(co, polys, "cloth", cav_tint(np.broadcast_to(color, co.shape), cav, 30), {"Chest": 1.0})
    return co, polys


def add_hood(body, P, color, str_col):
    el = []
    for az in range(30, 331, 15):
        k = (1 - math.cos(math.radians(az))) / 2
        R = 0.1 + 0.03 * k
        p = (R * math.sin(math.radians(az)), 0.035 - R * math.cos(math.radians(az)), 0.28 + 0.04 * k)
        el.append(ell(p, (0.032 + 0.03 * k,) * 3))
    el.append(ell((0, 0.15, 0.33), (0.14, 0.07, 0.08)))
    el.append(ell((0, 0.035, 0.36), (0.075, 0.075, 0.12), neg=True, s=4))

    def sc(S):
        ring = []
        for az in range(40, 321, 20):
            k = (1 - math.cos(math.radians(az))) / 2
            R = 0.085 + 0.02 * k
            ring.append((R * math.sin(math.radians(az)), 0.035 - R * math.cos(math.radians(az)), 0.31 + 0.06 * k))
        S.crease_path(ring, 0.016, 0.01)
    co, polys, cav = volume(el, 900, voxel=0.006, smooth=4, sculpt=sc, res=0.01)
    body.add(co, polys, "cloth", cav_tint(np.broadcast_to(color * 1.08, co.shape), cav, 30), {"Chest": 1.0})
    # drawstrings with aglets (volumed tubes that follow the chest)
    for side in (1, -1):
        x0 = side * 0.045
        pts = []
        for k, z in enumerate(np.linspace(0.27, 0.13, 7)):
            p = on_face(P["_torso_tree"], x0 + side * 0.006 * k / 6, z, 0.008)
            pts.append(p)
        v, f = tube(pts, 0.0065, 0.0065, ring=8)
        body.add(v, f, "cloth", str_col, {"Chest": 1.0})
        e = pts[-1]
        v, f = tube([e + [0, -0.001, 0.004], e - [0, 0, 0.024]], 0.0085, 0.0085, ring=8)
        body.add(v, f, "cloth", str_col * 0.85, {"Chest": 1.0})


# ------------------------------------------------------------------ characters
def mouth_fns(zm, mw, curve, thick, asym=0.0, open_h=0.0):
    def up(x):
        u = max(-1.0, min(1.0, x / mw))
        return zm + curve * u * u + asym * max(0.0, u) ** 3 + 0.004 * abs(u) ** 6
    def lo(x):
        u = max(-1.0, min(1.0, x / mw))
        base = up(x) - thick * (1 - u * u) ** 0.5 - 0.0018
        return base - open_h * (1 - u * u) ** 0.8
    return up, lo


def head_elems(w=1.0, cheek=1.0, jaw=1.0, chin_drop=0.0, neck_r=0.068, crown=1.0, face_len=0.0):
    w *= 1.1
    return [
        ell((0, 0.012, 0.72), (0.232 * w, 0.222, 0.228 * crown)),
        ell((0, -0.035, 0.585 - face_len * 0.5), (0.19 * w * cheek, 0.165, 0.145 + face_len)),
        ell((0.1 * w * cheek, -0.1, 0.565), (0.075 * cheek,) * 3), ell((-0.1 * w * cheek, -0.1, 0.565), (0.075 * cheek,) * 3),
        ell((0, -0.1, 0.495 - chin_drop), (0.07 * jaw, 0.058, 0.058)),
        ell((0.243 * w, 0.03, 0.63), (0.03, 0.036, 0.05), s=3), ell((-0.243 * w, 0.03, 0.63), (0.03, 0.036, 0.05), s=3),
        ell((0, 0.035, 0.37), (neck_r, neck_r, 0.15)),
    ]


def base_P(**kw):
    P = dict(ex=0.092, ez=0.645, eye=(0.043, 0.022, 0.058), eye_back=0.016, lid=(math.radians(58), math.radians(-62)),
             catch=0.0115, iris=hexc("#140d0b"), lash=0.0028, lashc=hexc("#1a110e"), zn=0.585, zm=0.535, mw=0.048,
             nose=(0.026, 0.028), cheek=(0.118, 0.575, 0.06, 0.006), ear=(0.02, 0.64), chin=0.44, blush=0.55,
             budget_head=3000, brow=(0.034, 0.066, 0.0165, 0.006, -0.004), teeth=None)
    P.update(kw)
    return P


CHARS = {}
HEAD_DROP = 0.05


def char(fn):
    CHARS[fn.__name__] = fn
    return fn


@char
def cold():
    skin = hexc("#f2ab82")
    up, lo = mouth_fns(0.53, 0.056, 0.016, 0.0042, asym=0.012)
    return base_P(skin=skin, lip=hexc("#c9745f"), mouthc=hexc("#5e2522"), hair=hexc("#4e2a1a"), browc=hexc("#4a2717"),
                  cloth=hexc("#252c46"), strings=hexc("#e6e6ee"), head=head_elems(1.0, 1.06, 0.95),
                  mouth_up=up, mouth_lo=lo, mw=0.058, lid=(math.radians(52), math.radians(-60)),
                  brow=(0.03, 0.064, 0.0135, 0.004, -0.002))


@char
def intent():
    skin = hexc("#dd9a64")
    up, lo = mouth_fns(0.527, 0.05, 0.015, 0.0042)
    return base_P(skin=skin, lip=hexc("#d0747a"), mouthc=hexc("#6a2530"), hair=hexc("#2a1a16"), browc=hexc("#241512"),
                  cloth=hexc("#ec73b0"), gold=hexc("#e8b64a"), head=head_elems(0.94, 0.9, 0.85, 0.012, crown=1.03, face_len=0.006),
                  mouth_up=up, mouth_lo=lo, mw=0.052, ex=0.088, lid=(math.radians(66), math.radians(-64)), lash=0.0038,
                  brow=(0.044, 0.062, 0.0125, 0.008, 0.004), chin=0.43, cheek=(0.11, 0.57, 0.055, 0.004))


@char
def visual():
    skin = hexc("#8e4f2e")
    up, lo = mouth_fns(0.532, 0.066, 0.016, 0.004, open_h=0.03)
    return base_P(skin=skin, lip=hexc("#8e4636"), mouthc=hexc("#4a1616"), teeth=hexc("#f4efe6"), hair=hexc("#1c120d"),
                  browc=hexc("#1a100b"), cloth=hexc("#7d3fcf"), cap=hexc("#5236e0"), glass=hexc("#efe4c8"),
                  strings=hexc("#f0ecf6"), head=head_elems(1.0, 1.12, 1.0), mouth_up=up, mouth_lo=lo, mw=0.066,
                  cheek=(0.125, 0.575, 0.065, 0.009), blush=0.35, brow=(0.036, 0.064, 0.0135, 0.006, -0.003))


@char
def enthusiast():
    skin = hexc("#c4905a")
    up, lo = mouth_fns(0.508, 0.052, 0.013, 0.0045)
    return base_P(skin=skin, lip=hexc("#a45f4c"), mouthc=hexc("#6a2c26"), hair=hexc("#2b1d17"), browc=hexc("#1f140f"),
                  cloth=hexc("#f3f1ec"), ghutra=hexc("#f7f6f3"), agal=hexc("#141414"),
                  head=head_elems(0.99, 1.02, 1.35, 0.03, neck_r=0.08, face_len=0.02), mouth_up=up, mouth_lo=lo, mw=0.056,
                  zn=0.575, zm=0.51, ez=0.64, chin=0.405, lid=(math.radians(55), math.radians(-60)), blush=0.3,
                  brow=(0.03, 0.07, 0.0145, 0.003, 0.006), nose=(0.03, 0.032), budget_head=2500, eye=(0.041, 0.021, 0.055))


# ------------------------------------------------------------------ hair & headwear styles
def clump_creases(S, centers, radii, depth=0.012, width=0.018, near=0.03):
    C = np.asarray(centers)
    R = np.asarray(radii)
    d = np.linalg.norm(S.co[:, None, :] - C[None], axis=2) - R[None]
    ds = np.sort(d, 1)
    w = fall((ds[:, 1] - ds[:, 0]) / width) * (ds[:, 1] < near)
    n = S.normals()
    S.co -= n * (w * depth)[:, None]
    S.cav += w * depth


def style_cold(P, H, hair, body, face):
    O = np.array([0, 0.02, 0.73])
    curls = [(0, 84, 0.1), (-45, 60, 0.098), (45, 60, 0.098), (-120, 55, 0.095), (120, 55, 0.095), (180, 60, 0.1),
             (-80, 28, 0.085), (80, 28, 0.085), (-150, 22, 0.09), (150, 22, 0.09), (180, 15, 0.085)]
    fringe = [(-42, 30, 0.07), (-14, 36, 0.074), (16, 35, 0.072), (44, 28, 0.066)]
    centers, radii, el = [], [], []
    for az, e, r in curls:
        c = O + sph_dir(az, e) * 0.245
        centers.append(c)
        radii.append(r)
        el.append(ell(c, (r, r, r * 0.9)))
    for k, (az, e, r) in enumerate(fringe):
        c = O + sph_dir(az, e) * 0.24 + [0, -0.012, -0.018 - 0.008 * (k % 2)]
        centers.append(c)
        radii.append(r)
        el.append(ell(c, (r * 1.0, r * 0.75, r * 1.05)))
    el += [ell((0, 0.025, 0.79), (0.24, 0.235, 0.2)), ell((0, 0.06, 0.69), (0.215, 0.185, 0.17))]
    el += [ell((0, -0.26, 0.62), (0.2, 0.15, 0.15), neg=True, s=5),
           ell((0.262, 0.02, 0.62), (0.05, 0.06, 0.07), neg=True, s=5), ell((-0.262, 0.02, 0.62), (0.05, 0.06, 0.07), neg=True, s=5),
           ell((0, 0.15, 0.49), (0.17, 0.12, 0.1), neg=True, s=5)]

    def sc(S):
        clump_creases(S, centers, radii, 0.018, 0.024, 0.04)
        for c, r in zip(centers, radii):  # a curl dimple on each clump
            out = (c - O) / np.linalg.norm(c - O)
            S.inflate(c + out * r * 0.95, r * 0.35, -0.006)
    co, polys, cav = volume(el, 3000, voxel=0.0055, smooth=3, sculpt=sc, res=0.009)
    hair.add(co, polys, "hair", cav_tint(np.broadcast_to(P["hair"], co.shape), cav, 30, (0.55, 0.45, 0.42)), {"Head": 1.0})
    add_torso(body, P, P["cloth"], folds=[([(0.12, -0.2, 0.1), (0.2, -0.14, 0.02)], 0.02, 0.006),
                                         ([(-0.1, -0.2, 0.14), (-0.18, -0.15, 0.03)], 0.02, 0.006)])
    add_hood(body, P, P["cloth"], P["strings"])


def chain(path, r0, r1, flat=0.8, step=0.35):
    """Dense metaball chain along a polyline -> one continuous lock volume."""
    path = [np.asarray(p, dtype=float) for p in path]
    L = np.cumsum([0] + [np.linalg.norm(path[i + 1] - path[i]) for i in range(len(path) - 1)])
    out = []
    t = 0.0
    while t <= L[-1]:
        i = min(np.searchsorted(L, t, side="right") - 1, len(path) - 2)
        u = (t - L[i]) / max(1e-9, L[i + 1] - L[i])
        p = path[i] * (1 - u) + path[i + 1] * u
        r = r0 + (r1 - r0) * t / L[-1]
        out.append(ell(p, (r, r * flat, r)))
        t += r * step
    return out


def style_intent(P, H, hair, body, face):
    el = [ell((0, 0.03, 0.8), (0.25, 0.242, 0.218)), ell((0, 0.11, 0.56), (0.24, 0.14, 0.26)),
          ell((0, 0.12, 0.34), (0.23, 0.1, 0.12))]
    locks = []
    for side in (1, -1):
        pa = [(0.232, 0.0, 0.76), (0.245, 0.0, 0.62), (0.235, -0.01, 0.5), (0.215, -0.05, 0.4), (0.2, -0.1, 0.3), (0.19, -0.12, 0.2), (0.185, -0.125, 0.14)]
        pb = [(0.215, 0.05, 0.62), (0.22, 0.05, 0.48), (0.205, 0.0, 0.38), (0.175, -0.07, 0.28), (0.155, -0.1, 0.18)]
        for path, r0, r1 in ((pa, 0.05, 0.04), (pb, 0.044, 0.034)):
            path = [np.array([side * p[0], p[1], p[2]]) for p in path]
            locks.append(path)
            el += chain(path, r0, r1, 0.75)
    # side-swept fringe: one big lock from a part at +x sweeping across the forehead to -x
    fr = [(0.08, -0.17, 0.92), (0.02, -0.2, 0.875), (-0.06, -0.21, 0.835), (-0.13, -0.19, 0.795), (-0.2, -0.13, 0.75), (-0.235, -0.06, 0.7)]
    el += chain(fr, 0.06, 0.042, 0.65)
    el += [ell((0, -0.25, 0.62), (0.185, 0.17, 0.14), neg=True, s=5)]

    def sc(S):
        for path in locks:
            S.crease_path([p + np.array([0, -0.035, 0]) for p in path], 0.012, 0.004)
        S.crease_path([(0.075, -0.2, 0.9), (0.08, -0.1, 0.99), (0.075, 0.05, 1.01)], 0.012, 0.01)
        S.crease_path([(0.1, -0.16, 0.9), (0.0, -0.21, 0.845), (-0.11, -0.2, 0.795), (-0.18, -0.16, 0.76)], 0.01, 0.006)
        for az in (-150, -120, -60, -30, 30, 60, 120, 150):
            d0, d1 = sph_dir(az, 70), sph_dir(az, 10)
            O = np.array([0.0, 0.03, 0.78])
            S.crease_path([O + d0 * 0.23, O + d1 * 0.25], 0.012, 0.004)
    co, polys, cav = volume(el, 3300, voxel=0.0055, smooth=5, sculpt=sc, res=0.009)
    hair.add(co, polys, "hair", cav_tint(np.broadcast_to(P["hair"], co.shape), cav, 40, (0.6, 0.55, 0.55)), {"Head": 1.0})
    # gold hoops, ~1/4 face height
    for side in (1, -1):
        c = np.array([side * 0.212, -0.05, 0.54])
        q = Quaternion((0, 0, 1), -side * 0.45)
        pts, ups = [], []
        for k in range(20):
            a = TAU * k / 20
            r = np.array([math.cos(a) * 0.04, 0, math.sin(a) * 0.04])
            pts.append(c + np.array(q @ Vector(r)))
            ups.append(np.array(q @ Vector(r)) / 0.04)
        v, f = tube(pts, 0.0095, 0.011, ring=8, closed=True, ups=ups)
        hair.add(v, f, "gold", P["gold"], {"Head": 1.0})
    add_torso(body, P, P["cloth"], w=0.95, folds=[([(0.1, -0.19, 0.12), (0.17, -0.15, 0.03)], 0.02, 0.005)])
    pts = []
    for k in range(24):
        a = TAU * k / 24
        pts.append((0.09 * math.sin(a), 0.035 - 0.085 * math.cos(a), 0.3 + 0.012 * (1 - math.cos(a)) / 2))
    v, f = tube(pts, 0.012, 0.013, ring=8, closed=True)
    body.add(v, f, "cloth", P["cloth"] * 0.9, {"Chest": 1.0})


def style_visual(P, H, hair, body, face):
    el = [ell((0, 0.035, 0.74), (0.272, 0.245, 0.19)),
          ell((0, -0.25, 0.63), (0.2, 0.15, 0.16), neg=True, s=5),
          ell((0.255, 0.0, 0.64), (0.05, 0.055, 0.07), neg=True, s=5), ell((-0.255, 0.0, 0.64), (0.05, 0.055, 0.07), neg=True, s=5),
          ell((0, 0.14, 0.52), (0.16, 0.12, 0.1), neg=True, s=5)]
    co, polys, cav = volume(el, 480, voxel=0.006, smooth=4, res=0.01)
    hair.add(co, polys, "hair", np.broadcast_to(P["hair"], co.shape), {"Head": 1.0})
    turn = Quaternion((0, 0, 1), math.radians(-24))
    R = np.array(turn.to_matrix())
    Oc = np.array([0, 0.015, 0.785])
    seams = []
    for k in range(6):
        az = 60 * k + 30
        seams.append([Oc + sph_dir(az, e) * np.array([0.285, 0.268, 0.2]) for e in (88, 60, 35, 12)])
    btn = Oc + np.array([0, 0, 0.2])

    def sc(S):
        S.co = (S.co - Oc) @ R + Oc  # sculpt in cap space
        for s in seams:
            S.crease_path(s, 0.009, 0.008)
        S.grab(Oc + [0, -0.2, 0.08], 0.16, (0, -0.02, 0.02))
        S.co = (S.co - Oc) @ R.T + Oc
    crown = [ell(Oc, (0.285, 0.268, 0.2)), ell(Oc + [0, -0.06, 0.02], (0.22, 0.2, 0.16))]
    nrm = np.array(turn @ Vector((0, -0.06, 1)))
    co, polys, cav = volume(crown, 1250, voxel=0.005, smooth=4, sculpt=sc, res=0.009, cut=(Oc + [0, 0, 0.01], nrm))
    hair.add(co, polys, "cap", cav_tint(np.broadcast_to(P["cap"], co.shape), cav, 40), {"Head": 1.0})
    v, f = ellipsoid(Oc + np.array(turn @ Vector((0, 0, 0.2))), (0.018, 0.018, 0.011), 12, 6)
    hair.add(v, f, "cap", P["cap"] * 0.9, {"Head": 1.0})
    # band / sweatband roll along the cut rim
    rim = []
    for k in range(40):
        a = TAU * k / 40
        d = np.array([math.sin(a), -math.cos(a), 0.0])
        z = 0.01 + 0.06 * 0.264 * d[1]
        p = np.array([0.287 * d[0], 0.27 * d[1], z])
        rim.append(Oc + np.array(turn @ Vector(p)))
    v, f = tube(rim, 0.009, 0.009, ring=6, closed=True)
    hair.add(v, f, "cap", P["cap"] * 0.85, {"Head": 1.0})
    # bill: curved thick slab, sides bent down, turned with the cap
    nu, nv = 17, 7
    Ot, It = np.zeros((nv, nu, 3)), np.zeros((nv, nu, 3))
    for i in range(nu):
        al = math.radians(-62 + 124 * i / (nu - 1))
        for j in range(nv):
            t = j / (nv - 1)
            y0 = -0.266 * math.cos(al)
            x, y = 0.28 * math.sin(al) * (1 - 0.1 * t), y0 - 0.22 * t * math.cos(al) ** 1.5
            z = 0.01 + 0.06 * y0 - 0.035 * t ** 1.2 - 0.05 * t * math.sin(al) ** 2
            th = 0.022 - 0.008 * t
            base = np.array([x, y, z])
            Ot[j, i] = Oc + np.array(turn @ Vector(base + [0, 0, th / 2]))
            It[j, i] = Oc + np.array(turn @ Vector(base - [0, 0, th / 2]))
    v, f = slab(Ot, It)
    hair.add(v, f, "cap", P["cap"] * 0.95, {"Head": 1.0})
    # glasses: large round cream rims, bridge and temples
    for side in (1, -1):
        E = H.E[side]
        c = np.array([E[0] + side * 0.004, E[1] - P["eye"][1] - 0.02, E[2] - 0.002])
        q = Quaternion((0, 0, 1), side * 0.12)
        pts, ups = [], []
        for k in range(28):
            a = TAU * k / 28
            r = np.array([math.cos(a), 0, math.sin(a)])
            pts.append(c + np.array(q @ Vector(r * 0.072)))
            ups.append(np.array(q @ Vector(r)))
        v, f = tube(pts, 0.0095, 0.012, ring=6, closed=True, ups=ups)
        hair.add(v, f, "glass", P["glass"], {"Head": 1.0})
        o = c + np.array(q @ Vector((side * 0.072, 0, 0.01)))
        pe, _ = cast(H.tree, (side * 1.0, 0.0, 0.66), (-side, 0, 0))
        ear = (pe if pe is not None else np.array([side * 0.26, 0.0, 0.66])) + [side * 0.004, 0, 0]
        v, f = tube([o, o + (ear - o) * 0.3 + [side * 0.01, 0, 0.004], ear], 0.006, 0.0075, ring=6)
        hair.add(v, f, "glass", P["glass"] * 0.95, {"Head": 1.0})
    cl, cr = H.E[-1], H.E[1]
    yb = cl[1] - P["eye"][1] - 0.022
    b = [np.array([-0.017, yb, cl[2] + 0.004]), np.array([0, yb - 0.006, cl[2] + 0.012]), np.array([0.017, yb, cr[2] + 0.004])]
    v, f = tube(b, 0.007, 0.008, ring=6)
    hair.add(v, f, "glass", P["glass"], {"Head": 1.0})
    add_torso(body, P, P["cloth"], folds=[([(0.12, -0.2, 0.1), (0.2, -0.14, 0.02)], 0.02, 0.006)])
    add_hood(body, P, P["cloth"], P["strings"])


def style_enthusiast(P, H, hair, body, face):
    # ghutra: one thick cloth volume (crown + side drapes + back fall) with the face opening carved out
    el = [ell((0, 0.02, 0.765), (0.268, 0.262, 0.235)),
          ell((0.2, 0.02, 0.45), (0.1, 0.17, 0.3)), ell((-0.2, 0.02, 0.45), (0.1, 0.17, 0.3)),
          ell((0.3, 0.03, 0.2), (0.14, 0.18, 0.2)), ell((-0.3, 0.03, 0.2), (0.14, 0.18, 0.2)),
          ell((0, 0.13, 0.42), (0.25, 0.14, 0.36)),
          ell((0, -0.27, 0.6), (0.188, 0.2, 0.225), neg=True, s=6),
          ell((0, -0.22, 0.2), (0.14, 0.2, 0.28), neg=True, s=6),
          ell((0, -0.02, 0.62), (0.2, 0.17, 0.28), neg=True, s=3)]

    def sc(S):
        x, y, z = S.co[:, 0], S.co[:, 1], S.co[:, 2]
        az = np.arctan2(x, -y)
        drape = ss(0.62, 0.3, z)
        n = S.normals()
        fold = np.sin(az * 7.0 + 0.4) * 0.5 + np.sin(az * 12.0 + 1.1) * 0.25
        S.co += n * (fold * 0.009 * drape)[:, None]
        S.cav += np.maximum(0, -fold) * 0.009 * drape
        S.grab((0, -0.2, 0.93), 0.13, (0, -0.01, 0.022))  # crown peak over the front
        for side in (1, -1):
            S.crease_path([(side * 0.19, -0.16, 0.8), (side * 0.235, -0.12, 0.6), (side * 0.24, -0.12, 0.42)], 0.012, 0.004)
            S.crease_path([(side * 0.08, -0.22, 0.93), (side * 0.2, -0.1, 0.98)], 0.015, 0.004)
    co, polys, cav = volume(el, 2300, voxel=0.0055, smooth=5, sculpt=sc, res=0.01, cut_z=0.006 + HEAD_DROP)
    hair.add(co, polys, "ghutra", cav_tint(np.broadcast_to(P["ghutra"], co.shape), cav, 60, (0.78, 0.8, 0.86)), {"Head": 1.0})
    gt = bvh(co, polys)
    for zc in (0.835, 0.872):
        pts = []
        for k in range(36):
            a = TAU * k / 36
            d = np.array([math.sin(a), -math.cos(a), 0.0])
            z = zc - 0.02 * (1 - math.cos(a)) / 2
            axis = np.array([0, 0.02, z])
            p, _ = cast(gt, axis + d * 0.6, -d)
            pts.append((p if p is not None else axis + d * 0.27) + d * 0.011)
        v, f = tube(pts, 0.019, 0.018, ring=6, closed=True)
        hair.add(v, f, "agal", P["agal"], {"Head": 1.0})
    # beard: metaball clumps seeded on the jaw surface (short, groomed), moustache connected, mouth kept clear
    zm, mw = P["zm"], P["mw"]
    el = []
    C = np.array([0.0, 0.0, 0.6])
    for elv in np.arange(-78, 12, 3.0):
        for az in np.arange(-120, 121, 3.0):
            p, n = cast(H.tree, C, sph_dir(az, elv))
            if p is None:
                continue
            x, y, z = p
            ax = abs(x)
            if y > 0.0 or n[1] > 0.5:
                continue
            line = zm - 0.004 + (P["ez"] - 0.05 - zm) * float(ss(0.13, 0.215, ax))  # cheek line rising to sideburns
            beard = z < line and not (ax < mw + 0.006 and z > zm - 0.02)
            mous = ax < mw + 0.008 and zm + 0.006 < z < zm + 0.027 and y < -0.15
            if not (beard or mous):
                continue
            edge = min(1.0, max(0.0, (line - z) / 0.02)) if beard else 1.0
            r = 0.009 if mous else (0.008 + 0.005 * edge + 0.004 * float(ss(zm - 0.03, P["chin"], z)))
            el.append(ell(p + n * (r * 0.3), (r,) * 3))
    el.append(ell((0, -0.2, zm - 0.006), (mw - 0.004, 0.08, 0.01), neg=True, s=6))

    def bs(S):
        S.smooth(2, 0.4)
    co, polys, cav = volume(el, 1100, voxel=0.0035, smooth=5, sculpt=bs, res=0.005)
    face.add(co, polys, "beard", cav_tint(np.broadcast_to(P["hair"], co.shape), cav, 30), {"Head": 1.0}, {"mouthOpen": jaw_delta(co, P)})
    add_torso(body, P, P["cloth"], w=1.05)
    tt = P["_torso_tree"]
    pts = [(0.095 * math.sin(a), 0.035 - 0.088 * math.cos(a), 0.305 + 0.012 * (1 - math.cos(a)) / 2) for a in np.linspace(0.35, TAU - 0.35, 26)]
    v, f = tube(pts, 0.018, 0.008, ring=8, up=(0, 0, 1))
    body.add(v, f, "cloth", P["cloth"] * 0.97, {"Chest": 1.0})
    for side, w0 in ((0, 0.024),):
        zs = np.linspace(0.29, 0.02, 10)
        Ot = np.array([[on_face(tt, x, z, 0.006) for x in (-w0, 0, w0)] for z in zs])
        It = np.array([[on_face(tt, x, z, -0.004) for x in (-w0, 0, w0)] for z in zs])
        v, f = slab(Ot, It)
        body.add(v, f, "cloth", P["cloth"] * 0.95, {"Chest": 1.0})
    top = on_face(tt, -0.03, 0.285, 0.012)
    cord = [top, top + [-0.004, -0.006, -0.05], top + [-0.006, -0.01, -0.09]]
    v, f = tube(cord, 0.0035, 0.0035, ring=6)
    body.add(v, f, "cloth", P["cloth"] * 0.92, {"Chest": 1.0})
    v, f = ellipsoid(cord[-1] + [0, 0, -0.02], (0.011, 0.011, 0.024), 10, 6)
    body.add(v, f, "cloth", P["cloth"] * 0.9, {"Chest": 1.0})


STYLES = {"cold": style_cold, "intent": style_intent, "visual": style_visual, "enthusiast": style_enthusiast}


# ------------------------------------------------------------------ assembly, rig, export
def materials_for(P):
    material("skin", 0.62)
    material("hair", 0.55)
    material("brow", 0.7)
    material("mouth", 0.6)
    material("eye", 0.5, vcol=True)
    material("catch", 0.5, emit=(1, 1, 1, 1.2))
    material("cloth", 0.88)
    material("cap", 0.75)
    material("glass", 0.5)
    material("gold", 0.5)
    material("ghutra", 0.88)
    material("agal", 0.6)
    material("beard", 0.8)


def make_armature(cid, P, eyes):
    ad = bpy.data.armatures.new(f"{cid}_skeleton")
    arm = link(bpy.data.objects.new(f"reviewer_{cid}", ad))
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    eb = ad.edit_bones

    def bone(n, h, t, parent=None):
        b = eb.new(n)
        b.head, b.tail = Vector(h), Vector(t)
        b.roll = 0.0
        if parent:
            b.parent = eb[parent]
            b.use_connect = False

    bone("Chest", (0, 0.03, 0.0), (0, 0.03, 0.28))
    bone("Neck", (0, 0.035, 0.28), (0, 0.035, P["chin"] + 0.02), "Chest")
    bone("Head", (0, 0.035, P["chin"] + 0.02), (0, 0.035, 0.9), "Neck")
    for n, E in eyes.items():
        bone(n, E, E + np.array([0, 0, 0.05]), "Head")
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm


def build_character(cid):
    P = CHARS[cid]()
    materials_for(P)
    H = Head(P)
    face, eyes, hair, body = Part(cid + "_face"), Part(cid + "_eyes"), Part(cid + "_hair"), Part(cid + "_body")
    face.add(H.co, H.polys, "skin", H.colors(), head_weights(H.co, P["chin"]), {"mouthOpen": jaw_delta(H.co, P)})
    for side in (1, -1):
        eye_parts(H, side, P, eyes, face)
        v, f = brow(H, side, P, face)
        keys = {"browUp": brow(H, side, P, face, dz=0.02, inner=0.004)[0],
                "browDown": brow(H, side, P, face, dz=-0.012, inner=-0.012)[0],
                "wide": brow(H, side, P, face, dz=0.008)[0]}
        face.add(v, f, "brow", P["browc"], {"Head": 1.0}, keys)
    v, f = mouth(H, P)
    face.add(v, f, "mouth", mouth_colors(P), {"Head": 1.0}, {"mouthOpen": mouth(H, P, 0.03)[0]})
    STYLES[cid](P, H, hair, body, face)

    parts = [face, eyes, hair, body]
    D = np.array([0, 0, HEAD_DROP])
    for p in (face, eyes, hair):
        p.segs = [(v - D, {k: kv - D for k, kv in kk.items()}) for v, kk in p.segs]
    H.co = H.co - D
    H.E = {k: v - D for k, v in H.E.items()}
    P["chin"] -= HEAD_DROP
    P["ez"] -= HEAD_DROP
    top = max(p.verts()[:, 2].max() for p in parts if p.n)
    g = 1.0 / top
    for p in parts:
        p.segs = [(v * g, {k: kv * g for k, kv in kk.items()}) for v, kk in p.segs]
    E = {"Eye_L": H.E[1] * g, "Eye_R": H.E[-1] * g}
    P["chin"] *= g
    arm = make_armature(cid, P, E)
    objs = [build_object(face, arm, MORPHS), build_object(eyes, arm), build_object(hair, arm), build_object(body, arm)]
    tris = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs}
    hv = H.co * g
    band = hv[np.abs(hv[:, 2] - P["ez"] * g) < 0.03]
    meta = {"tris": sum(tris.values()), "parts": tris, "scale": g, "chin": float(hv[:, 2].min() if False else (P["chin"])),
            "head_width": float(band[:, 0].max() - band[:, 0].min()), "top": 1.0,
            "eyes": {k: [float(v[0]), float(v[2]), float(-v[1])] for k, v in E.items()}}
    # chin: lowest skin point in front of the neck
    fr = hv[(np.abs(hv[:, 0]) < 0.05) & (hv[:, 1] < -0.06)]
    meta["chin"] = float(fr[:, 2].min())
    print(f"[{cid}] tris={meta['tris']} {tris} scale={g:.3f} head_w={meta['head_width']:.3f} chin={meta['chin']:.3f}")
    return meta


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ids = [a for a in argv if a in IDS] or IDS
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    meta = {cid: build_character(cid) for cid in ids}
    os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_META), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUT_GLB, export_format="GLB", export_yup=True, export_apply=False,
        export_morph=True, export_morph_normal=True, export_skins=True, export_animations=False,
        export_materials="EXPORT", export_texcoords=False, export_extras=False, export_cameras=False,
        export_lights=False)
    json.dump(meta, open(OUT_META, "w"), indent=1)
    if "--blend" in argv:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "reviewers.blend"))
    print("WROTE", OUT_GLB, os.path.getsize(OUT_GLB))


main()
