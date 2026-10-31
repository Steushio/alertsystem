"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface AlertData {
  name: string;
  amount: number | string;
}

interface AlertConfig {
  font: string;
  color: string;
  duration: number;
  template: string;
  gif?: string;
  sound?: string;
}

const DEFAULT_CONFIG: AlertConfig = {
  font: "Poppins",
  color: "#ffffff",
  duration: 5,
  template: "{name} tipped ₹{amount}",
  gif: "/gifs/anya.gif",
  sound: "/sounds/anya.wav",
};

function OverlayContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [alert, setAlert] = useState<AlertData | null>(null);
  const [config, setConfig] = useState<AlertConfig>(DEFAULT_CONFIG);

  // 🔊 Web Audio refs (OBS & browser safe). One context for the whole page.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const loadedSoundUrlRef = useRef<string | null>(null);

  // 🔒 Prevent race conditions and duplicate popping
  const isBusyRef = useRef(false);
  const configRef = useRef<AlertConfig>(DEFAULT_CONFIG);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep configRef in sync
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // OBS Browser Sources are transparent by default; the root layout paints the
  // body, so explicitly clear it on this route or the overlay gets a solid box.
  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.background;
    const prevBody = document.body.style.background;
    html.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      html.style.background = prevHtml;
      document.body.style.background = prevBody;
    };
  }, []);

  // Unlock audio on click (crucial when testing overlay in normal browser tabs)
  useEffect(() => {
    const unlockAudio = async () => {
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        try {
          await audioCtxRef.current.resume();
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("click", unlockAudio);
    return () => window.removeEventListener("click", unlockAudio);
  }, []);

  // Release the AudioContext when leaving the overlay (browsers cap them at ~6)
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      audioBufferRef.current = null;
      loadedSoundUrlRef.current = null;
    };
  }, []);

  // Fetch config periodically
  useEffect(() => {
    if (!token) return;

    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/config?token=${token}&_=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data && !data.error) {
          setConfig((prev) => ({
            ...prev,
            ...data,
            duration: Number(data.duration) || 5,
          }));
        }
      } catch (err) {
        console.error("Config fetch failed:", err);
      }
    };

    fetchConfig();
    const interval = setInterval(fetchConfig, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // Load sound once or whenever the sound URL actually changes
  useEffect(() => {
    const soundUrl = config.sound || "/sounds/anya.wav";
    const finalSoundUrl =
      soundUrl.startsWith("http") || soundUrl.startsWith("/")
        ? soundUrl
        : `/${soundUrl}`;

    if (loadedSoundUrlRef.current === finalSoundUrl && audioBufferRef.current) {
      return;
    }

    let cancelled = false;

    const loadAudio = async () => {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;

        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;

        const res = await fetch(finalSoundUrl, { cache: "force-cache" });
        if (!res.ok) throw new Error(`Sound request failed (${res.status})`);
        const arrayBuffer = await res.arrayBuffer();

        const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
          ctx.decodeAudioData(arrayBuffer, resolve, reject);
        });

        if (cancelled) return;

        audioBufferRef.current = buffer;
        loadedSoundUrlRef.current = finalSoundUrl;
      } catch (err) {
        console.error("Audio load failed:", err);
      }
    };

    loadAudio();

    return () => {
      cancelled = true;
    };
  }, [config.sound]);

  // Poll alerts safely without duplicate trigger storms
  useEffect(() => {
    if (!token) return;

    const playSound = async () => {
      try {
        const ctx = audioCtxRef.current;
        const buffer = audioBufferRef.current;
        if (!ctx || !buffer) return;

        if (ctx.state === "suspended") {
          await ctx.resume().catch(() => {});
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch (soundErr) {
        console.error("Sound play failed:", soundErr);
      }
    };

    const poll = async () => {
      // Don't poll if an alert is currently displaying
      if (isBusyRef.current) return;

      try {
        const res = await fetch(`/api/alert?token=${token}&_=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!data?.alert || isBusyRef.current) return;

        // Lock before any await so concurrent polls cannot queue duplicates.
        isBusyRef.current = true;
        setAlert(data.alert);
        await playSound();

        // Duration may be seconds or milliseconds.
        const currentDuration = configRef.current.duration || 5;
        const durationMs =
          currentDuration > 100 ? currentDuration : currentDuration * 1000;

        hideTimerRef.current = setTimeout(async () => {
          setAlert(null);
          try {
            // Pop the alert from the queue only after it has fully played.
            await fetch(`/api/alert?token=${token}`, { method: "POST" });
          } catch (clearErr) {
            console.error("Clear alert failed:", clearErr);
          } finally {
            // Allow the next alert to be processed after a small gap.
            hideTimerRef.current = setTimeout(() => {
              isBusyRef.current = false;
            }, 500);
          }
        }, durationMs);
      } catch (pollErr) {
        console.error("Poll error:", pollErr);
        isBusyRef.current = false;
      }
    };

    const interval = setInterval(poll, 1000);
    return () => {
      clearInterval(interval);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      isBusyRef.current = false;
    };
  }, [token]);

  if (!alert) return null;

  const template = config.template || "{name} tipped ₹{amount}";
  const text = template
    .replace("{name}", String(alert.name || "Someone"))
    .replace("{amount}", String(alert.amount || 0));

  const getGifUrl = (url?: string) => {
    if (!url) return "/gifs/anya.gif";
    if (url.startsWith("http") || url.startsWith("/")) return url;
    return `/${url}`;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
        pointerEvents: "none",
        fontFamily: config.font || "Poppins, sans-serif",
      }}
    >
      {/* GIF */}
      <img
        src={getGifUrl(config.gif)}
        alt=""
        style={{
          width: 300,
          height: "auto",
          zIndex: 10,
        }}
      />

      {/* TEXT */}
      <div
        style={{
          fontSize: 48,
          fontWeight: "bold",
          color: config.color || "#ffffff",
          textShadow: "0 0 10px black",
          zIndex: 11,
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </div>
  );
}

export default function OverlayPage() {
  return (
    <Suspense fallback={null}>
      <OverlayContent />
    </Suspense>
  );
}
