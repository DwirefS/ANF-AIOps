/**
 * Operations Operations Tools
 * 
 * Dedicated implementation for Operations operation group
 * Provides metadata about all available Azure NetApp Files REST API operations
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * API Version: 2025-03-01
 */

import { Tool } from '../types/tool';
import { z } from 'zod';
import { wrapZodSchema } from '../utils/zod-to-json-schema';

// =============================================================================
// OPERATIONS OPERATION GROUP
// =============================================================================

/**
 * List all available NetApp Files REST API operations
 * GET /providers/Microsoft.NetApp/operations
 */
const OperationsListSchema = z.object({
  // No parameters required - this lists all available operations
});

/**
 * Get specific operation details by operation name
 * GET /providers/Microsoft.NetApp/operations/{operationName}
 */
const OperationsGetSchema = z.object({
  operationName: z.string().min(1).max(128).regex(/^[a-zA-Z0-9\-_\/]+$/, 'Invalid operation name')
});

/**
 * Get operations by resource provider version
 * GET /providers/Microsoft.NetApp/operations?api-version={apiVersion}
 */
const OperationsByVersionSchema = z.object({
  apiVersion: z.string().regex(/^\d{4}-\d{2}-\d{2}(-preview)?$/, 'Invalid API version format')
});

/**
 * Get operations filtered by category/group
 * GET /providers/Microsoft.NetApp/operations?category={category}
 */
const OperationsByCategorySchema = z.object({
  category: z.enum([
    'Accounts',
    'Pools', 
    'Volumes',
    'Snapshots',
    'BackupPolicies',
    'BackupVaults',
    'Backups',
    'BackupsUnderAccount',
    'BackupsUnderBackupVault',
    'BackupsUnderVolume',
    'NetAppResource',
    'NetAppResourceQuotaLimits',
    'NetAppResourceRegionInfos',
    'NetAppResourceUsages',
    'SnapshotPolicies',
    'Subvolumes',
    'VolumeGroups',
    'VolumeQuotaRules',
    'Operations'
  ])
});

/**
 * Get operations with detailed descriptions and examples
 * GET /providers/Microsoft.NetApp/operations/detailed
 */
const OperationsDetailedSchema = z.object({
  includeExamples: z.boolean().optional(),
  includeDeprecated: z.boolean().optional(),
  format: z.enum(['json', 'yaml', 'openapi']).optional()
});

/**
 * Search operations by name pattern
 * GET /providers/Microsoft.NetApp/operations/search?q={query}
 */
const OperationsSearchSchema = z.object({
  query: z.string().min(1).max(100),
  searchFields: z.array(z.enum([
    'name',
    'description',
    'resourceType',
    'operationType'
  ])).optional(),
  caseSensitive: z.boolean().optional()
});

/**
 * Get operation usage statistics and analytics
 * GET /providers/Microsoft.NetApp/operations/analytics
 */
const OperationsAnalyticsSchema = z.object({
  timeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).optional(),
  groupBy: z.enum(['operation', 'resourceType', 'status']).optional(),
  includeErrors: z.boolean().optional()
});

// =============================================================================
// MCP TOOLS EXPORT
// =============================================================================

