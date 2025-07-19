/**
 * Generic Tool Handler Utility
 * Provides common handler patterns for MCP tools
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import { ToolContext } from '../types/tool';
import { logger } from './logger';

/**
 * Creates a generic handler function for tools
 * This reduces boilerplate and ensures consistent error handling
 */
export function createToolHandler(
  toolName: string,
  implementation: (context: ToolContext) => Promise<any>
) {
  return async (context: ToolContext) => {
    const startTime = Date.now();
    const operationId = `${toolName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Log operation start
      logger.info(`Starting ${toolName} operation`, {
        operation: toolName,
        operationId,
        args: JSON.stringify(context.args).substring(0, 200), // Truncate for security
        user: 'system' // In production, this would be from auth context
      });

      // Execute the implementation
      const result = await implementation(context);

      // Log successful completion
      const duration = Date.now() - startTime;
      logger.info(`Completed ${toolName} operation`, {
        operation: toolName,
        operationId,
        duration,
        status: 'success'
      });

      return {
        ...result,
        _metadata: {
          operationId,
          duration,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error
      logger.error(`Failed ${toolName} operation`, {
        operation: toolName,
        operationId,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Rethrow with additional context
      throw new Error(
        `${toolName} operation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  };
}

/**
 * Creates a placeholder handler for unimplemented tools
 * This allows the code to compile while implementation is pending
 */
export function createPlaceholderHandler(toolName: string) {
  return createToolHandler(toolName, async (context) => {
    logger.warn(`Placeholder handler called for ${toolName}`, {
      args: context.args
    });
    
    return {
      success: false,
      message: `${toolName} is not yet implemented`,
      placeholder: true
    };
  });
}