/**
 * Snapshot Policies Operations Tools
 * 
 * Dedicated implementation for Snapshot Policies operation group
 * Manages automated snapshot policy operations for Azure NetApp Files
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * API Version: 2025-03-01
 */

import { Tool } from '../types/tool';
import { z } from 'zod';
import { wrapZodSchema } from '../utils/zod-to-json-schema';

// Common schemas for Snapshot Policies operations
const SnapshotPoliciesCommonSchemas = {
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
  resourceGroupName: z.string().min(1).max(90).regex(/^[-\w\._\(\)]+$/, 'Invalid resource group name'),
  accountName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid account name'),
  snapshotPolicyName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid snapshot policy name'),
  location: z.string().min(1).max(50).regex(/^[a-zA-Z0-9\-]+$/, 'Invalid location format'),
  tags: z.record(z.string()).optional()
};

// =============================================================================
// SNAPSHOT POLICIES OPERATION GROUP - ALL INDIVIDUAL OPERATIONS
// =============================================================================

/**
 * Create snapshot policy
 * PUT /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/snapshotPolicies/{snapshotPolicyName}
 */
const SnapshotPoliciesCreateSchema = z.object({
  subscriptionId: SnapshotPoliciesCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotPoliciesCommonSchemas.resourceGroupName,
  accountName: SnapshotPoliciesCommonSchemas.accountName,
  snapshotPolicyName: SnapshotPoliciesCommonSchemas.snapshotPolicyName,
  body: z.object({
    location: SnapshotPoliciesCommonSchemas.location,
    tags: SnapshotPoliciesCommonSchemas.tags,
    properties: z.object({
      enabled: z.boolean().optional(),
      hourlySchedule: z.object({
        snapshotsToKeep: z.number().min(0).max(255).optional(),
        minute: z.number().min(0).max(59).optional(),
        usedBytes: z.number().optional()
      }).optional(),
      dailySchedule: z.object({
        snapshotsToKeep: z.number().min(0).max(255).optional(),
        hour: z.number().min(0).max(23).optional(),
        minute: z.number().min(0).max(59).optional(),
        usedBytes: z.number().optional()
      }).optional(),
      weeklySchedule: z.object({
        snapshotsToKeep: z.number().min(0).max(255).optional(),
        day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).optional(),
        hour: z.number().min(0).max(23).optional(),
        minute: z.number().min(0).max(59).optional(),
        usedBytes: z.number().optional()
      }).optional(),
      monthlySchedule: z.object({
        snapshotsToKeep: z.number().min(0).max(255).optional(),
        daysOfMonth: z.string().optional(), // comma-separated list of days
        hour: z.number().min(0).max(23).optional(),
        minute: z.number().min(0).max(59).optional(),
        usedBytes: z.number().optional()
      }).optional()
    })
  })
});

/**
 * Delete snapshot policy
 * DELETE /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/snapshotPolicies/{snapshotPolicyName}
 */
const SnapshotPoliciesDeleteSchema = z.object({
  subscriptionId: SnapshotPoliciesCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotPoliciesCommonSchemas.resourceGroupName,
  accountName: SnapshotPoliciesCommonSchemas.accountName,
  snapshotPolicyName: SnapshotPoliciesCommonSchemas.snapshotPolicyName
});

/**
 * Get snapshot policy
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/snapshotPolicies/{snapshotPolicyName}
 */
const SnapshotPoliciesGetSchema = z.object({
  subscriptionId: SnapshotPoliciesCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotPoliciesCommonSchemas.resourceGroupName,
  accountName: SnapshotPoliciesCommonSchemas.accountName,
  snapshotPolicyName: SnapshotPoliciesCommonSchemas.snapshotPolicyName
});

/**
 * List snapshot policies
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/snapshotPolicies
 */
const SnapshotPoliciesListSchema = z.object({
  subscriptionId: SnapshotPoliciesCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotPoliciesCommonSchemas.resourceGroupName,
  accountName: SnapshotPoliciesCommonSchemas.accountName
});

/**
 * Update snapshot policy
 * PATCH /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/snapshotPolicies/{snapshotPolicyName}
 */
