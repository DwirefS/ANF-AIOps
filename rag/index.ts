/**
 * ANF-AIOps RAG System Main Entry Point
 * 
 * This file serves as the main entry point for the RAG system,
 * exporting all public APIs and initializing core services.
 * 
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 * @version 1.0.0
 */

// Import types first
import { IndexingResult, SearchQuery, SearchResult, HealthStatus } from './types';

// Import services
import { DocumentIndexer } from './indexer/document-indexer';
import { RetrievalService } from './retriever/retrieval-service';
import { Logger } from './utils/logger';

// Export core services
export { EmbeddingService } from './embedding/embedding-service';
export { DocumentIndexer } from './indexer/document-indexer';
export { RetrievalService } from './retriever/retrieval-service';

// Export configuration
export { ragConfig, validateConfig, ConfigHelpers } from './config/rag-config';

// Export schema and utilities
export { 
  createIndexSchema, 
  FieldMappings, 
  QueryBuilders, 
  IndexManagement, 
  Validators 
} from './vector-store/schema';

// Export types
export * from './types';

// Export logger
export { Logger } from './utils/logger';

/**
 * RAG System API
 * 
 * Main API class that provides a unified interface to all RAG services
 */
export class RAGSystem {
  private documentIndexer: DocumentIndexer;
  private retrievalService: RetrievalService;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('RAGSystem');
    this.logger.info('Initializing RAG System...');

    // Initialize services
    this.documentIndexer = new DocumentIndexer();
    this.retrievalService = new RetrievalService();

    this.logger.info('RAG System initialized successfully');
  }

  /**
   * Index a document into the RAG system
   */
  async indexDocument(documentPath: string, metadata?: any): Promise<IndexingResult> {
    return this.documentIndexer.indexDocument(documentPath, metadata);
  }

  /**
   * Search the knowledge base
   */
  async search(query: string, options?: Partial<SearchQuery>): Promise<SearchResult[]> {
    return this.retrievalService.search({
      query,
      searchType: 'hybrid',
      top: 5,
      ...options
    });
  }

  /**
   * Get similar documents
   */
  async findSimilar(documentId: string, top: number = 5): Promise<SearchResult[]> {
    return this.retrievalService.findSimilarDocuments(documentId, top);
  }

  /**
   * Get system health status
   */
  async getHealth(): Promise<HealthStatus> {
    // Implementation would check all services
    return {
      healthy: true,
      services: {
        search: { healthy: true },
        openai: { healthy: true },
        storage: { healthy: true }
      },
      timestamp: new Date()
    };
  }
}

// Create and export default instance
const ragSystem = new RAGSystem();
export default ragSystem;