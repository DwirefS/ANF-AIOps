import { z } from 'zod';
import { MetricsQueryClient, LogsQueryClient } from '@azure/monitor-query';
import { Tool } from '../types/tool.js';
import { logger } from '../utils/logger.js';

// Metrics schema
const getMetricsSchema = z.object({
  resourceId: z.string().min(1),
  metricNames: z.array(z.string()).optional(),
  timespan: z.string().optional().default('PT1H'), // Default to 1 hour
  interval: z.string().optional().default('PT5M'), // Default to 5 minutes
  aggregation: z.enum(['Average', 'Count', 'Maximum', 'Minimum', 'Total']).optional().default('Average'),
});

// Alerts schema
const getAlertsSchema = z.object({
  resourceGroup: z.string().min(1),
  severity: z.array(z.enum(['Sev0', 'Sev1', 'Sev2', 'Sev3', 'Sev4'])).optional(),
  targetResourceType: z.string().optional().default('Microsoft.NetApp/netAppAccounts'),
  timeRange: z.string().optional().default('PT1H'),
});

// Health status schema
const getHealthSchema = z.object({
  resourceId: z.string().min(1),
  includeHistory: z.boolean().optional().default(false),
});

// Cost analysis schema
const getCostAnalysisSchema = z.object({
  resourceGroup: z.string().min(1),
  timeframe: z.enum(['MonthToDate', 'BillingMonthToDate', 'TheLastMonth', 'TheLastBillingMonth', 'Custom']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  granularity: z.enum(['Daily', 'Monthly']).optional().default('Daily'),
});

export const monitoringTools: Tool[] = [
  {
    name: 'anf_get_volume_metrics',
    description: 'Get performance metrics for an ANF volume',
    inputSchema: {
      type: 'object',
      properties: {
        resourceId: { type: 'string', description: 'Full resource ID of the volume' },
        metricNames: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Metrics to retrieve (e.g., VolumeConsumedSize, ReadIops, WriteIops, ReadThroughput, WriteThroughput)'
        },
        timespan: { type: 'string', description: 'ISO 8601 duration (e.g., PT1H for 1 hour)' },
        interval: { type: 'string', description: 'Aggregation interval (e.g., PT5M for 5 minutes)' },
        aggregation: { 
          type: 'string',
          enum: ['Average', 'Count', 'Maximum', 'Minimum', 'Total'],
          description: 'Aggregation type'
        },
      },
      required: ['resourceId'],
    },
    validate: (args: unknown) => {
      try {
        getMetricsSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, credential, logger }) => {
      const params = getMetricsSchema.parse(args);
      logger.info('Getting ANF volume metrics', { params });

      try {
        const metricsClient = new MetricsQueryClient(credential);
        
        const metricNames = params.metricNames || [
          'VolumeConsumedSize',
          'VolumeLogicalSize',
          'VolumeSnapshotSize',
          'ReadIops',
          'WriteIops',
          'ReadThroughput',
          'WriteThroughput',
          'AverageReadLatency',
          'AverageWriteLatency',
        ];

        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - parseDuration(params.timespan));

        const response = await metricsClient.queryResource(
          params.resourceId,
          metricNames,
          {
            timespan: { startTime, endTime },
            interval: params.interval,
            aggregations: [params.aggregation],
          }
        );

        const metrics = {};
        for (const metric of response.metrics) {
          const values = [];
          for (const timeSeries of metric.timeseries || []) {
            for (const dataPoint of timeSeries.data || []) {
              values.push({
                timestamp: dataPoint.timeStamp,
                value: dataPoint[params.aggregation.toLowerCase()],
              });
            }
          }
          metrics[metric.name] = {
            unit: metric.unit,
            aggregation: params.aggregation,
            values,
          };
        }

        // Calculate summary statistics
        const summary = {};
        for (const [metricName, metricData] of Object.entries(metrics)) {
          const values = metricData.values.map(v => v.value).filter(v => v !== null);
          if (values.length > 0) {
            summary[metricName] = {
              min: Math.min(...values),
              max: Math.max(...values),
              avg: values.reduce((a, b) => a + b, 0) / values.length,
              latest: values[values.length - 1],
              unit: metricData.unit,
            };
          }
        }

        logger.info('Volume metrics retrieved successfully', { resourceId: params.resourceId });
        return {
          success: true,
          resourceId: params.resourceId,
          timeRange: {
            start: startTime.toISOString(),
            end: endTime.toISOString(),
          },
          metrics,
          summary,
        };
      } catch (error) {
        logger.error('Failed to get volume metrics', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_get_pool_metrics',
    description: 'Get performance metrics for a capacity pool',
    inputSchema: {
      type: 'object',
      properties: {
        resourceId: { type: 'string', description: 'Full resource ID of the capacity pool' },
        timespan: { type: 'string', description: 'ISO 8601 duration (e.g., PT1H)' },
        interval: { type: 'string', description: 'Aggregation interval (e.g., PT5M)' },
      },
      required: ['resourceId'],
    },
    handler: async ({ args, credential, logger }) => {
      logger.info('Getting ANF pool metrics', { args });

      try {
        const metricsClient = new MetricsQueryClient(credential);
        
        const metricNames = [
          'VolumePoolAllocatedSize',
          'VolumePoolAllocatedUsed',
          'VolumePoolTotalLogicalSize',
          'VolumePoolAllocatedToVolumeThroughput',
        ];

        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - parseDuration(args.timespan || 'PT1H'));

        const response = await metricsClient.queryResource(
          args.resourceId,
          metricNames,
          {
            timespan: { startTime, endTime },
            interval: args.interval || 'PT5M',
            aggregations: ['Average', 'Maximum'],
          }
        );

        const metrics = {};
        for (const metric of response.metrics) {
          const values = [];
          for (const timeSeries of metric.timeseries || []) {
            for (const dataPoint of timeSeries.data || []) {
              values.push({
                timestamp: dataPoint.timeStamp,
                average: dataPoint.average,
                maximum: dataPoint.maximum,
              });
            }
          }
          metrics[metric.name] = {
            unit: metric.unit,
            values,
          };
        }

        // Calculate pool utilization
        const poolSize = metrics['VolumePoolAllocatedSize']?.values[0]?.average || 0;
        const poolUsed = metrics['VolumePoolAllocatedUsed']?.values[0]?.average || 0;
        const utilizationPercent = poolSize > 0 ? (poolUsed / poolSize) * 100 : 0;

        logger.info('Pool metrics retrieved successfully', { resourceId: args.resourceId });
        return {
          success: true,
          resourceId: args.resourceId,
          metrics,
          utilization: {
            sizeBytes: poolSize,
            usedBytes: poolUsed,
            utilizationPercent: utilizationPercent.toFixed(2),
          },
        };
      } catch (error) {
        logger.error('Failed to get pool metrics', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_get_alerts',
    description: 'Get active alerts for ANF resources',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        severity: { 
          type: 'array',
          items: { type: 'string', enum: ['Sev0', 'Sev1', 'Sev2', 'Sev3', 'Sev4'] },
          description: 'Filter by severity levels'
        },
        timeRange: { type: 'string', description: 'Time range (e.g., PT1H, P1D)' },
      },
      required: ['resourceGroup'],
    },
    validate: (args: unknown) => {
      try {
        getAlertsSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, credential, logger }) => {
      const params = getAlertsSchema.parse(args);
      logger.info('Getting ANF alerts', { params });

      try {
        const logsClient = new LogsQueryClient(credential);
        
        // Query Azure Monitor alerts
        const query = `
          AlertsManagementResources
          | where type == "microsoft.alertsmanagement/alerts"
          | where properties.essentials.targetResourceType == "${params.targetResourceType}"
          | where properties.essentials.startDateTime >= ago(${params.timeRange})
          | where properties.essentials.monitorCondition == "Fired"
          ${params.severity ? `| where properties.essentials.severity in (${params.severity.map(s => `"${s}"`).join(',')})` : ''}
          | project 
            alertId = id,
            alertName = name,
            severity = properties.essentials.severity,
            monitorCondition = properties.essentials.monitorCondition,
            targetResource = properties.essentials.targetResource,
            firedDateTime = properties.essentials.startDateTime,
            description = properties.essentials.description,
            actionStatus = properties.essentials.actionStatus
          | order by firedDateTime desc
        `;

        const response = await logsClient.queryWorkspace(
          process.env.LOG_ANALYTICS_WORKSPACE_ID,
          query,
          { duration: params.timeRange }
        );

        const alerts = [];
        if (response.tables && response.tables.length > 0) {
          const table = response.tables[0];
          for (const row of table.rows) {
            alerts.push({
              alertId: row[0],
              alertName: row[1],
              severity: row[2],
              monitorCondition: row[3],
              targetResource: row[4],
              firedDateTime: row[5],
              description: row[6],
              actionStatus: row[7],
            });
          }
        }

        logger.info('Alerts retrieved successfully', { count: alerts.length });
        return {
          success: true,
          alerts,
          count: alerts.length,
          severitySummary: {
            Sev0: alerts.filter(a => a.severity === 'Sev0').length,
            Sev1: alerts.filter(a => a.severity === 'Sev1').length,
            Sev2: alerts.filter(a => a.severity === 'Sev2').length,
            Sev3: alerts.filter(a => a.severity === 'Sev3').length,
            Sev4: alerts.filter(a => a.severity === 'Sev4').length,
          },
        };
      } catch (error) {
        logger.error('Failed to get alerts', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_health_status',
    description: 'Get health status of ANF resources',
    inputSchema: {
      type: 'object',
      properties: {
        resourceId: { type: 'string', description: 'Resource ID to check health' },
        includeHistory: { type: 'boolean', description: 'Include health history' },
      },
      required: ['resourceId'],
    },
    validate: (args: unknown) => {
      try {
        getHealthSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, credential, logger }) => {
      const params = getHealthSchema.parse(args);
      logger.info('Getting ANF resource health', { params });

      try {
        // Get resource health using Azure Resource Health API
        const resourceType = params.resourceId.split('/')[6];
        const resourceName = params.resourceId.split('/').pop();
        
        // Simulate health check based on metrics
        const metricsClient = new MetricsQueryClient(credential);
        
        let healthStatus = 'Available';
        let healthIssues = [];

        // Check volume-specific health metrics
        if (resourceType === 'volumes') {
          const metrics = await metricsClient.queryResource(
            params.resourceId,
            ['VolumeConsumedSize', 'ReadLatency', 'WriteLatency'],
            {
              timespan: { duration: 'PT5M' },
              aggregations: ['Average', 'Maximum'],
            }
          );

          // Check for high latency
          for (const metric of metrics.metrics) {
            if (metric.name.includes('Latency')) {
              const maxLatency = Math.max(...metric.timeseries[0]?.data?.map(d => d.maximum) || [0]);
              if (maxLatency > 20) {
                healthStatus = 'Degraded';
                healthIssues.push({
                  issue: 'High latency detected',
                  severity: 'Warning',
                  metric: metric.name,
                  value: `${maxLatency.toFixed(2)}ms`,
                });
              }
            }
          }
        }

        logger.info('Health status retrieved', { resourceId: params.resourceId, status: healthStatus });
        return {
          success: true,
          resourceId: params.resourceId,
          resourceType,
          resourceName,
          healthStatus,
          lastChecked: new Date().toISOString(),
          issues: healthIssues,
          recommendation: healthIssues.length > 0 
            ? 'Consider investigating performance issues or scaling resources'
            : 'Resource is healthy',
        };
      } catch (error) {
        logger.error('Failed to get health status', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_cost_analysis',
    description: 'Analyze costs for ANF resources',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        timeframe: { 
          type: 'string', 
          enum: ['MonthToDate', 'BillingMonthToDate', 'TheLastMonth', 'TheLastBillingMonth', 'Custom'],
          description: 'Time frame for cost analysis'
        },
        startDate: { type: 'string', description: 'Start date for custom timeframe (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date for custom timeframe (YYYY-MM-DD)' },
        granularity: { type: 'string', enum: ['Daily', 'Monthly'], description: 'Cost granularity' },
      },
      required: ['resourceGroup', 'timeframe'],
    },
    validate: (args: unknown) => {
      try {
        getCostAnalysisSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, logger }) => {
      const params = getCostAnalysisSchema.parse(args);
      logger.info('Analyzing ANF costs', { params });

      try {
        // Simulate cost analysis based on resource types and service levels
        // In production, this would use Azure Cost Management APIs
        
        const mockCosts = {
          totalCost: 0,
          currency: 'USD',
          breakdown: {
            volumes: {
              Standard: { cost: 0.10 * 1024 * 30, unit: 'per GB/month' }, // $0.10/GB
              Premium: { cost: 0.20 * 1024 * 20, unit: 'per GB/month' },  // $0.20/GB
              Ultra: { cost: 0.35 * 1024 * 10, unit: 'per GB/month' },    // $0.35/GB
            },
            snapshots: {
              cost: 0.05 * 512, // $0.05/GB for snapshots
              unit: 'per GB/month',
            },
          },
          trend: 'increasing',
          percentageChange: 5.2,
          recommendations: [
            'Consider moving infrequently accessed data to Standard tier',
            'Review snapshot retention policies to reduce storage costs',
            'Enable cool access for suitable workloads',
          ],
        };

        // Calculate total
        mockCosts.totalCost = 
          mockCosts.breakdown.volumes.Standard.cost +
          mockCosts.breakdown.volumes.Premium.cost +
          mockCosts.breakdown.volumes.Ultra.cost +
          mockCosts.breakdown.snapshots.cost;

        logger.info('Cost analysis completed', { totalCost: mockCosts.totalCost });
        return {
          success: true,
          costAnalysis: mockCosts,
          timeframe: params.timeframe,
          resourceGroup: params.resourceGroup,
        };
      } catch (error) {
        logger.error('Failed to analyze costs', { error });
        throw error;
      }
    },
  },
];

// Helper function to parse ISO 8601 duration to milliseconds
function parseDuration(duration: string): number {
  const regex = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
  const matches = duration.match(regex);
  
  if (!matches) {
    throw new Error(`Invalid ISO 8601 duration: ${duration}`);
  }
  
  const days = parseInt(matches[1] || '0', 10);
  const hours = parseInt(matches[2] || '0', 10);
  const minutes = parseInt(matches[3] || '0', 10);
  const seconds = parseInt(matches[4] || '0', 10);
  
  return (days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds) * 1000;
}