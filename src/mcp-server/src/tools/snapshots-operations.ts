/**
 * Snapshots Operations Tools
 * 
 * Dedicated implementation for Snapshots operation group
 * Manages all snapshot operations for Azure NetApp Files volumes
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * API Version: 2025-03-01
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Common schemas for Snapshots operations
const SnapshotsCommonSchemas = {
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
  resourceGroupName: z.string().min(1).max(90).regex(/^[-\w\._\(\)]+$/, 'Invalid resource group name'),
  accountName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid account name'),
  poolName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid pool name'),
  volumeName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid volume name'),
  snapshotName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid snapshot name'),
  location: z.string().min(1).max(50).regex(/^[a-zA-Z0-9\-]+$/, 'Invalid location format')
};

// =============================================================================
// SNAPSHOTS OPERATION GROUP - ALL INDIVIDUAL OPERATIONS
// =============================================================================

/**
 * Create snapshot
 * PUT /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/snapshots/{snapshotName}
 */
const SnapshotsCreateSchema = z.object({
  subscriptionId: SnapshotsCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotsCommonSchemas.resourceGroupName,
  accountName: SnapshotsCommonSchemas.accountName,
  poolName: SnapshotsCommonSchemas.poolName,
  volumeName: SnapshotsCommonSchemas.volumeName,
  snapshotName: SnapshotsCommonSchemas.snapshotName,
  body: z.object({
    location: SnapshotsCommonSchemas.location
  })
});

/**
 * Delete snapshot
 * DELETE /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/snapshots/{snapshotName}
 */
const SnapshotsDeleteSchema = z.object({
  subscriptionId: SnapshotsCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotsCommonSchemas.resourceGroupName,
  accountName: SnapshotsCommonSchemas.accountName,
  poolName: SnapshotsCommonSchemas.poolName,
  volumeName: SnapshotsCommonSchemas.volumeName,
  snapshotName: SnapshotsCommonSchemas.snapshotName
});

/**
 * Get snapshot details
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/snapshots/{snapshotName}
 */
const SnapshotsGetSchema = z.object({
  subscriptionId: SnapshotsCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotsCommonSchemas.resourceGroupName,
  accountName: SnapshotsCommonSchemas.accountName,
  poolName: SnapshotsCommonSchemas.poolName,
  volumeName: SnapshotsCommonSchemas.volumeName,
  snapshotName: SnapshotsCommonSchemas.snapshotName
});

/**
 * List snapshots
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/snapshots
 */
const SnapshotsListSchema = z.object({
  subscriptionId: SnapshotsCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotsCommonSchemas.resourceGroupName,
  accountName: SnapshotsCommonSchemas.accountName,
  poolName: SnapshotsCommonSchemas.poolName,
  volumeName: SnapshotsCommonSchemas.volumeName
});

/**
 * Update snapshot
 * PATCH /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/snapshots/{snapshotName}
 */
const SnapshotsUpdateSchema = z.object({
  subscriptionId: SnapshotsCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotsCommonSchemas.resourceGroupName,
  accountName: SnapshotsCommonSchemas.accountName,
  poolName: SnapshotsCommonSchemas.poolName,
  volumeName: SnapshotsCommonSchemas.volumeName,
  snapshotName: SnapshotsCommonSchemas.snapshotName,
  body: z.object({
    properties: z.object({
      description: z.string().optional()
    }).optional()
  })
});

/**
 * Restore files from snapshot
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/snapshots/{snapshotName}/restoreFiles
 */
const SnapshotsRestoreFilesSchema = z.object({
  subscriptionId: SnapshotsCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotsCommonSchemas.resourceGroupName,
  accountName: SnapshotsCommonSchemas.accountName,
  poolName: SnapshotsCommonSchemas.poolName,
  volumeName: SnapshotsCommonSchemas.volumeName,
  snapshotName: SnapshotsCommonSchemas.snapshotName,
  body: z.object({
    filePaths: z.array(z.string()).min(1),
    destinationPath: z.string().optional()
  })
});

/**
 * Get snapshot status
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/snapshots/{snapshotName}/status
 */
