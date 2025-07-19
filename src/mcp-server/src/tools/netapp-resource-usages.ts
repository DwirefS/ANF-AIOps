/**
 * NetApp Resource Usages Operations Tools
 * 
 * Dedicated implementation for NetApp Resource Usages operation group
 * Provides detailed usage metrics and statistics for Azure NetApp Files resources
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * API Version: 2025-03-01
 */

import { Tool } from '../types/tool';
import { z } from 'zod';
import { wrapZodSchema } from '../utils/zod-to-json-schema';

// Common schemas for NetApp Resource Usages operations
const NetAppResourceUsagesCommonSchemas = {
  subscriptionId: z.string().uuid('Invalid subscription ID format'),
  location: z.string().min(1).max(50).regex(/^[a-zA-Z0-9\-]+$/, 'Invalid location format'),
  resourceGroupName: z.string().min(1).max(90).regex(/^[-\w\._\(\)]+$/, 'Invalid resource group name'),
  accountName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$/, 'Invalid account name'),
};

// =============================================================================
// NETAPP RESOURCE USAGES OPERATION GROUP
// =============================================================================

/**
 * List current resource usage for NetApp resources in a location
 * GET /subscriptions/{subscriptionId}/providers/Microsoft.NetApp/locations/{location}/usages
 */
const NetAppResourceUsagesListSchema = z.object({
  subscriptionId: NetAppResourceUsagesCommonSchemas.subscriptionId,
  location: NetAppResourceUsagesCommonSchemas.location
});

/**
 * Get specific resource usage by usage name
 * GET /subscriptions/{subscriptionId}/providers/Microsoft.NetApp/locations/{location}/usages/{usageName}
 */
const NetAppResourceUsagesGetSchema = z.object({
  subscriptionId: NetAppResourceUsagesCommonSchemas.subscriptionId,
  location: NetAppResourceUsagesCommonSchemas.location,
  usageName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9\-_]+$/, 'Invalid usage name')
});

/**
 * Get capacity usage statistics for NetApp resources
 * GET /subscriptions/{subscriptionId}/providers/Microsoft.NetApp/locations/{location}/capacityUsage
 */
const NetAppResourceCapacityUsageSchema = z.object({
  subscriptionId: NetAppResourceUsagesCommonSchemas.subscriptionId,
  location: NetAppResourceUsagesCommonSchemas.location,
  timeRange: z.enum(['1h', '6h', '12h', '24h', '7d', '30d']).optional(),
  granularity: z.enum(['PT1M', 'PT5M', 'PT15M', 'PT30M', 'PT1H', 'PT6H', 'PT12H', 'P1D']).optional()
});

/**
 * Get performance usage metrics for NetApp resources
 * GET /subscriptions/{subscriptionId}/providers/Microsoft.NetApp/locations/{location}/performanceUsage
 */
const NetAppResourcePerformanceUsageSchema = z.object({
  subscriptionId: NetAppResourceUsagesCommonSchemas.subscriptionId,
  location: NetAppResourceUsagesCommonSchemas.location,
  metricTypes: z.array(z.enum([
    'throughput',
    'iops',
    'latency',
    'capacity',
    'connections'
  ])).optional(),
  timeRange: z.enum(['1h', '6h', '12h', '24h', '7d', '30d']).optional()
});

/**
 * Get resource count usage across all NetApp resources
 * GET /subscriptions/{subscriptionId}/providers/Microsoft.NetApp/locations/{location}/resourceCountUsage
 */
const NetAppResourceCountUsageSchema = z.object({
  subscriptionId: NetAppResourceUsagesCommonSchemas.subscriptionId,
  location: NetAppResourceUsagesCommonSchemas.location,
  resourceType: z.enum([
    'all',
    'netAppAccounts',
    'capacityPools',
    'volumes',
    'snapshots',
    'snapshotPolicies',
    'backupPolicies',
    'backupVaults',
    'volumeGroups',
    'subvolumes'
  ]).optional()
});

/**
 * Get cost usage and billing information for NetApp resources
 * GET /subscriptions/{subscriptionId}/providers/Microsoft.NetApp/locations/{location}/costUsage
 */
const NetAppResourceCostUsageSchema = z.object({
  subscriptionId: NetAppResourceUsagesCommonSchemas.subscriptionId,
  location: NetAppResourceUsagesCommonSchemas.location,
  timeRange: z.enum(['daily', 'weekly', 'monthly']).optional(),
  currency: z.string().length(3).optional(), // USD, EUR, etc.
  groupBy: z.enum(['resourceType', 'serviceLevel', 'account', 'resourceGroup']).optional()
});

/**
 * Get account-specific usage statistics
 * GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/usage
 */
