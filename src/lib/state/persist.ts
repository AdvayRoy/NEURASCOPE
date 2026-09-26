"use client";
import type { AudienceContextId } from "../cortex/params";

const KEY = "neurascope:last-run";
const DB = "neurascope";
const STORE = "media";

export interface SavedRun {
  url?: string;
  fixture?: boolean;
  context: AudienceContextId;
  fileName?: string;
  fileType?: string;
}

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = fn(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveRun(input: { url?: string; fixture?: boolean; file?: File | null }, context: AudienceContextId) {
  const saved: SavedRun = { url: input.url, fixture: input.fixture, context, fileName: input.file?.name, fileType: input.file?.type };
  try {
    if (input.file) await tx("readwrite", (s) => s.put(input.file as Blob, "last"));
    else await tx("readwrite", (s) => s.delete("last"));
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    /* persistence is best-effort */
  }
}

export async function loadRun(): Promise<{ saved: SavedRun; file: File | null } | null> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedRun;
    let file: File | null = null;
    if (saved.fileName) {
      const blob = await tx<Blob | undefined>("readonly", (s) => s.get("last") as IDBRequest<Blob | undefined>);
      if (!blob) return null;
      file = new File([blob], saved.fileName, { type: saved.fileType ?? blob.type });
    }
    return { saved, file };
  } catch {
    return null;
  }
}

export function clearRun() {
  try {
    localStorage.removeItem(KEY);
    void tx("readwrite", (s) => s.delete("last")).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

export function saveContext(context: AudienceContextId) {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) localStorage.setItem(KEY, JSON.stringify({ ...(JSON.parse(raw) as SavedRun), context }));
  } catch {
    /* ignore */
  }
}
