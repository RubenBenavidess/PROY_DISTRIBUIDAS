import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import fs from 'fs';

if (!env.MINIO_ACCESS_KEY || !env.MINIO_SECRET_KEY) {
    throw new Error("Missing MINIO_ACCESS_KEY or MINIO_SECRET_KEY environment variables");
}

export const s3 = new S3Client({
    endpoint: env.MINIO_ENDPOINT,
    region: env.MINIO_REGION,
    credentials: {
        accessKeyId: env.MINIO_ACCESS_KEY,
        secretAccessKey: env.MINIO_SECRET_KEY,
    },
    forcePathStyle: true,
    tls: true,
});

export const putFromFile = async (localPath, key) => {
    const fileStream = fs.createReadStream(localPath);

    await s3.send(
        new PutObjectCommand(
            {
                Bucket: env.MINIO_BUCKET,
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
                Bucket: env.MINIO_BUCKET,
                Key:    key,
                Body:   buf,
                ContentType: 'application/octet-stream',
            }
        ),
    );
}