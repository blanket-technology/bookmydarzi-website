"use client";

import { useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import type { ServiceReview } from "@/lib/services/catalog";

// Mirrors react_app/app/service-details.tsx's review card exactly (same
// star row, same date format, same "No comment" fallback) plus a photo
// thumbnail row with tap-to-zoom, since this page is a server component
// and the zoom modal needs client state.
export default function ReviewCard({ review }: { review: ServiceReview }) {
  const [zoomedUrl, setZoomedUrl] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={12}
              className={s <= review.rating ? "fill-gold-deep text-gold-deep" : "text-gray-200"}
            />
          ))}
        </div>
        {review.created_at && (
          <p className="text-[11px] text-gray-400">
            {new Date(review.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
      </div>
      {review.comment && (
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">{review.comment}</p>
      )}
      {review.photo_urls && review.photo_urls.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {review.photo_urls.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => setZoomedUrl(url)}
              className="shrink-0 overflow-hidden rounded-lg"
              aria-label="View review photo"
            >
              <Image src={url} alt="" width={56} height={56} className="h-14 w-14 object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoomedUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6"
          onClick={() => setZoomedUrl(null)}
        >
          <Image
            src={zoomedUrl}
            alt=""
            width={800}
            height={800}
            className="max-h-[85vh] w-auto max-w-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
