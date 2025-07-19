/**
 * Integration tests for MCP Server
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import { MCPServer } from '../../src/index';
import { AccountsTool } from '../../src/tools/accounts';
import { VolumesTool } from '../../src/tools/volumes';
import { SnapshotsTool } from '../../src/tools/snapshots';
import { PoolsTool } from '../../src/tools/pools';

// Mock Azure SDK for integration tests
jest.mock('@azure/arm-netapp');
jest.mock('@azure/identity');

describe('MCP Server Integration Tests', () => {
  let server: MCPServer;
  
  beforeAll(async () => {
    // Initialize server with test configuration
    process.env.NODE_ENV = 'test';
    process.env.AZURE_SUBSCRIPTION_ID = 'test-subscription-id';
    process.env.AZURE_TENANT_ID = 'test-tenant-id';
    process.env.AZURE_CLIENT_ID = 'test-client-id';
    process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
    
    server = new MCPServer();
    await server.initialize();
  });

  afterAll(async () => {
    if (server) {
      await server.shutdown();
    }
  });

  describe('Server Initialization', () => {
    it('should initialize MCP server successfully', () => {
      expect(server).toBeDefined();
      expect(server.isRunning()).toBe(true);
    });

    it('should register all ANF tools', () => {
      const registeredTools = server.getRegisteredTools();
      
      expect(registeredTools).toContain('accounts');
      expect(registeredTools).toContain('volumes');
      expect(registeredTools).toContain('snapshots');
      expect(registeredTools).toContain('pools');
      expect(registeredTools).toContain('monitoring');
      expect(registeredTools).toContain('security');
    });

    it('should have health check endpoint', async () => {
      const health = await server.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.components).toHaveProperty('azure');
      expect(health.components).toHaveProperty('tools');
    });
  });

  describe('Tool Registration and Discovery', () => {
    it('should list all available tools', async () => {
      const tools = await server.listTools();
      
      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);
      
      // Check for core ANF tools
      const toolNames = tools.map(tool => tool.name);
      expect(toolNames).toContain('list_accounts');
      expect(toolNames).toContain('create_account');
      expect(toolNames).toContain('list_volumes');
      expect(toolNames).toContain('create_volume');
      expect(toolNames).toContain('list_snapshots');
      expect(toolNames).toContain('create_snapshot');
    });

    it('should provide tool schemas', async () => {
      const tools = await server.listTools();
      const accountsTool = tools.find(tool => tool.name === 'list_accounts');
      
      expect(accountsTool).toBeDefined();
      expect(accountsTool.description).toBeDefined();
      expect(accountsTool.inputSchema).toBeDefined();
      expect(accountsTool.inputSchema.type).toBe('object');
      expect(accountsTool.inputSchema.properties).toHaveProperty('subscriptionId');
      expect(accountsTool.inputSchema.properties).toHaveProperty('resourceGroupName');
    });
  });

  describe('Tool Execution Pipeline', () => {
    it('should execute list_accounts tool with valid parameters', async () => {
      const result = await server.callTool('list_accounts', {
        subscriptionId: 'test-subscription',
        resourceGroupName: 'test-rg',
      });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBe(false);
    });

    it('should validate tool parameters', async () => {
      // Test missing required parameter
      await expect(
        server.callTool('list_accounts', {
          subscriptionId: 'test-subscription',
          // Missing resourceGroupName
        })
      ).rejects.toThrow();
    });

    it('should handle tool execution errors gracefully', async () => {
      // Mock a tool failure
      jest.spyOn(AccountsTool.prototype, 'listAccounts').mockRejectedValueOnce(
        new Error('Azure API error')
      );

      const result = await server.callTool('list_accounts', {
        subscriptionId: 'test-subscription',
        resourceGroupName: 'test-rg',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain('Azure API error');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should handle Azure authentication', async () => {
      // Test authentication flow
      const credentials = await server.getAzureCredentials();
      expect(credentials).toBeDefined();
    });

    it('should validate subscription access', async () => {
      const hasAccess = await server.validateSubscriptionAccess('test-subscription');
      expect(hasAccess).toBe(true);
    });

    it('should handle authentication failures', async () => {
      // Test with invalid credentials
      const originalClientId = process.env.AZURE_CLIENT_ID;
      process.env.AZURE_CLIENT_ID = 'invalid-client-id';

      await expect(server.getAzureCredentials()).rejects.toThrow();

      // Restore original value
      process.env.AZURE_CLIENT_ID = originalClientId;
    });
  });

  describe('Resource Operations Flow', () => {
    it('should support complete account lifecycle', async () => {
      const accountName = 'test-account-' + Date.now();
      
      // Create account
      const createResult = await server.callTool('create_account', {
        subscriptionId: 'test-subscription',
        resourceGroupName: 'test-rg',
        accountName,
        location: 'eastus',
        tags: { test: 'true' },
      });
      
      expect(createResult.isError).toBe(false);

      // List accounts to verify creation
      const listResult = await server.callTool('list_accounts', {
        subscriptionId: 'test-subscription',
        resourceGroupName: 'test-rg',
      });
      
      expect(listResult.isError).toBe(false);

      // Get specific account
      const getResult = await server.callTool('get_account', {
        subscriptionId: 'test-subscription',
        resourceGroupName: 'test-rg',
        accountName,
      });
      
      expect(getResult.isError).toBe(false);

      // Delete account
      const deleteResult = await server.callTool('delete_account', {
        subscriptionId: 'test-subscription',
        resourceGroupName: 'test-rg',
        accountName,
      });
      
      expect(deleteResult.isError).toBe(false);
    });

    it('should support volume operations workflow', async () => {
      // Prerequisites: account and pool must exist
      const volumeName = 'test-volume-' + Date.now();
      
      // Create volume
      const createResult = await server.callTool('create_volume', {
        subscriptionId: 'test-subscription',
        resourceGroupName: 'test-rg',
        accountName: 'test-account',
        poolName: 'test-pool',
        volumeName,
        location: 'eastus',
        serviceLevel: 'Premium',
        usageThreshold: 107374182400, // 100 GiB
        creationToken: volumeName,
        subnetId: '/subscriptions/test-subscription/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/test-subnet',
      });
      
      expect(createResult.isError).toBe(false);

      // Create snapshot of volume
      const snapshotResult = await server.callTool('create_snapshot', {
        subscriptionId: 'test-subscription',
        resourceGroupName: 'test-rg',
        accountName: 'test-account',
        poolName: 'test-pool',
        volumeName,
        snapshotName: 'test-snapshot',
        location: 'eastus',
      });
      
      expect(snapshotResult.isError).toBe(false);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network timeouts', async () => {
      // Mock network timeout
      jest.spyOn(AccountsTool.prototype, 'listAccounts').mockImplementationOnce(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const result = await server.callTool('list_accounts', {
        subscriptionId: 'test-subscription',
        resourceGroupName: 'test-rg',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain('timeout');
    });

    it('should handle rate limiting', async () => {
      // Mock rate limiting error
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      
      jest.spyOn(VolumesTool.prototype, 'listVolumes').mockRejectedValueOnce(rateLimitError);

      const result = await server.callTool('list_volumes', {
        subscriptionId: 'test-subscription',
        resourceGroupName: 'test-rg',
        accountName: 'test-account',
        poolName: 'test-pool',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toContain('Rate limit');
    });

    it('should implement retry logic for transient failures', async () => {
      let attempts = 0;
      jest.spyOn(SnapshotsTool.prototype, 'listSnapshots').mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Transient error');
        }
        return Promise.resolve({ snapshots: [], message: 'Success after retry' });
      });

      const result = await server.callTool('list_snapshots', {
        subscriptionId: 'test-subscription',
        resourceGroupName: 'test-rg',
        accountName: 'test-account',
        poolName: 'test-pool',
        volumeName: 'test-volume',
      });

      expect(attempts).toBe(3);
      expect(result.isError).toBe(false);
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track execution metrics', async () => {
      const startTime = Date.now();
      
      await server.callTool('list_accounts', {
        subscriptionId: 'test-subscription',
        resourceGroupName: 'test-rg',
      });
      
      const metrics = server.getMetrics();
      expect(metrics.totalRequests).toBeGreaterThan(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.lastRequestTime).toBeGreaterThanOrEqual(startTime);
    });

    it('should handle concurrent requests', async () => {
      const promises = [];
      
      // Make 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        promises.push(
          server.callTool('list_accounts', {
            subscriptionId: 'test-subscription',
            resourceGroupName: `test-rg-${i}`,
          })
        );
      }
      
      const results = await Promise.all(promises);
      
      // All requests should complete
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toHaveProperty('content');
      });
    });
  });

  describe('Configuration and Environment', () => {
    it('should load configuration from environment', () => {
      const config = server.getConfiguration();
      
      expect(config.subscriptionId).toBe('test-subscription-id');
      expect(config.tenantId).toBe('test-tenant-id');
      expect(config.clientId).toBe('test-client-id');
      expect(config.environment).toBe('test');
    });

    it('should validate required environment variables', () => {
      const originalSubscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
      delete process.env.AZURE_SUBSCRIPTION_ID;
      
      expect(() => new MCPServer()).toThrow('Missing required environment variable: AZURE_SUBSCRIPTION_ID');
      
      // Restore original value
      process.env.AZURE_SUBSCRIPTION_ID = originalSubscriptionId;
    });
  });
});