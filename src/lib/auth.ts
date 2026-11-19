import crypto from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "memory_garden_session";

function getSigningSecret(): string {
  const secret =
    process.env.APP_PASSCODE ||
    process.env.PASSCODE_DAVID ||
    process.env.PASSCODE_JULLIANA;
  if (!secret) {
    throw new Error("APP_PASSCODE environment variable is not configured.");
  }
  return secret;
}

function getExpectedPasscode(uploadedBy?: string): string {
  if (uploadedBy) {
    const envKey = `PASSCODE_${uploadedBy.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    const partnerPasscode = process.env[envKey];
    if (partnerPasscode) {
      return partnerPasscode;
    }
  }
  return getSigningSecret();
}

export function verifyPasscode(input: string, uploadedBy?: string): boolean {
  const expected = getExpectedPasscode(uploadedBy);
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(uploadedBy: string): string {
  const secret = getSigningSecret();
  const payload = Buffer.from(
    JSON.stringify({ uploadedBy, iat: Date.now() }),
    "utf8"
  ).toString("base64url");
  const signature = signPayload(payload, secret);
  return `${payload}.${signature}`;
}

export function parseSessionToken(token: string | undefined): { uploadedBy: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  let secret: string;
  try {
    secret = getSigningSecret();
  } catch {
    return null;
  }

  const expectedSignature = signPayload(payload, secret);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof decoded.uploadedBy === "string" && decoded.uploadedBy.trim().length > 0) {
      return { uploadedBy: decoded.uploadedBy };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getAuthenticatedSession(): Promise<{ uploadedBy: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return parseSessionToken(token);
}
