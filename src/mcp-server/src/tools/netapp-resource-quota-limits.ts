/**
 * NetApp Resource Quota Limits Operations Tools
 * 
 * Dedicated implementation for NetApp Resource Quota Limits operation group
 * Provides detailed quota and limits information for Azure NetApp Files resources
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * API Version: 2025-03-01
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Common schemas for NetApp Resource Quota Limits operations
const NetAppResourceQuotaLimitsCommonSchemas = {
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
  location: z.string().min(1).max(50).regex(/^[a-zA-Z0-9\-]+$/, 'Invalid location format'),
};

// =============================================================================
// NETAPP RESOURCE QUOTA LIMITS OPERATION GROUP
// =============================================================================

/**
 * List quota limits for NetApp resources in a specific location
 * GET /subscriptions/{subscriptionId}/providers/Microsoft.NetApp/locations/{location}/quotaLimits
 */
const NetAppResourceQuotaLimitsListSchema = z.object({
  subscriptionId: NetAppResourceQuotaLimitsCommonSchemas.subscriptionId,
  location: NetAppResourceQuotaLimitsCommonSchemas.location
});

/**
 * Get specific quota limit by name for NetApp resources in a location
 * GET /subscriptions/{subscriptionId}/providers/Microsoft.NetApp/locations/{location}/quotaLimits/{quotaLimitName}
 */
const NetAppResourceQuotaLimitsGetSchema = z.object({
  subscriptionId: NetAppResourceQuotaLimitsCommonSchemas.subscriptionId,
  location: NetAppResourceQuotaLimitsCommonSchemas.location,
  quotaLimitName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9\-_]+$/, 'Invalid quota limit name')
});

/**
 * Check quota limit availability for a specific resource type
 * POST /subscriptions/{subscriptionId}/providers/Microsoft.NetApp/locations/{location}/checkQuotaAvailability
 */
const NetAppResourceQuotaLimitsCheckAvailabilitySchema = z.object({
  subscriptionId: NetAppResourceQuotaLimitsCommonSchemas.subscriptionId,
  location: NetAppResourceQuotaLimitsCommonSchemas.location,
  body: z.object({
    name: z.string().min(1),
    type: z.enum([
      'Microsoft.NetApp/netAppAccounts',
      'Microsoft.NetApp/netAppAccounts/capacityPools',
      'Microsoft.NetApp/netAppAccounts/capacityPools/volumes',
      'Microsoft.NetApp/netAppAccounts/capacityPools/volumes/snapshots',
      'Microsoft.NetApp/netAppAccounts/snapshotPolicies',
      'Microsoft.NetApp/netAppAccounts/backupPolicies',
      'Microsoft.NetApp/netAppAccounts/backupVaults'
    ]),
    resourceGroup: z.string().min(1).max(90)
  })
});

/**
 * Get quota usage statistics for NetApp resources
 * GET /subscriptions/{subscriptionId}/providers/Microsoft.NetApp/locations/{location}/quotaUsage
 */
const NetAppResourceQuotaLimitsUsageSchema = z.object({
  subscriptionId: NetAppResourceQuotaLimitsCommonSchemas.subscriptionId,
  location: NetAppResourceQuotaLimitsCommonSchemas.location,
  resourceType: z.enum([
    'netAppAccounts',
    'capacityPools',
    'volumes',
    'snapshots',
    'snapshotPolicies',
    'backupPolicies',
    'backupVaults'
  ]).optional()
});

/**
 * Request quota limit increase for NetApp resources
 * POST /subscriptions/{subscriptionId}/providers/Microsoft.NetApp/locations/{location}/requestQuotaIncrease
 */
const NetAppResourceQuotaLimitsRequestIncreaseSchema = z.object({
  subscriptionId: NetAppResourceQuotaLimitsCommonSchemas.subscriptionId,
  location: NetAppResourceQuotaLimitsCommonSchemas.location,
  body: z.object({
    resourceType: z.enum([
      'Microsoft.NetApp/netAppAccounts',
      'Microsoft.NetApp/netAppAccounts/capacityPools',
      'Microsoft.NetApp/netAppAccounts/capacityPools/volumes',
      'Microsoft.NetApp/netAppAccounts/capacityPools/volumes/snapshots'
    ]),
    requestedLimit: z.number().int().min(1),
    currentLimit: z.number().int().min(0),
    justification: z.string().min(10).max(500),
    contactInfo: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional()
    })
  })
});

/**
 * Get quota limit details by resource type
 * GET /subscriptions/{subscriptionId}/providers/Microsoft.NetApp/locations/{location}/quotaLimits/byResourceType/{resourceType}
 */
const NetAppResourceQuotaLimitsByResourceTypeSchema = z.object({
  subscriptionId: NetAppResourceQuotaLimitsCommonSchemas.subscriptionId,
  location: NetAppResourceQuotaLimitsCommonSchemas.location,
  resourceType: z.enum([
    'netAppAccounts',
    'capacityPools', 
    'volumes',
    'snapshots',
    'snapshotPolicies',
    'backupPolicies',
    'backupVaults',
    'volumeGroups',
    'subvolumes'
  ])
});

// =============================================================================
// MCP TOOLS EXPORT
// =============================================================================

