/**
 * Load Testing Configuration for ANF-AIOps
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 */

const k6 = require('k6');
const http = require('k6/http');
const { check, sleep } = require('k6');
const { Rate, Trend, Counter } = require('k6/metrics');

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestCount = new Counter('requests');

// Test configuration
export const options = {
  stages: [
    { duration: '5m', target: 10 },   // Ramp-up to 10 users over 5 minutes
    { duration: '10m', target: 10 },  // Stay at 10 users for 10 minutes
    { duration: '5m', target: 50 },   // Ramp-up to 50 users over 5 minutes
    { duration: '10m', target: 50 },  // Stay at 50 users for 10 minutes
    { duration: '5m', target: 100 },  // Ramp-up to 100 users over 5 minutes
    { duration: '10m', target: 100 }, // Stay at 100 users for 10 minutes
    { duration: '5m', target: 0 },    // Ramp-down to 0 users over 5 minutes
  ],
  thresholds: {
    // Error rate should be less than 1%
    errors: ['rate<0.01'],
    // 95% of requests should be below 2000ms
    response_time: ['p(95)<2000'],
    // Average response time should be below 1000ms
    'response_time': ['avg<1000'],
    // Request count should be above 1000
    requests: ['count>1000'],
  },
};

// Test data
const testData = {
  subscriptionId: __ENV.TEST_AZURE_SUBSCRIPTION_ID || '12345678-1234-1234-1234-123456789012',
  resourceGroupName: __ENV.TEST_RESOURCE_GROUP || 'anf-aiops-load-test',
  accountName: __ENV.TEST_ACCOUNT_NAME || 'load-test-account',
  poolName: __ENV.TEST_POOL_NAME || 'load-test-pool',
  volumeName: __ENV.TEST_VOLUME_NAME || 'load-test-volume',
  azureFunctionsUrl: __ENV.AZURE_FUNCTIONS_URL || 'http://localhost:7071',
  mcpServerUrl: __ENV.MCP_SERVER_URL || 'http://localhost:3000',
  authToken: __ENV.TEST_AUTH_TOKEN || 'test-token'
};

// Load test scenarios
const scenarios = {
  // Read-heavy scenario (70% of traffic)
  read_operations: {
    weight: 70,
    operations: [
      { name: 'list_accounts', weight: 30 },
      { name: 'list_pools', weight: 25 },
      { name: 'list_volumes', weight: 25 },
      { name: 'list_snapshots', weight: 20 }
    ]
  },
  
  // Write operations (20% of traffic)
  write_operations: {
    weight: 20,
    operations: [
      { name: 'create_snapshot', weight: 60 },
      { name: 'update_volume', weight: 30 },
      { name: 'create_volume', weight: 10 }
    ]
  },
  
  // Health checks (10% of traffic)
  health_checks: {
    weight: 10,
    operations: [
      { name: 'health_check', weight: 100 }
    ]
  }
};

export default function() {
  // Select scenario based on weight
  const scenarioRandom = Math.random() * 100;
  let selectedScenario;
  let cumulativeWeight = 0;
  
  for (const [scenarioName, scenario] of Object.entries(scenarios)) {
    cumulativeWeight += scenario.weight;
    if (scenarioRandom <= cumulativeWeight) {
      selectedScenario = { name: scenarioName, ...scenario };
      break;
    }
  }
  
  // Select operation within scenario
  const operationRandom = Math.random() * 100;
  let selectedOperation;
  cumulativeWeight = 0;
  
  for (const operation of selectedScenario.operations) {
    cumulativeWeight += operation.weight;
    if (operationRandom <= cumulativeWeight) {
      selectedOperation = operation;
      break;
    }
  }
  
  // Execute the selected operation
  executeOperation(selectedOperation.name);
  
  // Sleep between requests (1-3 seconds)
  sleep(Math.random() * 2 + 1);
}

function executeOperation(operationName) {
  const startTime = Date.now();
  requestCount.add(1);
  
  let response;
  
  try {
    switch (operationName) {
      case 'list_accounts':
        response = listAccounts();
        break;
      case 'list_pools':
        response = listPools();
        break;
      case 'list_volumes':
        response = listVolumes();
        break;
      case 'list_snapshots':
        response = listSnapshots();
        break;
      case 'create_snapshot':
        response = createSnapshot();
        break;
      case 'update_volume':
        response = updateVolume();
        break;
      case 'create_volume':
        response = createVolume();
        break;
      case 'health_check':
        response = healthCheck();
        break;
      default:
        console.warn(`Unknown operation: ${operationName}`);
        return;
    }
    
    const responseTimeMs = Date.now() - startTime;
    responseTime.add(responseTimeMs);
    
    // Check response
    const success = check(response, {
      'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'response time < 5000ms': () => responseTimeMs < 5000,
      'response has body': (r) => r.body && r.body.length > 0,
    });
    
    if (!success) {
      errorRate.add(1);
      console.error(`Operation ${operationName} failed:`, response.status, response.body);
    } else {
      errorRate.add(0);
    }
    
  } catch (error) {
    errorRate.add(1);
    console.error(`Operation ${operationName} threw error:`, error.message);
  }
}

