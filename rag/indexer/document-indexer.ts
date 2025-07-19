/**
 * Document Indexing Service for ANF-AIOps RAG System
 * 
 * This service handles the processing, chunking, and indexing of documents
 * into the vector store. It supports multiple document formats and provides
 * intelligent chunking strategies for optimal retrieval performance.
 * 
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 * @version 1.0.0
 */

import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { BlobServiceClient } from '@azure/storage-blob';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import pdfParse from 'pdf-parse';
import * as dotenv from 'dotenv';
import { EmbeddingService } from '../embedding/embedding-service';
import { Logger } from '../utils/logger';
import { 
  Document, 
  DocumentChunk, 
  IndexingConfig, 
  IndexingResult,
  ChunkingStrategy,
  DocumentMetadata 
} from '../types';

// Load environment variables
dotenv.config();

/**
 * DocumentIndexer class manages the document processing pipeline
 * 
 * Key features:
 * - Multi-format document support (PDF, MD, TXT, JSON)
 * - Intelligent chunking with overlap
 * - Metadata extraction and preservation
 * - Incremental indexing support
 * - Error recovery and retry logic
 */
export class DocumentIndexer {
  private searchClient: SearchClient<any>;
  private blobServiceClient: BlobServiceClient;
  private embeddingService: EmbeddingService;
  private logger: Logger;
  private config: IndexingConfig;

  /**
   * Initialize the document indexer with Azure services
   * 
   * @param config - Optional configuration overrides
   */
  constructor(config?: Partial<IndexingConfig>) {
    this.logger = new Logger('DocumentIndexer');

    // Load configuration with defaults
    this.config = {
      searchEndpoint: process.env.AZURE_SEARCH_ENDPOINT || '',
      searchApiKey: process.env.AZURE_SEARCH_ADMIN_KEY || '',
      indexName: process.env.AZURE_SEARCH_INDEX_NAME || 'anf-knowledge-base',
      storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
      containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'documents',
      chunkSize: parseInt(process.env.CHUNK_SIZE || '1000'),
      chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200'),
      maxChunksPerDocument: 1000,
      supportedFormats: ['.pdf', '.md', '.txt', '.json'],
      ...config
    };

    // Validate configuration
    this.validateConfig();

    // Initialize Azure Search client
    this.searchClient = new SearchClient(
      this.config.searchEndpoint,
      this.config.indexName,
      new AzureKeyCredential(this.config.searchApiKey)
    );

    // Initialize Blob Storage client
    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      this.config.storageConnectionString
    );

    // Initialize embedding service
    this.embeddingService = new EmbeddingService();

