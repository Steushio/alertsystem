import { peekAlert, clearAlert } from "@/lib/alertQueue";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ alert: null });
  }

  try {
    const alert = await peekAlert(token);
    return NextResponse.json({ alert });
  } catch (err: unknown) {
    console.error("LOG: Error in GET /api/alert:", err);
    return NextResponse.json(
      { alert: null, error: err instanceof Error ? err.message : String(err) },
      { status: 503 }
    );
  }
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await clearAlert(token);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("LOG: Error in POST /api/alert:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 503 }
    );
  }
}
