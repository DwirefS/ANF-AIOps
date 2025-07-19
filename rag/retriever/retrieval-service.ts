/**
 * Retrieval Service for ANF-AIOps RAG System
 * 
 * This service implements the retrieval component of the RAG system,
 * providing semantic search capabilities over the indexed document corpus.
 * It supports hybrid search, relevance ranking, and context extraction.
 * 
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 * @version 1.0.0
 */

import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import * as dotenv from 'dotenv';
import { EmbeddingService } from '../embedding/embedding-service';
import { Logger } from '../utils/logger';
import {
  SearchQuery,
  SearchResult,
  RetrievalConfig,
  SearchFilters,
  ContextWindow
} from '../types';

// Load environment variables
dotenv.config();

/**
 * RetrievalService class implements intelligent document retrieval
 * 
 * Key features:
 * - Semantic search using vector embeddings
 * - Hybrid search combining vector and keyword search
 * - Advanced filtering and faceting
 * - Result reranking and relevance scoring
 * - Context window extraction
 * - MCP server integration support
 */
export class RetrievalService {
  private searchClient: SearchClient<any>;
  private embeddingService: EmbeddingService;
  private logger: Logger;
  private config: RetrievalConfig;

  /**
   * Initialize the retrieval service
   * 
   * @param config - Optional configuration overrides
   */
  constructor(config?: Partial<RetrievalConfig>) {
    this.logger = new Logger('RetrievalService');

    // Load configuration with defaults
    this.config = {
      searchEndpoint: process.env.AZURE_SEARCH_ENDPOINT || '',
      searchApiKey: process.env.AZURE_SEARCH_ADMIN_KEY || '',
      indexName: process.env.AZURE_SEARCH_INDEX_NAME || 'anf-knowledge-base',
      defaultTop: 5,
      maxTop: 50,
      semanticConfigName: 'anf-semantic-config',
      minimumRelevanceScore: 0.7,
      hybridSearchWeight: 0.5, // Balance between vector and keyword
      enableSemanticRanking: true,
      enableHighlighting: true,
      ...config
    };

    // Validate configuration
    if (!this.config.searchEndpoint || !this.config.searchApiKey) {
      throw new Error('Azure Search endpoint and API key are required');
    }

    // Initialize search client
    this.searchClient = new SearchClient(
      this.config.searchEndpoint,
      this.config.indexName,
      new AzureKeyCredential(this.config.searchApiKey)
    );

    // Initialize embedding service
    this.embeddingService = new EmbeddingService();

    this.logger.info('RetrievalService initialized successfully');
  }

  /**
   * Perform a search query
   * 
   * @param query - Search query parameters
   * @returns Promise<SearchResult[]> - Array of search results
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    this.logger.info(`Executing search query: "${query.query}"`);

    try {
      // Validate query parameters
      this.validateQuery(query);

      // Generate query embedding if semantic search is enabled
      let queryEmbedding: number[] | undefined;
      if (query.searchType !== 'keyword') {
        queryEmbedding = await this.embeddingService.embedText(query.query);
      }

      // Build search parameters
      const searchParams = await this.buildSearchParameters(query, queryEmbedding);

      // Execute search
      const searchResults = await this.searchClient.search(
        query.searchType === 'vector' ? '*' : query.query,
        searchParams
      );

      // Process and transform results
      const results: SearchResult[] = [];
      for await (const result of searchResults.results) {
        const transformedResult = this.transformSearchResult(result, query);
        
        // Apply minimum relevance filter
        if (transformedResult.score >= this.config.minimumRelevanceScore) {
          results.push(transformedResult);
        }
      }

      // Apply reranking if specified
      if (query.rerankingStrategy) {
        return this.rerankResults(results, query);
      }

      this.logger.info(`Search completed: ${results.length} results found`);
      return results;

    } catch (error) {
      this.logger.error('Search error:', error);
      throw new Error(`Search failed: ${error}`);
    }
  }

  /**
   * Perform a hybrid search combining vector and keyword search
   * 
   * @param query - Search query
   * @param filters - Optional filters
   * @param top - Number of results
   * @returns Promise<SearchResult[]> - Search results
   */
  async hybridSearch(
    query: string,
    filters?: SearchFilters,
    top: number = 5
  ): Promise<SearchResult[]> {
    this.logger.info(`Executing hybrid search: "${query}"`);

    // Perform both vector and keyword searches
    const [vectorResults, keywordResults] = await Promise.all([
      this.search({
        query,
        searchType: 'vector',
        filters,
        top: top * 2 // Get more results for merging
      }),
      this.search({
        query,
        searchType: 'keyword',
        filters,
        top: top * 2
      })
    ]);

    // Merge and deduplicate results
    const mergedResults = this.mergeSearchResults(
      vectorResults,
      keywordResults,
      this.config.hybridSearchWeight
    );

    // Return top N results
    return mergedResults.slice(0, top);
  }