    this.logger.info('DocumentIndexer initialized successfully');
  }

  /**
   * Index a single document
   * 
   * @param documentPath - Path to the document file
   * @param metadata - Additional metadata for the document
   * @returns Promise<IndexingResult> - Result of the indexing operation
   */
  async indexDocument(
    documentPath: string, 
    metadata?: Partial<DocumentMetadata>
  ): Promise<IndexingResult> {
    const startTime = Date.now();
    this.logger.info(`Starting indexing for document: ${documentPath}`);

    try {
      // Validate document
      await this.validateDocument(documentPath);

      // Load and parse document
      const document = await this.loadDocument(documentPath, metadata);

      // Chunk the document
      const chunks = await this.chunkDocument(document);

      // Generate embeddings for chunks
      const embeddedChunks = await this.embeddingService.embedDocumentChunks(chunks);

      // Upload to blob storage
      const blobUrl = await this.uploadToStorage(documentPath, document);

      // Index chunks to search service
      const indexedCount = await this.indexChunks(embeddedChunks, blobUrl);

      const duration = Date.now() - startTime;
      const result: IndexingResult = {
        documentId: document.id,
        documentPath,
        chunksCreated: chunks.length,
        chunksIndexed: indexedCount,
        duration,
        status: 'success',
        blobUrl
      };

      this.logger.info(`Document indexed successfully: ${JSON.stringify(result)}`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const result: IndexingResult = {
        documentId: '',
        documentPath,
        chunksCreated: 0,
        chunksIndexed: 0,
        duration,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      this.logger.error(`Document indexing failed: ${result.error}`);
      return result;
    }
  }

  /**
   * Index multiple documents in batch
   * 
   * @param documentPaths - Array of document paths
   * @param metadata - Common metadata for all documents
   * @returns Promise<IndexingResult[]> - Results for each document
   */
  async indexBatch(
    documentPaths: string[], 
    metadata?: Partial<DocumentMetadata>
  ): Promise<IndexingResult[]> {
    this.logger.info(`Starting batch indexing for ${documentPaths.length} documents`);
    
    const results: IndexingResult[] = [];
    
    // Process documents in parallel with concurrency limit
    const concurrencyLimit = 5;
    for (let i = 0; i < documentPaths.length; i += concurrencyLimit) {
      const batch = documentPaths.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(
        batch.map(path => this.indexDocument(path, metadata))
      );
      results.push(...batchResults);
    }

    // Summary statistics
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const totalChunks = results.reduce((sum, r) => sum + r.chunksIndexed, 0);

    this.logger.info(
      `Batch indexing complete: ${successful} successful, ${failed} failed, ${totalChunks} total chunks`
    );

    return results;
  }

  /**
   * Load and parse a document from file
   * 
   * @param documentPath - Path to the document
   * @param metadata - Additional metadata
   * @returns Promise<Document> - Parsed document
   */
  private async loadDocument(
    documentPath: string, 
    metadata?: Partial<DocumentMetadata>
  ): Promise<Document> {
    const ext = path.extname(documentPath).toLowerCase();
    const fileName = path.basename(documentPath);
    const content = await fs.readFile(documentPath);

    let textContent = '';
    let extractedMetadata: Partial<DocumentMetadata> = {};

    // Parse based on file type
    switch (ext) {
      case '.pdf':
        const pdfData = await pdfParse(content);
        textContent = pdfData.text;
        extractedMetadata = {
          pageCount: pdfData.numpages,
          pdfInfo: pdfData.info
        };
        break;

      case '.md':
        textContent = content.toString('utf-8');
        // Extract markdown frontmatter if present
        const frontmatterMatch = textContent.match(/^---\\n([\\s\\S]*?)\\n---/);
        if (frontmatterMatch) {
          try {
            const frontmatter = JSON.parse(frontmatterMatch[1]);
            extractedMetadata = frontmatter;
            textContent = textContent.replace(frontmatterMatch[0], '');
          } catch (e) {
            this.logger.warn('Failed to parse markdown frontmatter');
          }
        }
        // Convert markdown to plain text
        textContent = this.markdownToPlainText(textContent);
        break;

      case '.txt':
        textContent = content.toString('utf-8');
        break;

      case '.json':
        const jsonData = JSON.parse(content.toString('utf-8'));
        textContent = JSON.stringify(jsonData, null, 2);
        extractedMetadata = { dataType: 'json' };
        break;

      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }

    // Create document object
    const document: Document = {
      id: this.generateDocumentId(documentPath),
      title: metadata?.title || fileName,
      content: textContent,
      source: documentPath,
      metadata: {
        fileName,
        fileSize: content.length,
        fileType: ext,
        indexedAt: new Date().toISOString(),
        ...extractedMetadata,
        ...metadata
      }
    };

    return document;
  }

  /**
   * Chunk a document into smaller pieces for indexing
   * 
   * @param document - The document to chunk
   * @param strategy - Chunking strategy to use
   * @returns Promise<DocumentChunk[]> - Array of document chunks
   */
  private async chunkDocument(
    document: Document, 
    strategy: ChunkingStrategy = 'sliding-window'
  ): Promise<DocumentChunk[]> {
    this.logger.debug(`Chunking document ${document.id} using ${strategy} strategy`);

    const chunks: DocumentChunk[] = [];
    const { chunkSize, chunkOverlap } = this.config;

    if (strategy === 'sliding-window') {
      // Split content into sentences for better chunking
      const sentences = this.splitIntoSentences(document.content);
      let currentChunk = '';
      let currentSentences: string[] = [];

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > chunkSize && currentSentences.length > 0) {
          // Create chunk
          chunks.push(this.createChunk(
            document,
            currentChunk,
            chunks.length,
            currentSentences
          ));

          // Prepare next chunk with overlap
          const overlapSentences = this.calculateOverlapSentences(
            currentSentences,
            chunkOverlap
          );
          currentSentences = overlapSentences;
          currentChunk = overlapSentences.join(' ');
        }

        currentSentences.push(sentence);
        currentChunk = currentSentences.join(' ');
      }

      // Add final chunk
      if (currentChunk.trim()) {
        chunks.push(this.createChunk(
          document,
          currentChunk,
          chunks.length,
          currentSentences
        ));
      }
    } else {
      // Simple fixed-size chunking fallback
      const content = document.content;
      for (let i = 0; i < content.length; i += chunkSize - chunkOverlap) {
        const chunk = content.substring(i, i + chunkSize);
        if (chunk.trim()) {
          chunks.push(this.createChunk(document, chunk, chunks.length));
        }
      }
    }

    // Validate chunk count
    if (chunks.length > this.config.maxChunksPerDocument) {
      this.logger.warn(
        `Document ${document.id} generated ${chunks.length} chunks, ` +
        `exceeding limit of ${this.config.maxChunksPerDocument}`
      );
      return chunks.slice(0, this.config.maxChunksPerDocument);
    }

    this.logger.debug(`Created ${chunks.length} chunks for document ${document.id}`);
    return chunks;
  }

  /**
   * Create a document chunk with metadata
   * 
   * @param document - Parent document
   * @param content - Chunk content
   * @param index - Chunk index
   * @param sentences - Optional sentences in chunk
   * @returns DocumentChunk
   */
  private createChunk(
    document: Document,
    content: string,
    index: number,
    sentences?: string[]
  ): DocumentChunk {
    return {
      id: `${document.id}_chunk_${index}`,
      documentId: document.id,
      content: content.trim(),
      chunkIndex: index,
      metadata: {
        documentTitle: document.title,
        documentSource: document.source,
        sentenceCount: sentences?.length || 0,
        ...document.metadata
      }
    };
  }

  /**
   * Index chunks to Azure Cognitive Search
   * 
   * @param chunks - Embedded document chunks
   * @param blobUrl - URL of the source document in blob storage
   * @returns Promise<number> - Number of chunks indexed
   */
  private async indexChunks(
    chunks: DocumentChunk[], 
    blobUrl: string
  ): Promise<number> {
    this.logger.debug(`Indexing ${chunks.length} chunks to search service`);

    // Transform chunks to search documents
    const searchDocuments = chunks.map(chunk => ({
      id: chunk.id,
      documentId: chunk.documentId,
      content: chunk.content,
      embedding: chunk.embedding,
      chunkIndex: chunk.chunkIndex,
      documentTitle: chunk.metadata.documentTitle,
      documentSource: chunk.metadata.documentSource,
      blobUrl,
      metadata: JSON.stringify(chunk.metadata),
      indexedAt: new Date()
    }));

    // Upload in batches
    const batchSize = 100;
    let indexed = 0;

    for (let i = 0; i < searchDocuments.length; i += batchSize) {
      const batch = searchDocuments.slice(i, i + batchSize);
      
      try {
        const result = await this.searchClient.uploadDocuments(batch);
        indexed += result.results.filter(r => r.succeeded).length;
        
        const failed = result.results.filter(r => !r.succeeded);
        if (failed.length > 0) {
          this.logger.warn(`Failed to index ${failed.length} chunks in batch`);
          failed.forEach(f => this.logger.debug(`Failed: ${f.key} - ${f.errorMessage}`));
        }
      } catch (error) {
        this.logger.error(`Batch indexing error:`, error);
        throw error;
      }
    }

    this.logger.info(`Successfully indexed ${indexed} out of ${chunks.length} chunks`);
    return indexed;
  }

  /**
   * Upload document to blob storage
   * 
   * @param documentPath - Local path to document
   * @param document - Document object
   * @returns Promise<string> - Blob URL
   */
  private async uploadToStorage(
    documentPath: string, 
    document: Document
  ): Promise<string> {
    const containerClient = this.blobServiceClient.getContainerClient(
      this.config.containerName
    );

    // Ensure container exists
    await containerClient.createIfNotExists({ access: 'container' });

    // Generate blob name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const blobName = `${document.metadata.fileType.substring(1)}/${timestamp}_${document.metadata.fileName}`;

    // Upload file
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const fileContent = await fs.readFile(documentPath);
    
    await blockBlobClient.upload(fileContent, fileContent.length, {
      blobHTTPHeaders: {
        blobContentType: this.getMimeType(document.metadata.fileType)
      },
      metadata: {
        documentId: document.id,
        indexedAt: document.metadata.indexedAt
      }
    });

    this.logger.debug(`Document uploaded to blob storage: ${blobName}`);
    return blockBlobClient.url;
  }

  /**
   * Validate document before indexing
   * 
   * @param documentPath - Path to document
   */
  private async validateDocument(documentPath: string): Promise<void> {
    // Check file exists
    try {
      const stats = await fs.stat(documentPath);
      
      // Check file size
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (stats.size > maxSize) {
        throw new Error(`File size exceeds maximum of ${maxSize} bytes`);
      }

      // Check file extension
      const ext = path.extname(documentPath).toLowerCase();
      if (!this.config.supportedFormats.includes(ext)) {
        throw new Error(`Unsupported file format: ${ext}`);
      }
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new Error(`File not found: ${documentPath}`);
      }
      throw error;
    }
  }

  /**
   * Validate indexer configuration
   */
  private validateConfig(): void {
    const required = [
      'searchEndpoint',
      'searchApiKey',
      'indexName',
      'storageConnectionString'
    ];

    for (const field of required) {
      if (!this.config[field as keyof IndexingConfig]) {
        throw new Error(`Missing required configuration: ${field}`);
      }
    }
  }

  /**
   * Split text into sentences
   * 
   * @param text - Text to split
   * @returns string[] - Array of sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Enhanced sentence splitting with abbreviation handling
    const abbreviations = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Sr.', 'Jr.'];
    let processedText = text;

    // Replace abbreviations temporarily
    abbreviations.forEach((abbr, index) => {
      processedText = processedText.replace(
        new RegExp(abbr.replace('.', '\\\\.'), 'g'),
        `__ABBR${index}__`
      );
    });

    // Split on sentence boundaries
    const sentences = processedText.split(/(?<=[.!?])\\s+(?=[A-Z])/);

    // Restore abbreviations
    return sentences.map(sentence => {
      abbreviations.forEach((abbr, index) => {
        sentence = sentence.replace(new RegExp(`__ABBR${index}__`, 'g'), abbr);
      });
      return sentence.trim();
    }).filter(s => s.length > 0);
  }

  /**
   * Calculate overlap sentences for chunking
   * 
   * @param sentences - Current sentences
   * @param overlapSize - Desired overlap size
   * @returns string[] - Overlap sentences
   */
  private calculateOverlapSentences(
    sentences: string[], 
    overlapSize: number
  ): string[] {
    let overlapText = '';
    const overlapSentences: string[] = [];

    // Add sentences from the end until we reach overlap size
    for (let i = sentences.length - 1; i >= 0 && overlapText.length < overlapSize; i--) {
      overlapSentences.unshift(sentences[i]);
      overlapText = overlapSentences.join(' ');
    }

    return overlapSentences;
  }

  /**
   * Convert markdown to plain text
   * 
   * @param markdown - Markdown content
   * @returns string - Plain text
   */
  private markdownToPlainText(markdown: string): string {
    // Remove code blocks
    let text = markdown.replace(/```[\\s\\S]*?```/g, '');
    
    // Remove inline code
    text = text.replace(/`[^`]+`/g, '');
    
    // Remove images
    text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
    
    // Remove links but keep text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Remove markdown formatting
    text = text.replace(/[*_~#]/g, '');
    
    // Clean up extra whitespace
    text = text.replace(/\\n{3,}/g, '\\n\\n').trim();
    
    return text;
  }

  /**
   * Generate unique document ID
   * 
   * @param documentPath - Path to document
   * @returns string - Document ID
   */
  private generateDocumentId(documentPath: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(documentPath);
    hash.update(new Date().toISOString());
    return hash.digest('hex').substring(0, 16);
  }

  /**
   * Get MIME type for file extension
   * 
   * @param ext - File extension
   * @returns string - MIME type
   */
  private getMimeType(ext: string): string {
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.json': 'application/json'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Delete a document and its chunks from the index
   * 
   * @param documentId - ID of the document to delete
   * @returns Promise<boolean> - Success status
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    this.logger.info(`Deleting document ${documentId} from index`);

    try {
      // Search for all chunks of the document
      const searchResults = await this.searchClient.search('*', {
        filter: `documentId eq '${documentId}'`,
        select: ['id']
      });

      const chunkIds: string[] = [];
      for await (const result of searchResults.results) {
        chunkIds.push(result.document.id);
      }

      if (chunkIds.length === 0) {
        this.logger.warn(`No chunks found for document ${documentId}`);
        return false;
      }

      // Delete chunks in batches
      const batchSize = 100;
      for (let i = 0; i < chunkIds.length; i += batchSize) {
        const batch = chunkIds.slice(i, i + batchSize);
        await this.searchClient.deleteDocuments('id', batch);
      }

      this.logger.info(`Deleted ${chunkIds.length} chunks for document ${documentId}`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to delete document ${documentId}:`, error);
      return false;
    }
  }

  /**
   * Get indexing statistics
   * 
   * @returns Promise<object> - Index statistics
   */
  async getIndexStats(): Promise<{
    documentCount: number;
    chunkCount: number;
    indexSize: number;
    lastIndexed: string;
  }> {
    try {
      // Get document count
      const documentResult = await this.searchClient.search('*', {
        includeTotalCount: true,
        top: 0,
        facets: ['documentId']
      });

      const chunkCount = documentResult.count || 0;
      const documentCount = Object.keys(documentResult.facets?.documentId || {}).length;

      // Get index statistics (would need admin API for detailed stats)
      const stats = {
        documentCount,
        chunkCount,
        indexSize: -1, // Would need admin API
        lastIndexed: new Date().toISOString() // Would need to track this
      };

      return stats;

    } catch (error) {
      this.logger.error('Failed to get index statistics:', error);
      throw error;
    }
  }
}

// Export default instance for convenience
export default new DocumentIndexer();