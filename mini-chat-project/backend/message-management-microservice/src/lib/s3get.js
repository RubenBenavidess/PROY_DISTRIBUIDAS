import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl }     from "@aws-sdk/s3-request-presigner";
import { s3 }               from './s3put.js';

export const getSignedImageUrl = (key, expiresIn = 60 * 60 * 2) => {
    // URL pública de MinIO accesible desde el navegador
    const publicUrl = `http://localhost:9000/chat-files/${key}`;
    
    return Promise.resolve(publicUrl);
}