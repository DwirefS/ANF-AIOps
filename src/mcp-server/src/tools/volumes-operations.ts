/**
 * Volumes Operations Tools
 * 
 * Comprehensive implementation for Volumes operation group
 * Manages all volume-related operations for Azure NetApp Files
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * API Version: 2025-03-01
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Common schemas for Volumes operations
const VolumesCommonSchemas = {
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
  resourceGroupName: z.string().min(1).max(90).regex(/^[-\w\._\(\)]+$/, 'Invalid resource group name'),
  accountName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid account name'),
  poolName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid pool name'),
  volumeName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid volume name'),
  location: z.string().min(1).max(50).regex(/^[a-zA-Z0-9\-]+$/, 'Invalid location format'),
  tags: z.record(z.string()).optional()
};

// =============================================================================
// VOLUMES OPERATION GROUP - ALL 26 INDIVIDUAL OPERATIONS
// =============================================================================

/**
 * 1. Create or update volume
 * PUT /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}
 */
const VolumesCreateOrUpdateSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName,
  body: z.object({
    location: VolumesCommonSchemas.location,
    tags: VolumesCommonSchemas.tags,
    properties: z.object({
      creationToken: z.string().min(1).max(80),
      usageThreshold: z.number().min(107374182400).max(109951162777600), // 100 GiB to 100 TiB
      exportPolicy: z.object({
        rules: z.array(z.object({
          ruleIndex: z.number(),
          unixReadOnly: z.boolean().optional(),
          unixReadWrite: z.boolean().optional(),
          kerberos5ReadOnly: z.boolean().optional(),
          kerberos5ReadWrite: z.boolean().optional(),
          kerberos5iReadOnly: z.boolean().optional(),
          kerberos5iReadWrite: z.boolean().optional(),
          kerberos5pReadOnly: z.boolean().optional(),
          kerberos5pReadWrite: z.boolean().optional(),
          cifs: z.boolean().optional(),
          nfsv3: z.boolean().optional(),
          nfsv41: z.boolean().optional(),
          allowedClients: z.string(),
          hasRootAccess: z.boolean().optional(),
          chownMode: z.enum(['Restricted', 'Unrestricted']).optional()
        }))
      }).optional(),
      protocolTypes: z.array(z.enum(['NFSv3', 'NFSv4.1', 'CIFS'])).optional(),
      subnetId: z.string(),
      networkFeatures: z.enum(['Basic', 'Standard', 'StandardWithEnforcement']).optional(),
      encryptionKeySource: z.enum(['Microsoft.NetApp', 'Microsoft.KeyVault']).optional(),
      volumeType: z.enum(['DataProtection', 'Normal']).optional(),
      dataProtection: z.object({
        replication: z.object({
          remoteVolumeResourceId: z.string(),
          replicationSchedule: z.enum(['_10minutely', 'hourly', 'daily'])
        }).optional(),
        snapshot: z.object({
          snapshotPolicyId: z.string()
        }).optional(),
        backup: z.object({
          vaultId: z.string(),
          backupEnabled: z.boolean(),
          policyEnforced: z.boolean().optional(),
          backupPolicyId: z.string().optional()
        }).optional()
      }).optional(),
      isRestoring: z.boolean().optional(),
      snapshotDirectoryVisible: z.boolean().optional(),
      kerberosEnabled: z.boolean().optional(),
      securityStyle: z.enum(['unix', 'ntfs']).optional(),
      smbEncryption: z.boolean().optional(),
      smbAccessBasedEnumeration: z.enum(['Disabled', 'Enabled']).optional(),
      smbNonBrowsable: z.enum(['Disabled', 'Enabled']).optional(),
      throughputMibps: z.number().optional(),
      actualThroughputMibps: z.number().optional(),
      capacityPoolResourceId: z.string().optional(),
      coolAccess: z.boolean().optional(),
      coolnessPeriod: z.number().min(7).max(183).optional(),
      coolAccessRetrievalPolicy: z.enum(['Default', 'OnRead', 'Never']).optional(),
      unixPermissions: z.string().optional(),
      avsDataStore: z.enum(['Enabled', 'Disabled']).optional(),
      isDefaultQuotaEnabled: z.boolean().optional(),
      defaultUserQuotaInKiBs: z.number().optional(),
      defaultGroupQuotaInKiBs: z.number().optional(),
      enableSubvolumes: z.enum(['Enabled', 'Disabled']).optional(),
      maximumNumberOfFiles: z.number().optional(),
      smbContinuouslyAvailable: z.boolean().optional(),
      ldapEnabled: z.boolean().optional(),
      zones: z.array(z.string()).optional(),
      placementRules: z.array(z.object({
        key: z.string(),
        value: z.string()
      })).optional(),
      proximityPlacementGroup: z.string().optional(),
      volumeSpecName: z.string().optional(),
      volumeGroupName: z.string().optional(),
      originatingResourceId: z.string().optional()
    })
  })
});

