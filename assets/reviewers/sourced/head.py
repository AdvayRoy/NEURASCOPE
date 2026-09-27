"""Stylised head construction from the MakeHuman CC0 base (numpy, no bpy)."""
import numpy as np
import mhbase

HEADISH = ('head', 'jaw', 'eye.', 'levator', 'oculi', 'orbicularis', 'oris', 'risorius',
           'special', 'temporalis', 'tongue')

_base = None
def base():
    global _base
    if _base is None:
        verts, faces = mhbase.load_obj()
        w = mhbase.load_weights()
        n = len(verts)
        wh = np.zeros(n); wn = np.zeros(n); lidU = {'L': np.zeros(n), 'R': np.zeros(n)}
        lidD = {'L': np.zeros(n), 'R': np.zeros(n)}; jaw = np.zeros(n); oris = np.zeros(n); brow = {'L': np.zeros(n), 'R': np.zeros(n)}
        for b, lst in w.items():
            for i, x in lst:
                if b.startswith(HEADISH):
                    wh[i] += x
                elif b.startswith('neck'):
                    wn[i] += x
                if b.startswith('orbicularis03'):
                    lidU[b[-1]][i] += x
                if b.startswith('orbicularis04'):
                    lidD[b[-1]][i] += x
                if b.startswith('oculi01'):
                    brow[b[-1]][i] += x
                if b.startswith('oris'):
                    oris[i] += x
                if b == 'jaw':
                    jaw[i] += x
        _base = dict(verts=np.array(verts), faces=faces, wh=wh, wn=wn, lidU=lidU, lidD=lidD,
                     jaw=jaw, oris=oris, brow=brow)
    return _base

def to_blender(v):
    """MakeHuman (Y up, faces +Z) -> Blender (Z up, faces -Y)."""
    return np.stack([v[:, 0], -v[:, 2], v[:, 1]], 1)

def group_idx(name):
    b = base()
    s = set()
    for g, f in b['faces']:
        if g == name:
            s.update(f)
    return np.array(sorted(s))

def fit_sphere(P):
    c = P.mean(0)
    return c, np.linalg.norm(P - c, axis=1).mean()

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

def radial_scale(V, c, s, r0, r1, mask=None, axes=(1, 1, 1)):
    d = V - c
    r = np.linalg.norm(d, axis=1)
    w = 1 - smoothstep(r0, r1, r)
    if mask is not None:
        w = w * mask
    f = 1 + (np.array(axes) * (s - 1))[None, :] * w[:, None]
    return c + d * f

def build(cfg):
    """Return dict with blender-space verts for the whole base mesh + landmarks."""
    b = base()
    t = mhbase.macro_targets(**cfg['macro'])
    t.update(cfg.get('targets', {}))
    V = to_blender(np.array(mhbase.apply_targets(b['verts'].tolist(), t)))
    eyes = {}
    for side, g in (('L', 'helper-l-eye'), ('R', 'helper-r-eye')):
        c, r = fit_sphere(V[group_idx(g)])
        eyes[side] = [c, r]
    # character left must be +X in blender (-Y forward, so left is +X)
    if eyes['L'][0][0] < 0:
        eyes['L'], eyes['R'] = eyes['R'], eyes['L']
    st = cfg.get('style', {})
    wh = np.clip(b['wh'], 0, 1)
    # --- head proportion: enlarge head relative to body about the neck top
    head_pts = V[wh > 0.99]
    pivot = np.array([0.0, head_pts[:, 1].mean(), head_pts[:, 2].min()])
    hs = st.get('head_scale', 1.3)
    whs = smoothstep(0.0, 1.0, wh + 0.6 * np.clip(b['wn'], 0, 1) * 0)  # head only
    V = pivot + (V - pivot) * (1 + (hs - 1) * whs[:, None])
    for s in eyes:
        eyes[s][0] = pivot + (eyes[s][0] - pivot) * hs
        eyes[s][1] *= hs
    # --- shorter, sturdier neck: drop the head onto the shoulders, widen the neck
    wn = np.clip(b['wn'], 0, 1)
    drop = st.get('neck_drop', 0.35) * (pivot[2] - V[wn > 0.5][:, 2].min())
    lift = np.clip(wh + wn * np.clip((V[:, 2] - V[wn > 0.5][:, 2].min()) / max(pivot[2] - V[wn > 0.5][:, 2].min(), 1e-6), 0, 1), 0, 1)
    V[:, 2] -= drop * lift
    pivot = pivot - np.array([0, 0, drop])
    for s in eyes:
        eyes[s][0] = eyes[s][0] - np.array([0, 0, drop])
    nc = V[wn > 0.5].mean(0)
    k = st.get('neck_widen', 1.3)
    fw = wn * (1 - wh)
    V[:, 0] = nc[0] + (V[:, 0] - nc[0]) * (1 + (k - 1) * fw)
    V[:, 1] = nc[1] + (V[:, 1] - nc[1]) * (1 + (k - 1) * fw)
    # --- eyes: extra radial enlargement around each eyeball
    es = st.get('eye_scale', 1.3)
    for s in eyes:
        c, r = eyes[s]
        V = radial_scale(V, c, es, r * 1.0, r * st.get('eye_falloff', 3.0), mask=wh)
        eyes[s][1] = r * es
    # --- rounder, fuller lower face (toy proportions): widen cheeks/jaw below the eyes
    ez = (eyes['L'][0][2] + eyes['R'][0][2]) / 2; rE = eyes['L'][1]
    cw = st.get('cheek_widen', 1.12)
    f = wh * smoothstep(ez + 0.5 * rE, ez - 1.5 * rE, V[:, 2]) * (1 - 0.5 * smoothstep(ez - 3.5 * rE, ez - 5.5 * rE, V[:, 2]))
    V[:, 0] = V[:, 0] * (1 + (cw - 1) * f)
    return dict(V=V, eyes=eyes, pivot=pivot, wh=wh)

def edges(faces):
    I, J = [], []
    for f in faces:
        for a, b_ in zip(f, f[1:] + f[:1]):
            I += [a, b_]; J += [b_, a]
    E = np.unique(np.array([I, J]).T, axis=0)
    return E[:, 0], E[:, 1]

def laplacian(V, E, strength, iters=10):
    """Taubin smoothing (lambda/mu) with per-vertex strength in [0,1]."""
    I, J = E
    n = len(V)
    deg = np.bincount(I, minlength=n).astype(float)
    ok = deg > 0
    V = V.copy()
    s = strength[:, None] * ok[:, None]
    for it in range(iters):
        for lam in (0.5, -0.53):
            acc = np.zeros_like(V)
            np.add.at(acc, I, V[J])
            avg = acc / np.maximum(deg, 1)[:, None]
            V = V + lam * s * (avg - V)
    return V

def vnormals(V, faces):
    N = np.zeros_like(V)
    for f in faces:
        p = V[f]
        n = np.cross(p[1] - p[0], p[-1] - p[0])
        if len(f) == 4:
            n = n + np.cross(p[2] - p[1], p[0] - p[1]) * 0 + np.cross(p[3] - p[2], p[1] - p[2])
        N[f] += n
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)
