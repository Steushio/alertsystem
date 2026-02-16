import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getConfig, saveConfig } from "@/lib/configStore";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({}, { status: 401 });

  const config = await getConfig(session.user.id);
  return NextResponse.json(config);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({}, { status: 401 });

  const body = await req.json();
  await saveConfig(session.user.id, body);

  return NextResponse.json({ ok: true });
}
