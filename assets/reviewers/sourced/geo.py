"""Small numpy geometry helpers: swept tubes, rotations, masks."""
import numpy as np

def norm(v):
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return v / np.maximum(n, 1e-12)

def rot_axis(P, c, axis, ang):
    """Rotate points P about axis through c by per-point angle(s) ang (radians)."""
    k = norm(np.asarray(axis, float))
    d = P - c
    ang = np.broadcast_to(np.asarray(ang, float), (len(P),))
    cs, sn = np.cos(ang)[:, None], np.sin(ang)[:, None]
    kd = (d @ k)[:, None]
    return c + d * cs + np.cross(k, d) * sn + k[None] * kd * (1 - cs)

def catmull(pts, n):
    """Resample a polyline through control pts with a Catmull-Rom spline."""
    P = np.asarray(pts, float)
    P = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
    out = []
    segs = len(P) - 3
    for i in range(n):
        t = i / (n - 1) * segs
        j = min(int(t), segs - 1); u = t - j
        p0, p1, p2, p3 = P[j:j + 4]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u
                          + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return np.array(out)

def sweep(path, rad, nseg=10, up=None, rad2=None, twist=0.0, cap=True, closed=False):
    """Tube along path. rad: (N,) radius (or width), rad2: (N,) second radius
    (ellipse along the 'up' binormal). Returns verts, faces (quads/tris)."""
    path = np.asarray(path, float); N = len(path)
    rad = np.broadcast_to(np.asarray(rad, float), (N,))
    rad2 = rad if rad2 is None else np.broadcast_to(np.asarray(rad2, float), (N,))
    T = np.gradient(path, axis=0) if not closed else (np.roll(path, -1, 0) - np.roll(path, 1, 0))
    T = norm(T)
    if up is None:
        up = np.array([0, 0, 1.0]) if abs(T[0][2]) < 0.9 else np.array([1.0, 0, 0])
    up = np.asarray(up, float)
    ups = np.broadcast_to(up, (N, 3)) if up.ndim == 1 else up
    V = []
    for i in range(N):
        b = norm(ups[i] - T[i] * (ups[i] @ T[i]))
        n = np.cross(b, T[i])
        for s in range(nseg):
            a = 2 * np.pi * s / nseg + twist * i / max(N - 1, 1)
            V.append(path[i] + n * np.cos(a) * rad[i] + b * np.sin(a) * rad2[i])
    F = []
    rows = N if closed else N - 1
    for i in range(rows):
        i2 = (i + 1) % N
        for s in range(nseg):
            s2 = (s + 1) % nseg
            F.append([i * nseg + s, i * nseg + s2, i2 * nseg + s2, i2 * nseg + s])
    V = list(V)
    if cap and not closed:
        c0 = len(V); V.append(path[0] - T[0] * rad[0] * 0.0)
        c1 = len(V); V.append(path[-1])
        for s in range(nseg):
            s2 = (s + 1) % nseg
            F.append([c0, s2, s])
            F.append([c1, (N - 1) * nseg + s, (N - 1) * nseg + s2])
    return np.array(V), F

def torus(c, R, r, nu=32, nv=8, axis=(0, 0, 1)):
    axis = norm(np.asarray(axis, float))
    a = np.array([1.0, 0, 0]) if abs(axis[0]) < 0.9 else np.array([0, 1.0, 0])
    u = norm(np.cross(axis, a)); w = np.cross(axis, u)
    ang = np.linspace(0, 2 * np.pi, nu, endpoint=False)
    path = c + R * (np.cos(ang)[:, None] * u + np.sin(ang)[:, None] * w)
    return sweep(path, r, nv, up=axis, closed=True)

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)
