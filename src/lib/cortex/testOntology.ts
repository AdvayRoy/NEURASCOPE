import type { VideoOntology } from "../ontology";

/** Synthetic ontology used only by unit tests. Not a demo asset and never shown in the product. */
export function testOntology(overrides: Partial<VideoOntology> = {}): VideoOntology {
  const hz = 10;
  const duration = 20;
  const n = duration * hz;
  const frameDiff: number[] = [];
  const cuts: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / hz;
    // Dynamic opening, a static talking-head stretch from 8–13 s, then dynamic again.
    const staticStretch = t > 8 && t < 13;
    const isCut = !staticStretch && i % 15 === 0 && i > 0;
    if (isCut) cuts.push(t);
    frameDiff.push(staticStretch ? 0.01 : isCut ? 0.9 : 0.2 + 0.1 * Math.sin(t * 3));
  }
  return {
    id: "test:1",
    source: "local-only",
    sourceNote: "unit test",
    platform: "upload",
    url: null,
    platformId: null,
    caption: null,
    hashtags: ["#glowserum"],
    duration,
    transcript: [
      { start: 0, end: 2.5, text: "Here's why your skincare routine is not working?" },
      { start: 2.5, end: 5.5, text: "Most people layer products in completely the wrong order every morning." },
      { start: 5.5, end: 8, text: "Dermatologists recommend thin to thick textures first." },
      { start: 8, end: 13, text: "So basically what you want to do is you want to make sure that you are really really careful and you do it the way that you know it is supposed to be done okay so yeah" },
      { start: 13, end: 16, text: "That's why glowserum absorbs first and locks moisture." },
      { start: 16, end: 20, text: "Link in bio for the full routine." },
    ],
    transcriptLanguage: "en",
    keyframes: [],
    thumbnailUrl: null,
    metrics: null,
    creator: null,
    audio: null,
    signals: {
      hz,
      frameDiff,
      luminance: frameDiff.map(() => 0.5),
      spatialEntropy: frameDiff.map((_, i) => (i > 80 && i < 130 ? 0.3 : 0.6)),
      audioRms: frameDiff.map((_, i) => 0.4 + 0.1 * Math.sin(i)),
      cuts,
      measuredFrom: "decoded-video",
    },
    unavailable: [],
    requestId: null,
    ...overrides,
  };
}
