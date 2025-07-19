/**
 * Mock utilities for Azure SDK components
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import { NetAppManagementClient } from '@azure/arm-netapp';
import { DefaultAzureCredential } from '@azure/identity';
import { 
  mockAccounts, 
  mockCapacityPools, 
  mockVolumes, 
  mockSnapshots,
  mockBackups,
  mockBackupPolicies,
  errorResponses 
} from '../fixtures/anf-data';

export class MockNetAppManagementClient {
  public accounts = {
    list: jest.fn(),
    get: jest.fn(),
    createOrUpdate: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  public pools = {
    list: jest.fn(),
    get: jest.fn(),
    createOrUpdate: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  public volumes = {
    list: jest.fn(),
    get: jest.fn(),
    createOrUpdate: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    revert: jest.fn(),
    resync: jest.fn(),
    authorizeReplication: jest.fn(),
    breakReplication: jest.fn(),
    poolChange: jest.fn(),
  };

  public snapshots = {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    restoreFiles: jest.fn(),
  };

  public backups = {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  public backupPolicies = {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  public subvolumes = {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  public volumeGroups = {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };

  public volumeQuotaRules = {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  constructor() {
    this.setupDefaultMocks();
  }

  private setupDefaultMocks() {
    // Accounts mocks
    this.accounts.list.mockResolvedValue(this.createAsyncIterator(mockAccounts));
    this.accounts.get.mockImplementation((resourceGroupName: string, accountName: string) => {
      const account = mockAccounts.find(a => a.name === accountName);
      if (!account) {
        throw new Error(errorResponses.notFound.message);
      }
      return Promise.resolve(account);
    });
    this.accounts.createOrUpdate.mockImplementation((resourceGroupName: string, accountName: string, account: any) => {
      return Promise.resolve({
        ...account,
        id: `/subscriptions/test-subscription/resourceGroups/${resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${accountName}`,
        name: accountName,
        properties: { ...account.properties, provisioningState: 'Succeeded' },
      });
    });
    this.accounts.delete.mockResolvedValue(undefined);
    this.accounts.update.mockImplementation((resourceGroupName: string, accountName: string, account: any) => {
      return Promise.resolve({
        id: `/subscriptions/test-subscription/resourceGroups/${resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${accountName}`,
        name: accountName,
        ...account,
      });
    });

    // Pools mocks
    this.pools.list.mockResolvedValue(this.createAsyncIterator(mockCapacityPools));
    this.pools.get.mockImplementation((resourceGroupName: string, accountName: string, poolName: string) => {
      const pool = mockCapacityPools.find(p => p.name === poolName);
      if (!pool) {
        throw new Error(errorResponses.notFound.message);
      }
      return Promise.resolve(pool);
    });
    this.pools.createOrUpdate.mockImplementation((resourceGroupName: string, accountName: string, poolName: string, pool: any) => {
      return Promise.resolve({
        ...pool,
        id: `/subscriptions/test-subscription/resourceGroups/${resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${accountName}/capacityPools/${poolName}`,
        name: poolName,
        properties: { ...pool.properties, provisioningState: 'Succeeded' },
      });
    });
    this.pools.delete.mockResolvedValue(undefined);
    this.pools.update.mockImplementation((resourceGroupName: string, accountName: string, poolName: string, pool: any) => {
      return Promise.resolve({
        id: `/subscriptions/test-subscription/resourceGroups/${resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${accountName}/capacityPools/${poolName}`,
        name: poolName,
        ...pool,
      });
    });

    // Volumes mocks
    this.volumes.list.mockResolvedValue(this.createAsyncIterator(mockVolumes));
    this.volumes.get.mockImplementation((resourceGroupName: string, accountName: string, poolName: string, volumeName: string) => {
      const volume = mockVolumes.find(v => v.name === volumeName);
      if (!volume) {
        throw new Error(errorResponses.notFound.message);
      }
      return Promise.resolve(volume);
    });
    this.volumes.createOrUpdate.mockImplementation((resourceGroupName: string, accountName: string, poolName: string, volumeName: string, volume: any) => {
      return Promise.resolve({
        ...volume,
        id: `/subscriptions/test-subscription/resourceGroups/${resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${accountName}/capacityPools/${poolName}/volumes/${volumeName}`,
        name: volumeName,
        properties: { 
          ...volume.properties, 
          provisioningState: 'Succeeded',
          fileSystemId: `fs-${Math.random().toString(36).substr(2, 9)}`,
        },
      });
    });
    this.volumes.delete.mockResolvedValue(undefined);
    this.volumes.update.mockImplementation((resourceGroupName: string, accountName: string, poolName: string, volumeName: string, volume: any) => {
      return Promise.resolve({
        id: `/subscriptions/test-subscription/resourceGroups/${resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${accountName}/capacityPools/${poolName}/volumes/${volumeName}`,
        name: volumeName,
        ...volume,
      });
    });
    this.volumes.revert.mockResolvedValue(undefined);
    this.volumes.resync.mockResolvedValue(undefined);
    this.volumes.authorizeReplication.mockResolvedValue(undefined);
    this.volumes.breakReplication.mockResolvedValue(undefined);
    this.volumes.poolChange.mockResolvedValue(undefined);

    // Snapshots mocks
    this.snapshots.list.mockResolvedValue(this.createAsyncIterator(mockSnapshots));
    this.snapshots.get.mockImplementation((resourceGroupName: string, accountName: string, poolName: string, volumeName: string, snapshotName: string) => {
      const snapshot = mockSnapshots.find(s => s.name === snapshotName);
      if (!snapshot) {
        throw new Error(errorResponses.notFound.message);
      }
      return Promise.resolve(snapshot);
    });
    this.snapshots.create.mockImplementation((resourceGroupName: string, accountName: string, poolName: string, volumeName: string, snapshotName: string, snapshot: any) => {
      return Promise.resolve({
        ...snapshot,
        id: `/subscriptions/test-subscription/resourceGroups/${resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${accountName}/capacityPools/${poolName}/volumes/${volumeName}/snapshots/${snapshotName}`,
        name: snapshotName,
        properties: { 
          ...snapshot.properties, 
          provisioningState: 'Succeeded',
          snapshotId: `snap-${Math.random().toString(36).substr(2, 9)}`,
          created: new Date(),
        },
      });
    });
    this.snapshots.delete.mockResolvedValue(undefined);
    this.snapshots.update.mockImplementation((resourceGroupName: string, accountName: string, poolName: string, volumeName: string, snapshotName: string, snapshot: any) => {
      return Promise.resolve({
        id: `/subscriptions/test-subscription/resourceGroups/${resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${accountName}/capacityPools/${poolName}/volumes/${volumeName}/snapshots/${snapshotName}`,
        name: snapshotName,
        ...snapshot,
      });
    });
    this.snapshots.restoreFiles.mockResolvedValue(undefined);

    // Backups mocks
    this.backups.list.mockResolvedValue(this.createAsyncIterator(mockBackups));
    this.backups.get.mockImplementation((resourceGroupName: string, accountName: string, poolName: string, volumeName: string, backupName: string) => {
      const backup = mockBackups.find(b => b.name === backupName);
      if (!backup) {
        throw new Error(errorResponses.notFound.message);
      }
      return Promise.resolve(backup);
    });
    this.backups.create.mockResolvedValue(mockBackups[0]);
    this.backups.delete.mockResolvedValue(undefined);

    // Backup policies mocks
    this.backupPolicies.list.mockResolvedValue(this.createAsyncIterator(mockBackupPolicies));
    this.backupPolicies.get.mockImplementation((resourceGroupName: string, accountName: string, backupPolicyName: string) => {
      const policy = mockBackupPolicies.find(p => p.name === backupPolicyName);
      if (!policy) {
        throw new Error(errorResponses.notFound.message);
      }
      return Promise.resolve(policy);
    });
    this.backupPolicies.create.mockResolvedValue(mockBackupPolicies[0]);
    this.backupPolicies.delete.mockResolvedValue(undefined);
  }

  private createAsyncIterator<T>(items: T[]) {
    return {
      [Symbol.asyncIterator]: async function* () {
        for (const item of items) {
          yield item;
        }
      },
    };
  }

  // Helper methods for testing scenarios
  public simulateError(operation: string, error: keyof typeof errorResponses) {
    const errorDetails = errorResponses[error];
    const errorObj = new Error(errorDetails.message);
    errorObj.name = errorDetails.name;
    (errorObj as any).code = errorDetails.code;
    (errorObj as any).statusCode = errorDetails.statusCode;

    switch (operation) {
      case 'listAccounts':
        this.accounts.list.mockRejectedValueOnce(errorObj);
        break;
      case 'getAccount':
        this.accounts.get.mockRejectedValueOnce(errorObj);
        break;
      case 'createAccount':
        this.accounts.createOrUpdate.mockRejectedValueOnce(errorObj);
        break;
      case 'deleteAccount':
        this.accounts.delete.mockRejectedValueOnce(errorObj);
        break;
      case 'listVolumes':
        this.volumes.list.mockRejectedValueOnce(errorObj);
        break;
      case 'getVolume':
        this.volumes.get.mockRejectedValueOnce(errorObj);
        break;
      case 'createVolume':
        this.volumes.createOrUpdate.mockRejectedValueOnce(errorObj);
        break;
      case 'deleteVolume':
        this.volumes.delete.mockRejectedValueOnce(errorObj);
        break;
      case 'listSnapshots':
        this.snapshots.list.mockRejectedValueOnce(errorObj);
        break;
      case 'getSnapshot':
        this.snapshots.get.mockRejectedValueOnce(errorObj);
        break;
      case 'createSnapshot':
        this.snapshots.create.mockRejectedValueOnce(errorObj);
        break;
      case 'deleteSnapshot':
        this.snapshots.delete.mockRejectedValueOnce(errorObj);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  public simulateTimeout(operation: string, timeoutMs: number = 5000) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });

    switch (operation) {
      case 'listAccounts':
        this.accounts.list.mockReturnValueOnce(timeoutPromise);
        break;
      case 'listVolumes':
        this.volumes.list.mockReturnValueOnce(timeoutPromise);
        break;
      case 'listSnapshots':
        this.snapshots.list.mockReturnValueOnce(timeoutPromise);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  public reset() {
    jest.clearAllMocks();
    this.setupDefaultMocks();
  }
}

export class MockDefaultAzureCredential {
  public getToken = jest.fn().mockResolvedValue({
    token: 'mock-access-token',
    expiresOnTimestamp: Date.now() + 3600000, // 1 hour from now
  });

  public static mockCredential = new MockDefaultAzureCredential();
}

// Factory function to create mock clients
export function createMockNetAppClient(): MockNetAppManagementClient {
  return new MockNetAppManagementClient();
}

// Jest mock setup
export function setupAzureMocks() {
  jest.mock('@azure/arm-netapp', () => ({
    NetAppManagementClient: jest.fn().mockImplementation(() => new MockNetAppManagementClient()),
  }));

  jest.mock('@azure/identity', () => ({
    DefaultAzureCredential: jest.fn().mockImplementation(() => MockDefaultAzureCredential.mockCredential),
  }));
}

// Test helper to verify mock calls
export function verifyMockCalls(mockClient: MockNetAppManagementClient) {
  return {
    accounts: {
      list: mockClient.accounts.list.mock.calls,
      get: mockClient.accounts.get.mock.calls,
      createOrUpdate: mockClient.accounts.createOrUpdate.mock.calls,
      delete: mockClient.accounts.delete.mock.calls,
      update: mockClient.accounts.update.mock.calls,
    },
    volumes: {
      list: mockClient.volumes.list.mock.calls,
      get: mockClient.volumes.get.mock.calls,
      createOrUpdate: mockClient.volumes.createOrUpdate.mock.calls,
      delete: mockClient.volumes.delete.mock.calls,
      update: mockClient.volumes.update.mock.calls,
    },
    snapshots: {
      list: mockClient.snapshots.list.mock.calls,
      get: mockClient.snapshots.get.mock.calls,
      create: mockClient.snapshots.create.mock.calls,
      delete: mockClient.snapshots.delete.mock.calls,
      update: mockClient.snapshots.update.mock.calls,
    },
  };
}