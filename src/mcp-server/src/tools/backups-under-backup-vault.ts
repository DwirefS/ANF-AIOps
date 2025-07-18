/**
 * Backups Under Backup Vault Operations Tools
 * 
 * Dedicated implementation for Backups Under Backup Vault operation group
 * Manages all backup operations within specific backup vaults
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * API Version: 2025-03-01
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Common schemas for Backups Under Backup Vault operations
const BackupsUnderBackupVaultCommonSchemas = {
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
  resourceGroupName: z.string().min(1).max(90).regex(/^[-\w\._\(\)]+$/, 'Invalid resource group name'),
  accountName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid account name'),
  backupVaultName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid backup vault name'),
  backupName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid backup name'),
};

// =============================================================================
// BACKUPS UNDER BACKUP VAULT OPERATION GROUP
// =============================================================================

/**
 * List all backups in a backup vault
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults/{backupVaultName}/backups
 */
const BackupsUnderBackupVaultListSchema = z.object({
  subscriptionId: BackupsUnderBackupVaultCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderBackupVaultCommonSchemas.resourceGroupName,
  accountName: BackupsUnderBackupVaultCommonSchemas.accountName,
  backupVaultName: BackupsUnderBackupVaultCommonSchemas.backupVaultName,
  filter: z.string().optional(), // OData filter
  orderBy: z.string().optional(), // OData orderBy
  top: z.number().int().min(1).max(1000).optional(),
  skip: z.number().int().min(0).optional(),
  volumeResourceId: z.string().optional() // Filter by source volume
});

/**
 * Get specific backup from backup vault
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults/{backupVaultName}/backups/{backupName}
 */
const BackupsUnderBackupVaultGetSchema = z.object({
  subscriptionId: BackupsUnderBackupVaultCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderBackupVaultCommonSchemas.resourceGroupName,
  accountName: BackupsUnderBackupVaultCommonSchemas.accountName,
  backupVaultName: BackupsUnderBackupVaultCommonSchemas.backupVaultName,
  backupName: BackupsUnderBackupVaultCommonSchemas.backupName
});

/**
 * Create a manual backup in backup vault
 * PUT /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults/{backupVaultName}/backups/{backupName}
 */
const BackupsUnderBackupVaultCreateSchema = z.object({
  subscriptionId: BackupsUnderBackupVaultCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderBackupVaultCommonSchemas.resourceGroupName,
  accountName: BackupsUnderBackupVaultCommonSchemas.accountName,
  backupVaultName: BackupsUnderBackupVaultCommonSchemas.backupVaultName,
  backupName: BackupsUnderBackupVaultCommonSchemas.backupName,
  body: z.object({
    properties: z.object({
      volumeResourceId: z.string().min(1),
      label: z.string().max(1024).optional(),
      useExistingSnapshot: z.boolean().optional(),
      snapshotName: z.string().optional()
    })
  })
});

/**
 * Delete backup from backup vault
 * DELETE /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults/{backupVaultName}/backups/{backupName}
 */
const BackupsUnderBackupVaultDeleteSchema = z.object({
  subscriptionId: BackupsUnderBackupVaultCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderBackupVaultCommonSchemas.resourceGroupName,
  accountName: BackupsUnderBackupVaultCommonSchemas.accountName,
  backupVaultName: BackupsUnderBackupVaultCommonSchemas.backupVaultName,
  backupName: BackupsUnderBackupVaultCommonSchemas.backupName
});

/**
 * Update backup properties in backup vault
 * PATCH /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults/{backupVaultName}/backups/{backupName}
 */
const BackupsUnderBackupVaultUpdateSchema = z.object({
  subscriptionId: BackupsUnderBackupVaultCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderBackupVaultCommonSchemas.resourceGroupName,
  accountName: BackupsUnderBackupVaultCommonSchemas.accountName,
  backupVaultName: BackupsUnderBackupVaultCommonSchemas.backupVaultName,
  backupName: BackupsUnderBackupVaultCommonSchemas.backupName,
  body: z.object({
    properties: z.object({
      label: z.string().max(1024).optional(),
      tags: z.record(z.string()).optional()
    })
  })
});

/**
 * Restore backup from backup vault
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults/{backupVaultName}/backups/{backupName}/restore
 */
const BackupsUnderBackupVaultRestoreSchema = z.object({
  subscriptionId: BackupsUnderBackupVaultCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderBackupVaultCommonSchemas.resourceGroupName,
  accountName: BackupsUnderBackupVaultCommonSchemas.accountName,
  backupVaultName: BackupsUnderBackupVaultCommonSchemas.backupVaultName,
  backupName: BackupsUnderBackupVaultCommonSchemas.backupName,
  body: z.object({
    volumeResourceId: z.string().min(1),
    restoreToNewVolume: z.boolean().optional(),
    newVolumeName: z.string().optional(),
    fileList: z.array(z.string()).optional()
  })
});

