"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLab } from "@/lib/state/store";

function useClock(getVideo: () => HTMLVideoElement | null) {
  const playing = useLab((s) => s.playing);
  const seekNonce = useLab((s) => s.seekNonce);
  const hasMedia = useLab((s) => Boolean(s.mediaUrl));

  useEffect(() => {
    const v = getVideo();
    if (v && Math.abs(v.currentTime - useLab.getState().time) > 0.04) v.currentTime = useLab.getState().time;
  }, [seekNonce, getVideo]);

  useEffect(() => {
    const v = getVideo();
    let raf = 0;
    let last = performance.now();
    if (playing) {
      if (v && hasMedia) void v.play().catch(() => useLab.getState().set({ playing: false }));
      const tick = (now: number) => {
        const s = useLab.getState();
        const dur = s.run?.timeline.duration ?? 0;
        let t = v && hasMedia ? v.currentTime : s.time + (now - last) / 1000;
        last = now;
        if (t >= dur) { t = dur; s.set({ playing: false }); }
        s.set({ time: t });
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } else if (v && hasMedia) {
      v.pause();
    }
    return () => cancelAnimationFrame(raf);
  }, [playing, hasMedia, getVideo]);
}

export function VideoPane() {
  const video = useRef<HTMLVideoElement>(null);
  const mediaUrl = useLab((s) => s.mediaUrl);
  const ontology = useLab((s) => s.ontology)!;
  const time = useLab((s) => s.time);
  const fractureId = useLab((s) => s.fractureId);
  const run = useLab((s) => s.run);
  const seek = useLab((s) => s.seek);
  const getVideo = useCallback(() => video.current, []);
  useClock(getVideo);
  const fr = run?.fractures.find((f) => f.id === fractureId);
  const segIdx = useMemo(() => ontology.transcript.findIndex((s) => time >= s.start && time < s.end), [ontology, time]);
  const keyframe = useMemo(() => ontology.keyframes.filter((k) => k.t <= time + 0.01).at(-1) ?? ontology.keyframes[0], [ontology, time]);
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-seg="${segIdx}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [segIdx]);

  return (
    <section className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-0">
      <div className="relative flex min-h-0 items-center justify-center p-4">
        <div className={`relative aspect-[9/16] h-full max-w-full overflow-hidden rounded-lg border bg-ink-1 transition-colors ${fr ? "border-fracture/60" : "border-line"}`}>
          {mediaUrl ? (
            <video
              ref={video}
              src={mediaUrl}
              className="h-full w-full object-cover"
              playsInline
              onClick={() => useLab.getState().set({ playing: !useLab.getState().playing })}
              onEnded={() => useLab.getState().set({ playing: false })}
            />
          ) : keyframe ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={keyframe.url} alt="Oriane keyframe" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="label">No media loaded</span>
              <span className="text-[11px] leading-relaxed text-fg-3">
                {ontology.source === "dev-fixture"
                  ? "The development fixture carries a transcript only. Upload the matching clip to measure visual and audio signals."
                  : "Oriane returned no keyframes for this record."}
              </span>
            </div>
          )}
          {fr && (
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-ink/80 to-transparent px-3 pb-6 pt-2">
              <span className="font-mono text-[10px] tracking-[0.14em] text-fracture">FRACTURE {fr.id}</span>
              <span className="num text-[10px] text-fg-2">{fr.start.toFixed(2)}–{fr.end.toFixed(2)} s</span>
            </div>
          )}
          {!mediaUrl && keyframe && <span className="absolute bottom-2 left-2 label !text-[9px]">Oriane keyframe · {keyframe.t.toFixed(1)} s</span>}
        </div>
      </div>
      <div className="flex min-h-0 flex-col border-l border-line py-4 pr-4 pl-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="label">Transcript</span>
          <span className="label !text-[9px]">{ontology.source === "oriane-live" ? "Oriane" : ontology.source === "dev-fixture" ? "Fixture" : "—"}</span>
        </div>
        {ontology.transcript.length ? (
          <ol ref={listRef} className="scroll-thin min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
            {ontology.transcript.map((s, i) => {
              const inFr = fr && s.end > fr.start && s.start < fr.end;
              return (
                <li key={i} data-seg={i}>
                  <button
                    onClick={() => seek(s.start)}
                    className={`block w-full text-left text-[12.5px] leading-[1.5] transition-colors ${
                      i === segIdx ? "text-fg" : inFr ? "text-fracture/80" : "text-fg-3 hover:text-fg-2"
                    }`}
                  >
                    <span className="num mr-2 text-[10px] text-fg-3">{s.start.toFixed(1)}</span>
                    {s.text}
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-[11.5px] leading-relaxed text-fg-3">
            No transcript. {ontology.source === "local-only" ? "Oriane has no upload endpoint; link a published URL for Oriane transcript chunks." : ""} Semantic progression and speech load are held at neutral priors.
          </p>
        )}
        {ontology.unavailable.length > 0 && (
          <p className="mt-3 border-t border-line pt-2 text-[10.5px] leading-snug text-fg-3">Unavailable: {ontology.unavailable.join(", ")}</p>
        )}
      </div>
    </section>
  );
}
