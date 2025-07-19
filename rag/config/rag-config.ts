/**
 * RAG System Configuration for ANF-AIOps
 * 
 * This file contains all configuration settings for the RAG system including
 * Azure service endpoints, processing parameters, security settings, and
 * integration configurations.
 * 
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 * @version 1.0.0
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Main configuration interface for the RAG system
 */
export interface RAGConfig {
  /** Azure Cognitive Search configuration */
  search: SearchConfig;
  
  /** Azure OpenAI configuration */
  openai: OpenAIConfig;
  
  /** Azure Storage configuration */
  storage: StorageConfig;
  
  /** Document processing configuration */
  processing: ProcessingConfig;
  
  /** Security and authentication configuration */
  security: SecurityConfig;
  
  /** MCP server integration configuration */
  mcp: MCPConfig;
  
  /** System performance configuration */
  performance: PerformanceConfig;
  
  /** Logging and monitoring configuration */
  monitoring: MonitoringConfig;
}

/**
 * Azure Cognitive Search configuration
 */
export interface SearchConfig {
  endpoint: string;
  apiKey: string;
  indexName: string;
  semanticConfigName: string;
  apiVersion: string;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Azure OpenAI configuration
 */
export interface OpenAIConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  embeddingModel: string;
  apiVersion: string;
  maxTokens: number;
  temperature: number;
}

/**
 * Azure Storage configuration
 */
export interface StorageConfig {
  connectionString: string;
  containerName: string;
  maxFileSize: number;
  allowedFileTypes: string[];
  sasTokenDuration: number;
}

/**
 * Document processing configuration
 */
export interface ProcessingConfig {
  chunkSize: number;
  chunkOverlap: number;
  maxChunksPerDocument: number;
  batchSize: number;
  supportedFormats: string[];
  textExtractionTimeout: number;
  enableOCR: boolean;
  ocrLanguages: string[];
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  enableAuthentication: boolean;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  allowedOrigins: string[];
  tokenExpiration: number;
  enableRateLimiting: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number;
}

/**
 * MCP server integration configuration
 */
export interface MCPConfig {
  serverUrl: string;
  apiKey: string;
  timeout: number;
  maxRetries: number;
  enableCaching: boolean;
  cacheExpiration: number;
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  enableCaching: boolean;
  cacheSize: number;
  cacheTTL: number;
  maxConcurrentRequests: number;
  requestTimeout: number;
  enableCompression: boolean;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  logLevel: string;
  enableApplicationInsights: boolean;
  instrumentationKey: string;
  enableMetrics: boolean;
  metricsInterval: number;
  enableTracing: boolean;
  samplingRate: number;
}

/**
 * Get environment variable with fallback
 * 
 * @param key - Environment variable key
 * @param defaultValue - Default value if not found
 * @returns Environment variable value or default
 */
function getEnvVar(key: string, defaultValue: string = ''): string {
  const value = process.env[key];
  if (value === undefined && !defaultValue) {
    console.warn(`Environment variable ${key} is not set`);
  }
  return value || defaultValue;
}

/**
 * Get numeric environment variable with fallback
 * 
 * @param key - Environment variable key
 * @param defaultValue - Default numeric value
 * @returns Parsed number or default
 */
