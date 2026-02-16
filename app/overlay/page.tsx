"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function OverlayContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  /* eslint-disable @next/next/no-img-element */
  const [alert, setAlert] = useState<{ name: string; amount: string } | null>(null);
  const [config, setConfig] = useState<{
    font: string;
    color: string;
    template: string;
    gif?: string;
    sound?: string;
  } | null>(null);

  // 🔊 Web Audio refs (OBS-safe)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // 🔒 Prevent repeated sound
  const soundPlayedRef = useRef(false);

  // fetch config once
  useEffect(() => {
    if (!token) return;

    fetch("/api/config")
      .then(res => res.json())
      .then(setConfig);
  }, [token]);

  // 🔊 init & unlock audio ONCE
  useEffect(() => {
    const initAudio = async () => {
      try {
        const AudioCtx =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        // Use configured sound or fallback
        const soundUrl = config?.sound || "/sounds/anya.wav";
        // Handle Vercel Blob URLs vs local paths
        const finalSoundUrl = soundUrl.startsWith("http") || soundUrl.startsWith("/")
          ? soundUrl
          : `/${soundUrl}`;

        const res = await fetch(finalSoundUrl);
        const arrayBuffer = await res.arrayBuffer();

        const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
          ctx.decodeAudioData(arrayBuffer, resolve, reject);
        });

        audioBufferRef.current = buffer;

        if (ctx.state === "suspended") {
          await ctx.resume();
        }
      } catch (err) {
        console.error("Audio init failed", err);
      }
    };

    if (config) {
      initAudio();
    }
  }, [config]);

  // poll alerts
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/alert?token=${token}`);
      const data = await res.json();

      if (data.alert) {
        setAlert(data.alert);

        // 🔊 PLAY SOUND ONLY ONCE
        if (
          !soundPlayedRef.current &&
          audioCtxRef.current &&
          audioBufferRef.current
        ) {
          const source = audioCtxRef.current.createBufferSource();
          source.buffer = audioBufferRef.current;
          source.connect(audioCtxRef.current.destination);
          source.start(0);

          soundPlayedRef.current = true;
        }

        setTimeout(async () => {
          setAlert(null);
          soundPlayedRef.current = false; // 🔓 reset for next alert
          await fetch(`/api/alert?token=${token}`, { method: "POST" });
        }, 5000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [token]);

  if (!alert || !config) return null;

  const template = config.template || "{name} tipped ₹{amount}";

  const text = template
    .replace("{name}", alert.name)
    .replace("{amount}", alert.amount);

  const getGifUrl = (url?: string) => {
    if (!url) return "/gifs/anya.gif";
    if (url.startsWith("http") || url.startsWith("/")) return url;
    return `/${url}`;
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
        pointerEvents: "none",
        fontFamily: config.font, // Apply font
      }}
    >
      {/* GIF */}
      <img
        src={getGifUrl(config.gif)}
        alt="alert gif"
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
          color: config.color, // Apply color
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
