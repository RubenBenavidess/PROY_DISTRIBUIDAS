#!/usr/bin/env node

const http = require('http');

const GATEWAY_HOST = 'localhost';
const GATEWAY_PORT = 8080;
const TEST_ENDPOINT = '/gateway/health';

// Colores
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
};

function makeRequest(requestNumber) {
    return new Promise((resolve) => {
        const options = {
        hostname: GATEWAY_HOST,
        port: GATEWAY_PORT,
        path: TEST_ENDPOINT,
        method: 'GET',
        };

        const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            resolve({
            requestNumber,
            status: res.statusCode,
            headers: {
                limit: res.headers['ratelimit-limit'],
                remaining: res.headers['ratelimit-remaining'],
                reset: res.headers['ratelimit-reset'],
                retryAfter: res.headers['retry-after']
            },
            body: data
            });
        });
        });

        req.on('error', (error) => {
        resolve({
            requestNumber,
            error: error.message
        });
        });

        req.end();
    });
}

function printResult(result) {
    const { requestNumber, status, headers, error } = result;
    
    if (error) {
        console.log(`Request ${requestNumber}: ERROR - ${error}`);
        return;
    }

    // Color según el status
    const statusColor = status === 200 ? colors.green : status === 429 ? colors.red : colors.reset;

    console.log(`${statusColor}\nRequest ${requestNumber}:`);
    console.log(`   Status: ${status}`);
    
    if (headers.limit) {
        console.log(`   Rate Limit: ${headers.limit}`);
        console.log(`   Remaining: ${headers.remaining}`);
        
        if (headers.reset) {
        const resetDate = new Date(parseInt(headers.reset) * 1000);
        console.log(`   Reset at: ${resetDate.toLocaleTimeString()}`);
        }
        
        if (headers.retryAfter) {
        console.log(`   Retry After: ${headers.retryAfter} seconds`);
        }
    }
    console.log(colors.reset);
}

async function testRateLimit() {
    console.clear();
    console.log('TEST DE RATE LIMIT - API GATEWAY\n');
    
    // Detectar el límite actual
    const firstReq = await makeRequest(0);
    
    if (firstReq.error || !firstReq.headers || !firstReq.headers.limit) {
        console.log(`ERROR: No se pudo conectar al gateway o no hay rate limit configurado`);
        if (firstReq.error) {
        console.log(`Detalles: ${firstReq.error}`);
        }
        console.log('\nAsegurate de que el gateway este corriendo: npm start\n');
        process.exit(1);
    }
    
    const currentLimit = parseInt(firstReq.headers.limit);
    const numberOfRequests = currentLimit + 5;
    
    console.log(`Enviando ${numberOfRequests} peticiones...\n`);

    let blockedCount = 0;
    let successCount = 0;

    for (let i = 1; i <= numberOfRequests; i++) {
        const result = await makeRequest(i);
        
        if (result.status === 200) {
        successCount++;
        } else if (result.status === 429) {
        blockedCount++;
        }
        
        printResult(result);
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Resumen
    console.log('\n' + '='.repeat(60));
    console.log('RESUMEN DE RESULTADOS');
    console.log('='.repeat(60) + '\n');
    console.log(`Exitosas: ${successCount}`);
    console.log(`Bloqueadas: ${blockedCount}`);
    console.log(`Se esperaba bloqueo despues de: ${currentLimit} peticiones\n`);
}

// Ejecutar
(async () => {
    await testRateLimit();
})();
