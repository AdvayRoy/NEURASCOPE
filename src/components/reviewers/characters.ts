import * as THREE from "three";
import type { CohortId } from "@/lib/cortex/params";

/**
 * Procedural stylised reviewer rigs. One shared skeleton (body → neck → head → eyes/lids/brows) and one set of
 * shared geometries; the four variants differ only in proportions, palette, hair and accessories.
 * Units: 1 = slot height. The rig origin is the slot centre.
 */

export interface ReviewerRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  eyes: THREE.Group[];
  pupils: THREE.Group[];
  brows: THREE.Mesh[];
  materials: THREE.MeshStandardMaterial[];
  baseColors: THREE.Color[];
  planes: THREE.Plane[];
  dispose: () => void;
}

export const HEAD_Y = 0.02;

export const REVIEWER_ACCENT: Record<CohortId, string> = {
  cold: "#e0894f",
  intent: "#6f9cff",
  visual: "#a07cf0",
  enthusiast: "#e2c060",
};

interface Variant {
  skin: string;
  cloth: string;
  hair: string;
  iris: string;
  lip: string;
  head: [number, number, number];
  build: (k: Kit) => void;
}

interface Kit {
  head: THREE.Group;
  body: THREE.Group;
  mat: (color: string, opts?: { roughness?: number; metalness?: number }) => THREE.MeshStandardMaterial;
  add: (parent: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], s?: [number, number, number], r?: [number, number, number]) => THREE.Mesh;
  v: Variant;
}

let shared: Record<string, THREE.BufferGeometry> | null = null;
function geos() {
  shared ??= {
    sphere: new THREE.SphereGeometry(1, 32, 24),
    lowSphere: new THREE.SphereGeometry(1, 16, 12),
    dome: new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    capsule: new THREE.CapsuleGeometry(1, 1, 6, 12),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 24),
    ring: new THREE.TorusGeometry(1, 0.14, 10, 32),
    thinRing: new THREE.TorusGeometry(1, 0.07, 8, 40),
  };
  return shared;
}

/** Deterministic curl layout for the curly-hair variant (fixed table, not random). */
const CURLS: [number, number, number, number][] = [
  [0, 1.02, 0.1, 0.42], [0.42, 0.95, 0.22, 0.38], [-0.44, 0.94, 0.24, 0.38], [0.75, 0.7, 0.05, 0.36], [-0.78, 0.68, 0.06, 0.36],
  [0.2, 0.95, 0.5, 0.34], [-0.22, 0.96, 0.5, 0.34], [0.55, 0.78, 0.55, 0.3], [-0.55, 0.78, 0.55, 0.3], [0, 0.88, -0.45, 0.46],
  [0.62, 0.62, -0.42, 0.4], [-0.62, 0.62, -0.42, 0.4], [0.86, 0.35, -0.25, 0.32], [-0.86, 0.35, -0.25, 0.32], [0, 0.5, -0.8, 0.44],
];

const VARIANTS: Record<CohortId, Variant> = {
  cold: {
    skin: "#e9b48f", cloth: "#2b3350", hair: "#6a3a22", iris: "#3b2618", lip: "#b86e5c", head: [0.9, 1, 0.94],
    build: ({ head, add, mat, v }) => {
      const h = mat(v.hair, { roughness: 0.9 });
      for (const [x, y, z, r] of CURLS) add(head, geos().sphere, h, [x, y, z], [r, r, r]);
    },
  },
  intent: {
    skin: "#c98b64", cloth: "#e27bb0", hair: "#2a1d19", iris: "#2a1a12", lip: "#9c5048", head: [0.86, 1.04, 0.92],
    build: ({ head, add, mat, v }) => {
      const h = mat(v.hair, { roughness: 0.8 });
      add(head, geos().dome, h, [0, 0.08, -0.04], [1.07, 1.02, 1.06], [-0.18, 0, 0]);
      add(head, geos().sphere, h, [0, -0.45, -0.46], [1.02, 1.35, 0.55]);
      add(head, geos().sphere, h, [0.84, -0.5, 0.02], [0.3, 1.05, 0.5]);
      add(head, geos().sphere, h, [-0.84, -0.5, 0.02], [0.3, 1.05, 0.5]);
      const gold = mat("#d9a53f", { roughness: 0.35, metalness: 0.7 });
      add(head, geos().ring, gold, [0.94, -0.42, 0.12], [0.11, 0.11, 0.11], [0, Math.PI / 2, 0]);
      add(head, geos().ring, gold, [-0.94, -0.42, 0.12], [0.11, 0.11, 0.11], [0, Math.PI / 2, 0]);
    },
  },
  visual: {
    skin: "#a06a47", cloth: "#7b4fd0", hair: "#1c1512", iris: "#1d120c", lip: "#6e3a2e", head: [0.92, 0.98, 0.94],
    build: ({ head, body, add, mat, v }) => {
      const cap = mat("#6a4fe0", { roughness: 0.75 });
      add(head, geos().dome, cap, [0, 0.16, -0.02], [1.05, 0.95, 1.05], [-0.12, 0, 0]);
      add(head, geos().cylinder, cap, [0, 0.3, 0.86], [0.62, 0.05, 0.48], [0.2, 0, 0]);
      add(head, geos().lowSphere, mat("#ffffff", { roughness: 0.6 }), [0, 1.08, 0.02], [0.07, 0.05, 0.07]);
      const hair = mat(v.hair, { roughness: 0.9 });
      add(head, geos().sphere, hair, [0.82, 0.02, -0.18], [0.22, 0.4, 0.5]);
      add(head, geos().sphere, hair, [-0.82, 0.02, -0.18], [0.22, 0.4, 0.5]);
      const frame = mat("#e9e3d6", { roughness: 0.5 });
      add(head, geos().thinRing, frame, [0.36, 0.06, 0.96], [0.25, 0.25, 0.25]);
      add(head, geos().thinRing, frame, [-0.36, 0.06, 0.96], [0.25, 0.25, 0.25]);
      add(head, geos().capsule, frame, [0, 0.1, 1.0], [0.025, 0.1, 0.025], [0, 0, Math.PI / 2]);
      add(body, geos().ring, mat("#6a44bd", { roughness: 0.9 }), [0, 0.14, -0.02], [0.2, 0.2, 0.26], [Math.PI / 2 - 0.2, 0, 0]);
    },
  },
  enthusiast: {
    skin: "#b98158", cloth: "#f3f1ec", hair: "#1e1714", iris: "#24170f", lip: "#7e4636", head: [0.9, 1.02, 0.94],
    build: ({ head, body, add, mat, v }) => {
      const white = mat("#f6f4ef", { roughness: 0.88 });
      add(head, geos().dome, white, [0, 0.06, -0.04], [1.12, 1.12, 1.1], [-0.08, 0, 0]);
      add(head, geos().sphere, white, [0.9, -0.55, -0.12], [0.36, 1.1, 0.72]);
      add(head, geos().sphere, white, [-0.9, -0.55, -0.12], [0.36, 1.1, 0.72]);
      add(head, geos().sphere, white, [0, -0.6, -0.6], [1.1, 1.25, 0.55]);
      add(head, geos().ring, mat("#1b1b1d", { roughness: 0.6 }), [0, 0.62, -0.06], [0.92, 0.92, 0.92], [Math.PI / 2 - 0.16, 0, 0]);
      const beard = mat(v.hair, { roughness: 0.95 });
      add(head, geos().sphere, beard, [0, -0.66, 0.42], [0.62, 0.36, 0.46]);
      add(head, geos().capsule, beard, [0, -0.25, 0.9], [0.06, 0.18, 0.06], [0, 0, Math.PI / 2]);
      add(body, geos().cylinder, mat("#ebe8e1", { roughness: 0.85 }), [0, 0.13, 0.02], [0.09, 0.07, 0.09]);
    },
  },
};

