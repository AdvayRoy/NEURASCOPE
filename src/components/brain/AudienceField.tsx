"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { COHORTS } from "@/lib/cortex/params";
import { useLab } from "@/lib/state/store";

const MAX = 10_000;

/**
 * One point per sampled synthetic viewer, arranged on a flat ring beneath the brain by cohort sector.
 * A point fades and falls when its viewer's concrete exit time (from the survival simulation) has passed.
 */
export function AudienceField() {
  const run = useLab((s) => s.run);
  const activeCf = useLab((s) => s.activeCf);
  const cfs = useLab((s) => s.counterfactuals);
  const pts = useRef<THREE.Points>(null);
  const src = activeCf ? cfs[activeCf]?.run ?? run : run;

  const { geometry, material } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = Math.min(MAX, src?.sim.size ?? 0);
    const pos = new Float32Array(n * 3);
    const exit = new Float32Array(n);
    const cohort = new Float32Array(n);
    if (src) {
      const shares: number[] = COHORTS.map((_, c) => src.sim.cohortCounts[c] / src.sim.size);
      const starts: number[] = [];
      let acc = 0;
      for (const s of shares) { starts.push(acc); acc += s; }
      for (let i = 0; i < n; i++) {
        const c = src.audience.cohort[i];
        const u = src.audience.layout[2 * i];
        const v = src.audience.layout[2 * i + 1];
        const gap = 0.012;
        const theta = (starts[c] + gap + u * (shares[c] - 2 * gap)) * Math.PI * 2;
        const r = 1.45 + Math.sqrt(v) * 0.55;
        pos[3 * i] = Math.cos(theta) * r;
        pos[3 * i + 1] = -1.05 + (v - 0.5) * 0.04;
        pos[3 * i + 2] = Math.sin(theta) * r;
        exit[i] = Number.isFinite(src.sim.exitTime[i]) ? src.sim.exitTime[i] : 1e6;
        cohort[i] = c;
      }
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("exitTime", new THREE.BufferAttribute(exit, 1));
    g.setAttribute("cohort", new THREE.BufferAttribute(cohort, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uCohort: { value: -1 }, uPixel: { value: 1 } },
      vertexShader: `
        attribute float exitTime; attribute float cohort;
        uniform float uTime; uniform float uCohort; uniform float uPixel;
        varying float vAlpha; varying float vGone;
        void main(){
          float since = uTime - exitTime;
          float gone = clamp(since / 0.9, 0.0, 1.0);
          vec3 p = position;
          p.y -= gone * gone * 0.35;
          p.xz *= 1.0 + gone * 0.06;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float sel = uCohort < 0.0 ? 1.0 : (abs(cohort - uCohort) < 0.5 ? 1.0 : 0.22);
          vAlpha = sel * (1.0 - gone * 0.92);
          vGone = step(0.001, since);
          gl_PointSize = uPixel * (1.6 + (1.0 - gone) * 0.6) * (3.2 / -mv.z);
        }`,
      fragmentShader: `
        varying float vAlpha; varying float vGone;
        void main(){
          vec2 c = gl_PointCoord - 0.5; if (dot(c,c) > 0.25) discard;
          vec3 alive = vec3(0.86, 0.87, 0.85);
          vec3 gone = vec3(1.0, 0.48, 0.27);
          gl_FragColor = vec4(mix(alive, gone, vGone), vAlpha * 0.75);
        }`,
    });
    return { geometry: g, material: m };
  }, [src]);
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame(({ gl }) => {
    const s = useLab.getState();
    material.uniforms.uTime.value = s.time;
    material.uniforms.uCohort.value = s.cohort ?? -1;
    material.uniforms.uPixel.value = gl.getPixelRatio();
  });

  if (!src) return null;
  return <points ref={pts} geometry={geometry} material={material} />;
}