const SnapshotPoliciesUpdateSchema = z.object({
  subscriptionId: SnapshotPoliciesCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotPoliciesCommonSchemas.resourceGroupName,
  accountName: SnapshotPoliciesCommonSchemas.accountName,
  snapshotPolicyName: SnapshotPoliciesCommonSchemas.snapshotPolicyName,
  body: z.object({
    location: SnapshotPoliciesCommonSchemas.location.optional(),
    tags: SnapshotPoliciesCommonSchemas.tags,
    properties: z.object({
      enabled: z.boolean().optional(),
      hourlySchedule: z.any().optional(),
      dailySchedule: z.any().optional(),
      weeklySchedule: z.any().optional(),
      monthlySchedule: z.any().optional()
    }).optional()
  })
});

/**
 * List volumes using policy
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/snapshotPolicies/{snapshotPolicyName}/volumes
 */
const SnapshotPoliciesListVolumesSchema = z.object({
  subscriptionId: SnapshotPoliciesCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotPoliciesCommonSchemas.resourceGroupName,
  accountName: SnapshotPoliciesCommonSchemas.accountName,
  snapshotPolicyName: SnapshotPoliciesCommonSchemas.snapshotPolicyName
});

/**
 * Assign policy to volume
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/snapshotPolicies/{snapshotPolicyName}/assignToVolume
 */
const SnapshotPoliciesAssignToVolumeSchema = z.object({
  subscriptionId: SnapshotPoliciesCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotPoliciesCommonSchemas.resourceGroupName,
  accountName: SnapshotPoliciesCommonSchemas.accountName,
  snapshotPolicyName: SnapshotPoliciesCommonSchemas.snapshotPolicyName,
  body: z.object({
    volumeId: z.string()
  })
});

/**
 * Remove policy from volume
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/snapshotPolicies/{snapshotPolicyName}/removeFromVolume
 */
const SnapshotPoliciesRemoveFromVolumeSchema = z.object({
  subscriptionId: SnapshotPoliciesCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotPoliciesCommonSchemas.resourceGroupName,
  accountName: SnapshotPoliciesCommonSchemas.accountName,
  snapshotPolicyName: SnapshotPoliciesCommonSchemas.snapshotPolicyName,
  body: z.object({
    volumeId: z.string()
  })
});

/**
 * Get policy status
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/snapshotPolicies/{snapshotPolicyName}/status
 */
const SnapshotPoliciesGetStatusSchema = z.object({
  subscriptionId: SnapshotPoliciesCommonSchemas.subscriptionId,
  resourceGroupName: SnapshotPoliciesCommonSchemas.resourceGroupName,
  accountName: SnapshotPoliciesCommonSchemas.accountName,
  snapshotPolicyName: SnapshotPoliciesCommonSchemas.snapshotPolicyName
});

// =============================================================================
// MCP TOOLS EXPORT
// =============================================================================

