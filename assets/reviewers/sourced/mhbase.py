"""Load the MakeHuman CC0 base mesh + CC0 targets/weights (pure python, no bpy)."""
import gzip, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
VENDOR = os.path.join(HERE, 'vendor', 'makehuman')
TARGET_DIR = os.environ.get('MH_TARGETS', os.path.join(VENDOR, 'targets'))

def load_obj():
    verts, faces = [], []
    group = None
    with gzip.open(os.path.join(VENDOR, 'base.obj.gz'), 'rt') as f:
        for l in f:
            if l.startswith('v '):
                verts.append([float(x) for x in l.split()[1:4]])
            elif l.startswith('g '):
                group = l.split()[1]
            elif l.startswith('f '):
                idx = [int(t.split('/')[0]) - 1 for t in l.split()[1:]]
                faces.append((group, idx))
    return verts, faces

def load_weights():
    with gzip.open(os.path.join(VENDOR, 'default_weights.mhw.gz'), 'rt') as f:
        return json.load(f)['weights']

_tcache = {}
def load_target(name):
    if name in _tcache:
        return _tcache[name]
    p = os.path.join(TARGET_DIR, name + '.target')
    if not os.path.exists(p):
        p += '.gz'
    op = gzip.open if p.endswith('.gz') else open
    d = {}
    with op(p, 'rt') as f:
        for l in f:
            if l.startswith('#') or not l.strip():
                continue
            a = l.split()
            d[int(a[0])] = (float(a[1]), float(a[2]), float(a[3]))
    _tcache[name] = d
    if os.environ.get('MH_LOG_TARGETS'):
        with open(os.environ['MH_LOG_TARGETS'], 'a') as lf:
            lf.write(name + '\n')
    return d

def apply_targets(verts, targets):
    out = [list(v) for v in verts]
    for name, w in targets.items():
        if abs(w) < 1e-6:
            continue
        for i, (dx, dy, dz) in load_target(name).items():
            out[i][0] += dx * w; out[i][1] += dy * w; out[i][2] += dz * w
    return out

def macro_targets(gender, age, ethnic, muscle=0.5, weight=0.5):
    """MakeHuman macro-modifier weighting. gender 0=female..1=male, age in
    {'baby','child','young','old'} weights dict, ethnic dict african/asian/caucasian."""
    t = {}
    gw = {'female': 1 - gender, 'male': gender}
    for g, gv in gw.items():
        for a, av in age.items():
            for e, ev in ethnic.items():
                t['macrodetails/%s-%s-%s' % (e, g, a)] = t.get('macrodetails/%s-%s-%s' % (e, g, a), 0) + gv * av * ev
            # universal muscle/weight (average only + blend)
            mw = {'averagemuscle': 1.0}
            ww = {'averageweight': 1.0}
            if weight > 0.5: ww = {'averageweight': 1 - (weight - .5) * 2, 'maxweight': (weight - .5) * 2}
            elif weight < 0.5: ww = {'averageweight': weight * 2, 'minweight': 1 - weight * 2}
            if muscle > 0.5: mw = {'averagemuscle': 1 - (muscle - .5) * 2, 'maxmuscle': (muscle - .5) * 2}
            elif muscle < 0.5: mw = {'averagemuscle': muscle * 2, 'minmuscle': 1 - muscle * 2}
            for m, mv in mw.items():
                for wn, wv in ww.items():
                    k = 'macrodetails/universal-%s-%s-%s-%s' % (g, a, m, wn)
                    t[k] = t.get(k, 0) + gv * av * mv * wv
    return t
