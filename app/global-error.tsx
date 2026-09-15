"use client";

import { useEffect } from "react";

// Catches an error thrown from the ROOT LAYOUT itself (app/layout.tsx) -
// error.tsx above can't catch this, since it renders inside the layout it
// would need to replace. Must render its own complete <html>/<body>: there
// is no surrounding layout left to rely on once this is showing.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[BMD] Unhandled root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 20px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#b4832e",
            }}
          >
            Something went wrong
          </p>
          <h1 style={{ marginTop: 12, fontSize: 28, fontWeight: 900 }}>
            BookMyDarzi hit a snag
          </h1>
          <p style={{ marginTop: 12, color: "#4b5563", maxWidth: 420 }}>
            We couldn&apos;t load the site. Please try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 28,
              borderRadius: 12,
              background: "#111",
              color: "#fff",
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 900,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
