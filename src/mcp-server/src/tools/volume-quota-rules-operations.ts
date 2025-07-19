/**
 * Volume Quota Rules Operations Tools
 * 
 * Dedicated implementation for Volume Quota Rules operation group
 * Manages user and group quota rules for Azure NetApp Files volumes
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * API Version: 2025-03-01
 */

import { Tool } from '../types/tool';
import { z } from 'zod';
import { wrapZodSchema } from '../utils/zod-to-json-schema';

// Common schemas for Volume Quota Rules operations
const VolumeQuotaRulesCommonSchemas = {
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
  resourceGroupName: z.string().min(1).max(90).regex(/^[-\w\._\(\)]+$/, 'Invalid resource group name'),
  accountName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid account name'),
  poolName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid pool name'),
  volumeName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid volume name'),
  volumeQuotaRuleName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid quota rule name')
};

// =============================================================================
// VOLUME QUOTA RULES OPERATION GROUP - ALL INDIVIDUAL OPERATIONS
// =============================================================================

/**
 * Create volume quota rule
 * PUT /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/volumeQuotaRules/{volumeQuotaRuleName}
 */
const VolumeQuotaRulesCreateSchema = z.object({
  subscriptionId: VolumeQuotaRulesCommonSchemas.subscriptionId,
  resourceGroupName: VolumeQuotaRulesCommonSchemas.resourceGroupName,
  accountName: VolumeQuotaRulesCommonSchemas.accountName,
  poolName: VolumeQuotaRulesCommonSchemas.poolName,
  volumeName: VolumeQuotaRulesCommonSchemas.volumeName,
  volumeQuotaRuleName: VolumeQuotaRulesCommonSchemas.volumeQuotaRuleName,
  body: z.object({
    properties: z.object({
      quotaSizeInKiBs: z.number().min(4).max(109951162777600), // 4 KiB to 100 TiB
      quotaType: z.enum(['DefaultUserQuota', 'DefaultGroupQuota', 'IndividualUserQuota', 'IndividualGroupQuota']),
      quotaTarget: z.string().optional() // User or group name/ID for individual quotas
    })
  })
});

/**
 * Delete volume quota rule
 * DELETE /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/volumeQuotaRules/{volumeQuotaRuleName}
 */
const VolumeQuotaRulesDeleteSchema = z.object({
  subscriptionId: VolumeQuotaRulesCommonSchemas.subscriptionId,
  resourceGroupName: VolumeQuotaRulesCommonSchemas.resourceGroupName,
  accountName: VolumeQuotaRulesCommonSchemas.accountName,
  poolName: VolumeQuotaRulesCommonSchemas.poolName,
  volumeName: VolumeQuotaRulesCommonSchemas.volumeName,
  volumeQuotaRuleName: VolumeQuotaRulesCommonSchemas.volumeQuotaRuleName
});

/**
 * Get volume quota rule
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/volumeQuotaRules/{volumeQuotaRuleName}
 */
const VolumeQuotaRulesGetSchema = z.object({
  subscriptionId: VolumeQuotaRulesCommonSchemas.subscriptionId,
  resourceGroupName: VolumeQuotaRulesCommonSchemas.resourceGroupName,
  accountName: VolumeQuotaRulesCommonSchemas.accountName,
  poolName: VolumeQuotaRulesCommonSchemas.poolName,
  volumeName: VolumeQuotaRulesCommonSchemas.volumeName,
  volumeQuotaRuleName: VolumeQuotaRulesCommonSchemas.volumeQuotaRuleName
});

/**
 * List volume quota rules
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/volumeQuotaRules
 */
const VolumeQuotaRulesListSchema = z.object({
  subscriptionId: VolumeQuotaRulesCommonSchemas.subscriptionId,
  resourceGroupName: VolumeQuotaRulesCommonSchemas.resourceGroupName,
  accountName: VolumeQuotaRulesCommonSchemas.accountName,
  poolName: VolumeQuotaRulesCommonSchemas.poolName,
  volumeName: VolumeQuotaRulesCommonSchemas.volumeName
});

/**
 * Update volume quota rule
 * PATCH /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/volumeQuotaRules/{volumeQuotaRuleName}
 */
const VolumeQuotaRulesUpdateSchema = z.object({
  subscriptionId: VolumeQuotaRulesCommonSchemas.subscriptionId,
  resourceGroupName: VolumeQuotaRulesCommonSchemas.resourceGroupName,
  accountName: VolumeQuotaRulesCommonSchemas.accountName,
  poolName: VolumeQuotaRulesCommonSchemas.poolName,
  volumeName: VolumeQuotaRulesCommonSchemas.volumeName,
  volumeQuotaRuleName: VolumeQuotaRulesCommonSchemas.volumeQuotaRuleName,
  body: z.object({
    properties: z.object({
      quotaSizeInKiBs: z.number().min(4).max(109951162777600).optional()
    }).optional()
  })
});

