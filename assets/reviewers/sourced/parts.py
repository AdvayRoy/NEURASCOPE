"""Clothing, hair, headwear and accessories for each reviewer bust."""
import math, os
import numpy as np
import bmesh, bpy
from mathutils import Vector
import head as H
import geo as G

def boundary_loops(bm):
    edges = [e for e in bm.edges if e.is_boundary]
    left = set(edges); loops = []
    while left:
        e = left.pop(); loop = [e.verts[0], e.verts[1]]
        while True:
            v = loop[-1]
            nxt = [x for x in v.link_edges if x in left]
            if not nxt:
                break
            e2 = nxt[0]; left.discard(e2)
            loop.append(e2.other_vert(v))
            if loop[-1] == loop[0]:
                break
        loops.append(loop)
    return loops

def torso_shell(ctx, M, thick, below_neck=0.45, smooth_iters=25):
    """Offset + smoothed copy of the body torso, bisected at the bust cut."""
    V, wh, wn, zc = ctx['V'], ctx['wh'], ctx['wn'], ctx['zc']
    F = [f for f in M.BODY_F if (wh[f] + wn[f]).max() < below_neck and V[f][:, 2].max() > zc - 1.0]
    N = H.vnormals(V, M.BODY_F)
    idx = np.unique(np.concatenate([np.array(f) for f in F]))
    rm = -np.ones(len(V), dtype=np.int64); rm[idx] = np.arange(len(idx))
    F2 = [[int(rm[i]) for i in f] for f in F]
    P = V[idx] + N[idx] * thick
    E = H.edges(F2)
    P = H.laplacian(P, E, np.ones(len(P)), iters=smooth_iters)
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in P]
    for f in F2:
        try:
            bm.faces.new([vs[i] for i in f])
        except ValueError:
            pass
    bm.normal_update()
    geom = list(bm.verts) + list(bm.edges) + list(bm.faces)
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, zc), plane_no=(0, 0, 1), clear_inner=True)
    return bm

def fill_bottom(bm, zc, eps=1e-3):
    loops = boundary_loops(bm)
    for lp in loops:
        if max(v.co.z for v in lp) < zc + eps * 10:
            ed = [e for e in bm.edges if e.is_boundary and all(v in lp for v in e.verts)]
            bmesh.ops.holes_fill(bm, edges=ed, sides=0)

def neck_loop(bm, zc):
    loops = boundary_loops(bm)
    top = max(loops, key=lambda lp: np.mean([v.co.z for v in lp]))
    P = np.array([v.co[:] for v in top[:-1]] if top[0] == top[-1] else [v.co[:] for v in top])
    return P

def resample_closed(P, n):
    P = np.vstack([P, P[:1]])
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
    s = np.linspace(0, d[-1], n, endpoint=False)
    out = np.stack([np.interp(s, d, P[:, i]) for i in range(3)], 1)
    # light smoothing
    for _ in range(4):
        out = 0.5 * out + 0.25 * (np.roll(out, 1, 0) + np.roll(out, -1, 0))
    return out

def bm_to_obj(M, bm, name, mats, coll, midx=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    if midx is not None:
        me.polygons.foreach_set('material_index', np.asarray(midx, dtype=np.int32))
    me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), dtype=bool))
    o = bpy.data.objects.new(name, me); coll.objects.link(o)
    return o

