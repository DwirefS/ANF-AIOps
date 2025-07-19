/**
 * Backup Policies Operations Tools
 * 
 * Dedicated implementation for Backup Policies operation group
 * Manages all backup policy operations for Azure NetApp Files
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * API Version: 2025-03-01
 */

import { Tool } from '../types/tool';
import { z } from 'zod';
import { wrapZodSchema } from '../utils/zod-to-json-schema';

// Common schemas for Backup Policies operations
const BackupPoliciesCommonSchemas = {
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
  resourceGroupName: z.string().min(1).max(90).regex(/^[-\w\._\(\)]+$/, 'Invalid resource group name'),
  accountName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid account name'),
  backupPolicyName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid backup policy name'),
  location: z.string().min(1).max(50).regex(/^[a-zA-Z0-9\-]+$/, 'Invalid location format'),
  tags: z.record(z.string()).optional()
};

// =============================================================================
// BACKUP POLICIES OPERATION GROUP - ALL INDIVIDUAL OPERATIONS
// =============================================================================

/**
 * Create backup policy
 * PUT /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupPolicies/{backupPolicyName}
 */
const BackupPoliciesCreateSchema = z.object({
  subscriptionId: BackupPoliciesCommonSchemas.subscriptionId,
  resourceGroupName: BackupPoliciesCommonSchemas.resourceGroupName,
  accountName: BackupPoliciesCommonSchemas.accountName,
  backupPolicyName: BackupPoliciesCommonSchemas.backupPolicyName,
  body: z.object({
    location: BackupPoliciesCommonSchemas.location,
    tags: BackupPoliciesCommonSchemas.tags,
    properties: z.object({
      enabled: z.boolean().optional(),
      dailyBackupsToKeep: z.number().min(0).max(1019).optional(),
      weeklyBackupsToKeep: z.number().min(0).max(1019).optional(),
      monthlyBackupsToKeep: z.number().min(0).max(1019).optional(),
      yearlyBackupsToKeep: z.number().min(0).max(1019).optional()
    })
  })
});

/**
 * Delete backup policy
 * DELETE /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupPolicies/{backupPolicyName}
 */
const BackupPoliciesDeleteSchema = z.object({
  subscriptionId: BackupPoliciesCommonSchemas.subscriptionId,
  resourceGroupName: BackupPoliciesCommonSchemas.resourceGroupName,
  accountName: BackupPoliciesCommonSchemas.accountName,
  backupPolicyName: BackupPoliciesCommonSchemas.backupPolicyName
});

/**
 * Get backup policy details
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupPolicies/{backupPolicyName}
 */
const BackupPoliciesGetSchema = z.object({
  subscriptionId: BackupPoliciesCommonSchemas.subscriptionId,
  resourceGroupName: BackupPoliciesCommonSchemas.resourceGroupName,
  accountName: BackupPoliciesCommonSchemas.accountName,
  backupPolicyName: BackupPoliciesCommonSchemas.backupPolicyName
});

/**
 * List backup policies
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupPolicies
 */
const BackupPoliciesListSchema = z.object({
  subscriptionId: BackupPoliciesCommonSchemas.subscriptionId,
  resourceGroupName: BackupPoliciesCommonSchemas.resourceGroupName,
  accountName: BackupPoliciesCommonSchemas.accountName
});

/**
 * Update backup policy
 * PATCH /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/backupPolicies/{backupPolicyName}
 */
const BackupPoliciesUpdateSchema = z.object({
  subscriptionId: BackupPoliciesCommonSchemas.subscriptionId,
  resourceGroupName: BackupPoliciesCommonSchemas.resourceGroupName,
  accountName: BackupPoliciesCommonSchemas.accountName,
  backupPolicyName: BackupPoliciesCommonSchemas.backupPolicyName,
  body: z.object({
    location: BackupPoliciesCommonSchemas.location.optional(),
    tags: BackupPoliciesCommonSchemas.tags,
    properties: z.object({
      enabled: z.boolean().optional(),
      dailyBackupsToKeep: z.number().min(0).max(1019).optional(),
      weeklyBackupsToKeep: z.number().min(0).max(1019).optional(),
      monthlyBackupsToKeep: z.number().min(0).max(1019).optional(),
      yearlyBackupsToKeep: z.number().min(0).max(1019).optional()
    }).optional()
  })
});

// =============================================================================
// MCP TOOLS EXPORT
// =============================================================================

export const backupPoliciesOperationsTools: Tool[] = [
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
    description: 'Delete a backup policy (cannot delete if assigned to volumes)',
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
    description: 'Get detailed information about a specific backup policy',
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
    description: 'Update backup policy retention settings',
    inputSchema: wrapZodSchema(BackupPoliciesUpdateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_backup_policies_update is not yet implemented',
        placeholder: true
      };
    }
  }
];

// =============================================================================
// API CLIENT EXTENSION FOR BACKUP POLICIES
// =============================================================================

export interface BackupPoliciesApiMethods {
  // Create backup policy
  createBackupPolicy(params: z.infer<typeof BackupPoliciesCreateSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    location: string;
    properties: {
      enabled: boolean;
      backupPolicyId: string;
      dailyBackupsToKeep?: number;
      weeklyBackupsToKeep?: number;
      monthlyBackupsToKeep?: number;
      yearlyBackupsToKeep?: number;
      volumesAssigned?: number;
      provisioningState: string;
    };
    tags?: Record<string, string>;
  }>;

  // Delete backup policy
  deleteBackupPolicy(params: z.infer<typeof BackupPoliciesDeleteSchema>): Promise<void>;

  // Get backup policy
  getBackupPolicy(params: z.infer<typeof BackupPoliciesGetSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    location: string;
    properties: {
      enabled: boolean;
      backupPolicyId: string;
      dailyBackupsToKeep?: number;
      weeklyBackupsToKeep?: number;
      monthlyBackupsToKeep?: number;
      yearlyBackupsToKeep?: number;
      volumesAssigned?: number;
      provisioningState: string;
    };
    tags?: Record<string, string>;
  }>;

  // List backup policies
  listBackupPolicies(params: z.infer<typeof BackupPoliciesListSchema>): Promise<{
    value: Array<{
      id: string;
      name: string;
      type: string;
      location: string;
      properties: any;
    }>;
  }>;

  // Update backup policy
  updateBackupPolicy(params: z.infer<typeof BackupPoliciesUpdateSchema>): Promise<{
    id: string;
    name: string;
    properties: {
      provisioningState: string;
    };
  }>;
}

// =============================================================================
// BACKUP POLICY CONSTANTS
// =============================================================================

export const BackupPolicyProvisioningStates = {
  CREATING: 'Creating',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  DELETING: 'Deleting',
  UPDATING: 'Updating'
} as const;

export const BackupPolicyRetentionLimits = {
  MIN_BACKUPS: 0,
  MAX_BACKUPS: 1019,
  DEFAULT_DAILY: 7,
  DEFAULT_WEEKLY: 4,
  DEFAULT_MONTHLY: 3,
  DEFAULT_YEARLY: 0
} as const;