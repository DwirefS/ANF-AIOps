/**
 * Backups Under Volume Operations Tools
 * 
 * Dedicated implementation for Backups Under Volume operation group
 * Manages all backup operations at the volume level
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * API Version: 2025-03-01
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Common schemas for Backups Under Volume operations
const BackupsUnderVolumeCommonSchemas = {
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
  resourceGroupName: z.string().min(1).max(90).regex(/^[-\w\._\(\)]+$/, 'Invalid resource group name'),
  accountName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid account name'),
  poolName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid pool name'),
  volumeName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid volume name'),
  backupName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid backup name'),
};

// =============================================================================
// BACKUPS UNDER VOLUME OPERATION GROUP
// =============================================================================

/**
 * List all backups for a specific volume
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/backups
 */
const BackupsUnderVolumeListSchema = z.object({
  subscriptionId: BackupsUnderVolumeCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderVolumeCommonSchemas.resourceGroupName,
  accountName: BackupsUnderVolumeCommonSchemas.accountName,
  poolName: BackupsUnderVolumeCommonSchemas.poolName,
  volumeName: BackupsUnderVolumeCommonSchemas.volumeName,
  filter: z.string().optional(), // OData filter
  orderBy: z.string().optional(), // OData orderBy
  top: z.number().int().min(1).max(1000).optional(),
  skip: z.number().int().min(0).optional(),
  includeOnlyLatest: z.boolean().optional()
});

/**
 * Get specific backup for a volume
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/backups/{backupName}
 */
const BackupsUnderVolumeGetSchema = z.object({
  subscriptionId: BackupsUnderVolumeCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderVolumeCommonSchemas.resourceGroupName,
  accountName: BackupsUnderVolumeCommonSchemas.accountName,
  poolName: BackupsUnderVolumeCommonSchemas.poolName,
  volumeName: BackupsUnderVolumeCommonSchemas.volumeName,
  backupName: BackupsUnderVolumeCommonSchemas.backupName
});

/**
 * Create a backup for a volume
 * PUT /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/backups/{backupName}
 */
const BackupsUnderVolumeCreateSchema = z.object({
  subscriptionId: BackupsUnderVolumeCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderVolumeCommonSchemas.resourceGroupName,
  accountName: BackupsUnderVolumeCommonSchemas.accountName,
  poolName: BackupsUnderVolumeCommonSchemas.poolName,
  volumeName: BackupsUnderVolumeCommonSchemas.volumeName,
  backupName: BackupsUnderVolumeCommonSchemas.backupName,
  body: z.object({
    location: z.string().min(1),
    properties: z.object({
      label: z.string().max(1024).optional(),
      backupVaultId: z.string().min(1),
      useExistingSnapshot: z.boolean().optional(),
      snapshotName: z.string().optional()
    })
  })
});

/**
 * Delete a backup for a volume
 * DELETE /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/backups/{backupName}
 */
const BackupsUnderVolumeDeleteSchema = z.object({
  subscriptionId: BackupsUnderVolumeCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderVolumeCommonSchemas.resourceGroupName,
  accountName: BackupsUnderVolumeCommonSchemas.accountName,
  poolName: BackupsUnderVolumeCommonSchemas.poolName,
  volumeName: BackupsUnderVolumeCommonSchemas.volumeName,
  backupName: BackupsUnderVolumeCommonSchemas.backupName
});

/**
 * Update backup properties for a volume
 * PATCH /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/backups/{backupName}
 */
const BackupsUnderVolumeUpdateSchema = z.object({
  subscriptionId: BackupsUnderVolumeCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderVolumeCommonSchemas.resourceGroupName,
  accountName: BackupsUnderVolumeCommonSchemas.accountName,
  poolName: BackupsUnderVolumeCommonSchemas.poolName,
  volumeName: BackupsUnderVolumeCommonSchemas.volumeName,
  backupName: BackupsUnderVolumeCommonSchemas.backupName,
  body: z.object({
    properties: z.object({
      label: z.string().max(1024).optional()
    }),
    tags: z.record(z.string()).optional()
  })
});

/**
 * Get latest backup status for a volume
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/latestBackupStatus
 */
const BackupsUnderVolumeGetLatestStatusSchema = z.object({
  subscriptionId: BackupsUnderVolumeCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderVolumeCommonSchemas.resourceGroupName,
  accountName: BackupsUnderVolumeCommonSchemas.accountName,
  poolName: BackupsUnderVolumeCommonSchemas.poolName,
  volumeName: BackupsUnderVolumeCommonSchemas.volumeName
});

