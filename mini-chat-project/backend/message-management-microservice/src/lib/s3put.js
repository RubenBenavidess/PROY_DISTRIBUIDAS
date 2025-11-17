import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_BUCKET = process.env.MINIO_BUCKET;

if (!MINIO_ACCESS_KEY || !MINIO_SECRET_KEY || !MINIO_ENDPOINT || !MINIO_BUCKET) {
    throw new Error("Missing required MinIO environment variables (MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_ENDPOINT, MINIO_BUCKET)");
}

export const s3 = new S3Client({
    endpoint: MINIO_ENDPOINT,
    credentials: {
        accessKeyId: MINIO_ACCESS_KEY,
        secretAccessKey: MINIO_SECRET_KEY,
    },
    forcePathStyle: true,
    tls: process.env.MINIO_USE_TLS !== 'false',
});

export const putFromFile = async (localPath, key) => {
    const fileStream = fs.createReadStream(localPath);

    await s3.send(
        new PutObjectCommand(
            {
                Bucket: MINIO_BUCKET,
                Key:    key,
                Body:   fileStream,
                ContentType: 'application/octet-stream',
            }
        ),
    );
}

export const putFromBuffer = async (buf, key) => {
    await s3.send(
        new PutObjectCommand(
            {
                Bucket: MINIO_BUCKET,
                Key:    key,
                Body:   buf,
                ContentType: 'application/octet-stream',
            }
        ),
    );
}