export function buildReviewer(id: CohortId): ReviewerRig {
  const v = VARIANTS[id];
  const g = geos();
  const planes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0)];
  const materials: THREE.MeshStandardMaterial[] = [];
  const mat: Kit["mat"] = (color, o) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: o?.roughness ?? 0.82, metalness: o?.metalness ?? 0, clippingPlanes: planes });
    materials.push(m);
    return m;
  };
  const add: Kit["add"] = (parent, geo, m, p, s = [1, 1, 1], r = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(...p);
    mesh.scale.set(...s);
    mesh.rotation.set(...r);
    parent.add(mesh);
    return mesh;
  };

  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.set(0, -0.5, 0);
  root.add(body);
  const skin = mat(v.skin, { roughness: 0.7 });
  add(body, g.sphere, mat(v.cloth, { roughness: 0.9 }), [0, -0.08, 0], [0.5, 0.28, 0.3]);
  add(body, g.cylinder, skin, [0, 0.24, 0], [0.09, 0.2, 0.09]);

  const head = new THREE.Group();
  head.position.set(0, HEAD_Y, 0.02);
  head.scale.setScalar(0.32);
  root.add(head);
  add(head, g.sphere, skin, [0, 0, 0], v.head);
  add(head, g.sphere, skin, [0.88 * v.head[0], -0.02, 0], [0.16, 0.24, 0.12]);
  add(head, g.sphere, skin, [-0.88 * v.head[0], -0.02, 0], [0.16, 0.24, 0.12]);
  add(head, g.sphere, mat(new THREE.Color(v.skin).multiplyScalar(0.92).getStyle(), { roughness: 0.7 }), [0, -0.12, 0.93], [0.11, 0.13, 0.1]);
  add(head, g.capsule, mat(v.lip, { roughness: 0.7 }), [0, -0.4, 0.86], [0.03, 0.1, 0.03], [0, 0, Math.PI / 2]);

  const white = mat("#fbfaf6", { roughness: 0.4 });
  const iris = mat(v.iris, { roughness: 0.35 });
  const glint = new THREE.MeshBasicMaterial({ color: "#ffffff", clippingPlanes: planes });
  const eyes: THREE.Group[] = [];
  const pupils: THREE.Group[] = [];
  const brows: THREE.Mesh[] = [];
  const browMat = mat(id === "enthusiast" || id === "visual" || id === "intent" ? v.hair : "#4e2a18", { roughness: 0.9 });
  for (const side of [1, -1]) {
    const eye = new THREE.Group();
    eye.position.set(0.34 * side, 0.08, 0.8);
    head.add(eye);
    add(eye, g.sphere, white, [0, 0, 0], [0.2, 0.22, 0.12]);
    const pupil = new THREE.Group();
    pupil.position.set(0, 0, 0.1);
    eye.add(pupil);
    add(pupil, g.sphere, iris, [0, 0, 0], [0.13, 0.14, 0.05]);
    add(pupil, g.lowSphere, glint, [0.04, 0.05, 0.05], [0.035, 0.035, 0.02]);
    eyes.push(eye);
    pupils.push(pupil);
    brows.push(add(head, g.capsule, browMat, [0.34 * side, 0.4, 0.86], [0.045, 0.16, 0.045], [0, 0, Math.PI / 2 - 0.12 * side]));
  }
  v.build({ head, body, mat, add, v });
  return {
    root,
    body,
    head,
    eyes,
    pupils,
    brows,
    materials,
    baseColors: materials.map((m) => m.color.clone()),
    planes,
    dispose: () => {
      for (const m of materials) m.dispose();
      glint.dispose();
    },
  };
}