def outfit(ctx, M):
    C = ctx['C']; o = C['outfit']; rE = ctx['rE']; key = ctx['key']; coll = ctx['coll']
    kind = o['kind']
    thick = {'hoodie': 0.34, 'top': 0.12, 'kandura': 0.2}[kind] * rE
    bm = torso_shell(ctx, M, thick, below_neck={'hoodie': 0.35, 'top': 0.3, 'kandura': 0.55}[kind])
    loopP = neck_loop(bm, ctx['zc'])
    fill_bottom(bm, ctx['zc'])
    cloth = M.mat('cloth_' + key, o['col'], 0.85)
    objs = [(bm_to_obj(M, bm, 'outfit_' + key, [cloth], coll), 'Chest')]
    ring = resample_closed(loopP, 48)
    ctr = ring.mean(0)
    ang = np.arctan2(ring[:, 0], ring[:, 1] - ctr[1])  # 0 = back (+Y), pi = front
    back = 0.5 * (1 + np.cos(ang))  # 1 at back, 0 at front
    if kind == 'hoodie':
        # rolled hood lying behind the neck, thinning into the front V
        rad = rE * (0.22 + 0.55 * back ** 1.5)
        out = G.norm((ring - ctr) * np.array([1, 1, 0])) * (rad * 0.7)[:, None]
        path = ring + out + np.array([0, 0, 1]) * (rad * 0.35 + 0.1 * back * rE)[:, None]
        v, f = G.sweep(path, rad, 8, up=np.array([0, 0, 1.0]), rad2=rad * 0.8, closed=True)
        objs.append((M.mk('hood_' + key, v, f, [cloth], None, coll), 'Chest'))
        if o.get('inner'):
            inner = M.mat('tee_' + key, o['inner'], 0.85)
            front = ring[np.argsort(-np.abs(ang))[:1]][0]
            tee = G.sweep(G.catmull([ring[np.argmin(np.abs(ang - 2.4))], front + np.array([0, -0.05 * rE, -0.25 * rE]),
                                     ring[np.argmin(np.abs(ang + 2.4))]], 14), rE * 0.16, 8)
            objs.append((M.mk('tee_' + key, tee[0], tee[1], [inner], None, coll), 'Chest'))
        # drawstrings
        for sg in (1, -1):
            a0 = ring[np.argmin(np.abs(ang - sg * 2.75))]
            p = G.catmull([a0 + np.array([0, -0.2 * rE, -0.05 * rE]), a0 + np.array([0.05 * sg * rE, -0.3 * rE, -0.9 * rE]),
                           a0 + np.array([0.08 * sg * rE, -0.3 * rE, -1.5 * rE])], 8)
            v, f = G.sweep(p, rE * 0.045, 6)
            objs.append((M.mk('string_%d_%s' % (sg, key), v, f, [M.mat('string_' + key, (232, 232, 236), 0.8)], None, coll), 'Chest'))
    else:
        rad = rE * (0.09 if kind == 'top' else 0.12)
        path = ring + np.array([0, 0, 0.3 * rad])
        v, f = G.sweep(path, rad, 8, up=np.array([0, 0, 1.0]), rad2=rad * 1.4, closed=True)
        objs.append((M.mk('collar_' + key, v, f, [cloth], None, coll), 'Chest'))
    return objs

# ------------------------------------------------------------------ head-surface helpers
class HeadFrame:
    """Spherical (phi, theta) parametrisation of the head surface via ray casts.
    phi: 0 = front (-Y), +pi/2 = character left (+X). theta: polar angle from top."""
    def __init__(self, ctx):
        V, wh = ctx['V'], ctx['wh']
        hv = V[wh > 0.95]
        self.top = hv[:, 2].max()
        self.c = np.array([0.0, hv[:, 1].mean() + 0.1 * ctx['rE'], ctx['ec'][2] + 0.3 * ctx['rE']])
        self.bvh = ctx['bvh']; self.rE = ctx['rE']
    def dir(self, phi, th):
        return np.array([math.sin(th) * math.sin(phi), -math.sin(th) * math.cos(phi), math.cos(th)])
    def surf(self, phi, th):
        d = self.dir(phi, th)
        hit = self.bvh.ray_cast(Vector((self.c + d * 20 * self.rE).tolist()), Vector((-d).tolist()))
        if hit[0] is None:
            return self.c + d * 2 * self.rE, d
        n = np.array(hit[1])
        if n @ d < 0:
            n = -n
        return np.array(hit[0]), G.norm(0.5 * n + 0.5 * d)
    def pt(self, phi, th, off):
        p, n = self.surf(phi, th)
        return p + n * off, n

def interp_ang(table, phi):
    a = abs(math.degrees(phi)) % 360
    a = 360 - a if a > 180 else a
    xs, ys = zip(*table)
    return math.radians(np.interp(a, xs, ys))

