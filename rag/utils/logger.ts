/**
 * Logger Utility for ANF-AIOps RAG System
 * 
 * Provides structured logging with support for different log levels,
 * Application Insights integration, and formatted console output.
 * 
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 * @version 1.0.0
 */

import * as winston from 'winston';
import { TelemetryClient } from 'applicationinsights';
import * as path from 'path';

/**
 * Log levels supported by the logger
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

/**
 * Logger class providing structured logging capabilities
 */
export class Logger {
  private winston: winston.Logger;
  private context: string;
  private telemetryClient?: TelemetryClient;

  /**
   * Create a new logger instance
   * 
   * @param context - Context/module name for log entries
   * @param telemetryClient - Optional Application Insights client
   */
  constructor(context: string, telemetryClient?: TelemetryClient) {
    this.context = context;
    this.telemetryClient = telemetryClient;

    // Create winston logger
    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'anf-aiops-rag', context: this.context },
      transports: this.createTransports()
    });
  }

  /**
   * Create winston transports based on environment
   */
  private createTransports(): winston.transport[] {
    const transports: winston.transport[] = [];

    // Console transport with color coding
    if (process.env.NODE_ENV !== 'test') {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
              return `${timestamp} [${context}] ${level}: ${message} ${metaStr}`;
            })
          )
        })
      );
    }

    // File transport for production
    if (process.env.NODE_ENV === 'production') {
      transports.push(
        new winston.transports.File({
          filename: path.join('logs', 'error.log'),
          level: 'error'
        }),
        new winston.transports.File({
          filename: path.join('logs', 'combined.log')
        })
      );
    }

    return transports;
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | any, meta?: any): void {
    this.winston.error(message, { error: error?.stack || error, ...meta });
    
    if (this.telemetryClient) {
      this.telemetryClient.trackException({
        exception: error instanceof Error ? error : new Error(message),
        properties: { context: this.context, ...meta }
      });
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta?: any): void {
    this.winston.warn(message, meta);
    
    if (this.telemetryClient) {
      this.telemetryClient.trackTrace({
        message,
        severity: 2, // Warning
        properties: { context: this.context, ...meta }
      });
    }
  }

  /**
   * Log an info message
   */
  info(message: string, meta?: any): void {
    this.winston.info(message, meta);
    
    if (this.telemetryClient) {
      this.telemetryClient.trackTrace({
        message,
        severity: 1, // Information
        properties: { context: this.context, ...meta }
      });
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, meta?: any): void {
    this.winston.debug(message, meta);
  }

  /**
   * Log a verbose message
   */
  verbose(message: string, meta?: any): void {
    this.winston.verbose(message, meta);
  }

  /**
   * Track a custom metric
   */
  metric(name: string, value: number, properties?: any): void {
    this.winston.info(`Metric: ${name}=${value}`, properties);
    
    if (this.telemetryClient) {
      this.telemetryClient.trackMetric({
        name,
        value,
        properties: { context: this.context, ...properties }
      });
    }
  }

  /**
   * Track a custom event
   */
  event(name: string, properties?: any, measurements?: any): void {
    this.winston.info(`Event: ${name}`, { properties, measurements });
    
    if (this.telemetryClient) {
      this.telemetryClient.trackEvent({
        name,
        properties: { context: this.context, ...properties },
        measurements
      });
    }
  }

  /**
   * Start a timer for performance measurement
   */
  startTimer(): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      return duration;
    };
  }
}

// Export a default logger instance
export default new Logger('RAG-System');