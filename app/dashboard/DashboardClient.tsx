"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

const FONTS = ["Arial", "Poppins", "Montserrat", "Inter"];

interface Config {
  font: string; // Renamed from fontFamily to match backend
  color: string;
  duration: number;
  gif: string;
  sound: string;
  template?: string; // Alert text template
  [key: string]: string | number | undefined;
}

export default function DashboardClient() {
  const [config, setConfig] = useState<Config | null>(null);
  const [assets, setAssets] = useState<{ gifs: { name: string; url: string }[]; sounds: { name: string; url: string }[] }>({
    gifs: [],
    sounds: [],
  });
  const [user, setUser] = useState<{ id: string; token?: string } | null>(null);
  const [gifFile, setGifFile] = useState<File | null>(null);
  const [soundFile, setSoundFile] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
      const cfg = await fetch("/api/config").then(r => r.json());
      // Handle legacy fontFamily or incorrect structure if needed, but primarily relying on Store
      setConfig(cfg);

      try {
        const ast = await fetch("/api/assets").then(r => r.json());
        setAssets(ast);
      } catch { }

      try {
        const me = await fetch("/api/me").then(r => r.json());
        setUser(me);
      } catch { }
    }
    load();
  }, []);

  function update(key: string, value: string | number) {
    setConfig((c: Config | null) => (c ? { ...c, [key]: value } : null));
  }

  async function upload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return fetch("/api/upload", { method: "POST", body: fd }).then(r => r.json());
  }

  async function save() {
    if (!config) return;
    const next: Config = { ...config };

    if (gifFile) next.gif = (await upload(gifFile)).url;
    if (soundFile) next.sound = (await upload(soundFile)).url;

    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });

    // Refresh assets to show new upload in dropdown
    try {
      const ast = await fetch("/api/assets").then(r => r.json());
      setAssets(ast);
    } catch { }

    setConfig(next);
    setGifFile(null);
    setSoundFile(null);
    alert("Saved!");
  }

  if (!config) return <div style={{ padding: 40 }}>Loading…</div>;

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const overlayUrl = user?.token
    ? `${origin}/overlay?token=${user.token}`
    : "";

  const webhookUrl = user?.token
    ? `${origin}/api/webhook?token=${user.token}`
    : "";

  const previewText = (config.template || "{name} tipped ₹{amount}")
    .replace("{name}", "Someone")
    .replace("{amount}", "100");

  // Fix GIF URL: If it starts with http, use it as is. If not, treat as relative path (for legacy) or public URL
  const getGifUrl = (url: string) => {
    if (!url) return "/gifs/anya.gif";
    if (url.startsWith("http") || url.startsWith("/")) return url;
    return `/${url}`; // Fallback for local files if any left
  };

  return (
    <div className="page">
      {user?.id && (
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 40,
            fontWeight: 600,
            opacity: 0.9,
            fontSize: 14,
          }}
        >
          👤 {user.id}
        </div>
      )}

      <div className="panel">
        <h2>📡 Your Alert URLs</h2>

        <label>Overlay URL (OBS)</label>
        <div className="row">
          <input value={overlayUrl} readOnly />
          <button onClick={() => navigator.clipboard.writeText(overlayUrl)}>
            Copy
          </button>
        </div>

        <label>Webhook URL (Payments / MacroDroid)</label>
        <div className="row">
          <input value={webhookUrl} readOnly />
          <button onClick={() => navigator.clipboard.writeText(webhookUrl)}>
            Copy
          </button>
        </div>

        <hr />

        <h2>🎛 Alert Dashboard</h2>

        <label>Alert Text Template</label>
        <input
          type="text"
          placeholder="{name} tipped ₹{amount}"
          value={config.template || ""}
          onChange={e => update("template", e.target.value)}
        />
        <small style={{ color: "#9ca3af", marginTop: -4, fontSize: 12 }}>
          Use <b>{"{name}"}</b> and <b>{"{amount}"}</b> variables.
        </small>

        <label>Font</label>
        <select
          value={config.font}
          onChange={e => update("font", e.target.value)}
        >
          {FONTS.map(f => (
            <option key={f}>{f}</option>
          ))}
        </select>

        <label>Text Color</label>
        <input
          type="color"
          value={config.color}
          onChange={e => update("color", e.target.value)}
        />

        <label>Duration (ms)</label>
        <input
          type="number"
          value={config.duration}
          onChange={e => update("duration", +e.target.value)}
        />

        <label>GIF</label>
        <select
          value={config.gif}
          onChange={e => update("gif", e.target.value)}
        >
          {assets.gifs.map(g => (
            <option key={g.url} value={g.url}>{g.name}</option>
          ))}
        </select>
        <input
          type="file"
          accept="image/gif"
          onChange={e => setGifFile(e.target.files?.[0] || null)}
        />

        <label>Sound</label>
        <select
          value={config.sound}
          onChange={e => update("sound", e.target.value)}
        >
          {assets.sounds.map(s => (
            <option key={s.url} value={s.url}>{s.name}</option>
          ))}
        </select>
        <input
          type="file"
          accept="audio/*"
          onChange={e => setSoundFile(e.target.files?.[0] || null)}
        />

        <button className="save" onClick={save}>Save Changes</button>
        <button
          className="logout"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Logout
        </button>
      </div>

      <div className="preview">
        <div className="preview-container">
          {config.gif && (
            <img
              src={getGifUrl(config.gif)}
              style={{ maxHeight: 200, width: "auto" }}
              alt="GIF preview"
              onError={() => console.error("Failed to load GIF:", config.gif)}
            />
          )}

          <div
            style={{
              fontFamily: config.font,
              color: config.color,
              fontWeight: "bold",
              textAlign: "center",
              fontSize: 24,
              marginTop: 20,
            }}
          >
            {previewText}
          </div>
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #0b0f14;
          display: flex;
          gap: 40px;
          padding: 40px;
          color: #fff;
          position: relative;
        }
        .panel {
          width: 380px;
          background: #111827;
          padding: 24px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        input, select {
          background: #1f2933;
          color: #fff;
          border: 1px solid #374151;
          border-radius: 8px;
          padding: 10px;
        }
        .row {
          display: flex;
          gap: 6px;
        }
        .row input {
          flex: 1;
        }
        button {
          padding: 10px;
          border-radius: 8px;
          border: none;
          background: #22c55e;
          font-weight: bold;
          cursor: pointer;
        }
        .save {
          margin-top: 10px;
        }
        .logout {
          background: #374151;
        }
        hr {
          margin: 16px 0;
          border: 1px solid #1f2933;
        }
        .preview {
          background: #000;
          padding: 30px;
          border-radius: 16px;
          min-width: 320px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
      `}</style>
    </div>
  );
}
