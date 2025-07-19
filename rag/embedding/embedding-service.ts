/**
 * Document Embedding Service for ANF-AIOps RAG System
 * 
 * This service handles the conversion of text documents into vector embeddings
 * using Azure OpenAI's embedding models. It supports various document formats
 * and provides utilities for chunking and preprocessing text before embedding.
 * 
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 * @version 1.0.0
 */

import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { createHash } from 'crypto';
import * as dotenv from 'dotenv';
import { Logger } from '../utils/logger';
import { DocumentChunk, EmbeddingResult, EmbeddingConfig } from '../types';

// Load environment variables
dotenv.config();

/**
 * EmbeddingService class provides methods for converting text to vector embeddings
 * 
 * Key features:
 * - Supports batch embedding for efficiency
 * - Implements retry logic for reliability
 * - Caches embeddings to reduce API calls
 * - Handles rate limiting gracefully
 */
export class EmbeddingService {
  private client: OpenAIClient;
  private deploymentName: string;
  private logger: Logger;
  private embeddingCache: Map<string, number[]>;
  private config: EmbeddingConfig;

  /**
   * Initialize the embedding service with Azure OpenAI credentials
   * 
   * @param config - Optional configuration overrides
   */
  constructor(config?: Partial<EmbeddingConfig>) {
    // Initialize logger
    this.logger = new Logger('EmbeddingService');

    // Load configuration from environment with defaults
    this.config = {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
      apiKey: process.env.AZURE_OPENAI_API_KEY || '',
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'text-embedding-ada-002',
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 16,
      dimensions: 1536,
      ...config
    };

    // Validate required configuration
    if (!this.config.endpoint || !this.config.apiKey) {
      throw new Error('Azure OpenAI endpoint and API key are required');
    }

    // Initialize OpenAI client
    this.client = new OpenAIClient(
      this.config.endpoint,
      new AzureKeyCredential(this.config.apiKey)
    );

    this.deploymentName = this.config.deploymentName;
    this.embeddingCache = new Map();

    this.logger.info('EmbeddingService initialized successfully');
  }

  /**
   * Generate embeddings for a single text chunk
   * 
   * @param text - The text to embed
   * @param useCache - Whether to use cached embeddings if available
   * @returns Promise<number[]> - The embedding vector
   */
  async embedText(text: string, useCache: boolean = true): Promise<number[]> {
    // Normalize and validate text
    const normalizedText = this.normalizeText(text);
    if (!normalizedText) {
      this.logger.warn('Empty text provided for embedding');
      return new Array(this.config.dimensions).fill(0);
    }

    // Check cache if enabled
    const cacheKey = this.generateCacheKey(normalizedText);
    if (useCache && this.embeddingCache.has(cacheKey)) {
      this.logger.debug(`Cache hit for text: ${normalizedText.substring(0, 50)}...`);
      return this.embeddingCache.get(cacheKey)!;
    }

    // Generate embedding with retry logic
    let attempt = 0;
    while (attempt < this.config.maxRetries) {
      try {
        this.logger.debug(`Generating embedding for text (attempt ${attempt + 1})`);
        
        const response = await this.client.getEmbeddings(
          this.deploymentName,
          [normalizedText]
        );

        if (response.data && response.data.length > 0) {
          const embedding = response.data[0].embedding;
          
          // Cache the result
          this.embeddingCache.set(cacheKey, embedding);
          
          return embedding;
        } else {
          throw new Error('No embedding data received from API');
        }
      } catch (error) {
        attempt++;
        this.logger.error(`Embedding attempt ${attempt} failed:`, error);
        
        if (attempt >= this.config.maxRetries) {
          throw new Error(`Failed to generate embedding after ${this.config.maxRetries} attempts: ${error}`);
        }
        
        // Exponential backoff
        await this.delay(this.config.retryDelay * Math.pow(2, attempt - 1));
      }
    }

    // This should never be reached due to the throw in the catch block
    throw new Error('Unexpected error in embedText');
  }

