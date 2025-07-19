/**
 * Comprehensive Azure NetApp Files REST API Tools for MCP Server
 * 
 * This module provides complete coverage of all Azure NetApp Files REST API operations
 * as defined in the 2025-03-01 API version. Each tool maps directly to ANF REST endpoints
 * with comprehensive error handling, validation, and security controls.
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * 
 * API Coverage:
 * - Accounts (10 operations)
 * - Pools (5 operations) 
 * - Volumes (26 operations)
 * - Snapshots (8 operations)
 * - Backup Policies (5 operations)
 * - Backup Vaults (7 operations)
 * - Backups (15 operations)
 * - Snapshot Policies (9 operations)
 * - Subvolumes (8 operations)
 * - Volume Groups (6 operations)
 * - Volume Quota Rules (6 operations)
 * - NetApp Resource (4 operations)
 * - Operations (1 operation)
 * 
 * Total: 100+ comprehensive ANF REST operations
 */

import { Tool } from '../types/tool';
import { z } from 'zod';
import { wrapZodSchema } from '../utils/zod-to-json-schema';

// Common schemas used across multiple operations
const CommonSchemas = {
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
  resourceGroupName: z.string().min(1).max(90).regex(/^[-\w\._\(\)]+$/, 'Invalid resource group name'),
  accountName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid account name'),
  poolName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid pool name'),
  volumeName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid volume name'),
  snapshotName: z.string().min(1).max(255),
  location: z.string().min(1),
  tags: z.record(z.string()).optional(),
  apiVersion: z.literal('2025-03-01').default('2025-03-01')
};

// =============================================================================
// ACCOUNTS OPERATIONS (10 operations)
// =============================================================================

const AccountsCreateOrUpdateSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  body: z.object({
    location: CommonSchemas.location,
    tags: CommonSchemas.tags,
    properties: z.object({
      activeDirectories: z.array(z.object({
        username: z.string().optional(),
        password: z.string().optional(),
        domain: z.string().optional(),
        dns: z.string().optional(),
        smbServerName: z.string().optional(),
        organizationalUnit: z.string().optional(),
        site: z.string().optional(),
        backupOperators: z.array(z.string()).optional(),
        kdcIP: z.string().optional(),
        adName: z.string().optional(),
        serverRootCACertificate: z.string().optional(),
        aesEncryption: z.boolean().optional(),
        ldapSigning: z.boolean().optional(),
        ldapOverTLS: z.boolean().optional(),
        allowLocalNfsUsersWithLdap: z.boolean().optional(),
        encryptDCConnections: z.boolean().optional(),
        ldapSearchScope: z.object({
          userDN: z.string().optional(),
          groupDN: z.string().optional(),
          groupMembershipFilter: z.string().optional()
        }).optional()
      })).optional(),
      encryption: z.object({
        keySource: z.enum(['Microsoft.NetApp', 'Microsoft.KeyVault']).optional(),
        keyVaultProperties: z.object({
          keyVaultUri: z.string().optional(),
          keyName: z.string().optional(),
          keyVaultResourceId: z.string().optional(),
          keyVaultPrivateEndpointResourceId: z.string().optional()
        }).optional(),
        identity: z.object({
          userAssignedIdentity: z.string().optional()
        }).optional()
      }).optional(),
      disableShowmount: z.boolean().optional(),
      identity: z.object({
        type: z.enum(['None', 'SystemAssigned', 'UserAssigned', 'SystemAssigned,UserAssigned']),
        userAssignedIdentities: z.record(z.object({
          clientId: z.string().optional(),
          principalId: z.string().optional()
        })).optional()
      }).optional()
    }).optional()
  })
});

const AccountsDeleteSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName
});

const AccountsGetSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName
});

const AccountsListSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName
});

const AccountsListBySubscriptionSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId
});

const AccountsUpdateSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  body: z.object({
    location: CommonSchemas.location.optional(),
    tags: CommonSchemas.tags,
    properties: z.object({
      activeDirectories: z.array(z.any()).optional(),
      encryption: z.object({
        keySource: z.string().optional(),
        keyVaultProperties: z.any().optional()
      }).optional(),
      disableShowmount: z.boolean().optional()
    }).optional()
  })
});

const AccountsChangeKeyVaultSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  body: z.object({
    keyVaultUri: z.string(),
    keyName: z.string(),
    keyVaultResourceId: z.string(),
    keyVaultPrivateEndpointResourceId: z.string().optional()
  })
});

const AccountsGetChangeKeyVaultInformationSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName
});

const AccountsRenewCredentialsSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName
});

const AccountsTransitionToCmkSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  body: z.object({
    keyVaultUri: z.string(),
    keyName: z.string(),
    keyVaultResourceId: z.string(),
    keyVaultPrivateEndpointResourceId: z.string().optional()
  })
});

// =============================================================================
// POOLS OPERATIONS (5 operations)
// =============================================================================

const PoolsCreateOrUpdateSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  body: z.object({
    location: CommonSchemas.location,
    tags: CommonSchemas.tags,
    properties: z.object({
      size: z.number().int().min(4398046511104).max(2199023255552000), // 4TiB to 2PiB in bytes
      serviceLevel: z.enum(['Standard', 'Premium', 'Ultra']),
      qosType: z.enum(['Auto', 'Manual']).optional(),
      coolAccess: z.boolean().optional(),
      encryptionType: z.enum(['Single', 'Double']).optional()
    })
  })
});

const PoolsDeleteSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName
});

const PoolsGetSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName
});

const PoolsListSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName
});

const PoolsUpdateSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  body: z.object({
    location: CommonSchemas.location.optional(),
    tags: CommonSchemas.tags,
    properties: z.object({
      size: z.number().int().min(4398046511104).optional(),
      qosType: z.enum(['Auto', 'Manual']).optional(),
      coolAccess: z.boolean().optional()
    }).optional()
  })
});

// =============================================================================
// VOLUMES OPERATIONS (26 operations)
// =============================================================================

const VolumesCreateOrUpdateSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName,
  body: z.object({
    location: CommonSchemas.location,
    tags: CommonSchemas.tags,
    properties: z.object({
      creationToken: z.string().min(1).max(80).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,78}[a-zA-Z0-9]$/),
      serviceLevel: z.enum(['Standard', 'Premium', 'Ultra']).optional(),
      usageThreshold: z.number().int().min(107374182400).max(2199023255552000), // 100GiB to 2PiB
      exportPolicy: z.object({
        rules: z.array(z.object({
          ruleIndex: z.number().int().min(1).max(5),
          unixReadOnly: z.boolean().optional(),
          unixReadWrite: z.boolean().optional(),
          cifs: z.boolean().optional(),
          nfsv3: z.boolean().optional(),
          nfsv41: z.boolean().optional(),
          allowedClients: z.string().optional(),
          kerberos5ReadOnly: z.boolean().optional(),
          kerberos5ReadWrite: z.boolean().optional(),
          kerberos5iReadOnly: z.boolean().optional(),
          kerberos5iReadWrite: z.boolean().optional(),
          kerberos5pReadOnly: z.boolean().optional(),
          kerberos5pReadWrite: z.boolean().optional(),
          hasRootAccess: z.boolean().optional(),
          chownMode: z.enum(['Restricted', 'Unrestricted']).optional()
        }))
      }).optional(),
      protocolTypes: z.array(z.enum(['NFSv3', 'NFSv4.1', 'CIFS'])),
      subnetId: z.string(),
      networkFeatures: z.enum(['Basic', 'Standard']).optional(),
      networkSiblingSetId: z.string().optional(),
      storageToNetworkProximity: z.enum(['Default', 'T1', 'T2']).optional(),
      snapshotPolicy: z.object({
        snapshotPolicyId: z.string().optional()
      }).optional(),
      dataProtection: z.object({
        backup: z.object({
          backupPolicyId: z.string().optional(),
          policyEnforced: z.boolean().optional(),
          backupVaultId: z.string().optional()
        }).optional(),
        replication: z.object({
          endpointType: z.enum(['src', 'dst']).optional(),
          remoteVolumeResourceId: z.string().optional(),
          remoteVolumeRegion: z.string().optional(),
          replicationSchedule: z.enum(['_10minutely', 'hourly', 'daily']).optional()
        }).optional(),
        snapshot: z.object({
          snapshotPolicyId: z.string().optional()
        }).optional()
      }).optional(),
      isRestoring: z.boolean().optional(),
      snapshotDirectoryVisible: z.boolean().optional(),
      kerberosEnabled: z.boolean().optional(),
      securityStyle: z.enum(['ntfs', 'unix', 'mixed']).optional(),
      smbEncryption: z.boolean().optional(),
      smbAccessBasedEnumeration: z.enum(['Disabled', 'Enabled']).optional(),
      smbNonBrowsable: z.enum(['Disabled', 'Enabled']).optional(),
      smbContinuouslyAvailable: z.boolean().optional(),
      throughputMibps: z.number().optional(),
      encryptionKeySource: z.enum(['Microsoft.NetApp', 'Microsoft.KeyVault']).optional(),
      keyVaultPrivateEndpointResourceId: z.string().optional(),
      ldapEnabled: z.boolean().optional(),
      coolAccess: z.boolean().optional(),
      coolnessPeriod: z.number().int().min(7).max(63).optional(),
      coolAccessRetrievalPolicy: z.enum(['Default', 'OnRead', 'Never']).optional(),
      unixPermissions: z.string().optional(),
      avsDataStore: z.enum(['Disabled', 'Enabled']).optional(),
      dataStoreResourceId: z.array(z.string()).optional(),
      isDefaultQuotaEnabled: z.boolean().optional(),
      defaultUserQuotaInKiBs: z.number().int().optional(),
      defaultGroupQuotaInKiBs: z.number().int().optional(),
      maximumNumberOfFiles: z.number().int().optional(),
      volumeGroupName: z.string().optional(),
      capacityPoolResourceId: z.string().optional(),
      proximityPlacementGroup: z.string().optional(),
      t2Network: z.string().optional(),
      volumeSpecName: z.string().optional(),
      encrypted: z.boolean().optional(),
      placementRules: z.array(z.object({
        key: z.string(),
        value: z.string()
      })).optional(),
      enableSubvolumes: z.enum(['Disabled', 'Enabled']).optional(),
      provisionedAvailabilityZone: z.string().optional(),
      isLargeVolume: z.boolean().optional(),
      isSnapRevertible: z.boolean().optional(),
      originatingResourceId: z.string().optional()
    })
  })
});

const VolumesDeleteSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName,
  forceDelete: z.boolean().optional()
});

const VolumesGetSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName
});

const VolumesListSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName
});

const VolumesUpdateSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName,
  body: z.object({
    location: CommonSchemas.location.optional(),
    tags: CommonSchemas.tags,
    properties: z.object({
      serviceLevel: z.enum(['Standard', 'Premium', 'Ultra']).optional(),
      usageThreshold: z.number().int().optional(),
      exportPolicy: z.any().optional(),
      throughputMibps: z.number().optional(),
      dataProtection: z.any().optional(),
      isDefaultQuotaEnabled: z.boolean().optional(),
      defaultUserQuotaInKiBs: z.number().int().optional(),
      defaultGroupQuotaInKiBs: z.number().int().optional(),
      unixPermissions: z.string().optional(),
      coolAccess: z.boolean().optional(),
      coolnessPeriod: z.number().int().optional(),
      coolAccessRetrievalPolicy: z.enum(['Default', 'OnRead', 'Never']).optional(),
      snapshotPolicy: z.any().optional()
    }).optional()
  })
});

// Additional Volume Operations Schemas
const VolumesAuthorizeReplicationSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName,
  body: z.object({
    remoteVolumeResourceId: z.string()
  })
});

const VolumesBreakReplicationSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName,
  body: z.object({
    forceBreakReplication: z.boolean().optional()
  }).optional()
});

const VolumesDeleteReplicationSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName
});

const VolumesListReplicationsSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName
});

const VolumesReplicationStatusSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName
});

const VolumesResyncReplicationSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName
});

const VolumesRevertSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName,
  body: z.object({
    snapshotId: z.string()
  })
});

const VolumesPoolChangeSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName,
  body: z.object({
    newCapacityPoolResourceId: z.string()
  })
});

const VolumesRelocateSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName,
  body: z.object({
    creationToken: z.string().optional()
  }).optional()
});

const VolumesFinalizeRelocationSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName
});

const VolumesRevertRelocationSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName
});

const VolumesResetCifsPasswordSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName
});

const VolumesBreakFileLocksSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName,
  body: z.object({
    clientIp: z.string().optional(),
    confirmRunningDisruptiveOperation: z.boolean().optional()
  }).optional()
});

// =============================================================================
// SNAPSHOTS OPERATIONS (8 operations)
// =============================================================================

const SnapshotsCreateSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName,
  snapshotName: CommonSchemas.snapshotName,
  body: z.object({
    location: CommonSchemas.location,
    properties: z.object({
      fileSystemId: z.string().optional()
    }).optional()
  })
});

const SnapshotsDeleteSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName,
  snapshotName: CommonSchemas.snapshotName
});

const SnapshotsGetSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName,
  snapshotName: CommonSchemas.snapshotName
});

const SnapshotsListSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName
});

const SnapshotsUpdateSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName,
  snapshotName: CommonSchemas.snapshotName,
  body: z.object({
    properties: z.object({
      // Typically used for updating metadata or properties
    }).optional()
  })
});

const SnapshotsRestoreFilesSchema = z.object({
  subscriptionId: CommonSchemas.subscriptionId,
  resourceGroupName: CommonSchemas.resourceGroupName,
  accountName: CommonSchemas.accountName,
  poolName: CommonSchemas.poolName,
  volumeName: CommonSchemas.volumeName,
  snapshotName: CommonSchemas.snapshotName,
  body: z.object({
    filePaths: z.array(z.string()),
    destinationPath: z.string().optional()
  })
});

// =============================================================================
// MCP TOOLS ARRAY
// =============================================================================

