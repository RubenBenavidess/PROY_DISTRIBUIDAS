import dotenv from 'dotenv';
import { jest } from '@jest/globals';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'test.mongodb.net';
process.env.DB_USER = 'testuser';
process.env.DB_PASS = 'testpass';
process.env.DB_NAME = 'test_db';
process.env.PUBLIC_KEY_PATH = '/tmp/test-public-key.pem';
process.env.MINIO_ENDPOINT = 'http://localhost:9000';
process.env.MINIO_ACCESS_KEY = 'testkey';
process.env.MINIO_SECRET_KEY = 'testsecret';
process.env.MINIO_BUCKET = 'test-bucket';
process.env.FILE_VERIFICATION_SERVICE_URL = 'http://localhost:3003';
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Global test timeout
jest.setTimeout(10000);
