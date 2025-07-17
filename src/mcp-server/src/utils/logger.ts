import winston from 'winston';
import { config } from '../config/index.js';

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
      correlationId: meta.correlationId || 'system',
      service: 'anf-mcp-server',
    });
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.server.logLevel,
  format: structuredFormat,
  defaultMeta: {
    environment: config.server.environment,
  },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: config.server.environment === 'development' ? consoleFormat : structuredFormat,
    }),
  ],
});

// Add file transport for production
if (config.server.environment === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
  
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    })
  );
}

// Utility functions for structured logging
export const loggers = {
  tool: (toolName: string, action: string, data?: any) => {
    logger.info(`Tool ${toolName}: ${action}`, {
      tool: toolName,
      action,
      ...data,
    });
  },
  
  security: (event: string, data?: any) => {
    logger.warn(`Security event: ${event}`, {
      securityEvent: event,
      ...data,
    });
  },
  
  audit: (action: string, user: string, resource: string, data?: any) => {
    if (config.security.enableAuditLogging) {
      logger.info('Audit log', {
        auditAction: action,
        user,
        resource,
        timestamp: new Date().toISOString(),
        ...data,
      });
    }
  },
  
  performance: (operation: string, duration: number, data?: any) => {
    logger.info(`Performance: ${operation}`, {
      operation,
      durationMs: duration,
      ...data,
    });
  },
};