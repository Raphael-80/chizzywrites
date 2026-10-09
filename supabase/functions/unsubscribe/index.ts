
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function base64UrlDecode(value: string): Uint8Array {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function verifyToken(
  encodedPayload: string,
  encodedSignature: string,
  secret: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const signature = base64UrlDecode(encodedSignature);

    return await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      new TextEncoder().encode(encodedPayload),
    );
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const { subscriberId, token } = body ?? {};

    if (
      typeof subscriberId !== "string" ||
      !subscriberId.trim() ||
      typeof token !== "string" ||
      !token.trim()
    ) {
      return jsonResponse(
        { error: "A valid subscriber ID and token are required." },
        400,
      );
    }

    const secret = Deno.env.get("UNSUBSCRIBE_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!secret || !supabaseUrl || !serviceRoleKey) {
      console.error("Required server configuration is missing.");
      return jsonResponse(
        { error: "The unsubscribe service is not configured." },
        500,
      );
    }

    const tokenParts = token.split(".");

    if (tokenParts.length !== 2) {
      return jsonResponse({ error: "Invalid unsubscribe link." }, 403);
    }

    const [encodedPayload, encodedSignature] = tokenParts;

    const signatureIsValid = await verifyToken(
      encodedPayload,
      encodedSignature,
      secret,
    );

    if (!signatureIsValid) {
      return jsonResponse({ error: "Invalid unsubscribe link." }, 403);
    }

    let payload: { sub?: unknown; exp?: unknown };

    try {
      payload = JSON.parse(
        new TextDecoder().decode(base64UrlDecode(encodedPayload)),
      );
    } catch {
      return jsonResponse({ error: "Invalid unsubscribe link." }, 403);
    }

    if (
      payload.sub !== subscriberId ||
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return jsonResponse(
        { error: "This unsubscribe link is invalid or has expired." },
        403,
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("subscribers")
      .update({ status: "unsubscribed" })
      .eq("id", subscriberId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Database update failed:", error.message);
      return jsonResponse(
        { error: "Unable to process your unsubscribe request." },
        500,
      );
    }

    if (!data) {
      return jsonResponse({ error: "Subscriber not found." }, 404);
    }

    return jsonResponse({
      message: "You have been unsubscribed successfully.",
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return jsonResponse({ error: "Invalid request." }, 400);
  }
});