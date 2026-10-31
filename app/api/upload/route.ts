import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err: unknown) {
    console.error("Upload failed:", err);
    return NextResponse.json(
      {
        error:
          "Upload failed. Make sure a Vercel Blob store is connected (BLOB_READ_WRITE_TOKEN).",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
