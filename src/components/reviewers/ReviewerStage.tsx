"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useLab } from "@/lib/state/store";
import { hazardReference, reviewerState } from "./reviewerState";

let headPromise: Promise<THREE.BufferGeometry> | null = null;

/** Shared head geometry (Lee Perry-Smith scan, CC BY 3.0), centred and normalised to unit height. */
function loadHead() {
  headPromise ??= new GLTFLoader()
    .loadAsync("/models/reviewer.glb")
    .then((g) => {
      let geo: THREE.BufferGeometry | null = null;
      g.scene.traverse((o) => {
        if (!geo && (o as THREE.Mesh).isMesh) geo = (o as THREE.Mesh).geometry;
      });
      if (!geo) throw new Error("Reviewer model has no mesh");
      const out = (geo as THREE.BufferGeometry).clone();
      out.deleteAttribute("uv");
      out.computeBoundingBox();
      const b = out.boundingBox!;
      const c = b.getCenter(new THREE.Vector3());
      out.translate(-c.x, -c.y, -c.z);
      out.scale(1 / (b.max.y - b.min.y), 1 / (b.max.y - b.min.y), 1 / (b.max.y - b.min.y));
      return out;
    })
    .catch((e: unknown) => {
      headPromise = null;
      throw e;
    });
  return headPromise;
}

function createReviewerMaterial() {
  const uniforms = { uRim: { value: 0.5 }, uFracture: { value: 0 }, uTension: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({ color: "#d9d3c7", roughness: 0.62, metalness: 0, transparent: true, opacity: 1 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRN;\nvarying vec3 vRV;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvRN = normalize(normalMatrix * normal);\nvRV = normalize(-(modelViewMatrix * vec4(position,1.0)).xyz);",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uRim; uniform float uFracture; uniform float uTension;\nvarying vec3 vRN; varying vec3 vRV;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float fr = pow(1.0 - clamp(dot(normalize(vRN), normalize(vRV)), 0.0, 1.0), mix(2.6, 1.6, uTension));
vec3 rimCol = mix(vec3(0.56, 0.70, 1.0), vec3(1.0, 0.48, 0.27), uFracture);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.82, uTension * 0.5);
diffuseColor.rgb += rimCol * fr * uRim;`,
      );
  };
  return { material: mat, uniforms };
}

const VIEW_YAW = -0.32;
const VIEW_PITCH = 0.06;

function Reviewer({ geometry, cohort, slot }: { geometry: THREE.BufferGeometry; cohort: number; slot: RefObject<HTMLDivElement | null> }) {
  const { material, uniforms } = useMemo(() => createReviewerMaterial(), []);
  const gaze = useMemo(() => new THREE.MeshBasicMaterial({ color: "#8fb3ff", transparent: true, opacity: 0, depthWrite: false }), []);
  const place = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const ray = useRef<THREE.Mesh>(null);
  const run = useLab((s) => s.run);
  const cf = useLab((s) => (s.activeCf ? s.counterfactuals[s.activeCf] : null));
  const src = cf?.run ?? run;
  const base = useMemo(() => (src ? hazardReference(src) : null), [src]);
  useFrame((_, dt) => {
    const g = head.current;
    const p = place.current;
    const el = slot.current;
    if (!g || !p || !el || !src || !base) return;
    const c = gl.domElement.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    p.visible = b.width > 0;
    p.position.set(b.left + b.width / 2 - (c.left + c.width / 2), c.top + c.height / 2 - (b.top + b.height / 2) - b.height * 0.04, 0);
    p.scale.setScalar(b.height * 0.92);
    const t = useLab.getState().time;
    const r = reviewerState(src, cohort, t, base);
    const disengage = Math.min(1, 0.6 * r.withdrawal + 0.7 * r.fracture);
    const instability = (1 - r.attention) * 0.05 * Math.sin(t * 1.7 + cohort * 2.1);
    const yaw = VIEW_YAW - 0.6 * disengage + instability;
    const pitch = VIEW_PITCH + 0.2 * disengage - 0.12 * r.orienting * r.attention;
    const lean = 0.1 * (r.attention - 0.5) - 0.14 * disengage + 0.03 * r.orienting;
    const a = 1 - Math.exp(-dt * 8);
    g.rotation.y += (yaw - g.rotation.y) * a;
    g.rotation.x += (pitch - g.rotation.x) * a;
    g.position.y += (-0.04 * lean - g.position.y) * a;
    g.rotation.z += (-0.08 * disengage - g.rotation.z) * a;
    g.position.z += (lean - g.position.z) * a;
    material.opacity += (0.28 + 0.72 * r.survival - material.opacity) * a;
    uniforms.uRim.value += (0.18 + 0.5 * r.attention * r.survival - uniforms.uRim.value) * a;
    uniforms.uFracture.value += (r.fracture - uniforms.uFracture.value) * a;
    uniforms.uTension.value += (r.tension - uniforms.uTension.value) * a;
    gaze.opacity += (0.55 * r.attention * r.survival * (1 - disengage) - gaze.opacity) * a;
    if (ray.current) ray.current.scale.y += (0.3 + 0.7 * r.attention - ray.current.scale.y) * a;
  });

  return (
    <group ref={place} visible={false}>
      <group ref={head}>
        <mesh geometry={geometry} material={material} />
        <mesh ref={ray} material={gaze} position={[0, 0.1, 0.62]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.5, 6, 1, true]} />
        </mesh>
      </group>
    </group>
  );
}

/** One shared WebGL canvas and scene; each reviewer head is placed over its DOM slot (orthographic, 1 unit = 1 CSS px). */
export function ReviewerStage({ slots }: { slots: RefObject<HTMLDivElement | null>[] }) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    loadHead().then(setGeometry).catch(() => setFailed(true));
  }, []);
  if (failed) return null;
  return (
    <Canvas
      className="pointer-events-none"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}
      dpr={[1, 2]}
      orthographic
      camera={{ position: [0, 0, 400], zoom: 1, near: 1, far: 1000 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[200, 250, 300]} intensity={1.6} color="#fff8ee" />
      <directionalLight position={[-300, 100, -200]} intensity={0.9} color="#c9d6ff" />
      {geometry && slots.map((s, i) => <Reviewer key={i} geometry={geometry} cohort={i} slot={s} />)}
    </Canvas>
  );
}
