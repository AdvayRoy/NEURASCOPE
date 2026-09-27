import * as THREE from "three";

export const REGION_TEX_SIZE = 128;

/**
 * Brain surface material: matte tissue with a per-region overlay read from a data texture.
 * Texture channels: R = overlay intensity 0..1, G = selection focus, B = fracture emphasis, A = hover.
 */
export function createBrainMaterial(regionTex: THREE.DataTexture) {
  const uniforms = {
    uRegions: { value: regionTex },
    uSignal: { value: new THREE.Color("#8fb3ff") },
    uFracture: { value: new THREE.Color("#ff7a45") },
    uBase: { value: new THREE.Color("#d6d0c4") },
    uOpacity: { value: 1 },
    uDim: { value: 0 },
  };
  const mat = new THREE.MeshStandardMaterial({ color: "#d6d0c4", roughness: 0.72, metalness: 0.0, transparent: false });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float region;\nvarying float vRegion;\nvarying vec3 vN;\nvarying vec3 vV;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvRegion = region;\nvN = normalize(normalMatrix * normal);\nvec4 mvp = modelViewMatrix * vec4(position,1.0);\nvV = normalize(-mvp.xyz);",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform sampler2D uRegions; uniform vec3 uSignal; uniform vec3 uFracture; uniform float uDim;
varying float vRegion; varying vec3 vN; varying vec3 vV;
vec4 regionData(){ return texture2D(uRegions, vec2((floor(vRegion + 0.5) + 0.5) / ${REGION_TEX_SIZE}.0, 0.5)); }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
vec4 rd = regionData();
float fres = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 2.2);
vec3 base = diffuseColor.rgb * mix(1.0, 0.42, uDim * (1.0 - rd.g));
vec3 over = mix(uSignal, uFracture, rd.b);
float k = clamp(rd.r, 0.0, 1.0);
float kv = smoothstep(0.12, 0.95, k);
diffuseColor.rgb = mix(base, over * (0.6 + 0.4 * k), kv * 0.82);
diffuseColor.rgb += mix(vec3(0.05), over * 0.35, kv) * fres;
diffuseColor.rgb += vec3(0.08) * rd.a;`,
      );
  };
  return { material: mat, uniforms };
}