export const operationsTools: Tool[] = [
  {
    name: 'anf_operations_list',
    description: 'List all available Azure NetApp Files REST API operations with metadata',
    inputSchema: wrapZodSchema(OperationsListSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_operations_list is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_operations_get',
    description: 'Get detailed information about a specific NetApp Files operation',
    inputSchema: wrapZodSchema(OperationsGetSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_operations_get is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_operations_by_version',
    description: 'Get operations available in a specific API version',
    inputSchema: wrapZodSchema(OperationsByVersionSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_operations_by_version is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_operations_by_category',
    description: 'Get operations filtered by resource category or operation group',
    inputSchema: wrapZodSchema(OperationsByCategorySchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_operations_by_category is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_operations_detailed',
    description: 'Get detailed operation descriptions with examples and schemas',
    inputSchema: wrapZodSchema(OperationsDetailedSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_operations_detailed is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_operations_search',
    description: 'Search operations by name pattern or description keywords',
    inputSchema: wrapZodSchema(OperationsSearchSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_operations_search is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_operations_analytics',
    description: 'Get operation usage analytics and performance statistics',
    inputSchema: wrapZodSchema(OperationsAnalyticsSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_operations_analytics is not yet implemented',
        placeholder: true
      };
    }
  }
];

// =============================================================================
// API CLIENT EXTENSION FOR OPERATIONS
// =============================================================================

export interface OperationsApiMethods {
  // List all operations
  listOperations(params: z.infer<typeof OperationsListSchema>): Promise<{
    value: Array<{
      name: string;
      display: {
        provider: string;
        resource: string;
        operation: string;
        description: string;
      };
      properties?: {
        serviceSpecification?: {
          metricSpecifications?: Array<{
            name: string;
            displayName: string;
            displayDescription: string;
            unit: string;
            aggregationType: string;
            supportedAggregationTypes: string[];
            fillGapWithZero: boolean;
            category: string;
            resourceIdDimensionNameOverride?: string;
            sourceMdmNamespace?: string;
            dimensions?: Array<{
              name: string;
              displayName: string;
              toBeExportedForShoebox: boolean;
            }>;
          }>;
          logSpecifications?: Array<{
            name: string;
            displayName: string;
            blobDuration: string;
          }>;
        };
      };
    }>;
  }>;

  // Get specific operation
  getOperation(params: z.infer<typeof OperationsGetSchema>): Promise<{
    name: string;
    display: {
      provider: string;
      resource: string;
      operation: string;
      description: string;
    };
    isDataAction: boolean;
    origin: string;
    properties: {
      resourceTypes: string[];
      operationType: string;
      serviceSpecification: any;
      examples?: Array<{
        title: string;
        description: string;
        request: any;
        response: any;
      }>;
    };
  }>;

  // Get operations by version
  getOperationsByVersion(params: z.infer<typeof OperationsByVersionSchema>): Promise<{
    apiVersion: string;
    operations: Array<{
      name: string;
      isAvailable: boolean;
      deprecationInfo?: {
        deprecated: boolean;
        deprecationDate?: string;
        replacementOperation?: string;
      };
    }>;
  }>;

  // Get operations by category
  getOperationsByCategory(params: z.infer<typeof OperationsByCategorySchema>): Promise<{
    category: string;
    operations: Array<{
      name: string;
      method: string;
      urlTemplate: string;
      description: string;
      isAsync: boolean;
      returnType: string;
    }>;
  }>;

  // Get detailed operations
  getDetailedOperations(params: z.infer<typeof OperationsDetailedSchema>): Promise<{
    operations: Array<{
      name: string;
      method: string;
      urlTemplate: string;
      description: string;
      parameters: Array<{
        name: string;
        in: string;
        required: boolean;
        type: string;
        description: string;
      }>;
      responses: Array<{
        statusCode: number;
        description: string;
        schema?: any;
      }>;
      examples?: Array<{
        title: string;
        description: string;
        request: any;
        response: any;
      }>;
      tags: string[];
      deprecated?: boolean;
    }>;
    metadata: {
      totalOperations: number;
      apiVersion: string;
      lastUpdated: string;
    };
  }>;

  // Search operations
  searchOperations(params: z.infer<typeof OperationsSearchSchema>): Promise<{
    query: string;
    results: Array<{
      name: string;
      description: string;
      resourceType: string;
      operationType: string;
      relevanceScore: number;
      highlights: Array<{
        field: string;
        snippet: string;
      }>;
    }>;
    totalResults: number;
    searchTime: number;
  }>;

  // Get operations analytics
  getOperationsAnalytics(params: z.infer<typeof OperationsAnalyticsSchema>): Promise<{
    timeRange: string;
    analytics: {
      totalCalls: number;
      successRate: number;
      averageResponseTime: number;
      operationBreakdown: Array<{
        operationName: string;
        callCount: number;
        successRate: number;
        averageResponseTime: number;
        errorRate: number;
      }>;
      resourceTypeBreakdown: Array<{
        resourceType: string;
        callCount: number;
        successRate: number;
      }>;
      statusCodeDistribution: Array<{
        statusCode: number;
        count: number;
        percentage: number;
      }>;
      trends: Array<{
        timestamp: string;
        totalCalls: number;
        successRate: number;
        averageResponseTime: number;
      }>;
    };
  }>;
}

// =============================================================================
// OPERATION CATEGORIES AND METADATA
// =============================================================================

export const NetAppOperationCategories = {
  ACCOUNTS: 'Accounts',
  POOLS: 'Pools',
  VOLUMES: 'Volumes',
  SNAPSHOTS: 'Snapshots',
  BACKUP_POLICIES: 'BackupPolicies',
  BACKUP_VAULTS: 'BackupVaults',
  BACKUPS: 'Backups',
  BACKUPS_UNDER_ACCOUNT: 'BackupsUnderAccount',
  BACKUPS_UNDER_BACKUP_VAULT: 'BackupsUnderBackupVault',
  BACKUPS_UNDER_VOLUME: 'BackupsUnderVolume',
  NETAPP_RESOURCE: 'NetAppResource',
  NETAPP_RESOURCE_QUOTA_LIMITS: 'NetAppResourceQuotaLimits',
  NETAPP_RESOURCE_REGION_INFOS: 'NetAppResourceRegionInfos',
  NETAPP_RESOURCE_USAGES: 'NetAppResourceUsages',
  SNAPSHOT_POLICIES: 'SnapshotPolicies',
  SUBVOLUMES: 'Subvolumes',
  VOLUME_GROUPS: 'VolumeGroups',
  VOLUME_QUOTA_RULES: 'VolumeQuotaRules',
  OPERATIONS: 'Operations'
} as const;

export const NetAppOperationTypes = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ACTION: 'action'
} as const;

export const NetAppApiVersions = {
  LATEST: '2025-03-01',
  PREVIEW_2025_03_01: '2025-03-01-preview',
  STABLE_2024_07_01: '2024-07-01',
  STABLE_2024_03_01: '2024-03-01'
} as const;