const request = require('supertest');
const express = require('express');
const rateLimit = require('express-rate-limit');

describe('Rate Limit - Verificación Completa', () => {
    let app;

    beforeEach(() => {
        app = express();
        
        // Configuración del rate limiter para pruebas (más estricto)
        const limiter = rateLimit({
        windowMs: 1000, // 1 segundo
        max: 3, // Solo 3 peticiones
        message: { error: 'Demasiadas solicitudes. Intente de nuevo más tarde.' },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            // Simula el skip de socket.io
            return req.url.startsWith('/api/socket.io');
        }
        });

        app.use(limiter);

        app.get('/test', (req, res) => {
        res.status(200).json({ success: true, message: 'Request successful' });
        });

        app.get('/api/socket.io', (req, res) => {
        res.status(200).json({ success: true, message: 'Socket.IO bypassed' });
        });
    });

    describe('✅ Peticiones dentro del límite', () => {
        it('debe permitir la primera petición', async () => {
        const response = await request(app).get('/test');
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        });

        it('debe incluir headers de rate limit', async () => {
        const response = await request(app).get('/test');
        
        expect(response.headers['ratelimit-limit']).toBe('3');
        expect(response.headers['ratelimit-remaining']).toBeDefined();
        expect(response.headers['ratelimit-reset']).toBeDefined();
        });

        it('debe permitir hasta 3 peticiones seguidas', async () => {
        const response1 = await request(app).get('/test');
        const response2 = await request(app).get('/test');
        const response3 = await request(app).get('/test');
        
        expect(response1.status).toBe(200);
        expect(response2.status).toBe(200);
        expect(response3.status).toBe(200);
        
        // Verificar que los remaining van bajando
        expect(response1.headers['ratelimit-remaining']).toBe('2');
        expect(response2.headers['ratelimit-remaining']).toBe('1');
        expect(response3.headers['ratelimit-remaining']).toBe('0');
        });
    });

    describe('❌ Peticiones que exceden el límite', () => {
        it('debe bloquear la cuarta petición con status 429', async () => {
        // Hacer 3 peticiones permitidas
        await request(app).get('/test');
        await request(app).get('/test');
        await request(app).get('/test');
        
        // La cuarta debe ser bloqueada
        const response4 = await request(app).get('/test');
        
        expect(response4.status).toBe(429);
        expect(response4.body.error).toContain('Demasiadas solicitudes');
        });

        it('debe incluir el header Retry-After', async () => {
        // Saturar el límite
        await request(app).get('/test');
        await request(app).get('/test');
        await request(app).get('/test');
        
        const response = await request(app).get('/test');
        
        expect(response.status).toBe(429);
        expect(response.headers['retry-after']).toBeDefined();
        });

        it('debe mantener el bloqueo en peticiones subsecuentes', async () => {
        // Saturar
        await request(app).get('/test');
        await request(app).get('/test');
        await request(app).get('/test');
        
        // Todas estas deben ser rechazadas
        const response4 = await request(app).get('/test');
        const response5 = await request(app).get('/test');
        
        expect(response4.status).toBe(429);
        expect(response5.status).toBe(429);
        });
    });

    describe('🔄 Reseteo de límites', () => {
        it('debe permitir peticiones después de que pase la ventana de tiempo', async () => {
        // Saturar el límite
        await request(app).get('/test');
        await request(app).get('/test');
        await request(app).get('/test');
        
        // Verificar que está bloqueado
        const blockedResponse = await request(app).get('/test');
        expect(blockedResponse.status).toBe(429);
        
        // Esperar 1.1 segundos (más que la ventana de 1 segundo)
        await new Promise(resolve => setTimeout(resolve, 1100));
        
        // Ahora debería funcionar de nuevo
        const allowedResponse = await request(app).get('/test');
        expect(allowedResponse.status).toBe(200);
        expect(allowedResponse.headers['ratelimit-remaining']).toBe('2');
        });
    });

    describe('🚫 Excepciones de Rate Limit', () => {
        it('debe permitir peticiones ilimitadas a rutas de socket.io', async () => {
        // Hacer muchas más peticiones de las permitidas normalmente
        const promises = Array(10).fill(null).map(() => 
            request(app).get('/api/socket.io')
        );
        
        const responses = await Promise.all(promises);
        
        // Todas deben ser exitosas
        responses.forEach(response => {
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Socket.IO bypassed');
        });
        });

        it('debe aplicar rate limit a rutas normales pero no a socket.io', async () => {
        // Saturar el rate limit con rutas normales
        await request(app).get('/test');
        await request(app).get('/test');
        await request(app).get('/test');
        
        // Ruta normal debe estar bloqueada
        const normalResponse = await request(app).get('/test');
        expect(normalResponse.status).toBe(429);
        
        // Pero socket.io debe seguir funcionando
        const socketResponse = await request(app).get('/api/socket.io');
        expect(socketResponse.status).toBe(200);
        });
    });

    describe('📊 Headers de Rate Limit', () => {
        it('debe proporcionar información completa en los headers', async () => {
        const response = await request(app).get('/test');
        
        expect(response.headers).toHaveProperty('ratelimit-limit');
        expect(response.headers).toHaveProperty('ratelimit-remaining');
        expect(response.headers).toHaveProperty('ratelimit-reset');
        
        expect(parseInt(response.headers['ratelimit-limit'])).toBe(3);
        expect(parseInt(response.headers['ratelimit-remaining'])).toBeLessThanOrEqual(3);
        });

        it('debe actualizar los headers correctamente con cada petición', async () => {
        const response1 = await request(app).get('/test');
        const response2 = await request(app).get('/test');
        
        const remaining1 = parseInt(response1.headers['ratelimit-remaining']);
        const remaining2 = parseInt(response2.headers['ratelimit-remaining']);
        
        expect(remaining1 - remaining2).toBe(1);
        });
    });
});
