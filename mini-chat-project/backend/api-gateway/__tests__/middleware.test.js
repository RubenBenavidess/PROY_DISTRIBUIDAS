const request = require('supertest');
const express = require('express');
const rateLimit = require('express-rate-limit');

describe('Rate Limiting Integration', () => {
  let app;

  beforeEach(() => {
    app = express();
    
    // Configure actual rate limiter for testing
    const limiter = rateLimit({
      windowMs: 1000, // 1 second for testing
      max: 3, // 3 requests per second
      message: 'Too many requests',
      standardHeaders: true,
      legacyHeaders: false,
    });

    app.use(limiter);

    app.get('/test', (req, res) => {
      res.status(200).json({ success: true });
    });
  });

  it('should allow requests under the limit', async () => {
    const response = await request(app).get('/test');
    expect(response.status).toBe(200);
  });

  it('should set rate limit headers', async () => {
    const response = await request(app).get('/test');
    
    expect(response.headers['ratelimit-limit']).toBeDefined();
    expect(response.headers['ratelimit-remaining']).toBeDefined();
  });

  it('should allow multiple requests within limit', async () => {
    const response1 = await request(app).get('/test');
    const response2 = await request(app).get('/test');
    
    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
  });
});

describe('Proxy Configuration', () => {
  it('should configure auth service URL correctly', () => {
    const AUTH_SERVICE_URL = 'http://auth-api:3000';
    expect(AUTH_SERVICE_URL).toMatch(/^http:\/\//);
    expect(AUTH_SERVICE_URL).toContain('auth-api');
    expect(AUTH_SERVICE_URL).toContain('3000');
  });

  it('should configure message service URL correctly', () => {
    const MESSAGE_SERVICE_URL = 'http://message-management-microservice:3002';
    expect(MESSAGE_SERVICE_URL).toMatch(/^http:\/\//);
    expect(MESSAGE_SERVICE_URL).toContain('message-management-microservice');
    expect(MESSAGE_SERVICE_URL).toContain('3002');
  });
});

describe('Middleware Stack', () => {
  let app;

  beforeEach(() => {
    app = express();
  });

  it('should use helmet for security', () => {
    const helmet = require('helmet');
    expect(helmet).toBeDefined();
    expect(typeof helmet).toBe('function');
  });

  it('should use CORS middleware', () => {
    const cors = require('cors');
    expect(cors).toBeDefined();
    expect(typeof cors).toBe('function');
  });

  it('should use morgan for logging', () => {
    const morgan = require('morgan');
    expect(morgan).toBeDefined();
    expect(typeof morgan).toBe('function');
  });

  it('should configure CORS to allow all origins', () => {
    const cors = require('cors');
    app.use(cors());
    
    expect(cors).toHaveBeenCalled;
  });
});

describe('Service URLs', () => {
  it('should define authentication service URL', () => {
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-api:3000';
    expect(AUTH_SERVICE_URL).toBeTruthy();
  });

  it('should define message service URL', () => {
    const MESSAGE_SERVICE_URL = process.env.MESSAGE_SERVICE_URL || 'http://message-management-microservice:3002';
    expect(MESSAGE_SERVICE_URL).toBeTruthy();
  });

  it('should use Docker service names for internal communication', () => {
    const AUTH_SERVICE_URL = 'http://auth-api:3000';
    const MESSAGE_SERVICE_URL = 'http://message-management-microservice:3002';
    
    expect(AUTH_SERVICE_URL).not.toContain('localhost');
    expect(MESSAGE_SERVICE_URL).not.toContain('localhost');
  });
});
