"use client";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { COHORTS } from "@/lib/cortex/params";
import { useLab } from "@/lib/state/store";
import { bindRig, pose, REVIEWER_ASSET, setMorph, type ReviewerRig } from "./rig";
import { reviewerBehavior } from "./reviewerBehavior";
import { hazardReference, reviewerState } from "./reviewerState";

/** Seeded PRNG for the idle layer (mulberry32). */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Critically damped spring toward a target. */
class Spring {
  v = 0;
  constructor(
    public x: number,
    private readonly k = 60,
  ) {}
  step(target: number, dt: number) {
    const c = 2 * Math.sqrt(this.k);
    this.v += (this.k * (target - this.x) - c * this.v) * dt;
    this.x += this.v * dt;
    return this.x;
  }
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Radians per unit of behavioural gaze (eye-in-socket). */
const EYE_YAW = 0.32;
const EYE_PITCH = 0.22;

/** Bust framing in contract units (shoulders at y=0, head top ≈ 1): head and shoulders fill the slot. */
const FRAME_Y = 0.56;
const FRAME_HALF = 0.5;
/** Presentation-only 3/4 bust turn toward the content (screen left); CORTEX yaw is applied on top at neck/head. */
const REST_YAW = -0.32;

interface Actor {
  rig: ReviewerRig;
  camera: THREE.PerspectiveCamera;
  update(now: number, dt: number, selected: boolean): void;
}

function makeActor(rig: ReviewerRig, cohort: number): Actor {
  const rnd = prng(0x5eed + cohort * 7919);
  const phase = rnd() * Math.PI * 2;
  const breathPeriod = 3.6 + rnd() * 1.3;
  const postureRate = 0.07 + rnd() * 0.05;
  let nextBlink = 0.4 + rnd() * 2.5;
  let blinkStart = -1;
  let doubleBlink = false;
  let nextSaccade = rnd();
  let sac = [0, 0];
  const still = reducedMotion();
  const S = {
    headYaw: new Spring(-0.25, 22),
    headPitch: new Spring(0, 22),
    lean: new Spring(0, 12),
    eyeX: new Spring(0, 420),
    eyeY: new Spring(0, 420),
    open: new Spring(1, 90),
    brow: new Spring(0, 40),
    raise: new Spring(0, 70),
    presence: new Spring(1, 16),
    scale: new Spring(1, 50),
  };
  const rest = rig.root.position.clone();
  const camera = new THREE.PerspectiveCamera(19, 1, 0.1, 50);
  const focus = new THREE.Vector3(rig.focus.x, FRAME_Y, rig.focus.z);
  const dist = FRAME_HALF / Math.tan(THREE.MathUtils.degToRad(19 / 2));
  camera.position.set(focus.x - dist * 0.05, focus.y + 0.03, focus.z + dist);
  camera.lookAt(focus);
  const noise = (t: number, a: number, b: number, c: number) => Math.sin(t * a + phase) * 0.6 + Math.sin(t * b + phase * 1.7) * 0.3 + Math.sin(t * c + phase * 2.3) * 0.1;

  return {
    rig,
    camera,
    update(now, dt, selected) {
      const lab = useLab.getState();
      const run = lab.run;
      const src = (lab.activeCf ? lab.counterfactuals[lab.activeCf]?.run : null) ?? run;
      if (!run || !src) return;
      // CORTEX-driven layer: pure function of cohort state at the current video time.
      const B = reviewerBehavior(reviewerState(src, cohort, lab.time, baseFor(run)));
      const idle = still ? 0 : 1;

      // Idle layer (seeded, bounded). Its only CORTEX coupling is the documented gains: wander, blinkRate, drift.
      if (now > nextSaccade) {
        sac = [(rnd() * 2 - 1) * 0.55 * B.wander, (rnd() * 2 - 1) * 0.4 * B.wander];
        nextSaccade = now + (0.45 + rnd() * 1.6) / (0.6 + B.wander);
      }
      if (now > nextBlink && blinkStart < 0) {
        blinkStart = now;
        doubleBlink = rnd() < 0.12;
        nextBlink = now + (2.4 + rnd() * 3.6) / B.blinkRate;
      }
      let blink = 0;
      if (blinkStart >= 0) {
        const len = doubleBlink ? 0.42 : 0.17;
        const u = (now - blinkStart) / len;
        blink = u >= 1 ? 0 : doubleBlink ? Math.abs(Math.sin(u * Math.PI * 2)) : Math.sin(u * Math.PI);
        if (u >= 1) blinkStart = -1;
      }
      const breath = Math.sin((now / breathPeriod) * Math.PI * 2 + phase) * idle;
      const drift = (0.04 + B.drift) * idle;
      const swayYaw = noise(now, 0.37, 0.91, 2.1) * drift;
      const swayPitch = noise(now + 11, 0.29, 0.77, 1.7) * drift * 0.5;
      const roll = noise(now + 23, 0.21, 0.53, 1.3) * 0.03 * idle;
      const posture = Math.sin(now * postureRate * Math.PI * 2 + phase) * 0.025 * idle;
      const mouth = Math.max(0, noise(now + 5, 0.6, 1.4, 3.1)) * 0.12 * idle;

      const headYaw = S.headYaw.step(B.yaw, dt) + swayYaw;
      const headPitch = S.headPitch.step(B.pitch, dt) + swayPitch;
      const lean = S.lean.step(B.lean, dt) + posture;
      const ex = S.eyeX.step(B.gazeX + sac[0] * idle, dt);
      const ey = S.eyeY.step(B.gazeY + sac[1] * idle, dt);
      const open = S.open.step(B.eyeOpen, dt);
      const brow = S.brow.step(B.browTension, dt);
      const raise = S.raise.step(B.browRaise, dt);
      const presence = S.presence.step(B.presence + (selected ? 0.1 : 0), dt);
      const scale = S.scale.step(selected ? 1.04 : 1, dt);

      rig.root.scale.setScalar(scale);
      rig.root.position.y = rest.y - (scale - 1) * FRAME_Y;
      pose(rig.chest, lean + 0.012 * breath, REST_YAW + 0.3 * posture);
      pose(rig.neck, 0.35 * headPitch - 0.4 * lean, 0.35 * headYaw);
      pose(rig.head, 0.65 * headPitch, 0.65 * headYaw, roll);
      // glTF eyes look down +Z; positive Y rotation turns them toward the character's left (screen right).
      pose(rig.eyeL, -EYE_PITCH * ey, EYE_YAW * ex);
      pose(rig.eyeR, -EYE_PITCH * ey, EYE_YAW * ex);
      const lid = Math.min(1, Math.max(blink, (1 - Math.min(1, open)) * 0.85));
      setMorph(rig, "blink_L", lid);
      setMorph(rig, "blink_R", lid);
      setMorph(rig, "wide", Math.max(0, open - 1) * 4);
      setMorph(rig, "browDown", Math.min(1, brow * 0.9));
      setMorph(rig, "browUp", Math.min(1, raise * 0.8));
      setMorph(rig, "mouthOpen", mouth);
      const k = Math.min(1.1, presence);
      for (const m of rig.materials) m.mat.color.copy(m.base).multiplyScalar(k);
    },
  };
}

let baseCache: { run: unknown; v: number } | null = null;
function baseFor(run: NonNullable<ReturnType<typeof useLab.getState>["run"]>) {
  if (!baseCache || baseCache.run !== run) baseCache = { run, v: hazardReference(run) };
  return baseCache.v;
}

function Studio() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    return () => {
      scene.environment = null;
      env.dispose();
      pm.dispose();
    };
  }, [gl, scene]);
  return (
    <>
      <hemisphereLight args={["#fff5ea", "#2d313a", 0.9]} />
      <directionalLight position={[-2.5, 3, 4]} intensity={2.1} color="#fff1e2" />
      <directionalLight position={[3, 1.5, -2.5]} intensity={1.3} color="#cdd8ff" />
    </>
  );
}

