// Builds public/models/cortex.bin from brainder.org Desikan-Killiany pial meshes (CC BY-SA 3.0).
// Usage: node scripts/build-brain.mjs <dir-with-objs>
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MeshoptSimplifier } from "meshoptimizer";

const SRC = process.argv[2] ?? "vendor/brain";
const OUT = "public/models/cortex.bin";
const TARGET_TRIS_PER_HEMI = 70000;
const TARGET_TRIS_SUB = 9000;

function parseObj(text) {
  const v = [];
  const f = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("v ")) {
      const [, x, y, z] = line.trim().split(/\s+/);
      v.push(+x, +y, +z);
    } else if (line.startsWith("f ")) {
      const p = line.trim().split(/\s+/).slice(1).map((t) => parseInt(t, 10) - 1);
      for (let i = 1; i + 1 < p.length; i++) f.push(p[0], p[i], p[i + 1]);
    }
  }
  return { v, f };
}

function buildPart(files, labelOf, targetTris) {
  const key = new Map();
  const pos = [];
  const label = [];
  const idx = [];
  for (const file of files) {
    const { v, f } = parseObj(readFileSync(join(SRC, file), "utf8"));
    const lab = labelOf(file);
    const remap = new Int32Array(v.length / 3);
    for (let i = 0; i < v.length / 3; i++) {
      const k = `${v[3 * i].toFixed(4)},${v[3 * i + 1].toFixed(4)},${v[3 * i + 2].toFixed(4)}`;
      let id = key.get(k);
      if (id === undefined) {
        id = pos.length / 3;
        key.set(k, id);
        // FreeSurfer RAS -> three.js (x right, y up, z toward viewer = posterior)
        pos.push(v[3 * i], v[3 * i + 2], -v[3 * i + 1]);
        label.push(lab);
      }
      remap[i] = id;
    }
    for (const i of f) idx.push(remap[i]);
  }
  const positions = new Float32Array(pos);
  const [simp] = MeshoptSimplifier.simplify(
    new Uint32Array(idx), positions, 3, targetTris * 3, 0.02, ["Prune"],
  );
  const used = new Int32Array(pos.length / 3).fill(-1);
  const outPos = [];
  const outLab = [];
  const outIdx = new Uint32Array(simp.length);
  for (let i = 0; i < simp.length; i++) {
    const o = simp[i];
    if (used[o] < 0) {
      used[o] = outPos.length / 3;
      outPos.push(pos[3 * o], pos[3 * o + 1], pos[3 * o + 2]);
      outLab.push(label[o]);
    }
    outIdx[i] = used[o];
  }
  return { positions: new Float32Array(outPos), labels: new Uint8Array(outLab), indices: outIdx };
}

await MeshoptSimplifier.ready;
const all = readdirSync(SRC).filter((f) => f.endsWith(".obj"));
const dkNames = [...new Set(all.filter((f) => f.includes(".pial.DK.")).map((f) => f.split(".pial.DK.")[1].replace(".obj", "")))].sort();
const regions = dkNames.flatMap((n) => [`lh.${n}`, `rh.${n}`]);
regions.push("cerebellum", "brainstem");
const regionId = (name) => regions.indexOf(name);

const parts = [
  { name: "lh", ...buildPart(all.filter((f) => f.startsWith("lh.pial.DK.")), (f) => regionId(`lh.${f.split(".pial.DK.")[1].replace(".obj", "")}`), TARGET_TRIS_PER_HEMI) },
  { name: "rh", ...buildPart(all.filter((f) => f.startsWith("rh.pial.DK.")), (f) => regionId(`rh.${f.split(".pial.DK.")[1].replace(".obj", "")}`), TARGET_TRIS_PER_HEMI) },
  { name: "sub", ...buildPart(all.filter((f) => f.startsWith("sub.")), (f) => regionId(f.includes("Cerebellum") ? "cerebellum" : "brainstem"), TARGET_TRIS_SUB) },
];

// Centre on cortex bounding box and scale to unit radius.
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (const p of parts.slice(0, 2)) for (let i = 0; i < p.positions.length; i++) {
  min[i % 3] = Math.min(min[i % 3], p.positions[i]);
  max[i % 3] = Math.max(max[i % 3], p.positions[i]);
}
const c = min.map((m, i) => (m + max[i]) / 2);
const s = 2 / Math.max(...max.map((m, i) => m - min[i]));

const header = { version: 1, regions, parts: [] };
const chunks = [];
let offset = 0;
const push = (arr) => {
  const pad = (4 - (offset % 4)) % 4;
  if (pad) { chunks.push(new Uint8Array(pad)); offset += pad; }
  const u8 = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  chunks.push(u8);
  const at = offset;
  offset += u8.byteLength;
  return at;
};
for (const p of parts) {
  const q = new Int16Array(p.positions.length);
  for (let i = 0; i < q.length; i++) q[i] = Math.round(((p.positions[i] - c[i % 3]) * s) * 16000);
  const vc = q.length / 3;
  const idx = vc < 65536 ? Uint16Array.from(p.indices) : p.indices;
  header.parts.push({
    name: p.name,
    vertexCount: vc,
    indexCount: idx.length,
    indexType: idx instanceof Uint16Array ? "u16" : "u32",
    positionScale: 1 / 16000,
    positions: push(q),
    labels: push(p.labels),
    indices: push(idx),
  });
  console.log(p.name, "verts", vc, "tris", idx.length / 3);
}
const hjson = new TextEncoder().encode(JSON.stringify(header));
const pre = new Uint8Array(8);
new DataView(pre.buffer).setUint32(0, 0x4e534358, true);
new DataView(pre.buffer).setUint32(4, hjson.byteLength, true);
const hpad = (4 - ((8 + hjson.byteLength) % 4)) % 4;
const out = Buffer.concat([pre, hjson, new Uint8Array(hpad), ...chunks]);
writeFileSync(OUT, out);
console.log("wrote", OUT, out.byteLength, "bytes", "regions", regions.length);