def dome(hf, th_table, thick, nphi=48, nth=14, inner=0.12, phi_range=(-math.pi, math.pi)):
    """Closed, manifold shell over the scalp from the crown down to theta(phi) given by th_table."""
    rE = hf.rE
    phis = np.linspace(*phi_range, nphi, endpoint=False)
    p0, n0 = hf.surf(0.0, 1e-3)
    O, I = [p0 + n0 * thick(0.0, 0.0) * rE], [p0 - n0 * inner * rE]
    for j in range(1, nth):
        t = j / (nth - 1)
        for ph in phis:
            th = interp_ang(th_table, ph) * t
            p, n = hf.surf(ph, th)
            O.append(p + n * thick(ph, th) * rE); I.append(p - n * inner * rE)
    O, I = np.array(O), np.array(I)
    N = len(O); V = np.vstack([O, I]); F = []
    ring = lambda j, i: 1 + (j - 1) * nphi + (i % nphi)
    for i in range(nphi):
        F.append([0, ring(1, i), ring(1, i + 1)]); F.append([N, N + ring(1, i + 1), N + ring(1, i)])
    for j in range(1, nth - 1):
        for i in range(nphi):
            a_, b_, c_, d_ = ring(j, i), ring(j, i + 1), ring(j + 1, i + 1), ring(j + 1, i)
            F.append([a_, d_, c_, b_]); F.append([N + a_, N + b_, N + c_, N + d_])
    for i in range(nphi):
        a_, b_ = ring(nth - 1, i), ring(nth - 1, i + 1)
        F.append([a_, N + a_, N + b_, b_])
    return V, F

def surf_path(hf, pts, off, n=16):
    """Catmull path over the head: pts = [(phi_deg, theta_deg, extra_off), ...]"""
    P, Nn = [], []
    for ph, th, eo in pts:
        p, nn = hf.pt(math.radians(ph), math.radians(th), (off + eo) * hf.rE)
        P.append(p); Nn.append(nn)
    return G.catmull(np.array(P), n), G.norm(G.catmull(np.array(Nn), n))

def hang(P, Nn, drop, out, n=8):
    """Continue a path downward from its last point by `drop` (world units), flaring outward."""
    p0, n0 = P[-1], Nn[-1]
    h = G.norm(n0 * np.array([1, 1, 0]))
    ext = [p0 + h * out * (t ** 1.3) + np.array([0, 0, -drop * t]) for t in np.linspace(0, 1, n)[1:]]
    P2 = np.vstack([P, ext]); N2 = np.vstack([Nn, np.repeat(h[None], n - 1, 0)])
    return G.catmull(P2, len(P2) + 6), G.norm(G.catmull(N2, len(P2) + 6))

def blob_obj(M, name, parts, mat, coll, voxel, tris, smooth_iters=8, smooth_f=0.6):
    V, F, _ = M.join_meshes([(v, f, 0) for v, f in parts])
    o = M.mk(name, V, F, [mat], None, coll)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4 * voxel)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-5 * voxel)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data); bm.free()
    if os.environ.get('NOREMESH'):
        return o
    return M.remesh_obj(o, voxel, tris, smooth_iters, smooth_f)

def fib_dirs(n, th_max_fn, rng):
    out = []
    ga = math.pi * (3 - math.sqrt(5))
    k = 0
    while len(out) < n and k < n * 20:
        z = 1 - (k + 0.5) / (n * 3); k += 1
        th = math.acos(max(-1, min(1, z))); ph = (k * ga) % (2 * math.pi) - math.pi
        if th < th_max_fn(ph):
            out.append((ph + rng.uniform(-0.05, 0.05), th))
    return out