function Cast({ slots }: { slots: RefObject<HTMLDivElement | null>[] }) {
  const gltf = useLoader(GLTFLoader, REVIEWER_ASSET, (l) => l.setMeshoptDecoder(MeshoptDecoder));
  const { gl, scene } = useThree();
  const actors = useMemo(
    () =>
      COHORTS.map((c, i) => {
        const node = gltf.scene.getObjectByName(`reviewer_${c.id}`);
        return node ? makeActor(bindRig(node), i) : null;
      }),
    [gltf],
  );
  useEffect(() => {
    const group = new THREE.Group();
    actors.forEach((a) => a && group.add(a.rig.root));
    scene.add(group);
    return () => {
      scene.remove(group);
      actors.forEach((a) => a?.rig.dispose());
    };
  }, [actors, scene]);

  const rects = useRef<{ x: number; y: number; w: number; h: number }[]>([]);
  const age = useRef(1e9);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const now = clock.elapsedTime;
    const canvas = gl.domElement.getBoundingClientRect();
    age.current += dt;
    if (age.current > 0.2) {
      age.current = 0;
      rects.current = slots.map((s) => {
        const b = s.current?.getBoundingClientRect();
        return b ? { x: b.left - canvas.left, y: b.top - canvas.top, w: b.width, h: b.height } : { x: 0, y: 0, w: 0, h: 0 };
      });
    }
    const selected = useLab.getState().cohort;
    const H = canvas.height;
    gl.setScissorTest(false);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    gl.setScissorTest(true);
    actors.forEach((a, i) => {
      const r = rects.current[i];
      if (!a || !r || r.w <= 0) return;
      a.update(now, dt, selected === i);
      actors.forEach((b, j) => b && (b.rig.root.visible = j === i));
      const y = H - r.y - r.h;
      gl.setViewport(r.x, y, r.w, r.h);
      gl.setScissor(r.x, y, r.w, r.h);
      a.camera.aspect = r.w / r.h;
      a.camera.updateProjectionMatrix();
      gl.render(scene, a.camera);
    });
    gl.setScissorTest(false);
  }, 1);
  return null;
}

/** One shared WebGL canvas and scene; each reviewer is rendered into the viewport of its DOM slot with its own camera. */
export function ReviewerStage({ slots }: { slots: RefObject<HTMLDivElement | null>[] }) {
  return (
    <Canvas
      className="pointer-events-none"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <Studio />
      <Suspense fallback={null}>
        <Cast slots={slots} />
      </Suspense>
    </Canvas>
  );
}
