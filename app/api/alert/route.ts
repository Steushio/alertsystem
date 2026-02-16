import { peekAlert, clearAlert } from "@/lib/alertQueue";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ alert: null });
  }

  const alert = await peekAlert(token);
  return NextResponse.json({ alert });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ ok: false });
  }

  await clearAlert(token);
  return NextResponse.json({ ok: true });
}
