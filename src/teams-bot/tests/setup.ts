/**
 * Test setup file for Teams Bot
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock environment variables for Teams Bot
process.env.NODE_ENV = 'test';
process.env.MicrosoftAppId = 'test-app-id';
process.env.MicrosoftAppPassword = 'test-app-password';
process.env.MicrosoftAppTenantId = 'test-tenant-id';
process.env.BOT_ENDPOINT = 'https://test-bot.ngrok.io';
process.env.MCP_SERVER_URL = 'http://localhost:3000';
process.env.AZURE_SUBSCRIPTION_ID = 'test-subscription-id';
process.env.AZURE_TENANT_ID = 'test-tenant-id';
process.env.AZURE_CLIENT_ID = 'test-client-id';
process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  jest.restoreAllMocks();
});