/**
 * Test fixtures for Azure NetApp Files data
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 */

export const mockAccounts = [
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-1',
    name: 'test-account-1',
    type: 'Microsoft.NetApp/netAppAccounts',
    location: 'eastus',
    tags: {
      environment: 'test',
      project: 'anf-aiops',
      owner: 'test-user',
    },
    properties: {
      provisioningState: 'Succeeded',
      activeDirectories: [],
    },
  },
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-2',
    name: 'test-account-2',
    type: 'Microsoft.NetApp/netAppAccounts',
    location: 'westus2',
    tags: {
      environment: 'prod',
      project: 'anf-aiops',
      owner: 'prod-user',
    },
    properties: {
      provisioningState: 'Succeeded',
      activeDirectories: [],
    },
  },
];

export const mockCapacityPools = [
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-1/capacityPools/test-pool-1',
    name: 'test-pool-1',
    type: 'Microsoft.NetApp/netAppAccounts/capacityPools',
    location: 'eastus',
    tags: {
      serviceLevel: 'Premium',
      purpose: 'production',
    },
    properties: {
      serviceLevel: 'Premium',
      size: 4398046511104, // 4 TiB
      qosType: 'Auto',
      provisioningState: 'Succeeded',
      totalThroughputMibps: 512,
      utilizedThroughputMibps: 128,
    },
  },
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-1/capacityPools/test-pool-2',
    name: 'test-pool-2',
    type: 'Microsoft.NetApp/netAppAccounts/capacityPools',
    location: 'eastus',
    tags: {
      serviceLevel: 'Standard',
      purpose: 'development',
    },
    properties: {
      serviceLevel: 'Standard',
      size: 2199023255552, // 2 TiB
      qosType: 'Manual',
      provisioningState: 'Succeeded',
      totalThroughputMibps: 256,
      utilizedThroughputMibps: 64,
    },
  },
];

export const mockVolumes = [
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-1/capacityPools/test-pool-1/volumes/test-volume-1',
    name: 'test-volume-1',
    type: 'Microsoft.NetApp/netAppAccounts/capacityPools/volumes',
    location: 'eastus',
    tags: {
      application: 'database',
      environment: 'prod',
    },
    properties: {
      fileSystemId: '12345678-1234-1234-1234-123456789012',
      creationToken: 'test-volume-1',
      serviceLevel: 'Premium',
      usageThreshold: 107374182400, // 100 GiB
      provisioningState: 'Succeeded',
      throughputMibps: 16,
      subnetId: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/anf-subnet',
      networkFeatures: 'Standard',
      storageToNetworkProximity: 'Default',
      mountTargets: [
        {
          mountTargetId: '12345678-1234-1234-1234-123456789012',
          fileSystemId: '12345678-1234-1234-1234-123456789012',
          ipAddress: '10.0.1.4',
          smbServerFqdn: '',
        },
      ],
      exportPolicy: {
        rules: [
          {
            ruleIndex: 1,
            unixReadOnly: false,
            unixReadWrite: true,
            cifs: false,
            nfsv3: true,
            nfsv41: false,
            allowedClients: '10.0.0.0/16',
            kerberos5ReadOnly: false,
            kerberos5ReadWrite: false,
            kerberos5iReadOnly: false,
            kerberos5iReadWrite: false,
            kerberos5pReadOnly: false,
            kerberos5pReadWrite: false,
            hasRootAccess: true,
            chownMode: 'Restricted',
          },
        ],
      },
    },
  },
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-1/capacityPools/test-pool-2/volumes/test-volume-2',
    name: 'test-volume-2',
    type: 'Microsoft.NetApp/netAppAccounts/capacityPools/volumes',
    location: 'eastus',
    tags: {
      application: 'file-share',
      environment: 'dev',
    },
    properties: {
      fileSystemId: '87654321-4321-4321-4321-210987654321',
      creationToken: 'test-volume-2',
      serviceLevel: 'Standard',
      usageThreshold: 53687091200, // 50 GiB
      provisioningState: 'Succeeded',
      throughputMibps: 8,
      subnetId: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/anf-subnet',
      networkFeatures: 'Basic',
      storageToNetworkProximity: 'Default',
      mountTargets: [
        {
          mountTargetId: '87654321-4321-4321-4321-210987654321',
          fileSystemId: '87654321-4321-4321-4321-210987654321',
          ipAddress: '10.0.1.5',
          smbServerFqdn: '',
        },
      ],
      exportPolicy: {
        rules: [
          {
            ruleIndex: 1,
            unixReadOnly: false,
            unixReadWrite: true,
            cifs: false,
            nfsv3: true,
            nfsv41: true,
            allowedClients: '10.0.0.0/24',
            hasRootAccess: true,
            chownMode: 'Unrestricted',
          },
        ],
      },
    },
  },
];