# ------------------------------------------------------------------ hair styles
def hair_curly(ctx, M, hf, C):
    rE = hf.rE; rng = np.random.default_rng(3)
    line = [(0, 52), (40, 58), (75, 80), (100, 92), (140, 110), (180, 118)]
    parts = [dome(hf, line, lambda ph, th: 0.42 + 0.25 * math.cos(th), inner=0.2)]
    thmax = lambda ph: interp_ang(line, ph) * 0.98
    for ph, th in fib_dirs(46, thmax, rng):
        p, n = hf.pt(ph, th, (0.5 + 0.3 * math.cos(th)) * rE)
        t1 = G.norm(np.cross(n, rng.normal(size=3)))
        R = rE * rng.uniform(0.32, 0.45); r = rE * rng.uniform(0.2, 0.26)
        a = np.linspace(0, 1.6 * math.pi, 9)
        path = p[None] + R * (np.cos(a)[:, None] * t1 + 0.6 * np.sin(a)[:, None] * n) - R * t1
        v, f = G.sweep(path, r * np.linspace(1, 0.55, 9), 8)
        parts.append((v, f))
    # forehead fringe curls
    for ph in np.radians([-38, -20, -4, 12, 30]):
        p, n = hf.pt(ph, math.radians(49), 0.35 * rE)
        a = np.linspace(0, 1.7 * math.pi, 9)
        t1 = np.array([math.cos(ph), math.sin(ph), 0])
        path = p + 0.38 * rE * (np.cos(a)[:, None] * n + np.sin(a)[:, None] * np.array([0, 0, -1])) - 0.38 * rE * n + np.array([0, 0, -0.25 * rE])
        v, f = G.sweep(path, rE * 0.2 * np.linspace(1, 0.6, 9), 8, up=t1)
        parts.append((v, f))
    return [blob_obj(M, 'hair_' + ctx['key'], parts, M.mat('hair_' + ctx['key'], C['hair']['col'], 0.8),
                     ctx['coll'], 0.07 * rE, 3000, 4, 0.5)]

def hair_long(ctx, M, hf, C):
    rE = hf.rE
    line = [(0, 48), (40, 58), (80, 84), (120, 104), (180, 116)]
    part = lambda ph, th: 0.34 + 0.1 * math.cos(th) - 0.12 * math.exp(-(ph / 0.1) ** 2) * (abs(ph) < 1.5) * (th < 0.9)
    parts = [dome(hf, line, part, inner=0.2)]
    zbot = ctx['zc'] + 0.35 * (ctx['chin'] - ctx['zc'])
    for sg in (1, -1):
        # face-framing swoop from the centre part over the temple, behind the ear, onto the shoulder
        P, Nn = surf_path(hf, [(sg * 4, 10, 0.3), (sg * 30, 42, 0.42), (sg * 70, 70, 0.45), (sg * 100, 95, 0.4)], 0.0)
        P, Nn = hang(P, Nn, P[-1][2] - zbot, 0.7 * rE)
        k = len(P); t = np.linspace(0, 1, k)
        v, f = G.sweep(P, rE * (0.75 + 0.3 * np.sin(t * math.pi)) * (1 - 0.5 * t ** 3), 10, up=Nn, rad2=rE * 0.4)
        parts.append((v, f))
        for ph in np.arange(108, 181, 12):
            P, Nn = surf_path(hf, [(sg * ph * 0.4, 12, 0.3), (sg * ph * 0.8, 60, 0.38), (sg * ph, 102, 0.36)], 0.0)
            P, Nn = hang(P, Nn, P[-1][2] - zbot + 0.15 * rE * math.cos(math.radians(ph)), 0.6 * rE)
            t = np.linspace(0, 1, len(P))
            v, f = G.sweep(P, rE * 0.85 * (1 - 0.45 * t ** 3), 10, up=Nn, rad2=rE * 0.42)
            parts.append((v, f))
    return [blob_obj(M, 'hair_' + ctx['key'], parts, M.mat('hair_' + ctx['key'], C['hair']['col'], 0.75),
                     ctx['coll'], 0.07 * rE, 3200, 6, 0.6)]

