"use client";

import { useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import ImageLightbox from "./chat/ImageLightbox";

const ZOOM_FACTOR = 2;

interface HoverZoomImageProps {
  src: string;
  alt: string;
  /** Priority-loads the base image (hero images above the fold). */
  priority?: boolean;
  /** Height + rounding classes for the image container - HoverZoomImage
   * owns its own `relative overflow-hidden` wrapper (needed for the
   * next/image `fill` + zoom overlay), so callers pass sizing here rather
   * than wrapping it themselves. */
  className?: string;
}

/** Product-image zoom: hovering shows a magnified crop directly over the
 * same image, tracking the cursor - no separate side panel (that layout
 * broke in a two-column grid: not enough room, and content from the page
 * behind it bled through the panel's rounded corner in production). This
 * overlay approach can't have that failure mode since it never extends
 * past the image's own box. No hover on touch devices, so mobile falls
 * back to tapping the image to open the full-screen ImageLightbox. */
export default function HoverZoomImage({ src, alt, priority, className }: HoverZoomImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [cursorPct, setCursorPct] = useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCursorPct({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
  };

  return (
    <div
      ref={containerRef}
      // Only desktop/mouse-capable devices get the hover magnifier - touch
      // devices tap through to the lightbox instead (see button below).
      // (hover: hover) is the correct feature check here, not a breakpoint,
      // since a touch laptop or a large tablet with a mouse should still
      // get real hover behavior.
      className={`group relative overflow-hidden [@media(hover:hover)]:cursor-zoom-in ${className ?? ""}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover"
        priority={priority}
      />

      {/* Zoomed crop, drawn over the same box on hover - can never overflow
          it since it's sized/positioned identically to the base image. */}
      {isHovering && (
        <div
          className="pointer-events-none absolute inset-0 hidden bg-no-repeat [@media(hover:hover)]:block"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: `${ZOOM_FACTOR * 100}%`,
            backgroundPosition: `${cursorPct.x}% ${cursorPct.y}%`,
          }}
        />
      )}

      {/* Tap target for touch devices only - desktop relies on hover, so
          this stays invisible/inert there rather than fighting the
          mousemove handler above with its own click behavior. */}
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        aria-label={`Zoom in on ${alt}`}
        className="absolute inset-0 h-full w-full [@media(hover:hover)]:pointer-events-none"
      />

      {lightboxOpen && <ImageLightbox src={src} onClose={() => setLightboxOpen(false)} />}
    </div>
  );
}
