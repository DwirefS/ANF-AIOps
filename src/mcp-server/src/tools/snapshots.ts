import { z } from 'zod';
import { Tool } from '../types/tool.js';
import { loggers } from '../utils/logger.js';

const createSnapshotSchema = z.object({
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  volumeName: z.string().min(1),
  snapshotName: z.string().min(1),
  location: z.string().optional(),
});

export const snapshotTools: Tool[] = [
  {
    name: 'anf_create_snapshot',
    description: 'Create a snapshot of a volume',
    inputSchema: {
      type: 'object',
      properties: {
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
        snapshotName: { type: 'string', description: 'Snapshot name' },
      },
      required: ['accountName', 'poolName', 'volumeName', 'snapshotName'],
    },
    validate: (args) => {
      const result = createSnapshotSchema.safeParse(args);
      return {
        valid: result.success,
        error: result.error?.message,
      };
    },
    handler: async ({ args, netAppClient, config, logger }) => {
      const params = createSnapshotSchema.parse(args);
      
      try {
        loggers.audit('create_snapshot', 'system', params.snapshotName, { params });
        
        const snapshot = {
          location: params.location || config.azure.location,
        };
        
        const result = await netAppClient.snapshots.beginCreate(
          config.azure.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName,
          params.snapshotName,
          snapshot
        );
        
        const createdSnapshot = await result.pollUntilDone();
        
        return {
          success: true,
          snapshot: {
            id: createdSnapshot.id,
            name: createdSnapshot.name,
            type: createdSnapshot.type,
            location: createdSnapshot.location,
            properties: {
              snapshotId: createdSnapshot.snapshotId,
              created: createdSnapshot.created,
              provisioningState: createdSnapshot.provisioningState,
            },
          },
        };
      } catch (error) {
        logger.error('Failed to create snapshot', { error, params });
        throw error;
      }
    },
  },
  
  {
    name: 'anf_list_snapshots',
    description: 'List all snapshots of a volume',
    inputSchema: {
      type: 'object',
      properties: {
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
      },
      required: ['accountName', 'poolName', 'volumeName'],
    },
    handler: async ({ args, netAppClient, config }) => {
      const snapshots = [];
      const iterator = netAppClient.snapshots.list(
        config.azure.resourceGroup,
        args.accountName,
        args.poolName,
        args.volumeName
      );
      
      for await (const snapshot of iterator) {
        snapshots.push({
          id: snapshot.id,
          name: snapshot.name,
          properties: {
            created: snapshot.created,
            provisioningState: snapshot.provisioningState,
          },
        });
      }
      
      return {
        success: true,
        count: snapshots.length,
        snapshots,
      };
    },
  },
];