def hair_cap(ctx, M, hf, C):
    rE = hf.rE; key = ctx['key']
    short = [(0, 60), (60, 70), (90, 88), (130, 108), (180, 115)]
    hair = blob_obj(M, 'hair_' + key, [dome(hf, short, lambda ph, th: 0.16, inner=0.15)],
                    M.mat('hair_' + key, C['hair']['col'], 0.85), ctx['coll'], 0.06 * rE, 1200, 4, 0.5)
    cline = [(0, 60), (60, 68), (90, 82), (140, 94), (180, 96)]
    parts = [dome(hf, cline, lambda ph, th: 0.26 + 0.1 * math.cos(th), inner=0.1)]
    # brim
    ring_in, ring_out = [], []
    for a in np.radians(np.linspace(-78, 78, 23)):
        th = interp_ang(cline, a)
        p, n = hf.pt(a, th, 0.22 * rE)
        fwd = np.array([math.sin(a) * 0.8, -math.cos(a), 0.0])
        L = rE * (4.6 * max(math.cos(a), 0) ** 0.9 + 0.1)
        q = p + fwd * L + np.array([0, 0, 0.18 * rE - 0.35 * rE * math.cos(a) ** 2 * 0.3])
        ring_in.append(p - n * 0.1 * rE); ring_out.append(q)
    ri, ro = np.array(ring_in), np.array(ring_out)
    nb = 5; top, bot = [], []
    for j in range(nb):
        t = j / (nb - 1)
        row = ri * (1 - t) + ro * t + np.array([0, 0, 0.12 * rE * math.sin(math.pi * t)])
        top.append(row + np.array([0, 0, 0.07 * rE])); bot.append(row - np.array([0, 0, 0.07 * rE]))
    top, bot = np.vstack(top), np.vstack(bot); m = len(ri); Nt = len(top)
    V = np.vstack([top, bot]); F = []
    for j in range(nb - 1):
        for i in range(m - 1):
            a, b = j * m + i, j * m + i + 1
            F.append([a, b, b + m, a + m]); F.append([Nt + a, Nt + a + m, Nt + b + m, Nt + b])
    for j in range(nb - 1):
        for i0 in (0, m - 1):
            a, b = j * m + i0, (j + 1) * m + i0
            F.append([a, b, Nt + b, Nt + a] if i0 else [a, Nt + a, Nt + b, b])
    for i in range(m - 1):
        a, b = (nb - 1) * m + i, (nb - 1) * m + i + 1
        F.append([a, Nt + a, Nt + b, b])
    brim = (V, F)
    p, n = hf.pt(0, 0.02, 0.36 * rE)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=0.16 * rE)
    bv = np.array([v.co[:] for v in bm.verts]) * np.array([1, 1, 0.6]) + p
    bf = [[v.index for v in fc.verts] for fc in bm.faces]; bm.free()
    parts.append((bv, bf))
    cap = blob_obj(M, 'cap_' + key, parts, M.mat('cap_' + key, C['hair']['cap'], 0.7), ctx['coll'], 0.045 * rE, 1500, 3, 0.5)
    bv, bf = M.obj_arrays(cap)
    V2, F2, _ = M.join_meshes([(bv, bf, 0), brim + (0,)])
    ccol = cap.data.materials[0]
    bpy.data.objects.remove(cap)
    cap = M.mk('cap_' + key, V2, F2, [ccol], None, ctx['coll'])
    return [hair, cap]

def ghutra(ctx, M, hf, C):
    rE = hf.rE; key = ctx['key']
    line = [(0, 44), (50, 58), (75, 90), (100, 115), (180, 125)]
    parts = [dome(hf, line, lambda ph, th: 0.24 + 0.08 * math.cos(th), inner=0.2)]
    zbot = ctx['zc'] + 0.1 * (ctx['chin'] - ctx['zc'])
    for sg in (1, -1):
        for ph in [62, 82, 102, 124, 146, 168]:
            P, Nn = surf_path(hf, [(sg * ph * 0.5, 10, 0.3), (sg * ph * 0.85, 50, 0.38), (sg * ph, interp_ang(line, math.radians(ph)) * 57.3 - 4, 0.4)], 0.0)
            P, Nn = hang(P, Nn, P[-1][2] - zbot, (1.6 if ph < 120 else 1.0) * rE)
            t = np.linspace(0, 1, len(P))
            v, f = G.sweep(P, rE * (0.7 + 0.45 * t), 10, up=Nn, rad2=rE * (0.34 + 0.2 * t))
            parts.append((v, f))
    cloth = blob_obj(M, 'ghutra_' + key, parts, M.mat('ghutra_' + key, C['hair']['col'], 0.85), ctx['coll'], 0.08 * rE, 2000, 10, 0.6)
    # agal: two black cords around the crown, higher at the back
    rings = []
    for k in range(2):
        ring = []
        for a in np.linspace(-math.pi, math.pi, 40, endpoint=False):
            th = math.radians(40 + 16 * (1 - math.cos(a)) / 2 - 8 * k)
            p, n = hf.pt(a, th, (0.45 + 0.15 * math.cos(th) + 0.12) * rE)
            ring.append(p)
        rings.append(G.sweep(np.array(ring), 0.13 * rE, 8, up=np.array([0, 0, 1.0]), closed=True))
    V, F, _ = M.join_meshes([(v, f, 0) for v, f in rings])
    agal = M.mk('agal_' + key, V, F, [M.mat('agal_' + key, C['hair']['agal'], 0.6)], None, ctx['coll'])
    return [cloth, agal]

