
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function createUnsubscribeToken(
  subscriberId: string,
  secret: string,
  expiresInDays = 30,
): Promise<string> {
  const payload = {
    sub: subscriberId,
    exp: Math.floor(Date.now() / 1000) +
      expiresInDays * 24 * 60 * 60,
  };

  const encodedPayload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload)),
  );

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encodedPayload),
  );

  const encodedSignature = base64UrlEncode(
    new Uint8Array(signature),
  );

  return `${encodedPayload}.${encodedSignature}`;
}