/**
 * Get quota usage
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/volumeQuotaRules/{volumeQuotaRuleName}/usage
 */
const VolumeQuotaRulesGetUsageSchema = z.object({
  subscriptionId: VolumeQuotaRulesCommonSchemas.subscriptionId,
  resourceGroupName: VolumeQuotaRulesCommonSchemas.resourceGroupName,
  accountName: VolumeQuotaRulesCommonSchemas.accountName,
  poolName: VolumeQuotaRulesCommonSchemas.poolName,
  volumeName: VolumeQuotaRulesCommonSchemas.volumeName,
  volumeQuotaRuleName: VolumeQuotaRulesCommonSchemas.volumeQuotaRuleName
});

// =============================================================================
// MCP TOOLS EXPORT
// =============================================================================

export const volumeQuotaRulesOperationsTools: Tool[] = [
  {
    name: 'anf_volume_quota_rules_create',
    description: 'Create a user or group quota rule for a volume',
    inputSchema: wrapZodSchema(VolumeQuotaRulesCreateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volume_quota_rules_create is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volume_quota_rules_delete',
    description: 'Delete a quota rule from a volume',
    inputSchema: wrapZodSchema(VolumeQuotaRulesDeleteSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volume_quota_rules_delete is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volume_quota_rules_get',
    description: 'Get detailed information about a specific quota rule',
    inputSchema: wrapZodSchema(VolumeQuotaRulesGetSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volume_quota_rules_get is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volume_quota_rules_list',
    description: 'List all quota rules for a volume',
    inputSchema: wrapZodSchema(VolumeQuotaRulesListSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volume_quota_rules_list is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volume_quota_rules_update',
    description: 'Update quota limit for a rule',
    inputSchema: wrapZodSchema(VolumeQuotaRulesUpdateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volume_quota_rules_update is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volume_quota_rules_get_usage',
    description: 'Get current usage statistics for a quota rule',
    inputSchema: wrapZodSchema(VolumeQuotaRulesGetUsageSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volume_quota_rules_get_usage is not yet implemented',
        placeholder: true
      };
    }
  }
];

// =============================================================================
// API CLIENT EXTENSION FOR VOLUME QUOTA RULES
// =============================================================================

export interface VolumeQuotaRulesApiMethods {
  // Create quota rule
  createVolumeQuotaRule(params: z.infer<typeof VolumeQuotaRulesCreateSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    properties: {
      provisioningState: string;
      quotaSizeInKiBs: number;
      quotaType: string;
      quotaTarget?: string;
    };
  }>;

  // Delete quota rule
  deleteVolumeQuotaRule(params: z.infer<typeof VolumeQuotaRulesDeleteSchema>): Promise<void>;

  // Get quota rule
  getVolumeQuotaRule(params: z.infer<typeof VolumeQuotaRulesGetSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    properties: {
      provisioningState: string;
      quotaSizeInKiBs: number;
      quotaType: string;
      quotaTarget?: string;
    };
  }>;

  // List quota rules
  listVolumeQuotaRules(params: z.infer<typeof VolumeQuotaRulesListSchema>): Promise<{
    value: Array<{
      id: string;
      name: string;
      type: string;
      properties: any;
    }>;
    nextLink?: string;
  }>;

  // Update quota rule
  updateVolumeQuotaRule(params: z.infer<typeof VolumeQuotaRulesUpdateSchema>): Promise<{
    id: string;
    name: string;
    properties: {
      provisioningState: string;
    };
  }>;

  // Get usage
  getVolumeQuotaRuleUsage(params: z.infer<typeof VolumeQuotaRulesGetUsageSchema>): Promise<{
    quotaSizeInKiBs: number;
    usedSizeInKiBs: number;
    percentageUsed: number;
    quotaType: string;
    quotaTarget?: string;
    lastUpdated: string;
  }>;
}

// =============================================================================
// VOLUME QUOTA RULE CONSTANTS
// =============================================================================

export const VolumeQuotaRuleProvisioningStates = {
  CREATING: 'Creating',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  DELETING: 'Deleting',
  UPDATING: 'Updating'
} as const;

export const VolumeQuotaRuleTypes = {
  DEFAULT_USER_QUOTA: 'DefaultUserQuota',
  DEFAULT_GROUP_QUOTA: 'DefaultGroupQuota',
  INDIVIDUAL_USER_QUOTA: 'IndividualUserQuota',
  INDIVIDUAL_GROUP_QUOTA: 'IndividualGroupQuota'
} as const;

export const VolumeQuotaRuleLimits = {
  MIN_QUOTA_SIZE: 4,                  // 4 KiB
  MAX_QUOTA_SIZE: 109951162777600,    // 100 TiB
  DEFAULT_QUOTA_SIZE: 107374182400    // 100 GiB
} as const;