import { randomUUID } from "node:crypto";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/** A minimal one-page PDF with the given lines of text (Helvetica, A4). */
export function makePdf(lines: string[]): Buffer {
  const escape = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, "?");
  const text = lines
    .map(
      (line, i) => `BT /F1 ${i === 0 ? 20 : 12} Tf 60 ${780 - i * 24} Td (${escape(line)}) Tj ET`,
    )
    .join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

/** Uploads seed CVs to the same bucket the API uses. Returns null when storage isn't reachable. */
export async function createCvUploader() {
  const bucket = process.env.S3_BUCKET ?? "jobify";
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "us-east-1",
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "jobify",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "jobify-dev-secret",
    },
  });
  try {
    await client
      .send(new HeadBucketCommand({ Bucket: bucket }))
      .catch(() => client.send(new CreateBucketCommand({ Bucket: bucket })));
  } catch (error) {
    console.warn(
      `Object storage unavailable, seeding without CV files: ${(error as Error).message}`,
    );
    return null;
  }

  return async (userId: string, lines: string[]): Promise<string> => {
    const key = `users/${userId}/cv/${randomUUID()}.pdf`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: makePdf(lines),
        ContentType: "application/pdf",
      }),
    );
    return key;
  };
}