# ------------------------------------------------------------------ accessories
def patch(hf, phis, th0, th1, thick, nth=10, inner=0.1):
    """Closed shell over a (phi, theta) band of the head surface."""
    rE = hf.rE; O, I = [], []
    for j in range(nth):
        t = j / (nth - 1)
        for ph in phis:
            th = th0(ph) * (1 - t) + th1(ph) * t
            p, n = hf.surf(ph, th)
            O.append(p + n * thick(ph, t) * rE); I.append(p - n * inner * rE)
    O, I = np.array(O), np.array(I); N = len(O); m = len(phis); V = np.vstack([O, I]); F = []
    for j in range(nth - 1):
        for i in range(m - 1):
            a_, b_, c_, d_ = j * m + i, j * m + i + 1, (j + 1) * m + i + 1, (j + 1) * m + i
            F.append([a_, b_, c_, d_]); F.append([N + a_, N + d_, N + c_, N + b_])
    for j in range(nth - 1):
        for i, rev in ((0, True), (m - 1, False)):
            a_, d_ = j * m + i, (j + 1) * m + i
            F.append([a_, N + a_, N + d_, d_] if rev else [a_, d_, N + d_, N + a_])
    for i in range(m - 1):
        for j, rev in ((0, True), (nth - 1, False)):
            a_, b_ = j * m + i, j * m + i + 1
            F.append([a_, N + a_, N + b_, b_] if not rev else [a_, b_, N + b_, N + a_])
    return V, F

def beard(ctx, M, C):
    hf = ctx['hf']; rE = hf.rE; mouth = ctx['mouth']
    d = mouth - hf.c; thm = math.degrees(math.acos(d[2] / np.linalg.norm(d)))
    dch = np.array([0, ctx['V'][:, 1][ctx['wh'] > 0.9].min(), ctx['chin']]) - hf.c
    thc = math.degrees(math.acos(dch[2] / np.linalg.norm(dch)))
    phis = np.radians(np.linspace(-98, 98, 29))
    top = lambda ph: math.radians(np.interp(abs(math.degrees(ph)), [0, 20, 34, 55, 80, 98], [thm + 13, thm + 10, thm - 10, thm - 20, 84, 78]))
    bot = lambda ph: math.radians(np.interp(abs(math.degrees(ph)), [0, 45, 98], [thc + 22, thc + 16, 112]))
    thick = lambda ph, t: 0.26 * (0.45 + 0.55 * math.sin(math.pi * min(1, 0.15 + t * 1.3) / 1.0 + 0.0) ** 0.5) * (1 - 0.35 * abs(ph) / 1.7)
    parts = [patch(hf, phis, top, bot, thick, 12, 0.12)]
    ms = []
    for x in np.linspace(-1.15, 1.15, 13) * rE:
        hit = ctx['bvh'].ray_cast(Vector((x, mouth[1] - 10 * rE, mouth[2] + 0.32 * rE - 0.3 * (x / rE) ** 2 * rE)), Vector((0, 1, 0)))
        ms.append(np.array(hit[0]) + np.array([0, -0.04 * rE, 0]))
    tt = np.linspace(-1, 1, 13)
    mv, mf = G.sweep(np.array(ms), 0.16 * rE * (1 - 0.5 * tt ** 2), 8, up=np.array([0, -1.0, 0.25]), rad2=0.1 * rE)
    parts.append((mv, mf))
    cs = []
    for x in np.linspace(-1.5, 1.5, 11) * rE:
        hit = ctx['bvh'].ray_cast(Vector((x, mouth[1] - 10 * rE, mouth[2] - 0.95 * rE + 0.25 * (x / rE) ** 2 * rE)), Vector((0, 1, 0)))
        cs.append(np.array(hit[0]))
    tt = np.linspace(-1, 1, 11)
    cv, cf = G.sweep(np.array(cs), 0.5 * rE * (1 - 0.3 * tt ** 2), 10, up=np.array([0, -1.0, 0]), rad2=0.2 * rE)
    parts.append((cv, cf))
    return [blob_obj(M, 'beard_' + ctx['key'], parts, M.mat('beard_' + ctx['key'], C['beard']['col'], 0.85),
                     ctx['coll'], 0.06 * rE, 1100, 5, 0.5)]

