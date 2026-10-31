import { pushAlert } from "@/lib/alertQueue";
import { isKvConfigured } from "@/lib/kv";
import { NextResponse } from "next/server";

function parseAmount(input: unknown): number {
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  if (typeof input !== "string") return 0;
  const cleaned = input.replace(/,/g, "");
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function parseNotification(message: string): { name: string; amount: number } {
  const amountMatch = message.match(
    /(?:\u20B9|Rs\.?|INR)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i
  );

  // "received ₹100 from Rahul Kumar", "₹100 sent by Rahul"
  const fromMatch = message.match(
    /(?:from|by)\s+([A-Za-z][A-Za-z0-9 .'-]*?)(?=\s+(?:via|using|on|to|for|with)\b|[.,;!]|$)/i
  );

  // "Rahul paid you ₹100", "Rahul sent you ₹100"
  const paidMatch = message.match(
    /^([A-Za-z][A-Za-z0-9 .'-]*?)\s+(?:paid|sent|transferred)\s+(?:you|me)\b/i
  );

  const name = (fromMatch?.[1] || paidMatch?.[1] || "Someone").trim();

  return {
    name: name || "Someone",
    amount: amountMatch ? parseAmount(amountMatch[1]) : 0,
  };
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "No token provided in query params (?token=...)" },
      { status: 400 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    const raw = await req.text();
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        body = parsed as Record<string, unknown>;
      } else {
        body = { message: raw };
      }
    } catch {
      // Not JSON: treat the raw body as notification text.
      body = { message: raw };
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  console.log("LOG: Webhook received body:", JSON.stringify(body));

  let name = "Someone";
  let amount = 0;

  // Case 1: Direct JSON payload (Dashboard test button, custom scripts, payment providers)
  const directName = body.name ?? body.sender ?? body.from ?? body.payer;
  const directAmount = body.amount ?? body.value ?? body.total;

  if (directName !== undefined || directAmount !== undefined) {
    name = directName ? String(directName).trim() : "Someone";
    amount = parseAmount(directAmount);
  } else {
    // Case 2: MacroDroid / SMS / UPI notification text
    const message = String(body.message ?? body.text ?? body.title ?? "");
    console.log("LOG: Webhook message text:", message);
    ({ name, amount } = parseNotification(message));
  }

  console.log("LOG: Parsed alert data:", { name, amount });

  try {
    await pushAlert(token, { name, amount });
  } catch (err: unknown) {
    console.error("LOG: Failed to push alert to KV:", err);

    const details = err instanceof Error ? err.message : String(err);
    const configured = isKvConfigured();

    return NextResponse.json(
      {
        error: configured
          ? "Failed to queue alert because the Redis request failed."
          : "Failed to queue alert. No Redis database is connected to this project.",
        details,
        hint: configured
          ? "Check the Upstash Redis database status and REST token."
          : "Create/link an Upstash Redis database in Vercel Storage, then redeploy so UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are available.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    parsed: { name, amount },
  });
}
