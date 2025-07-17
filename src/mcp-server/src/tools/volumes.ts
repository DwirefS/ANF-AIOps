import { z } from 'zod';
import { Tool } from '../types/tool.js';
import { logger } from '../utils/logger.js';
import { NetAppManagementClient } from '@azure/arm-netapp';
import { Volume } from '@azure/arm-netapp';

// Volume creation schema
const createVolumeSchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  volumeName: z.string().min(1),
  location: z.string().min(1),
  serviceLevel: z.enum(['Standard', 'Premium', 'Ultra']),
  creationToken: z.string().min(1),
  usageThreshold: z.number().min(107374182400), // 100GB minimum in bytes
  subnetId: z.string().min(1),
  protocolTypes: z.array(z.enum(['NFSv3', 'NFSv4.1', 'CIFS'])).optional(),
  snapshotDirectoryVisible: z.boolean().optional().default(true),
  exportPolicy: z.object({
    rules: z.array(z.object({
      ruleIndex: z.number(),
      unixReadOnly: z.boolean(),
      unixReadWrite: z.boolean(),
      cifs: z.boolean(),
      nfsv3: z.boolean(),
      nfsv41: z.boolean(),
      allowedClients: z.string(),
    })),
  }).optional(),
  tags: z.record(z.string()).optional(),
});

// Volume list schema
const listVolumesSchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
  poolName: z.string().min(1),
});

// Volume get schema
const getVolumeSchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  volumeName: z.string().min(1),
});

// Volume update schema
const updateVolumeSchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  volumeName: z.string().min(1),
  usageThreshold: z.number().min(107374182400).optional(),
  exportPolicy: z.object({
    rules: z.array(z.object({
      ruleIndex: z.number(),
      unixReadOnly: z.boolean(),
      unixReadWrite: z.boolean(),
      cifs: z.boolean(),
      nfsv3: z.boolean(),
      nfsv41: z.boolean(),
      allowedClients: z.string(),
    })),
  }).optional(),
  tags: z.record(z.string()).optional(),
});

// Volume delete schema
const deleteVolumeSchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  volumeName: z.string().min(1),
  forceDelete: z.boolean().optional().default(false),
});

// Volume resize schema
const resizeVolumeSchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  volumeName: z.string().min(1),
  newSizeInBytes: z.number().min(107374182400),
});

