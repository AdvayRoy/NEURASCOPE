"use client";

/** Captures one small JPEG frame from a local media URL at time `t` (base64, no data-URL prefix). Returns null when decoding fails. */
export async function captureFrame(mediaUrl: string, t: number, width = 320): Promise<{ mediaType: "image/jpeg"; base64: string } | null> {
  try {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = mediaUrl;
    await new Promise<void>((res, rej) => {
      v.onloadeddata = () => res();
      v.onerror = () => rej(new Error("decode"));
    });
    await new Promise<void>((res, rej) => {
      v.onseeked = () => res();
      v.onerror = () => rej(new Error("seek"));
      v.currentTime = Math.max(0, Math.min((v.duration || t) - 0.05, t));
    });
    const scale = width / (v.videoWidth || width);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.max(1, Math.round((v.videoHeight || width) * scale));
    canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    v.removeAttribute("src");
    v.load();
    return { mediaType: "image/jpeg", base64: dataUrl.slice(dataUrl.indexOf(",") + 1) };
  } catch {
    return null;
  }
}
