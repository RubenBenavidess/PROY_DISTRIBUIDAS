import { randomUUID } from 'node:crypto';
import { cryptoHash } from '../../security/hashManager.';

export const inmutableLog = (actorId, eventType, details, previousHash) => {
    const data = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        eventType,
        actorId,
        details,
        previousHash,
        hash: null,
        signature: null
    }
    return {
        data,
        hash: () => cryptoHash(data),
        getHash: () =>  data.hash
    };
}
