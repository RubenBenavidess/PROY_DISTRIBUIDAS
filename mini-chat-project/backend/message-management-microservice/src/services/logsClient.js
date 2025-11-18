import hashCache from '../logs/hashCache.js';

const LOGS_MICROSERVICE_URL = process.env.LOGS_SERVICE_URL ? `${process.env.LOGS_SERVICE_URL}/logs` : 'http://localhost:4000/logs';

/**
 * Envía un log al microservicio de logs con reintentos en caso de conflicto (409)
 * @param {Object} logData - { actorId, eventType, details }
 * @returns {Object} { success, hash, error }
 */
export async function sendLogToMicroservice(logData) {
  const { actorId, eventType, details } = logData;

  if (!actorId || !eventType || !details) {
    return { success: false, error: 'actorId, eventType and details are required' };
  }

  try {
    // Primer intento con hash actual del cache
    const previousHash = hashCache.getLastHash();
    const body = {
      actorId,
      eventType,
      details,
      previousHash
    };

    let res = await fetch(LOGS_MICROSERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    // Si 409 (mismatch), sincronizar cache y reintentar una vez
    if (res.status === 409) {
      console.warn(`Log insertion conflict for ${eventType}; syncing cache and retrying...`);
      try {
        const lastRes = await fetch(`${LOGS_MICROSERVICE_URL.replace('/logs', '')}/logs/last-hash`);
        if (lastRes.ok) {
          const lastData = await lastRes.json();
          if (lastData && lastData.hash) {
            hashCache.insertHash(lastData.hash);
            // Reintento con hash sincronizado
            const retryBody = { ...body, previousHash: lastData.hash };
            res = await fetch(LOGS_MICROSERVICE_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(retryBody)
            });
          }
        }
      } catch (syncErr) {
        console.error('Error during sync retry for log:', syncErr.message);
      }
    }

    // Procesar respuesta final
    if (res.ok) {
      const data = await res.json();
      if (data && data.hash) {
        hashCache.insertHash(data.hash);
        return { success: true, hash: data.hash };
      }
      return { success: true, hash: null };
    } else {
      const errorText = await res.text();
      return { success: false, error: `Logs microservice error: ${res.status} ${errorText}` };
    }
  } catch (err) {
    console.error('Error sending log to microservice:', err.message);
    return { success: false, error: err.message };
  }
}
