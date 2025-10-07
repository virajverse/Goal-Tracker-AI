import crypto from "crypto";

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export async function signJWT(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSec = 60 * 60 * 24 * 7,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + expiresInSec, ...payload };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(body));
  const data = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  const sigB64 = base64url(sig);
  return `${data}.${sigB64}`;
}

export async function verifyJWT<T = Record<string, unknown>>(
  token: string,
  secret: string,
): Promise<T> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token");
  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const expected = base64url(
    crypto.createHmac("sha256", secret).update(data).digest(),
  );
  if (expected !== sigB64) throw new Error("Invalid signature");
  const payload: unknown = JSON.parse(
    Buffer.from(payloadB64, "base64").toString(),
  );
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload && typeof payload === "object" && "exp" in payload) {
    const exp = (payload as { exp?: unknown }).exp;
    if (typeof exp === "number" && nowSec > exp) {
      throw new Error("Token expired");
    }
  }
  return payload as T;
}