/**
 * 2. Delete volume
 * DELETE /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}
 */
const VolumesDeleteSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName,
  forceDelete: z.boolean().optional()
});

/**
 * 3. Get volume
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}
 */
const VolumesGetSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName
});

/**
 * 4. List volumes
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes
 */
const VolumesListSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName
});

/**
 * 5. Update volume
 * PATCH /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}
 */
const VolumesUpdateSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName,
  body: z.object({
    location: VolumesCommonSchemas.location.optional(),
    tags: VolumesCommonSchemas.tags,
    properties: z.object({
      usageThreshold: z.number().optional(),
      exportPolicy: z.any().optional(),
      protocolTypes: z.array(z.string()).optional(),
      throughputMibps: z.number().optional(),
      dataProtection: z.any().optional(),
      isDefaultQuotaEnabled: z.boolean().optional(),
      defaultUserQuotaInKiBs: z.number().optional(),
      defaultGroupQuotaInKiBs: z.number().optional()
    }).optional()
  })
});

/**
 * 6. Authorize replication
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/authorizeReplication
 */
const VolumesAuthorizeReplicationSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName,
  body: z.object({
    remoteVolumeResourceId: z.string()
  })
});

/**
 * 7. Break replication
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/breakReplication
 */
const VolumesBreakReplicationSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName,
  body: z.object({
    forceBreakReplication: z.boolean().optional()
  }).optional()
});

/**
 * 8. Delete replication
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/deleteReplication
 */
const VolumesDeleteReplicationSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName
});

/**
 * 9. List replications
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/listReplications
 */
const VolumesListReplicationsSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName
});

/**
 * 10. Replication status
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/replicationStatus
 */
const VolumesReplicationStatusSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName
});

/**
 * 11. Resync replication
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/resyncReplication
 */
const VolumesResyncReplicationSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName
});

/**
 * 12. Revert volume
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/revert
 */
const VolumesRevertSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName,
  body: z.object({
    snapshotId: z.string()
  })
});

/**
 * 13. Pool change
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/poolChange
 */
const VolumesPoolChangeSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName,
  body: z.object({
    newPoolResourceId: z.string()
  })
});

/**
 * 14. Relocate volume
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/relocate
 */
const VolumesRelocateSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName,
  body: z.object({
    creationToken: z.string().optional()
  }).optional()
});

/**
 * 15. Finalize relocation
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/finalizeRelocation
 */
const VolumesFinalizeRelocationSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName
});

/**
 * 16. Revert relocation
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/revertRelocation
 */
const VolumesRevertRelocationSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName
});

/**
 * 17. Reset CIFS password
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/resetCifsPassword
 */
const VolumesResetCifsPasswordSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName
});

/**
 * 18. Break file locks
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/breakFileLocks
 */
const VolumesBreakFileLocksSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName,
  body: z.object({
    clientIp: z.string().optional(),
    confirmRunningDisruptiveOperation: z.boolean().optional()
  }).optional()
});

/**
 * 19. Get volume backup status
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/backupStatus
 */
const VolumesGetBackupStatusSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName
});

/**
 * 20. Get volume restore status
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/restoreStatus
 */
const VolumesGetRestoreStatusSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName
});

/**
 * 21. Populate availability zone
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/populateAvailabilityZone
 */
const VolumesPopulateAvailabilityZoneSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName
});

/**
 * 22. List group IDs for LDAP user
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/listGetGroupIdListForLdapUser
 */
const VolumesListGetGroupIdListForLdapUserSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName,
  body: z.object({
    username: z.string()
  })
});

/**
 * 23. Authorize external replication
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/authorizeExternalReplication
 */
const VolumesAuthorizeExternalReplicationSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName
});

/**
 * 24. Finalize external replication
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/finalizeExternalReplication
 */
const VolumesFinalizeExternalReplicationSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName
});

/**
 * 25. Peer external cluster
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/peerExternalCluster
 */
const VolumesPeerExternalClusterSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName,
  body: z.object({
    peerClusterNames: z.array(z.string()),
    peerAddresses: z.array(z.string())
  })
});

