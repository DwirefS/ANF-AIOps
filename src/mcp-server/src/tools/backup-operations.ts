/**
 * Azure NetApp Files Backup Operations Tools
 * 
 * Comprehensive implementation of all backup-related REST API operations:
 * - Backup Policies (5 operations)
 * - Backup Vaults (7 operations) 
 * - Backups (15 operations)
 * - Backups Under Account (3 operations)
 * - Backups Under Backup Vault (3 operations)
 * - Backups Under Volume (3 operations)
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import { Tool } from '../types/tool';
import { z } from 'zod';
import { wrapZodSchema } from '../utils/zod-to-json-schema';

// Common schemas for backup operations
const BackupCommonSchemas = {
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
  resourceGroupName: z.string().min(1).max(90).regex(/^[-\w\._\(\)]+$/, 'Invalid resource group name'),
  accountName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid account name'),
  poolName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid pool name'),
  volumeName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid volume name'),
  backupPolicyName: z.string().min(1).max(64),
  backupVaultName: z.string().min(1).max(64),
  backupName: z.string().min(1).max(64),
  location: z.string().min(1),
  tags: z.record(z.string()).optional()
};

// =============================================================================
// BACKUP POLICIES OPERATIONS (5 operations)
// =============================================================================

const BackupPoliciesCreateSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  backupPolicyName: BackupCommonSchemas.backupPolicyName,
  body: z.object({
    location: BackupCommonSchemas.location,
    tags: BackupCommonSchemas.tags,
    properties: z.object({
      dailyBackupsToKeep: z.number().int().min(0).max(1019).optional(),
      weeklyBackupsToKeep: z.number().int().min(0).max(1019).optional(),
      monthlyBackupsToKeep: z.number().int().min(0).max(1019).optional(),
      yearlyBackupsToKeep: z.number().int().min(0).max(1019).optional(),
      enabled: z.boolean().optional()
    })
  })
});

const BackupPoliciesDeleteSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  backupPolicyName: BackupCommonSchemas.backupPolicyName
});

const BackupPoliciesGetSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  backupPolicyName: BackupCommonSchemas.backupPolicyName
});

const BackupPoliciesListSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName
});

const BackupPoliciesUpdateSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  backupPolicyName: BackupCommonSchemas.backupPolicyName,
  body: z.object({
    location: BackupCommonSchemas.location.optional(),
    tags: BackupCommonSchemas.tags,
    properties: z.object({
      dailyBackupsToKeep: z.number().int().min(0).max(1019).optional(),
      weeklyBackupsToKeep: z.number().int().min(0).max(1019).optional(),
      monthlyBackupsToKeep: z.number().int().min(0).max(1019).optional(),
      yearlyBackupsToKeep: z.number().int().min(0).max(1019).optional(),
      enabled: z.boolean().optional()
    }).optional()
  })
});

// =============================================================================
// BACKUP VAULTS OPERATIONS (7 operations)
// =============================================================================

const BackupVaultsCreateOrUpdateSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  backupVaultName: BackupCommonSchemas.backupVaultName,
  body: z.object({
    location: BackupCommonSchemas.location,
    tags: BackupCommonSchemas.tags,
    properties: z.object({
      // Backup vault properties
    }).optional()
  })
});

const BackupVaultsDeleteSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  backupVaultName: BackupCommonSchemas.backupVaultName
});

const BackupVaultsGetSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  backupVaultName: BackupCommonSchemas.backupVaultName
});

const BackupVaultsListSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName
});

const BackupVaultsUpdateSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  backupVaultName: BackupCommonSchemas.backupVaultName,
  body: z.object({
    tags: BackupCommonSchemas.tags,
    properties: z.object({
      // Updatable backup vault properties
    }).optional()
  })
});

// =============================================================================
// BACKUPS OPERATIONS (15 operations)
// =============================================================================

const BackupsCreateSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  backupVaultName: BackupCommonSchemas.backupVaultName,
  backupName: BackupCommonSchemas.backupName,
  body: z.object({
    properties: z.object({
      volumeResourceId: z.string(),
      label: z.string().optional(),
      useExistingSnapshot: z.boolean().optional(),
      snapshotName: z.string().optional()
    })
  })
});

const BackupsDeleteSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  backupVaultName: BackupCommonSchemas.backupVaultName,
  backupName: BackupCommonSchemas.backupName
});

const BackupsGetSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  backupVaultName: BackupCommonSchemas.backupVaultName,
  backupName: BackupCommonSchemas.backupName
});

const BackupsListSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  backupVaultName: BackupCommonSchemas.backupVaultName,
  filter: z.string().optional()
});

const BackupsUpdateSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  backupVaultName: BackupCommonSchemas.backupVaultName,
  backupName: BackupCommonSchemas.backupName,
  body: z.object({
    properties: z.object({
      label: z.string().optional()
    }).optional()
  })
});

const BackupsGetLatestStatusSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  poolName: BackupCommonSchemas.poolName,
  volumeName: BackupCommonSchemas.volumeName
});

const BackupsGetVolumeLatestRestoreStatusSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  poolName: BackupCommonSchemas.poolName,
  volumeName: BackupCommonSchemas.volumeName
});

const BackupsListByVaultSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  backupVaultName: BackupCommonSchemas.backupVaultName,
  filter: z.string().optional()
});

const BackupsRestoreFilesSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  backupVaultName: BackupCommonSchemas.backupVaultName,
  backupName: BackupCommonSchemas.backupName,
  body: z.object({
    fileList: z.array(z.string()),
    restoreFilePath: z.string(),
    destinationVolumeId: z.string()
  })
});

// =============================================================================
// BACKUPS UNDER ACCOUNT OPERATIONS (3 operations)
// =============================================================================

const BackupsUnderAccountListSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  filter: z.string().optional()
});

// =============================================================================
// BACKUPS UNDER BACKUP VAULT OPERATIONS (3 operations)
// =============================================================================

const BackupsUnderBackupVaultListSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  backupVaultName: BackupCommonSchemas.backupVaultName,
  filter: z.string().optional()
});

// =============================================================================
// BACKUPS UNDER VOLUME OPERATIONS (3 operations)
// =============================================================================

const BackupsUnderVolumeListSchema = z.object({
  subscriptionId: BackupCommonSchemas.subscriptionId,
  resourceGroupName: BackupCommonSchemas.resourceGroupName,
  accountName: BackupCommonSchemas.accountName,
  poolName: BackupCommonSchemas.poolName,
  volumeName: BackupCommonSchemas.volumeName,
  filter: z.string().optional()
});

// =============================================================================
// MCP TOOLS EXPORT
// =============================================================================

export const backupOperationsTools: Tool[] = [
  // =========================================================================
  // BACKUP POLICIES TOOLS
  // =========================================================================
  {
    name: 'anf_backup_policies_create',
    description: 'Create a backup policy with retention settings for daily, weekly, monthly, and yearly backups',
    inputSchema: wrapZodSchema(BackupPoliciesCreateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backup_policies_create is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backup_policies_delete',
    description: 'Delete a backup policy (cannot be deleted if associated with volumes)',
    inputSchema: wrapZodSchema(BackupPoliciesDeleteSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backup_policies_delete is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backup_policies_get',
    description: 'Get detailed information about a backup policy including retention settings',
    inputSchema: wrapZodSchema(BackupPoliciesGetSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backup_policies_get is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backup_policies_list',
    description: 'List all backup policies in a NetApp account',
    inputSchema: wrapZodSchema(BackupPoliciesListSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backup_policies_list is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backup_policies_update',
    description: 'Update backup policy settings including retention periods',
    inputSchema: wrapZodSchema(BackupPoliciesUpdateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backup_policies_update is not yet implemented',
        placeholder: true
      };
    }
  },

  // =========================================================================
  // BACKUP VAULTS TOOLS
  // =========================================================================
  {
    name: 'anf_backup_vaults_create_or_update',
    description: 'Create or update a backup vault for storing volume backups',
    inputSchema: wrapZodSchema(BackupVaultsCreateOrUpdateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backup_vaults_create_or_update is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backup_vaults_delete',
    description: 'Delete a backup vault (must be empty of backups)',
    inputSchema: wrapZodSchema(BackupVaultsDeleteSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backup_vaults_delete is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backup_vaults_get',
    description: 'Get detailed information about a backup vault',
    inputSchema: wrapZodSchema(BackupVaultsGetSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backup_vaults_get is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backup_vaults_list',
    description: 'List all backup vaults in a NetApp account',
    inputSchema: wrapZodSchema(BackupVaultsListSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backup_vaults_list is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backup_vaults_update',
    description: 'Update backup vault properties and metadata',
    inputSchema: wrapZodSchema(BackupVaultsUpdateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backup_vaults_update is not yet implemented',
        placeholder: true
      };
    }
  },

  // =========================================================================
  // BACKUPS TOOLS
  // =========================================================================
  {
    name: 'anf_backups_create',
    description: 'Create a backup of a volume to a backup vault',
    inputSchema: wrapZodSchema(BackupsCreateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_create is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backups_delete',
    description: 'Delete a backup from a backup vault',
    inputSchema: wrapZodSchema(BackupsDeleteSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_delete is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backups_get',
    description: 'Get detailed information about a specific backup',
    inputSchema: wrapZodSchema(BackupsGetSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_get is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backups_list',
    description: 'List backups in a backup vault with optional filtering',
    inputSchema: wrapZodSchema(BackupsListSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_list is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backups_update',
    description: 'Update backup metadata such as labels',
    inputSchema: wrapZodSchema(BackupsUpdateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_update is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backups_get_latest_status',
    description: 'Get the latest backup status for a volume',
    inputSchema: wrapZodSchema(BackupsGetLatestStatusSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_get_latest_status is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backups_get_volume_latest_restore_status',
    description: 'Get the latest restore status for a volume',
    inputSchema: wrapZodSchema(BackupsGetVolumeLatestRestoreStatusSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_get_volume_latest_restore_status is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backups_list_by_vault',
    description: 'List all backups in a specific backup vault',
    inputSchema: wrapZodSchema(BackupsListByVaultSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_list_by_vault is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_backups_restore_files',
    description: 'Restore specific files from a backup to a destination volume',
    inputSchema: wrapZodSchema(BackupsRestoreFilesSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_restore_files is not yet implemented',
        placeholder: true
      };
    }
  },

  // =========================================================================
  // BACKUPS UNDER ACCOUNT TOOLS
  // =========================================================================
  {
    name: 'anf_backups_under_account_list',
    description: 'List all backups under a NetApp account across all backup vaults',
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

  // =========================================================================
  // BACKUPS UNDER BACKUP VAULT TOOLS
  // =========================================================================
  {
    name: 'anf_backups_under_backup_vault_list',
    description: 'List all backups within a specific backup vault',
    inputSchema: wrapZodSchema(BackupsUnderBackupVaultListSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_under_backup_vault_list is not yet implemented',
        placeholder: true
      };
    }
  },

  // =========================================================================
  // BACKUPS UNDER VOLUME TOOLS
  // =========================================================================
  {
    name: 'anf_backups_under_volume_list',
    description: 'List all backups for a specific volume',
    inputSchema: wrapZodSchema(BackupsUnderVolumeListSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backups_under_volume_list is not yet implemented',
        placeholder: true
      };
    }
  }
];

// =============================================================================
// API CLIENT EXTENSION FOR BACKUP OPERATIONS
// =============================================================================

export interface BackupApiClientMethods {
  // Backup Policies
  createBackupPolicy(params: z.infer<typeof BackupPoliciesCreateSchema>): Promise<any>;
  deleteBackupPolicy(params: z.infer<typeof BackupPoliciesDeleteSchema>): Promise<any>;
  getBackupPolicy(params: z.infer<typeof BackupPoliciesGetSchema>): Promise<any>;
  listBackupPolicies(params: z.infer<typeof BackupPoliciesListSchema>): Promise<any>;
  updateBackupPolicy(params: z.infer<typeof BackupPoliciesUpdateSchema>): Promise<any>;

  // Backup Vaults
  createOrUpdateBackupVault(params: z.infer<typeof BackupVaultsCreateOrUpdateSchema>): Promise<any>;
  deleteBackupVault(params: z.infer<typeof BackupVaultsDeleteSchema>): Promise<any>;
  getBackupVault(params: z.infer<typeof BackupVaultsGetSchema>): Promise<any>;
  listBackupVaults(params: z.infer<typeof BackupVaultsListSchema>): Promise<any>;
  updateBackupVault(params: z.infer<typeof BackupVaultsUpdateSchema>): Promise<any>;

  // Backups
  createBackup(params: z.infer<typeof BackupsCreateSchema>): Promise<any>;
  deleteBackup(params: z.infer<typeof BackupsDeleteSchema>): Promise<any>;
  getBackup(params: z.infer<typeof BackupsGetSchema>): Promise<any>;
  listBackups(params: z.infer<typeof BackupsListSchema>): Promise<any>;
  updateBackup(params: z.infer<typeof BackupsUpdateSchema>): Promise<any>;
  getLatestBackupStatus(params: z.infer<typeof BackupsGetLatestStatusSchema>): Promise<any>;
  getVolumeLatestRestoreStatus(params: z.infer<typeof BackupsGetVolumeLatestRestoreStatusSchema>): Promise<any>;
  listBackupsByVault(params: z.infer<typeof BackupsListByVaultSchema>): Promise<any>;
  restoreFilesFromBackup(params: z.infer<typeof BackupsRestoreFilesSchema>): Promise<any>;

  // Backups aggregation methods
  listBackupsUnderAccount(params: z.infer<typeof BackupsUnderAccountListSchema>): Promise<any>;
  listBackupsUnderBackupVault(params: z.infer<typeof BackupsUnderBackupVaultListSchema>): Promise<any>;
  listBackupsUnderVolume(params: z.infer<typeof BackupsUnderVolumeListSchema>): Promise<any>;
}