const NetAppResourceAccountUsageSchema = z.object({
  subscriptionId: NetAppResourceUsagesCommonSchemas.subscriptionId,
  resourceGroupName: NetAppResourceUsagesCommonSchemas.resourceGroupName,
  accountName: NetAppResourceUsagesCommonSchemas.accountName,
  includeDeleted: z.boolean().optional(),
  timeRange: z.enum(['1h', '6h', '12h', '24h', '7d', '30d']).optional()
});

/**
 * Get usage trends and forecasting for NetApp resources
 * GET /subscriptions/{subscriptionId}/providers/Microsoft.NetApp/locations/{location}/usageTrends
 */
const NetAppResourceUsageTrendsSchema = z.object({
  subscriptionId: NetAppResourceUsagesCommonSchemas.subscriptionId,
  location: NetAppResourceUsagesCommonSchemas.location,
  forecastDays: z.number().int().min(1).max(365).optional(),
  trendType: z.enum(['capacity', 'performance', 'cost', 'count']).optional()
});

/**
 * Export usage data for reporting and analytics
 * POST /subscriptions/{subscriptionId}/providers/Microsoft.NetApp/locations/{location}/exportUsage
 */
const NetAppResourceExportUsageSchema = z.object({
  subscriptionId: NetAppResourceUsagesCommonSchemas.subscriptionId,
  location: NetAppResourceUsagesCommonSchemas.location,
  body: z.object({
    exportFormat: z.enum(['json', 'csv', 'xlsx']),
    timeRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }),
    includeMetrics: z.array(z.enum([
      'capacity',
      'performance',
      'cost',
      'resourceCount',
      'compliance'
    ])),
    destinationType: z.enum(['blob', 'email', 'download']),
    destination: z.string().optional() // blob URL or email address
  })
});

// =============================================================================
// MCP TOOLS EXPORT
// =============================================================================