/**
 * 26. Re-initialize replication
 * POST /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/reInitializeReplication
 */
const VolumesReInitializeReplicationSchema = z.object({
  subscriptionId: VolumesCommonSchemas.subscriptionId,
  resourceGroupName: VolumesCommonSchemas.resourceGroupName,
  accountName: VolumesCommonSchemas.accountName,
  poolName: VolumesCommonSchemas.poolName,
  volumeName: VolumesCommonSchemas.volumeName
});

// =============================================================================
// MCP TOOLS EXPORT
// =============================================================================

export const volumesOperationsTools: Tool[] = [
  {
    name: 'anf_volumes_create_or_update',
    description: 'Create or update a volume with comprehensive configuration options',
    inputSchema: VolumesCreateOrUpdateSchema
  },
  {
    name: 'anf_volumes_delete',
    description: 'Delete a volume from the capacity pool',
    inputSchema: VolumesDeleteSchema
  },
  {
    name: 'anf_volumes_get',
    description: 'Get detailed information about a specific volume',
    inputSchema: VolumesGetSchema
  },
  {
    name: 'anf_volumes_list',
    description: 'List all volumes in a capacity pool',
    inputSchema: VolumesListSchema
  },
  {
    name: 'anf_volumes_update',
    description: 'Update volume properties including size and export policies',
    inputSchema: VolumesUpdateSchema
  },
  {
    name: 'anf_volumes_authorize_replication',
    description: 'Authorize replication for cross-region data protection',
    inputSchema: VolumesAuthorizeReplicationSchema
  },
  {
    name: 'anf_volumes_break_replication',
    description: 'Break replication relationship for disaster recovery testing',
    inputSchema: VolumesBreakReplicationSchema
  },
  {
    name: 'anf_volumes_delete_replication',
    description: 'Delete replication configuration from volume',
    inputSchema: VolumesDeleteReplicationSchema
  },
  {
    name: 'anf_volumes_list_replications',
    description: 'List all replication relationships for a volume',
    inputSchema: VolumesListReplicationsSchema
  },
  {
    name: 'anf_volumes_replication_status',
    description: 'Get current replication status and health',
    inputSchema: VolumesReplicationStatusSchema
  },
  {
    name: 'anf_volumes_resync_replication',
    description: 'Resynchronize replication after break operation',
    inputSchema: VolumesResyncReplicationSchema
  },
  {
    name: 'anf_volumes_revert',
    description: 'Revert volume to a specific snapshot',
    inputSchema: VolumesRevertSchema
  },
  {
    name: 'anf_volumes_pool_change',
    description: 'Move volume to a different capacity pool',
    inputSchema: VolumesPoolChangeSchema
  },
  {
    name: 'anf_volumes_relocate',
    description: 'Relocate volume to optimize performance',
    inputSchema: VolumesRelocateSchema
  },
  {
    name: 'anf_volumes_finalize_relocation',
    description: 'Finalize volume relocation process',
    inputSchema: VolumesFinalizeRelocationSchema
  },
  {
    name: 'anf_volumes_revert_relocation',
    description: 'Revert volume relocation if issues occur',
    inputSchema: VolumesRevertRelocationSchema
  },
  {
    name: 'anf_volumes_reset_cifs_password',
    description: 'Reset CIFS password for SMB access',
    inputSchema: VolumesResetCifsPasswordSchema
  },
  {
    name: 'anf_volumes_break_file_locks',
    description: 'Break file locks to resolve access issues',
    inputSchema: VolumesBreakFileLocksSchema
  },
  {
    name: 'anf_volumes_get_backup_status',
    description: 'Get current backup status for volume',
    inputSchema: VolumesGetBackupStatusSchema
  },
  {
    name: 'anf_volumes_get_restore_status',
    description: 'Get current restore operation status',
    inputSchema: VolumesGetRestoreStatusSchema
  },
  {
    name: 'anf_volumes_populate_availability_zone',
    description: 'Populate availability zone information for volume',
    inputSchema: VolumesPopulateAvailabilityZoneSchema
  },
  {
    name: 'anf_volumes_list_get_group_id_list_for_ldap_user',
    description: 'Get LDAP user group IDs for access control',
    inputSchema: VolumesListGetGroupIdListForLdapUserSchema
  },
  {
    name: 'anf_volumes_authorize_external_replication',
    description: 'Authorize external cluster replication',
    inputSchema: VolumesAuthorizeExternalReplicationSchema
  },
  {
    name: 'anf_volumes_finalize_external_replication',
    description: 'Finalize external replication setup',
    inputSchema: VolumesFinalizeExternalReplicationSchema
  },
  {
    name: 'anf_volumes_peer_external_cluster',
    description: 'Establish peering with external NetApp cluster',
    inputSchema: VolumesPeerExternalClusterSchema
  },
  {
    name: 'anf_volumes_re_initialize_replication',
    description: 'Re-initialize replication after major changes',
    inputSchema: VolumesReInitializeReplicationSchema
  }
];

