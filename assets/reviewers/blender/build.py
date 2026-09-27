"""NEURASCOPE Synthetic Reviewers - procedural character build.

Run:  blender -b -P assets/reviewers/blender/build.py
Outputs public/models/reviewers.glb and assets/reviewers/blender/reviewers.blend.

All geometry is authored in glTF space (x right, y up, z = character forward)
and converted to Blender space on mesh creation.
"""
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
OUT_GLB = os.path.join(REPO, "public", "models", "reviewers.glb")
OUT_BLEND = os.path.join(HERE, "reviewers.blend")
TAU = 2 * math.pi


# ---------------------------------------------------------------- helpers
def V(x, y, z):
    return Vector((x, y, z))


def toB(p):
    return (p[0], -p[2], p[1])


def ss(e0, e1, x):
    t = (x - e0) / (e1 - e0)
    t = 0.0 if t < 0 else 1.0 if t > 1 else t
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def srgb(c):
    return tuple(((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c)


def rot_y(p, a):
    c, s = math.cos(a), math.sin(a)
    return V(p.x * c + p.z * s, p.y, -p.x * s + p.z * c)


def rot_z(p, a):
    c, s = math.cos(a), math.sin(a)
    return V(p.x * c - p.y * s, p.x * s + p.y * c, p.z)


def weld(verts, faces, mats, keys, eps=1e-6):
    idx, remap, nv, kept = {}, [], [], []
    for i, p in enumerate(verts):
        k = (round(p[0] / eps), round(p[1] / eps), round(p[2] / eps))
        if k in idx:
            remap.append(idx[k])
        else:
            idx[k] = len(nv)
            remap.append(len(nv))
            nv.append(p)
            kept.append(i)
    nf, nm = [], []
    for f, m in zip(faces, mats):
        g = []
        for j in f:
            r = remap[j]
            if r not in g:
                g.append(r)
        if len(g) >= 3:
            nf.append(tuple(g))
            nm.append(m)
    nk = {k: [vs[i] for i in kept] for k, vs in keys.items()}
    return nv, nf, nm, nk


def grid_faces(nu, nv, wrap_u=False, wrap_v=False, off=0):
    F = []
    cu = nu if wrap_u else nu - 1
    cv = nv if wrap_v else nv - 1
    for j in range(cv):
        j2 = (j + 1) % nv
        for i in range(cu):
            i2 = (i + 1) % nu
            F.append((off + j * nu + i, off + j * nu + i2, off + j2 * nu + i2, off + j2 * nu + i))
    return F


class Part:
    """Accumulates geometry + per-vertex bone weights + shape-key positions."""

    def __init__(self):
        self.v, self.f, self.fm, self.w, self.keys, self.col = [], [], [], [], {}, []

    def add(self, verts, faces, mats, weight, keys=None):
        keys = keys or {}
        if isinstance(mats, str):
            mats = [mats] * len(faces)
        verts, faces, mats, keys = weld(verts, faces, mats, keys)
        base = len(self.v)
        for k in keys:
            if k not in self.keys:
                self.keys[k] = list(self.v)
        for k in self.keys:
            self.keys[k].extend(keys.get(k, verts))
        self.v.extend(verts)
        for f, m in zip(faces, mats):
            self.f.append(tuple(base + j for j in f))
            self.fm.append(m)
        if callable(weight):
            self.w.extend(weight(p) for p in verts)
        else:
            self.w.extend([weight] * len(verts))


# ------------------------------------------------------------ primitives
def slab(Fo, Fi, nu, nv, wrap_u=False, mat_fn=None):
    """Closed shell from an outer and inner parametric surface on the same grid."""
    outer = [Fo(i, j) for j in range(nv) for i in range(nu)]
    inner = [Fi(i, j) for j in range(nv) for i in range(nu)]
    verts = outer + inner
    n = nu * nv
    faces, kinds = [], []
    for f in grid_faces(nu, nv, wrap_u):
        faces.append(f)
        kinds.append(("o", f[0] % nu, f[0] // nu))
    for f in grid_faces(nu, nv, wrap_u, off=n):
        faces.append(tuple(reversed(f)))
        kinds.append(("i", (f[0] - n) % nu, (f[0] - n) // nu))

    def stitch(a, b, kind):
        faces.append((a, b, b + n, a + n))
        kinds.append(kind)

    cu = nu if wrap_u else nu - 1
    for i in range(cu):
        i2 = (i + 1) % nu
        stitch((nv - 1) * nu + i2, (nv - 1) * nu + i, ("e", i, nv - 1))
        stitch(i, i2, ("s", i, 0))
    if not wrap_u:
        for j in range(nv - 1):
            stitch(j * nu, (j + 1) * nu, ("l", 0, j))
            stitch((j + 1) * nu + nu - 1, j * nu + nu - 1, ("r", nu - 1, j))
    mats = [mat_fn(k) for k in kinds] if mat_fn else None
    return verts, faces, mats


def tube(pts, a, b, ring=8, normals=None, up=None, closed=False, cap=True):
    """Swept elliptical tube; a = half width along binormal, b = along normal."""
    n = len(pts)
    verts = []
    for i, p in enumerate(pts):
        if closed:
            T = (pts[(i + 1) % n] - pts[(i - 1) % n]).normalized()
        else:
            T = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        N = (normals[i] if normals else up).copy()
        N = (N - T * N.dot(T)).normalized()
        Bn = T.cross(N)
        for k in range(ring):
            th = TAU * k / ring
            verts.append(p + Bn * (a[i] * math.cos(th)) + N * (b[i] * math.sin(th)))
    faces = grid_faces(ring, n, True, closed)
    if cap and not closed:
        c0 = len(verts)
        verts.append(pts[0] - (pts[1] - pts[0]).normalized() * min(a[0], b[0]) * 0.5)
        c1 = len(verts)
        verts.append(pts[-1] + (pts[-1] - pts[-2]).normalized() * min(a[-1], b[-1]) * 0.5)
        for k in range(ring):
            k2 = (k + 1) % ring
            faces.append((c0, k2, k))
            faces.append((c1, (n - 1) * ring + k, (n - 1) * ring + k2))
    return verts, faces


def latlong(center, axis, radii, thetas, nphi, e1=None):
    """Sphere-ish with pole along `axis`; radii=(r_axis, r_e1, r_e2)."""
    axis = axis.normalized()
    e1 = (e1 or (V(0, 1, 0) if abs(axis.y) < 0.9 else V(0, 0, 1)))
    e1 = (e1 - axis * e1.dot(axis)).normalized()
    e2 = axis.cross(e1)
    verts = []
    for th in thetas:
        for i in range(nphi):
            ph = TAU * i / nphi
            d = axis * (math.cos(th) * radii[0]) + e1 * (math.sin(th) * math.cos(ph) * radii[1]) + e2 * (math.sin(th) * math.sin(ph) * radii[2])
            verts.append(center + d)
    faces = grid_faces(nphi, len(thetas), True)
    return verts, faces


def smooth_list(vals, passes=2, wrap=True):
    v = list(vals)
    n = len(v)
    for _ in range(passes):
        if wrap:
            v = [0.25 * v[(i - 1) % n] + 0.5 * v[i] + 0.25 * v[(i + 1) % n] for i in range(n)]
        else:
            v = [v[0]] + [0.25 * v[i - 1] + 0.5 * v[i] + 0.25 * v[i + 1] for i in range(1, n - 1)] + [v[-1]]
    return v


# ------------------------------------------------------------------ body
BODY_PROFILE = [  # y, half-width, front depth, back depth
    (0.000, 0.430, 0.160, 0.158),
    (0.100, 0.435, 0.166, 0.160),
    (0.160, 0.422, 0.163, 0.158),
    (0.200, 0.392, 0.156, 0.152),
    (0.232, 0.338, 0.146, 0.146),
    (0.258, 0.270, 0.132, 0.135),
    (0.277, 0.200, 0.115, 0.120),
    (0.291, 0.135, 0.096, 0.102),
    (0.300, 0.100, 0.086, 0.094),
]
BODY_TOP = 0.300


def body_dims(y, sh):
    pr = BODY_PROFILE
    if y <= pr[0][0]:
        r = pr[0]
    elif y >= pr[-1][0]:
        r = pr[-1]
    else:
        for a, b in zip(pr, pr[1:]):
            if a[0] <= y <= b[0]:
                t = (y - a[0]) / (b[0] - a[0])
                # cubic ease for rounded shoulder
                r = tuple(lerp(a[k], b[k], t) for k in range(4))
                break
    wx = r[1] * sh
    return wx, r[2], r[3]


def body_r(beta, y, sh, n=2.6):
    if y > BODY_TOP:
        return 0.0
    wx, wzf, wzb = body_dims(y, sh)
    sx, cz = abs(math.sin(beta)), abs(math.cos(beta))
    wz = wzf if math.cos(beta) > 0 else wzb
    return 1.0 / (((sx / wx) ** n + (cz / wz) ** n) ** (1.0 / n) + 1e-9)


HEAD_S = 1.15
HEAD_PIV = V(0, 0.44, -0.028)
BUST_NARROW = 0.97


def head_xf(p):
    return HEAD_PIV + (p - HEAD_PIV) * HEAD_S


def body_r_head(beta, yl_world, sh):
    """Bust radius seen from the unscaled head frame (head geometry is scaled by HEAD_S afterwards)."""
    yw = HEAD_PIV.y + (yl_world - HEAD_PIV.y) * HEAD_S
    r = body_r(beta, yw, sh)
    return r / HEAD_S if r > 0 else 0.0


def build_bust(P, part, cloth):
    sh = P["shoulder"]
    nseg, nrow = 30, 15
    ys = [BODY_TOP * (1 - (1 - j / (nrow - 1)) ** 1.7) for j in range(nrow)]
    verts = []
    for y in ys:
        for i in range(nseg):
            beta = TAU * i / nseg
            r = body_r(beta, y, sh)
            p = V(r * math.sin(beta), y, r * math.cos(beta))
            # soft pectoral / shoulder blade shaping
            p.z += 0.012 * math.exp(-((abs(p.x) - 0.12) / 0.09) ** 2) * ss(0.05, 0.2, y) * (1 if p.z > 0 else 0.6)
            verts.append(p)
    faces = grid_faces(nseg, nrow, True)
    faces = [tuple(reversed(f)) for f in faces]
    c0 = len(verts); verts.append(V(0, 0, 0))
    c1 = len(verts); verts.append(V(0, BODY_TOP + 0.01, -0.01))
    for i in range(nseg):
        i2 = (i + 1) % nseg
        faces.append((c0, i, i2))
        faces.append((c1, (nrow - 1) * nseg + i2, (nrow - 1) * nseg + i))
    part.add(verts, faces, cloth, lambda p: {"Chest": 1.0} if p.y < 0.26 else {"Chest": 0.7, "Neck": 0.3})


def neck_weight(p):
    h = ss(0.40, 0.48, p.y)
    n = (1 - h) * ss(0.26, 0.33, p.y)
    c = 1 - h - n
    return {k: v for k, v in (("Chest", c), ("Neck", n), ("Head", h)) if v > 1e-4}


def build_neck(P, part, skin):
    ys = [0.2 + 0.34 * j / 9 for j in range(10)]
    pts = [V(0, y, -0.02 - 0.02 * (y - 0.2)) for y in ys]
    rx = P["neck"]
    a = [rx * (1 + 0.45 * ss(0.31, 0.22, y)) for y in ys]
    b = [rx * 0.92 * (1 + 0.3 * ss(0.31, 0.22, y)) for y in ys]
    v, f = tube(pts, a, b, ring=16, up=V(0, 0, 1))
    part.add(v, f, skin, neck_weight)


def build_hood(P, part, cloth, strings=True):
    ns = 30
    a0 = math.radians(24)
    pts, A, Bv, nr = [], [], [], []
    for k in range(ns):
        s = k / (ns - 1)
        a = lerp(a0, TAU - a0, s)
        back = ((1 - math.cos(a)) / 2) ** 1.6
        Rx, Rz = 0.158 * P["shoulder"] ** 0.5, 0.128
        pts.append(V(Rx * math.sin(a), 0.283 + 0.05 * back, -0.012 + Rz * math.cos(a) - 0.02 * back))
        A.append(0.020 + 0.036 * back)
        Bv.append(0.024 + 0.05 * back)
        nr.append(V(math.sin(a), 0, math.cos(a)))
    # tube: a along binormal (T x N) -> vertical-ish when N radial
    v, f = tube(pts, Bv, A, ring=8, normals=nr)
    part.add(v, f, cloth, {"Chest": 1.0})
    if strings:
        for sx in (-1, 1):
            spts = []
            for k in range(7):
                t = k / 6
                y = lerp(0.285, 0.12, t)
                wx, wzf, _ = body_dims(y, P["shoulder"])
                spts.append(V(sx * (0.048 + 0.006 * t), y, wzf + 0.006 - 0.004 * (1 - t)))
            v, f = tube(spts, [0.0055] * 7, [0.0045] * 7, ring=6, up=V(0, 0, 1))
            part.add(v, f, P["mat_string"], {"Chest": 1.0})
            tip = spts[-1] + V(0, -0.014, 0.001)
            v, f = latlong(tip, V(0, 1, 0), (0.016, 0.0075, 0.0075), [0, 0.8, 1.6, 2.4, math.pi], 6)
            part.add(v, f, P["mat_string"], {"Chest": 1.0})


def build_crew(P, part, mat):
    ns = 36
    pts = [V(0.098 * math.sin(TAU * k / ns), 0.292 - 0.006 * math.cos(TAU * k / ns), -0.014 + 0.088 * math.cos(TAU * k / ns)) for k in range(ns)]
    nr = [V(math.sin(TAU * k / ns), 0, math.cos(TAU * k / ns)) for k in range(ns)]
    v, f = tube(pts, [0.012] * ns, [0.010] * ns, ring=8, normals=nr, closed=True)
    part.add(v, f, mat, {"Chest": 1.0})


def build_kandura_collar(P, part, mat):
    nu, nv = 34, 3
    a0 = math.radians(9)

    def F(i, j, off):
        a = lerp(a0, TAU - a0, i / (nu - 1))
        front = (1 + math.cos(a)) / 2
        y = lerp(0.268, 0.322 - 0.012 * front, j / (nv - 1))
        rr = 1 + 0.10 * (1 - j / (nv - 1))
        return V((0.086 + off) * rr * math.sin(a), y, -0.02 + (0.082 + off) * rr * math.cos(a))

    v, f, m = slab(lambda i, j: F(i, j, 0.010), lambda i, j: F(i, j, 0.0), nu, nv, False, lambda k: mat)
    part.add(v, f, m, {"Chest": 1.0})
    # placket line down the chest
    spts = []
    for k in range(6):
        y = lerp(0.268, 0.10, k / 5)
        _, wzf, _ = body_dims(y, P["shoulder"])
        spts.append(V(0, y, wzf + 0.001))
    v, f = tube(spts, [0.010] * 6, [0.003] * 6, ring=6, up=V(0, 0, 1))
    part.add(v, f, mat, {"Chest": 1.0})


# ------------------------------------------------------------------ head
class Head:
    def __init__(self, P):
        self.P = P
        self.C = V(0, P["hy"], 0)

    def S(self, d):
        """Base cranium/face shape for unit direction d (local coords)."""
        P = self.P
        x, y, z = d
        px, py, pz = x * P["W"], y * P["H"], z * P["D"]
        t = ss(0.15, -0.95, y)
        px *= lerp(1.0, P["jaw"], t)
        pz *= lerp(1.0, P["jawD"], t)
        fr = max(z, 0.0)
        c = math.exp(-(x / 0.42) ** 2) * ss(-0.5, -1.0, y) * fr
        py -= P["chin"] * c
        pz += P["chinF"] * c
        for s in (-1, 1):
            g = math.exp(-((x - s * 0.6) ** 2 + (y + 0.32) ** 2 + (z - 0.72) ** 2) / 0.09)
            px += s * P["cheek"] * g * 0.5
            pz += P["cheek"] * g * 0.7
        pz -= P["flat"] * P["D"] * fr ** 3 * ss(-0.95, -0.3, y) * ss(0.95, 0.4, y)
        pz -= P["back"] * max(-z, 0) * ss(-0.3, 0.6, y)
        py += P["crown"] * max(y, 0) ** 3
        px *= 1 - P["temple"] * math.exp(-((y - 0.35) / 0.3) ** 2) * fr
        return V(px, py, pz)

    def features(self, p, d):
        P = self.P
        x, y = p.x, p.y
        r, ex, ey = P["er"], P["ex"], P["ey"]
        m = ss(0.05, 0.55, d.z)
        dz = 0.0
        ax = abs(x)
        dz -= P["sock"] * math.exp(-(((ax - ex) / (1.45 * r)) ** 2 + ((y - ey) / (1.25 * r)) ** 2))
        dz += P["ridge"] * math.exp(-((y - (ey + 1.45 * r)) / (0.55 * r)) ** 2) * math.exp(-((ax - ex * 0.9) / (1.6 * r)) ** 2)
        ny = P["ny"]
        dz += P["nose"] * math.exp(-(x / P["nsx"]) ** 2 - ((y - ny) / P["nsy"]) ** 2)
        dz += 0.4 * P["nose"] * math.exp(-(x / (0.7 * P["nsx"])) ** 2 - ((y - (ny + 0.045)) / 0.04) ** 2)
        my = P["my"]
        dz += P["muzzle"] * math.exp(-(x / 0.085) ** 2 - ((y - (my + 0.01)) / 0.055) ** 2)
        dz += 0.004 * math.exp(-(x / 0.028) ** 2 - ((y - (my - 0.014)) / 0.011) ** 2)
        dz += P["chinBall"] * math.exp(-(x / 0.045) ** 2 - ((y - (my - 0.075)) / 0.03) ** 2)
        dz += P["cheekPuff"] * math.exp(-((ax - ex * 1.05) / 0.05) ** 2 - ((y - (ey - 1.9 * r)) / 0.04) ** 2)
        return p + V(0, 0, dz * m)

    def build_skin(self):
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=2.0)
        N = self.P.get("res", 12)
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=N - 1, use_grid_fill=True)
        bm.faces.ensure_lookup_table()
        front = [f for f in bm.faces if f.calc_center_median().y < -0.999]
        edges = set()
        for f in front:
            edges.update(f.edges)
        bmesh.ops.subdivide_edges(bm, edges=list(edges), cuts=1, use_grid_fill=True)
        bm.verts.ensure_lookup_table()
        verts = []
        for bv in bm.verts:
            d = V(bv.co.x, bv.co.z, -bv.co.y).normalized()
            p = self.features(self.S(d), d)
            verts.append(self.C + p)
        faces = [tuple(v.index for v in f.verts) for f in bm.faces]
        bm.free()
        # light Laplacian relax to even out the subdivision seam
        nb = [set() for _ in verts]
        for f in faces:
            for i in range(len(f)):
                a, b = f[i], f[(i + 1) % len(f)]
                nb[a].add(b); nb[b].add(a)
        for _ in range(2):
            nv = []
            for i, p in enumerate(verts):
                avg = sum((verts[j] for j in nb[i]), Vector()) / len(nb[i])
                nv.append(p.lerp(avg, 0.25))
            verts = nv
        self.verts, self.faces = verts, faces
        self.bvh = BVHTree.FromPolygons([tuple(v) for v in verts], faces)
        return verts, faces

    def carve_sockets(self):
        """Eye pockets: push skin behind each eyeball so the lids wrap the eye."""
        P = self.P
        r = P["er"]
        self.eyes = {}
        for side in (1, -1):
            loc, _ = self.front(side * P["ex"], self.C.y + P["ey"])
            self.eyes[side] = V(side * P["ex"], self.C.y + P["ey"], loc.z - P["eyeIn"] * r)
        out = []
        for p in self.verts:
            q = p.copy()
            for E in self.eyes.values():
                dx, dy = q.x - E.x, (q.y - E.y) / P["eyeV"]
                d = math.sqrt(dx * dx + dy * dy)
                if d < 1.5 * r and q.z > E.z - 0.6 * r:
                    zc = E.z + 0.1 * r + 1.6 * r * ss(0.75 * r, 1.5 * r, d)
                    k = 0.25 * r
                    h = max(k - abs(q.z - zc), 0) / k
                    q.z = min(q.z, zc) - h * h * k * 0.25
            out.append(q)
        self.verts = out
        self.bvh = BVHTree.FromPolygons([tuple(v) for v in out], self.faces)

    def ray(self, origin, direction, dist=3.0):
        loc, nrm, _, _ = self.bvh.ray_cast(origin, direction.normalized(), dist)
        return loc, nrm

    def front(self, x, y):
        loc, nrm = self.ray(V(x, y, self.C.z + 1.0), V(0, 0, -1))
        return loc, nrm

    def radius_at(self, beta, yl, zc=0.0):
        """Outer head radius around the vertical axis at local height yl."""
        d = V(math.sin(beta), 0, math.cos(beta))
        o = self.C + V(0, yl, zc)
        loc, _ = self.ray(o + d * 0.8, -d, 0.8)
        return (loc - o).length if loc else 0.0


# ------------------------------------------------------------ face parts
def build_eye(P, hd, side, eyes_part, face_part, keys_open):
    r, ev = P["er"], P["eyeV"]
    E = hd.eyes[side]
    bone = "Eye_L" if side > 0 else "Eye_R"
    thetas = [0, 0.35, 0.7, 1.05, 1.4, 1.8, 2.3, 2.75, math.pi]
    v, f = latlong(E, V(0, 0, 1), (r, r * ev, r), thetas, 14, e1=V(0, 1, 0))
    eyes_part.add(v, f, "eyeblack", {bone: 1.0})
    # single catch-light, upper outer
    cx, cy = -0.32 * r, 0.42 * r * ev
    cz = math.sqrt(max(1 - (cx / r) ** 2 - (cy / (r * ev)) ** 2, 0)) * r
    hl = E + V(cx, cy, cz + 0.0012)
    n = V(cx / r ** 2, cy / (r * ev) ** 2, cz / r ** 2).normalized()
    v, f = latlong(hl, n, (0.0015, 0.2 * r, 0.2 * r), [0, 1.2, math.pi / 2, 2.0, math.pi], 8)
    eyes_part.add(v, f, "catch", {bone: 1.0})

    tilt = math.radians(P["tilt"]) * -side
    Ru, Rl, Ri = 1.05 * r, 1.04 * r, 1.01 * r
    nph, nth = 13, 6

    def lid(theta_e, upper):
        ax = 1 if upper else -1
        R = Ru if upper else Rl
        ph0 = math.radians(100)

        def pt(i, j, rad, roll):
            ph = lerp(-ph0, ph0, i / (nph - 1))
            vv = j / (nth - 1)
            th = lerp(math.radians(6), theta_e, vv) + roll
            q = V(math.sin(th) * math.sin(ph), ax * math.cos(th) * ev, math.sin(th) * math.cos(ph)) * rad
            return E + rot_z(q, tilt)

        def Fo(i, j):
            k = ss(0.7, 1.0, j / (nth - 1))
            return pt(i, j, lerp(R, (R + Ri) * 0.5, k * 0.9), math.radians(2.5) * k)

        def Fi(i, j):
            return pt(i, j, Ri, 0)

        return slab(Fo, Fi, nph, nth, False, lambda kind: P["mat_lid"])

    tu, tl = math.radians(P["lidU"]), math.radians(P["lidL"])
    vu, fu, mu = lid(tu, True)
    vl, fl, ml = lid(tl, False)
    kb = "blink_L" if side > 0 else "blink_R"
    ku = {kb: lid(math.radians(104), True)[0], "wide": lid(tu - math.radians(10), True)[0]}
    kl = {kb: lid(math.radians(79), False)[0], "wide": lid(tl - math.radians(6), False)[0]}
    face_part.add(vu, fu, mu, {"Head": 1.0}, ku)
    face_part.add(vl, fl, ml, {"Head": 1.0}, kl)
    return E


def surf_path(hd, xs, ys, lift):
    pts, nrs = [], []
    for x, y in zip(xs, ys):
        loc, nrm = hd.front(x, y)
        pts.append(loc + nrm * lift)
        nrs.append(nrm)
    return pts, nrs


def build_brows(P, hd, part):
    r, ex, ey = P["er"], P["ex"], P["ey"]
    n = 9
    for side in (-1, 1):
        def path(dy, dyi, dx):
            xs, ys = [], []
            for k in range(n):
                t = k / (n - 1)
                x = side * (lerp(ex - 0.028, ex + 0.036, t) + dx * (1 - t))
                y = hd.C.y + ey + P["browH"] + P["arch"] * math.sin(math.pi * t ** 0.85) - P["browSlope"] * t + dy + dyi * (1 - t)
                xs.append(x); ys.append(y)
            return surf_path(hd, xs, ys, 0.0035)

        a = [P["browW"] * (0.75 + 0.25 * math.sin(math.pi * (0.15 + 0.7 * k / (n - 1)))) * (1 - 0.3 * k / (n - 1)) for k in range(n)]
        b = [0.0065 * (1 - 0.3 * k / (n - 1)) for k in range(n)]
        pts, nr = path(0, 0, 0)
        v, f = tube(pts, a, b, ring=8, normals=nr)
        pd, nd = path(-0.011, -0.007, -0.006)
        pu, nu_ = path(0.016, 0.008, 0.0)
        kd = tube(pd, a, b, ring=8, normals=nd)[0]
        ku = tube(pu, a, b, ring=8, normals=nu_)[0]
        part.add(v, f, P["mat_brow"], {"Head": 1.0}, {"browDown": kd, "browUp": ku})


def build_mouth(P, hd, part):
    n = 11
    mw, my = P["mw"], hd.C.y + P["my"]
    xs = [lerp(-mw, mw, k / (n - 1)) for k in range(n)]
    ys = [my + P["mcurve"] * (2 * k / (n - 1) - 1) ** 2 for k in range(n)]
    pts, nr = surf_path(hd, xs, ys, -0.0008)
    prof = [math.sqrt(max(1 - (2 * k / (n - 1) - 1) ** 2, 0)) for k in range(n)]
    a = [0.0014 + 0.0012 * p for p in prof]
    b = [0.0024] * n
    v, f = tube(pts, a, b, ring=6, normals=nr)
    po = [p - V(0, 0.0022 * pr, 0) for p, pr in zip(pts, prof)]
    ao = [0.0014 + 0.0055 * p for p in prof]
    ko = tube(po, ao, b, ring=6, normals=nr)[0]
    part.add(v, f, P["mat_mouth"], {"Head": 1.0}, {"mouthOpen": ko})


def build_ears(P, hd, part):
    for side in (-1, 1):
        yl = P["ey"] - 0.025
        o = hd.C + V(0, yl, -0.012)
        d = V(side, 0, 0)
        loc, _ = hd.ray(o + d * 0.8, -d, 0.8)
        c = loc - d * 0.002
        ax = rot_y(V(side, 0, 0), side * math.radians(-30))
        thetas = [0, 0.45, 0.9, 1.3, 1.7, 2.2, 2.7, math.pi]
        v, f = latlong(c, ax, (0.024, 0.06, 0.045), thetas, 12, e1=V(0, 1, 0))
        out = []
        for p in v:
            q = p - c
            u = q.dot(ax)
            rad = ((q - ax * u).length) / 0.05
            if u > 0 and rad < 1:
                q -= ax * (0.016 * (1 - rad * rad) ** 1.5)
            out.append(c + q)
        part.add(out, f, P["mat_skin"], {"Head": 1.0})


def build_nose_tip(P, hd, part):
    loc, nrm = hd.front(0.0, hd.C.y + P["ny"])
    c = loc + V(0, 0.002, -0.006)
    v, f = latlong(c, V(0, 0.25, 1), (P["nbz"], P["nbx"] * 0.9, P["nbx"]), [0, 0.5, 1.0, 1.5, 2.1, 2.7, math.pi], 12)
    part.add(v, f, P["mat_nose"], {"Head": 1.0})


# ----------------------------------------------------------- hair tools
def cap(hd, pole, covered, Hfn, nphi, nth, part, mat, edge_keep=0.45, inner=0.012, mat_fn=None, tmax_cap=math.pi * 0.97):
    c = pole.normalized()
    e1 = (V(0, 0, 1) - c * c.z).normalized()
    e2 = c.cross(e1)

    def dirf(ph, th):
        return (c * math.cos(th) + (e1 * math.cos(ph) + e2 * math.sin(ph)) * math.sin(th)).normalized()

    phis = [TAU * i / nphi for i in range(nphi)]
    tmax = []
    for ph in phis:
        lo, hi = 0.0, tmax_cap
        th = 0.0
        step = math.radians(1.0)
        while th < tmax_cap:
            d = dirf(ph, th)
            if not covered(hd.S(d), d):
                break
            th += step
        tmax.append(th)
    tmax = smooth_list(tmax, 3)
    vs = [1 - (1 - j / (nth - 1)) ** 1.35 for j in range(nth)]

    def base(i, j):
        ph = phis[i]
        th = tmax[i] * vs[j]
        d = dirf(ph, th)
        p = hd.S(d)
        return ph, th, d, p

    def Fo(i, j):
        ph, th, d, p = base(i, j)
        h = Hfn(ph, th / max(tmax[i], 1e-6), d, p) * lerp(1.0, edge_keep, vs[j] ** 5)
        return hd.C + p + p.normalized() * h

    def Fi(i, j):
        ph, th, d, p = base(i, j)
        return hd.C + p - p.normalized() * inner

    v, f, m = slab(Fo, Fi, nphi, nth, True, mat_fn or (lambda k: mat))
    part.add(v, f, m, {"Head": 1.0})
    return dirf, phis, tmax


def curtain(hd, P, beta0, y_top, y_bot, nb, ny, gap, thick, ripple, part, mat, zc=-0.02, mat_fn=None):
    """Draped panel (hair or cloth) around the head that hangs under gravity."""
    rows = []
    for i in range(nb):
        s = i / (nb - 1)
        col = []
        cum = 0.0
        for j in range(ny):
            t = j / (ny - 1)
            beta_c = lerp(0, TAU, s)
            yb = y_bot(beta_c)
            yl = lerp(y_top, yb, t)
            b0 = beta0(yl)
            beta = lerp(b0, TAU - b0, s)
            rh = hd.radius_at(beta, yl, zc)
            cum = max(cum, rh)
            rb = body_r_head(beta, hd.C.y + yl, P["shoulder"])
            rr = max(cum + gap(beta, t), rb + 0.014 if rb > 0 else 0)
            col.append([beta, yl, rr, t])
        rs = smooth_list([c[2] for c in col], 2, wrap=False)
        for c, r2 in zip(col, rs):
            rb = body_r_head(c[0], hd.C.y + c[1], P["shoulder"])
            c[2] = max(r2, rb + 0.03 if rb > 0 else 0)
        rows.append(col)

    def pos(i, j, off):
        beta, yl, rr, t = rows[i][j]
        rr += ripple(beta, t) + off
        return hd.C + V(rr * math.sin(beta), yl, zc + rr * math.cos(beta))

    v, f, m = slab(lambda i, j: pos(j, i, 0.0), lambda i, j: pos(j, i, -thick), ny, nb, False, mat_fn or (lambda k: mat))
    part.add(v, f, m, {"Head": 1.0})


def hairline_fn(table):
    """Piecewise-linear local-y hairline versus azimuth (degrees from front)."""
    def f(p):
        b = abs(math.degrees(math.atan2(p.x, p.z)))
        for (b0, y0), (b1, y1) in zip(table, table[1:]):
            if b0 <= b <= b1:
                return lerp(y0, y1, ss(b0, b1, b) * 0.5 + (b - b0) / (b1 - b0) * 0.5)
        return table[-1][1]
    return f


# ------------------------------------------------------------ characters
def base_params():
    return dict(
        W=0.255, H=0.29, D=0.27, jaw=0.7, jawD=0.86, chin=0.03, chinF=0.02, cheek=0.034, flat=0.05,
        back=0.04, crown=0.0, temple=0.04, hy=0.635, res=12,
        er=0.03, eyeV=1.32, ex=0.105, ey=-0.035, eyeIn=0.95, tilt=0, lidU=36, lidL=38, lash=False, nbx=0.024, nbz=0.02,
        sock=0.008, ridge=0.006, nose=0.03, nsx=0.03, nsy=0.024, ny=-0.108, muzzle=0.008, chinBall=0.005,
        cheekPuff=0.014, mw=0.03, my=-0.172, mcurve=0.0075,
        browH=0.072, arch=0.006, browSlope=0.004, browW=0.011, shoulder=1.0, neck=0.066,
    )


CHARS = {}


def char(cid):
    def deco(fn):
        CHARS[cid] = fn
        return fn
    return deco


@char("cold")
def cold():
    P = base_params()
    P.update(W=0.258, H=0.285, jaw=0.74, cheek=0.036)
    P["colors"] = dict(skin=(0.93, 0.65, 0.47), hair=(0.42, 0.23, 0.12), hair2=(0.33, 0.18, 0.09), cloth=(0.15, 0.17, 0.27),
                       brow=(0.22, 0.12, 0.07), mouth=(0.45, 0.22, 0.18), string=(0.80, 0.80, 0.82))
    return P


@char("intent")
def intent():
    P = base_params()
    P.update(W=0.248, H=0.292, D=0.262, jaw=0.68, jawD=0.84, chin=0.034, chinF=0.014, cheek=0.04, temple=0.02,
             nbx=0.021, nbz=0.017, mw=0.027, shoulder=0.88, browW=0.0095, arch=0.008, neck=0.058, ex=0.1)
    P["colors"] = dict(skin=(0.96, 0.71, 0.56), hair=(0.17, 0.10, 0.09), hair2=(0.12, 0.07, 0.06), cloth=(0.93, 0.45, 0.66),
                       brow=(0.14, 0.09, 0.07), mouth=(0.55, 0.24, 0.24), gold=(0.86, 0.64, 0.24))
    return P


@char("visual")
def visual():
    P = base_params()
    P.update(W=0.262, H=0.282, D=0.272, jaw=0.76, jawD=0.88, chin=0.022, cheek=0.03, nbx=0.026, nbz=0.021,
             browW=0.0115, browSlope=0.002, ex=0.108)
    P["colors"] = dict(skin=(0.64, 0.42, 0.30), hair=(0.10, 0.07, 0.06), hair2=(0.08, 0.06, 0.05), cloth=(0.48, 0.30, 0.82),
                       brow=(0.08, 0.05, 0.04), mouth=(0.30, 0.14, 0.11), cap=(0.40, 0.28, 0.86),
                       frame=(0.95, 0.91, 0.82), string=(0.95, 0.91, 0.82))
    return P


@char("enthusiast")
def enthusiast():
    P = base_params()
    P.update(W=0.258, H=0.3, D=0.275, jaw=0.76, jawD=0.88, chin=0.026, chinF=0.018, nbx=0.027, nbz=0.022,
             ny=-0.112, browW=0.0125, browH=0.07, arch=0.004, shoulder=1.04, neck=0.068)
    P["colors"] = dict(skin=(0.82, 0.57, 0.41), hair=(0.12, 0.08, 0.07), hair2=(0.12, 0.08, 0.07), cloth=(0.96, 0.95, 0.92),
                       brow=(0.10, 0.07, 0.06), mouth=(0.40, 0.20, 0.17), ghutra=(0.97, 0.96, 0.93),
                       agal=(0.05, 0.05, 0.06))
    return P


# ------------------------------------------------------------- materials
MATS = {}


def material(name, color, rough=0.7, emit=None, vcol=False):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    lin = srgb(color)
    bsdf.inputs["Base Color"].default_value = (*lin, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = 0.0
    if emit:
        bsdf.inputs["Emission Color"].default_value = (*srgb(emit), 1.0)
        bsdf.inputs["Emission Strength"].default_value = 1.0
    if vcol:
        nt = m.node_tree
        ca = nt.nodes.new("ShaderNodeVertexColor")
        ca.layer_name = "Color"
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0
        mix.inputs[6].default_value = (*lin, 1.0)
        nt.links.new(ca.outputs["Color"], mix.inputs[7])
        nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    m.diffuse_color = (*lin, 1.0)
    MATS[name] = m
    return m


def make_object(name, part, arm, bones):
    me = bpy.data.meshes.new(name)
    me.from_pydata([toB(p) for p in part.v], [], part.f)
    if not part.keys and me.validate(verbose=True):
        print("VALIDATED/CLEANED", name)
    me.update()
    names = []
    for m in part.fm:
        if m not in names:
            names.append(m)
    for n in names:
        me.materials.append(MATS[n])
    me.polygons.foreach_set("material_index", [names.index(m) for m in part.fm])
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()
    if part.col:
        ca = me.color_attributes.new("Color", "FLOAT_COLOR", "POINT")
        for i, c in enumerate(part.col):
            ca.data[i].color = c
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    groups = {b: ob.vertex_groups.new(name=b) for b in bones}
    for i, w in enumerate(part.w):
        for b, val in w.items():
            groups[b].add([i], val, "REPLACE")
    if part.keys:
        ob.shape_key_add(name="Basis")
        for k, vs in part.keys.items():
            sk = ob.shape_key_add(name=k)
            sk.data.foreach_set("co", [c for p in vs for c in toB(p)])
    ob.parent = arm
    mod = ob.modifiers.new("Armature", "ARMATURE")
    mod.object = arm
    return ob


def make_armature(cid, eyes, g):
    ad = bpy.data.armatures.new(f"{cid}_skeleton")
    arm = bpy.data.objects.new(f"reviewer_{cid}", ad)
    bpy.context.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    eb = ad.edit_bones

    def bone(n, h, t, parent=None):
        b = eb.new(n)
        b.head, b.tail = toB(h * g), toB(t * g)
        if parent:
            b.parent = eb[parent]
        return b

    bone("Chest", V(0, 0.06, -0.01), V(0, 0.29, -0.02))
    bone("Neck", V(0, 0.29, -0.02), V(0, 0.44, -0.028), "Chest")
    bone("Head", HEAD_PIV, head_xf(V(0, 0.92, -0.028)), "Neck")
    for n, E in eyes.items():
        bone(n, E / g, E / g + V(0, 0, 0.05), "Head")
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm


def build_character(cid):
    P = CHARS[cid]()
    P["shoulder"] *= BUST_NARROW
    col = P["colors"]
    pre = cid + "_"
    P["mat_skin"] = pre + "skin"; material(P["mat_skin"], col["skin"], 0.75, vcol=True)
    P["mat_neck"] = pre + "neck"; material(P["mat_neck"], col["skin"], 0.75)
    P["mat_lid"] = P["mat_skin"]
    P["mat_nose"] = pre + "nose"; material(P["mat_nose"], tuple(min(1, c * k) for c, k in zip(col["skin"], (1.02, 0.93, 0.9))), 0.75)
    P["mat_brow"] = pre + "brow"; material(P["mat_brow"], col["brow"], 0.8)
    P["mat_mouth"] = pre + "mouth"; material(P["mat_mouth"], col["mouth"], 0.6)
    P["mat_hair"] = pre + "hair"; material(P["mat_hair"], col["hair"], 0.62)
    P["mat_hair2"] = pre + "hair2"; material(P["mat_hair2"], col["hair2"], 0.66)
    P["mat_cloth"] = pre + "cloth"; material(P["mat_cloth"], col["cloth"], 0.85)
    if "string" in col:
        P["mat_string"] = pre + "string"; material(P["mat_string"], col["string"], 0.8)
    material("eyeblack", (0.045, 0.032, 0.03), 0.55)
    material("lash", (0.10, 0.07, 0.06), 0.7)
    material("catch", (1, 1, 1), 0.5, emit=(1, 1, 1))

    hd = Head(P)
    hd.build_skin()
    hd.carve_sockets()
    hv, hf = hd.verts, hd.faces
    face, eyes, hair, body = Part(), Part(), Part(), Part()
    face.add(hv, hf, P["mat_skin"], {"Head": 1.0})
    E_L = build_eye(P, hd, 1, eyes, face, None)
    E_R = build_eye(P, hd, -1, eyes, face, None)
    build_brows(P, hd, face)
    build_mouth(P, hd, face)
    build_ears(P, hd, face)
    build_nose_tip(P, hd, face)
    build_bust(P, body, P["mat_cloth"])
    build_neck(P, body, P["mat_neck"])
    STYLE[cid](P, hd, hair, body, face)

    bones = ["Chest", "Neck", "Head", "Eye_L", "Eye_R"]
    for p in face.v:
        q = p - hd.C
        k = 0.0
        if q.z > 0.05:
            k = math.exp(-((abs(q.x) - P["ex"] * 1.12) / 0.045) ** 2 - ((q.y - (P["ey"] - 0.07)) / 0.03) ** 2)
        face.col.append((1.0, lerp(1.0, 0.86, k), lerp(1.0, 0.84, k), 1.0))
    for part in (face, eyes, hair):
        part.v = [head_xf(p) for p in part.v]
        part.keys = {k: [head_xf(p) for p in vs] for k, vs in part.keys.items()}
    E_L, E_R = head_xf(E_L), head_xf(E_R)
    top = max(p.y for part in (face, eyes, hair, body) for p in part.v)
    g = min(0.93, 1.04 / top)
    for part in (face, eyes, hair, body):
        part.v = [p * g for p in part.v]
        part.keys = {k: [p * g for p in vs] for k, vs in part.keys.items()}
    arm = make_armature(cid, {"Eye_L": E_L * g, "Eye_R": E_R * g}, g)
    objs = [make_object(pre + "face", face, arm, bones), make_object(pre + "eyes", eyes, arm, bones),
            make_object(pre + "hair", hair, arm, bones), make_object(pre + "body", body, arm, bones)]
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
    print(f"[{cid}] tris={tris} " + " ".join(f"{o.name}:{sum(len(p.vertices)-2 for p in o.data.polygons)}" for o in objs))
    return arm


# ----------------------------------------------------------------- styles
STYLE = {}


def style(cid):
    def deco(fn):
        STYLE[cid] = fn
        return fn
    return deco


@style("cold")
def style_cold(P, hd, hair, body, face):
    ey = P["ey"]
    hl = hairline_fn([(0, ey + 0.118), (30, ey + 0.11), (58, ey + 0.065), (74, ey + 0.02), (84, ey + 0.035),
                      (100, ey + 0.05), (118, ey - 0.02), (145, -0.15), (180, -0.17)])

    pole = V(0, 0.9, -0.42)
    c = pole.normalized()
    e1 = (V(0, 0, 1) - c * c.z).normalized()
    e2 = c.cross(e1)

    def cdir(az, th):
        ph = math.radians(az)
        return (c * math.cos(th) + (e1 * math.cos(ph) + e2 * math.sin(ph)) * math.sin(th)).normalized()

    # big soft curl clumps: (azimuth, polar angle from crown, amplitude)
    clumps = [(0, 0.0, 0.08), (30, 0.62, 0.085), (110, 0.62, 0.08), (180, 0.64, 0.07), (250, 0.62, 0.08), (330, 0.62, 0.085),
              (-22, 1.25, 0.08), (28, 1.25, 0.08), (88, 1.42, 0.07), (272, 1.42, 0.07), (150, 1.25, 0.065), (210, 1.25, 0.065)]
    cd = [(cdir(az, th), amp) for az, th, amp in clumps]

    frames = []
    for dk, amp in cd:
        u = V(0, 1, 0).cross(dk)
        u = u.normalized() if u.length > 1e-4 else V(1, 0, 0)
        frames.append((dk, amp, u, dk.cross(u)))

    def H(ph, v, d, p):
        h = 0.022
        for k, (dk, amp, u, w) in enumerate(frames):
            a = d.angle(dk)
            R = 0.44
            if a >= R:
                continue
            x = a / R
            dome = max(1 - x * x, 0) ** 0.6
            # C-shaped groove spiralling into each clump
            q = d - dk * d.dot(dk)
            phi = (math.atan2(q.dot(w), q.dot(u)) + k * 1.7) % TAU
            rs = 0.28 + 0.55 * phi / TAU
            groove = math.exp(-((x - rs) / 0.085) ** 2) * ss(0.15, 1.2, phi) * ss(TAU, 5.0, phi)
            h = max(h, 0.022 + 1.1 * amp * dome * (1 - 0.55 * groove))
        return h

    cap(hd, pole, lambda p, d: p.y > hl(p), H, 60, 18, hair, P["mat_hair"], edge_keep=0.75)
    build_hood(P, body, P["mat_cloth"])


@style("intent")
def style_intent(P, hd, hair, body, face):
    ey = P["ey"]
    hl = hairline_fn([(0, ey + 0.15), (20, ey + 0.14), (45, ey + 0.1), (65, ey + 0.035), (85, ey - 0.03),
                      (120, -0.1), (180, -0.12)])
    ph_p = 0.45

    def H(ph, v, d, p):
        dp = math.atan2(math.sin(ph - ph_p), math.cos(ph - ph_p))
        part = 1 - 0.6 * math.exp(-(dp / 0.1) ** 2) * ss(1.0, 0.25, v)
        vol = 1 + 0.5 * ss(0.3, -1.2, dp) * ss(0.1, 0.8, v)
        swoop = 1 + 0.9 * ss(0.55, 0.95, v) * ss(0.0, -1.0, dp)
        return (0.018 + 0.012 * ss(0.85, 0.3, v)) * part * vol * swoop

    def covered(p, d):
        if p.z > 0.02:
            fx = p.x
            yf = ey + 0.175 - 0.085 * ss(0.07, -0.17, fx) - 0.05 * ss(0.07, 0.2, fx)
            return p.y > lerp(yf, hl(p), ss(0.12, 0.0, p.z))
        return p.y > hl(p)

    cap(hd, V(0, 1.0, -0.35), covered, H, 32, 10, hair, P["mat_hair"], edge_keep=0.75)
    def beta0(yl):
        return math.radians(lerp(38, 74, ss(ey + 0.12, ey - 0.03, yl)) - 34 * ss(-0.24, -0.42, yl))

    def ybot(beta):
        return 0.165 - hd.C.y + 0.014 * abs(math.sin(4.5 * beta))

    def gap(beta, t):
        return 0.012 + 0.024 * ss(0.0, 0.5, t)

    def ripple(beta, t):
        return 0.008 * math.sin(11 * beta) * ss(0.2, 1.0, t)

    curtain(hd, P, beta0, ey + 0.13, ybot, 34, 13, gap, 0.028, ripple, hair, P["mat_hair"])
    gold = "intent_gold"
    material(gold, P["colors"]["gold"], 0.5)
    for side in (-1, 1):
        yl = ey - 0.1
        o = hd.C + V(0, yl, 0.0)
        d = V(side, 0, 0.35).normalized()
        loc, _ = hd.ray(o + d * 0.8, -d, 0.8)
        ctr = loc + d * 0.02 + V(0, -0.03, 0)
        ns = 20
        nrm = rot_y(V(side, 0, 0), side * math.radians(-55))
        e_up = V(0, 1, 0)
        e_s = nrm.cross(e_up).normalized()
        pts = [ctr + (e_up * math.cos(TAU * k / ns) + e_s * math.sin(TAU * k / ns)) * 0.026 for k in range(ns)]
        nr = [(p - ctr).normalized() for p in pts]
        v, f = tube(pts, [0.005] * ns, [0.005] * ns, ring=6, normals=nr, closed=True)
        hair.add(v, f, gold, {"Head": 1.0})
    build_crew(P, body, P["mat_cloth"])


@style("visual")
def style_visual(P, hd, hair, body, face):
    r, ey = 0.046, P["ey"]
    # short hair visible under the cap
    hl = hairline_fn([(0, ey + 2.3 * r), (55, ey + 1.3 * r), (72, ey + 0.0 * r), (84, ey + 0.1 * r), (100, ey + 1.0 * r),
                      (120, ey - 0.4 * r), (150, -0.15), (180, -0.17)])
    # baseball cap
    band_f, band_b = ey + 0.14, 0.02

    def band(p):
        b = math.atan2(p.x, p.z)
        return lerp(band_f, band_b, ((1 - math.cos(b)) / 2) ** 0.8) + 0.03 * math.sin(abs(b)) ** 4

    cap(hd, V(0, 1, -0.2), lambda p, d: p.y > hl(p), lambda ph, v, d, p: lerp(0.012, 0.002, ss(band(p) - 0.03, band(p) - 0.005, p.y)),
        26, 7, hair, P["mat_hair"], edge_keep=0.7)
    mat_cap = "visual_capm"
    material(mat_cap, P["colors"]["cap"], 0.75)

    def Hc(ph, v, d, p):
        seam = 1 - 0.28 * abs(math.cos(3 * ph)) ** 24 * ss(0.05, 0.3, v)
        return (0.016 + 0.034 * ss(0.75, 0.0, v)) * seam

    cap(hd, V(0, 1, 0.08), lambda p, d: p.y > band(p), Hc, 36, 9, hair, mat_cap, edge_keep=0.35, inner=0.006)
    top = hd.C + hd.S(V(0, 1, 0.08).normalized())
    top += V(0, 1, 0.08).normalized() * 0.058
    v, f = latlong(top, V(0, 1, 0.08), (0.008, 0.016, 0.016), [0, 0.8, 1.5, 2.2, math.pi], 10)
    hair.add(v, f, mat_cap, {"Head": 1.0})
    # brim
    yaw = math.radians(-18)
    bmax = math.radians(58)
    nu, nv = 17, 5

    def brim(i, j, off):
        s = lerp(-1, 1, i / (nu - 1))
        bb = s * bmax + yaw
        yl = lerp(band_f, band_b, ((1 - math.cos(bb)) / 2) ** 0.8) + 0.03 * math.sin(abs(bb)) ** 4 - 0.004
        rh = hd.radius_at(bb, yl) + 0.02
        L = 0.17 * math.sqrt(max(1 - s * s, 0)) ** 0.6
        t = j / (nv - 1)
        rr = rh - 0.02 + (L + 0.02) * t
        y = yl - t * L * math.tan(math.radians(14)) - 0.03 * s * s * t - 0.01 * t * t + off
        return hd.C + V(rr * math.sin(bb), y, rr * math.cos(bb))

    v, f, m = slab(lambda i, j: brim(i, j, 0.006), lambda i, j: brim(i, j, -0.006), nu, nv, False, lambda k: mat_cap)
    hair.add(v, f, m, {"Head": 1.0})
    # round glasses
    mat_fr = "visual_frame"
    material(mat_fr, P["colors"]["frame"], 0.55)
    R = 0.084
    zf = None
    ctrs = []
    for side in (-1, 1):
        zf = hd.eyes[side].z + P["er"] * 1.05 + 0.026
        ctrs.append(V(side * (P["ex"] + 0.004), hd.C.y + ey + 0.002, zf))
    for c in ctrs:
        ns = 28
        pts = [c + V(math.cos(TAU * k / ns), math.sin(TAU * k / ns), 0) * R for k in range(ns)]
        pts = [p + V(0, 0, -0.012 * ((p.x - c.x) * (1 if c.x > 0 else -1) / R + 1) / 2) for p in pts]
        nr = [(p - c).normalized() for p in pts]
        v, f = tube(pts, [0.0065] * ns, [0.011] * ns, ring=8, normals=nr, closed=True)
        hair.add(v, f, mat_fr, {"Head": 1.0})
    bp = [V(lerp(ctrs[0].x + R * 0.98, ctrs[1].x - R * 0.98, t / 6), ctrs[0].y + 0.012 * math.sin(math.pi * t / 6) + 0.006, zf + 0.004) for t in range(7)]
    v, f = tube(bp, [0.0065] * 7, [0.006] * 7, ring=6, up=V(0, 0, 1))
    hair.add(v, f, mat_fr, {"Head": 1.0})
    for c in ctrs:
        side = 1 if c.x > 0 else -1
        start = c + V(side * R, 0.006, -0.012)
        pts = []
        for k in range(7):
            t = k / 6
            z = lerp(start.z, hd.C.z - 0.06, t)
            y = lerp(start.y, hd.C.y + ey + 0.01, t)
            o = V(0, y, z)
            loc, _ = hd.ray(o + V(side, 0, 0) * 0.8, V(-side, 0, 0), 0.8)
            x = (loc.x + side * 0.02) if loc else start.x
            x = side * max(abs(x), abs(start.x) * (1 - t) + 0.0)
            pts.append(V(x, y, z))
        v, f = tube(pts, [0.006] * 7, [0.0045] * 7, ring=6, up=V(0, 1, 0))
        hair.add(v, f, mat_fr, {"Head": 1.0})
    build_hood(P, body, P["mat_cloth"])


@style("enthusiast")
def style_enthusiast(P, hd, hair, body, face):
    ey, W = P["ey"], P["W"]
    mat_g = "enthusiast_ghutra"
    material(mat_g, P["colors"]["ghutra"], 0.85)
    fy = ey + 0.105

    def face_open(p):
        fx = W * lerp(0.72, 0.62, ss(ey, -0.28, p.y))
        return p.y < fy and abs(p.x) < fx and p.z > 0.02

    cap(hd, V(0, 1, -0.1), lambda p, d: (not face_open(p)) and p.y > -0.3, lambda ph, v, d, p: 0.03 + 0.012 * ss(0.4, 0, v),
        32, 10, hair, mat_g, edge_keep=0.9, tmax_cap=math.pi * 0.8, inner=0.004)

    def beta0(yl):
        return math.radians(lerp(56, 60, ss(fy, ey - 0.1, yl)) - 26 * ss(-0.25, -0.42, yl))

    def ybot(beta):
        front = (1 + math.cos(beta)) / 2
        return lerp(0.07, 0.085, front) - hd.C.y

    def gap(beta, t):
        return 0.006 + 0.075 * ss(0.2, 1.0, t) ** 1.3

    def ripple(beta, t):
        return (0.012 * math.sin(7 * beta + 0.5) + 0.006 * math.sin(13 * beta)) * ss(0.3, 1.0, t) + 0.045 * ss(0.2, 0.55, math.cos(beta)) * ss(0.0, 0.35, t)

    curtain(hd, P, beta0, fy - 0.01, ybot, 36, 12, gap, 0.012, ripple, hair, mat_g)
    mat_a = "enthusiast_agal"
    material(mat_a, P["colors"]["agal"], 0.6)
    for dy in (0.0, 0.03):
        ns = 32
        pts, nr = [], []
        for q in range(ns):
            b = TAU * q / ns
            yl = fy + 0.03 + dy + 0.02 * (1 - math.cos(b)) / 2
            rr = hd.radius_at(b, yl) + 0.042
            d = V(math.sin(b), 0, math.cos(b))
            pts.append(hd.C + V(0, yl, 0) + d * rr)
            nr.append(d)
        v, f = tube(pts, [0.0145] * ns, [0.0125] * ns, ring=6, normals=nr, closed=True)
        hair.add(v, f, mat_a, {"Head": 1.0})
    build_beard(P, hd, hair)
    # inner wrap of the ghutra under the chin
    ys = [lerp(0.27, hd.C.y - 0.1, k / 5) for k in range(6)]
    pts = [V(0, y, lerp(0.0, -0.035, k / 5)) for k, y in enumerate(ys)]
    aw = [lerp(0.15, 0.2, k / 5) for k in range(6)]
    bw = [lerp(0.16, 0.19, k / 5) for k in range(6)]
    v, f = tube(pts, aw, bw, ring=12, normals=[V(0, 0, 1)] * 6)
    hair.add(v, f, mat_g, {"Head": 1.0})
    build_crew(P, body, P["mat_cloth"])


def build_beard(P, hd, part):
    """Short full beard as a smooth shell projected onto the jaw, plus a moustache."""
    ey, my, mw = P["ey"], P["my"], P["mw"]
    O = hd.C + V(0, -0.06, -0.06)

    def hit(beta, e):
        d = V(math.sin(beta) * math.cos(e), math.sin(e), math.cos(beta) * math.cos(e))
        loc, nrm = hd.ray(O + d * 0.9, -d, 0.9)
        return loc, nrm

    def e_for_y(beta, y):
        lo, hi = math.radians(-80), math.radians(60)
        for _ in range(22):
            mid = (lo + hi) / 2
            loc, _ = hit(beta, mid)
            if loc is None or loc.y - hd.C.y > y:
                hi = mid
            else:
                lo = mid
        return (lo + hi) / 2

    nu, nv = 27, 9
    bmax = math.radians(88)
    rows = []
    for i in range(nu):
        s = lerp(-1, 1, i / (nu - 1))
        beta = s * bmax
        a = abs(s)
        # top edge: under the lip at centre, up around the mouth corners, along the cheek to the sideburn
        ytop = my - 0.024 + 0.055 * ss(0.08, 0.3, a) - 0.004 * ss(0.3, 0.55, a) + 0.1 * ss(0.5, 1.0, a) ** 1.4
        e0 = e_for_y(beta, ytop)
        e1 = math.radians(-72) + math.radians(20) * a ** 2
        col = []
        for j in range(nv):
            t = j / (nv - 1)
            e = lerp(e0, e1, t)
            loc, nrm = hit(beta, e)
            col.append((loc, nrm, t, a))
        rows.append(col)

    def thick(t, a):
        return 0.013 * ss(0.0, 0.3, t) * (1 - 0.35 * a ** 3) + 0.001

    def Fo(i, j):
        loc, nrm, t, a = rows[i][j]
        return loc + nrm * thick(t, a)

    def Fi(i, j):
        loc, nrm, t, a = rows[i][j]
        return loc - nrm * 0.003

    v, f, m = slab(Fo, Fi, nu, nv, False, lambda k: P["mat_hair"])
    part.add(v, f, m, {"Head": 1.0})
    n = 11
    xs = [lerp(-mw - 0.016, mw + 0.016, k / (n - 1)) for k in range(n)]
    ys = [hd.C.y + my + 0.019 - 0.006 * (2 * k / (n - 1) - 1) ** 2 for k in range(n)]
    pts, nr = surf_path(hd, xs, ys, 0.004)
    prof = [math.sin(math.pi * (0.08 + 0.84 * k / (n - 1))) for k in range(n)]
    v, f = tube(pts, [0.0035 + 0.0075 * p for p in prof], [0.004 + 0.003 * p for p in prof], ring=8, normals=nr)
    part.add(v, f, P["mat_hair"], {"Head": 1.0})


# ------------------------------------------------------------------ main
def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for cid in ("cold", "intent", "visual", "enthusiast"):
        build_character(cid)
    os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
    bpy.ops.export_scene.gltf(
        filepath=OUT_GLB, export_format="GLB", export_yup=True, export_apply=False,
        export_morph=True, export_morph_normal=True, export_skins=True, export_animations=False,
        export_materials="EXPORT", export_texcoords=False, export_extras=False, export_cameras=False,
        export_lights=False)
    print("WROTE", OUT_GLB, os.path.getsize(OUT_GLB))


main()