/**
 * Get volume backup configuration
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/backupConfiguration
 */
const BackupsUnderVolumeGetConfigurationSchema = z.object({
  subscriptionId: BackupsUnderVolumeCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderVolumeCommonSchemas.resourceGroupName,
  accountName: BackupsUnderVolumeCommonSchemas.accountName,
  poolName: BackupsUnderVolumeCommonSchemas.poolName,
  volumeName: BackupsUnderVolumeCommonSchemas.volumeName
});

/**
 * Enable or update backup configuration for a volume
 * PUT /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/backupConfiguration
 */
const BackupsUnderVolumeSetConfigurationSchema = z.object({
  subscriptionId: BackupsUnderVolumeCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderVolumeCommonSchemas.resourceGroupName,
  accountName: BackupsUnderVolumeCommonSchemas.accountName,
  poolName: BackupsUnderVolumeCommonSchemas.poolName,
  volumeName: BackupsUnderVolumeCommonSchemas.volumeName,
  body: z.object({
    properties: z.object({
      backupEnabled: z.boolean(),
      backupVaultId: z.string().min(1),
      backupPolicyId: z.string().optional(),
      dailyBackupsToKeep: z.number().int().min(0).max(100).optional(),
      weeklyBackupsToKeep: z.number().int().min(0).max(52).optional(),
      monthlyBackupsToKeep: z.number().int().min(0).max(120).optional(),
      yearlyBackupsToKeep: z.number().int().min(0).max(10).optional()
    })
  })
});

/**
 * Disable backup for a volume
 * DELETE /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/backupConfiguration
 */
const BackupsUnderVolumeDisableBackupSchema = z.object({
  subscriptionId: BackupsUnderVolumeCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderVolumeCommonSchemas.resourceGroupName,
  accountName: BackupsUnderVolumeCommonSchemas.accountName,
  poolName: BackupsUnderVolumeCommonSchemas.poolName,
  volumeName: BackupsUnderVolumeCommonSchemas.volumeName,
  deleteExistingBackups: z.boolean().optional()
});

/**
 * Get backup history and metrics for a volume
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/backupHistory
 */
const BackupsUnderVolumeGetHistorySchema = z.object({
  subscriptionId: BackupsUnderVolumeCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderVolumeCommonSchemas.resourceGroupName,
  accountName: BackupsUnderVolumeCommonSchemas.accountName,
  poolName: BackupsUnderVolumeCommonSchemas.poolName,
  volumeName: BackupsUnderVolumeCommonSchemas.volumeName,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeMetrics: z.boolean().optional()
});

// =============================================================================
// MCP TOOLS EXPORT
// =============================================================================

export const backupsUnderVolumeTools: Tool[] = [
  {
    name: 'anf_backups_under_volume_list',
    description: 'List all backups for a specific volume with filtering and pagination',
    inputSchema: BackupsUnderVolumeListSchema
  },
  {
    name: 'anf_backups_under_volume_get',
    description: 'Get detailed information about a specific backup for a volume',
    inputSchema: BackupsUnderVolumeGetSchema
  },
  {
    name: 'anf_backups_under_volume_create',
    description: 'Create a new backup for a volume with optional snapshot',
    inputSchema: BackupsUnderVolumeCreateSchema
  },
  {
    name: 'anf_backups_under_volume_delete',
    description: 'Delete a specific backup for a volume',
    inputSchema: BackupsUnderVolumeDeleteSchema
  },
  {
    name: 'anf_backups_under_volume_update',
    description: 'Update backup metadata and properties for a volume backup',
    inputSchema: BackupsUnderVolumeUpdateSchema
  },
  {
    name: 'anf_backups_under_volume_get_latest_status',
    description: 'Get the latest backup status and information for a volume',
    inputSchema: BackupsUnderVolumeGetLatestStatusSchema
  },
  {
    name: 'anf_backups_under_volume_get_configuration',
    description: 'Get current backup configuration for a volume',
    inputSchema: BackupsUnderVolumeGetConfigurationSchema
  },
  {
    name: 'anf_backups_under_volume_set_configuration',
    description: 'Enable or update backup configuration for a volume',
    inputSchema: BackupsUnderVolumeSetConfigurationSchema
  },
  {
    name: 'anf_backups_under_volume_disable_backup',
    description: 'Disable backup for a volume with option to delete existing backups',
    inputSchema: BackupsUnderVolumeDisableBackupSchema
  },
  {
    name: 'anf_backups_under_volume_get_history',
    description: 'Get backup history and metrics for a volume over time',
    inputSchema: BackupsUnderVolumeGetHistorySchema
  }
];

