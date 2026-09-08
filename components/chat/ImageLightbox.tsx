"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type WheelEvent } from "react";
import { createPortal } from "react-dom";
import { Download, Minus, Plus, X } from "lucide-react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

/** Full-screen zoom overlay, shared by chat image attachments and product
 * photos. Includes a manual +/- zoom control with a live percentage
 * readout (drag-to-pan once zoomed past 100%, mouse-wheel also zooms) -
 * the inline hover-magnifier elsewhere on the page is only a quick preview,
 * this is the "zoom in as far as you want" surface. */
export default function ImageLightbox({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  // Renders through a portal to document.body rather than in place - the
  // trigger is frequently inside a <Link>/<a> (service detail hero on
  // mobile, chat bubbles), and this lightbox's own <a download> and <button>
  // would otherwise nest inside that ancestor <a>, which is invalid HTML
  // (confirmed via a real hydration-error console warning) and breaks the
  // download link's own clickability inside some browsers' <a>-in-<a>
  // handling. Portaling to body sidesteps the ancestor entirely.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const draggingRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const setZoomClamped = (next: number) => {
    const z = clampZoom(next);
    setZoom(z);
    // Snapping back to 100% also recenters - otherwise a pan offset from a
    // previous zoom level would leave the image visibly off-center at 100%.
    if (z === MIN_ZOOM) setPan({ x: 0, y: 0 });
  };

  const zoomIn = () => setZoomClamped(zoom + ZOOM_STEP);
  const zoomOut = () => setZoomClamped(zoom - ZOOM_STEP);

  const handleWheel = (e: WheelEvent<HTMLImageElement>) => {
    e.preventDefault();
    setZoomClamped(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  };

  const handleMouseDown = (e: ReactMouseEvent<HTMLImageElement>) => {
    if (zoom === MIN_ZOOM) return;
    e.preventDefault();
    draggingRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const drag = draggingRef.current;
      if (!drag) return;
      setPan({ x: drag.panX + (e.clientX - drag.startX), y: drag.panY + (e.clientY - drag.startY) });
    };
    const handleMouseUp = () => {
      draggingRef.current = null;
      setIsDragging(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-" || e.key === "_") zoomOut();
    };
    window.addEventListener("keydown", onKeyDown);
    // Lock page scroll while the lightbox is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, zoom]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-black/85 p-4 backdrop-blur-sm"
      onClick={() => {
        // A click that ends a drag shouldn't also close the lightbox.
        if (!isDragging) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <div className="absolute right-4 top-4 flex items-center gap-2 sm:right-6 sm:top-6">
        <a
          href={src}
          download
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label="Download image"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          <Download size={18} />
        </a>
        <button
          onClick={onClose}
          aria-label="Close preview"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          <X size={20} />
        </button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Attachment preview"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        draggable={false}
        className={`max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl transition-transform duration-100 ${
          zoom > MIN_ZOOM ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-out"
        }`}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      />

      {/* Pro zoom control - +/- with a live percentage, not just a fixed
          hover-magnifier factor. Click targets are large enough for touch
          too, even though drag-to-pan above is mouse-only. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/10 p-1.5 backdrop-blur"
      >
        <button
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Zoom out"
          className="grid h-9 w-9 place-items-center rounded-full text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Minus size={16} />
        </button>
        <span className="w-14 text-center text-xs font-bold tabular-nums text-white">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
          className="grid h-9 w-9 place-items-center rounded-full text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