export const snapshotPoliciesOperationsTools: Tool[] = [
  {
    name: 'anf_snapshot_policies_create',
    description: 'Create an automated snapshot policy with hourly, daily, weekly, and monthly schedules',
    inputSchema: wrapZodSchema(SnapshotPoliciesCreateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_snapshot_policies_create is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_snapshot_policies_delete',
    description: 'Delete a snapshot policy (cannot delete if assigned to volumes)',
    inputSchema: wrapZodSchema(SnapshotPoliciesDeleteSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_snapshot_policies_delete is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_snapshot_policies_get',
    description: 'Get detailed information about a specific snapshot policy',
    inputSchema: wrapZodSchema(SnapshotPoliciesGetSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_snapshot_policies_get is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_snapshot_policies_list',
    description: 'List all snapshot policies in a NetApp account',
    inputSchema: wrapZodSchema(SnapshotPoliciesListSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_snapshot_policies_list is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_snapshot_policies_update',
    description: 'Update snapshot policy schedules and retention settings',
    inputSchema: wrapZodSchema(SnapshotPoliciesUpdateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_snapshot_policies_update is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_snapshot_policies_list_volumes',
    description: 'List all volumes using a specific snapshot policy',
    inputSchema: wrapZodSchema(SnapshotPoliciesListVolumesSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_snapshot_policies_list_volumes is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_snapshot_policies_assign_to_volume',
    description: 'Assign a snapshot policy to a volume',
    inputSchema: wrapZodSchema(SnapshotPoliciesAssignToVolumeSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_snapshot_policies_assign_to_volume is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_snapshot_policies_remove_from_volume',
    description: 'Remove a snapshot policy from a volume',
    inputSchema: wrapZodSchema(SnapshotPoliciesRemoveFromVolumeSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_snapshot_policies_remove_from_volume is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_snapshot_policies_get_status',
    description: 'Get the execution status of a snapshot policy',
    inputSchema: wrapZodSchema(SnapshotPoliciesGetStatusSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_snapshot_policies_get_status is not yet implemented',
        placeholder: true
      };
    }
  }
];

// =============================================================================
// API CLIENT EXTENSION FOR SNAPSHOT POLICIES
// =============================================================================

export interface SnapshotPoliciesApiMethods {
  // Create snapshot policy
  createSnapshotPolicy(params: z.infer<typeof SnapshotPoliciesCreateSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    location: string;
    properties: {
      enabled: boolean;
      policyId: string;
      hourlySchedule?: any;
      dailySchedule?: any;
      weeklySchedule?: any;
      monthlySchedule?: any;
      provisioningState: string;
    };
    tags?: Record<string, string>;
  }>;

  // Delete snapshot policy
  deleteSnapshotPolicy(params: z.infer<typeof SnapshotPoliciesDeleteSchema>): Promise<void>;

  // Get snapshot policy
  getSnapshotPolicy(params: z.infer<typeof SnapshotPoliciesGetSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    location: string;
    properties: any;
    tags?: Record<string, string>;
  }>;

  // List snapshot policies
  listSnapshotPolicies(params: z.infer<typeof SnapshotPoliciesListSchema>): Promise<{
    value: Array<{
      id: string;
      name: string;
      type: string;
      location: string;
      properties: any;
    }>;
  }>;

  // Update snapshot policy
  updateSnapshotPolicy(params: z.infer<typeof SnapshotPoliciesUpdateSchema>): Promise<{
    id: string;
    name: string;
    properties: {
      provisioningState: string;
    };
  }>;

  // List volumes
  listVolumesUsingPolicy(params: z.infer<typeof SnapshotPoliciesListVolumesSchema>): Promise<{
    value: Array<{
      volumeId: string;
      volumeName: string;
      poolName: string;
    }>;
  }>;

  // Assign to volume
  assignToVolume(params: z.infer<typeof SnapshotPoliciesAssignToVolumeSchema>): Promise<{
    message: string;
    operationId: string;
  }>;

  // Remove from volume
  removeFromVolume(params: z.infer<typeof SnapshotPoliciesRemoveFromVolumeSchema>): Promise<{
    message: string;
    operationId: string;
  }>;

  // Get status
  getSnapshotPolicyStatus(params: z.infer<typeof SnapshotPoliciesGetStatusSchema>): Promise<{
    executionStatus: string;
    lastExecutionTime?: string;
    nextExecutionTime?: string;
    volumeCount: number;
    totalSnapshotsCreated: number;
    totalSnapshotsDeleted: number;
  }>;
}

// =============================================================================
// SNAPSHOT POLICY CONSTANTS
// =============================================================================

export const SnapshotPolicyProvisioningStates = {
  CREATING: 'Creating',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  DELETING: 'Deleting',
  UPDATING: 'Updating'
} as const;

export const SnapshotPolicyDaysOfWeek = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday'
} as const;

export const SnapshotPolicyLimits = {
  MIN_SNAPSHOTS: 0,
  MAX_SNAPSHOTS: 255,
  MAX_HOURLY_SCHEDULES: 4,
  MAX_DAILY_SCHEDULES: 1,
  MAX_WEEKLY_SCHEDULES: 1,
  MAX_MONTHLY_SCHEDULES: 1
} as const;