/**
 * Move backup between backup vaults
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults/{backupVaultName}/backups/{backupName}/move
 */
const BackupsUnderBackupVaultMoveSchema = z.object({
  subscriptionId: BackupsUnderBackupVaultCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderBackupVaultCommonSchemas.resourceGroupName,
  accountName: BackupsUnderBackupVaultCommonSchemas.accountName,
  backupVaultName: BackupsUnderBackupVaultCommonSchemas.backupVaultName,
  backupName: BackupsUnderBackupVaultCommonSchemas.backupName,
  body: z.object({
    destinationVaultId: z.string().min(1),
    copyTags: z.boolean().optional()
  })
});

/**
 * Get backup vault statistics
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults/{backupVaultName}/backupStatistics
 */
const BackupsUnderBackupVaultStatisticsSchema = z.object({
  subscriptionId: BackupsUnderBackupVaultCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderBackupVaultCommonSchemas.resourceGroupName,
  accountName: BackupsUnderBackupVaultCommonSchemas.accountName,
  backupVaultName: BackupsUnderBackupVaultCommonSchemas.backupVaultName,
  timeRange: z.enum(['24h', '7d', '30d', '90d', '365d']).optional()
});

/**
 * Validate backup restore feasibility
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults/{backupVaultName}/backups/{backupName}/validateRestore
 */
const BackupsUnderBackupVaultValidateRestoreSchema = z.object({
  subscriptionId: BackupsUnderBackupVaultCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderBackupVaultCommonSchemas.resourceGroupName,
  accountName: BackupsUnderBackupVaultCommonSchemas.accountName,
  backupVaultName: BackupsUnderBackupVaultCommonSchemas.backupVaultName,
  backupName: BackupsUnderBackupVaultCommonSchemas.backupName,
  body: z.object({
    targetVolumeId: z.string().min(1),
    targetPoolId: z.string().optional(),
    restoreType: z.enum(['FullRestore', 'FileRestore']).optional()
  })
});

/**
 * Export backup metadata from vault
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults/{backupVaultName}/exportBackupMetadata
 */
const BackupsUnderBackupVaultExportMetadataSchema = z.object({
  subscriptionId: BackupsUnderBackupVaultCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderBackupVaultCommonSchemas.resourceGroupName,
  accountName: BackupsUnderBackupVaultCommonSchemas.accountName,
  backupVaultName: BackupsUnderBackupVaultCommonSchemas.backupVaultName,
  body: z.object({
    format: z.enum(['json', 'csv', 'xlsx']),
    includeDeleted: z.boolean().optional(),
    filter: z.string().optional()
  })
});

// =============================================================================
// MCP TOOLS EXPORT
// =============================================================================

export const backupsUnderBackupVaultTools: Tool[] = [
  {
    name: 'anf_backups_under_backup_vault_list',
    description: 'List all backups within a specific backup vault with filtering options',
    inputSchema: BackupsUnderBackupVaultListSchema
  },
  {
    name: 'anf_backups_under_backup_vault_get',
    description: 'Get detailed information about a specific backup in a backup vault',
    inputSchema: BackupsUnderBackupVaultGetSchema
  },
  {
    name: 'anf_backups_under_backup_vault_create',
    description: 'Create a manual backup in a backup vault from a volume',
    inputSchema: BackupsUnderBackupVaultCreateSchema
  },
  {
    name: 'anf_backups_under_backup_vault_delete',
    description: 'Delete a backup from a backup vault permanently',
    inputSchema: BackupsUnderBackupVaultDeleteSchema
  },
  {
    name: 'anf_backups_under_backup_vault_update',
    description: 'Update backup metadata and properties in a backup vault',
    inputSchema: BackupsUnderBackupVaultUpdateSchema
  },
  {
    name: 'anf_backups_under_backup_vault_restore',
    description: 'Restore data from a backup in a backup vault to a volume',
    inputSchema: BackupsUnderBackupVaultRestoreSchema
  },
  {
    name: 'anf_backups_under_backup_vault_move',
    description: 'Move a backup between backup vaults within the same account',
    inputSchema: BackupsUnderBackupVaultMoveSchema
  },
  {
    name: 'anf_backups_under_backup_vault_statistics',
    description: 'Get statistical information about backups in a backup vault',
    inputSchema: BackupsUnderBackupVaultStatisticsSchema
  },
  {
    name: 'anf_backups_under_backup_vault_validate_restore',
    description: 'Validate if a backup can be restored to a specific target',
    inputSchema: BackupsUnderBackupVaultValidateRestoreSchema
  },
  {
    name: 'anf_backups_under_backup_vault_export_metadata',
    description: 'Export backup metadata from vault in various formats',
    inputSchema: BackupsUnderBackupVaultExportMetadataSchema
  }
];