  /**
   * Search with context window extraction
   * 
   * @param query - Search query
   * @param contextSize - Size of context window
   * @returns Promise<SearchResult[]> - Results with context
   */
  async searchWithContext(
    query: string,
    contextSize: number = 3
  ): Promise<SearchResult[]> {
    this.logger.info(`Searching with context window size: ${contextSize}`);

    // Perform initial search
    const results = await this.search({
      query,
      searchType: 'hybrid',
      top: this.config.defaultTop
    });

    // For each result, fetch surrounding chunks for context
    const resultsWithContext = await Promise.all(
      results.map(async (result) => {
        const context = await this.extractContextWindow(
          result.documentId,
          result.chunkIndex,
          contextSize
        );
        
        return {
          ...result,
          context
        };
      })
    );

    return resultsWithContext;
  }

  /**
   * Get similar documents based on a document ID
   * 
   * @param documentId - Source document ID
   * @param top - Number of similar documents
   * @returns Promise<SearchResult[]> - Similar documents
   */
  async findSimilarDocuments(
    documentId: string,
    top: number = 5
  ): Promise<SearchResult[]> {
    this.logger.info(`Finding documents similar to: ${documentId}`);

    try {
      // Fetch the source document
      const sourceDoc = await this.searchClient.getDocument(documentId);
      
      if (!sourceDoc || !sourceDoc.embedding) {
        throw new Error('Source document not found or has no embedding');
      }

      // Search using the document's embedding
      const searchParams = {
        vector: {
          value: sourceDoc.embedding,
          kNearestNeighborsCount: top,
          fields: ['embedding']
        },
        select: ['id', 'documentId', 'content', 'documentTitle', 'chunkIndex'],
        top
      };

      const searchResults = await this.searchClient.search('*', searchParams);

      const results: SearchResult[] = [];
      for await (const result of searchResults.results) {
        // Skip the source document itself
        if (result.document.id !== documentId) {
          results.push(this.transformSearchResult(result, { query: '' }));
        }
      }

      return results;

    } catch (error) {
      this.logger.error('Find similar documents error:', error);
      throw error;
    }
  }

  /**
   * Build search parameters based on query
   * 
   * @param query - Search query
   * @param queryEmbedding - Query embedding vector
   * @returns Search parameters object
   */
  private async buildSearchParameters(
    query: SearchQuery,
    queryEmbedding?: number[]
  ): Promise<any> {
    const params: any = {
      top: Math.min(query.top || this.config.defaultTop, this.config.maxTop),
      select: [
        'id',
        'documentId',
        'content',
        'documentTitle',
        'documentSource',
        'chunkIndex',
        'metadata',
        'blobUrl'
      ],
      includeTotalCount: true
    };

    // Add vector search parameters
    if (queryEmbedding && query.searchType !== 'keyword') {
      params.vector = {
        value: queryEmbedding,
        kNearestNeighborsCount: params.top,
        fields: ['embedding']
      };
    }

    // Add filters
    if (query.filters) {
      params.filter = this.buildFilterExpression(query.filters);
    }

    // Add facets
    if (query.facets) {
      params.facets = query.facets;
    }

    // Add semantic ranking
    if (this.config.enableSemanticRanking && query.searchType === 'hybrid') {
      params.queryType = 'semantic';
      params.semanticConfiguration = this.config.semanticConfigName;
    }

    // Add highlighting
    if (this.config.enableHighlighting && query.searchType !== 'vector') {
      params.highlightFields = 'content';
      params.highlightPreTag = '<mark>';
      params.highlightPostTag = '</mark>';
    }

    return params;
  }

  /**
   * Build OData filter expression from filters
   * 
   * @param filters - Search filters
   * @returns string - OData filter expression
   */
  private buildFilterExpression(filters: SearchFilters): string {
    const expressions: string[] = [];

    if (filters.category) {
      expressions.push(`metadata/any(m: m eq 'category:${filters.category}')`);
    }

    if (filters.documentType) {
      expressions.push(`metadata/any(m: m eq 'fileType:${filters.documentType}')`);
    }

    if (filters.dateRange) {
      if (filters.dateRange.start) {
        expressions.push(`indexedAt ge ${filters.dateRange.start.toISOString()}`);
      }
      if (filters.dateRange.end) {
        expressions.push(`indexedAt le ${filters.dateRange.end.toISOString()}`);
      }
    }

    if (filters.documentIds && filters.documentIds.length > 0) {
      const idFilter = filters.documentIds
        .map(id => `documentId eq '${id}'`)
        .join(' or ');
      expressions.push(`(${idFilter})`);
    }

    if (filters.customFilter) {
      expressions.push(filters.customFilter);
    }

    return expressions.join(' and ');
  }

