import { pushAlert } from "@/lib/alertQueue";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "No token" }, { status: 400 });
  }

  const body = await req.json();

  // MacroDroid sends message text
  const message: string = body.message || "";

  // Extract amount (₹10 / Rs 10 / received ₹100)
  const amountMatch = message.match(/(?:₹|Rs\.?)\s*([0-9]+(?:\.[0-9]{1,2})?)/i);

  // Extract name (from Rahul / from bhun)
  const nameMatch = message.match(/from\s+([a-z0-9\s]+?)(?:\s+|$)/i);

  const amount = amountMatch ? amountMatch[1] : "0";
  const name = nameMatch ? nameMatch[1].trim() : "Someone";

  await pushAlert(token, { name, amount: parseFloat(amount) });

  return NextResponse.json({
    ok: true,
    parsed: { name, amount },
  });
}
