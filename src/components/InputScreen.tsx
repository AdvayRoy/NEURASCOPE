"use client";
import { useEffect, useRef, useState } from "react";
import { AUDIENCE_CONTEXTS, type AudienceContextId } from "@/lib/cortex/params";
import { runPipeline } from "@/lib/state/pipeline";
import { useLab } from "@/lib/state/store";

export function InputScreen() {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [status, setStatus] = useState<{ oriane: boolean; analystLlm: string | null } | null>(null);
  const context = useLab((s) => s.context);
  const set = useLab((s) => s.set);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => setStatus(null));
  }, []);

  const canRun = Boolean(url.trim() || file);
  const submit = () => canRun && runPipeline({ url: url.trim() || undefined, file });

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center px-6"
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f?.type.startsWith("video/")) setFile(f);
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(143,179,255,0.05),transparent_60%)]" />
      <div className="relative w-full max-w-[640px]">
        <div className="mb-14 text-center">
          <h1 className="text-[44px] font-light tracking-[0.34em] text-fg">NEURASCOPE</h1>
          <p className="label mt-3 !text-[11px] !tracking-[0.3em]">Synthetic Attention Laboratory</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          className={`rounded-xl border bg-ink-1/80 p-1.5 transition-colors ${drag ? "border-signal/60" : "border-line-2"}`}
        >
          <div className="flex items-center gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a TikTok or Instagram Reel URL"
              className="h-12 min-w-0 flex-1 bg-transparent px-4 text-[15px] text-fg placeholder:text-fg-3 focus:outline-none"
              aria-label="Video URL"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-10 shrink-0 rounded-lg border border-line px-3 text-[13px] text-fg-2 transition-colors hover:border-line-2 hover:text-fg"
            >
              {file ? "Change file" : "Upload video"}
            </button>
            <button
              type="submit"
              disabled={!canRun}
              className="h-10 shrink-0 rounded-lg bg-fg px-5 text-[13px] font-medium text-ink transition-opacity disabled:opacity-30"
            >
              Run simulation
            </button>
          </div>
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </form>

        <div className="mt-4 flex items-center justify-between gap-4 px-1 text-[12px] text-fg-3">
          <div className="min-w-0 truncate">
            {file ? (
              <span className="text-fg-2">
                {file.name} <span className="text-fg-3">· {(file.size / 1e6).toFixed(1)} MB · decoded locally</span>
              </span>
            ) : (
              <span>Drop a video file, or paste a published URL. Both can be combined.</span>
            )}
          </div>
          <label className="flex shrink-0 items-center gap-2">
            <span className="label">Audience</span>
            <select
              value={context}
              onChange={(e) => set({ context: e.target.value as AudienceContextId })}
              className="rounded-md border border-line bg-ink-1 px-2 py-1 text-[12px] text-fg-2 focus:outline-none"
            >
              {Object.entries(AUDIENCE_CONTEXTS).map(([id, c]) => (
                <option key={id} value={id}>{c.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-16 flex items-center justify-center gap-6 text-[11px] text-fg-3">
          <span className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${status?.oriane ? "bg-cf" : "bg-fg-3"}`} />
            Oriane {status?.oriane ? "live" : "not configured"}
          </span>
          {!status?.oriane && (
            <button onClick={() => runPipeline({ fixture: true, file })} className="underline decoration-line-2 underline-offset-4 hover:text-fg-2">
              Run on development fixture{file ? " + this file" : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
