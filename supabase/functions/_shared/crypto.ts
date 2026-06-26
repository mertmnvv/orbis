/**
 * Platform imza doğrulama yardımcıları.
 *
 * Getir       → HMAC-SHA256, hex kodlu   (X-Getir-Signature)
 * Yemeksepeti → HMAC-SHA256, base64 kodlu (X-Signature)
 * Trendyol    → HMAC-SHA256, hex kodlu   (X-Trendyol-Signature)
 */

const encoder = new TextEncoder();

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

function hexToBytes(hex: string): Uint8Array {
  // "sha256=abc123" formatını da destekle
  const clean = hex.startsWith("sha256=") ? hex.slice(7) : hex;
  const pairs = clean.match(/.{1,2}/g) ?? [];
  return new Uint8Array(pairs.map((b) => parseInt(b, 16)));
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Hex kodlu HMAC-SHA256 imzasını doğrular (Getir, Trendyol). */
export async function verifyHmacHex(
  secret: string,
  body: string,
  signature: string,
): Promise<boolean> {
  try {
    const key = await importHmacKey(secret);
    return crypto.subtle.verify("HMAC", key, hexToBytes(signature), encoder.encode(body));
  } catch {
    return false;
  }
}

/** Base64 kodlu HMAC-SHA256 imzasını doğrular (Yemeksepeti). */
export async function verifyHmacBase64(
  secret: string,
  body: string,
  signature: string,
): Promise<boolean> {
  try {
    const key = await importHmacKey(secret);
    return crypto.subtle.verify("HMAC", key, base64ToBytes(signature), encoder.encode(body));
  } catch {
    return false;
  }
}