export const volumeTools: Tool[] = [
  {
    name: 'anf_create_volume',
    description: 'Create a new Azure NetApp Files volume with specified configuration',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
        location: { type: 'string', description: 'Azure region' },
        serviceLevel: { type: 'string', enum: ['Standard', 'Premium', 'Ultra'] },
        creationToken: { type: 'string', description: 'Unique file path for the volume' },
        usageThreshold: { type: 'number', description: 'Volume size in bytes (min 100GB)' },
        subnetId: { type: 'string', description: 'Subnet resource ID' },
        protocolTypes: { type: 'array', items: { type: 'string' }, description: 'Protocol types' },
        tags: { type: 'object', description: 'Resource tags' },
      },
      required: ['resourceGroup', 'accountName', 'poolName', 'volumeName', 'location', 
                 'serviceLevel', 'creationToken', 'usageThreshold', 'subnetId'],
    },
    validate: (args: unknown) => {
      try {
        createVolumeSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = createVolumeSchema.parse(args);
      logger.info('Creating ANF volume', { params });

      try {
        const volumeBody: Volume = {
          location: params.location,
          creationToken: params.creationToken,
          serviceLevel: params.serviceLevel,
          usageThreshold: params.usageThreshold,
          subnetId: params.subnetId,
          protocolTypes: params.protocolTypes || ['NFSv3'],
          snapshotDirectoryVisible: params.snapshotDirectoryVisible,
          exportPolicy: params.exportPolicy,
          tags: params.tags,
        };

        const operation = await netAppClient.volumes.beginCreateOrUpdate(
          params.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName,
          volumeBody
        );

        const result = await operation.pollUntilDone();
        
        logger.info('Volume created successfully', { volumeId: result.id });
        return {
          success: true,
          volumeId: result.id,
          volumeName: result.name,
          provisioningState: result.provisioningState,
          mountTargets: result.mountTargets,
        };
      } catch (error) {
        logger.error('Failed to create volume', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_list_volumes',
    description: 'List all volumes in a capacity pool',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
      },
      required: ['resourceGroup', 'accountName', 'poolName'],
    },
    validate: (args: unknown) => {
      try {
        listVolumesSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = listVolumesSchema.parse(args);
      logger.info('Listing ANF volumes', { params });

      try {
        const volumes = [];
        for await (const volume of netAppClient.volumes.list(
          params.resourceGroup,
          params.accountName,
          params.poolName
        )) {
          volumes.push({
            id: volume.id,
            name: volume.name,
            provisioningState: volume.provisioningState,
            creationToken: volume.creationToken,
            serviceLevel: volume.serviceLevel,
            usageThreshold: volume.usageThreshold,
            usedBytes: volume.usedBytes,
            mountTargets: volume.mountTargets,
            tags: volume.tags,
          });
        }

        logger.info('Volumes listed successfully', { count: volumes.length });
        return {
          success: true,
          volumes,
          count: volumes.length,
        };
      } catch (error) {
        logger.error('Failed to list volumes', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_get_volume',
    description: 'Get details of a specific volume',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
      },
      required: ['resourceGroup', 'accountName', 'poolName', 'volumeName'],
    },
    validate: (args: unknown) => {
      try {
        getVolumeSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = getVolumeSchema.parse(args);
      logger.info('Getting ANF volume details', { params });

      try {
        const volume = await netAppClient.volumes.get(
          params.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName
        );

        const capacityUtilization = volume.usedBytes && volume.usageThreshold
          ? (volume.usedBytes / volume.usageThreshold) * 100
          : 0;

        logger.info('Volume details retrieved', { volumeId: volume.id });
        return {
          success: true,
          volume: {
            id: volume.id,
            name: volume.name,
            location: volume.location,
            provisioningState: volume.provisioningState,
            creationToken: volume.creationToken,
            serviceLevel: volume.serviceLevel,
            usageThreshold: volume.usageThreshold,
            usedBytes: volume.usedBytes,
            capacityUtilization: `${capacityUtilization.toFixed(2)}%`,
            protocolTypes: volume.protocolTypes,
            mountTargets: volume.mountTargets,
            subnetId: volume.subnetId,
            snapshotDirectoryVisible: volume.snapshotDirectoryVisible,
            tags: volume.tags,
          },
        };
      } catch (error) {
        logger.error('Failed to get volume details', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_update_volume',
    description: 'Update an existing volume configuration',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
        usageThreshold: { type: 'number', description: 'New volume size in bytes' },
        exportPolicy: { type: 'object', description: 'Export policy rules' },
        tags: { type: 'object', description: 'Resource tags' },
      },
      required: ['resourceGroup', 'accountName', 'poolName', 'volumeName'],
    },
    validate: (args: unknown) => {
      try {
        updateVolumeSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = updateVolumeSchema.parse(args);
      logger.info('Updating ANF volume', { params });

      try {
        // Get existing volume first
        const existingVolume = await netAppClient.volumes.get(
          params.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName
        );

        // Prepare update body
        const volumeBody: Volume = {
          ...existingVolume,
          usageThreshold: params.usageThreshold || existingVolume.usageThreshold,
          exportPolicy: params.exportPolicy || existingVolume.exportPolicy,
          tags: params.tags || existingVolume.tags,
        };

        const operation = await netAppClient.volumes.beginCreateOrUpdate(
          params.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName,
          volumeBody
        );

        const result = await operation.pollUntilDone();
        
        logger.info('Volume updated successfully', { volumeId: result.id });
        return {
          success: true,
          volumeId: result.id,
          volumeName: result.name,
          provisioningState: result.provisioningState,
          changes: {
            usageThreshold: params.usageThreshold ? 'updated' : 'unchanged',
            exportPolicy: params.exportPolicy ? 'updated' : 'unchanged',
            tags: params.tags ? 'updated' : 'unchanged',
          },
        };
      } catch (error) {
        logger.error('Failed to update volume', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_delete_volume',
    description: 'Delete an Azure NetApp Files volume',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
        forceDelete: { type: 'boolean', description: 'Force delete without confirmation' },
      },
      required: ['resourceGroup', 'accountName', 'poolName', 'volumeName'],
    },
    validate: (args: unknown) => {
      try {
        deleteVolumeSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = deleteVolumeSchema.parse(args);
      logger.info('Deleting ANF volume', { params });

      try {
        // Check if volume exists and get details for confirmation
        const volume = await netAppClient.volumes.get(
          params.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName
        );

        if (!params.forceDelete && volume.usedBytes && volume.usedBytes > 0) {
          return {
            success: false,
            requiresConfirmation: true,
            message: `Volume ${volume.name} contains ${(volume.usedBytes / 1073741824).toFixed(2)} GB of data. Use forceDelete=true to confirm deletion.`,
            volumeDetails: {
              name: volume.name,
              usedBytes: volume.usedBytes,
              creationToken: volume.creationToken,
            },
          };
        }

        const operation = await netAppClient.volumes.beginDelete(
          params.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName
        );

        await operation.pollUntilDone();
        
        logger.info('Volume deleted successfully', { volumeName: params.volumeName });
        return {
          success: true,
          message: `Volume ${params.volumeName} has been deleted successfully`,
        };
      } catch (error) {
        logger.error('Failed to delete volume', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_resize_volume',
    description: 'Resize an Azure NetApp Files volume',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
        newSizeInBytes: { type: 'number', description: 'New size in bytes (min 100GB)' },
      },
      required: ['resourceGroup', 'accountName', 'poolName', 'volumeName', 'newSizeInBytes'],
    },
    validate: (args: unknown) => {
      try {
        resizeVolumeSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = resizeVolumeSchema.parse(args);
      logger.info('Resizing ANF volume', { params });

      try {
        // Get existing volume
        const existingVolume = await netAppClient.volumes.get(
          params.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName
        );

        const oldSizeGB = (existingVolume.usageThreshold || 0) / 1073741824;
        const newSizeGB = params.newSizeInBytes / 1073741824;

        // Check if shrinking below used capacity
        if (existingVolume.usedBytes && params.newSizeInBytes < existingVolume.usedBytes) {
          return {
            success: false,
            error: 'Cannot shrink volume below used capacity',
            currentUsedBytes: existingVolume.usedBytes,
            requestedSizeBytes: params.newSizeInBytes,
          };
        }

        // Update volume with new size
        const volumeBody: Volume = {
          ...existingVolume,
          usageThreshold: params.newSizeInBytes,
        };

        const operation = await netAppClient.volumes.beginCreateOrUpdate(
          params.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName,
          volumeBody
        );

        const result = await operation.pollUntilDone();
        
        logger.info('Volume resized successfully', { 
          volumeId: result.id,
          oldSizeGB,
          newSizeGB,
        });

        return {
          success: true,
          volumeId: result.id,
          volumeName: result.name,
          oldSizeGB: oldSizeGB.toFixed(2),
          newSizeGB: newSizeGB.toFixed(2),
          provisioningState: result.provisioningState,
        };
      } catch (error) {
        logger.error('Failed to resize volume', { error });
        throw error;
      }
    },
  },
];