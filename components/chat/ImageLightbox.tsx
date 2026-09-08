"use client";

import { useEffect } from "react";
import { Download, X } from "lucide-react";

/** Full-screen zoom overlay for a chat image attachment. Replaces the
 * previous behavior of opening the image in a new browser tab - keeps the
 * customer inside the chat panel/site, with a proper backdrop-dismiss,
 * Escape-to-close, and a direct download action. */
export default function ImageLightbox({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    // Lock page scroll while the lightbox is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
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
        className="max-h-[88vh] max-w-[92vw] cursor-zoom-out rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
}
