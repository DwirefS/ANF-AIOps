/**
 * Backup Vaults Operations Tools
 * 
 * Dedicated implementation for Backup Vaults operation group
 * Manages all backup vault operations for Azure NetApp Files
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * API Version: 2025-03-01
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Common schemas for Backup Vaults operations
const BackupVaultsCommonSchemas = {
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
  resourceGroupName: z.string().min(1).max(90).regex(/^[-\w\._\(\)]+$/, 'Invalid resource group name'),
  accountName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid account name'),
  backupVaultName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid backup vault name'),
  location: z.string().min(1).max(50).regex(/^[a-zA-Z0-9\-]+$/, 'Invalid location format'),
  tags: z.record(z.string()).optional()
};

// =============================================================================
// BACKUP VAULTS OPERATION GROUP - ALL INDIVIDUAL OPERATIONS
// =============================================================================

/**
 * Create or update backup vault
 * PUT /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults/{backupVaultName}
 */
const BackupVaultsCreateOrUpdateSchema = z.object({
  subscriptionId: BackupVaultsCommonSchemas.subscriptionId,
  resourceGroupName: BackupVaultsCommonSchemas.resourceGroupName,
  accountName: BackupVaultsCommonSchemas.accountName,
  backupVaultName: BackupVaultsCommonSchemas.backupVaultName,
  body: z.object({
    location: BackupVaultsCommonSchemas.location,
    tags: BackupVaultsCommonSchemas.tags,
    properties: z.object({
      description: z.string().optional()
    }).optional()
  })
});

/**
 * Delete backup vault
 * DELETE /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults/{backupVaultName}
 */
const BackupVaultsDeleteSchema = z.object({
  subscriptionId: BackupVaultsCommonSchemas.subscriptionId,
  resourceGroupName: BackupVaultsCommonSchemas.resourceGroupName,
  accountName: BackupVaultsCommonSchemas.accountName,
  backupVaultName: BackupVaultsCommonSchemas.backupVaultName
});

/**
 * Get backup vault details
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults/{backupVaultName}
 */
const BackupVaultsGetSchema = z.object({
  subscriptionId: BackupVaultsCommonSchemas.subscriptionId,
  resourceGroupName: BackupVaultsCommonSchemas.resourceGroupName,
  accountName: BackupVaultsCommonSchemas.accountName,
  backupVaultName: BackupVaultsCommonSchemas.backupVaultName
});

/**
 * List backup vaults
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults
 */
const BackupVaultsListSchema = z.object({
  subscriptionId: BackupVaultsCommonSchemas.subscriptionId,
  resourceGroupName: BackupVaultsCommonSchemas.resourceGroupName,
  accountName: BackupVaultsCommonSchemas.accountName
});

/**
 * Update backup vault
 * PATCH /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults/{backupVaultName}
 */
const BackupVaultsUpdateSchema = z.object({
  subscriptionId: BackupVaultsCommonSchemas.subscriptionId,
  resourceGroupName: BackupVaultsCommonSchemas.resourceGroupName,
  accountName: BackupVaultsCommonSchemas.accountName,
  backupVaultName: BackupVaultsCommonSchemas.backupVaultName,
  body: z.object({
    tags: BackupVaultsCommonSchemas.tags,
    properties: z.object({
      description: z.string().optional()
    }).optional()
  })
});

/**
 * Get backup vault status
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults/{backupVaultName}/backupStatus
 */
const BackupVaultsGetBackupStatusSchema = z.object({
  subscriptionId: BackupVaultsCommonSchemas.subscriptionId,
  resourceGroupName: BackupVaultsCommonSchemas.resourceGroupName,
  accountName: BackupVaultsCommonSchemas.accountName,
  backupVaultName: BackupVaultsCommonSchemas.backupVaultName
});

/**
 * Migrate backups between vaults
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupVaults/{backupVaultName}/migrateBackups
 */
