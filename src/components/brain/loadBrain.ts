import * as THREE from "three";

export interface BrainAsset {
  regions: string[];
  parts: { name: string; geometry: THREE.BufferGeometry }[];
}

let cache: Promise<BrainAsset> | null = null;

interface Header {
  version: number;
  regions: string[];
  parts: { name: string; vertexCount: number; indexCount: number; indexType: "u16" | "u32"; positionScale: number; positions: number; labels: number; indices: number }[];
}

/** Loads the Desikan–Killiany brain (brainder.org meshes, CC BY-SA 3.0) packed by scripts/build-brain.mjs. */
export function loadBrain(): Promise<BrainAsset> {
  cache ??= fetch("/models/cortex.bin")
    .then((r) => r.arrayBuffer())
    .then((buf) => {
      const dv = new DataView(buf);
      if (dv.getUint32(0, true) !== 0x4e534358) throw new Error("Bad brain asset");
      const hlen = dv.getUint32(4, true);
      const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hlen))) as Header;
      const base = 8 + hlen + ((4 - ((8 + hlen) % 4)) % 4);
      const parts = header.parts.map((p) => {
        const q = new Int16Array(buf, base + p.positions, p.vertexCount * 3);
        const pos = new Float32Array(q.length);
        for (let i = 0; i < q.length; i++) pos[i] = q[i] * p.positionScale;
        const labels = new Uint8Array(buf, base + p.labels, p.vertexCount);
        const lab = new Float32Array(p.vertexCount);
        for (let i = 0; i < lab.length; i++) lab[i] = labels[i];
        const idx = p.indexType === "u16" ? new Uint16Array(buf, base + p.indices, p.indexCount) : new Uint32Array(buf, base + p.indices, p.indexCount);
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        g.setAttribute("region", new THREE.BufferAttribute(lab, 1));
        g.setIndex(new THREE.BufferAttribute(idx.slice(), 1));
        g.computeVertexNormals();
        g.computeBoundingSphere();
        return { name: p.name, geometry: g };
      });
      return { regions: header.regions, parts };
    });
  return cache;
}