export const netAppResourceQuotaLimitsTools: Tool[] = [
  {
    name: 'anf_netapp_resource_quota_limits_list',
    description: 'List all quota limits for NetApp resources in a specific Azure region/location',
    inputSchema: NetAppResourceQuotaLimitsListSchema
  },
  {
    name: 'anf_netapp_resource_quota_limits_get',
    description: 'Get specific quota limit details by quota limit name for NetApp resources',
    inputSchema: NetAppResourceQuotaLimitsGetSchema
  },
  {
    name: 'anf_netapp_resource_quota_limits_check_availability',
    description: 'Check if a specific resource name is available within quota limits',
    inputSchema: NetAppResourceQuotaLimitsCheckAvailabilitySchema
  },
  {
    name: 'anf_netapp_resource_quota_limits_usage',
    description: 'Get current quota usage statistics for NetApp resources in a region',
    inputSchema: NetAppResourceQuotaLimitsUsageSchema
  },
  {
    name: 'anf_netapp_resource_quota_limits_request_increase',
    description: 'Submit a request to increase quota limits for NetApp resources',
    inputSchema: NetAppResourceQuotaLimitsRequestIncreaseSchema
  },
  {
    name: 'anf_netapp_resource_quota_limits_by_resource_type',
    description: 'Get quota limit details filtered by specific resource type',
    inputSchema: NetAppResourceQuotaLimitsByResourceTypeSchema
  }
];

// =============================================================================
// API CLIENT EXTENSION FOR NETAPP RESOURCE QUOTA LIMITS
// =============================================================================

export interface NetAppResourceQuotaLimitsApiMethods {
  // List all quota limits in a location
  listNetAppResourceQuotaLimits(params: z.infer<typeof NetAppResourceQuotaLimitsListSchema>): Promise<{
    value: Array<{
      id: string;
      name: string;
      type: string;
      properties: {
        resourceType: string;
        currentValue: number;
        limit: number;
        unit: string;
        description: string;
      };
    }>;
  }>;

  // Get specific quota limit
  getNetAppResourceQuotaLimit(params: z.infer<typeof NetAppResourceQuotaLimitsGetSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    properties: {
      resourceType: string;
      currentValue: number;
      limit: number;
      unit: string;
      description: string;
      lastUpdated: string;
    };
  }>;

  // Check quota availability
  checkNetAppResourceQuotaAvailability(params: z.infer<typeof NetAppResourceQuotaLimitsCheckAvailabilitySchema>): Promise<{
    nameAvailable: boolean;
    reason?: string;
    message?: string;
    quotaAvailable: boolean;
    remainingQuota: number;
  }>;

  // Get quota usage
  getNetAppResourceQuotaUsage(params: z.infer<typeof NetAppResourceQuotaLimitsUsageSchema>): Promise<{
    value: Array<{
      resourceType: string;
      currentValue: number;
      limit: number;
      unit: string;
      utilizationPercentage: number;
    }>;
  }>;

  // Request quota increase
  requestNetAppResourceQuotaIncrease(params: z.infer<typeof NetAppResourceQuotaLimitsRequestIncreaseSchema>): Promise<{
    id: string;
    status: 'Submitted' | 'InReview' | 'Approved' | 'Rejected';
    requestedLimit: number;
    currentLimit: number;
    submittedAt: string;
    ticketNumber?: string;
  }>;

  // Get quota limits by resource type
  getNetAppResourceQuotaLimitsByResourceType(params: z.infer<typeof NetAppResourceQuotaLimitsByResourceTypeSchema>): Promise<{
    resourceType: string;
    quotaLimits: Array<{
      name: string;
      currentValue: number;
      limit: number;
      unit: string;
      description: string;
    }>;
  }>;
}

// =============================================================================
// QUOTA LIMIT TYPES AND CONSTANTS
// =============================================================================

export const NetAppResourceQuotaLimitTypes = {
  ACCOUNTS_PER_SUBSCRIPTION: 'netAppAccountsPerSubscription',
  POOLS_PER_ACCOUNT: 'capacityPoolsPerAccount', 
  VOLUMES_PER_POOL: 'volumesPerCapacityPool',
  SNAPSHOTS_PER_VOLUME: 'snapshotsPerVolume',
  SNAPSHOT_POLICIES_PER_ACCOUNT: 'snapshotPoliciesPerAccount',
  BACKUP_POLICIES_PER_ACCOUNT: 'backupPoliciesPerAccount',
  BACKUP_VAULTS_PER_ACCOUNT: 'backupVaultsPerAccount',
  VOLUME_GROUPS_PER_ACCOUNT: 'volumeGroupsPerAccount',
  SUBVOLUMES_PER_VOLUME: 'subvolumesPerVolume',
  TOTAL_CAPACITY_PER_SUBSCRIPTION: 'totalCapacityPerSubscription',
  VOLUMES_PER_SUBSCRIPTION: 'volumesPerSubscription'
} as const;

export const NetAppResourceQuotaLimitUnits = {
  COUNT: 'Count',
  BYTES: 'Bytes',
  TEBIBYTES: 'TiB',
  PERCENTAGE: 'Percent'
} as const;