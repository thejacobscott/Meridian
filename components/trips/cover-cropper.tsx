"use client";

import * as React from "react";
import imageCompression from "browser-image-compression";
import { ImagePlus, Loader2, RefreshCw } from "lucide-react";
import { coverGradient } from "./cover-image";

const TARGET_W = 1280;
const TARGET_H = 853; // 3:2
const FRAME_AR = TARGET_W / TARGET_H; // 1.5

type Loaded = { url: string; img: HTMLImageElement; ar: number };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Upload + pan/zoom crop for a trip cover. The crop is baked into a fresh 3:2
 * image (canvas → compressed data URL) so only `cover_photo_url` is ever stored.
 * The frame is always 3:2, so the whole crop is computed in natural-pixel space
 * with no layout measurement — display and bake share one `cropRect`, keeping
 * the result WYSIWYG. With no photo it shows the accent gradient the card and
 * header fall back to.
 */
export function CoverCropper({
  value,
  accent,
  onChange,
}: {
  value: string | null;
  accent: string;
  onChange: (dataUrl: string | null) => void;
}) {
  const frameRef = React.useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [zoom, setZoom] = React.useState(1);
  // Pan as a fraction of available slack: {x:0.5,y:0.5} is centered.
  const [pos, setPos] = React.useState({ x: 0.5, y: 0.5 });
  const [busy, setBusy] = React.useState(false);
  const drag = React.useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );

  React.useEffect(() => {
    return () => {
      if (loaded) URL.revokeObjectURL(loaded.url);
    };
  }, [loaded]);

  // The visible region of the source image, in its own natural pixels. Pure —
  // safe to call during render and inside the canvas bake alike.
  function cropRect(l: Loaded, z: number, p: { x: number; y: number }) {
    const w = l.img.naturalWidth;
    const h = l.img.naturalHeight;
    const baseW = l.ar >= FRAME_AR ? h * FRAME_AR : w;
    const baseH = l.ar >= FRAME_AR ? h : w / FRAME_AR;
    const cw = baseW / z;
    const ch = baseH / z;
    const slackX = w - cw;
    const slackY = h - ch;
    return { cx: slackX * p.x, cy: slackY * p.y, cw, ch, slackX, slackY };
  }

  function onFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    if (loaded) URL.revokeObjectURL(loaded.url);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setLoaded({ url, img, ar: img.naturalWidth / img.naturalHeight });
      setZoom(1);
      setPos({ x: 0.5, y: 0.5 });
    };
    img.src = url;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!loaded) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !loaded) return;
    const el = frameRef.current; // ref read in an event handler — allowed
    if (!el) return;
    const { cw, ch, slackX, slackY } = cropRect(loaded, zoom, pos);
    const dxFrac =
      slackX > 0 ? ((e.clientX - drag.current.x) * (cw / el.clientWidth)) / slackX : 0;
    const dyFrac =
      slackY > 0 ? ((e.clientY - drag.current.y) * (ch / el.clientHeight)) / slackY : 0;
    setPos({
      x: clamp01(drag.current.px - dxFrac),
      y: clamp01(drag.current.py - dyFrac),
    });
  }
  function onPointerUp(e: React.PointerEvent) {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }

  async function bake() {
    if (!loaded) return;
    setBusy(true);
    try {
      const { cx, cy, cw, ch } = cropRect(loaded, zoom, pos);
      const canvas = document.createElement("canvas");
      canvas.width = TARGET_W;
      canvas.height = TARGET_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(loaded.img, cx, cy, cw, ch, 0, 0, TARGET_W, TARGET_H);

      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob(
          (b) => (b ? res(b) : rej(new Error("crop failed"))),
          "image/jpeg",
          0.92,
        ),
      );
      const compressed = await imageCompression(
        new File([blob], "cover.jpg", { type: "image/jpeg" }),
        { maxWidthOrHeight: TARGET_W, maxSizeMB: 0.9, useWebWorker: true },
      );
      const dataUrl = await imageCompression.getDataUrlFromFile(compressed);
      onChange(dataUrl);
      URL.revokeObjectURL(loaded.url);
      setLoaded(null);
    } finally {
      setBusy(false);
    }
  }

  // Display geometry maps the same crop rect onto the frame, in pure % units.
  let imgStyle: React.CSSProperties | undefined;
  if (loaded) {
    const { cx, cy, cw } = cropRect(loaded, zoom, pos);
    imgStyle = {
      position: "absolute",
      top: 0,
      left: 0,
      maxWidth: "none",
      width: `${(loaded.img.naturalWidth / cw) * 100}%`,
      transform: `translate(${(-cx / loaded.img.naturalWidth) * 100}%, ${
        (-cy / loaded.img.naturalHeight) * 100
      }%)`,
    };
  }

  return (
    <div className="space-y-3">
      <div
        ref={frameRef}
        className="relative aspect-[3/2] w-full select-none overflow-hidden rounded-card ring-1 ring-line/60"
        style={{ background: coverGradient(accent) }}
      >
        {loaded ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={loaded.url}
              alt=""
              draggable={false}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="cursor-grab touch-none active:cursor-grabbing"
              style={imgStyle}
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/20" />
          </>
        ) : value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Trip cover"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-paper/90">
            <ImagePlus size={26} strokeWidth={1.5} />
            <p className="text-sm font-medium">Add a cover photo</p>
            <p className="max-w-[14rem] text-xs text-paper/70">
              Or leave it — this trip&apos;s color carries the card.
            </p>
          </div>
        )}
      </div>

      {loaded ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-soft">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-line accent-accent"
              aria-label="Zoom cover photo"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-soft">Drag the photo to reposition</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (loaded) URL.revokeObjectURL(loaded.url);
                  setLoaded(null);
                }}
                className="text-sm text-ink-soft transition-colors hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={bake}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft transition active:scale-[0.97] disabled:opacity-60"
              >
                {busy && <Loader2 size={15} className="animate-spin" />}
                Use photo
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-surface/70 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04]">
            {value ? (
              <RefreshCw size={15} strokeWidth={1.75} />
            ) : (
              <ImagePlus size={15} strokeWidth={1.75} />
            )}
            {value ? "Replace photo" : "Upload photo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}