// =============================================================================
// API CLIENT EXTENSION FOR VOLUMES
// =============================================================================

export interface VolumesApiMethods {
  // Volume CRUD operations
  createOrUpdateVolume(params: z.infer<typeof VolumesCreateOrUpdateSchema>): Promise<any>;
  deleteVolume(params: z.infer<typeof VolumesDeleteSchema>): Promise<void>;
  getVolume(params: z.infer<typeof VolumesGetSchema>): Promise<any>;
  listVolumes(params: z.infer<typeof VolumesListSchema>): Promise<any>;
  updateVolume(params: z.infer<typeof VolumesUpdateSchema>): Promise<any>;
  
  // Replication operations
  authorizeReplication(params: z.infer<typeof VolumesAuthorizeReplicationSchema>): Promise<any>;
  breakReplication(params: z.infer<typeof VolumesBreakReplicationSchema>): Promise<any>;
  deleteReplication(params: z.infer<typeof VolumesDeleteReplicationSchema>): Promise<any>;
  listReplications(params: z.infer<typeof VolumesListReplicationsSchema>): Promise<any>;
  getReplicationStatus(params: z.infer<typeof VolumesReplicationStatusSchema>): Promise<any>;
  resyncReplication(params: z.infer<typeof VolumesResyncReplicationSchema>): Promise<any>;
  
  // Volume management operations
  revertVolume(params: z.infer<typeof VolumesRevertSchema>): Promise<any>;
  poolChange(params: z.infer<typeof VolumesPoolChangeSchema>): Promise<any>;
  relocate(params: z.infer<typeof VolumesRelocateSchema>): Promise<any>;
  finalizeRelocation(params: z.infer<typeof VolumesFinalizeRelocationSchema>): Promise<any>;
  revertRelocation(params: z.infer<typeof VolumesRevertRelocationSchema>): Promise<any>;
  
  // Access and security operations
  resetCifsPassword(params: z.infer<typeof VolumesResetCifsPasswordSchema>): Promise<any>;
  breakFileLocks(params: z.infer<typeof VolumesBreakFileLocksSchema>): Promise<any>;
  listGetGroupIdListForLdapUser(params: z.infer<typeof VolumesListGetGroupIdListForLdapUserSchema>): Promise<any>;
  
  // Backup and restore operations
  getBackupStatus(params: z.infer<typeof VolumesGetBackupStatusSchema>): Promise<any>;
  getRestoreStatus(params: z.infer<typeof VolumesGetRestoreStatusSchema>): Promise<any>;
  
  // Advanced operations
  populateAvailabilityZone(params: z.infer<typeof VolumesPopulateAvailabilityZoneSchema>): Promise<any>;
  authorizeExternalReplication(params: z.infer<typeof VolumesAuthorizeExternalReplicationSchema>): Promise<any>;
  finalizeExternalReplication(params: z.infer<typeof VolumesFinalizeExternalReplicationSchema>): Promise<any>;
  peerExternalCluster(params: z.infer<typeof VolumesPeerExternalClusterSchema>): Promise<any>;
  reInitializeReplication(params: z.infer<typeof VolumesReInitializeReplicationSchema>): Promise<any>;
}

// =============================================================================
// VOLUME CONSTANTS
// =============================================================================

export const VolumeProtocolTypes = {
  NFSV3: 'NFSv3',
  NFSV41: 'NFSv4.1',
  CIFS: 'CIFS'
} as const;

export const VolumeSecurityStyles = {
  UNIX: 'unix',
  NTFS: 'ntfs'
} as const;

export const VolumeNetworkFeatures = {
  BASIC: 'Basic',
  STANDARD: 'Standard',
  STANDARD_WITH_ENFORCEMENT: 'StandardWithEnforcement'
} as const;

export const VolumeReplicationSchedule = {
  TEN_MINUTELY: '_10minutely',
  HOURLY: 'hourly',
  DAILY: 'daily'
} as const;

export const VolumeProvisioningStates = {
  CREATING: 'Creating',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  DELETING: 'Deleting',
  UPDATING: 'Updating',
  MOVING: 'Moving',
  AUTHORIZING: 'Authorizing'
} as const;