// =============================================================================
// API CLIENT EXTENSION FOR BACKUPS UNDER VOLUME
// =============================================================================

export interface BackupsUnderVolumeApiMethods {
  // List backups for volume
  listBackupsForVolume(params: z.infer<typeof BackupsUnderVolumeListSchema>): Promise<{
    value: Array<{
      id: string;
      name: string;
      type: string;
      properties: {
        backupId: string;
        creationDate: string;
        size: number;
        backupType: 'Manual' | 'Scheduled';
        provisioningState: string;
        failureReason?: string;
        label?: string;
        backupVaultId: string;
        snapshotName?: string;
      };
    }>;
    nextLink?: string;
  }>;

  // Get backup for volume
  getBackupForVolume(params: z.infer<typeof BackupsUnderVolumeGetSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    properties: {
      backupId: string;
      creationDate: string;
      size: number;
      backupType: string;
      provisioningState: string;
      backupVaultId: string;
      retentionDays: number;
      compressionEnabled: boolean;
      deduplicationEnabled: boolean;
    };
  }>;

  // Create backup for volume
  createBackupForVolume(params: z.infer<typeof BackupsUnderVolumeCreateSchema>): Promise<{
    id: string;
    name: string;
    properties: {
      provisioningState: 'Creating';
      operationId: string;
    };
  }>;

  // Delete backup for volume
  deleteBackupForVolume(params: z.infer<typeof BackupsUnderVolumeDeleteSchema>): Promise<void>;

  // Update backup for volume
  updateBackupForVolume(params: z.infer<typeof BackupsUnderVolumeUpdateSchema>): Promise<{
    id: string;
    name: string;
    properties: {
      label?: string;
      lastModified: string;
    };
  }>;

  // Get latest backup status
  getLatestBackupStatusForVolume(params: z.infer<typeof BackupsUnderVolumeGetLatestStatusSchema>): Promise<{
    volumeName: string;
    latestBackup?: {
      backupId: string;
      backupName: string;
      creationDate: string;
      size: number;
      status: string;
    };
    backupEnabled: boolean;
    lastBackupTime?: string;
    nextScheduledBackup?: string;
    totalBackupCount: number;
    totalBackupSize: number;
  }>;

  // Get backup configuration
  getBackupConfigurationForVolume(params: z.infer<typeof BackupsUnderVolumeGetConfigurationSchema>): Promise<{
    backupEnabled: boolean;
    backupVaultId?: string;
    backupPolicyId?: string;
    retentionPolicy?: {
      dailyBackupsToKeep: number;
      weeklyBackupsToKeep: number;
      monthlyBackupsToKeep: number;
      yearlyBackupsToKeep: number;
    };
    lastModified: string;
  }>;

  // Set backup configuration
  setBackupConfigurationForVolume(params: z.infer<typeof BackupsUnderVolumeSetConfigurationSchema>): Promise<{
    backupEnabled: boolean;
    backupVaultId: string;
    backupPolicyId?: string;
    configurationId: string;
    operationId: string;
  }>;

  // Disable backup
  disableBackupForVolume(params: z.infer<typeof BackupsUnderVolumeDisableBackupSchema>): Promise<{
    operationId: string;
    status: 'Accepted' | 'InProgress';
    backupsDeleted: boolean;
  }>;

  // Get backup history
  getBackupHistoryForVolume(params: z.infer<typeof BackupsUnderVolumeGetHistorySchema>): Promise<{
    volumeName: string;
    timeRange: {
      start: string;
      end: string;
    };
    history: Array<{
      date: string;
      backupName: string;
      type: 'Manual' | 'Scheduled';
      size: number;
      status: 'Success' | 'Failed';
      duration: number;
      error?: string;
    }>;
    metrics?: {
      successRate: number;
      averageSize: number;
      averageDuration: number;
      totalBackups: number;
      failedBackups: number;
      totalStorageUsed: number;
    };
  }>;
}

// =============================================================================
// BACKUP UNDER VOLUME CONSTANTS
// =============================================================================

export const BackupUnderVolumeTypes = {
  MANUAL: 'Manual',
  SCHEDULED: 'Scheduled',
  POLICY_TRIGGERED: 'PolicyTriggered'
} as const;

export const BackupUnderVolumeStates = {
  CREATING: 'Creating',
  AVAILABLE: 'Available',
  DELETING: 'Deleting',
  FAILED: 'Failed',
  UPDATING: 'Updating'
} as const;

export const BackupUnderVolumeRetentionTypes = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly'
} as const;