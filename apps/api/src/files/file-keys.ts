import { randomUUID } from "node:crypto";

export type FileKind = "cv" | "photo" | "logo" | "cover";

/** users/<userId>/<kind>/<uuid>.<ext> or companies/<companyId>/<kind>/<uuid>.<ext> */
export function userFileKey(userId: string, kind: "cv" | "photo", ext: string): string {
  return `users/${userId}/${kind}/${randomUUID()}.${ext}`;
}

export function companyFileKey(companyId: string, kind: "logo" | "cover", ext: string): string {
  return `companies/${companyId}/${kind}/${randomUUID()}.${ext}`;
}

export interface ParsedKey {
  owner: "users" | "companies";
  ownerId: string;
  kind: FileKind;
}

const KEY_PATTERN =
  /^(users|companies)\/([a-z0-9]+)\/(cv|photo|logo|cover)\/[0-9a-f-]{36}\.(pdf|png|jpg|webp)$/;

export function parseFileKey(key: string): ParsedKey | null {
  const match = KEY_PATTERN.exec(key);
  if (!match) return null;
  return { owner: match[1] as ParsedKey["owner"], ownerId: match[2]!, kind: match[3] as FileKind };
}

/** Public path the web app uses; the API redirects it to a signed URL. */
export const fileUrl = (key: string | null | undefined): string | null =>
  key ? `/api/files/${key}` : null;
