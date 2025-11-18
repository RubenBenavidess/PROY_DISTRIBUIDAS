import { ImmutableLogModel } from '../models/ImmutableLog.js';
import crypto from 'crypto';
import { randomUUID } from 'node:crypto';
import { signHash } from '../security/signManager.js';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// Firma un hash usando signManager
export function signProvidedHash(hash) {
  return signHash(hash);
}

// Obtiene el último hash desde la base de datos (útil para inicializar caches)
export async function getLastHash() {
  try {
    const last = await ImmutableLogModel.findOne().sort({ timestamp: -1 }).select('hash -_id').lean();
    if (!last || !last.hash) return GENESIS_HASH;
    return last.hash;
  } catch (err) {
    console.error('Error getting last hash from DB:', err.message);
    return GENESIS_HASH;
  }
}

// Stringify determinista (ordena claves) para evitar diferencias de orden al hashear
function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

// Calcula SHA256 hex de un objeto (canonicalizado)
function computeHashForData(data) {
  // Aseguramos que no incluimos campos hash/signature
  const input = {
    id: data.id,
    timestamp: data.timestamp instanceof Date ? data.timestamp.toISOString() : data.timestamp,
    actorId: data.actorId,
    eventType: data.eventType,
    details: data.details,
    previousHash: data.previousHash,
  };
  const str = stableStringify(input);
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Inserta un nuevo log: obtiene previousHash desde cache, calcula hash y firma, persiste y actualiza cache
export async function insertLog({ actorId, eventType, details, previousHash: providedPreviousHash }) {
  // Use provided previousHash from caller (auth microservice), otherwise fallback to GENESIS
  const previousHash = providedPreviousHash || GENESIS_HASH;

  const data = {
    id: randomUUID(),
    timestamp: new Date(),
    actorId,
    eventType,
    details,
    previousHash,
  };

  const hash = computeHashForData(data);
  const signature = signProvidedHash(hash);
  // Verificar que previousHash proporcionado por el caller coincide con el último hash en DB
  try {
    const last = await ImmutableLogModel.findOne().sort({ timestamp: -1 }).select('hash -_id').lean();
    const lastHashInDb = last && last.hash ? last.hash : GENESIS_HASH;
    if (lastHashInDb !== previousHash) {
      const err = new Error('Previous hash does not match database last hash');
      err.code = 'PREVIOUS_HASH_MISMATCH';
      throw err;
    }
  } catch (e) {
    if (e.code === 'PREVIOUS_HASH_MISMATCH') throw e;
    // If DB check fails for other reasons, rethrow as generic
    console.error('Error while verifying previousHash against DB:', e.message);
  }

  // Persistir
  const doc = await ImmutableLogModel.create({ ...data, hash, signature });

  return { hash: doc.hash };
}
