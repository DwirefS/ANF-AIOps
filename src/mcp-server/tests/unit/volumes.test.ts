/**
 * Unit tests for Azure NetApp Files Volumes operations
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import { VolumesTool } from '../../src/tools/volumes';
import { NetAppManagementClient } from '@azure/arm-netapp';
import { DefaultAzureCredential } from '@azure/identity';

// Mock Azure SDK
jest.mock('@azure/arm-netapp');
jest.mock('@azure/identity');

describe('VolumesTool', () => {
  let volumesTool: VolumesTool;
  let mockClient: jest.Mocked<NetAppManagementClient>;
  let mockCredential: jest.Mocked<DefaultAzureCredential>;

  beforeEach(() => {
    // Setup mocks
    mockCredential = new DefaultAzureCredential() as jest.Mocked<DefaultAzureCredential>;
    mockClient = {
      volumes: {
        list: jest.fn(),
        get: jest.fn(),
        createOrUpdate: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        revert: jest.fn(),
        resync: jest.fn(),
        authorizeReplication: jest.fn(),
        breakReplication: jest.fn(),
      },
    } as any;

    (NetAppManagementClient as jest.MockedClass<typeof NetAppManagementClient>).mockImplementation(() => mockClient);

    // Initialize tool
    volumesTool = new VolumesTool();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listVolumes', () => {
    it('should list all volumes in a capacity pool', async () => {
      const mockVolumes = [
        {
          id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.NetApp/netAppAccounts/account1/capacityPools/pool1/volumes/vol1',
          name: 'vol1',
          location: 'eastus',
          properties: {
            fileSystemId: 'fs-123',
            usageThreshold: 107374182400, // 100 GiB
            serviceLevel: 'Premium',
            creationToken: 'vol1',
            subnetId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/subnet1',
          },
        },
        {
          id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.NetApp/netAppAccounts/account1/capacityPools/pool1/volumes/vol2',
          name: 'vol2',
          location: 'eastus',
          properties: {
            fileSystemId: 'fs-456',
            usageThreshold: 214748364800, // 200 GiB
            serviceLevel: 'Standard',
            creationToken: 'vol2',
            subnetId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/subnet1',
          },
        },
      ];

      mockClient.volumes.list.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield* mockVolumes;
        },
      } as any);

      const result = await volumesTool.listVolumes({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
      });

      expect(result).toHaveProperty('volumes');
      expect(result.volumes).toHaveLength(2);
      expect(result.volumes[0].name).toBe('vol1');
      expect(result.volumes[0].properties.serviceLevel).toBe('Premium');
      expect(mockClient.volumes.list).toHaveBeenCalledWith('rg1', 'account1', 'pool1');
    });

    it('should handle empty volume list', async () => {
      mockClient.volumes.list.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          // Empty iterator
        },
      } as any);

      const result = await volumesTool.listVolumes({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
      });

      expect(result.volumes).toHaveLength(0);
      expect(result.message).toContain('No volumes found');
    });
  });

  describe('getVolume', () => {
    it('should retrieve a specific volume with details', async () => {
      const mockVolume = {
        id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.NetApp/netAppAccounts/account1/capacityPools/pool1/volumes/vol1',
        name: 'vol1',
        location: 'eastus',
        properties: {
          fileSystemId: 'fs-123',
          usageThreshold: 107374182400,
          serviceLevel: 'Premium',
          creationToken: 'vol1',
          provisioningState: 'Succeeded',
          mountTargets: [
            {
              mountTargetId: 'mt-123',
              fileSystemId: 'fs-123',
              ipAddress: '10.0.0.4',
            },
          ],
          throughputMibps: 16,
          exportPolicy: {
            rules: [
              {
                ruleIndex: 1,
                unixReadOnly: false,
                unixReadWrite: true,
                cifs: false,
                nfsv3: true,
                nfsv41: false,
                allowedClients: '0.0.0.0/0',
              },
            ],
          },
        },
      };

      mockClient.volumes.get.mockResolvedValue(mockVolume);

      const result = await volumesTool.getVolume({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
      });

      expect(result.volume).toEqual(mockVolume);
      expect(result.volume.properties.mountTargets).toHaveLength(1);
      expect(mockClient.volumes.get).toHaveBeenCalledWith('rg1', 'account1', 'pool1', 'vol1');
    });
  });

  describe('createVolume', () => {
    it('should create a new volume with required parameters', async () => {
      const newVolume = {
        location: 'eastus',
        properties: {
          serviceLevel: 'Premium',
          creationToken: 'newvol',
          usageThreshold: 107374182400,
          subnetId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/subnet1',
          exportPolicy: {
            rules: [
              {
                ruleIndex: 1,
                unixReadOnly: false,
                unixReadWrite: true,
                cifs: false,
                nfsv3: true,
                nfsv41: false,
                allowedClients: '10.0.0.0/24',
              },
            ],
          },
        },
      };

      const createdVolume = {
        ...newVolume,
        id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.NetApp/netAppAccounts/account1/capacityPools/pool1/volumes/newvol',
        name: 'newvol',
        properties: {
          ...newVolume.properties,
          provisioningState: 'Succeeded',
          fileSystemId: 'fs-789',
        },
      };

      mockClient.volumes.createOrUpdate.mockResolvedValue(createdVolume);

      const result = await volumesTool.createVolume({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'newvol',
        location: 'eastus',
        serviceLevel: 'Premium',
        creationToken: 'newvol',
        usageThreshold: 107374182400,
        subnetId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/subnet1',
        allowedClients: '10.0.0.0/24',
      });

      expect(result.volume).toEqual(createdVolume);
      expect(result.message).toContain('successfully created');
      expect(mockClient.volumes.createOrUpdate).toHaveBeenCalledWith(
        'rg1',
        'account1',
        'pool1',
        'newvol',
        expect.objectContaining(newVolume)
      );
    });

    it('should create volume with snapshot policy', async () => {
      const volumeWithPolicy = {
        location: 'eastus',
        properties: {
          serviceLevel: 'Standard',
          creationToken: 'volwithpolicy',
          usageThreshold: 107374182400,
          subnetId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/subnet1',
          dataProtection: {
            snapshot: {
              snapshotPolicyId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.NetApp/netAppAccounts/account1/snapshotPolicies/policy1',
            },
          },
        },
      };

      mockClient.volumes.createOrUpdate.mockResolvedValue({
        ...volumeWithPolicy,
        id: 'volume-id',
        name: 'volwithpolicy',
      } as any);

      const result = await volumesTool.createVolume({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'volwithpolicy',
        location: 'eastus',
        serviceLevel: 'Standard',
        creationToken: 'volwithpolicy',
        usageThreshold: 107374182400,
        subnetId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/subnet1',
        snapshotPolicyId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.NetApp/netAppAccounts/account1/snapshotPolicies/policy1',
      });

      expect(mockClient.volumes.createOrUpdate).toHaveBeenCalledWith(
        'rg1',
        'account1',
        'pool1',
        'volwithpolicy',
        expect.objectContaining({
          properties: expect.objectContaining({
            dataProtection: {
              snapshot: {
                snapshotPolicyId: expect.stringContaining('snapshotPolicies/policy1'),
              },
            },
          }),
        })
      );
    });
  });

  describe('deleteVolume', () => {
    it('should delete a volume', async () => {
      mockClient.volumes.delete.mockResolvedValue(undefined);

      const result = await volumesTool.deleteVolume({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
      });

      expect(result.message).toContain('successfully deleted');
      expect(mockClient.volumes.delete).toHaveBeenCalledWith('rg1', 'account1', 'pool1', 'vol1');
    });

    it('should force delete when specified', async () => {
      mockClient.volumes.delete.mockResolvedValue(undefined);

      const result = await volumesTool.deleteVolume({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
        forceDelete: true,
      });

      expect(result.message).toContain('force deleted');
      expect(mockClient.volumes.delete).toHaveBeenCalledWith(
        'rg1',
        'account1',
        'pool1',
        'vol1',
        { forceDelete: true }
      );
    });
  });

  describe('updateVolume', () => {
    it('should update volume size', async () => {
      const updatedVolume = {
        id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.NetApp/netAppAccounts/account1/capacityPools/pool1/volumes/vol1',
        name: 'vol1',
        properties: {
          usageThreshold: 214748364800, // Updated to 200 GiB
        },
      };

      mockClient.volumes.update.mockResolvedValue(updatedVolume);

      const result = await volumesTool.updateVolume({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
        usageThreshold: 214748364800,
      });

      expect(result.volume).toEqual(updatedVolume);
      expect(mockClient.volumes.update).toHaveBeenCalledWith(
        'rg1',
        'account1',
        'pool1',
        'vol1',
        expect.objectContaining({
          properties: {
            usageThreshold: 214748364800,
          },
        })
      );
    });

    it('should update volume export policy', async () => {
      const newExportPolicy = {
        rules: [
          {
            ruleIndex: 1,
            unixReadOnly: false,
            unixReadWrite: true,
            cifs: false,
            nfsv3: true,
            nfsv41: true,
            allowedClients: '10.0.0.0/16',
          },
        ],
      };

      mockClient.volumes.update.mockResolvedValue({
        id: 'volume-id',
        name: 'vol1',
        properties: {
          exportPolicy: newExportPolicy,
        },
      } as any);

      const result = await volumesTool.updateVolume({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
        exportPolicy: newExportPolicy,
      });

      expect(mockClient.volumes.update).toHaveBeenCalledWith(
        'rg1',
        'account1',
        'pool1',
        'vol1',
        expect.objectContaining({
          properties: {
            exportPolicy: newExportPolicy,
          },
        })
      );
    });
  });

  describe('replication operations', () => {
    it('should authorize replication', async () => {
      mockClient.volumes.authorizeReplication.mockResolvedValue(undefined);

      const result = await volumesTool.authorizeReplication({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
        remoteVolumeResourceId: '/subscriptions/sub2/resourceGroups/rg2/providers/Microsoft.NetApp/netAppAccounts/account2/capacityPools/pool2/volumes/vol2',
      });

      expect(result.message).toContain('Replication authorized');
      expect(mockClient.volumes.authorizeReplication).toHaveBeenCalled();
    });

    it('should break replication', async () => {
      mockClient.volumes.breakReplication.mockResolvedValue(undefined);

      const result = await volumesTool.breakReplication({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
        forceBreak: true,
      });

      expect(result.message).toContain('Replication broken');
      expect(mockClient.volumes.breakReplication).toHaveBeenCalledWith(
        'rg1',
        'account1',
        'pool1',
        'vol1',
        { forceBreakReplication: true }
      );
    });

    it('should resync replication', async () => {
      mockClient.volumes.resync.mockResolvedValue(undefined);

      const result = await volumesTool.resyncReplication({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'vol1',
      });

      expect(result.message).toContain('Replication resync initiated');
      expect(mockClient.volumes.resync).toHaveBeenCalled();
    });
  });
});