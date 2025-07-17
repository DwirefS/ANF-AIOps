import { z } from 'zod';
import { MetricsQueryClient } from '@azure/monitor-query';
import { Tool } from '../types/tool.js';

const getMetricsSchema = z.object({
  resourceId: z.string().min(1),
  metricNames: z.array(z.string()).optional(),
  timespan: z.string().optional(), // ISO 8601 duration
  interval: z.string().optional(),
  aggregation: z.enum(['Average', 'Count', 'Maximum', 'Minimum', 'Total']).optional(),
});

export const monitoringTools: Tool[] = [
  {
    name: 'anf_get_volume_metrics',
    description: 'Get performance metrics for a volume',
    inputSchema: {
      type: 'object',
      properties: {
        resourceId: { type: 'string', description: 'Full resource ID of the volume' },
        metricNames: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Metrics to retrieve (e.g., VolumeConsumedSize, ReadIops, WriteIops)'
        },
        timespan: { type: 'string', description: 'ISO 8601 duration (e.g., PT1H for 1 hour)' },
        interval: { type: 'string', description: 'Aggregation interval (e.g., PT5M)' },
        aggregation: { 
          type: 'string',
          enum: ['Average', 'Count', 'Maximum', 'Minimum', 'Total'],
          description: 'Aggregation type'
        },
      },
      required: ['resourceId'],
    },
    validate: (args) => {
      const result = getMetricsSchema.safeParse(args);
      return {
        valid: result.success,
        error: result.error?.message,
      };
    },
    handler: async ({ args, credential, logger }) => {
      const params = getMetricsSchema.parse(args);
      
      try {
        const metricsClient = new MetricsQueryClient(credential);
        
        const metricNames = params.metricNames || [
          'VolumeConsumedSize',
          'ReadIops',
          'WriteIops',
          'ReadThroughput',
          'WriteThroughput',
          'AverageReadLatency',
          'AverageWriteLatency',
        ];
        
        const response = await metricsClient.queryResource(
          params.resourceId,
          metricNames,
          {
            timespan: params.timespan || 'PT1H',
            interval: params.interval || 'PT5M',
            aggregations: [params.aggregation || 'Average'],
          }
        );
        
        const metrics = response.metrics.map(metric => ({
          name: metric.name,
          displayName: metric.displayDescription,
          unit: metric.unit,
          timeseries: metric.timeseries?.map(ts => ({
            data: ts.data?.map(dp => ({
              timestamp: dp.timestamp,
              value: dp.average || dp.total || dp.maximum || dp.minimum || dp.count,
            })),
          })),
        }));
        
        return {
          success: true,
          resourceId: params.resourceId,
          timespan: response.timespan,
          interval: response.interval,
          metrics,
        };
      } catch (error) {
        logger.error('Failed to get metrics', { error, params });
        throw error;
      }
    },
  },
  
  {
    name: 'anf_check_volume_health',
    description: 'Check health status and alerts for a volume',
    inputSchema: {
      type: 'object',
      properties: {
        accountName: { type: 'string', description: 'NetApp account name' },
        poolName: { type: 'string', description: 'Capacity pool name' },
        volumeName: { type: 'string', description: 'Volume name' },
      },
      required: ['accountName', 'poolName', 'volumeName'],
    },
    handler: async ({ args, netAppClient, config }) => {
      const volume = await netAppClient.volumes.get(
        config.azure.resourceGroup,
        args.accountName,
        args.poolName,
        args.volumeName
      );
      
      const usagePercentage = volume.consumedSize && volume.usageThreshold
        ? (volume.consumedSize / volume.usageThreshold) * 100
        : 0;
      
      const alerts = [];
      
      // Check capacity
      if (usagePercentage > 90) {
        alerts.push({
          severity: 'critical',
          message: `Volume is ${usagePercentage.toFixed(1)}% full`,
          recommendation: 'Consider increasing volume size',
        });
      } else if (usagePercentage > 80) {
        alerts.push({
          severity: 'warning',
          message: `Volume is ${usagePercentage.toFixed(1)}% full`,
          recommendation: 'Monitor capacity usage closely',
        });
      }
      
      // Check provisioning state
      if (volume.provisioningState !== 'Succeeded') {
        alerts.push({
          severity: 'warning',
          message: `Volume provisioning state: ${volume.provisioningState}`,
          recommendation: 'Check volume status',
        });
      }
      
      return {
        success: true,
        health: {
          volumeName: volume.name,
          provisioningState: volume.provisioningState,
          usagePercentage: usagePercentage.toFixed(2),
          consumedSize: volume.consumedSize,
          usageThreshold: volume.usageThreshold,
          alerts,
          status: alerts.some(a => a.severity === 'critical') ? 'critical' :
                  alerts.some(a => a.severity === 'warning') ? 'warning' : 'healthy',
        },
      };
    },
  },
];