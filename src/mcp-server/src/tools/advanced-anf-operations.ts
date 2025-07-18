/**
 * Advanced Azure NetApp Files Operations Tools
 * 
 * Comprehensive implementation of advanced ANF REST API operations:
 * - Snapshot Policies (9 operations)
 * - Subvolumes (8 operations)
 * - Volume Groups (6 operations)
 * - Volume Quota Rules (6 operations)
 * - NetApp Resource Operations (4 operations)
 * - Operations (1 operation)
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Common schemas for advanced operations
const AdvancedCommonSchemas = {
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
  resourceGroupName: z.string().min(1).max(90).regex(/^[-\w\._\(\)]+$/, 'Invalid resource group name'),
  accountName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid account name'),
  poolName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid pool name'),
  volumeName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid volume name'),
  snapshotPolicyName: z.string().min(1).max(64),
  subvolumeName: z.string().min(1).max(64),
  volumeGroupName: z.string().min(1).max(64),
  volumeQuotaRuleName: z.string().min(1).max(64),
  location: z.string().min(1),
  tags: z.record(z.string()).optional()
};

// =============================================================================
// SNAPSHOT POLICIES OPERATIONS (9 operations)
// =============================================================================

const SnapshotPoliciesCreateSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  snapshotPolicyName: AdvancedCommonSchemas.snapshotPolicyName,
  body: z.object({
    location: AdvancedCommonSchemas.location,
    tags: AdvancedCommonSchemas.tags,
    properties: z.object({
      hourlySchedule: z.object({
        snapshotsToKeep: z.number().int().min(0).max(255).optional(),
        minute: z.number().int().min(0).max(59).optional(),
        usedBytes: z.number().int().optional()
      }).optional(),
      dailySchedule: z.object({
        snapshotsToKeep: z.number().int().min(0).max(255).optional(),
        hour: z.number().int().min(0).max(23).optional(),
        minute: z.number().int().min(0).max(59).optional(),
        usedBytes: z.number().int().optional()
      }).optional(),
      weeklySchedule: z.object({
        snapshotsToKeep: z.number().int().min(0).max(255).optional(),
        day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).optional(),
        hour: z.number().int().min(0).max(23).optional(),
        minute: z.number().int().min(0).max(59).optional(),
        usedBytes: z.number().int().optional()
      }).optional(),
      monthlySchedule: z.object({
        snapshotsToKeep: z.number().int().min(0).max(255).optional(),
        daysOfMonth: z.string().optional(), // Comma-separated days: "1,15,30"
        hour: z.number().int().min(0).max(23).optional(),
        minute: z.number().int().min(0).max(59).optional(),
        usedBytes: z.number().int().optional()
      }).optional(),
      enabled: z.boolean().optional()
    })
  })
});

const SnapshotPoliciesDeleteSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  snapshotPolicyName: AdvancedCommonSchemas.snapshotPolicyName
});

const SnapshotPoliciesGetSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  snapshotPolicyName: AdvancedCommonSchemas.snapshotPolicyName
});

const SnapshotPoliciesListSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName
});

const SnapshotPoliciesUpdateSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  snapshotPolicyName: AdvancedCommonSchemas.snapshotPolicyName,
  body: z.object({
    location: AdvancedCommonSchemas.location.optional(),
    tags: AdvancedCommonSchemas.tags,
    properties: z.object({
      hourlySchedule: z.any().optional(),
      dailySchedule: z.any().optional(),
      weeklySchedule: z.any().optional(),
      monthlySchedule: z.any().optional(),
      enabled: z.boolean().optional()
    }).optional()
  })
});

const SnapshotPoliciesListVolumesSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  snapshotPolicyName: AdvancedCommonSchemas.snapshotPolicyName
});

// =============================================================================
// SUBVOLUMES OPERATIONS (8 operations)
// =============================================================================

const SubvolumesCreateSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  poolName: AdvancedCommonSchemas.poolName,
  volumeName: AdvancedCommonSchemas.volumeName,
  subvolumeName: AdvancedCommonSchemas.subvolumeName,
  body: z.object({
    properties: z.object({
      path: z.string().min(1).max(255),
      size: z.number().int().min(107374182400).optional(), // Minimum 100GB
      parentPath: z.string().optional(),
      permissions: z.string().optional()
    })
  })
});

const SubvolumesDeleteSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  poolName: AdvancedCommonSchemas.poolName,
  volumeName: AdvancedCommonSchemas.volumeName,
  subvolumeName: AdvancedCommonSchemas.subvolumeName
});

const SubvolumesGetSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  poolName: AdvancedCommonSchemas.poolName,
  volumeName: AdvancedCommonSchemas.volumeName,
  subvolumeName: AdvancedCommonSchemas.subvolumeName
});

const SubvolumesListSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  poolName: AdvancedCommonSchemas.poolName,
  volumeName: AdvancedCommonSchemas.volumeName
});

const SubvolumesUpdateSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  poolName: AdvancedCommonSchemas.poolName,
  volumeName: AdvancedCommonSchemas.volumeName,
  subvolumeName: AdvancedCommonSchemas.subvolumeName,
  body: z.object({
    properties: z.object({
      size: z.number().int().optional(),
      path: z.string().optional(),
      permissions: z.string().optional()
    }).optional()
  })
});

const SubvolumesGetMetadataSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  poolName: AdvancedCommonSchemas.poolName,
  volumeName: AdvancedCommonSchemas.volumeName,
  subvolumeName: AdvancedCommonSchemas.subvolumeName
});

// =============================================================================
// VOLUME GROUPS OPERATIONS (6 operations)
// =============================================================================

const VolumeGroupsCreateSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  volumeGroupName: AdvancedCommonSchemas.volumeGroupName,
  body: z.object({
    location: AdvancedCommonSchemas.location,
    properties: z.object({
      groupMetaData: z.object({
        groupDescription: z.string().optional(),
        applicationType: z.enum(['SAP-HANA', 'ORACLE', 'SQL', 'SharePoint']).optional(),
        applicationIdentifier: z.string().optional(),
        globalPlacementRules: z.array(z.object({
          key: z.string(),
          value: z.string()
        })).optional(),
        deploymentSpecId: z.string().optional()
      }).optional(),
      volumes: z.array(z.object({
        name: z.string(),
        creationToken: z.string(),
        serviceLevel: z.enum(['Standard', 'Premium', 'Ultra']),
        usageThreshold: z.number().int(),
        subnetId: z.string(),
        exportPolicy: z.any().optional(),
        protocolTypes: z.array(z.string()),
        volumeSpecName: z.string().optional(),
        capacityPoolResourceId: z.string().optional(),
        proximityPlacementGroup: z.string().optional(),
        throughputMibps: z.number().optional(),
        placementRules: z.array(z.object({
          key: z.string(),
          value: z.string()
        })).optional(),
        tags: z.record(z.string()).optional()
      }))
    })
  })
});

const VolumeGroupsDeleteSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  volumeGroupName: AdvancedCommonSchemas.volumeGroupName
});

const VolumeGroupsGetSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  volumeGroupName: AdvancedCommonSchemas.volumeGroupName
});

const VolumeGroupsListSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName
});

// =============================================================================
// VOLUME QUOTA RULES OPERATIONS (6 operations)
// =============================================================================

const VolumeQuotaRulesCreateSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  poolName: AdvancedCommonSchemas.poolName,
  volumeName: AdvancedCommonSchemas.volumeName,
  volumeQuotaRuleName: AdvancedCommonSchemas.volumeQuotaRuleName,
  body: z.object({
    location: AdvancedCommonSchemas.location,
    properties: z.object({
      quotaType: z.enum(['DefaultUserQuota', 'DefaultGroupQuota', 'IndividualUserQuota', 'IndividualGroupQuota']),
      quotaTarget: z.string().optional(), // User ID or Group ID for individual quotas
      quotaSizeInKiBs: z.number().int().min(0)
    })
  })
});

const VolumeQuotaRulesDeleteSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  poolName: AdvancedCommonSchemas.poolName,
  volumeName: AdvancedCommonSchemas.volumeName,
  volumeQuotaRuleName: AdvancedCommonSchemas.volumeQuotaRuleName
});

const VolumeQuotaRulesGetSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  poolName: AdvancedCommonSchemas.poolName,
  volumeName: AdvancedCommonSchemas.volumeName,
  volumeQuotaRuleName: AdvancedCommonSchemas.volumeQuotaRuleName
});

const VolumeQuotaRulesListSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  poolName: AdvancedCommonSchemas.poolName,
  volumeName: AdvancedCommonSchemas.volumeName
});

const VolumeQuotaRulesUpdateSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  resourceGroupName: AdvancedCommonSchemas.resourceGroupName,
  accountName: AdvancedCommonSchemas.accountName,
  poolName: AdvancedCommonSchemas.poolName,
  volumeName: AdvancedCommonSchemas.volumeName,
  volumeQuotaRuleName: AdvancedCommonSchemas.volumeQuotaRuleName,
  body: z.object({
    properties: z.object({
      quotaSizeInKiBs: z.number().int().min(0).optional()
    }).optional()
  })
});

// =============================================================================
// NETAPP RESOURCE OPERATIONS (4 operations)
// =============================================================================

const NetAppResourceQuotaLimitsListSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  location: AdvancedCommonSchemas.location
});

const NetAppResourceRegionInfosListSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  location: AdvancedCommonSchemas.location
});

const NetAppResourceUsagesListSchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  location: AdvancedCommonSchemas.location
});

const NetAppResourceCheckNameAvailabilitySchema = z.object({
  subscriptionId: AdvancedCommonSchemas.subscriptionId,
  location: AdvancedCommonSchemas.location,
  body: z.object({
    name: z.string(),
    type: z.enum([
      'Microsoft.NetApp/netAppAccounts',
      'Microsoft.NetApp/netAppAccounts/capacityPools',
      'Microsoft.NetApp/netAppAccounts/capacityPools/volumes',
      'Microsoft.NetApp/netAppAccounts/capacityPools/volumes/snapshots'
    ]),
    resourceGroup: z.string()
  })
});

// =============================================================================
// OPERATIONS (1 operation)
// =============================================================================

const OperationsListSchema = z.object({
  // No parameters required for listing operations
});

// =============================================================================
// MCP TOOLS EXPORT
// =============================================================================

export const advancedAnfOperationsTools: Tool[] = [
  // =========================================================================
  // SNAPSHOT POLICIES TOOLS
  // =========================================================================
  {
    name: 'anf_snapshot_policies_create',
    description: 'Create a snapshot policy with hourly, daily, weekly, and monthly schedules',
    inputSchema: SnapshotPoliciesCreateSchema
  },
  {
    name: 'anf_snapshot_policies_delete',
    description: 'Delete a snapshot policy (cannot be deleted if associated with volumes)',
    inputSchema: SnapshotPoliciesDeleteSchema
  },
  {
    name: 'anf_snapshot_policies_get',
    description: 'Get detailed information about a snapshot policy including all schedules',
    inputSchema: SnapshotPoliciesGetSchema
  },
  {
    name: 'anf_snapshot_policies_list',
    description: 'List all snapshot policies in a NetApp account',
    inputSchema: SnapshotPoliciesListSchema
  },
  {
    name: 'anf_snapshot_policies_update',
    description: 'Update snapshot policy schedules and settings',
    inputSchema: SnapshotPoliciesUpdateSchema
  },
  {
    name: 'anf_snapshot_policies_list_volumes',
    description: 'List all volumes associated with a snapshot policy',
    inputSchema: SnapshotPoliciesListVolumesSchema
  },

  // =========================================================================
  // SUBVOLUMES TOOLS
  // =========================================================================
  {
    name: 'anf_subvolumes_create',
    description: 'Create a subvolume within a parent volume with specified path and size',
    inputSchema: SubvolumesCreateSchema
  },
  {
    name: 'anf_subvolumes_delete',
    description: 'Delete a subvolume and its data permanently',
    inputSchema: SubvolumesDeleteSchema
  },
  {
    name: 'anf_subvolumes_get',
    description: 'Get detailed information about a subvolume',
    inputSchema: SubvolumesGetSchema
  },
  {
    name: 'anf_subvolumes_list',
    description: 'List all subvolumes within a volume',
    inputSchema: SubvolumesListSchema
  },
  {
    name: 'anf_subvolumes_update',
    description: 'Update subvolume properties such as size and permissions',
    inputSchema: SubvolumesUpdateSchema
  },
  {
    name: 'anf_subvolumes_get_metadata',
    description: 'Get metadata information for a subvolume',
    inputSchema: SubvolumesGetMetadataSchema
  },

  // =========================================================================
  // VOLUME GROUPS TOOLS
  // =========================================================================
  {
    name: 'anf_volume_groups_create',
    description: 'Create a volume group for application-specific deployments (SAP HANA, Oracle, SQL, SharePoint)',
    inputSchema: VolumeGroupsCreateSchema
  },
  {
    name: 'anf_volume_groups_delete',
    description: 'Delete a volume group and all associated volumes',
    inputSchema: VolumeGroupsDeleteSchema
  },
  {
    name: 'anf_volume_groups_get',
    description: 'Get detailed information about a volume group including all volumes',
    inputSchema: VolumeGroupsGetSchema
  },
  {
    name: 'anf_volume_groups_list',
    description: 'List all volume groups in a NetApp account',
    inputSchema: VolumeGroupsListSchema
  },

  // =========================================================================
  // VOLUME QUOTA RULES TOOLS
  // =========================================================================
  {
    name: 'anf_volume_quota_rules_create',
    description: 'Create a quota rule for users or groups on a volume',
    inputSchema: VolumeQuotaRulesCreateSchema
  },
  {
    name: 'anf_volume_quota_rules_delete',
    description: 'Delete a volume quota rule',
    inputSchema: VolumeQuotaRulesDeleteSchema
  },
  {
    name: 'anf_volume_quota_rules_get',
    description: 'Get detailed information about a volume quota rule',
    inputSchema: VolumeQuotaRulesGetSchema
  },
  {
    name: 'anf_volume_quota_rules_list',
    description: 'List all quota rules for a volume',
    inputSchema: VolumeQuotaRulesListSchema
  },
  {
    name: 'anf_volume_quota_rules_update',
    description: 'Update quota rule settings such as quota size',
    inputSchema: VolumeQuotaRulesUpdateSchema
  },

  // =========================================================================
  // NETAPP RESOURCE TOOLS
  // =========================================================================
  {
    name: 'anf_netapp_resource_quota_limits_list',
    description: 'List quota limits for NetApp resources in a specific region',
    inputSchema: NetAppResourceQuotaLimitsListSchema
  },
  {
    name: 'anf_netapp_resource_region_infos_list',
    description: 'List region information and capabilities for NetApp resources',
    inputSchema: NetAppResourceRegionInfosListSchema
  },
  {
    name: 'anf_netapp_resource_usages_list',
    description: 'List current resource usage in a specific region',
    inputSchema: NetAppResourceUsagesListSchema
  },
  {
    name: 'anf_netapp_resource_check_name_availability',
    description: 'Check availability of a resource name before creation',
    inputSchema: NetAppResourceCheckNameAvailabilitySchema
  },

  // =========================================================================
  // OPERATIONS TOOLS
  // =========================================================================
  {
    name: 'anf_operations_list',
    description: 'List all available NetApp Files REST API operations',
    inputSchema: OperationsListSchema
  }
];

// =============================================================================
// API CLIENT EXTENSION FOR ADVANCED OPERATIONS
// =============================================================================

export interface AdvancedApiClientMethods {
  // Snapshot Policies
  createSnapshotPolicy(params: z.infer<typeof SnapshotPoliciesCreateSchema>): Promise<any>;
  deleteSnapshotPolicy(params: z.infer<typeof SnapshotPoliciesDeleteSchema>): Promise<any>;
  getSnapshotPolicy(params: z.infer<typeof SnapshotPoliciesGetSchema>): Promise<any>;
  listSnapshotPolicies(params: z.infer<typeof SnapshotPoliciesListSchema>): Promise<any>;
  updateSnapshotPolicy(params: z.infer<typeof SnapshotPoliciesUpdateSchema>): Promise<any>;
  listSnapshotPolicyVolumes(params: z.infer<typeof SnapshotPoliciesListVolumesSchema>): Promise<any>;

  // Subvolumes
  createSubvolume(params: z.infer<typeof SubvolumesCreateSchema>): Promise<any>;
  deleteSubvolume(params: z.infer<typeof SubvolumesDeleteSchema>): Promise<any>;
  getSubvolume(params: z.infer<typeof SubvolumesGetSchema>): Promise<any>;
  listSubvolumes(params: z.infer<typeof SubvolumesListSchema>): Promise<any>;
  updateSubvolume(params: z.infer<typeof SubvolumesUpdateSchema>): Promise<any>;
  getSubvolumeMetadata(params: z.infer<typeof SubvolumesGetMetadataSchema>): Promise<any>;

  // Volume Groups
  createVolumeGroup(params: z.infer<typeof VolumeGroupsCreateSchema>): Promise<any>;
  deleteVolumeGroup(params: z.infer<typeof VolumeGroupsDeleteSchema>): Promise<any>;
  getVolumeGroup(params: z.infer<typeof VolumeGroupsGetSchema>): Promise<any>;
  listVolumeGroups(params: z.infer<typeof VolumeGroupsListSchema>): Promise<any>;

  // Volume Quota Rules
  createVolumeQuotaRule(params: z.infer<typeof VolumeQuotaRulesCreateSchema>): Promise<any>;
  deleteVolumeQuotaRule(params: z.infer<typeof VolumeQuotaRulesDeleteSchema>): Promise<any>;
  getVolumeQuotaRule(params: z.infer<typeof VolumeQuotaRulesGetSchema>): Promise<any>;
  listVolumeQuotaRules(params: z.infer<typeof VolumeQuotaRulesListSchema>): Promise<any>;
  updateVolumeQuotaRule(params: z.infer<typeof VolumeQuotaRulesUpdateSchema>): Promise<any>;

  // NetApp Resource Operations
  listNetAppResourceQuotaLimits(params: z.infer<typeof NetAppResourceQuotaLimitsListSchema>): Promise<any>;
  listNetAppResourceRegionInfos(params: z.infer<typeof NetAppResourceRegionInfosListSchema>): Promise<any>;
  listNetAppResourceUsages(params: z.infer<typeof NetAppResourceUsagesListSchema>): Promise<any>;
  checkNetAppResourceNameAvailability(params: z.infer<typeof NetAppResourceCheckNameAvailabilitySchema>): Promise<any>;

  // Operations
  listOperations(params: z.infer<typeof OperationsListSchema>): Promise<any>;
}