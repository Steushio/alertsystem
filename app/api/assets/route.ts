import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET() {
  let blobs: Array<{ pathname: string; url: string }> = [];

  try {
    const res = await list();
    blobs = res.blobs;
  } catch (err) {
    console.warn("Vercel Blob list warning (BLOB_READ_WRITE_TOKEN might not be configured):", err);
  }

  const gifs = blobs
    .filter(b => b.pathname.toLowerCase().endsWith(".gif"))
    .map(b => ({ name: b.pathname.split("/").pop() || "gif", url: b.url }));

  const sounds = blobs
    .filter(b => b.pathname.toLowerCase().endsWith(".mp3") || b.pathname.toLowerCase().endsWith(".wav"))
    .map(b => ({ name: b.pathname.split("/").pop() || "sound", url: b.url }));

  // Always include local defaults
  gifs.unshift({ name: "anya.gif (local)", url: "/gifs/anya.gif" });
  sounds.unshift({ name: "anya.wav (local)", url: "/sounds/anya.wav" });

  return NextResponse.json({ gifs, sounds });
}
