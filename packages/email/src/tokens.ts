import { createHmac, timingSafeEqual } from "node:crypto";
import { NotificationType } from "@jobify/shared";

/**
 * Unsubscribe links carry `<userId>.<type>.<signature>`. The HMAC (keyed with a server secret)
 * proves the link came from us, so one click can turn off that kind of email without signing
 * in, and nobody can build a link for someone else. Tokens don't expire: an old email's link
 * should keep working.
 */
const sign = (data: string, secret: string) =>
  createHmac("sha256", `unsubscribe:${secret}`).update(data).digest("base64url");

export function unsubscribeToken(userId: string, type: NotificationType, secret: string): string {
  const data = `${userId}.${type}`;
  return `${data}.${sign(data, secret)}`;
}

export function verifyUnsubscribeToken(
  token: string,
  secret: string,
): { userId: string; type: NotificationType } | null {
  const [userId, type, signature, ...rest] = token.split(".");
  if (!userId || !type || !signature || rest.length > 0) return null;
  const parsed = NotificationType.safeParse(type);
  if (!parsed.success) return null;
  const expected = Buffer.from(sign(`${userId}.${type}`, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { userId, type: parsed.data };
}
