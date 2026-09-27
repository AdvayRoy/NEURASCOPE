"""Validate public/models/reviewers.glb against the R3F integration contract.

Run:  blender -b --factory-startup --python-exit-code 1 -P assets/reviewers/sculpt/validate.py
(or any Python with numpy: python3 assets/reviewers/sculpt/validate.py)
"""
import json
import os
import struct
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
GLB = os.path.normpath(os.path.join(HERE, "..", "..", "..", "public", "models", "reviewers.glb"))
IDS = ["cold", "intent", "visual", "enthusiast"]
PARENT = {"Neck": "Chest", "Head": "Neck", "Eye_L": "Head", "Eye_R": "Head"}
MORPHS = ["blink_L", "blink_R", "wide", "browDown", "browUp", "mouthOpen"]
MAX_TRIS, MAX_BYTES = 12000, 3_000_000

data = open(GLB, "rb").read()
jlen = struct.unpack_from("<I", data, 12)[0]
g = json.loads(data[20:20 + jlen])
bin_off = 20 + jlen + 8
nodes = g["nodes"]
errors = []


def check(cond, msg):
    if not cond:
        errors.append(msg)
        print("  FAIL", msg)


CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def view(bvi, byte_offset, count, ctype, n):
    bv = g["bufferViews"][bvi]
    dt = np.dtype(CT[ctype])
    off = bin_off + bv.get("byteOffset", 0) + byte_offset
    stride = bv.get("byteStride", dt.itemsize * n)
    raw = np.frombuffer(data, np.uint8, count=stride * (count - 1) + dt.itemsize * n, offset=off)
    out = np.lib.stride_tricks.as_strided(raw, (count, dt.itemsize * n), (stride, 1)).copy()
    return out.view(dt).reshape(count, n)


def acc(i):
    a = g["accessors"][i]
    n = NC[a["type"]]
    dt = np.dtype(CT[a["componentType"]])
    if "bufferView" not in a:
        arr = np.zeros((a["count"], n))
    else:
        arr = view(a["bufferView"], a.get("byteOffset", 0), a["count"], a["componentType"], n).astype(np.float64)
    if "sparse" in a:
        sp = a["sparse"]
        ix = view(sp["indices"]["bufferView"], sp["indices"].get("byteOffset", 0), sp["count"],
                  sp["indices"]["componentType"], 1)[:, 0].astype(int)
        arr[ix] = view(sp["values"]["bufferView"], sp["values"].get("byteOffset", 0), sp["count"],
                       a["componentType"], n)
    if a.get("normalized"):
        arr /= np.iinfo(dt).max
    return arr


def subtree(i):
    out = [i]
    for c in nodes[i].get("children", []):
        out += subtree(c)
    return out


print("GLB", GLB)
print("bytes", len(data), "(%.3f MB)" % (len(data) / 1e6))
check(len(data) <= MAX_BYTES, "GLB > 3 MB")
used = g.get("extensionsUsed", []) + g.get("extensionsRequired", [])
check(not any("draco" in e.lower() or "meshopt" in e.lower() for e in used), "compressed geometry extension used")
for im in g.get("images", []):
    print("  image", im.get("name"))
check(len(g.get("images", [])) == 0, "textures present (vertex colours expected)")
for m in g.get("materials", []):
    pbr = m.get("pbrMetallicRoughness", {})
    check(pbr.get("metallicFactor", 1.0) == 0.0, f"metalness != 0 on {m['name']}")
    r = pbr.get("roughnessFactor", 1.0)
    check(0.5 <= r <= 0.9, f"roughness {r} outside 0.5-0.9 on {m['name']}")

scene = g["scenes"][g.get("scene", 0)]
top = [nodes[i].get("name") for i in scene["nodes"]]
print("top-level", top)
check(sorted(top) == sorted("reviewer_" + c for c in IDS), "top-level node names")

