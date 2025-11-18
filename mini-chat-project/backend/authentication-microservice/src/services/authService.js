import Admin from "../models/Admin.js";
import { generateToken } from "../security/jwtManager.js";
import hashCache from "../logs/hashCache.js";

// Determine logs-microservice URL
const LOGS_SERVICE_URL = process.env.LOGS_SERVICE_URL ? `${process.env.LOGS_SERVICE_URL}/logs` : 'http://localhost:4000/logs';
const LOGS_LAST_HASH_URL = process.env.LOGS_SERVICE_URL ? `${process.env.LOGS_SERVICE_URL}/logs/last-hash` : 'http://localhost:4000/logs/last-hash';

export async function login(admin){

    const foundAdmin = await Admin.findOne( {username: admin.username} ).select("+password").exec();
    
    if(!foundAdmin)
        throw new Error("Invalid Credentials A");

    const valid_pass = await foundAdmin.comparePass(admin.password);

    if(!valid_pass)
        throw new Error("Invalid Credentials B");

    // Correct Workflow

    const payload = {
        admin_id: foundAdmin.id,        
        username: foundAdmin.publicUsername
    }
    const token = generateToken(payload);

    // Log logic: delegate hash calculation and persistence to logs-microservice
    try {
        const body = {
            actorId: foundAdmin.id,
            eventType: 'AUTH',
            details: { username: foundAdmin.publicUsername },
            // send previousHash from this microservice's cache to logs microservice
            previousHash: hashCache.getLastHash()
        };

        const res = await fetch(LOGS_SERVICE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            const data = await res.json();
            if (data && data.hash) {
                // update local cache with the latest hash returned by logs microservice
                hashCache.insertHash(data.hash);
            }
        } else if (res.status === 409) {
            // Conflict: our previousHash was stale. Fetch latest hash, update cache and retry once.
            try {
                const lastRes = await fetch(LOGS_LAST_HASH_URL);
                if (lastRes.ok) {
                    const lastData = await lastRes.json();
                    if (lastData && lastData.hash) {
                        hashCache.insertHash(lastData.hash);
                        // retry
                        const retryBody = { ...body, previousHash: lastData.hash };
                        const retryRes = await fetch(LOGS_SERVICE_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(retryBody)
                        });
                        if (retryRes.ok) {
                            const retryData = await retryRes.json();
                            if (retryData && retryData.hash) hashCache.insertHash(retryData.hash);
                        } else {
                            console.error('Retry to insert log failed', retryRes.status, await retryRes.text());
                        }
                    }
                }
            } catch (e) {
                console.error('Error during retry flow for log insertion:', e.message);
            }
        } else {
            // non-blocking: log and continue returning token
            console.error('Failed to insert log to logs-microservice', res.status, await res.text());
        }
    } catch (err) {
        // non-blocking: network or other error, keep running auth flow
        console.error('Error while sending log to logs-microservice:', err.message);
    }

    return token;

}

export async function logout(adminId, username) {
    // Log logout event to logs-microservice
    try {
        const body = {
            actorId: adminId,
            eventType: 'LOGOUT',
            details: { username },
            previousHash: hashCache.getLastHash()
        };

        const res = await fetch(LOGS_SERVICE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            const data = await res.json();
            if (data && data.hash) {
                hashCache.insertHash(data.hash);
            }
        } else if (res.status === 409) {
            // Conflict: retry with latest hash
            try {
                const lastRes = await fetch(LOGS_LAST_HASH_URL);
                if (lastRes.ok) {
                    const lastData = await lastRes.json();
                    if (lastData && lastData.hash) {
                        hashCache.insertHash(lastData.hash);
                        const retryBody = { ...body, previousHash: lastData.hash };
                        const retryRes = await fetch(LOGS_SERVICE_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(retryBody)
                        });
                        if (retryRes.ok) {
                            const retryData = await retryRes.json();
                            if (retryData && retryData.hash) hashCache.insertHash(retryData.hash);
                        }
                    }
                }
            } catch (e) {
                console.error('Error during retry flow for logout log insertion:', e.message);
            }
        } else {
            console.error('Failed to insert logout log to logs-microservice', res.status, await res.text());
        }
    } catch (err) {
        console.error('Error while sending logout log to logs-microservice:', err.message);
    }
}

