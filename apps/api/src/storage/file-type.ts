/** Content type from the file's magic bytes. The client-sent MIME type is never trusted. */
export function sniffContentType(buffer: Buffer): string | null {
  const starts = (...bytes: number[]) => bytes.every((b, i) => buffer[i] === b);
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf"; // %PDF-
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x52, 0x49, 0x46, 0x46) && buffer.subarray(8, 12).toString("ascii") === "WEBP")
    return "image/webp";
  return null;
}

export const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
