import { z } from 'zod';
import { Tool } from '../types/tool.js';
import { loggers } from '../utils/logger.js';

// Volume creation schema
const createVolumeSchema = z.object({
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  volumeName: z.string().min(1),
  location: z.string().optional(),
  serviceLevel: z.enum(['Standard', 'Premium', 'Ultra']),
  creationToken: z.string().min(1),
  usageThreshold: z.number().min(100).max(102400), // GB
  subnetId: z.string().min(1),
  protocolTypes: z.array(z.enum(['NFSv3', 'NFSv4.1', 'CIFS'])).optional(),
  snapshotDirectoryVisible: z.boolean().optional(),
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
  accountName: z.string().min(1),
  poolName: z.string().min(1),
});

// Volume get schema
const getVolumeSchema = z.object({
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  volumeName: z.string().min(1),
});

// Volume update schema
const updateVolumeSchema = z.object({
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  volumeName: z.string().min(1),
  usageThreshold: z.number().min(100).max(102400).optional(),
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
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  volumeName: z.string().min(1),
  forceDelete: z.boolean().optional(),
});

export const volumeTools: Tool[] = [
  {
    name: 'anf_create_volume',
    description: 'Create a new Azure NetApp Files volume',
    inputSchema: {
      type: 'object',
      properties: {
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
        serviceLevel: { 
          type: 'string', 
          enum: ['Standard', 'Premium', 'Ultra'],
          description: 'Service level for performance'
        },
        creationToken: { type: 'string', description: 'Unique file path for mounting' },
        usageThreshold: { type: 'number', description: 'Volume size in GB' },
        subnetId: { type: 'string', description: 'Subnet resource ID' },
        protocolTypes: {
          type: 'array',
          items: { type: 'string', enum: ['NFSv3', 'NFSv4.1', 'CIFS'] },
          description: 'Supported protocols'
        },
        tags: { type: 'object', description: 'Resource tags' },
      },
      required: ['accountName', 'poolName', 'volumeName', 'serviceLevel', 'creationToken', 'usageThreshold', 'subnetId'],
    },
    validate: (args) => {
      const result = createVolumeSchema.safeParse(args);
      return {
        valid: result.success,
        error: result.error?.message,
      };
    },
    handler: async ({ args, netAppClient, config, logger }) => {
      const startTime = Date.now();
      const params = createVolumeSchema.parse(args);
      
      try {
        loggers.audit('create_volume', 'system', params.volumeName, { params });
        
        const volume = {
          location: params.location || config.azure.location,
          serviceLevel: params.serviceLevel,
          creationToken: params.creationToken,
          usageThreshold: params.usageThreshold * 1073741824, // Convert GB to bytes
          subnetId: params.subnetId,
          protocolTypes: params.protocolTypes || ['NFSv3'],
          snapshotDirectoryVisible: params.snapshotDirectoryVisible ?? true,
          exportPolicy: params.exportPolicy || {
            rules: [{
              ruleIndex: 1,
              unixReadOnly: false,
              unixReadWrite: true,
              cifs: false,
              nfsv3: true,
              nfsv41: false,
              allowedClients: '0.0.0.0/0',
            }],
          },
          tags: params.tags,
        };
        
        const result = await netAppClient.volumes.beginCreateOrUpdate(
          config.azure.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName,
          volume
        );
        
        const createdVolume = await result.pollUntilDone();
        
        loggers.performance('create_volume', Date.now() - startTime, {
          volumeName: params.volumeName,
          size: params.usageThreshold,
        });
        
        return {
          success: true,
          volume: {
            id: createdVolume.id,
            name: createdVolume.name,
            type: createdVolume.type,
            location: createdVolume.location,
            properties: {
              fileSystemId: createdVolume.fileSystemId,
              creationToken: createdVolume.creationToken,
              serviceLevel: createdVolume.serviceLevel,
              usageThreshold: createdVolume.usageThreshold,
              provisioningState: createdVolume.provisioningState,
              mountTargets: createdVolume.mountTargetProperties,
            },
          },
        };
      } catch (error) {
        logger.error('Failed to create volume', { error, params });
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
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
      },
      required: ['accountName', 'poolName'],
    },
    validate: (args) => {
      const result = listVolumesSchema.safeParse(args);
      return {
        valid: result.success,
        error: result.error?.message,
      };
    },
    handler: async ({ args, netAppClient, config }) => {
      const params = listVolumesSchema.parse(args);
      
      const volumes = [];
      const iterator = netAppClient.volumes.list(
        config.azure.resourceGroup,
        params.accountName,
        params.poolName
      );
      
      for await (const volume of iterator) {
        volumes.push({
          id: volume.id,
          name: volume.name,
          type: volume.type,
          location: volume.location,
          properties: {
            fileSystemId: volume.fileSystemId,
            creationToken: volume.creationToken,
            serviceLevel: volume.serviceLevel,
            usageThreshold: volume.usageThreshold,
            provisioningState: volume.provisioningState,
            mountTargets: volume.mountTargetProperties,
          },
          tags: volume.tags,
        });
      }
      
      return {
        success: true,
        count: volumes.length,
        volumes,
      };
    },
  },
  
  {
    name: 'anf_get_volume',
    description: 'Get details of a specific volume',
    inputSchema: {
      type: 'object',
      properties: {
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
      },
      required: ['accountName', 'poolName', 'volumeName'],
    },
    validate: (args) => {
      const result = getVolumeSchema.safeParse(args);
      return {
        valid: result.success,
        error: result.error?.message,
      };
    },
    handler: async ({ args, netAppClient, config }) => {
      const params = getVolumeSchema.parse(args);
      
      const volume = await netAppClient.volumes.get(
        config.azure.resourceGroup,
        params.accountName,
        params.poolName,
        params.volumeName
      );
      
      return {
        success: true,
        volume: {
          id: volume.id,
          name: volume.name,
          type: volume.type,
          location: volume.location,
          properties: {
            fileSystemId: volume.fileSystemId,
            creationToken: volume.creationToken,
            serviceLevel: volume.serviceLevel,
            usageThreshold: volume.usageThreshold,
            provisioningState: volume.provisioningState,
            mountTargets: volume.mountTargetProperties,
            consumedSize: volume.consumedSize,
            snapshotDirectoryVisible: volume.snapshotDirectoryVisible,
            kerberosEnabled: volume.kerberosEnabled,
            securityStyle: volume.securityStyle,
            smbEncryption: volume.smbEncryption,
            throughputMibps: volume.throughputMibps,
          },
          tags: volume.tags,
        },
      };
    },
  },
  
  {
    name: 'anf_update_volume',
    description: 'Update an existing volume',
    inputSchema: {
      type: 'object',
      properties: {
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
        usageThreshold: { type: 'number', description: 'New volume size in GB' },
        exportPolicy: { type: 'object', description: 'Export policy rules' },
        tags: { type: 'object', description: 'Resource tags' },
      },
      required: ['accountName', 'poolName', 'volumeName'],
    },
    validate: (args) => {
      const result = updateVolumeSchema.safeParse(args);
      return {
        valid: result.success,
        error: result.error?.message,
      };
    },
    handler: async ({ args, netAppClient, config, logger }) => {
      const startTime = Date.now();
      const params = updateVolumeSchema.parse(args);
      
      try {
        loggers.audit('update_volume', 'system', params.volumeName, { params });
        
        // Get existing volume
        const existingVolume = await netAppClient.volumes.get(
          config.azure.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName
        );
        
        // Prepare update payload
        const volumePatch: any = {
          location: existingVolume.location,
          tags: params.tags || existingVolume.tags,
        };
        
        if (params.usageThreshold) {
          volumePatch.usageThreshold = params.usageThreshold * 1073741824; // Convert GB to bytes
        }
        
        if (params.exportPolicy) {
          volumePatch.exportPolicy = params.exportPolicy;
        }
        
        const result = await netAppClient.volumes.beginUpdate(
          config.azure.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName,
          volumePatch
        );
        
        const updatedVolume = await result.pollUntilDone();
        
        loggers.performance('update_volume', Date.now() - startTime, {
          volumeName: params.volumeName,
        });
        
        return {
          success: true,
          volume: {
            id: updatedVolume.id,
            name: updatedVolume.name,
            properties: {
              usageThreshold: updatedVolume.usageThreshold,
              provisioningState: updatedVolume.provisioningState,
            },
          },
        };
      } catch (error) {
        logger.error('Failed to update volume', { error, params });
        throw error;
      }
    },
  },
  
  {
    name: 'anf_delete_volume',
    description: 'Delete a volume',
    inputSchema: {
      type: 'object',
      properties: {
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
        forceDelete: { type: 'boolean', description: 'Force delete even with snapshots' },
      },
      required: ['accountName', 'poolName', 'volumeName'],
    },
    validate: (args) => {
      const result = deleteVolumeSchema.safeParse(args);
      return {
        valid: result.success,
        error: result.error?.message,
      };
    },
    handler: async ({ args, netAppClient, config, logger }) => {
      const params = deleteVolumeSchema.parse(args);
      
      try {
        loggers.audit('delete_volume', 'system', params.volumeName, { params });
        
        const result = await netAppClient.volumes.beginDelete(
          config.azure.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName,
          {
            forceDelete: params.forceDelete,
          }
        );
        
        await result.pollUntilDone();
        
        return {
          success: true,
          message: `Volume ${params.volumeName} deleted successfully`,
        };
      } catch (error) {
        logger.error('Failed to delete volume', { error, params });
        throw error;
      }
    },
  },
];