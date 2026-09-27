"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { COHORTS } from "@/lib/cortex/params";
import { useLab } from "@/lib/state/store";
import { buildReviewer, HEAD_Y } from "./characters";
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
  constructor(public x: number, private readonly k = 60) {}
  step(target: number, dt: number) {
    const c = 2 * Math.sqrt(this.k);
    this.v += (this.k * (target - this.x) - c * this.v) * dt;
    this.x += this.v * dt;
    return this.x;
  }
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Reviewer({ cohort, slot, selected }: { cohort: number; slot: RefObject<HTMLDivElement | null>; selected: boolean }) {
  const rig = useMemo(() => buildReviewer(COHORTS[cohort].id), [cohort]);
  useEffect(() => () => rig.dispose(), [rig]);
  const gl = useThree((s) => s.gl);
  const run = useLab((s) => s.run);
  const cf = useLab((s) => (s.activeCf ? s.counterfactuals[s.activeCf] : null));
  const src = cf?.run ?? run;
  const base = useMemo(() => (run ? hazardReference(run) : null), [run]);
  const sel = useRef(selected);
  useEffect(() => {
    sel.current = selected;
  }, [selected]);

  const anim = useMemo(() => {
    const rnd = prng(0x5eed + cohort * 7919);
    return {
      rnd,
      phase: rnd() * Math.PI * 2,
      breathPeriod: 3.4 + rnd() * 1.2,
      nextBlink: 0.5 + rnd() * 2,
      blinkStart: -1,
      nextSaccade: rnd(),
      sacX: 0,
      sacY: 0,
      rect: { x: 0, y: 0, w: 0, h: 0 },
      rectAge: 1e9,
      still: reducedMotion(),
      s: {
        yaw: new Spring(-0.38, 40),
        pitch: new Spring(0, 40),
        lean: new Spring(0, 30),
        open: new Spring(1, 90),
        gx: new Spring(0, 160),
        gy: new Spring(0, 160),
        brow: new Spring(0, 60),
        raise: new Spring(0, 80),
        presence: new Spring(1, 20),
        scale: new Spring(1, 60),
      },
    };
  }, [cohort]);

  useFrame(({ clock }, rawDt) => {
    const el = slot.current;
    if (!el || !src || !base) {
      rig.root.visible = false;
      return;
    }
    const dt = Math.min(0.05, rawDt);
    const now = clock.elapsedTime;
    const A = anim;
    A.rectAge += dt;
    if (A.rectAge > 0.25) {
      const c = gl.domElement.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      A.rect = { x: b.left + b.width / 2 - (c.left + c.width / 2), y: c.top + c.height / 2 - (b.top + b.height / 2), w: b.width, h: b.height };
      A.rectAge = 0;
    }
    const { x, y, w, h } = A.rect;
    rig.root.visible = w > 0;
    rig.root.position.set(x, y, 0);
    rig.planes[0].constant = -(y - h / 2);
    rig.planes[1].constant = y + h / 2;
    rig.planes[2].constant = -(x - w / 2);
    rig.planes[3].constant = x + w / 2;

    // CORTEX-driven layer: pure function of cohort state at the current video time.
    const B = reviewerBehavior(reviewerState(src, cohort, useLab.getState().time, base));

    // Idle layer: seeded, bounded, independent of CORTEX except for the documented gain terms (wander, blinkRate).
    const idle = A.still ? 0 : 1;
    if (now > A.nextSaccade) {
      A.sacX = (A.rnd() * 2 - 1) * 0.35 * B.wander;
      A.sacY = (A.rnd() * 2 - 1) * 0.25 * B.wander;
      A.nextSaccade = now + (0.5 + A.rnd() * 1.4) / (0.6 + B.wander);
    }
    if (now > A.nextBlink && A.blinkStart < 0) {
      A.blinkStart = now;
      A.nextBlink = now + (2.2 + A.rnd() * 3.2) / B.blinkRate;
    }
    let blink = 0;
    if (A.blinkStart >= 0) {
      const u = (now - A.blinkStart) / 0.16;
      blink = u < 1 ? Math.sin(u * Math.PI) : 0;
      if (u >= 1) A.blinkStart = -1;
    }
    const breath = Math.sin((now / A.breathPeriod) * Math.PI * 2 + A.phase) * idle;
    const swayY = (0.025 * Math.sin(now * 0.53 + A.phase) + 0.012 * Math.sin(now * 1.31 + A.phase * 2)) * idle;
    const swayZ = 0.018 * Math.sin(now * 0.41 + A.phase * 3) * idle;

    const S = A.s;
    const yaw = S.yaw.step(B.yaw, dt);
    const pitch = S.pitch.step(B.pitch, dt);
    const lean = S.lean.step(B.lean, dt);
    const open = S.open.step(B.eyeOpen, dt);
    const gx = S.gx.step(B.gazeX + A.sacX * idle, dt);
    const gy = S.gy.step(B.gazeY + A.sacY * idle, dt);
    const brow = S.brow.step(B.browTension, dt);
    const raise = S.raise.step(B.browRaise, dt);
    const presence = S.presence.step(B.presence + (sel.current ? 0.12 : 0), dt);
    const scale = S.scale.step(sel.current ? 1.06 : 1, dt);

    rig.root.scale.setScalar(h * 0.98 * scale);
    rig.body.rotation.x = lean;
    rig.body.scale.set(1 + 0.008 * breath, 1 + 0.014 * breath, 1);
    rig.head.rotation.set(pitch + 0.5 * lean, yaw + swayY, -0.35 * (yaw + 0.38) * 0.3 + swayZ);
    rig.head.position.y = HEAD_Y + 0.006 * breath;
    rig.head.position.z = 0.02 - 0.08 * lean;
    for (const e of rig.eyes) e.scale.y = Math.max(0.06, open * (1 - 0.94 * blink));
    for (const p of rig.pupils) p.position.set(0.06 * gx, 0.05 * gy, 0.1);
    rig.brows.forEach((b, i) => {
      const side = i === 0 ? 1 : -1;
      b.position.y = 0.4 - 0.06 * brow + 0.08 * raise;
      b.rotation.z = Math.PI / 2 - 0.12 * side - 0.22 * brow * side;
    });
    const k = Math.min(1.12, presence);
    rig.materials.forEach((m, i) => m.color.copy(rig.baseColors[i]).multiplyScalar(k));
  });

  return <primitive object={rig.root} />;
}

/** One shared WebGL canvas and scene; each reviewer rig is placed over its DOM slot (orthographic, 1 unit = 1 CSS px). */
export function ReviewerStage({ slots }: { slots: RefObject<HTMLDivElement | null>[] }) {
  const cohort = useLab((s) => s.cohort);
  return (
    <Canvas
      className="pointer-events-none"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}
      dpr={[1, 2]}
      orthographic
      camera={{ position: [0, 0, 400], zoom: 1, near: 1, far: 1000 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.localClippingEnabled = true;
      }}
    >
      <hemisphereLight args={["#fff6ea", "#3a3f4a", 1.7]} />
      <directionalLight position={[-160, 220, 320]} intensity={2.9} color="#fff4e6" />
      <directionalLight position={[260, 80, -120]} intensity={1.1} color="#c7d4ff" />
      {slots.map((s, i) => (
        <Reviewer key={i} cohort={i} slot={s} selected={cohort === i} />
      ))}
    </Canvas>
  );
}
