/**
 * Firebase Cloud Messaging v1 API — JWT tabanlı OAuth2 kimlik doğrulaması.
 *
 * Gerekli env var:
 *   FIREBASE_SERVICE_ACCOUNT_JSON — Firebase konsolundan indirilen service account JSON'ı
 *
 * Deno'nun Web Crypto API'si PKCS8/RS256 desteklediğinden firebase-admin paketi gerekmez.
 */

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

interface FcmPayload {
  fcmToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function pemToDer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----[^-]+-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function buildJwt(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64url(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  // private_key içindeki literal \n karakterlerini gerçek newline'a çevir
  const privateKey = sa.private_key.replace(/\\n/g, "\n");

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(signingInput),
  );

  return `${signingInput}.${base64url(new Uint8Array(sig))}`;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const jwt = await buildJwt(sa);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`FCM OAuth token alınamadı: ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}

export async function sendPushNotification(payload: FcmPayload): Promise<void> {
  const saJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!saJson) {
    console.warn("[fcm] FIREBASE_SERVICE_ACCOUNT_JSON tanımlı değil — push atlandı.");
    return;
  }

  const sa: ServiceAccount = JSON.parse(saJson);
  const token = await getAccessToken(sa);

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: payload.fcmToken,
          notification: { title: payload.title, body: payload.body },
          data: payload.data ?? {},
          android: { priority: "high" },
          apns: { payload: { aps: { "content-available": 1 } } },
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`FCM push başarısız (${res.status}): ${err}`);
  }
}
