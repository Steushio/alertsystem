import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  changePassword,
  getUser,
  verifyPassword,
} from "@/lib/userStore";

export const dynamic = "force-dynamic";

const MIN_LENGTH = 8;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current and new password are required." },
      { status: 400 }
    );
  }

  if (newPassword.length < MIN_LENGTH) {
    return NextResponse.json(
      { error: `New password must be at least ${MIN_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const user = await getUser(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await verifyPassword(user, currentPassword);
  if (!valid) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 403 }
    );
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "New password must be different from the current one." },
      { status: 400 }
    );
  }

  try {
    await changePassword(user, newPassword);
  } catch (err: unknown) {
    console.error("Change password failed:", err);
    return NextResponse.json(
      { error: "Could not update the password. Try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