def glasses(ctx, M, C):
    rE = ctx['rE']; parts = []
    eyes = ctx['eyes']
    hwid = ctx['V'][ctx['wh'] > 0.95][:, 0].max()
    for s, (c, r) in eyes.items():
        cc = c + np.array([0, -1.35 * r, 0.05 * r])
        parts.append(G.torus(cc, 1.25 * r, 0.11 * r, 26, 6, axis=(0, 1, 0)))
    cl = eyes['L'][0]; cr = eyes['R'][0]
    y = cl[1] - 1.35 * eyes['L'][1]
    br = G.catmull(np.array([[cr[0] + 1.2 * rE, y, cr[2] + 0.2 * rE], [0, y - 0.1 * rE, cr[2] + 0.45 * rE], [cl[0] - 1.2 * rE, y, cl[2] + 0.2 * rE]]), 10)
    parts.append(G.sweep(br, 0.09 * rE, 6))
    for s, sg in (('L', 1), ('R', -1)):
        c = eyes[s][0]
        a = np.array([c[0] + sg * 1.25 * rE, y + 0.05 * rE, c[2] + 0.15 * rE])
        hv = ctx['V'][(ctx['wh'] > 0.9) & (np.abs(ctx['V'][:, 2] - c[2]) < 0.6 * rE) & (sg * ctx['V'][:, 0] > 0)]
        ear = hv[np.abs(hv[:, 0]).argmax()]
        b = np.array([sg * (abs(ear[0]) + 0.05 * rE), ear[1], c[2] + 0.1 * rE])
        parts.append(G.sweep(G.catmull(np.array([a, (a + b) / 2 + np.array([sg * 0.35 * rE, 0, 0.05 * rE]), b]), 8), 0.08 * rE, 6))
    V, F, _ = M.join_meshes([(v, f, 0) for v, f in parts])
    return [M.mk('glasses_' + ctx['key'], V, F, [M.mat('frame_' + ctx['key'], C['glasses']['col'], 0.5)], None, ctx['coll'])]

def earrings(ctx, M, C):
    rE = ctx['rE']; V = ctx['V']; wh = ctx['wh']
    out = []
    for sg in (1, -1):
        hv = V[(wh > 0.9) & (sg * V[:, 0] > 0)]
        xmax = np.abs(hv[:, 0]).max()
        ear = hv[np.abs(hv[:, 0]) > xmax - 0.5 * rE]
        lobe = ear[ear[:, 2].argmin()]
        c = lobe + np.array([sg * 0.05 * rE, -0.05 * rE, -0.42 * rE])
        out.append(G.torus(c, 0.42 * rE, 0.08 * rE, 24, 8, axis=(1, -0.35 * sg, 0)))
    V, F, _ = M.join_meshes([(v, f, 0) for v, f in out])
    return [M.mk('earrings_' + ctx['key'], V, F, [M.mat('gold_' + ctx['key'], C['earrings']['col'], 0.5)], None, ctx['coll'])]

def build_parts(ctx, M):
    C = ctx['C']; hf = HeadFrame(ctx); ctx['hf'] = hf
    objs = outfit(ctx, M)
    kind = C['hair']['kind']
    heads = {'curly': hair_curly, 'long': hair_long, 'cap': hair_cap, 'ghutra': ghutra}[kind](ctx, M, hf, C)
    if 'beard' in C: heads += beard(ctx, M, C)
    if 'glasses' in C: heads += glasses(ctx, M, C)
    if 'earrings' in C: heads += earrings(ctx, M, C)
    return objs + [(o, 'Head') for o in heads]
