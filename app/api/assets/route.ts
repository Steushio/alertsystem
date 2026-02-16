import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET() {
  const { blobs } = await list();

  const gifs = blobs
    .filter(b => b.pathname.endsWith(".gif"))
    .map(b => b.url);

  const sounds = blobs
    .filter(b => b.pathname.endsWith(".mp3") || b.pathname.endsWith(".wav"))
    .map(b => b.url);

  // Add default if needed, or rely on uploaded blobs
  if (gifs.length === 0) gifs.push("/gifs/anya.gif");
  if (sounds.length === 0) sounds.push("/sounds/anya.mp3");

  return NextResponse.json({
    gifs,
    sounds,
  });
}
