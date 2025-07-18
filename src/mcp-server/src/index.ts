import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { DefaultAzureCredential } from '@azure/identity';
import { NetAppManagementClient } from '@azure/arm-netapp';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';
import { volumeTools } from './tools/volumes.js';
import { poolTools } from './tools/pools.js';
import { snapshotTools } from './tools/snapshots.js';
import { monitoringTools } from './tools/monitoring.js';
import { securityTools } from './tools/security.js';
import { accountTools } from './tools/accounts.js';
import { volumeToolsEnhanced } from './tools/volumes-enhanced.js';
import { securityComplianceTools } from './tools/security-compliance.js';
import { comprehensiveAnfApiTools } from './tools/comprehensive-anf-api.js';
import { backupOperationsTools } from './tools/backup-operations.js';
import { advancedAnfOperationsTools } from './tools/advanced-anf-operations.js';

// New separate operation group tools for complete ANF REST API coverage (19 operation groups)
import { netAppResourceQuotaLimitsTools } from './tools/netapp-resource-quota-limits.js';
import { netAppResourceRegionInfosTools } from './tools/netapp-resource-region-infos.js';
import { netAppResourceUsagesTools } from './tools/netapp-resource-usages.js';
import { operationsTools } from './tools/operations.js';
import { backupsUnderAccountTools } from './tools/backups-under-account.js';
import { backupsUnderBackupVaultTools } from './tools/backups-under-backup-vault.js';
import { backupsUnderVolumeTools } from './tools/backups-under-volume.js';
import { netAppResourceTools } from './tools/netapp-resource.js';
import { accountsOperationsTools } from './tools/accounts-operations.js';
import { poolsOperationsTools } from './tools/pools-operations.js';
import { volumesOperationsTools } from './tools/volumes-operations.js';
import { snapshotsOperationsTools } from './tools/snapshots-operations.js';
import { backupPoliciesOperationsTools } from './tools/backup-policies-operations.js';
import { backupVaultsOperationsTools } from './tools/backup-vaults-operations.js';
import { backupsOperationsTools } from './tools/backups-operations.js';
import { snapshotPoliciesOperationsTools } from './tools/snapshot-policies-operations.js';
import { subvolumesOperationsTools } from './tools/subvolumes-operations.js';
import { volumeGroupsOperationsTools } from './tools/volume-groups-operations.js';
import { volumeQuotaRulesOperationsTools } from './tools/volume-quota-rules-operations.js';

// Initialize Azure clients
const credential = new DefaultAzureCredential();
const netAppClient = new NetAppManagementClient(
  credential,
  config.azure.subscriptionId
);

// Create MCP server
const server = new Server(
  {
    name: 'anf-mcp-server',
    version: '2.0.0', // Complete ANF REST API 2025-03-01 coverage with 19 operation groups
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Combine all tools - comprehensive ANF API coverage with all 19 operation groups
const allTools = [
  // Core ANF resource management (legacy tools for backward compatibility)
  ...volumeTools,
  ...poolTools,
  ...snapshotTools,
  ...accountTools,
  
  // Enhanced enterprise features
  ...volumeToolsEnhanced,
  
  // Monitoring and analytics
  ...monitoringTools,
  
  // Security and compliance
  ...securityTools,
  ...securityComplianceTools,
  
  // Comprehensive ANF REST API 2025-03-01 coverage (100+ operations)
  ...comprehensiveAnfApiTools,
  
  // Backup operations (Backup Policies, Vaults, Backups)
  ...backupOperationsTools,
  
  // Advanced operations (Snapshot Policies, Subvolumes, Volume Groups, Quota Rules, NetApp Resources)
  ...advancedAnfOperationsTools,
  
  // Complete 19 operation groups for ANF REST API 2025-03-01
  ...accountsOperationsTools,         // 1. Accounts (13 operations)
  ...poolsOperationsTools,           // 2. Pools (5 operations)
  ...volumesOperationsTools,         // 3. Volumes (26 operations)
  ...snapshotsOperationsTools,       // 4. Snapshots (8 operations)
  ...backupPoliciesOperationsTools,  // 5. Backup Policies (5 operations)
  ...backupVaultsOperationsTools,    // 6. Backup Vaults (7 operations)
  ...backupsOperationsTools,         // 7. Backups (15 operations)
  ...backupsUnderAccountTools,       // 8. Backups Under Account (9 operations)
  ...backupsUnderBackupVaultTools,   // 9. Backups Under Backup Vault (10 operations)
  ...backupsUnderVolumeTools,        // 10. Backups Under Volume (10 operations)
  ...netAppResourceTools,            // 11. NetApp Resource (10 operations)
  ...netAppResourceQuotaLimitsTools, // 12. NetApp Resource Quota Limits (6 operations)
  ...netAppResourceRegionInfosTools, // 13. NetApp Resource Region Infos (9 operations)
  ...netAppResourceUsagesTools,      // 14. NetApp Resource Usages (9 operations)
  ...operationsTools,                // 15. Operations (7 operations)
  ...snapshotPoliciesOperationsTools, // 16. Snapshot Policies (9 operations)
  ...subvolumesOperationsTools,      // 17. Subvolumes (8 operations)
  ...volumeGroupsOperationsTools,    // 18. Volume Groups (6 operations)
  ...volumeQuotaRulesOperationsTools, // 19. Volume Quota Rules (6 operations)
];

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  const tool = allTools.find(t => t.name === name);
  if (!tool) {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Tool "${name}" not found`
    );
  }

  try {
    logger.info(`Executing tool: ${name}`, { args });
    
    // Validate input
    if (tool.validate) {
      const validation = tool.validate(args);
      if (!validation.valid) {
        throw new McpError(
          ErrorCode.InvalidParams,
          validation.error || 'Invalid parameters'
        );
      }
    }

    // Execute tool with Azure client context
    const result = await tool.handler({
      args,
      netAppClient,
      credential,
      config,
      logger,
    });

    logger.info(`Tool executed successfully: ${name}`, { result });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error(`Tool execution failed: ${name}`, { error });
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to execute tool "${name}": ${error.message}`
    );
  }
});

// Start server
async function main() {
  try {
    logger.info('Starting ANF MCP Server...');
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger.info('ANF MCP Server started successfully');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down ANF MCP Server...');
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start ANF MCP Server', { error });
    process.exit(1);
  }
}

main();