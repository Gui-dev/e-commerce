import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "../../env.js";

export const s3Client = new S3Client({
  endpoint: `http://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY,
    secretAccessKey: env.MINIO_SECRET_KEY,
  },
  region: "us-east-1",
});

export const BUCKET_NAME = env.MINIO_BUCKET;

export async function ensureBucketExists(): Promise<void> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
  } catch {
    await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
    await s3Client.send(
      new PutBucketPolicyCommand({
        Bucket: BUCKET_NAME,
        Policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { AWS: ["*"] },
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
            },
          ],
        }),
      }),
    );
  }
}
