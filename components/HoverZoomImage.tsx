"use client";

import { useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import ImageLightbox from "./chat/ImageLightbox";

const ZOOM_FACTOR = 2.5;

interface HoverZoomImageProps {
  src: string;
  alt: string;
  /** Priority-loads the base image (hero images above the fold). */
  priority?: boolean;
  /** Height + rounding classes for the image container - HoverZoomImage
   * owns its own `relative overflow-hidden` wrapper (needed for the
   * next/image `fill` + magnifier panel), so callers pass sizing here
   * rather than wrapping it themselves. */
  className?: string;
}

/** Amazon/Flipkart-style product zoom: on desktop, hovering the image shows
 * a magnified crop in a panel beside it, tracking the cursor position - no
 * click needed. There's no hover on touch devices, so mobile falls back to
 * tapping the image to open the existing full-screen ImageLightbox instead
 * (verified via a pointer-media query, not viewport width, since a hover
 * capability is what actually matters here). */
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
    <div className="relative">
      <div
        ref={containerRef}
        // Only desktop/mouse-capable devices get the hover magnifier -
        // touch devices tap through to the lightbox instead (see button
        // below). (hover: hover) is the correct feature check here, not a
        // breakpoint, since a touch laptop or a large tablet with a mouse
        // should still get real hover behavior.
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
        {/* Tap target for touch devices only - desktop relies on hover, so
            this stays invisible/inert there rather than fighting the
            mousemove handler above with its own click behavior. */}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label={`Zoom in on ${alt}`}
          className="absolute inset-0 h-full w-full [@media(hover:hover)]:pointer-events-none"
        />
      </div>

      {/* Magnified panel - positioned beside the image on wide viewports,
          hidden entirely below md (no room for a side panel, and no hover
          to trigger it anyway). */}
      {isHovering && (
        <div
          className="pointer-events-none absolute left-full top-0 z-20 ml-4 hidden aspect-square w-full overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl md:block"
          aria-hidden
        >
          <div
            className="h-full w-full bg-no-repeat"
            style={{
              backgroundImage: `url(${src})`,
              backgroundSize: `${ZOOM_FACTOR * 100}%`,
              backgroundPosition: `${cursorPct.x}% ${cursorPct.y}%`,
            }}
          />
        </div>
      )}

      {lightboxOpen && <ImageLightbox src={src} onClose={() => setLightboxOpen(false)} />}
    </div>
  );
}
