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
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Combine all tools
const allTools = [
  ...volumeTools,
  ...poolTools,
  ...snapshotTools,
  ...monitoringTools,
  ...securityTools,
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