function listAccounts() {
  const url = `${testData.azureFunctionsUrl}/api/accounts?subscriptionId=${testData.subscriptionId}&resourceGroupName=${testData.resourceGroupName}`;
  return http.get(url, {
    headers: {
      'Authorization': `Bearer ${testData.authToken}`
    }
  });
}

function listPools() {
  const url = `${testData.azureFunctionsUrl}/api/pools?subscriptionId=${testData.subscriptionId}&resourceGroupName=${testData.resourceGroupName}&accountName=${testData.accountName}`;
  return http.get(url, {
    headers: {
      'Authorization': `Bearer ${testData.authToken}`
    }
  });
}

function listVolumes() {
  const url = `${testData.azureFunctionsUrl}/api/volumes?subscriptionId=${testData.subscriptionId}&resourceGroupName=${testData.resourceGroupName}&accountName=${testData.accountName}&poolName=${testData.poolName}`;
  return http.get(url, {
    headers: {
      'Authorization': `Bearer ${testData.authToken}`
    }
  });
}

function listSnapshots() {
  const url = `${testData.azureFunctionsUrl}/api/snapshots?subscriptionId=${testData.subscriptionId}&resourceGroupName=${testData.resourceGroupName}&accountName=${testData.accountName}&poolName=${testData.poolName}&volumeName=${testData.volumeName}`;
  return http.get(url, {
    headers: {
      'Authorization': `Bearer ${testData.authToken}`
    }
  });
}

function createSnapshot() {
  const snapshotName = `load-test-snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const url = `${testData.azureFunctionsUrl}/api/snapshots`;
  
  const payload = {
    subscriptionId: testData.subscriptionId,
    resourceGroupName: testData.resourceGroupName,
    accountName: testData.accountName,
    poolName: testData.poolName,
    volumeName: testData.volumeName,
    snapshotName: snapshotName,
    location: 'eastus',
    tags: {
      'test-type': 'load-test',
      'created-by': 'k6-load-test'
    }
  };
  
  return http.post(url, JSON.stringify(payload), {
    headers: {
      'Authorization': `Bearer ${testData.authToken}`,
      'Content-Type': 'application/json'
    }
  });
}

function updateVolume() {
  const url = `${testData.azureFunctionsUrl}/api/volumes`;
  
  const payload = {
    subscriptionId: testData.subscriptionId,
    resourceGroupName: testData.resourceGroupName,
    accountName: testData.accountName,
    poolName: testData.poolName,
    volumeName: testData.volumeName,
    tags: {
      'last-updated': new Date().toISOString(),
      'updated-by': 'k6-load-test'
    }
  };
  
  return http.put(url, JSON.stringify(payload), {
    headers: {
      'Authorization': `Bearer ${testData.authToken}`,
      'Content-Type': 'application/json'
    }
  });
}

function createVolume() {
  const volumeName = `load-test-volume-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const url = `${testData.azureFunctionsUrl}/api/volumes`;
  
  const payload = {
    subscriptionId: testData.subscriptionId,
    resourceGroupName: testData.resourceGroupName,
    accountName: testData.accountName,
    poolName: testData.poolName,
    volumeName: volumeName,
    location: 'eastus',
    serviceLevel: 'Standard',
    usageThreshold: 107374182400, // 100 GiB
    creationToken: volumeName,
    subnetId: `/subscriptions/${testData.subscriptionId}/resourceGroups/${testData.resourceGroupName}/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/anf-subnet`,
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
      'test-type': 'load-test',
      'created-by': 'k6-load-test'
    }
  };
  
  return http.post(url, JSON.stringify(payload), {
    headers: {
      'Authorization': `Bearer ${testData.authToken}`,
      'Content-Type': 'application/json'
    }
  });
}

function healthCheck() {
  return http.get(`${testData.azureFunctionsUrl}/api/health`);
}

// Setup function (called once at the beginning)
export function setup() {
  console.log('Starting ANF-AIOps load test...');
  console.log(`Target Azure Functions: ${testData.azureFunctionsUrl}`);
  console.log(`Target MCP Server: ${testData.mcpServerUrl}`);
  console.log(`Test Subscription: ${testData.subscriptionId}`);
  console.log(`Test Resource Group: ${testData.resourceGroupName}`);
  
  // Verify services are healthy before starting load test
  const healthResponse = healthCheck();
  if (healthResponse.status !== 200) {
    throw new Error(`Health check failed: ${healthResponse.status}`);
  }
  
  return testData;
}

// Teardown function (called once at the end)
export function teardown(data) {
  console.log('Load test completed');
  console.log('Clean up any temporary resources if needed');
}

// Export for use in other files
module.exports = {
  options,
  scenarios,
  testData,
  executeOperation
};