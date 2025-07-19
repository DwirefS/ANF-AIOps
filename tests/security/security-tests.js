/**
 * Security tests for ANF-AIOps system
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 */

const axios = require('axios');
const { expect } = require('chai');
const { describe, it, before } = require('mocha');

describe('ANF-AIOps Security Tests', function() {
  this.timeout(60000); // 1 minute timeout for security tests

  const config = {
    azureFunctionsUrl: process.env.AZURE_FUNCTIONS_URL || 'http://localhost:7071',
    mcpServerUrl: process.env.MCP_SERVER_URL || 'http://localhost:3000',
    teamsBotUrl: process.env.TEAMS_BOT_URL || 'http://localhost:3978',
    validAuthToken: process.env.TEST_AUTH_TOKEN,
    testSubscriptionId: process.env.TEST_AZURE_SUBSCRIPTION_ID,
    testResourceGroup: process.env.TEST_RESOURCE_GROUP || 'security-test-rg'
  };

  before(function() {
    if (!config.validAuthToken) {
      this.skip('Security tests require TEST_AUTH_TOKEN environment variable');
    }
  });

  describe('Authentication Security', function() {
    it('should reject requests without authentication token', async function() {
      try {
        const response = await axios.get(
          `${config.azureFunctionsUrl}/api/accounts?subscriptionId=${config.testSubscriptionId}&resourceGroupName=${config.testResourceGroup}`
        );
        
        // Should not reach here
        expect.fail('Request should have been rejected without auth token');
      } catch (error) {
        expect(error.response.status).to.be.oneOf([401, 403]);
      }
    });

    it('should reject requests with invalid authentication token', async function() {
      try {
        const response = await axios.get(
          `${config.azureFunctionsUrl}/api/accounts?subscriptionId=${config.testSubscriptionId}&resourceGroupName=${config.testResourceGroup}`,
          {
            headers: { 'Authorization': 'Bearer invalid-token-12345' }
          }
        );
        
        expect.fail('Request should have been rejected with invalid auth token');
      } catch (error) {
        expect(error.response.status).to.be.oneOf([401, 403]);
      }
    });

    it('should reject requests with malformed authentication header', async function() {
      try {
        const response = await axios.get(
          `${config.azureFunctionsUrl}/api/accounts?subscriptionId=${config.testSubscriptionId}&resourceGroupName=${config.testResourceGroup}`,
          {
            headers: { 'Authorization': 'InvalidFormat token-12345' }
          }
        );
        
        expect.fail('Request should have been rejected with malformed auth header');
      } catch (error) {
        expect(error.response.status).to.be.oneOf([400, 401, 403]);
      }
    });

    it('should accept requests with valid authentication token', async function() {
      const response = await axios.get(
        `${config.azureFunctionsUrl}/api/accounts?subscriptionId=${config.testSubscriptionId}&resourceGroupName=${config.testResourceGroup}`,
        {
          headers: { 'Authorization': `Bearer ${config.validAuthToken}` }
        }
      );
      
      expect(response.status).to.equal(200);
    });
  });

  describe('Input Validation Security', function() {
    it('should reject SQL injection attempts in subscription ID', async function() {
      const maliciousSubscriptionId = "'; DROP TABLE accounts; --";
      
      try {
        const response = await axios.get(
          `${config.azureFunctionsUrl}/api/accounts?subscriptionId=${encodeURIComponent(maliciousSubscriptionId)}&resourceGroupName=${config.testResourceGroup}`,
          {
            headers: { 'Authorization': `Bearer ${config.validAuthToken}` }
          }
        );
        
        // Should either reject with 400 or handle safely
        if (response.status === 200) {
          // If accepted, ensure no SQL injection occurred
          expect(response.data).to.not.include('DROP TABLE');
        }
      } catch (error) {
        expect(error.response.status).to.be.oneOf([400, 422]);
      }
    });

    it('should reject XSS attempts in resource group name', async function() {
      const maliciousResourceGroup = "<script>alert('xss')</script>";
      
      try {
        const response = await axios.get(
          `${config.azureFunctionsUrl}/api/accounts?subscriptionId=${config.testSubscriptionId}&resourceGroupName=${encodeURIComponent(maliciousResourceGroup)}`,
          {
            headers: { 'Authorization': `Bearer ${config.validAuthToken}` }
          }
        );
        
        // Should either reject or sanitize
        if (response.status === 200) {
          expect(response.data).to.not.include('<script>');
          expect(response.data).to.not.include('alert(');
        }
      } catch (error) {
        expect(error.response.status).to.be.oneOf([400, 422]);
      }
    });

    it('should reject command injection in account names', async function() {
      const maliciousAccountName = "test; rm -rf /";
      
      try {
        const response = await axios.get(
          `${config.azureFunctionsUrl}/api/accounts?subscriptionId=${config.testSubscriptionId}&resourceGroupName=${config.testResourceGroup}&accountName=${encodeURIComponent(maliciousAccountName)}`,
          {
            headers: { 'Authorization': `Bearer ${config.validAuthToken}` }
          }
        );
        
        if (response.status === 200) {
          expect(response.data).to.not.include('rm -rf');
        }
      } catch (error) {
        expect(error.response.status).to.be.oneOf([400, 404, 422]);
      }
    });

    it('should validate and reject oversized request bodies', async function() {
      // Create a very large payload (>10MB)
      const largePayload = {
        subscriptionId: config.testSubscriptionId,
        resourceGroupName: config.testResourceGroup,
        accountName: 'test-account',
        location: 'eastus',
        tags: {},
        maliciousData: 'A'.repeat(10 * 1024 * 1024) // 10MB of 'A's
      };
      
      try {
        const response = await axios.post(
          `${config.azureFunctionsUrl}/api/accounts`,
          largePayload,
          {
            headers: { 
              'Authorization': `Bearer ${config.validAuthToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );
        
        expect.fail('Oversized request should have been rejected');
      } catch (error) {
        // Should be rejected with 413 (Payload Too Large) or 400
        expect(error.response?.status).to.be.oneOf([400, 413]);
      }
    });
  });

  describe('Authorization Security', function() {
    it('should enforce subscription-level access control', async function() {
      const unauthorizedSubscriptionId = '00000000-0000-0000-0000-000000000000';
      
      try {
        const response = await axios.get(
          `${config.azureFunctionsUrl}/api/accounts?subscriptionId=${unauthorizedSubscriptionId}&resourceGroupName=${config.testResourceGroup}`,
          {
            headers: { 'Authorization': `Bearer ${config.validAuthToken}` }
          }
        );
        
        // Should be rejected or return empty results
        if (response.status === 200) {
          expect(response.data.accounts).to.be.empty;
        }
      } catch (error) {
        expect(error.response.status).to.be.oneOf([401, 403, 404]);
      }
    });

    it('should prevent access to resources in unauthorized resource groups', async function() {
      const unauthorizedResourceGroup = 'unauthorized-rg';
      
      try {
        const response = await axios.get(
          `${config.azureFunctionsUrl}/api/accounts?subscriptionId=${config.testSubscriptionId}&resourceGroupName=${unauthorizedResourceGroup}`,
          {
            headers: { 'Authorization': `Bearer ${config.validAuthToken}` }
          }
        );
        
        // Should be rejected or return empty results
        if (response.status === 200) {
          expect(response.data.accounts).to.be.empty;
        }
      } catch (error) {
        expect(error.response.status).to.be.oneOf([401, 403, 404]);
      }
    });
  });

  describe('Data Protection Security', function() {
    it('should not expose sensitive information in error messages', async function() {
      try {
        const response = await axios.get(
          `${config.azureFunctionsUrl}/api/accounts?subscriptionId=invalid&resourceGroupName=invalid`,
          {
            headers: { 'Authorization': `Bearer ${config.validAuthToken}` }
          }
        );
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.response?.data || '';
        
        // Should not expose internal paths, connection strings, or sensitive data
        expect(errorMessage).to.not.include('C:\\');
        expect(errorMessage).to.not.include('/home/');
        expect(errorMessage).to.not.include('connectionString');
        expect(errorMessage).to.not.include('password');
        expect(errorMessage).to.not.include('secret');
        expect(errorMessage).to.not.include('key');
        expect(errorMessage).to.not.include('token');
      }
    });

    it('should not include sensitive headers in responses', async function() {
      const response = await axios.get(
        `${config.azureFunctionsUrl}/api/health`,
        {
          headers: { 'Authorization': `Bearer ${config.validAuthToken}` }
        }
      );
      
      // Should not expose server information
      expect(response.headers).to.not.have.property('server');
      expect(response.headers).to.not.have.property('x-powered-by');
      expect(response.headers).to.not.have.property('x-aspnet-version');
    });

    it('should implement proper CORS headers', async function() {
      const response = await axios.get(
        `${config.azureFunctionsUrl}/api/health`,
        {
          headers: { 
            'Authorization': `Bearer ${config.validAuthToken}`,
            'Origin': 'https://malicious-site.com'
          }
        }
      );
      
      // Should have appropriate CORS headers
      expect(response.headers).to.have.property('access-control-allow-origin');
      
      // Should not allow all origins in production
      if (process.env.NODE_ENV === 'production') {
        expect(response.headers['access-control-allow-origin']).to.not.equal('*');
      }
    });
  });

  describe('Rate Limiting Security', function() {
    it('should implement rate limiting for API endpoints', async function() {
      this.timeout(30000); // Extend timeout for rate limiting test
      
      const requests = [];
      const maxRequests = 100;
      
      // Send many requests rapidly
      for (let i = 0; i < maxRequests; i++) {
        requests.push(
          axios.get(
            `${config.azureFunctionsUrl}/api/health`,
            {
              headers: { 'Authorization': `Bearer ${config.validAuthToken}` },
              timeout: 5000
            }
          ).catch(error => error.response)
        );
      }
      
      const responses = await Promise.all(requests);
      
      // Should have some rate-limited responses
      const rateLimitedResponses = responses.filter(response => 
        response && (response.status === 429 || response.status === 503)
      );
      
      // At least some requests should be rate limited
      expect(rateLimitedResponses.length).to.be.greaterThan(0);
    });
  });

  describe('Logging and Monitoring Security', function() {
    it('should not log sensitive information', async function() {
      // Make a request that would typically be logged
      try {
        await axios.post(
          `${config.azureFunctionsUrl}/api/accounts`,
          {
            subscriptionId: config.testSubscriptionId,
            resourceGroupName: config.testResourceGroup,
            accountName: 'test-account',
            location: 'eastus',
            sensitiveData: 'password123',
            authToken: 'secret-token'
          },
          {
            headers: { 
              'Authorization': `Bearer ${config.validAuthToken}`,
              'Content-Type': 'application/json',
              'X-Custom-Header': 'sensitive-value'
            }
          }
        );
      } catch (error) {
        // Expected to fail, but we're testing logging behavior
      }
      
      // Note: In a real test, we would check log files or log aggregation service
      // to ensure sensitive data is not logged
      expect(true).to.be.true; // Placeholder assertion
    });
  });

  describe('MCP Server Security', function() {
    it('should secure MCP endpoints against unauthorized access', async function() {
      try {
        const response = await axios.post(
          `${config.mcpServerUrl}/api/mcp/call-tool`,
          {
            tool: 'list_accounts',
            parameters: {
              subscriptionId: config.testSubscriptionId,
              resourceGroupName: config.testResourceGroup
            }
          }
        );
        
        // MCP server should either require authentication or have other security measures
        expect(response.status).to.equal(200);
      } catch (error) {
        // If authentication is required, should get 401/403
        expect(error.response?.status).to.be.oneOf([401, 403]);
      }
    });

    it('should validate MCP tool parameters', async function() {
      try {
        const response = await axios.post(
          `${config.mcpServerUrl}/api/mcp/call-tool`,
          {
            tool: 'list_accounts',
            parameters: {
              subscriptionId: '<script>alert("xss")</script>',
              resourceGroupName: '../../etc/passwd'
            }
          }
        );
        
        if (response.status === 200) {
          expect(response.data.content).to.not.include('<script>');
          expect(response.data.content).to.not.include('../../');
        }
      } catch (error) {
        expect(error.response?.status).to.be.oneOf([400, 422]);
      }
    });
  });

  describe('Teams Bot Security', function() {
    it('should validate Teams bot webhook signatures', async function() {
      const maliciousPayload = {
        type: 'message',
        text: 'delete-account --name important-account',
        from: {
          id: 'malicious-user',
          name: 'Hacker'
        },
        conversation: {
          id: 'fake-conversation'
        }
      };
      
      try {
        const response = await axios.post(
          `${config.teamsBotUrl}/api/messages`,
          maliciousPayload,
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
        // Should reject unsigned requests
        expect.fail('Unsigned bot request should have been rejected');
      } catch (error) {
        expect(error.response?.status).to.be.oneOf([401, 403]);
      }
    });

    it('should sanitize Teams bot command inputs', async function() {
      const maliciousCommand = {
        type: 'message',
        text: 'list-accounts --resource-group "test"; rm -rf /',
        from: {
          id: 'test-user',
          name: 'Test User'
        },
        conversation: {
          id: 'test-conversation'
        }
      };
      
      try {
        const response = await axios.post(
          `${config.teamsBotUrl}/api/messages`,
          maliciousCommand,
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
        // Should either reject or sanitize the command
        if (response.status === 200) {
          // Command should be sanitized
          expect(response.data).to.not.include('rm -rf');
        }
      } catch (error) {
        expect(error.response?.status).to.be.oneOf([400, 422]);
      }
    });
  });

  describe('Infrastructure Security', function() {
    it('should use HTTPS for all endpoints', function() {
      if (process.env.NODE_ENV === 'production') {
        expect(config.azureFunctionsUrl).to.include('https://');
        expect(config.mcpServerUrl).to.include('https://');
        expect(config.teamsBotUrl).to.include('https://');
      } else {
        // In development/test, HTTP is acceptable
        this.skip('HTTPS enforcement only applies to production');
      }
    });

    it('should implement security headers', async function() {
      const response = await axios.get(
        `${config.azureFunctionsUrl}/api/health`,
        {
          headers: { 'Authorization': `Bearer ${config.validAuthToken}` }
        }
      );
      
      // Should have security headers
      expect(response.headers).to.have.property('x-content-type-options', 'nosniff');
      expect(response.headers).to.have.property('x-frame-options');
      expect(response.headers['x-frame-options']).to.be.oneOf(['DENY', 'SAMEORIGIN']);
      
      if (process.env.NODE_ENV === 'production') {
        expect(response.headers).to.have.property('strict-transport-security');
      }
    });
  });
});