for ni in scene["nodes"]:
    root = nodes[ni]
    name = root["name"]
    cid = name.replace("reviewer_", "")
    print(name)
    check(all(abs(v) < 1e-6 for v in root.get("translation", [0, 0, 0])), "root not at origin")
    check(all(abs(a - b) < 1e-6 for a, b in zip(root.get("rotation", [0, 0, 0, 1]), [0, 0, 0, 1])), "root rotated")
    check(all(abs(v - 1) < 1e-6 for v in root.get("scale", [1, 1, 1])), "root scaled")
    sub = subtree(ni)
    names = {nodes[i].get("name"): i for i in sub}
    for b, p in PARENT.items():
        check(b in names and p in names and names[b] in nodes[names[p]].get("children", []), f"bone {p} > {b}")
    tris, lo, hi = 0, np.full(3, 1e9), np.full(3, -1e9)
    pivots, faceP, faceD, moved = {}, [], [], {}
    for i in sub:
        n = nodes[i]
        if "mesh" not in n:
            continue
        check(all(abs(v) < 1e-6 for v in n.get("translation", [0, 0, 0])), f"{n['name']} offset")
        me = g["meshes"][n["mesh"]]
        skin = g["skins"][n["skin"]] if "skin" in n else None
        check(skin is not None, f"{n['name']} not skinned")
        jn = [nodes[j]["name"] for j in skin["joints"]]
        ibm = acc(skin["inverseBindMatrices"]).reshape(-1, 4, 4).transpose(0, 2, 1)
        for k, j in enumerate(jn):
            pivots[j] = np.linalg.inv(ibm[k])[:3, 3]
        tgt = me.get("extras", {}).get("targetNames", [])
        for p in me["primitives"]:
            tris += g["accessors"][p["indices"]]["count"] // 3
            P = acc(p["attributes"]["POSITION"])
            lo, hi = np.minimum(lo, P.min(0)), np.maximum(hi, P.max(0))
            J = acc(p["attributes"]["JOINTS_0"]).astype(int)
            W = acc(p["attributes"]["WEIGHTS_0"])
            dom = np.array(jn)[J[np.arange(len(J)), W.argmax(1)]]
            part = n["name"].split("_")[-1]
            if part == "eyes":
                check(set(dom) <= {"Eye_L", "Eye_R"} and W.max(1).min() > 0.999,
                      f"{n['name']}: eyes/catch-lights not rigid to Eye bones")
                for e in ("Eye_L", "Eye_R"):
                    pivots.setdefault("_c" + e, []).append(P[dom == e])
            if part == "hair":
                check(set(dom) == {"Head"} and W.max(1).min() > 0.999,
                      f"{n['name']}: hair/headwear/glasses/earrings not rigid to Head")
            if part == "face":
                faceP.append(P)
                faceD.append(dom)
                for t, mn in zip(p.get("targets", []), tgt):
                    d = np.linalg.norm(acc(t["POSITION"]), axis=1)
                    mv = moved.setdefault(mn, [0, 0.0])
                    mv[0] += int((d > 5e-4).sum())
                    mv[1] = max(mv[1], float(d.max()))
                check(all(m in tgt for m in MORPHS), f"face morphs {tgt}")
    for mn in MORPHS:
        cnt, mx = moved.get(mn, [0, 0.0])
        print(f"   morph {mn:9s} verts>0.5mm={cnt:5d} max={mx * 1000:.1f}mm")
        check(mx > 0.004, f"morph {mn} barely moves")
    print(f"   tris={tris} y=[{lo[1]:.3f},{hi[1]:.3f}] x=[{lo[0]:.3f},{hi[0]:.3f}] zmax={hi[2]:.3f}")
    check(tris <= MAX_TRIS, "tris > 12k")
    check(abs(lo[1]) <= 0.02, "bust bottom not at y=0")
    check(0.95 <= hi[1] <= 1.05, "head top not ~1.0 (<=1.05)")
    for e in ("Eye_L", "Eye_R"):
        c = np.concatenate(pivots["_c" + e])
        centre = (c.min(0) + c.max(0)) / 2
        off = np.linalg.norm(pivots[e] - centre)
        print(f"   {e} pivot {np.round(pivots[e], 3)} eyeball centre {np.round(centre, 3)} off={off * 1000:.1f}mm")
        check(off < 0.006, f"{e} pivot not at eyeball centre")
    check(pivots["Eye_L"][0] > pivots["Eye_R"][0], "Eye_L should be on +X (character's left)")
    P, dom = np.concatenate(faceP), np.concatenate(faceD)
    ey = pivots["Eye_L"][1]
    band = P[(np.abs(P[:, 1] - ey) < 0.03) & (dom == "Head")]
    hw = band[:, 0].max() - band[:, 0].min()
    print(f"   head width at eye line {hw:.3f}")
    check(0.5 <= hw <= 0.65, "head width outside 0.5-0.65")
    check(pivots["Head"][1] < ey, "Head pivot above eyes")

print("OK" if not errors else f"FAILED ({len(errors)})")
sys.exit(1 if errors else 0)
