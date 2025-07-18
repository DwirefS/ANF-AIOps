/**
 * Pools Operations Tools
 * 
 * Dedicated implementation for Pools operation group
 * Manages all capacity pool operations for Azure NetApp Files
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * API Version: 2025-03-01
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Common schemas for Pools operations
const PoolsCommonSchemas = {
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
  resourceGroupName: z.string().min(1).max(90).regex(/^[-\w\._\(\)]+$/, 'Invalid resource group name'),
  accountName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid account name'),
  poolName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid pool name'),
  location: z.string().min(1).max(50).regex(/^[a-zA-Z0-9\-]+$/, 'Invalid location format'),
  tags: z.record(z.string()).optional()
};

// =============================================================================
// POOLS OPERATION GROUP - ALL INDIVIDUAL OPERATIONS
// =============================================================================

/**
 * Create or update capacity pool
 * PUT /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}
 */
const PoolsCreateOrUpdateSchema = z.object({
  subscriptionId: PoolsCommonSchemas.subscriptionId,
  resourceGroupName: PoolsCommonSchemas.resourceGroupName,
  accountName: PoolsCommonSchemas.accountName,
  poolName: PoolsCommonSchemas.poolName,
  body: z.object({
    location: PoolsCommonSchemas.location,
    tags: PoolsCommonSchemas.tags,
    properties: z.object({
      serviceLevel: z.enum(['Standard', 'Premium', 'Ultra']),
      size: z.number().min(4398046511104).max(549755813888000), // 4 TiB to 500 TiB
      qosType: z.enum(['Auto', 'Manual']).optional(),
      coolAccess: z.boolean().optional(),
      encryptionType: z.enum(['Single', 'Double']).optional()
    })
  })
});

/**
 * Delete capacity pool
 * DELETE /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}
 */
const PoolsDeleteSchema = z.object({
  subscriptionId: PoolsCommonSchemas.subscriptionId,
  resourceGroupName: PoolsCommonSchemas.resourceGroupName,
  accountName: PoolsCommonSchemas.accountName,
  poolName: PoolsCommonSchemas.poolName
});

/**
 * Get capacity pool details
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}
 */
const PoolsGetSchema = z.object({
  subscriptionId: PoolsCommonSchemas.subscriptionId,
  resourceGroupName: PoolsCommonSchemas.resourceGroupName,
  accountName: PoolsCommonSchemas.accountName,
  poolName: PoolsCommonSchemas.poolName
});

/**
 * List capacity pools in account
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools
 */
const PoolsListSchema = z.object({
  subscriptionId: PoolsCommonSchemas.subscriptionId,
  resourceGroupName: PoolsCommonSchemas.resourceGroupName,
  accountName: PoolsCommonSchemas.accountName
});

/**
 * Update capacity pool
 * PATCH /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}
 */
const PoolsUpdateSchema = z.object({
  subscriptionId: PoolsCommonSchemas.subscriptionId,
  resourceGroupName: PoolsCommonSchemas.resourceGroupName,
  accountName: PoolsCommonSchemas.accountName,
  poolName: PoolsCommonSchemas.poolName,
  body: z.object({
    location: PoolsCommonSchemas.location.optional(),
    tags: PoolsCommonSchemas.tags,
    properties: z.object({
      size: z.number().min(4398046511104).max(549755813888000).optional(),
      qosType: z.enum(['Auto', 'Manual']).optional()
    }).optional()
  })
});

// =============================================================================
// MCP TOOLS EXPORT
// =============================================================================

export const poolsOperationsTools: Tool[] = [
  {
    name: 'anf_pools_create_or_update',
    description: 'Create or update a capacity pool with service level, size, and QoS configuration',
    inputSchema: PoolsCreateOrUpdateSchema
  },
  {
    name: 'anf_pools_delete',
    description: 'Delete a capacity pool (must be empty of volumes)',
    inputSchema: PoolsDeleteSchema
  },
  {
    name: 'anf_pools_get',
    description: 'Get detailed information about a specific capacity pool',
    inputSchema: PoolsGetSchema
  },
  {
    name: 'anf_pools_list',
    description: 'List all capacity pools in a NetApp account',
    inputSchema: PoolsListSchema
  },
  {
    name: 'anf_pools_update',
    description: 'Update capacity pool properties including size and tags',
    inputSchema: PoolsUpdateSchema
  }
];

// =============================================================================
// API CLIENT EXTENSION FOR POOLS
// =============================================================================

export interface PoolsApiMethods {
  // Create or update pool
  createOrUpdatePool(params: z.infer<typeof PoolsCreateOrUpdateSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    location: string;
    properties: {
      poolId: string;
      serviceLevel: string;
      size: number;
      qosType?: string;
      provisioningState: string;
      totalThroughputMibps?: number;
      utilizedThroughputMibps?: number;
      encryptionType?: string;
      coolAccess?: boolean;
    };
    tags?: Record<string, string>;
  }>;

  // Delete pool
  deletePool(params: z.infer<typeof PoolsDeleteSchema>): Promise<void>;

  // Get pool
  getPool(params: z.infer<typeof PoolsGetSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    location: string;
    properties: {
      poolId: string;
      serviceLevel: string;
      size: number;
      qosType?: string;
      provisioningState: string;
      totalThroughputMibps?: number;
      utilizedThroughputMibps?: number;
      encryptionType?: string;
      coolAccess?: boolean;
    };
    tags?: Record<string, string>;
  }>;

  // List pools
  listPools(params: z.infer<typeof PoolsListSchema>): Promise<{
    value: Array<{
      id: string;
      name: string;
      type: string;
      location: string;
      properties: any;
    }>;
    nextLink?: string;
  }>;

  // Update pool
  updatePool(params: z.infer<typeof PoolsUpdateSchema>): Promise<{
    id: string;
    name: string;
    properties: {
      provisioningState: string;
    };
  }>;
}

// =============================================================================
// POOL CONSTANTS
// =============================================================================

export const PoolServiceLevels = {
  STANDARD: 'Standard',  // 16 MiB/s per 1 TiB
  PREMIUM: 'Premium',    // 64 MiB/s per 1 TiB
  ULTRA: 'Ultra'         // 128 MiB/s per 1 TiB
} as const;

export const PoolQosTypes = {
  AUTO: 'Auto',    // Automatic QoS based on service level
  MANUAL: 'Manual' // Manual throughput configuration
} as const;

export const PoolProvisioningStates = {
  CREATING: 'Creating',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  DELETING: 'Deleting',
  UPDATING: 'Updating'
} as const;

export const PoolEncryptionTypes = {
  SINGLE: 'Single', // Single encryption
  DOUBLE: 'Double'  // Double encryption
} as const;

// Pool size constants (in bytes)
export const PoolSizeConstants = {
  MIN_SIZE: 4398046511104,    // 4 TiB
  MAX_SIZE: 549755813888000,  // 500 TiB
  DEFAULT_SIZE: 4398046511104 // 4 TiB
} as const;