  /**
   * Transform Azure Search result to our format
   * 
   * @param searchResult - Raw search result
   * @param query - Original query
   * @returns SearchResult - Transformed result
   */
  private transformSearchResult(searchResult: any, _query: SearchQuery): SearchResult {
    const document = searchResult.document;
    
    // Calculate relevance score
    let score = searchResult.score || 0;
    if (searchResult['@search.rerankerScore']) {
      score = searchResult['@search.rerankerScore'];
    }

    // Extract highlights
    const highlights = searchResult['@search.highlights']?.content || [];

    // Parse metadata
    let metadata = {};
    try {
      metadata = JSON.parse(document.metadata || '{}');
    } catch (e) {
      this.logger.warn('Failed to parse document metadata');
    }

    return {
      id: document.id,
      documentId: document.documentId,
      content: document.content,
      score,
      documentTitle: document.documentTitle,
      documentSource: document.documentSource,
      chunkIndex: document.chunkIndex,
      highlights,
      metadata,
      blobUrl: document.blobUrl
    };
  }

  /**
   * Merge vector and keyword search results
   * 
   * @param vectorResults - Results from vector search
   * @param keywordResults - Results from keyword search
   * @param weight - Weight for vector results (0-1)
   * @returns SearchResult[] - Merged results
   */
  private mergeSearchResults(
    vectorResults: SearchResult[],
    keywordResults: SearchResult[],
    weight: number
  ): SearchResult[] {
    const mergedMap = new Map<string, SearchResult>();

    // Add vector results with weighted scores
    vectorResults.forEach(result => {
      mergedMap.set(result.id, {
        ...result,
        score: result.score * weight
      });
    });

    // Add or merge keyword results
    keywordResults.forEach(result => {
      const existing = mergedMap.get(result.id);
      if (existing) {
        // Merge scores
        existing.score += result.score * (1 - weight);
        // Merge highlights
        if (result.highlights.length > 0) {
          existing.highlights = [...existing.highlights, ...result.highlights];
        }
      } else {
        mergedMap.set(result.id, {
          ...result,
          score: result.score * (1 - weight)
        });
      }
    });

    // Sort by score and return
    return Array.from(mergedMap.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Rerank search results using specified strategy
   * 
   * @param results - Initial search results
   * @param query - Search query with reranking strategy
   * @returns SearchResult[] - Reranked results
   */
  private async rerankResults(
    results: SearchResult[],
    query: SearchQuery
  ): Promise<SearchResult[]> {
    const strategy = query.rerankingStrategy;
    
    if (strategy === 'mmr') {
      // Maximal Marginal Relevance reranking
      return this.rerankMMR(results, query.query);
    } else if (strategy === 'diversity') {
      // Diversity-based reranking
      return this.rerankForDiversity(results);
    } else if (strategy === 'recency') {
      // Recency-based reranking
      return this.rerankByRecency(results);
    }

    return results;
  }

  /**
   * Maximal Marginal Relevance (MMR) reranking
   * 
   * @param results - Search results
   * @param query - Original query
   * @returns SearchResult[] - Reranked results
   */
  private async rerankMMR(
    results: SearchResult[],
    query: string
  ): Promise<SearchResult[]> {
    if (results.length <= 1) return results;

    const lambda = 0.7; // Balance between relevance and diversity
    const selected: SearchResult[] = [];
    const remaining = [...results];

    // Get query embedding for similarity calculation
    // Note: In a full implementation, we would use this for similarity calculations
    // const queryEmbedding = await this.embeddingService.embedText(query);
    await this.embeddingService.embedText(query); // Currently unused but would be needed for full MMR

    // Select first result (highest relevance)
    selected.push(remaining.shift()!);

    // Iteratively select results that maximize MMR
    while (remaining.length > 0 && selected.length < results.length) {
      let bestScore = -Infinity;
      let bestIndex = -1;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        
        // Calculate relevance to query (already have this as the score)
        const relevance = candidate.score;

        // Calculate maximum similarity to already selected documents
        let maxSimilarity = 0;
        for (const selectedDoc of selected) {
          // In practice, we'd need embeddings for each result
          // For now, use a simple content similarity heuristic
          const similarity = this.calculateTextSimilarity(
            candidate.content,
            selectedDoc.content
          );
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }

        // MMR score
        const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }

      if (bestIndex >= 0) {
        selected.push(remaining.splice(bestIndex, 1)[0]);
      } else {
        break;
      }
    }

    return selected;
  }

  /**
   * Rerank for diversity
   * 
   * @param results - Search results
   * @returns SearchResult[] - Reranked results
   */
  private rerankForDiversity(results: SearchResult[]): SearchResult[] {
    // Group by document and select best chunk from each
    const documentGroups = new Map<string, SearchResult[]>();
    
    results.forEach(result => {
      const group = documentGroups.get(result.documentId) || [];
      group.push(result);
      documentGroups.set(result.documentId, group);
    });

    // Select best result from each document
    const diverse: SearchResult[] = [];
    documentGroups.forEach(group => {
      // Sort by score and take the best
      group.sort((a, b) => b.score - a.score);
      diverse.push(group[0]);
    });

    // Sort by score and return
    return diverse.sort((a, b) => b.score - a.score);
  }

  /**
   * Rerank by recency
   * 
   * @param results - Search results
   * @returns SearchResult[] - Reranked results
   */
  private rerankByRecency(results: SearchResult[]): SearchResult[] {
    const recencyWeight = 0.3;
    const now = Date.now();

    return results
      .map(result => {
        // Extract indexed date from metadata
        const indexedAt = new Date(result.metadata.indexedAt || now);
        const ageInDays = (now - indexedAt.getTime()) / (1000 * 60 * 60 * 24);
        
        // Apply recency boost (exponential decay)
        const recencyBoost = Math.exp(-ageInDays / 30); // 30-day half-life
        const adjustedScore = result.score * (1 - recencyWeight) + recencyBoost * recencyWeight;

        return {
          ...result,
          score: adjustedScore
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Extract context window around a chunk
   * 
   * @param documentId - Document ID
   * @param chunkIndex - Central chunk index
   * @param windowSize - Number of chunks before/after
   * @returns Promise<ContextWindow> - Context window
   */
  private async extractContextWindow(
    documentId: string,
    chunkIndex: number,
    windowSize: number
  ): Promise<ContextWindow> {
    const startIndex = Math.max(0, chunkIndex - windowSize);
    const endIndex = chunkIndex + windowSize;

    // Query for surrounding chunks
    const filter = `documentId eq '${documentId}' and chunkIndex ge ${startIndex} and chunkIndex le ${endIndex}`;
    
    const searchResults = await this.searchClient.search('*', {
      filter,
      orderBy: ['chunkIndex'],
      select: ['content', 'chunkIndex'],
      top: windowSize * 2 + 1
    });

    const chunks: { content: string; index: number }[] = [];
    for await (const result of searchResults.results) {
      chunks.push({
        content: result.document.content,
        index: result.document.chunkIndex
      });
    }

    return {
      before: chunks.filter(c => c.index < chunkIndex).map(c => c.content),
      current: chunks.find(c => c.index === chunkIndex)?.content || '',
      after: chunks.filter(c => c.index > chunkIndex).map(c => c.content)
    };
  }

  /**
   * Calculate simple text similarity
   * 
   * @param text1 - First text
   * @param text2 - Second text
   * @returns number - Similarity score (0-1)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity on words
    const words1 = new Set(text1.toLowerCase().split(/\\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Validate search query parameters
   * 
   * @param query - Search query to validate
   */
  private validateQuery(query: SearchQuery): void {
    if (!query.query || query.query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    if (query.top && (query.top < 1 || query.top > this.config.maxTop)) {
      throw new Error(`Top parameter must be between 1 and ${this.config.maxTop}`);
    }

    const validSearchTypes = ['vector', 'keyword', 'hybrid'];
    if (query.searchType && !validSearchTypes.includes(query.searchType)) {
      throw new Error(`Invalid search type: ${query.searchType}`);
    }

    const validRerankingStrategies = ['mmr', 'diversity', 'recency'];
    if (query.rerankingStrategy && !validRerankingStrategies.includes(query.rerankingStrategy)) {
      throw new Error(`Invalid reranking strategy: ${query.rerankingStrategy}`);
    }
  }

  /**
   * Get search suggestions based on partial query
   * 
   * @param partialQuery - Partial search query
   * @param maxSuggestions - Maximum suggestions to return
   * @returns Promise<string[]> - Suggested queries
   */
  async getSuggestions(
    partialQuery: string,
    maxSuggestions: number = 5
  ): Promise<string[]> {
    try {
      const suggestions = await this.searchClient.suggest(
        partialQuery,
        'sg',
        {
          top: maxSuggestions,
          highlightPreTag: '',
          highlightPostTag: ''
        }
      );

      return suggestions.results.map(s => s.text);
    } catch (error) {
      this.logger.error('Failed to get suggestions:', error);
      return [];
    }
  }

  /**
   * Perform faceted search to get aggregations
   * 
   * @param query - Search query
   * @param facets - Facet fields
   * @returns Promise<object> - Facet results
   */
  async getFacets(
    query: string,
    facets: string[]
  ): Promise<{ [key: string]: any }> {
    try {
      const searchResults = await this.searchClient.search(query, {
        facets,
        top: 0 // We only want facets, not results
      });

      return searchResults.facets || {};
    } catch (error) {
      this.logger.error('Failed to get facets:', error);
      return {};
    }
  }
}

// Export default instance for convenience
export default new RetrievalService();