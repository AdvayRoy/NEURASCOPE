import type { MediaSignals } from "../ontology";

const W = 72;
const H = 128;
const HZ = 5;

function seek(v: HTMLVideoElement, t: number) {
  return new Promise<void>((resolve) => {
    const done = () => {
      v.removeEventListener("seeked", done);
      resolve();
    };
    v.addEventListener("seeked", done);
    v.currentTime = t;
  });
}

function spatialEntropy(lum: Float32Array) {
  const G = 6;
  const cells = new Float32Array(G * G);
  let total = 0;
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const gx = lum[y * W + x + 1] - lum[y * W + x - 1];
      const gy = lum[(y + 1) * W + x] - lum[(y - 1) * W + x];
      const e = gx * gx + gy * gy;
      cells[Math.floor((y / H) * G) * G + Math.floor((x / W) * G)] += e;
      total += e;
    }
  if (total <= 1e-9) return 0;
  let ent = 0;
  for (const c of cells) if (c > 0) { const p = c / total; ent -= p * Math.log(p); }
  return ent / Math.log(G * G);
}

async function audioRms(file: Blob, duration: number): Promise<number[]> {
  try {
    const Ctx = window.OfflineAudioContext;
    const buf = await file.arrayBuffer();
    const ctx = new Ctx(1, 22050, 22050);
    const audio = await ctx.decodeAudioData(buf);
    const ch = audio.getChannelData(0);
    const step = Math.floor(audio.sampleRate / HZ);
    const n = Math.ceil(duration * HZ);
    const out: number[] = [];
    let max = 1e-6;
    for (let i = 0; i < n; i++) {
      let s = 0;
      const o = i * step;
      for (let j = 0; j < step && o + j < ch.length; j++) s += ch[o + j] * ch[o + j];
      const r = Math.sqrt(s / step);
      out.push(r);
      max = Math.max(max, r);
    }
    return out.map((r) => r / max);
  } catch {
    return [];
  }
}

/** Measures visual change, luminance, gradient-energy dispersion, audio RMS and hard cuts from a local video file. */
export async function extractSignals(file: Blob, onProgress?: (p: number) => void): Promise<{ signals: MediaSignals; duration: number }> {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = url;
  await new Promise<void>((res, rej) => {
    v.onloadeddata = () => res();
    v.onerror = () => rej(new Error("This file could not be decoded by the browser."));
  });
  const duration = v.duration;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const n = Math.max(2, Math.floor(duration * HZ));
  const frameDiff: number[] = [];
  const luminance: number[] = [];
  const entropy: number[] = [];
  let prev: Float32Array | null = null;
  for (let i = 0; i < n; i++) {
    await seek(v, Math.min(duration - 0.01, i / HZ));
    ctx.drawImage(v, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    const lum = new Float32Array(W * H);
    let sum = 0;
    for (let p = 0; p < W * H; p++) {
      lum[p] = (0.2126 * d[4 * p] + 0.7152 * d[4 * p + 1] + 0.0722 * d[4 * p + 2]) / 255;
      sum += lum[p];
    }
    let diff = 0;
    if (prev) for (let p = 0; p < W * H; p++) diff += Math.abs(lum[p] - prev[p]);
    frameDiff.push(prev ? diff / (W * H) : 0);
    luminance.push(sum / (W * H));
    entropy.push(spatialEntropy(lum));
    prev = lum;
    onProgress?.((i + 1) / n);
  }
  URL.revokeObjectURL(url);
  // Hard cuts: frame-difference peaks well above the local distribution.
  const sorted = frameDiff.slice().sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  const mad = sorted.map((x) => Math.abs(x - med)).sort((a, b) => a - b)[Math.floor(sorted.length / 2)] || 1e-3;
  const cuts: number[] = [];
  for (let i = 1; i < frameDiff.length - 1; i++) {
    const x = frameDiff[i];
    if (x > med + 6 * mad && x > 0.06 && x >= frameDiff[i - 1] && x >= frameDiff[i + 1] && (!cuts.length || i / HZ - cuts[cuts.length - 1] > 0.4)) cuts.push(i / HZ);
  }
  return {
    duration,
    signals: { hz: HZ, frameDiff, luminance, spatialEntropy: entropy, audioRms: await audioRms(file, duration), cuts, measuredFrom: "decoded-video" },
  };
}
