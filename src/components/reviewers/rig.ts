import * as THREE from "three";
import type { CohortId } from "@/lib/cortex/params";

export const REVIEWER_ASSET = "/models/reviewers.glb";

export const REVIEWER_ACCENT: Record<CohortId, string> = {
  cold: "#e0894a",
  intent: "#6f95e8",
  visual: "#9a6bdc",
  enthusiast: "#e2c46a",
};

export const MORPHS = ["blink_L", "blink_R", "wide", "browDown", "browUp", "mouthOpen", "smile"] as const;
export type Morph = (typeof MORPHS)[number];

interface Joint {
  node: THREE.Object3D;
  rest: THREE.Quaternion;
}

export interface ReviewerRig {
  root: THREE.Object3D;
  chest: Joint | null;
  neck: Joint | null;
  head: Joint | null;
  eyeL: Joint | null;
  eyeR: Joint | null;
  morphs: { influences: number[]; idx: Partial<Record<Morph, number>> }[];
  materials: { mat: THREE.MeshStandardMaterial; base: THREE.Color }[];
  /** Framing centre and height of the bust in model units. */
  focus: THREE.Vector3;
  height: number;
  dispose(): void;
}

const baseName = (n: string) => n.replace(/(?:[._]\d+)+$/, "");

function joint(root: THREE.Object3D, name: string): Joint | null {
  let hit: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (!hit && baseName(o.name) === name) hit = o;
  });
  const node = hit as THREE.Object3D | null;
  return node ? { node, rest: node.quaternion.clone() } : null;
}

/** Binds one character subtree of the reviewer GLB to the named-bone / shape-key contract. Materials are cloned so presence can vary per reviewer. */
export function bindRig(src: THREE.Object3D): ReviewerRig {
  const root = src;
  const materials: ReviewerRig["materials"] = [];
  const morphs: ReviewerRig["morphs"] = [];
  const owned: THREE.Material[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.frustumCulled = false;
    const list = Array.isArray(m.material) ? m.material : [m.material];
    const cloned = list.map((mat) => {
      const c = mat.clone();
      owned.push(c);
      if ((c as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        const s = c as THREE.MeshStandardMaterial;
        materials.push({ mat: s, base: s.color.clone() });
      }
      return c;
    });
    m.material = Array.isArray(m.material) ? cloned : cloned[0];
    if (m.morphTargetDictionary && m.morphTargetInfluences) {
      const idx: Partial<Record<Morph, number>> = {};
      for (const k of MORPHS) if (m.morphTargetDictionary[k] !== undefined) idx[k] = m.morphTargetDictionary[k];
      if (Object.keys(idx).length) morphs.push({ influences: m.morphTargetInfluences, idx });
    }
  });
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const height = Math.max(0.2, size.y);
  const focus = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y + height * 0.55, (box.min.z + box.max.z) / 2);
  return {
    root,
    chest: joint(root, "Chest"),
    neck: joint(root, "Neck"),
    head: joint(root, "Head"),
    eyeL: joint(root, "Eye_L"),
    eyeR: joint(root, "Eye_R"),
    morphs,
    materials,
    focus,
    height,
    dispose: () => owned.forEach((m) => m.dispose()),
  };
}

const E = new THREE.Euler();
const Q = new THREE.Quaternion();
/** Applies an XYZ rotation offset on top of the joint's rest pose. */
export function pose(j: Joint | null, x: number, y: number, z = 0) {
  if (!j) return;
  E.set(x, y, z, "YXZ");
  j.node.quaternion.copy(j.rest).multiply(Q.setFromEuler(E));
}

export function setMorph(rig: ReviewerRig, k: Morph, v: number) {
  for (const m of rig.morphs) {
    const i = m.idx[k];
    if (i !== undefined) m.influences[i] = v;
  }
}
