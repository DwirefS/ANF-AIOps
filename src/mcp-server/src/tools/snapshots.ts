import { z } from 'zod';
import { Tool } from '../types/tool.js';
import { logger } from '../utils/logger.js';
import { NetAppManagementClient } from '@azure/arm-netapp';
import { Snapshot } from '@azure/arm-netapp';

// Snapshot creation schema
const createSnapshotSchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  volumeName: z.string().min(1),
  snapshotName: z.string().min(1),
  location: z.string().min(1),
});

// Snapshot list schema
const listSnapshotsSchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  volumeName: z.string().min(1),
});

// Snapshot get schema
const getSnapshotSchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  volumeName: z.string().min(1),
  snapshotName: z.string().min(1),
});

// Snapshot delete schema
const deleteSnapshotSchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  volumeName: z.string().min(1),
  snapshotName: z.string().min(1),
});

// Snapshot restore schema
const restoreSnapshotSchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
  poolName: z.string().min(1),
  volumeName: z.string().min(1),
  snapshotName: z.string().min(1),
  newVolumeName: z.string().min(1).optional(),
});

// Snapshot policy schema
const createSnapshotPolicySchema = z.object({
  resourceGroup: z.string().min(1),
  accountName: z.string().min(1),
  policyName: z.string().min(1),
  location: z.string().min(1),
  enabled: z.boolean().optional().default(true),
  hourlySchedule: z.object({
    snapshotsToKeep: z.number().min(0).max(255),
    minute: z.number().min(0).max(59),
  }).optional(),
  dailySchedule: z.object({
    snapshotsToKeep: z.number().min(0).max(255),
    hour: z.number().min(0).max(23),
    minute: z.number().min(0).max(59),
  }).optional(),
  weeklySchedule: z.object({
    snapshotsToKeep: z.number().min(0).max(255),
    day: z.string(),
    hour: z.number().min(0).max(23),
    minute: z.number().min(0).max(59),
  }).optional(),
  monthlySchedule: z.object({
    snapshotsToKeep: z.number().min(0).max(255),
    daysOfMonth: z.array(z.number().min(1).max(31)),
    hour: z.number().min(0).max(23),
    minute: z.number().min(0).max(59),
  }).optional(),
  tags: z.record(z.string()).optional(),
});