// =============================================================================
// API CLIENT EXTENSION FOR BACKUPS UNDER BACKUP VAULT
// =============================================================================

export interface BackupsUnderBackupVaultApiMethods {
  // List backups in vault
  listBackupsInVault(params: z.infer<typeof BackupsUnderBackupVaultListSchema>): Promise<{
    value: Array<{
      id: string;
      name: string;
      type: string;
      properties: {
        backupId: string;
        vaultId: string;
        volumeResourceId: string;
        creationDate: string;
        size: number;
        backupType: 'Manual' | 'Scheduled';
        provisioningState: string;
        failureReason?: string;
        label?: string;
        snapshotName?: string;
      };
    }>;
    nextLink?: string;
  }>;

  // Get backup in vault
  getBackupInVault(params: z.infer<typeof BackupsUnderBackupVaultGetSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    properties: {
      backupId: string;
      vaultId: string;
      volumeResourceId: string;
      creationDate: string;
      size: number;
      backupType: string;
      provisioningState: string;
      encryptionType: string;
      compressionEnabled: boolean;
      deduplicationEnabled: boolean;
      retentionPeriod: number;
      expiryDate: string;
    };
  }>;

  // Create backup in vault
  createBackupInVault(params: z.infer<typeof BackupsUnderBackupVaultCreateSchema>): Promise<{
    id: string;
    name: string;
    properties: {
      provisioningState: 'Creating';
      operationId: string;
    };
  }>;

  // Delete backup from vault
  deleteBackupFromVault(params: z.infer<typeof BackupsUnderBackupVaultDeleteSchema>): Promise<void>;

  // Update backup in vault
  updateBackupInVault(params: z.infer<typeof BackupsUnderBackupVaultUpdateSchema>): Promise<{
    id: string;
    name: string;
    properties: {
      label?: string;
      lastModified: string;
    };
    tags?: Record<string, string>;
  }>;

  // Restore backup from vault
  restoreBackupFromVault(params: z.infer<typeof BackupsUnderBackupVaultRestoreSchema>): Promise<{
    operationId: string;
    status: 'Accepted' | 'InProgress';
    targetVolumeId: string;
  }>;

  // Move backup between vaults
  moveBackupBetweenVaults(params: z.infer<typeof BackupsUnderBackupVaultMoveSchema>): Promise<{
    operationId: string;
    status: 'Accepted' | 'InProgress';
    sourceVaultId: string;
    destinationVaultId: string;
  }>;

  // Get vault statistics
  getBackupVaultStatistics(params: z.infer<typeof BackupsUnderBackupVaultStatisticsSchema>): Promise<{
    vaultName: string;
    timeRange: string;
    statistics: {
      totalBackups: number;
      totalSize: number;
      averageBackupSize: number;
      oldestBackup: string;
      newestBackup: string;
      backupsByType: {
        manual: number;
        scheduled: number;
      };
      backupsByStatus: {
        available: number;
        creating: number;
        failed: number;
      };
      growthRate: number;
      compressionRatio: number;
      deduplicationRatio: number;
    };
  }>;

  // Validate restore
  validateBackupRestore(params: z.infer<typeof BackupsUnderBackupVaultValidateRestoreSchema>): Promise<{
    isValid: boolean;
    validationResults: Array<{
      checkName: string;
      passed: boolean;
      message?: string;
    }>;
    estimatedRestoreTime: number;
    requiredSpace: number;
  }>;

  // Export metadata
  exportBackupMetadata(params: z.infer<typeof BackupsUnderBackupVaultExportMetadataSchema>): Promise<{
    exportId: string;
    downloadUrl: string;
    expiresAt: string;
    format: string;
    recordCount: number;
  }>;
}

// =============================================================================
// BACKUP VAULT CONSTANTS
// =============================================================================

export const BackupVaultBackupStates = {
  CREATING: 'Creating',
  AVAILABLE: 'Available',
  DELETING: 'Deleting',
  FAILED: 'Failed',
  MOVING: 'Moving'
} as const;

export const BackupVaultRestoreTypes = {
  FULL_RESTORE: 'FullRestore',
  FILE_RESTORE: 'FileRestore',
  VOLUME_RESTORE: 'VolumeRestore'
} as const;

export const BackupVaultStatisticsTimeRanges = {
  ONE_DAY: '24h',
  ONE_WEEK: '7d',
  ONE_MONTH: '30d',
  THREE_MONTHS: '90d',
  ONE_YEAR: '365d'
} as const;