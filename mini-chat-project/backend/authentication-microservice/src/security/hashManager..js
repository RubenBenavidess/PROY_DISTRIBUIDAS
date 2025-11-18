import { createHash } from "node:crypto";

export function cryptoHash(dataToHash){
    const serializedData = JSON.stringify(dataToHash);
    return createHash('sha256').update(serializedData).digest('hex'); [1]
}