/**
 * Backups Under Account Operations Tools
 * 
 * Dedicated implementation for Backups Under Account operation group
 * Manages all backup operations at the NetApp account level
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * API Version: 2025-03-01
 */

import { Tool } from '../types/tool';
import { z } from 'zod';
import { wrapZodSchema } from '../utils/zod-to-json-schema';

// Common schemas for Backups Under Account operations
const BackupsUnderAccountCommonSchemas = {
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
  resourceGroupName: z.string().min(1).max(90).regex(/^[-\w\._\(\)]+$/, 'Invalid resource group name'),
  accountName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid account name'),
  backupName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid backup name'),
};

// =============================================================================
// BACKUPS UNDER ACCOUNT OPERATION GROUP
// =============================================================================

/**
 * List all backups under a NetApp account
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/accountBackups
 */
const BackupsUnderAccountListSchema = z.object({
  subscriptionId: BackupsUnderAccountCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderAccountCommonSchemas.resourceGroupName,
  accountName: BackupsUnderAccountCommonSchemas.accountName,
  filter: z.string().optional(), // OData filter for results
  orderBy: z.string().optional(), // OData orderBy clause
  top: z.number().int().min(1).max(1000).optional(), // Maximum number of results
  skip: z.number().int().min(0).optional() // Number of results to skip
});

/**
 * Get specific backup details under account
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/accountBackups/{backupName}
 */
const BackupsUnderAccountGetSchema = z.object({
  subscriptionId: BackupsUnderAccountCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderAccountCommonSchemas.resourceGroupName,
  accountName: BackupsUnderAccountCommonSchemas.accountName,
  backupName: BackupsUnderAccountCommonSchemas.backupName
});

/**
 * Delete backup under account
 * DELETE /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/accountBackups/{backupName}
 */
const BackupsUnderAccountDeleteSchema = z.object({
  subscriptionId: BackupsUnderAccountCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderAccountCommonSchemas.resourceGroupName,
  accountName: BackupsUnderAccountCommonSchemas.accountName,
  backupName: BackupsUnderAccountCommonSchemas.backupName,
  force: z.boolean().optional() // Force delete even if backup is being used
});

/**
 * Get backup status under account
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/accountBackups/{backupName}/status
 */
const BackupsUnderAccountGetStatusSchema = z.object({
  subscriptionId: BackupsUnderAccountCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderAccountCommonSchemas.resourceGroupName,
  accountName: BackupsUnderAccountCommonSchemas.accountName,
  backupName: BackupsUnderAccountCommonSchemas.backupName
});

/**
 * Restore from backup under account to new volume
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/accountBackups/{backupName}/restore
 */
const BackupsUnderAccountRestoreSchema = z.object({
  subscriptionId: BackupsUnderAccountCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderAccountCommonSchemas.resourceGroupName,
  accountName: BackupsUnderAccountCommonSchemas.accountName,
  backupName: BackupsUnderAccountCommonSchemas.backupName,
  body: z.object({
    targetVolumeId: z.string().min(1),
    restoreMode: z.enum(['NewVolume', 'OverwriteVolume', 'RestoreFiles']),
    destinationVolumeProperties: z.object({
      name: z.string().min(1).max(64),
      poolName: z.string().min(1).max(64),
      serviceLevel: z.enum(['Standard', 'Premium', 'Ultra']),
      usageThreshold: z.number().int().min(107374182400), // Minimum 100GB
      subnetId: z.string().min(1),
      protocolTypes: z.array(z.enum(['NFSv3', 'NFSv4.1', 'SMB', 'dual-protocol'])),
      snapshotDirectoryVisible: z.boolean().optional(),
      exportPolicy: z.object({
        rules: z.array(z.object({
          ruleIndex: z.number().int().min(1).max(5),
          allowedClients: z.string(),
          unixReadOnly: z.boolean(),
          unixReadWrite: z.boolean(),
          cifs: z.boolean(),
          nfsv3: z.boolean(),
          nfsv41: z.boolean(),
          rootAccess: z.boolean()
        }))
      }).optional()
    }).optional(),
    fileList: z.array(z.object({
      sourcePath: z.string(),
      destinationPath: z.string(),
      overwrite: z.boolean().optional()
    })).optional()
  })
});

/**
 * Copy backup under account to different region
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/accountBackups/{backupName}/copy
 */
