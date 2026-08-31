import { randomUUID } from "node:crypto";
import path from "node:path";
import { BUCKET_NAME, minioClient } from "./minio.js";

export interface UploadResult {
  key: string;
  url: string;
}

export async function uploadImage(
  file: Buffer,
  filename: string,
  contentType: string,
): Promise<UploadResult> {
  const ext = path.extname(filename);
  const key = `products/${randomUUID()}${ext}`;

  await minioClient.putObject(BUCKET_NAME, key, file, file.length, {
    "Content-Type": contentType,
  });

  const url = `/storage/${key}`;

  return { key, url };
}

export async function deleteImage(key: string): Promise<void> {
  await minioClient.removeObject(BUCKET_NAME, key);
}

export async function getImageUrl(key: string): Promise<string> {
  return await minioClient.presignedGetObject(BUCKET_NAME, key, 3600);
}
