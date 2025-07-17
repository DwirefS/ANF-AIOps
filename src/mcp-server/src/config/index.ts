import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration schema
const configSchema = z.object({
  azure: z.object({
    subscriptionId: z.string().min(1),
    resourceGroup: z.string().min(1),
    location: z.string().min(1),
    tenantId: z.string().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
  }),
  monitoring: z.object({
    workspaceId: z.string().min(1),
    applicationInsightsKey: z.string().optional(),
  }),
  security: z.object({
    keyVaultUrl: z.string().url(),
    allowedIPs: z.array(z.string()).optional(),
    enableAuditLogging: z.boolean().default(true),
  }),
  server: z.object({
    port: z.number().default(3000),
    environment: z.enum(['development', 'staging', 'production']).default('development'),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  }),
  limits: z.object({
    maxVolumeSize: z.number().default(102400), // 100TB in GB
    minVolumeSize: z.number().default(100), // 100GB
    maxSnapshotsPerVolume: z.number().default(255),
    requestTimeout: z.number().default(300000), // 5 minutes
  }),
});

// Parse and validate configuration
const parseConfig = () => {
  try {
    return configSchema.parse({
      azure: {
        subscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
        resourceGroup: process.env.AZURE_RESOURCE_GROUP!,
        location: process.env.AZURE_LOCATION || 'eastus',
        tenantId: process.env.AZURE_TENANT_ID,
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
      },
      monitoring: {
        workspaceId: process.env.LOG_ANALYTICS_WORKSPACE_ID!,
        applicationInsightsKey: process.env.APPLICATION_INSIGHTS_KEY,
      },
      security: {
        keyVaultUrl: process.env.KEY_VAULT_URL!,
        allowedIPs: process.env.ALLOWED_IPS?.split(','),
        enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING !== 'false',
      },
      server: {
        port: parseInt(process.env.PORT || '3000', 10),
        environment: process.env.NODE_ENV as any || 'development',
        logLevel: process.env.LOG_LEVEL as any || 'info',
      },
      limits: {
        maxVolumeSize: parseInt(process.env.MAX_VOLUME_SIZE || '102400', 10),
        minVolumeSize: parseInt(process.env.MIN_VOLUME_SIZE || '100', 10),
        maxSnapshotsPerVolume: parseInt(process.env.MAX_SNAPSHOTS_PER_VOLUME || '255', 10),
        requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '300000', 10),
      },
    });
  } catch (error) {
    console.error('Configuration validation failed:', error);
    throw new Error('Invalid configuration');
  }
};

export const config = parseConfig();

// Export typed config
export type Config = z.infer<typeof configSchema>;