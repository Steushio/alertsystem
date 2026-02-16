import { pushAlert } from "@/lib/alertQueue";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "No token" }, { status: 400 });
  }

  const body = await req.json();
  console.log("LOG: Webhook received body:", JSON.stringify(body));

  // MacroDroid sends message text (usually notification title/body)
  const message: string = body.message || "";
  console.log("LOG: Webhook message text:", message);

  // Extract amount (₹10 / Rs 10 / received ₹100)
  // Using Unicode \u20B9 for ₹ to avoid encoding issues
  const amountMatch = message.match(/(?:\u20B9|Rs\.?)\s*([0-9]+(?:\.[0-9]{1,2})?)/i);

  // Extract name (from Rahul / from bhun)
  const nameMatch = message.match(/from\s+([a-z0-9\s]+?)(?:\s+|$)/i);

  const amount = amountMatch ? amountMatch[1] : "0";
  const name = nameMatch ? nameMatch[1].trim() : "Someone";

  console.log("LOG: Parsed data:", { name, amount });

  await pushAlert(token, { name, amount: parseFloat(amount) });

  return NextResponse.json({
    ok: true,
    parsed: { name, amount },
  });
}
