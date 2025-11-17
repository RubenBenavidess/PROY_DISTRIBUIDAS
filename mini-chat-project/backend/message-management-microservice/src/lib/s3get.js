import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl }     from "@aws-sdk/s3-request-presigner";
import { s3 }               from './s3put.js';

export const getSignedImageUrl = (key, expiresIn = 60 * 60 * 2,) => {
    return getSignedUrl(
        s3,
        new GetObjectCommand(
            { 
                Bucket: process.env.MINIO_BUCKET, 
                Key: key 
            }
        ),
        { expiresIn },
    );
}