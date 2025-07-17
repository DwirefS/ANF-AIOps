import { z } from 'zod';
import { Tool } from '../types/tool.js';
import { loggers } from '../utils/logger.js';

// Pool creation schema
const createPoolSchema = z.object({
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  location: z.string().optional(),
  serviceLevel: z.enum(['Standard', 'Premium', 'Ultra']),
  size: z.number().min(4).max(500), // Size in TiB
  qosType: z.enum(['Auto', 'Manual']).optional(),
  coolAccess: z.boolean().optional(),
  tags: z.record(z.string()).optional(),
});

export const poolTools: Tool[] = [
  {
    name: 'anf_create_pool',
    description: 'Create a new capacity pool',
    inputSchema: {
      type: 'object',
      properties: {
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Pool name' },
        serviceLevel: { 
          type: 'string', 
          enum: ['Standard', 'Premium', 'Ultra'],
          description: 'Service level'
        },
        size: { type: 'number', description: 'Pool size in TiB (4-500)' },
        qosType: { type: 'string', enum: ['Auto', 'Manual'], description: 'QoS type' },
        coolAccess: { type: 'boolean', description: 'Enable cool access' },
        tags: { type: 'object', description: 'Resource tags' },
      },
      required: ['accountName', 'poolName', 'serviceLevel', 'size'],
    },
    validate: (args) => {
      const result = createPoolSchema.safeParse(args);
      return {
        valid: result.success,
        error: result.error?.message,
      };
    },
    handler: async ({ args, netAppClient, config, logger }) => {
      const params = createPoolSchema.parse(args);
      
      try {
        loggers.audit('create_pool', 'system', params.poolName, { params });
        
        const pool = {
          location: params.location || config.azure.location,
          serviceLevel: params.serviceLevel,
          size: params.size * 1099511627776, // Convert TiB to bytes
          qosType: params.qosType || 'Auto',
          coolAccess: params.coolAccess || false,
          tags: params.tags,
        };
        
        const result = await netAppClient.pools.beginCreateOrUpdate(
          config.azure.resourceGroup,
          params.accountName,
          params.poolName,
          pool
        );
        
        const createdPool = await result.pollUntilDone();
        
        return {
          success: true,
          pool: {
            id: createdPool.id,
            name: createdPool.name,
            type: createdPool.type,
            location: createdPool.location,
            properties: {
              poolId: createdPool.poolId,
              serviceLevel: createdPool.serviceLevel,
              size: createdPool.size,
              qosType: createdPool.qosType,
              provisioningState: createdPool.provisioningState,
              totalThroughputMibps: createdPool.totalThroughputMibps,
              utilizedThroughputMibps: createdPool.utilizedThroughputMibps,
            },
          },
        };
      } catch (error) {
        logger.error('Failed to create pool', { error, params });
        throw error;
      }
    },
  },
  
  {
    name: 'anf_list_pools',
    description: 'List all capacity pools in an account',
    inputSchema: {
      type: 'object',
      properties: {
        accountName: { type: 'string', description: 'NetApp account name' },
      },
      required: ['accountName'],
    },
    handler: async ({ args, netAppClient, config }) => {
      const pools = [];
      const iterator = netAppClient.pools.list(
        config.azure.resourceGroup,
        args.accountName
      );
      
      for await (const pool of iterator) {
        pools.push({
          id: pool.id,
          name: pool.name,
          location: pool.location,
          properties: {
            serviceLevel: pool.serviceLevel,
            size: pool.size,
            qosType: pool.qosType,
            provisioningState: pool.provisioningState,
          },
        });
      }
      
      return {
        success: true,
        count: pools.length,
        pools,
      };
    },
  },
];