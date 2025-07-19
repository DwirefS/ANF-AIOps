/**
 * Unit tests for Azure NetApp Files Snapshots operations
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import { SnapshotsTool } from '../../src/tools/snapshots';
import { NetAppManagementClient } from '@azure/arm-netapp';
import { DefaultAzureCredential } from '@azure/identity';

// Mock Azure SDK
jest.mock('@azure/arm-netapp');
jest.mock('@azure/identity');

describe('SnapshotsTool', () => {
  let snapshotsTool: SnapshotsTool;
  let mockClient: jest.Mocked<NetAppManagementClient>;
  let mockCredential: jest.Mocked<DefaultAzureCredential>;

  beforeEach(() => {
    // Setup mocks
    mockCredential = new DefaultAzureCredential() as jest.Mocked<DefaultAzureCredential>;
    mockClient = {
      snapshots: {
        list: jest.fn(),
        get: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        restoreFiles: jest.fn(),
      },
    } as any;

    (NetAppManagementClient as jest.MockedClass<typeof NetAppManagementClient>).mockImplementation(() => mockClient);

    // Initialize tool
    snapshotsTool = new SnapshotsTool();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listSnapshots', () => {
    it('should list all snapshots for a volume', async () => {
      const mockSnapshots = [
        {
          id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.NetApp/netAppAccounts/account1/capacityPools/pool1/volumes/vol1/snapshots/snap1',
          name: 'snap1',
          properties: {
            snapshotId: 'snapshot-123',
            created: new Date('2024-01-01T12:00:00Z'),
            provisioningState: 'Succeeded',
          },
        },
        {
          id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.NetApp/netAppAccounts/account1/capacityPools/pool1/volumes/vol1/snapshots/snap2',
          name: 'snap2',
          properties: {
            snapshotId: 'snapshot-456',
            created: new Date('2024-01-02T12:00:00Z'),
            provisioningState: 'Succeeded',
          },
        },
      ];

      mockClient.snapshots.list.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield* mockSnapshots;
        },
      } as any);

      const result = await snapshotsTool.listSnapshots({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
      });

      expect(result).toHaveProperty('snapshots');
      expect(result.snapshots).toHaveLength(2);
      expect(result.snapshots[0].name).toBe('snap1');
      expect(result.snapshots[1].name).toBe('snap2');
      expect(mockClient.snapshots.list).toHaveBeenCalledWith('rg1', 'account1', 'pool1', 'vol1');
    });

    it('should handle empty snapshot list', async () => {
      mockClient.snapshots.list.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          // Empty iterator
        },
      } as any);

      const result = await snapshotsTool.listSnapshots({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
      });

      expect(result.snapshots).toHaveLength(0);
      expect(result.message).toContain('No snapshots found');
    });

    it('should sort snapshots by creation date (newest first)', async () => {
      const mockSnapshots = [
        {
          id: 'snap1-id',
          name: 'snap1',
          properties: {
            created: new Date('2024-01-01T12:00:00Z'),
          },
        },
        {
          id: 'snap2-id',
          name: 'snap2',
          properties: {
            created: new Date('2024-01-03T12:00:00Z'),
          },
        },
        {
          id: 'snap3-id',
          name: 'snap3',
          properties: {
            created: new Date('2024-01-02T12:00:00Z'),
          },
        },
      ];

      mockClient.snapshots.list.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield* mockSnapshots;
        },
      } as any);

      const result = await snapshotsTool.listSnapshots({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
      });

      // Should be sorted by creation date, newest first
      expect(result.snapshots[0].name).toBe('snap2'); // 2024-01-03
      expect(result.snapshots[1].name).toBe('snap3'); // 2024-01-02
      expect(result.snapshots[2].name).toBe('snap1'); // 2024-01-01
    });
  });

  describe('getSnapshot', () => {
    it('should retrieve a specific snapshot with details', async () => {
      const mockSnapshot = {
        id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.NetApp/netAppAccounts/account1/capacityPools/pool1/volumes/vol1/snapshots/snap1',
        name: 'snap1',
        properties: {
          snapshotId: 'snapshot-123',
          created: new Date('2024-01-01T12:00:00Z'),
          provisioningState: 'Succeeded',
        },
      };

      mockClient.snapshots.get.mockResolvedValue(mockSnapshot);

      const result = await snapshotsTool.getSnapshot({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
        snapshotName: 'snap1',
      });

      expect(result.snapshot).toEqual(mockSnapshot);
      expect(mockClient.snapshots.get).toHaveBeenCalledWith('rg1', 'account1', 'pool1', 'vol1', 'snap1');
    });

    it('should handle non-existent snapshot', async () => {
      const error = new Error('Snapshot not found');
      error.name = 'ResourceNotFoundError';
      mockClient.snapshots.get.mockRejectedValue(error);

      await expect(
        snapshotsTool.getSnapshot({
          subscriptionId: 'sub1',
          resourceGroupName: 'rg1',
          accountName: 'account1',
          poolName: 'pool1',
          volumeName: 'vol1',
          snapshotName: 'nonexistent',
        })
      ).rejects.toThrow('Snapshot not found');
    });
  });

  describe('createSnapshot', () => {
    it('should create a new snapshot', async () => {
      const mockSnapshot = {
        id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.NetApp/netAppAccounts/account1/capacityPools/pool1/volumes/vol1/snapshots/newsnap',
        name: 'newsnap',
        location: 'eastus',
        properties: {
          snapshotId: 'snapshot-789',
          created: new Date('2024-01-03T12:00:00Z'),
          provisioningState: 'Succeeded',
        },
      };

      mockClient.snapshots.create.mockResolvedValue(mockSnapshot);

      const result = await snapshotsTool.createSnapshot({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
        snapshotName: 'newsnap',
        location: 'eastus',
      });

      expect(result.snapshot).toEqual(mockSnapshot);
      expect(result.message).toContain('successfully created');
      expect(mockClient.snapshots.create).toHaveBeenCalledWith(
        'rg1',
        'account1',
        'pool1',
        'vol1',
        'newsnap',
        expect.objectContaining({
          location: 'eastus',
        })
      );
    });

    it('should create snapshot with tags', async () => {
      const tags = { backup: 'daily', environment: 'prod' };
      const mockSnapshot = {
        id: 'snapshot-id',
        name: 'taggedsnap',
        location: 'eastus',
        tags,
        properties: {
          snapshotId: 'snapshot-999',
          provisioningState: 'Succeeded',
        },
      };

      mockClient.snapshots.create.mockResolvedValue(mockSnapshot);

      const result = await snapshotsTool.createSnapshot({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
        snapshotName: 'taggedsnap',
        location: 'eastus',
        tags,
      });

      expect(mockClient.snapshots.create).toHaveBeenCalledWith(
        'rg1',
        'account1',
        'pool1',
        'vol1',
        'taggedsnap',
        expect.objectContaining({
          location: 'eastus',
          tags,
        })
      );
    });

    it('should handle snapshot creation failures', async () => {
      const error = new Error('Volume not found');
      mockClient.snapshots.create.mockRejectedValue(error);

      await expect(
        snapshotsTool.createSnapshot({
          subscriptionId: 'sub1',
          resourceGroupName: 'rg1',
          accountName: 'account1',
          poolName: 'pool1',
          volumeName: 'nonexistent',
          snapshotName: 'newsnap',
          location: 'eastus',
        })
      ).rejects.toThrow('Volume not found');
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete a snapshot', async () => {
      mockClient.snapshots.delete.mockResolvedValue(undefined);

      const result = await snapshotsTool.deleteSnapshot({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
        snapshotName: 'snap1',
      });

      expect(result.message).toContain('successfully deleted');
      expect(mockClient.snapshots.delete).toHaveBeenCalledWith('rg1', 'account1', 'pool1', 'vol1', 'snap1');
    });

    it('should handle deletion of non-existent snapshot', async () => {
      const error = new Error('Snapshot not found');
      error.name = 'ResourceNotFoundError';
      mockClient.snapshots.delete.mockRejectedValue(error);

      await expect(
        snapshotsTool.deleteSnapshot({
          subscriptionId: 'sub1',
          resourceGroupName: 'rg1',
          accountName: 'account1',
          poolName: 'pool1',
          volumeName: 'vol1',
          snapshotName: 'nonexistent',
        })
      ).rejects.toThrow('Snapshot not found');
    });
  });

  describe('updateSnapshot', () => {
    it('should update snapshot tags', async () => {
      const updatedTags = { updated: 'true', environment: 'staging' };
      const updatedSnapshot = {
        id: 'snapshot-id',
        name: 'snap1',
        tags: updatedTags,
      };

      mockClient.snapshots.update.mockResolvedValue(updatedSnapshot);

      const result = await snapshotsTool.updateSnapshot({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
        snapshotName: 'snap1',
        tags: updatedTags,
      });

      expect(result.snapshot).toEqual(updatedSnapshot);
      expect(mockClient.snapshots.update).toHaveBeenCalledWith(
        'rg1',
        'account1',
        'pool1',
        'vol1',
        'snap1',
        expect.objectContaining({
          tags: updatedTags,
        })
      );
    });
  });

  describe('restoreFiles', () => {
    it('should restore files from snapshot', async () => {
      mockClient.snapshots.restoreFiles.mockResolvedValue(undefined);

      const filePaths = ['/path/to/file1.txt', '/path/to/file2.txt'];
      const destinationPath = '/restore/destination';

      const result = await snapshotsTool.restoreFiles({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
        snapshotName: 'snap1',
        filePaths,
        destinationPath,
      });

      expect(result.message).toContain('File restore initiated');
      expect(mockClient.snapshots.restoreFiles).toHaveBeenCalledWith(
        'rg1',
        'account1',
        'pool1',
        'vol1',
        'snap1',
        expect.objectContaining({
          filePaths,
          destinationPath,
        })
      );
    });

    it('should handle file restore failures', async () => {
      const error = new Error('Invalid file path');
      mockClient.snapshots.restoreFiles.mockRejectedValue(error);

      await expect(
        snapshotsTool.restoreFiles({
          subscriptionId: 'sub1',
          resourceGroupName: 'rg1',
          accountName: 'account1',
          poolName: 'pool1',
          volumeName: 'vol1',
          snapshotName: 'snap1',
          filePaths: ['/invalid/path'],
          destinationPath: '/restore',
        })
      ).rejects.toThrow('Invalid file path');
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts', async () => {
      const error = new Error('Request timeout');
      error.name = 'TimeoutError';
      mockClient.snapshots.list.mockRejectedValue(error);

      await expect(
        snapshotsTool.listSnapshots({
          subscriptionId: 'sub1',
          resourceGroupName: 'rg1',
          accountName: 'account1',
          poolName: 'pool1',
          volumeName: 'vol1',
        })
      ).rejects.toThrow('Request timeout');
    });

    it('should handle authentication errors', async () => {
      const error = new Error('Authentication failed');
      error.name = 'AuthenticationError';
      mockClient.snapshots.get.mockRejectedValue(error);

      await expect(
        snapshotsTool.getSnapshot({
          subscriptionId: 'sub1',
          resourceGroupName: 'rg1',
          accountName: 'account1',
          poolName: 'pool1',
          volumeName: 'vol1',
          snapshotName: 'snap1',
        })
      ).rejects.toThrow('Authentication failed');
    });
  });
});