const BackupsUnderAccountCopySchema = z.object({
  subscriptionId: BackupsUnderAccountCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderAccountCommonSchemas.resourceGroupName,
  accountName: BackupsUnderAccountCommonSchemas.accountName,
  backupName: BackupsUnderAccountCommonSchemas.backupName,
  body: z.object({
    destinationRegion: z.string().min(1),
    destinationBackupVaultId: z.string().min(1),
    destinationBackupName: z.string().min(1).max(64).optional(),
    copyTags: z.boolean().optional(),
    encryptionType: z.enum(['Microsoft', 'Customer']).optional()
  })
});

/**
 * Update backup metadata under account
 * PATCH /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/accountBackups/{backupName}
 */
const BackupsUnderAccountUpdateSchema = z.object({
  subscriptionId: BackupsUnderAccountCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderAccountCommonSchemas.resourceGroupName,
  accountName: BackupsUnderAccountCommonSchemas.accountName,
  backupName: BackupsUnderAccountCommonSchemas.backupName,
  body: z.object({
    tags: z.record(z.string()).optional(),
    properties: z.object({
      label: z.string().max(1024).optional(),
      retentionPolicy: z.object({
        retentionDays: z.number().int().min(1).max(3653).optional(), // Max 10 years
        retentionType: z.enum(['Manual', 'Policy', 'Legal']).optional()
      }).optional()
    }).optional()
  })
});

/**
 * Get backup metrics and analytics under account
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/accountBackups/{backupName}/metrics
 */
const BackupsUnderAccountGetMetricsSchema = z.object({
  subscriptionId: BackupsUnderAccountCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderAccountCommonSchemas.resourceGroupName,
  accountName: BackupsUnderAccountCommonSchemas.accountName,
  backupName: BackupsUnderAccountCommonSchemas.backupName,
  timeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).optional(),
  metricTypes: z.array(z.enum([
    'size',
    'transferSpeed',
    'compression',
    'deduplication',
    'restoreTime'
  ])).optional()
});

/**
 * List backup dependencies under account
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/accountBackups/{backupName}/dependencies
 */
const BackupsUnderAccountListDependenciesSchema = z.object({
  subscriptionId: BackupsUnderAccountCommonSchemas.subscriptionId,
  resourceGroupName: BackupsUnderAccountCommonSchemas.resourceGroupName,
  accountName: BackupsUnderAccountCommonSchemas.accountName,
  backupName: BackupsUnderAccountCommonSchemas.backupName
});

// =============================================================================
// MCP TOOLS EXPORT
// =============================================================================

