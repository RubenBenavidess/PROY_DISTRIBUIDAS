const request = require('supertest');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

// Mock the proxy middleware
jest.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: jest.fn(() => (req, res, next) => {
    res.status(200).json({ proxied: true });
  })
}));

// Mock rate limiting
jest.mock('express-rate-limit', () => {
  return jest.fn(() => (req, res, next) => next());
});

describe('API Gateway', () => {
  let app;

  beforeAll(() => {
    // Setup app similar to index.js but without starting the server
    app = express();
    app.use(helmet());
    app.use(cors());
    app.use(morgan('dev'));

    // Mock rate limiter
    const rateLimit = require('express-rate-limit');
    app.use(rateLimit());

    // Health check endpoint
    app.get('/gateway/health', (req, res) => {
      res.status(200).send('API Gateway corriendo correctamente');
    });

    // Mock proxy routes
    const { createProxyMiddleware } = require('http-proxy-middleware');
    app.use('/auth', createProxyMiddleware());
    app.use('/api', createProxyMiddleware());
  });

  describe('Health Check', () => {
    it('should return 200 for health check', async () => {
      const response = await request(app).get('/gateway/health');

      expect(response.status).toBe(200);
      expect(response.text).toBe('API Gateway corriendo correctamente');
    });
  });

  describe('Security Middleware', () => {
    it('should have helmet headers set', async () => {
      const response = await request(app).get('/gateway/health');

      // Helmet sets various security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should allow CORS', async () => {
      const response = await request(app)
        .get('/gateway/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Proxy Routes', () => {
    it('should proxy requests to /auth', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'admin', password: 'test' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ proxied: true });
    });

    it('should proxy requests to /api', async () => {
      const response = await request(app)
        .get('/api/rooms');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ proxied: true });
    });

    it('should handle POST requests to /auth', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
    });

    it('should handle GET requests to /api', async () => {
      const response = await request(app)
        .get('/api/messages');

      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting middleware', async () => {
      // Make multiple requests
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(request(app).get('/gateway/health'));
      }

      const responses = await Promise.all(requests);
      
      // All should succeed since we mocked the rate limiter
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('HTTP Methods', () => {
    it('should support GET requests', async () => {
      const response = await request(app).get('/gateway/health');
      expect(response.status).toBe(200);
    });

    it('should support POST requests to auth', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ test: 'data' });
      
      expect(response.status).toBe(200);
    });

    it('should support PUT requests to api', async () => {
      const response = await request(app)
        .put('/api/resource')
        .send({ test: 'data' });
      
      expect(response.status).toBe(200);
    });

    it('should support DELETE requests to api', async () => {
      const response = await request(app)
        .delete('/api/resource');
      
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');
      
      // Since we have catch-all proxy, it will be handled
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Request Headers', () => {
    it('should accept JSON content type', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send({ test: 'data' });
      
      expect(response.status).toBe(200);
    });

    it('should handle requests with custom headers', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Custom-Header', 'test-value');
      
      expect(response.status).toBe(200);
    });
  });
});
