/**
 * End-to-End tests for ANF-AIOps system
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 */

const axios = require('axios');
const { expect } = require('chai');
const { describe, it, before, after } = require('mocha');

describe('ANF-AIOps End-to-End Tests', function() {
  this.timeout(120000); // 2 minutes for E2E tests

  const config = {
    azureFunctionsUrl: process.env.AZURE_FUNCTIONS_URL || 'http://localhost:7071',
    mcpServerUrl: process.env.MCP_SERVER_URL || 'http://localhost:3000',
    teamsBotUrl: process.env.TEAMS_BOT_URL || 'http://localhost:3978',
    testSubscriptionId: process.env.TEST_AZURE_SUBSCRIPTION_ID,
    testResourceGroup: process.env.TEST_RESOURCE_GROUP || 'anf-aiops-e2e-test',
    testAccountName: `e2e-test-account-${Date.now()}`,
    testPoolName: `e2e-test-pool-${Date.now()}`,
    testVolumeName: `e2e-test-volume-${Date.now()}`,
    testSnapshotName: `e2e-test-snapshot-${Date.now()}`,
    authToken: process.env.TEST_AUTH_TOKEN
  };

  let createdResources = {
    account: null,
    pool: null,
    volume: null,
    snapshot: null
  };

  before(async function() {
    console.log('Setting up E2E test environment...');
    
    // Verify all required services are running
    await verifyServiceHealth();
    
    // Verify authentication
    if (!config.authToken) {
      throw new Error('TEST_AUTH_TOKEN environment variable is required for E2E tests');
    }
    
    console.log('E2E test environment ready');
  });

  after(async function() {
    console.log('Cleaning up E2E test resources...');
    await cleanupTestResources();
    console.log('E2E test cleanup complete');
  });

  describe('Service Health Checks', function() {
    it('should verify Azure Functions are healthy', async function() {
      const response = await axios.get(`${config.azureFunctionsUrl}/api/health`, {
        headers: { 'Authorization': `Bearer ${config.authToken}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('status', 'healthy');
    });

    it('should verify MCP Server is healthy', async function() {
      const response = await axios.get(`${config.mcpServerUrl}/health`);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('status', 'healthy');
    });

    it('should verify Teams Bot is healthy', async function() {
      const response = await axios.get(`${config.teamsBotUrl}/api/health`);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('status', 'healthy');
    });
  });

  describe('Complete ANF Lifecycle', function() {
    it('should create a NetApp account', async function() {
      const createAccountRequest = {
        subscriptionId: config.testSubscriptionId,
        resourceGroupName: config.testResourceGroup,
        accountName: config.testAccountName,
        location: 'eastus',
        tags: {
          'test-type': 'e2e',
          'created-by': 'anf-aiops-e2e-tests',
          'created-at': new Date().toISOString()
        }
      };

      const response = await axios.post(
        `${config.azureFunctionsUrl}/api/accounts`,
        createAccountRequest,
        {
          headers: { 
            'Authorization': `Bearer ${config.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      expect(response.status).to.equal(201);
      expect(response.data).to.have.property('account');
      expect(response.data.account.name).to.equal(config.testAccountName);
      expect(response.data.message).to.include('successfully created');

      createdResources.account = response.data.account;
    });

    it('should create a capacity pool', async function() {
      const createPoolRequest = {
        subscriptionId: config.testSubscriptionId,
        resourceGroupName: config.testResourceGroup,
        accountName: config.testAccountName,
        poolName: config.testPoolName,
        location: 'eastus',
        serviceLevel: 'Premium',
        size: 4398046511104, // 4 TiB
        qosType: 'Auto',
        tags: {
          'test-type': 'e2e',
          'parent-account': config.testAccountName
        }
      };

      const response = await axios.post(
        `${config.azureFunctionsUrl}/api/pools`,
        createPoolRequest,
        {
          headers: { 
            'Authorization': `Bearer ${config.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      expect(response.status).to.equal(201);
      expect(response.data).to.have.property('pool');
      expect(response.data.pool.name).to.equal(config.testPoolName);
      expect(response.data.pool.properties.serviceLevel).to.equal('Premium');

      createdResources.pool = response.data.pool;
    });

    it('should create a volume', async function() {
      const createVolumeRequest = {
        subscriptionId: config.testSubscriptionId,
        resourceGroupName: config.testResourceGroup,
        accountName: config.testAccountName,
        poolName: config.testPoolName,
        volumeName: config.testVolumeName,
        location: 'eastus',
        serviceLevel: 'Premium',
        usageThreshold: 107374182400, // 100 GiB
        creationToken: config.testVolumeName,
        subnetId: `/subscriptions/${config.testSubscriptionId}/resourceGroups/${config.testResourceGroup}/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/anf-subnet`,
        exportPolicy: {
          rules: [
            {
              ruleIndex: 1,
              unixReadWrite: true,
              nfsv3: true,
              allowedClients: '10.0.0.0/24',
              hasRootAccess: true
            }
          ]
        },
        tags: {
          'test-type': 'e2e',
          'parent-pool': config.testPoolName
        }
      };

      const response = await axios.post(
        `${config.azureFunctionsUrl}/api/volumes`,
        createVolumeRequest,
        {
          headers: { 
            'Authorization': `Bearer ${config.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      expect(response.status).to.equal(201);
      expect(response.data).to.have.property('volume');
      expect(response.data.volume.name).to.equal(config.testVolumeName);
      expect(response.data.volume.properties.usageThreshold).to.equal(107374182400);

      createdResources.volume = response.data.volume;
    });

    it('should create a snapshot', async function() {
      const createSnapshotRequest = {
        subscriptionId: config.testSubscriptionId,
        resourceGroupName: config.testResourceGroup,
        accountName: config.testAccountName,
        poolName: config.testPoolName,
        volumeName: config.testVolumeName,
        snapshotName: config.testSnapshotName,
        location: 'eastus',
        tags: {
          'test-type': 'e2e',
          'parent-volume': config.testVolumeName
        }
      };

      const response = await axios.post(
        `${config.azureFunctionsUrl}/api/snapshots`,
        createSnapshotRequest,
        {
          headers: { 
            'Authorization': `Bearer ${config.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      expect(response.status).to.equal(201);
      expect(response.data).to.have.property('snapshot');
      expect(response.data.snapshot.name).to.equal(config.testSnapshotName);
      expect(response.data.snapshot.properties.provisioningState).to.equal('Succeeded');

      createdResources.snapshot = response.data.snapshot;
    });

    it('should list all created resources', async function() {
      // List accounts
      const accountsResponse = await axios.get(
        `${config.azureFunctionsUrl}/api/accounts?subscriptionId=${config.testSubscriptionId}&resourceGroupName=${config.testResourceGroup}`,
        {
          headers: { 'Authorization': `Bearer ${config.authToken}` }
        }
      );

      expect(accountsResponse.status).to.equal(200);
      expect(accountsResponse.data.accounts).to.be.an('array');
      expect(accountsResponse.data.accounts.some(a => a.name === config.testAccountName)).to.be.true;

      // List pools
      const poolsResponse = await axios.get(
        `${config.azureFunctionsUrl}/api/pools?subscriptionId=${config.testSubscriptionId}&resourceGroupName=${config.testResourceGroup}&accountName=${config.testAccountName}`,
        {
          headers: { 'Authorization': `Bearer ${config.authToken}` }
        }
      );

      expect(poolsResponse.status).to.equal(200);
      expect(poolsResponse.data.pools).to.be.an('array');
      expect(poolsResponse.data.pools.some(p => p.name === config.testPoolName)).to.be.true;

      // List volumes
      const volumesResponse = await axios.get(
        `${config.azureFunctionsUrl}/api/volumes?subscriptionId=${config.testSubscriptionId}&resourceGroupName=${config.testResourceGroup}&accountName=${config.testAccountName}&poolName=${config.testPoolName}`,
        {
          headers: { 'Authorization': `Bearer ${config.authToken}` }
        }
      );

      expect(volumesResponse.status).to.equal(200);
      expect(volumesResponse.data.volumes).to.be.an('array');
      expect(volumesResponse.data.volumes.some(v => v.name === config.testVolumeName)).to.be.true;

      // List snapshots
      const snapshotsResponse = await axios.get(
        `${config.azureFunctionsUrl}/api/snapshots?subscriptionId=${config.testSubscriptionId}&resourceGroupName=${config.testResourceGroup}&accountName=${config.testAccountName}&poolName=${config.testPoolName}&volumeName=${config.testVolumeName}`,
        {
          headers: { 'Authorization': `Bearer ${config.authToken}` }
        }
      );

      expect(snapshotsResponse.status).to.equal(200);
      expect(snapshotsResponse.data.snapshots).to.be.an('array');
      expect(snapshotsResponse.data.snapshots.some(s => s.name === config.testSnapshotName)).to.be.true;
    });
  });

  describe('MCP Server Integration', function() {
    it('should call MCP tools through API', async function() {
      const mcpRequest = {
        tool: 'list_accounts',
        parameters: {
          subscriptionId: config.testSubscriptionId,
          resourceGroupName: config.testResourceGroup
        }
      };

      const response = await axios.post(
        `${config.mcpServerUrl}/api/mcp/call-tool`,
        mcpRequest,
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('content');
      expect(response.data.isError).to.be.false;
    });

    it('should handle MCP tool errors gracefully', async function() {
      const mcpRequest = {
        tool: 'list_accounts',
        parameters: {
          subscriptionId: 'invalid-subscription-id',
          resourceGroupName: 'invalid-rg'
        }
      };

      const response = await axios.post(
        `${config.mcpServerUrl}/api/mcp/call-tool`,
        mcpRequest,
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.isError).to.be.true;
      expect(response.data.content).to.include('error');
    });
  });

  describe('Teams Bot Integration', function() {
    it('should handle bot commands via webhook', async function() {
      const botMessage = {
        type: 'message',
        text: `list-accounts --resource-group ${config.testResourceGroup}`,
        from: {
          id: 'test-user',
          name: 'E2E Test User'
        },
        conversation: {
          id: 'test-conversation'
        },
        channelId: 'test'
      };

      const response = await axios.post(
        `${config.teamsBotUrl}/api/messages`,
        botMessage,
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      expect(response.status).to.equal(200);
    });

    it('should provide help information', async function() {
      const botMessage = {
        type: 'message',
        text: 'help',
        from: {
          id: 'test-user',
          name: 'E2E Test User'
        },
        conversation: {
          id: 'test-conversation'
        },
        channelId: 'test'
      };

      const response = await axios.post(
        `${config.teamsBotUrl}/api/messages`,
        botMessage,
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      expect(response.status).to.equal(200);
    });
  });

  describe('Cross-Service Communication', function() {
    it('should demonstrate full workflow from Teams Bot to Azure Functions', async function() {
      // Simulate Teams Bot calling Azure Functions via MCP Server
      const teamsBotRequest = {
        command: 'list-volumes',
        parameters: {
          resourceGroup: config.testResourceGroup,
          account: config.testAccountName,
          pool: config.testPoolName
        },
        user: {
          id: 'test-user',
          permissions: ['Reader', 'Contributor']
        }
      };

      const response = await axios.post(
        `${config.teamsBotUrl}/api/execute-command`,
        teamsBotRequest,
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data).to.have.property('response');
      expect(response.data.response).to.include(config.testVolumeName);
    });
  });

  // Helper functions
  async function verifyServiceHealth() {
    const services = [
      { name: 'Azure Functions', url: `${config.azureFunctionsUrl}/api/health` },
      { name: 'MCP Server', url: `${config.mcpServerUrl}/health` },
      { name: 'Teams Bot', url: `${config.teamsBotUrl}/api/health` }
    ];

    for (const service of services) {
      try {
        console.log(`Checking ${service.name}...`);
        const response = await axios.get(service.url, { timeout: 10000 });
        if (response.status !== 200) {
          throw new Error(`${service.name} returned status ${response.status}`);
        }
        console.log(`✓ ${service.name} is healthy`);
      } catch (error) {
        console.error(`✗ ${service.name} health check failed:`, error.message);
        throw new Error(`${service.name} is not available. Please ensure all services are running.`);
      }
    }
  }

  async function cleanupTestResources() {
    try {
      // Delete in reverse order of creation
      if (createdResources.snapshot) {
        console.log('Deleting test snapshot...');
        await axios.delete(
          `${config.azureFunctionsUrl}/api/snapshots?subscriptionId=${config.testSubscriptionId}&resourceGroupName=${config.testResourceGroup}&accountName=${config.testAccountName}&poolName=${config.testPoolName}&volumeName=${config.testVolumeName}&snapshotName=${config.testSnapshotName}`,
          {
            headers: { 'Authorization': `Bearer ${config.authToken}` }
          }
        );
      }

      if (createdResources.volume) {
        console.log('Deleting test volume...');
        await axios.delete(
          `${config.azureFunctionsUrl}/api/volumes?subscriptionId=${config.testSubscriptionId}&resourceGroupName=${config.testResourceGroup}&accountName=${config.testAccountName}&poolName=${config.testPoolName}&volumeName=${config.testVolumeName}`,
          {
            headers: { 'Authorization': `Bearer ${config.authToken}` }
          }
        );
      }

      if (createdResources.pool) {
        console.log('Deleting test pool...');
        await axios.delete(
          `${config.azureFunctionsUrl}/api/pools?subscriptionId=${config.testSubscriptionId}&resourceGroupName=${config.testResourceGroup}&accountName=${config.testAccountName}&poolName=${config.testPoolName}`,
          {
            headers: { 'Authorization': `Bearer ${config.authToken}` }
          }
        );
      }

      if (createdResources.account) {
        console.log('Deleting test account...');
        await axios.delete(
          `${config.azureFunctionsUrl}/api/accounts?subscriptionId=${config.testSubscriptionId}&resourceGroupName=${config.testResourceGroup}&accountName=${config.testAccountName}`,
          {
            headers: { 'Authorization': `Bearer ${config.authToken}` }
          }
        );
      }

      console.log('All test resources cleaned up successfully');
    } catch (error) {
      console.warn('Some resources may not have been cleaned up:', error.message);
      console.warn('Please verify and clean up manually if necessary');
    }
  }
});