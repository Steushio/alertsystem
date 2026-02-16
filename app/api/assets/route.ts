import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET() {
  const { blobs } = await list();

  const gifs = blobs
    .filter(b => b.pathname.toLowerCase().endsWith(".gif"))
    .map(b => ({ name: b.pathname.split("/").pop(), url: b.url }));

  const sounds = blobs
    .filter(b => b.pathname.toLowerCase().endsWith(".mp3") || b.pathname.toLowerCase().endsWith(".wav"))
    .map(b => ({ name: b.pathname.split("/").pop(), url: b.url }));

  // Always include local defaults
  gifs.unshift({ name: "anya.gif (local)", url: "/gifs/anya.gif" });
  sounds.unshift({ name: "anya.wav (local)", url: "/sounds/anya.wav" });

  return NextResponse.json({ gifs, sounds });
}
