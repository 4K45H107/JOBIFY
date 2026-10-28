import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { UPLOAD_LIMITS } from "@jobify/shared";
import { EXTENSIONS, sniffContentType } from "../storage/file-type";

/** Multer keeps uploads in memory; this cap is the largest any upload may be. */
export const MAX_UPLOAD_BYTES = Math.max(UPLOAD_LIMITS.cv.maxBytes, UPLOAD_LIMITS.image.maxBytes);

/** Checks size and real content type. Returns the type and file extension to store. */
export function validateUpload(
  file: Express.Multer.File | undefined,
  limits: { maxBytes: number; types: readonly string[] },
): { contentType: string; ext: string } {
  if (!file) throw new BadRequestException("Attach a file in the 'file' field");
  if (file.size > limits.maxBytes) {
    throw new PayloadTooLargeException(
      `File is larger than ${Math.round(limits.maxBytes / 1024 / 1024)} MB`,
    );
  }
  const contentType = sniffContentType(file.buffer);
  if (!contentType || !limits.types.includes(contentType)) {
    throw new BadRequestException(`Unsupported file type. Allowed: ${limits.types.join(", ")}`);
  }
  return { contentType, ext: EXTENSIONS[contentType]! };
}

/** Single "file" field, kept in memory. Multer rejects anything over the global cap outright. */
export const uploadInterceptor = FileInterceptor("file", {
  storage: memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

/** OpenAPI body for a single-file upload. */
export const fileBody = {
  schema: { type: "object", properties: { file: { type: "string", format: "binary" } } },
};