export const snapshotTools: Tool[] = [
  {
    name: 'anf_create_snapshot',
    description: 'Create a snapshot of an Azure NetApp Files volume',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
        snapshotName: { type: 'string', description: 'Snapshot name' },
        location: { type: 'string', description: 'Azure region' },
      },
      required: ['resourceGroup', 'accountName', 'poolName', 'volumeName', 'snapshotName', 'location'],
    },
    validate: (args: unknown) => {
      try {
        createSnapshotSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = createSnapshotSchema.parse(args);
      logger.info('Creating ANF snapshot', { params });

      try {
        const snapshotBody: Snapshot = {
          location: params.location,
        };

        const operation = await netAppClient.snapshots.beginCreate(
          params.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName,
          params.snapshotName,
          snapshotBody
        );

        const result = await operation.pollUntilDone();
        
        logger.info('Snapshot created successfully', { snapshotId: result.id });
        return {
          success: true,
          snapshotId: result.id,
          snapshotName: result.name,
          created: result.created,
          provisioningState: result.provisioningState,
        };
      } catch (error) {
        logger.error('Failed to create snapshot', { error });
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
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
      },
      required: ['resourceGroup', 'accountName', 'poolName', 'volumeName'],
    },
    validate: (args: unknown) => {
      try {
        listSnapshotsSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = listSnapshotsSchema.parse(args);
      logger.info('Listing ANF snapshots', { params });

      try {
        const snapshots = [];
        for await (const snapshot of netAppClient.snapshots.list(
          params.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName
        )) {
          snapshots.push({
            id: snapshot.id,
            name: snapshot.name,
            created: snapshot.created,
            provisioningState: snapshot.provisioningState,
            snapshotId: snapshot.snapshotId,
          });
        }

        // Sort snapshots by creation date (newest first)
        snapshots.sort((a, b) => {
          const dateA = new Date(a.created || 0).getTime();
          const dateB = new Date(b.created || 0).getTime();
          return dateB - dateA;
        });

        logger.info('Snapshots listed successfully', { count: snapshots.length });
        return {
          success: true,
          snapshots,
          count: snapshots.length,
        };
      } catch (error) {
        logger.error('Failed to list snapshots', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_get_snapshot',
    description: 'Get details of a specific snapshot',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
        snapshotName: { type: 'string', description: 'Snapshot name' },
      },
      required: ['resourceGroup', 'accountName', 'poolName', 'volumeName', 'snapshotName'],
    },
    validate: (args: unknown) => {
      try {
        getSnapshotSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = getSnapshotSchema.parse(args);
      logger.info('Getting ANF snapshot details', { params });

      try {
        const snapshot = await netAppClient.snapshots.get(
          params.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName,
          params.snapshotName
        );

        logger.info('Snapshot details retrieved', { snapshotId: snapshot.id });
        return {
          success: true,
          snapshot: {
            id: snapshot.id,
            name: snapshot.name,
            location: snapshot.location,
            created: snapshot.created,
            snapshotId: snapshot.snapshotId,
            provisioningState: snapshot.provisioningState,
          },
        };
      } catch (error) {
        logger.error('Failed to get snapshot details', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_delete_snapshot',
    description: 'Delete a snapshot',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
        snapshotName: { type: 'string', description: 'Snapshot name' },
      },
      required: ['resourceGroup', 'accountName', 'poolName', 'volumeName', 'snapshotName'],
    },
    validate: (args: unknown) => {
      try {
        deleteSnapshotSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = deleteSnapshotSchema.parse(args);
      logger.info('Deleting ANF snapshot', { params });

      try {
        const operation = await netAppClient.snapshots.beginDelete(
          params.resourceGroup,
          params.accountName,
          params.poolName,
          params.volumeName,
          params.snapshotName
        );

        await operation.pollUntilDone();
        
        logger.info('Snapshot deleted successfully', { snapshotName: params.snapshotName });
        return {
          success: true,
          message: `Snapshot ${params.snapshotName} has been deleted successfully`,
        };
      } catch (error) {
        logger.error('Failed to delete snapshot', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_restore_snapshot',
    description: 'Restore a volume from a snapshot',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
        snapshotName: { type: 'string', description: 'Snapshot name' },
        newVolumeName: { type: 'string', description: 'New volume name (optional, creates new volume)' },
      },
      required: ['resourceGroup', 'accountName', 'poolName', 'volumeName', 'snapshotName'],
    },
    validate: (args: unknown) => {
      try {
        restoreSnapshotSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = restoreSnapshotSchema.parse(args);
      logger.info('Restoring ANF snapshot', { params });

      try {
        if (params.newVolumeName) {
          // Create new volume from snapshot
          const sourceVolume = await netAppClient.volumes.get(
            params.resourceGroup,
            params.accountName,
            params.poolName,
            params.volumeName
          );

          const snapshot = await netAppClient.snapshots.get(
            params.resourceGroup,
            params.accountName,
            params.poolName,
            params.volumeName,
            params.snapshotName
          );

          const newVolumeBody = {
            location: sourceVolume.location,
            creationToken: `${sourceVolume.creationToken}-restored`,
            serviceLevel: sourceVolume.serviceLevel,
            usageThreshold: sourceVolume.usageThreshold,
            subnetId: sourceVolume.subnetId,
            protocolTypes: sourceVolume.protocolTypes,
            snapshotId: snapshot.snapshotId,
            exportPolicy: sourceVolume.exportPolicy,
          };

          const operation = await netAppClient.volumes.beginCreateOrUpdate(
            params.resourceGroup,
            params.accountName,
            params.poolName,
            params.newVolumeName,
            newVolumeBody
          );

          const result = await operation.pollUntilDone();
          
          logger.info('Volume created from snapshot', { volumeId: result.id });
          return {
            success: true,
            message: `New volume ${params.newVolumeName} created from snapshot ${params.snapshotName}`,
            volumeId: result.id,
            volumeName: result.name,
          };
        } else {
          // In-place restore (revert volume to snapshot)
          const operation = await netAppClient.volumes.beginRevert(
            params.resourceGroup,
            params.accountName,
            params.poolName,
            params.volumeName,
            { snapshotId: params.snapshotName }
          );

          await operation.pollUntilDone();
          
          logger.info('Volume reverted to snapshot', { volumeName: params.volumeName });
          return {
            success: true,
            message: `Volume ${params.volumeName} has been reverted to snapshot ${params.snapshotName}`,
          };
        }
      } catch (error) {
        logger.error('Failed to restore snapshot', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_create_snapshot_policy',
    description: 'Create a snapshot policy for automated snapshots',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
        policyName: { type: 'string', description: 'Snapshot policy name' },
        location: { type: 'string', description: 'Azure region' },
        enabled: { type: 'boolean', description: 'Enable policy' },
        hourlySchedule: { 
          type: 'object',
          properties: {
            snapshotsToKeep: { type: 'number' },
            minute: { type: 'number' },
          },
        },
        dailySchedule: { 
          type: 'object',
          properties: {
            snapshotsToKeep: { type: 'number' },
            hour: { type: 'number' },
            minute: { type: 'number' },
          },
        },
        weeklySchedule: { 
          type: 'object',
          properties: {
            snapshotsToKeep: { type: 'number' },
            day: { type: 'string' },
            hour: { type: 'number' },
            minute: { type: 'number' },
          },
        },
        monthlySchedule: { 
          type: 'object',
          properties: {
            snapshotsToKeep: { type: 'number' },
            daysOfMonth: { type: 'array', items: { type: 'number' } },
            hour: { type: 'number' },
            minute: { type: 'number' },
          },
        },
        tags: { type: 'object', description: 'Resource tags' },
      },
      required: ['resourceGroup', 'accountName', 'policyName', 'location'],
    },
    validate: (args: unknown) => {
      try {
        createSnapshotPolicySchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = createSnapshotPolicySchema.parse(args);
      logger.info('Creating ANF snapshot policy', { params });

      try {
        const policyBody = {
          location: params.location,
          enabled: params.enabled,
          hourlySchedule: params.hourlySchedule,
          dailySchedule: params.dailySchedule,
          weeklySchedule: params.weeklySchedule,
          monthlySchedule: params.monthlySchedule,
          tags: params.tags,
        };

        const result = await netAppClient.snapshotPolicies.create(
          params.resourceGroup,
          params.accountName,
          params.policyName,
          policyBody
        );
        
        logger.info('Snapshot policy created successfully', { policyId: result.id });
        return {
          success: true,
          policyId: result.id,
          policyName: result.name,
          enabled: result.enabled,
          schedules: {
            hourly: params.hourlySchedule ? 'configured' : 'not configured',
            daily: params.dailySchedule ? 'configured' : 'not configured',
            weekly: params.weeklySchedule ? 'configured' : 'not configured',
            monthly: params.monthlySchedule ? 'configured' : 'not configured',
          },
        };
      } catch (error) {
        logger.error('Failed to create snapshot policy', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_list_snapshot_policies',
    description: 'List all snapshot policies in an account',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        accountName: { type: 'string', description: 'NetApp account name' },
      },
      required: ['resourceGroup', 'accountName'],
    },
    handler: async ({ args, netAppClient, logger }) => {
      logger.info('Listing ANF snapshot policies', { args });

      try {
        const policies = [];
        for await (const policy of netAppClient.snapshotPolicies.list(
          args.resourceGroup,
          args.accountName
        )) {
          policies.push({
            id: policy.id,
            name: policy.name,
            location: policy.location,
            enabled: policy.enabled,
            provisioningState: policy.provisioningState,
            schedules: {
              hourly: policy.hourlySchedule ? 'configured' : 'not configured',
              daily: policy.dailySchedule ? 'configured' : 'not configured',
              weekly: policy.weeklySchedule ? 'configured' : 'not configured',
              monthly: policy.monthlySchedule ? 'configured' : 'not configured',
            },
          });
        }

        logger.info('Snapshot policies listed successfully', { count: policies.length });
        return {
          success: true,
          policies,
          count: policies.length,
        };
      } catch (error) {
        logger.error('Failed to list snapshot policies', { error });
        throw error;
      }
    },
  },
];