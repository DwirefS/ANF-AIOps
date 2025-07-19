/**
 * Type Definitions for ANF-AIOps RAG System
 * 
 * Central type definitions used across the RAG system components.
 * These types ensure type safety and provide clear interfaces for
 * data structures and function parameters.
 * 
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 * @version 1.0.0
 */

/**
 * Document metadata structure
 */
export interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  indexedAt: string;
  category?: string;
  version?: string;
  author?: string;
  tags?: string[];
  pageCount?: number;
  pdfInfo?: any;
  [key: string]: any; // Allow additional custom metadata
}

/**
 * Document structure for processing
 */
export interface Document {
  id: string;
  title: string;
  content: string;
  source: string;
  metadata: DocumentMetadata;
}

/**
 * Document chunk for indexing
 */
export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  embedding?: number[];
  metadata: any;
  embeddingMetadata?: any;
}

/**
 * Embedding configuration
 */
export interface EmbeddingConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  dimensions: number;
}

/**
 * Embedding result
 */
export interface EmbeddingResult {
  text: string;
  embedding: number[];
  metadata?: any;
}

/**
 * Indexing configuration
 */
export interface IndexingConfig {
  searchEndpoint: string;
  searchApiKey: string;
  indexName: string;
  storageConnectionString: string;
  containerName: string;
  chunkSize: number;
  chunkOverlap: number;
  maxChunksPerDocument: number;
  supportedFormats: string[];
}

/**
 * Indexing result
 */
export interface IndexingResult {
  documentId: string;
  documentPath: string;
  chunksCreated: number;
  chunksIndexed: number;
  duration: number;
  status: 'success' | 'failed';
  error?: string;
  blobUrl?: string;
}

/**
 * Chunking strategy types
 */
export type ChunkingStrategy = 'sliding-window' | 'fixed-size' | 'sentence-based' | 'paragraph-based';

/**
 * Search query parameters
 */
export interface SearchQuery {
  query: string;
  searchType?: 'vector' | 'keyword' | 'hybrid';
  top?: number;
  filters?: SearchFilters;
  facets?: string[];
  rerankingStrategy?: RerankingStrategy;
}

/**
 * Search filters
 */
export interface SearchFilters {
  category?: string;
  documentType?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  documentIds?: string[];
  customFilter?: string;
}

/**
 * Search result
 */
export interface SearchResult {
  id: string;
  documentId: string;
  content: string;
  score: number;
  documentTitle: string;
  documentSource: string;
  chunkIndex: number;
  highlights: string[];
  metadata: any;
  blobUrl?: string;
  context?: ContextWindow;
}

/**
 * Reranking strategies
 */
export type RerankingStrategy = 'mmr' | 'diversity' | 'recency';

/**
 * Context window for expanded search results
 */
export interface ContextWindow {
  before: string[];
  current: string;
  after: string[];
}

/**
 * Retrieval configuration
 */
export interface RetrievalConfig {
  searchEndpoint: string;
  searchApiKey: string;
  indexName: string;
  defaultTop: number;
  maxTop: number;
  semanticConfigName: string;
  minimumRelevanceScore: number;
  hybridSearchWeight: number;
  enableSemanticRanking: boolean;
  enableHighlighting: boolean;
}

/**
 * MCP integration request
 */
export interface MCPRequest {
  query: string;
  context?: string;
  maxResults?: number;
  filters?: SearchFilters;
}

/**
 * MCP integration response
 */
export interface MCPResponse {
  results: SearchResult[];
  totalCount: number;
  processingTime: number;
  metadata?: any;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

/**
 * Health check status
 */
export interface HealthStatus {
  healthy: boolean;
  services: {
    search: ServiceHealth;
    openai: ServiceHealth;
    storage: ServiceHealth;
    mcp?: ServiceHealth;
  };
  timestamp: Date;
}

/**
 * Individual service health
 */
export interface ServiceHealth {
  healthy: boolean;
  latency?: number;
  error?: string;
}

/**
 * Cache entry
 */
export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: Date;
  hits: number;
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
  successful: T[];
  failed: Array<{
    item: any;
    error: string;
  }>;
  totalTime: number;
}

/**
 * Vector store statistics
 */
export interface VectorStoreStats {
  documentCount: number;
  chunkCount: number;
  indexSize: number;
  lastIndexed: string;
  categories: { [key: string]: number };
  documentTypes: { [key: string]: number };
}

/**
 * Processing pipeline stage
 */
export interface PipelineStage {
  name: string;
  process: (input: any) => Promise<any>;
  onError?: (error: Error, input: any) => void;
}

/**
 * Authentication context
 */
export interface AuthContext {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  token: string;
}

/**
 * API error response
 */
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  requestId: string;
}

/**
 * Monitoring event
 */
export interface MonitoringEvent {
  eventName: string;
  properties: { [key: string]: any };
  measurements: { [key: string]: number };
  timestamp: Date;
}

/**
 * All types are exported above
 */