export const mockSnapshots = [
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-1/capacityPools/test-pool-1/volumes/test-volume-1/snapshots/snapshot-daily-20240101',
    name: 'snapshot-daily-20240101',
    type: 'Microsoft.NetApp/netAppAccounts/capacityPools/volumes/snapshots',
    location: 'eastus',
    tags: {
      schedule: 'daily',
      retention: '30days',
    },
    properties: {
      snapshotId: 'snap-12345678-1234-1234-1234-123456789012',
      created: new Date('2024-01-01T00:00:00Z'),
      provisioningState: 'Succeeded',
    },
  },
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-1/capacityPools/test-pool-1/volumes/test-volume-1/snapshots/snapshot-weekly-20240107',
    name: 'snapshot-weekly-20240107',
    type: 'Microsoft.NetApp/netAppAccounts/capacityPools/volumes/snapshots',
    location: 'eastus',
    tags: {
      schedule: 'weekly',
      retention: '12weeks',
    },
    properties: {
      snapshotId: 'snap-87654321-4321-4321-4321-210987654321',
      created: new Date('2024-01-07T00:00:00Z'),
      provisioningState: 'Succeeded',
    },
  },
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-1/capacityPools/test-pool-1/volumes/test-volume-1/snapshots/snapshot-manual-20240115',
    name: 'snapshot-manual-20240115',
    type: 'Microsoft.NetApp/netAppAccounts/capacityPools/volumes/snapshots',
    location: 'eastus',
    tags: {
      schedule: 'manual',
      purpose: 'pre-deployment',
    },
    properties: {
      snapshotId: 'snap-11111111-2222-3333-4444-555555555555',
      created: new Date('2024-01-15T10:30:00Z'),
      provisioningState: 'Succeeded',
    },
  },
];

export const mockBackupPolicies = [
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-1/backupPolicies/daily-backup-policy',
    name: 'daily-backup-policy',
    type: 'Microsoft.NetApp/netAppAccounts/backupPolicies',
    location: 'eastus',
    tags: {
      frequency: 'daily',
      retention: '30days',
    },
    properties: {
      backupPolicyId: 'bp-12345678-1234-1234-1234-123456789012',
      provisioningState: 'Succeeded',
      dailyBackupsToKeep: 30,
      weeklyBackupsToKeep: 4,
      monthlyBackupsToKeep: 12,
      enabled: true,
    },
  },
];

export const mockBackups = [
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-1/capacityPools/test-pool-1/volumes/test-volume-1/backups/backup-20240101-000000',
    name: 'backup-20240101-000000',
    type: 'Microsoft.NetApp/netAppAccounts/capacityPools/volumes/backups',
    location: 'eastus',
    properties: {
      backupId: 'backup-12345678-1234-1234-1234-123456789012',
      creationDate: new Date('2024-01-01T00:00:00Z'),
      provisioningState: 'Succeeded',
      size: 107374182400,
      backupType: 'Scheduled',
      failureReason: '',
      volumeName: 'test-volume-1',
      useExistingSnapshot: false,
    },
  },
];

export const mockSubvolumes = [
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-1/capacityPools/test-pool-1/volumes/test-volume-1/subvolumes/subvolume-1',
    name: 'subvolume-1',
    type: 'Microsoft.NetApp/netAppAccounts/capacityPools/volumes/subvolumes',
    properties: {
      path: '/subvolume-1',
      size: 1073741824, // 1 GiB
      parentPath: '/',
      provisioningState: 'Succeeded',
    },
  },
];

export const mockVolumeGroups = [
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-1/volumeGroups/sap-hana-group',
    name: 'sap-hana-group',
    type: 'Microsoft.NetApp/netAppAccounts/volumeGroups',
    location: 'eastus',
    tags: {
      application: 'sap-hana',
      environment: 'prod',
    },
    properties: {
      provisioningState: 'Succeeded',
      groupMetaData: {
        groupDescription: 'SAP HANA volumes',
        applicationType: 'SAP-HANA',
        applicationIdentifier: 'HN1',
      },
      volumes: [
        {
          id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-1/capacityPools/test-pool-1/volumes/hana-data',
          name: 'hana-data',
          tags: { type: 'data' },
        },
        {
          id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-1/capacityPools/test-pool-1/volumes/hana-log',
          name: 'hana-log',
          tags: { type: 'log' },
        },
        {
          id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-1/capacityPools/test-pool-1/volumes/hana-shared',
          name: 'hana-shared',
          tags: { type: 'shared' },
        },
      ],
    },
  },
];

export const mockQuotaRules = [
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/test-account-1/capacityPools/test-pool-1/volumes/test-volume-1/volumeQuotaRules/quota-rule-1',
    name: 'quota-rule-1',
    type: 'Microsoft.NetApp/netAppAccounts/capacityPools/volumes/volumeQuotaRules',
    properties: {
      provisioningState: 'Succeeded',
      quotaSizeInKiBs: 1048576, // 1 GiB
      quotaType: 'IndividualUserQuota',
      quotaTarget: 'user1',
    },
  },
];

export const testEnvironment = {
  subscriptionId: '12345678-1234-1234-1234-123456789012',
  tenantId: '87654321-4321-4321-4321-210987654321',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  resourceGroupName: 'test-rg',
  location: 'eastus',
  vnetName: 'test-vnet',
  subnetName: 'anf-subnet',
  subnetId: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/anf-subnet',
};

export const errorResponses = {
  notFound: {
    name: 'ResourceNotFoundError',
    message: 'The specified resource was not found',
    code: 'ResourceNotFound',
    statusCode: 404,
  },
  unauthorized: {
    name: 'AuthenticationError',
    message: 'Authentication failed',
    code: 'Unauthorized',
    statusCode: 401,
  },
  forbidden: {
    name: 'AuthorizationError',
    message: 'Insufficient permissions',
    code: 'Forbidden',
    statusCode: 403,
  },
  conflict: {
    name: 'ResourceExistsError',
    message: 'Resource already exists',
    code: 'ResourceExists',
    statusCode: 409,
  },
  rateLimit: {
    name: 'RateLimitError',
    message: 'Rate limit exceeded',
    code: 'TooManyRequests',
    statusCode: 429,
  },
  timeout: {
    name: 'TimeoutError',
    message: 'Request timeout',
    code: 'RequestTimeout',
    statusCode: 408,
  },
  serverError: {
    name: 'InternalServerError',
    message: 'Internal server error',
    code: 'InternalServerError',
    statusCode: 500,
  },
};