  /**
   * Generate embeddings for multiple text chunks in batch
   * 
   * @param texts - Array of texts to embed
   * @param useCache - Whether to use cached embeddings
   * @returns Promise<EmbeddingResult[]> - Array of embedding results
   */
  async embedBatch(texts: string[], useCache: boolean = true): Promise<EmbeddingResult[]> {
    this.logger.info(`Processing batch of ${texts.length} texts for embedding`);
    
    const results: EmbeddingResult[] = [];
    const uncachedTexts: { text: string; index: number }[] = [];

    // Check cache and identify texts that need embedding
    for (let i = 0; i < texts.length; i++) {
      const text = this.normalizeText(texts[i]);
      const cacheKey = this.generateCacheKey(text);

      if (useCache && this.embeddingCache.has(cacheKey)) {
        results[i] = {
          text: texts[i],
          embedding: this.embeddingCache.get(cacheKey)!,
          metadata: { cached: true }
        };
      } else {
        uncachedTexts.push({ text, index: i });
      }
    }

    // Process uncached texts in batches
    for (let i = 0; i < uncachedTexts.length; i += this.config.batchSize) {
      const batch = uncachedTexts.slice(i, i + this.config.batchSize);
      const batchTexts = batch.map(item => item.text);

      try {
        this.logger.debug(`Processing batch ${Math.floor(i / this.config.batchSize) + 1}`);
        
        const response = await this.client.getEmbeddings(
          this.deploymentName,
          batchTexts
        );

        // Process batch results
        for (let j = 0; j < batch.length; j++) {
          const { text, index } = batch[j];
          const embedding = response.data[j].embedding;

          // Cache the embedding
          const cacheKey = this.generateCacheKey(text);
          this.embeddingCache.set(cacheKey, embedding);

          // Store result
          results[index] = {
            text: texts[index],
            embedding,
            metadata: { cached: false }
          };
        }
      } catch (error) {
        this.logger.error(`Batch embedding failed:`, error);
        
        // Fall back to individual embedding for failed batch
        for (const { text, index } of batch) {
          try {
            const embedding = await this.embedText(text, false);
            results[index] = {
              text: texts[index],
              embedding,
              metadata: { cached: false, fallback: true }
            };
          } catch (individualError) {
            this.logger.error(`Individual embedding failed for text at index ${index}:`, individualError);
            results[index] = {
              text: texts[index],
              embedding: new Array(this.config.dimensions).fill(0),
              metadata: { error: true }
            };
          }
        }
      }

      // Rate limiting delay between batches
      if (i + this.config.batchSize < uncachedTexts.length) {
        await this.delay(500);
      }
    }

    this.logger.info(`Batch embedding complete. Cached: ${texts.length - uncachedTexts.length}, New: ${uncachedTexts.length}`);
    return results;
  }

  /**
   * Generate embeddings for document chunks
   * 
   * @param chunks - Array of document chunks
   * @returns Promise<DocumentChunk[]> - Chunks with embeddings added
   */
  async embedDocumentChunks(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    this.logger.info(`Embedding ${chunks.length} document chunks`);

    // Extract texts from chunks
    const texts = chunks.map(chunk => chunk.content);
    
    // Generate embeddings
    const embeddingResults = await this.embedBatch(texts);

    // Merge embeddings back into chunks
    const embeddedChunks = chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddingResults[index].embedding,
      embeddingMetadata: embeddingResults[index].metadata
    }));

    return embeddedChunks;
  }

  /**
   * Normalize text for consistent embedding generation
   * 
   * @param text - Raw text input
   * @returns string - Normalized text
   */
  private normalizeText(text: string): string {
    // Remove excessive whitespace
    let normalized = text.replace(/\\s+/g, ' ').trim();
    
    // Remove control characters
    normalized = normalized.replace(/[\\x00-\\x1F\\x7F]/g, '');
    
    // Limit length to prevent token overflow
    const maxLength = 8191; // Max tokens for ada-002
    if (normalized.length > maxLength) {
      this.logger.warn(`Text truncated from ${normalized.length} to ${maxLength} characters`);
      normalized = normalized.substring(0, maxLength);
    }

    return normalized;
  }

  /**
   * Generate a cache key for a given text
   * 
   * @param text - The text to generate a key for
   * @returns string - Cache key
   */
  private generateCacheKey(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  /**
   * Utility function for delays
   * 
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
    this.logger.info('Embedding cache cleared');
  }

  /**
   * Get cache statistics
   * 
   * @returns Object with cache stats
   */
  getCacheStats(): { size: number; memoryUsage: number } {
    const size = this.embeddingCache.size;
    // Rough estimate: each embedding is ~1536 floats * 4 bytes
    const memoryUsage = size * this.config.dimensions * 4;
    
    return { size, memoryUsage };
  }

  /**
   * Validate embedding dimensions
   * 
   * @param embedding - The embedding to validate
   * @returns boolean - Whether the embedding is valid
   */
  validateEmbedding(embedding: number[]): boolean {
    if (!Array.isArray(embedding)) {
      return false;
    }

    if (embedding.length !== this.config.dimensions) {
      this.logger.warn(`Invalid embedding dimensions: ${embedding.length} (expected ${this.config.dimensions})`);
      return false;
    }

    // Check if all values are numbers
    return embedding.every(val => typeof val === 'number' && !isNaN(val));
  }

  /**
   * Calculate cosine similarity between two embeddings
   * 
   * @param embedding1 - First embedding vector
   * @param embedding2 - Second embedding vector
   * @returns number - Cosine similarity score between -1 and 1
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (!this.validateEmbedding(embedding1) || !this.validateEmbedding(embedding2)) {
      throw new Error('Invalid embeddings provided for similarity calculation');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}

// Export default instance for convenience
export default new EmbeddingService();