const BackupVaultsMigrateBackupsSchema = z.object({
  subscriptionId: BackupVaultsCommonSchemas.subscriptionId,
  resourceGroupName: BackupVaultsCommonSchemas.resourceGroupName,
  accountName: BackupVaultsCommonSchemas.accountName,
  backupVaultName: BackupVaultsCommonSchemas.backupVaultName,
  body: z.object({
    targetBackupVaultId: z.string(),
    backupIds: z.array(z.string()).optional()
  })
});

// =============================================================================
// MCP TOOLS EXPORT
// =============================================================================

export const backupVaultsOperationsTools: Tool[] = [
  {
    name: 'anf_backup_vaults_create_or_update',
    description: 'Create or update a backup vault for storing volume backups',
    inputSchema: BackupVaultsCreateOrUpdateSchema
  },
  {
    name: 'anf_backup_vaults_delete',
    description: 'Delete a backup vault (must be empty of backups)',
    inputSchema: BackupVaultsDeleteSchema
  },
  {
    name: 'anf_backup_vaults_get',
    description: 'Get detailed information about a specific backup vault',
    inputSchema: BackupVaultsGetSchema
  },
  {
    name: 'anf_backup_vaults_list',
    description: 'List all backup vaults in a NetApp account',
    inputSchema: BackupVaultsListSchema
  },
  {
    name: 'anf_backup_vaults_update',
    description: 'Update backup vault properties and tags',
    inputSchema: BackupVaultsUpdateSchema
  },
  {
    name: 'anf_backup_vaults_get_backup_status',
    description: 'Get backup status and statistics for a vault',
    inputSchema: BackupVaultsGetBackupStatusSchema
  },
  {
    name: 'anf_backup_vaults_migrate_backups',
    description: 'Migrate backups from one vault to another',
    inputSchema: BackupVaultsMigrateBackupsSchema
  }
];

// =============================================================================
// API CLIENT EXTENSION FOR BACKUP VAULTS
// =============================================================================

export interface BackupVaultsApiMethods {
  // Create or update backup vault
  createOrUpdateBackupVault(params: z.infer<typeof BackupVaultsCreateOrUpdateSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    location: string;
    properties: {
      vaultId: string;
      description?: string;
      provisioningState: string;
    };
    tags?: Record<string, string>;
  }>;

  // Delete backup vault
  deleteBackupVault(params: z.infer<typeof BackupVaultsDeleteSchema>): Promise<void>;

  // Get backup vault
  getBackupVault(params: z.infer<typeof BackupVaultsGetSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    location: string;
    properties: {
      vaultId: string;
      description?: string;
      provisioningState: string;
      totalBackupSize?: number;
      backupCount?: number;
    };
    tags?: Record<string, string>;
  }>;

  // List backup vaults
  listBackupVaults(params: z.infer<typeof BackupVaultsListSchema>): Promise<{
    value: Array<{
      id: string;
      name: string;
      type: string;
      location: string;
      properties: any;
    }>;
    nextLink?: string;
  }>;

  // Update backup vault
  updateBackupVault(params: z.infer<typeof BackupVaultsUpdateSchema>): Promise<{
    id: string;
    name: string;
    properties: {
      provisioningState: string;
    };
  }>;

  // Get backup status
  getBackupVaultStatus(params: z.infer<typeof BackupVaultsGetBackupStatusSchema>): Promise<{
    totalBackupSize: number;
    backupCount: number;
    volumeCount: number;
    oldestBackup?: string;
    latestBackup?: string;
    healthStatus: string;
    errorMessage?: string;
  }>;

  // Migrate backups
  migrateBackups(params: z.infer<typeof BackupVaultsMigrateBackupsSchema>): Promise<{
    message: string;
    operationId: string;
    migratedCount: number;
  }>;
}

// =============================================================================
// BACKUP VAULT CONSTANTS
// =============================================================================

export const BackupVaultProvisioningStates = {
  CREATING: 'Creating',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  DELETING: 'Deleting',
  UPDATING: 'Updating'
} as const;

export const BackupVaultHealthStatus = {
  HEALTHY: 'Healthy',
  WARNING: 'Warning',
  ERROR: 'Error',
  UNKNOWN: 'Unknown'
} as const;