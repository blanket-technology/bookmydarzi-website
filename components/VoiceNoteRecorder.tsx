"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Square, Trash2, Loader2 } from "lucide-react";

export interface VoiceNoteRecorderProps {
  url: string | null;
  onUploaded: (url: string) => void;
  onRemove: () => void;
}

// Mirrors react_app's VoiceNoteRecorder.tsx: same 60s cap, same optional/
// collapsed-by-default "add a voice note" pattern, same POST-then-hand-back-
// a-url contract. Uses the browser's MediaRecorder/getUserMedia instead of
// expo-audio since this runs in the browser, not the app - no existing
// precedent for browser audio recording in this repo, built fresh.
const MAX_DURATION_SECONDS = 60;

function formatSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Prefer a format the backend's assert_audio_magic_bytes/ImageKit ext map
// actually recognizes (m4a/wav/mp3) - MediaRecorder's real output codec is
// still webm/ogg in most browsers regardless of mimeType hint, but audio/mp4
// is honored in Safari and gets us a real .m4a-compatible container there.
function pickMimeType(): string {
  const candidates = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(type)) {
      return type;
    }
  }
  return "";
}

export default function VoiceNoteRecorder({ url, onUploaded, onRemove }: VoiceNoteRecorderProps) {
  const [expanded, setExpanded] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
    };
  }, []);

  const uploadBlob = useCallback(
    async (blob: Blob) => {
      setUploading(true);
      setError(null);
      try {
        const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `voice-note.${ext}`, { type: blob.type || "audio/webm" });
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/orders/voice-note", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Couldn't upload your voice note.");
        onUploaded(data.url as string);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't upload your voice note.");
      } finally {
        setUploading(false);
      }
    },
    [onUploaded],
  );

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearTimer();
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        void uploadBlob(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => {
          const next = s + 1;
          if (next >= MAX_DURATION_SECONDS) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch {
      setError("Couldn't access your microphone. Check your browser's mic permission and try again.");
    }
  }, [stopRecording, uploadBlob]);

  const togglePlayback = () => {
    const el = audioElRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.currentTime = 0;
      void el.play();
    }
  };

  if (!expanded && !url) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-ink"
      >
        <Mic size={16} />
        Add a voice note (optional)
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-[#f8f6f1] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Voice note (optional)</p>
      <p className="mt-1 text-xs text-gray-500">
        Find speaking easier than typing? Record a short note for your tailor.
      </p>

      {url ? (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlayback}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#171717] text-white"
            aria-label={playing ? "Pause voice note" : "Play voice note"}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <audio
            ref={audioElRef}
            src={url}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
          <span className="flex-1 text-sm font-semibold text-gray-700">Voice note recorded</span>
          <button
            type="button"
            onClick={onRemove}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-gray-400 hover:bg-gray-100"
            aria-label="Remove voice note"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ) : uploading ? (
        <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          Uploading…
        </div>
      ) : recording ? (
        <div className="mt-3 flex items-center gap-3">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
          <span className="flex-1 text-sm font-semibold text-gray-700">
            Recording… {formatSeconds(elapsedSeconds)} / {formatSeconds(MAX_DURATION_SECONDS)}
          </span>
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
          >
            <Square size={13} />
            Stop
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          className="mt-3 flex items-center gap-2 rounded-full bg-[#171717] px-4 py-2.5 text-sm font-bold text-white hover:-translate-y-0.5 hover:bg-black"
        >
          <Mic size={15} />
          Start recording
        </button>
      )}

      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