export const backupsUnderAccountTools: Tool[] = [
  {
    name: 'anf_backups_under_account_list',
    description: 'List all backups under a NetApp account with filtering and pagination',
    inputSchema: wrapZodSchema(BackupsUnderAccountListSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_under_account_list is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backups_under_account_get',
    description: 'Get detailed information about a specific backup under account',
    inputSchema: wrapZodSchema(BackupsUnderAccountGetSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_under_account_get is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backups_under_account_delete',
    description: 'Delete a backup under account with optional force deletion',
    inputSchema: wrapZodSchema(BackupsUnderAccountDeleteSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_under_account_delete is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backups_under_account_get_status',
    description: 'Get current status and progress of backup under account',
    inputSchema: wrapZodSchema(BackupsUnderAccountGetStatusSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_under_account_get_status is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backups_under_account_restore',
    description: 'Restore from backup under account to new volume or restore specific files',
    inputSchema: wrapZodSchema(BackupsUnderAccountRestoreSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_under_account_restore is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backups_under_account_copy',
    description: 'Copy backup under account to different region or backup vault',
    inputSchema: wrapZodSchema(BackupsUnderAccountCopySchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_under_account_copy is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backups_under_account_update',
    description: 'Update backup metadata, tags, and retention policy under account',
    inputSchema: wrapZodSchema(BackupsUnderAccountUpdateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_under_account_update is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backups_under_account_get_metrics',
    description: 'Get backup metrics and analytics for backup under account',
    inputSchema: wrapZodSchema(BackupsUnderAccountGetMetricsSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_under_account_get_metrics is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backups_under_account_list_dependencies',
    description: 'List all resources that depend on this backup under account',
    inputSchema: wrapZodSchema(BackupsUnderAccountListDependenciesSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_under_account_list_dependencies is not yet implemented',
        placeholder: true
      };
    }
  }
];

// =============================================================================
// API CLIENT EXTENSION FOR BACKUPS UNDER ACCOUNT
// =============================================================================

export interface BackupsUnderAccountApiMethods {
  // List all backups under account
  listBackupsUnderAccount(params: z.infer<typeof BackupsUnderAccountListSchema>): Promise<{
    value: Array<{
      id: string;
      name: string;
      type: string;
      properties: {
        backupId: string;
        creationDate: string;
        size: number;
        volumeResourceId: string;
        volumeName: string;
        poolName: string;
        backupType: 'Manual' | 'Scheduled';
        provisioningState: string;
        failureReason?: string;
        label?: string;
        retentionPolicy: {
          retentionDays: number;
          retentionType: string;
        };
      };
      tags?: Record<string, string>;
    }>;
    nextLink?: string;
  }>;

  // Get specific backup under account
  getBackupUnderAccount(params: z.infer<typeof BackupsUnderAccountGetSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    properties: {
      backupId: string;
      creationDate: string;
      size: number;
      volumeResourceId: string;
      volumeName: string;
      poolName: string;
      backupType: 'Manual' | 'Scheduled';
      provisioningState: string;
      failureReason?: string;
      label?: string;
      retentionPolicy: {
        retentionDays: number;
        retentionType: string;
      };
      backupPolicyResourceId?: string;
      encryptionType: string;
      compressionRatio: number;
      deduplicationRatio: number;
      lastModified: string;
    };
    tags?: Record<string, string>;
  }>;

  // Delete backup under account
  deleteBackupUnderAccount(params: z.infer<typeof BackupsUnderAccountDeleteSchema>): Promise<void>;

  // Get backup status under account
  getBackupStatusUnderAccount(params: z.infer<typeof BackupsUnderAccountGetStatusSchema>): Promise<{
    status: 'Creating' | 'Available' | 'Deleting' | 'Failed' | 'Restoring';
    progress: number;
    startTime: string;
    endTime?: string;
    error?: {
      code: string;
      message: string;
    };
  }>;

  // Restore backup under account
  restoreBackupUnderAccount(params: z.infer<typeof BackupsUnderAccountRestoreSchema>): Promise<{
    operationId: string;
    status: 'Accepted' | 'InProgress' | 'Succeeded' | 'Failed';
    startTime: string;
    targetVolumeId?: string;
    progress?: number;
  }>;

  // Copy backup under account
  copyBackupUnderAccount(params: z.infer<typeof BackupsUnderAccountCopySchema>): Promise<{
    operationId: string;
    status: 'Accepted' | 'InProgress' | 'Succeeded' | 'Failed';
    destinationBackupId?: string;
    startTime: string;
    progress?: number;
  }>;

  // Update backup under account
  updateBackupUnderAccount(params: z.infer<typeof BackupsUnderAccountUpdateSchema>): Promise<{
    id: string;
    name: string;
    properties: {
      lastModified: string;
      retentionPolicy?: {
        retentionDays: number;
        retentionType: string;
      };
    };
    tags?: Record<string, string>;
  }>;

  // Get backup metrics under account
  getBackupMetricsUnderAccount(params: z.infer<typeof BackupsUnderAccountGetMetricsSchema>): Promise<{
    backupName: string;
    timeRange: string;
    metrics: {
      size: {
        originalSize: number;
        compressedSize: number;
        compressionRatio: number;
      };
      performance: {
        averageTransferSpeed: number;
        maxTransferSpeed: number;
        lastBackupDuration: number;
      };
      efficiency: {
        deduplicationRatio: number;
        spaceEfficiency: number;
      };
      reliability: {
        successRate: number;
        lastSuccessfulBackup: string;
        failureCount: number;
      };
    };
  }>;

  // List backup dependencies under account
  listBackupDependenciesUnderAccount(params: z.infer<typeof BackupsUnderAccountListDependenciesSchema>): Promise<{
    dependencies: Array<{
      resourceId: string;
      resourceType: string;
      dependencyType: 'RestoreSource' | 'PolicyAssignment' | 'VaultAssignment';
      status: 'Active' | 'Inactive';
      lastUsed?: string;
    }>;
  }>;
}

// =============================================================================
// BACKUP TYPES AND CONSTANTS
// =============================================================================

export const BackupUnderAccountTypes = {
  MANUAL: 'Manual',
  SCHEDULED: 'Scheduled',
  POLICY_BASED: 'PolicyBased'
} as const;

export const BackupUnderAccountStates = {
  CREATING: 'Creating',
  AVAILABLE: 'Available',
  DELETING: 'Deleting',
  FAILED: 'Failed',
  RESTORING: 'Restoring'
} as const;

export const BackupUnderAccountRestoreModes = {
  NEW_VOLUME: 'NewVolume',
  OVERWRITE_VOLUME: 'OverwriteVolume',
  RESTORE_FILES: 'RestoreFiles'
} as const;