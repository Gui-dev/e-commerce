import { randomUUID } from "node:crypto";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BUCKET_NAME, s3Client } from "./minio.js";

export interface UploadResult {
  key: string;
  url: string;
}

export async function uploadImage(
  file: Buffer,
  filename: string,
  contentType: string,
  prefix = "products",
): Promise<UploadResult> {
  const ext = path.extname(filename);
  const key = `${prefix}/${randomUUID()}${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    }),
  );

  const url = `/storage/${key}`;

  return { key, url };
}

export async function deleteImage(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }),
  );
}

export async function getImageUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