const SnapshotsGetStatusSchema = z.object({
  subscriptionId: SnapshotsCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotsCommonSchemas.resourceGroupName,
  accountName: SnapshotsCommonSchemas.accountName,
  poolName: SnapshotsCommonSchemas.poolName,
  volumeName: SnapshotsCommonSchemas.volumeName,
  snapshotName: SnapshotsCommonSchemas.snapshotName
});

/**
 * Revert volume to snapshot
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/revert
 */
const SnapshotsRevertVolumeSchema = z.object({
  subscriptionId: SnapshotsCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotsCommonSchemas.resourceGroupName,
  accountName: SnapshotsCommonSchemas.accountName,
  poolName: SnapshotsCommonSchemas.poolName,
  volumeName: SnapshotsCommonSchemas.volumeName,
  body: z.object({
    snapshotId: z.string()
  })
});

// =============================================================================
// MCP TOOLS EXPORT
// =============================================================================

export const snapshotsOperationsTools: Tool[] = [
  {
    name: 'anf_snapshots_create',
    description: 'Create a point-in-time snapshot of a volume',
    inputSchema: SnapshotsCreateSchema
  },
  {
    name: 'anf_snapshots_delete',
    description: 'Delete a snapshot from a volume',
    inputSchema: SnapshotsDeleteSchema
  },
  {
    name: 'anf_snapshots_get',
    description: 'Get detailed information about a specific snapshot',
    inputSchema: SnapshotsGetSchema
  },
  {
    name: 'anf_snapshots_list',
    description: 'List all snapshots for a volume',
    inputSchema: SnapshotsListSchema
  },
  {
    name: 'anf_snapshots_update',
    description: 'Update snapshot properties',
    inputSchema: SnapshotsUpdateSchema
  },
  {
    name: 'anf_snapshots_restore_files',
    description: 'Restore specific files from a snapshot',
    inputSchema: SnapshotsRestoreFilesSchema
  },
  {
    name: 'anf_snapshots_get_status',
    description: 'Get the current status of a snapshot',
    inputSchema: SnapshotsGetStatusSchema
  },
  {
    name: 'anf_snapshots_revert_volume',
    description: 'Revert entire volume to a snapshot state',
    inputSchema: SnapshotsRevertVolumeSchema
  }
];

// =============================================================================
// API CLIENT EXTENSION FOR SNAPSHOTS
// =============================================================================

export interface SnapshotsApiMethods {
  // Create snapshot
  createSnapshot(params: z.infer<typeof SnapshotsCreateSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    location: string;
    properties: {
      snapshotId: string;
      created: string;
      provisioningState: string;
    };
  }>;

  // Delete snapshot
  deleteSnapshot(params: z.infer<typeof SnapshotsDeleteSchema>): Promise<void>;

  // Get snapshot
  getSnapshot(params: z.infer<typeof SnapshotsGetSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    location: string;
    properties: {
      snapshotId: string;
      created: string;
      provisioningState: string;
      description?: string;
    };
  }>;

  // List snapshots
  listSnapshots(params: z.infer<typeof SnapshotsListSchema>): Promise<{
    value: Array<{
      id: string;
      name: string;
      type: string;
      location: string;
      properties: any;
    }>;
  }>;

  // Update snapshot
  updateSnapshot(params: z.infer<typeof SnapshotsUpdateSchema>): Promise<{
    id: string;
    name: string;
    properties: {
      provisioningState: string;
    };
  }>;

  // Restore files
  restoreFiles(params: z.infer<typeof SnapshotsRestoreFilesSchema>): Promise<{
    message: string;
    operationId: string;
  }>;

  // Get status
  getSnapshotStatus(params: z.infer<typeof SnapshotsGetStatusSchema>): Promise<{
    healthy: boolean;
    relationshipStatus: string;
    mirrorState: string;
    unhealthyReason?: string;
    errorMessage?: string;
  }>;

  // Revert volume
  revertVolume(params: z.infer<typeof SnapshotsRevertVolumeSchema>): Promise<{
    message: string;
    operationId: string;
  }>;
}

// =============================================================================
// SNAPSHOT CONSTANTS
// =============================================================================

export const SnapshotProvisioningStates = {
  CREATING: 'Creating',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  DELETING: 'Deleting'
} as const;

export const SnapshotHealthStates = {
  HEALTHY: 'Healthy',
  UNHEALTHY: 'Unhealthy',
  UNKNOWN: 'Unknown'
} as const;