function getNumericEnvVar(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get boolean environment variable with fallback
 * 
 * @param key - Environment variable key
 * @param defaultValue - Default boolean value
 * @returns Parsed boolean or default
 */
function getBooleanEnvVar(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

/**
 * Main RAG configuration object
 * 
 * This configuration is loaded from environment variables with sensible defaults
 * for development and production environments.
 */
export const ragConfig: RAGConfig = {
  // Azure Cognitive Search configuration
  search: {
    endpoint: getEnvVar('AZURE_SEARCH_ENDPOINT'),
    apiKey: getEnvVar('AZURE_SEARCH_ADMIN_KEY'),
    indexName: getEnvVar('AZURE_SEARCH_INDEX_NAME', 'anf-knowledge-base'),
    semanticConfigName: getEnvVar('AZURE_SEARCH_SEMANTIC_CONFIG', 'anf-semantic-config'),
    apiVersion: getEnvVar('AZURE_SEARCH_API_VERSION', '2023-11-01'),
    maxRetries: getNumericEnvVar('AZURE_SEARCH_MAX_RETRIES', 3),
    retryDelay: getNumericEnvVar('AZURE_SEARCH_RETRY_DELAY', 1000)
  },

  // Azure OpenAI configuration
  openai: {
    endpoint: getEnvVar('AZURE_OPENAI_ENDPOINT'),
    apiKey: getEnvVar('AZURE_OPENAI_API_KEY'),
    deploymentName: getEnvVar('AZURE_OPENAI_DEPLOYMENT_NAME', 'text-embedding-ada-002'),
    embeddingModel: getEnvVar('AZURE_OPENAI_EMBEDDING_MODEL', 'text-embedding-ada-002'),
    apiVersion: getEnvVar('AZURE_OPENAI_API_VERSION', '2023-05-15'),
    maxTokens: getNumericEnvVar('AZURE_OPENAI_MAX_TOKENS', 8191),
    temperature: parseFloat(getEnvVar('AZURE_OPENAI_TEMPERATURE', '0'))
  },

  // Azure Storage configuration
  storage: {
    connectionString: getEnvVar('AZURE_STORAGE_CONNECTION_STRING'),
    containerName: getEnvVar('AZURE_STORAGE_CONTAINER_NAME', 'documents'),
    maxFileSize: getNumericEnvVar('MAX_FILE_SIZE', 52428800), // 50MB
    allowedFileTypes: getEnvVar('ALLOWED_FILE_TYPES', '.pdf,.md,.txt,.json').split(','),
    sasTokenDuration: getNumericEnvVar('SAS_TOKEN_DURATION', 3600)
  },

  // Document processing configuration
  processing: {
    chunkSize: getNumericEnvVar('CHUNK_SIZE', 1000),
    chunkOverlap: getNumericEnvVar('CHUNK_OVERLAP', 200),
    maxChunksPerDocument: getNumericEnvVar('MAX_CHUNKS_PER_DOCUMENT', 1000),
    batchSize: getNumericEnvVar('BATCH_SIZE', 16),
    supportedFormats: getEnvVar('SUPPORTED_FORMATS', '.pdf,.md,.txt,.json').split(','),
    textExtractionTimeout: getNumericEnvVar('TEXT_EXTRACTION_TIMEOUT', 30000),
    enableOCR: getBooleanEnvVar('ENABLE_OCR', false),
    ocrLanguages: getEnvVar('OCR_LANGUAGES', 'en').split(',')
  },

  // Security configuration
  security: {
    enableAuthentication: getBooleanEnvVar('ENABLE_AUTHENTICATION', true),
    tenantId: getEnvVar('AZURE_TENANT_ID'),
    clientId: getEnvVar('AZURE_CLIENT_ID'),
    clientSecret: getEnvVar('AZURE_CLIENT_SECRET'),
    allowedOrigins: getEnvVar('ALLOWED_ORIGINS', '*').split(','),
    tokenExpiration: getNumericEnvVar('TOKEN_EXPIRATION', 3600),
    enableRateLimiting: getBooleanEnvVar('ENABLE_RATE_LIMITING', true),
    rateLimitRequests: getNumericEnvVar('RATE_LIMIT_REQUESTS', 100),
    rateLimitWindow: getNumericEnvVar('RATE_LIMIT_WINDOW', 60)
  },

  // MCP server integration configuration
  mcp: {
    serverUrl: getEnvVar('MCP_SERVER_URL', 'http://localhost:8080'),
    apiKey: getEnvVar('MCP_API_KEY'),
    timeout: getNumericEnvVar('MCP_TIMEOUT', 30000),
    maxRetries: getNumericEnvVar('MCP_MAX_RETRIES', 3),
    enableCaching: getBooleanEnvVar('MCP_ENABLE_CACHING', true),
    cacheExpiration: getNumericEnvVar('MCP_CACHE_EXPIRATION', 3600)
  },

  // Performance configuration
  performance: {
    enableCaching: getBooleanEnvVar('ENABLE_CACHING', true),
    cacheSize: getNumericEnvVar('CACHE_SIZE', 1000),
    cacheTTL: getNumericEnvVar('CACHE_TTL', 900), // 15 minutes
    maxConcurrentRequests: getNumericEnvVar('MAX_CONCURRENT_REQUESTS', 10),
    requestTimeout: getNumericEnvVar('REQUEST_TIMEOUT', 30000),
    enableCompression: getBooleanEnvVar('ENABLE_COMPRESSION', true)
  },

  // Monitoring configuration
  monitoring: {
    logLevel: getEnvVar('LOG_LEVEL', 'info'),
    enableApplicationInsights: getBooleanEnvVar('ENABLE_APP_INSIGHTS', true),
    instrumentationKey: getEnvVar('APP_INSIGHTS_INSTRUMENTATION_KEY'),
    enableMetrics: getBooleanEnvVar('ENABLE_METRICS', true),
    metricsInterval: getNumericEnvVar('METRICS_INTERVAL', 60000),
    enableTracing: getBooleanEnvVar('ENABLE_TRACING', true),
    samplingRate: parseFloat(getEnvVar('SAMPLING_RATE', '1.0'))
  }
};

/**
 * Validate configuration on startup
 * 
 * This function checks that all required configuration values are present
 * and valid. It throws an error if any critical configuration is missing.
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // Validate Azure Search configuration
  if (!ragConfig.search.endpoint) {
    errors.push('AZURE_SEARCH_ENDPOINT is required');
  }
  if (!ragConfig.search.apiKey) {
    errors.push('AZURE_SEARCH_ADMIN_KEY is required');
  }

  // Validate Azure OpenAI configuration
  if (!ragConfig.openai.endpoint) {
    errors.push('AZURE_OPENAI_ENDPOINT is required');
  }
  if (!ragConfig.openai.apiKey) {
    errors.push('AZURE_OPENAI_API_KEY is required');
  }

  // Validate Azure Storage configuration
  if (!ragConfig.storage.connectionString) {
    errors.push('AZURE_STORAGE_CONNECTION_STRING is required');
  }

  // Validate security configuration if authentication is enabled
  if (ragConfig.security.enableAuthentication) {
    if (!ragConfig.security.tenantId) {
      errors.push('AZURE_TENANT_ID is required when authentication is enabled');
    }
    if (!ragConfig.security.clientId) {
      errors.push('AZURE_CLIENT_ID is required when authentication is enabled');
    }
    if (!ragConfig.security.clientSecret) {
      errors.push('AZURE_CLIENT_SECRET is required when authentication is enabled');
    }
  }

  // Validate MCP configuration
  if (!ragConfig.mcp.serverUrl) {
    errors.push('MCP_SERVER_URL is required');
  }
  if (!ragConfig.mcp.apiKey) {
    errors.push('MCP_API_KEY is required');
  }

  // Throw error if any validation failures
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\\n${errors.join('\\n')}`);
  }

  console.log('RAG configuration validated successfully');
}

/**
 * Get environment-specific configuration
 * 
 * @returns Configuration tailored for the current environment
 */
export function getEnvironmentConfig(): Partial<RAGConfig> {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return {
        performance: {
          ...ragConfig.performance,
          enableCaching: true,
          maxConcurrentRequests: 50
        },
        monitoring: {
          ...ragConfig.monitoring,
          logLevel: 'error',
          enableApplicationInsights: true
        }
      };

    case 'staging':
      return {
        performance: {
          ...ragConfig.performance,
          enableCaching: true,
          maxConcurrentRequests: 20
        },
        monitoring: {
          ...ragConfig.monitoring,
          logLevel: 'warn',
          enableApplicationInsights: true
        }
      };

    case 'development':
    default:
      return {
        performance: {
          ...ragConfig.performance,
          enableCaching: false,
          maxConcurrentRequests: 5
        },
        monitoring: {
          ...ragConfig.monitoring,
          logLevel: 'debug',
          enableApplicationInsights: false
        }
      };
  }
}

/**
 * Configuration helper utilities
 */
export const ConfigHelpers = {
  /**
   * Get chunking parameters optimized for document type
   * 
   * @param documentType - Type of document (pdf, md, txt, json)
   * @returns Optimized chunk parameters
   */
  getChunkingParams: (documentType: string): { size: number; overlap: number } => {
    switch (documentType) {
      case '.pdf':
        return { size: 1000, overlap: 200 };
      case '.md':
        return { size: 800, overlap: 150 };
      case '.txt':
        return { size: 1200, overlap: 200 };
      case '.json':
        return { size: 500, overlap: 100 };
      default:
        return { 
          size: ragConfig.processing.chunkSize, 
          overlap: ragConfig.processing.chunkOverlap 
        };
    }
  },

  /**
   * Get rate limit configuration for a specific user or API key
   * 
   * @param identifier - User ID or API key
   * @returns Rate limit configuration
   */
  getRateLimitConfig: (_identifier: string): { requests: number; window: number } => {
    // Could implement custom rate limits per user/key
    // For now, return default configuration
    return {
      requests: ragConfig.security.rateLimitRequests,
      window: ragConfig.security.rateLimitWindow
    };
  },

  /**
   * Check if a file type is supported
   * 
   * @param fileType - File extension
   * @returns boolean - Whether the file type is supported
   */
  isFileTypeSupported: (fileType: string): boolean => {
    return ragConfig.processing.supportedFormats.includes(fileType.toLowerCase());
  },

  /**
   * Get cache key prefix for different cache types
   * 
   * @param cacheType - Type of cache (embedding, search, etc.)
   * @returns string - Cache key prefix
   */
  getCacheKeyPrefix: (cacheType: string): string => {
    const prefixes: { [key: string]: string } = {
      embedding: 'emb:',
      search: 'search:',
      document: 'doc:',
      mcp: 'mcp:'
    };
    return prefixes[cacheType] || 'misc:';
  }
};

// Export configuration and utilities
export default ragConfig;