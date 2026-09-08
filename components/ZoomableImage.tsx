"use client";

import { useState, type MouseEvent } from "react";
import Image, { type ImageProps } from "next/image";
import { ZoomIn } from "lucide-react";
import ImageLightbox from "./chat/ImageLightbox";

interface ZoomableImageProps extends Omit<ImageProps, "onClick"> {
  /** Hides the hover zoom-icon affordance for small thumbnails (e.g. a
   * 64px "other tiers" row) where the icon would overwhelm the image -
   * clicking still opens the lightbox either way. */
  hideZoomIcon?: boolean;
  /** Wrapping element is normally inside a parent <Link> (service cards
   * navigate on click) - stopPropagation + preventDefault keep the zoom
   * click from also triggering that navigation. */
  stopParentNavigation?: boolean;
}

/** A next/image that opens a full-screen zoom lightbox on click, instead of
 * (or in addition to) whatever the surrounding element does. Reuses the
 * lightbox built for chat image attachments - same zoom/download/dismiss
 * behavior, now used for product/service photography. */
export default function ZoomableImage({
  hideZoomIcon = false,
  stopParentNavigation = true,
  className,
  ...imageProps
}: ZoomableImageProps) {
  const [zoomed, setZoomed] = useState(false);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (stopParentNavigation) {
      e.preventDefault();
      e.stopPropagation();
    }
    setZoomed(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Zoom in on ${typeof imageProps.alt === "string" ? imageProps.alt : "image"}`}
        className="group/zoom absolute inset-0 h-full w-full cursor-zoom-in"
      >
        <Image {...imageProps} className={className} />
        {!hideZoomIcon && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover/zoom:bg-black/15 group-hover/zoom:opacity-100">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow-lg backdrop-blur">
              <ZoomIn size={16} />
            </span>
          </span>
        )}
      </button>
      {zoomed && typeof imageProps.src === "string" && (
        <ImageLightbox src={imageProps.src} onClose={() => setZoomed(false)} />
      )}
    </>
  );
}
