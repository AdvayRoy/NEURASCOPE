"""Per-character configuration: MakeHuman CC0 targets + stylisation parameters."""

# Shared stylisation (toy/editorial proportions) applied to every reviewer.
STYLE_TARGETS = {
    'eyes/l-eye-scale-incr': 1, 'eyes/r-eye-scale-incr': 1,
    'eyes/l-eye-height1-incr': 1, 'eyes/r-eye-height1-incr': 1,
    'eyes/l-eye-height2-incr': 1, 'eyes/r-eye-height2-incr': 1,
    'eyes/l-eye-height3-incr': 1, 'eyes/r-eye-height3-incr': 1,
    'eyes/l-eye-bag-decr': 1, 'eyes/r-eye-bag-decr': 1,
    'nose/nose-scale-horiz-decr': .6, 'nose/nose-scale-vert-decr': .6, 'nose/nose-scale-depth-decr': .6,
    'nose/nose-volume-decr': .5,
    'mouth/mouth-scale-horiz-decr': .6, 'mouth/mouth-lowerlip-volume-decr': .6, 'mouth/mouth-upperlip-volume-decr': .6,
    'head/head-age-decr': 1,
    'cheek/l-cheek-volume-incr': .5, 'cheek/r-cheek-volume-incr': .5,
}

def T(**kw):
    d = dict(STYLE_TARGETS)
    for k, v in kw.items():
        d[k.replace('__', '/').replace('_', '-')] = d.get(k.replace('__', '/').replace('_', '-'), 0) + v
    return d

CHARS = {
    'cold': dict(
        head=dict(macro=dict(gender=0.9, age={'young': .5, 'child': .5},
                             ethnic={'caucasian': .75, 'african': .1, 'asian': .15}),
                  targets=T(head__head_round=1.0, chin__chin_width_decr=.4, chin__chin_prominent_decr=.5),
                  style=dict(head_scale=1.5, eye_scale=1.50)),
        skin=(224, 160, 118), lip=(206, 132, 104), iris=(70, 40, 22), brow_col=(88, 52, 30),
        brow=dict(h=1.20, arch=0.25, tilt=0.1, thick=0.30, len=2.15),
        outfit=dict(kind='hoodie', col=(38, 44, 70), inner=None),
        hair=dict(kind='curly', col=(112, 62, 34)),
    ),
    'intent': dict(
        head=dict(macro=dict(gender=0.0, age={'young': .55, 'child': .45},
                             ethnic={'caucasian': .6, 'african': .15, 'asian': .25}),
                  targets=T(head__head_oval=1.0, head__head_invertedtriangular=.4,
                            chin__chin_width_decr=.6, chin__chin_height_incr=.2,
                            cheek__l_cheek_bones_incr=.5, cheek__r_cheek_bones_incr=.5,
                            **{'mouth__mouth-lowerlip-volume-incr': .3}),
                  style=dict(head_scale=1.5, eye_scale=1.48)),
        skin=(206, 142, 104), lip=(190, 108, 92), iris=(60, 34, 20), brow_col=(40, 26, 20),
        brow=dict(h=1.25, arch=0.35, tilt=0.18, thick=0.22, len=2.2),
        outfit=dict(kind='top', col=(226, 104, 170)),
        hair=dict(kind='long', col=(46, 30, 26)),
        earrings=dict(col=(214, 168, 70)),
    ),
    'visual': dict(
        head=dict(macro=dict(gender=0.85, age={'young': .6, 'child': .4},
                             ethnic={'african': .7, 'caucasian': .15, 'asian': .15}),
                  targets=T(head__head_round=.5, head__head_scale_horiz_incr=.25, chin__chin_width_incr=.3,
                            nose__nose_flaring_incr=.3, chin__chin_width_decr=.2),
                  style=dict(head_scale=1.5, eye_scale=1.46)),
        skin=(150, 94, 62), lip=(128, 74, 56), iris=(44, 26, 16), brow_col=(30, 20, 16),
        brow=dict(h=1.17, arch=0.2, tilt=0.05, thick=0.30, len=2.1),
        outfit=dict(kind='hoodie', col=(122, 62, 190), inner=(236, 128, 52)),
        hair=dict(kind='cap', col=(30, 22, 18), cap=(104, 72, 226)),
        glasses=dict(col=(226, 214, 190)),
    ),
    'enthusiast': dict(
        head=dict(macro=dict(gender=1.0, age={'young': .7, 'child': .3},
                             ethnic={'caucasian': .55, 'asian': .15, 'african': .3}),
                  targets=T(head__head_square=.7, head__head_scale_horiz_incr=.2, chin__chin_width_incr=.3,
                            chin__chin_prominent_incr=.2, **{'nose/nose-scale-vert-decr': -.3,
                                                              'nose/nose-scale-depth-decr': -.2}),
                  style=dict(head_scale=1.5, eye_scale=1.42)),
        skin=(206, 146, 102), lip=(176, 106, 82), iris=(48, 28, 16), brow_col=(28, 20, 16),
        brow=dict(h=1.13, arch=0.18, tilt=0.08, thick=0.36, len=2.15),
        outfit=dict(kind='kandura', col=(244, 242, 236)),
        hair=dict(kind='ghutra', col=(246, 244, 240), agal=(22, 20, 22)),
        beard=dict(col=(48, 34, 27)),
    ),
}