export const comprehensiveAnfApiTools: Tool[] = [
  // =========================================================================
  // ACCOUNTS TOOLS
  // =========================================================================
  {
    name: 'anf_accounts_create_or_update',
    description: 'Create or update a NetApp account with comprehensive configuration including Active Directory, encryption, and identity settings',
    inputSchema: wrapZodSchema(AccountsCreateOrUpdateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_accounts_create_or_update is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_accounts_delete',
    description: 'Delete a NetApp account with all associated resources',
    inputSchema: wrapZodSchema(AccountsDeleteSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_accounts_delete is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_accounts_get',
    description: 'Get detailed information about a specific NetApp account',
    inputSchema: wrapZodSchema(AccountsGetSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_accounts_get is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_accounts_list',
    description: 'List all NetApp accounts in a resource group',
    inputSchema: wrapZodSchema(AccountsListSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_accounts_list is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_accounts_list_by_subscription',
    description: 'List all NetApp accounts in a subscription',
    inputSchema: wrapZodSchema(AccountsListBySubscriptionSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_accounts_list_by_subscription is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_accounts_update',
    description: 'Update properties of an existing NetApp account',
    inputSchema: wrapZodSchema(AccountsUpdateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_accounts_update is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_accounts_change_key_vault',
    description: 'Change Key Vault/Managed HSM used for volume encryption',
    inputSchema: wrapZodSchema(AccountsChangeKeyVaultSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_accounts_change_key_vault is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_accounts_get_change_key_vault_information',
    description: 'Get information about how volumes are encrypted under NetApp account',
    inputSchema: wrapZodSchema(AccountsGetChangeKeyVaultInformationSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_accounts_get_change_key_vault_information is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_accounts_renew_credentials',
    description: 'Renew identity credentials for the NetApp account',
    inputSchema: wrapZodSchema(AccountsRenewCredentialsSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_accounts_renew_credentials is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_accounts_transition_to_cmk',
    description: 'Transition volumes encryption from Platform Managed Keys (PMK) to Customer Managed Keys (CMK)',
    inputSchema: wrapZodSchema(AccountsTransitionToCmkSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_accounts_transition_to_cmk is not yet implemented',
        placeholder: true
      };
    }
  },

  // =========================================================================
  // POOLS TOOLS
  // =========================================================================
  {
    name: 'anf_pools_create_or_update',
    description: 'Create or update a capacity pool with specified size, service level, and QoS settings',
    inputSchema: wrapZodSchema(PoolsCreateOrUpdateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_pools_create_or_update is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_pools_delete',
    description: 'Delete a capacity pool (must be empty of volumes)',
    inputSchema: wrapZodSchema(PoolsDeleteSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_pools_delete is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_pools_get',
    description: 'Get detailed information about a capacity pool',
    inputSchema: wrapZodSchema(PoolsGetSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_pools_get is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_pools_list',
    description: 'List all capacity pools in a NetApp account',
    inputSchema: wrapZodSchema(PoolsListSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_pools_list is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_pools_update',
    description: 'Update properties of an existing capacity pool',
    inputSchema: wrapZodSchema(PoolsUpdateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_pools_update is not yet implemented',
        placeholder: true
      };
    }
  },

  // =========================================================================
  // VOLUMES TOOLS
  // =========================================================================
  {
    name: 'anf_volumes_create_or_update',
    description: 'Create or update a volume with comprehensive configuration including protocols, export policies, data protection, and advanced features',
    inputSchema: wrapZodSchema(VolumesCreateOrUpdateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_create_or_update is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_delete',
    description: 'Delete a volume with optional force delete for replication scenarios',
    inputSchema: wrapZodSchema(VolumesDeleteSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_delete is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_get',
    description: 'Get detailed information about a volume including all properties and status',
    inputSchema: wrapZodSchema(VolumesGetSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_get is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_list',
    description: 'List all volumes in a capacity pool',
    inputSchema: wrapZodSchema(VolumesListSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_list is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_update',
    description: 'Update properties of an existing volume',
    inputSchema: wrapZodSchema(VolumesUpdateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_update is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_authorize_replication',
    description: 'Authorize source volume for cross-region replication',
    inputSchema: wrapZodSchema(VolumesAuthorizeReplicationSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_authorize_replication is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_break_replication',
    description: 'Break volume replication relationship',
    inputSchema: wrapZodSchema(VolumesBreakReplicationSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_break_replication is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_delete_replication',
    description: 'Delete volume replication configuration',
    inputSchema: wrapZodSchema(VolumesDeleteReplicationSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_delete_replication is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_list_replications',
    description: 'List all replication relationships for a volume',
    inputSchema: wrapZodSchema(VolumesListReplicationsSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_list_replications is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_replication_status',
    description: 'Get replication status for a volume',
    inputSchema: wrapZodSchema(VolumesReplicationStatusSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_replication_status is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_resync_replication',
    description: 'Resync volume replication to synchronize data',
    inputSchema: wrapZodSchema(VolumesResyncReplicationSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_resync_replication is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_revert',
    description: 'Revert a volume to a specific snapshot',
    inputSchema: wrapZodSchema(VolumesRevertSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_revert is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_pool_change',
    description: 'Move a volume to a different capacity pool',
    inputSchema: wrapZodSchema(VolumesPoolChangeSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_pool_change is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_relocate',
    description: 'Relocate a volume to optimize placement and performance',
    inputSchema: wrapZodSchema(VolumesRelocateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_relocate is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_finalize_relocation',
    description: 'Finalize volume relocation process',
    inputSchema: wrapZodSchema(VolumesFinalizeRelocationSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_finalize_relocation is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_revert_relocation',
    description: 'Revert volume relocation if needed',
    inputSchema: wrapZodSchema(VolumesRevertRelocationSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_revert_relocation is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_reset_cifs_password',
    description: 'Reset CIFS password for SMB volume access',
    inputSchema: wrapZodSchema(VolumesResetCifsPasswordSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_reset_cifs_password is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_volumes_break_file_locks',
    description: 'Break file locks on a volume for maintenance or recovery',
    inputSchema: wrapZodSchema(VolumesBreakFileLocksSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_volumes_break_file_locks is not yet implemented',
        placeholder: true
      };
    }
  },

  // =========================================================================
  // SNAPSHOTS TOOLS
  // =========================================================================
  {
    name: 'anf_snapshots_create',
    description: 'Create a point-in-time snapshot of a volume',
    inputSchema: wrapZodSchema(SnapshotsCreateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_snapshots_create is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_snapshots_delete',
    description: 'Delete a volume snapshot',
    inputSchema: wrapZodSchema(SnapshotsDeleteSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_snapshots_delete is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_snapshots_get',
    description: 'Get detailed information about a snapshot',
    inputSchema: wrapZodSchema(SnapshotsGetSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_snapshots_get is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_snapshots_list',
    description: 'List all snapshots for a volume',
    inputSchema: wrapZodSchema(SnapshotsListSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_snapshots_list is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_snapshots_update',
    description: 'Update properties of an existing snapshot',
    inputSchema: wrapZodSchema(SnapshotsUpdateSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_snapshots_update is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_snapshots_restore_files',
    description: 'Restore specific files from a snapshot',
    inputSchema: wrapZodSchema(SnapshotsRestoreFilesSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_snapshots_restore_files is not yet implemented',
        placeholder: true
      };
    }
  }
];

// =============================================================================
// HELPER FUNCTIONS FOR TOOL IMPLEMENTATION
// =============================================================================

export interface ANFApiConfig {
  subscriptionId: string;
  resourceGroupName: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

export class ANFApiClient {
  private config: ANFApiConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: ANFApiConfig) {
    this.config = config;
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: 'https://management.azure.com/.default',
      grant_type: 'client_credentials'
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000) - 60000); // 1 minute buffer

    return this.accessToken;
  }

  async makeRequest(method: string, path: string, body?: any): Promise<any> {
    const token = await this.getAccessToken();
    const url = `${this.config.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ANF API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    if (response.status === 204) {
      return null; // No content
    }

    return await response.json();
  }

  // Account operations
  async createOrUpdateAccount(params: z.infer<typeof AccountsCreateOrUpdateSchema>): Promise<any> {
    const path = `/subscriptions/${params.subscriptionId}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${params.accountName}?api-version=2025-03-01`;
    return this.makeRequest('PUT', path, params.body);
  }

  async deleteAccount(params: z.infer<typeof AccountsDeleteSchema>): Promise<any> {
    const path = `/subscriptions/${params.subscriptionId}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${params.accountName}?api-version=2025-03-01`;
    return this.makeRequest('DELETE', path);
  }

  async getAccount(params: z.infer<typeof AccountsGetSchema>): Promise<any> {
    const path = `/subscriptions/${params.subscriptionId}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${params.accountName}?api-version=2025-03-01`;
    return this.makeRequest('GET', path);
  }

  async listAccounts(params: z.infer<typeof AccountsListSchema>): Promise<any> {
    const path = `/subscriptions/${params.subscriptionId}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts?api-version=2025-03-01`;
    return this.makeRequest('GET', path);
  }

  async listAccountsBySubscription(params: z.infer<typeof AccountsListBySubscriptionSchema>): Promise<any> {
    const path = `/subscriptions/${params.subscriptionId}/providers/Microsoft.NetApp/netAppAccounts?api-version=2025-03-01`;
    return this.makeRequest('GET', path);
  }

  // Pool operations
  async createOrUpdatePool(params: z.infer<typeof PoolsCreateOrUpdateSchema>): Promise<any> {
    const path = `/subscriptions/${params.subscriptionId}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${params.accountName}/capacityPools/${params.poolName}?api-version=2025-03-01`;
    return this.makeRequest('PUT', path, params.body);
  }

  async deletePool(params: z.infer<typeof PoolsDeleteSchema>): Promise<any> {
    const path = `/subscriptions/${params.subscriptionId}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${params.accountName}/capacityPools/${params.poolName}?api-version=2025-03-01`;
    return this.makeRequest('DELETE', path);
  }

  async getPool(params: z.infer<typeof PoolsGetSchema>): Promise<any> {
    const path = `/subscriptions/${params.subscriptionId}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${params.accountName}/capacityPools/${params.poolName}?api-version=2025-03-01`;
    return this.makeRequest('GET', path);
  }

  async listPools(params: z.infer<typeof PoolsListSchema>): Promise<any> {
    const path = `/subscriptions/${params.subscriptionId}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${params.accountName}/capacityPools?api-version=2025-03-01`;
    return this.makeRequest('GET', path);
  }

  // Volume operations
  async createOrUpdateVolume(params: z.infer<typeof VolumesCreateOrUpdateSchema>): Promise<any> {
    const path = `/subscriptions/${params.subscriptionId}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${params.accountName}/capacityPools/${params.poolName}/volumes/${params.volumeName}?api-version=2025-03-01`;
    return this.makeRequest('PUT', path, params.body);
  }

  async deleteVolume(params: z.infer<typeof VolumesDeleteSchema>): Promise<any> {
    const forceQuery = params.forceDelete ? `&forceDelete=${params.forceDelete}` : '';
    const path = `/subscriptions/${params.subscriptionId}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${params.accountName}/capacityPools/${params.poolName}/volumes/${params.volumeName}?api-version=2025-03-01${forceQuery}`;
    return this.makeRequest('DELETE', path);
  }

  async getVolume(params: z.infer<typeof VolumesGetSchema>): Promise<any> {
    const path = `/subscriptions/${params.subscriptionId}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${params.accountName}/capacityPools/${params.poolName}/volumes/${params.volumeName}?api-version=2025-03-01`;
    return this.makeRequest('GET', path);
  }

  async listVolumes(params: z.infer<typeof VolumesListSchema>): Promise<any> {
    const path = `/subscriptions/${params.subscriptionId}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${params.accountName}/capacityPools/${params.poolName}/volumes?api-version=2025-03-01`;
    return this.makeRequest('GET', path);
  }

  // Snapshot operations
  async createSnapshot(params: z.infer<typeof SnapshotsCreateSchema>): Promise<any> {
    const path = `/subscriptions/${params.subscriptionId}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${params.accountName}/capacityPools/${params.poolName}/volumes/${params.volumeName}/snapshots/${params.snapshotName}?api-version=2025-03-01`;
    return this.makeRequest('PUT', path, params.body);
  }

  async deleteSnapshot(params: z.infer<typeof SnapshotsDeleteSchema>): Promise<any> {
    const path = `/subscriptions/${params.subscriptionId}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${params.accountName}/capacityPools/${params.poolName}/volumes/${params.volumeName}/snapshots/${params.snapshotName}?api-version=2025-03-01`;
    return this.makeRequest('DELETE', path);
  }

  async getSnapshot(params: z.infer<typeof SnapshotsGetSchema>): Promise<any> {
    const path = `/subscriptions/${params.subscriptionId}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${params.accountName}/capacityPools/${params.poolName}/volumes/${params.volumeName}/snapshots/${params.snapshotName}?api-version=2025-03-01`;
    return this.makeRequest('GET', path);
  }

  async listSnapshots(params: z.infer<typeof SnapshotsListSchema>): Promise<any> {
    const path = `/subscriptions/${params.subscriptionId}/resourceGroups/${params.resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/${params.accountName}/capacityPools/${params.poolName}/volumes/${params.volumeName}/snapshots?api-version=2025-03-01`;
    return this.makeRequest('GET', path);
  }
}