export const netAppResourceUsagesTools: Tool[] = [
  {
    name: 'anf_netapp_resource_usages_list',
    description: 'List current resource usage statistics for all NetApp resources in a location',
    inputSchema: wrapZodSchema(NetAppResourceUsagesListSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_netapp_resource_usages_list is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_netapp_resource_usages_get',
    description: 'Get specific resource usage details by usage name',
    inputSchema: wrapZodSchema(NetAppResourceUsagesGetSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_netapp_resource_usages_get is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_netapp_resource_capacity_usage',
    description: 'Get detailed capacity usage statistics with time-based metrics',
    inputSchema: wrapZodSchema(NetAppResourceCapacityUsageSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_netapp_resource_capacity_usage is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_netapp_resource_performance_usage',
    description: 'Get performance usage metrics including throughput, IOPS, and latency',
    inputSchema: wrapZodSchema(NetAppResourcePerformanceUsageSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_netapp_resource_performance_usage is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_netapp_resource_count_usage',
    description: 'Get resource count usage across different NetApp resource types',
    inputSchema: wrapZodSchema(NetAppResourceCountUsageSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_netapp_resource_count_usage is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_netapp_resource_cost_usage',
    description: 'Get cost usage and billing information for NetApp resources',
    inputSchema: wrapZodSchema(NetAppResourceCostUsageSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_netapp_resource_cost_usage is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_netapp_resource_account_usage',
    description: 'Get detailed usage statistics for a specific NetApp account',
    inputSchema: wrapZodSchema(NetAppResourceAccountUsageSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_netapp_resource_account_usage is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_netapp_resource_usage_trends',
    description: 'Get usage trends and forecasting data for capacity planning',
    inputSchema: wrapZodSchema(NetAppResourceUsageTrendsSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_netapp_resource_usage_trends is not yet implemented',
        placeholder: true
      };
    }
  },
  {
    name: 'anf_netapp_resource_export_usage',
    description: 'Export usage data in various formats for reporting and analytics',
    inputSchema: wrapZodSchema(NetAppResourceExportUsageSchema)
  ,
    handler: async (context) => {
      return {
        success: false,
        message: 'anf_netapp_resource_export_usage is not yet implemented',
        placeholder: true
      };
    }
  }
];

// =============================================================================
// API CLIENT EXTENSION FOR NETAPP RESOURCE USAGES
// =============================================================================

export interface NetAppResourceUsagesApiMethods {
  // List all resource usages
  listNetAppResourceUsages(params: z.infer<typeof NetAppResourceUsagesListSchema>): Promise<{
    value: Array<{
      id: string;
      name: string;
      type: string;
      properties: {
        resourceType: string;
        currentValue: number;
        limit: number;
        unit: string;
        utilizationPercentage: number;
        lastUpdated: string;
      };
    }>;
  }>;

  // Get specific resource usage
  getNetAppResourceUsage(params: z.infer<typeof NetAppResourceUsagesGetSchema>): Promise<{
    id: string;
    name: string;
    type: string;
    properties: {
      resourceType: string;
      currentValue: number;
      limit: number;
      unit: string;
      utilizationPercentage: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      lastUpdated: string;
      history: Array<{
        timestamp: string;
        value: number;
      }>;
    };
  }>;

  // Get capacity usage
  getNetAppResourceCapacityUsage(params: z.infer<typeof NetAppResourceCapacityUsageSchema>): Promise<{
    location: string;
    timeRange: string;
    granularity: string;
    metrics: Array<{
      timestamp: string;
      totalCapacityTiB: number;
      usedCapacityTiB: number;
      availableCapacityTiB: number;
      utilizationPercentage: number;
      growthRate: number;
    }>;
  }>;

  // Get performance usage
  getNetAppResourcePerformanceUsage(params: z.infer<typeof NetAppResourcePerformanceUsageSchema>): Promise<{
    location: string;
    timeRange: string;
    metrics: {
      throughput: Array<{
        timestamp: string;
        readThroughputMbps: number;
        writeThroughputMbps: number;
        totalThroughputMbps: number;
      }>;
      iops: Array<{
        timestamp: string;
        readIops: number;
        writeIops: number;
        totalIops: number;
      }>;
      latency: Array<{
        timestamp: string;
        readLatencyMs: number;
        writeLatencyMs: number;
        averageLatencyMs: number;
      }>;
    };
  }>;

  // Get resource count usage
  getNetAppResourceCountUsage(params: z.infer<typeof NetAppResourceCountUsageSchema>): Promise<{
    location: string;
    resourceType?: string;
    counts: Array<{
      resourceType: string;
      currentCount: number;
      limit: number;
      utilizationPercentage: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }>;
  }>;

  // Get cost usage
  getNetAppResourceCostUsage(params: z.infer<typeof NetAppResourceCostUsageSchema>): Promise<{
    location: string;
    timeRange: string;
    currency: string;
    totalCost: number;
    costBreakdown: Array<{
      category: string;
      cost: number;
      percentage: number;
      trend: number; // percentage change
    }>;
    groupedBy?: Array<{
      groupName: string;
      cost: number;
      resources: number;
    }>;
  }>;

  // Get account usage
  getNetAppResourceAccountUsage(params: z.infer<typeof NetAppResourceAccountUsageSchema>): Promise<{
    accountName: string;
    timeRange: string;
    usage: {
      capacity: {
        totalTiB: number;
        usedTiB: number;
        availableTiB: number;
      };
      resources: {
        pools: number;
        volumes: number;
        snapshots: number;
        backups: number;
      };
      performance: {
        avgThroughputMbps: number;
        avgIops: number;
        avgLatencyMs: number;
      };
      cost: {
        currentMonth: number;
        projectedMonth: number;
        currency: string;
      };
    };
  }>;

  // Get usage trends
  getNetAppResourceUsageTrends(params: z.infer<typeof NetAppResourceUsageTrendsSchema>): Promise<{
    location: string;
    trendType: string;
    currentUsage: number;
    trends: Array<{
      date: string;
      historicalValue: number;
      forecastValue?: number;
      confidence?: number;
    }>;
    insights: {
      growthRate: number;
      seasonalPattern: boolean;
      recommendations: string[];
    };
  }>;

  // Export usage data
  exportNetAppResourceUsage(params: z.infer<typeof NetAppResourceExportUsageSchema>): Promise<{
    exportId: string;
    status: 'initiated' | 'processing' | 'completed' | 'failed';
    downloadUrl?: string;
    expiresAt?: string;
    fileSize?: number;
    recordCount?: number;
  }>;
}

// =============================================================================
// USAGE METRIC TYPES AND CONSTANTS
// =============================================================================

export const NetAppUsageMetricTypes = {
  CAPACITY_USAGE: 'capacityUsage',
  PERFORMANCE_USAGE: 'performanceUsage',
  RESOURCE_COUNT: 'resourceCount',
  COST_USAGE: 'costUsage',
  THROUGHPUT: 'throughput',
  IOPS: 'iops',
  LATENCY: 'latency',
  CONNECTIONS: 'connections'
} as const;

export const NetAppUsageTimeRanges = {
  ONE_HOUR: '1h',
  SIX_HOURS: '6h',
  TWELVE_HOURS: '12h',
  ONE_DAY: '24h',
  ONE_WEEK: '7d',
  ONE_MONTH: '30d'
} as const;

export const NetAppUsageGranularities = {
  ONE_MINUTE: 'PT1M',
  FIVE_MINUTES: 'PT5M',
  FIFTEEN_MINUTES: 'PT15M',
  THIRTY_MINUTES: 'PT30M',
  ONE_HOUR: 'PT1H',
  SIX_HOURS: 'PT6H',
  TWELVE_HOURS: 'PT12H',
  ONE_DAY: 'P1D'
} as const;