"""Check public/models/reviewers.glb against the integration contract. Run: python3 validate.py"""
import json
import os
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
GLB = os.path.join(HERE, "..", "..", "..", "public", "models", "reviewers.glb")
IDS = ["cold", "intent", "visual", "enthusiast"]
BONES = {"Chest", "Neck", "Head", "Eye_L", "Eye_R"}
MORPHS = {"blink_L", "blink_R", "wide", "browDown", "browUp", "mouthOpen", "smile"}

data = open(GLB, "rb").read()
size = len(data)
jlen = struct.unpack_from("<I", data, 12)[0]
g = json.loads(data[20:20 + jlen])
nodes = g["nodes"]
scene = g["scenes"][g.get("scene", 0)]
top = [nodes[i].get("name") for i in scene["nodes"]]
ok = True


def fail(msg):
    global ok
    ok = False
    print("FAIL", msg)


def subtree(i):
    out = [i]
    for c in nodes[i].get("children", []):
        out += subtree(c)
    return out


print("GLB bytes", size, "(%.2f MB)" % (size / 1e6))
if size > 3e6:
    fail("GLB > 3 MB")
if "KHR_draco_mesh_compression" in g.get("extensionsUsed", []):
    fail("draco used")
print("top-level nodes", top)
if sorted(top) != sorted("reviewer_" + c for c in IDS):
    fail("top-level node names")
for m in g.get("materials", []):
    pbr = m.get("pbrMetallicRoughness", {})
    if pbr.get("metallicFactor", 1.0) != 0.0:
        fail("metalness != 0 on " + m["name"])
for ni in scene["nodes"]:
    root = nodes[ni]
    name = root["name"]
    if any(abs(v) > 1e-6 for v in root.get("translation", [0, 0, 0])):
        fail(name + " not at origin")
    tris, ymin, ymax, xmin, xmax, zmax = 0, 1e9, -1e9, 1e9, -1e9, -1e9
    morphs, joints = set(), set()
    for i in subtree(ni):
        n = nodes[i]
        if "skin" in n:
            joints |= {nodes[j]["name"] for j in g["skins"][n["skin"]]["joints"]}
        if "mesh" in n:
            me = g["meshes"][n["mesh"]]
            morphs |= set(me.get("extras", {}).get("targetNames", []))
            for p in me["primitives"]:
                tris += g["accessors"][p["indices"]]["count"] // 3
                a = g["accessors"][p["attributes"]["POSITION"]]
                ymin, ymax = min(ymin, a["min"][1]), max(ymax, a["max"][1])
                xmin, xmax = min(xmin, a["min"][0]), max(xmax, a["max"][0])
                zmax = max(zmax, a["max"][2])
    print(f"{name}: tris={tris} y=[{ymin:.3f},{ymax:.3f}] x=[{xmin:.3f},{xmax:.3f}] zmax={zmax:.3f}")
    print("   bones", sorted(joints), "morphs", sorted(morphs))
    if tris > 12000:
        fail(name + " > 12k tris")
    if not BONES <= joints:
        fail(name + " missing bones " + str(BONES - joints))
    if not MORPHS <= morphs:
        fail(name + " missing morphs " + str(MORPHS - morphs))
    if abs(ymin) > 0.02 or not 0.9 <= ymax <= 1.1:
        fail(name + " vertical extent")
print("OK" if ok else "FAILED")
sys.exit(0 if ok else 1)
