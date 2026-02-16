import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getConfig, saveConfig } from "@/lib/configStore";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  let userId: string | null = null;

  if (token) {
    const { getUserByToken } = await import("@/lib/userStore");
    const user = await getUserByToken(token);
    if (user) userId = user.id;
  } else {
    const session = await getServerSession(authOptions);
    if (session) userId = session.user.id;
  }

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getConfig(userId);
  return NextResponse.json(config);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({}, { status: 401 });

  const body = await req.json();
  await saveConfig(session.user.id, body);

  // Ensure token is indexed for the overlay (for existing users)
  const { getUser } = await import("@/lib/userStore");
  const user = await getUser(session.user.id);
  if (user?.token) {
    const { kv } = await import("@vercel/kv");
    await kv.set(`token:${user.token}`, user.id);
  }

  return NextResponse.json({ ok: true });
}
