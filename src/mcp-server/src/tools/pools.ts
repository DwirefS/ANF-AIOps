import { z } from 'zod';
import { Tool } from '../types/tool.js';
import { logger } from '../utils/logger.js';
import { NetAppManagementClient } from '@azure/arm-netapp';
import { CapacityPool } from '@azure/arm-netapp';

// Pool creation schema
const createPoolSchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  location: z.string().min(1),
  serviceLevel: z.enum(['Standard', 'Premium', 'Ultra']),
  size: z.number().min(4398046511104), // 4TB minimum in bytes
  coolAccess: z.boolean().optional().default(false),
  qosType: z.enum(['Auto', 'Manual']).optional().default('Auto'),
  tags: z.record(z.string()).optional(),
});

// Pool list schema
const listPoolsSchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
});

// Pool get schema
const getPoolSchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
  poolName: z.string().min(1),
});

// Pool update schema
const updatePoolSchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  size: z.number().min(4398046511104).optional(),
  qosType: z.enum(['Auto', 'Manual']).optional(),
  coolAccess: z.boolean().optional(),
  tags: z.record(z.string()).optional(),
});

// Pool delete schema
const deletePoolSchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  forceDelete: z.boolean().optional().default(false),
});

export const poolTools: Tool[] = [
  {
    name: 'anf_create_pool',
    description: 'Create a new Azure NetApp Files capacity pool',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        location: { type: 'string', description: 'Azure region' },
        serviceLevel: { type: 'string', enum: ['Standard', 'Premium', 'Ultra'] },
        size: { type: 'number', description: 'Pool size in bytes (min 4TB)' },
        coolAccess: { type: 'boolean', description: 'Enable cool access' },
        qosType: { type: 'string', enum: ['Auto', 'Manual'], description: 'QoS type' },
        tags: { type: 'object', description: 'Resource tags' },
      },
      required: ['resourceGroup', 'accountName', 'poolName', 'location', 'serviceLevel', 'size'],
    },
    validate: (args: unknown) => {
      try {
        createPoolSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = createPoolSchema.parse(args);
      logger.info('Creating ANF capacity pool', { params });

      try {
        const poolBody: CapacityPool = {
          location: params.location,
          serviceLevel: params.serviceLevel,
          size: params.size,
          coolAccess: params.coolAccess,
          qosType: params.qosType,
          tags: params.tags,
        };

        const operation = await netAppClient.pools.beginCreateOrUpdate(
          params.resourceGroup,
          params.accountName,
          params.poolName,
          poolBody
        );

        const result = await operation.pollUntilDone();
        
        logger.info('Capacity pool created successfully', { poolId: result.id });
        return {
          success: true,
          poolId: result.id,
          poolName: result.name,
          serviceLevel: result.serviceLevel,
          size: result.size,
          sizeInTB: ((result.size || 0) / 1099511627776).toFixed(2),
          provisioningState: result.provisioningState,
        };
      } catch (error) {
        logger.error('Failed to create capacity pool', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_list_pools',
    description: 'List all capacity pools in a NetApp account',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
      },
      required: ['resourceGroup', 'accountName'],
    },
    validate: (args: unknown) => {
      try {
        listPoolsSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = listPoolsSchema.parse(args);
      logger.info('Listing ANF capacity pools', { params });

      try {
        const pools = [];
        for await (const pool of netAppClient.pools.list(
          params.resourceGroup,
          params.accountName
        )) {
          const utilizedSize = pool.utilizedSize || 0;
          const totalSize = pool.size || 0;
          const utilizationPercent = totalSize > 0 ? (utilizedSize / totalSize) * 100 : 0;

          pools.push({
            id: pool.id,
            name: pool.name,
            provisioningState: pool.provisioningState,
            serviceLevel: pool.serviceLevel,
            size: pool.size,
            sizeInTB: (totalSize / 1099511627776).toFixed(2),
            utilizedSize: utilizedSize,
            utilizedSizeInGB: (utilizedSize / 1073741824).toFixed(2),
            utilizationPercent: utilizationPercent.toFixed(2),
            qosType: pool.qosType,
            coolAccess: pool.coolAccess,
            tags: pool.tags,
          });
        }

        logger.info('Capacity pools listed successfully', { count: pools.length });
        return {
          success: true,
          pools,
          count: pools.length,
        };
      } catch (error) {
        logger.error('Failed to list capacity pools', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_get_pool',
    description: 'Get details of a specific capacity pool',
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
        getPoolSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = getPoolSchema.parse(args);
      logger.info('Getting ANF capacity pool details', { params });

      try {
        const pool = await netAppClient.pools.get(
          params.resourceGroup,
          params.accountName,
          params.poolName
        );

        const utilizedSize = pool.utilizedSize || 0;
        const totalSize = pool.size || 0;
        const utilizationPercent = totalSize > 0 ? (utilizedSize / totalSize) * 100 : 0;

        // Get volumes in this pool
        const volumes = [];
        try {
          for await (const volume of netAppClient.volumes.list(
            params.resourceGroup,
            params.accountName,
            params.poolName
          )) {
            volumes.push({
              name: volume.name,
              size: volume.usageThreshold,
              sizeInGB: ((volume.usageThreshold || 0) / 1073741824).toFixed(2),
              usedBytes: volume.usedBytes,
              usedGB: ((volume.usedBytes || 0) / 1073741824).toFixed(2),
            });
          }
        } catch (volumeError) {
          logger.warn('Failed to list volumes in pool', { error: volumeError });
        }

        logger.info('Pool details retrieved', { poolId: pool.id });
        return {
          success: true,
          pool: {
            id: pool.id,
            name: pool.name,
            location: pool.location,
            provisioningState: pool.provisioningState,
            serviceLevel: pool.serviceLevel,
            size: pool.size,
            sizeInTB: (totalSize / 1099511627776).toFixed(2),
            utilizedSize: utilizedSize,
            utilizedSizeInGB: (utilizedSize / 1073741824).toFixed(2),
            utilizationPercent: utilizationPercent.toFixed(2),
            qosType: pool.qosType,
            coolAccess: pool.coolAccess,
            encryptionType: pool.encryptionType,
            tags: pool.tags,
            volumeCount: volumes.length,
            volumes: volumes,
          },
        };
      } catch (error) {
        logger.error('Failed to get pool details', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_update_pool',
    description: 'Update an existing capacity pool',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        size: { type: 'number', description: 'New pool size in bytes' },
        qosType: { type: 'string', enum: ['Auto', 'Manual'], description: 'QoS type' },
        coolAccess: { type: 'boolean', description: 'Enable cool access' },
        tags: { type: 'object', description: 'Resource tags' },
      },
      required: ['resourceGroup', 'accountName', 'poolName'],
    },
    validate: (args: unknown) => {
      try {
        updatePoolSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = updatePoolSchema.parse(args);
      logger.info('Updating ANF capacity pool', { params });

      try {
        // Get existing pool first
        const existingPool = await netAppClient.pools.get(
          params.resourceGroup,
          params.accountName,
          params.poolName
        );

        // Check if new size is valid
        if (params.size && existingPool.utilizedSize && params.size < existingPool.utilizedSize) {
          return {
            success: false,
            error: 'Cannot shrink pool below utilized capacity',
            currentUtilizedSize: existingPool.utilizedSize,
            requestedSize: params.size,
          };
        }

        // Prepare update body
        const poolBody: CapacityPool = {
          location: existingPool.location,
          serviceLevel: existingPool.serviceLevel,
          size: params.size || existingPool.size,
          qosType: params.qosType || existingPool.qosType,
          coolAccess: params.coolAccess !== undefined ? params.coolAccess : existingPool.coolAccess,
          tags: params.tags || existingPool.tags,
        };

        const operation = await netAppClient.pools.beginCreateOrUpdate(
          params.resourceGroup,
          params.accountName,
          params.poolName,
          poolBody
        );

        const result = await operation.pollUntilDone();
        
        logger.info('Pool updated successfully', { poolId: result.id });
        return {
          success: true,
          poolId: result.id,
          poolName: result.name,
          provisioningState: result.provisioningState,
          changes: {
            size: params.size ? 'updated' : 'unchanged',
            qosType: params.qosType ? 'updated' : 'unchanged',
            coolAccess: params.coolAccess !== undefined ? 'updated' : 'unchanged',
            tags: params.tags ? 'updated' : 'unchanged',
          },
        };
      } catch (error) {
        logger.error('Failed to update pool', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_delete_pool',
    description: 'Delete a capacity pool',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        forceDelete: { type: 'boolean', description: 'Force delete without confirmation' },
      },
      required: ['resourceGroup', 'accountName', 'poolName'],
    },
    validate: (args: unknown) => {
      try {
        deletePoolSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = deletePoolSchema.parse(args);
      logger.info('Deleting ANF capacity pool', { params });

      try {
        // Check if pool exists and has volumes
        const pool = await netAppClient.pools.get(
          params.resourceGroup,
          params.accountName,
          params.poolName
        );

        // Check for volumes
        let volumeCount = 0;
        try {
          for await (const volume of netAppClient.volumes.list(
            params.resourceGroup,
            params.accountName,
            params.poolName
          )) {
            volumeCount++;
          }
        } catch (volumeError) {
          logger.warn('Failed to check volumes in pool', { error: volumeError });
        }

        if (volumeCount > 0 && !params.forceDelete) {
          return {
            success: false,
            requiresConfirmation: true,
            message: `Pool ${pool.name} contains ${volumeCount} volume(s). All volumes must be deleted first or use forceDelete=true.`,
            poolDetails: {
              name: pool.name,
              volumeCount,
              utilizedSize: pool.utilizedSize,
            },
          };
        }

        const operation = await netAppClient.pools.beginDelete(
          params.resourceGroup,
          params.accountName,
          params.poolName
        );

        await operation.pollUntilDone();
        
        logger.info('Pool deleted successfully', { poolName: params.poolName });
        return {
          success: true,
          message: `Capacity pool ${params.poolName} has been deleted successfully`,
        };
      } catch (error) {
        logger.error('Failed to delete pool', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_pool_performance',
    description: 'Get performance metrics for a capacity pool',
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
        getPoolSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = getPoolSchema.parse(args);
      logger.info('Getting ANF pool performance metrics', { params });

      try {
        const pool = await netAppClient.pools.get(
          params.resourceGroup,
          params.accountName,
          params.poolName
        );

        // Calculate theoretical performance based on service level and size
        const sizeInTB = (pool.size || 0) / 1099511627776;
        let maxThroughputMBps = 0;
        let maxIOPS = 0;

        switch (pool.serviceLevel) {
          case 'Ultra':
            maxThroughputMBps = sizeInTB * 128; // 128 MB/s per TB
            maxIOPS = sizeInTB * 12800; // 12,800 IOPS per TB
            break;
          case 'Premium':
            maxThroughputMBps = sizeInTB * 64; // 64 MB/s per TB
            maxIOPS = sizeInTB * 6400; // 6,400 IOPS per TB
            break;
          case 'Standard':
            maxThroughputMBps = sizeInTB * 16; // 16 MB/s per TB
            maxIOPS = sizeInTB * 1600; // 1,600 IOPS per TB
            break;
        }

        logger.info('Pool performance metrics calculated', { poolId: pool.id });
        return {
          success: true,
          performance: {
            poolName: pool.name,
            serviceLevel: pool.serviceLevel,
            sizeInTB: sizeInTB.toFixed(2),
            maxThroughputMBps: Math.round(maxThroughputMBps),
            maxIOPS: Math.round(maxIOPS),
            qosType: pool.qosType,
            utilizationPercent: ((pool.utilizedSize || 0) / (pool.size || 1) * 100).toFixed(2),
          },
        };
      } catch (error) {
        logger.error('Failed to get pool performance metrics', { error });
        throw error;
      }
    },
  },
];