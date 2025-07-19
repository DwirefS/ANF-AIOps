/**
 * Vector Store Schema Definition for ANF-AIOps RAG System
 * 
 * This file defines the schema and data structures used in the Azure Cognitive Search
 * vector store. It includes index definitions, field configurations, and mapping
 * utilities for the document storage and retrieval system.
 * 
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 * @version 1.0.0
 */

import { SearchIndex, SearchField } from '@azure/search-documents';

/**
 * Document chunk schema for vector store
 * 
 * This interface defines the structure of document chunks stored in the search index.
 * Each chunk represents a portion of a larger document with associated metadata.
 */
export interface VectorStoreDocument {
  /** Unique identifier for the chunk */
  id: string;
  
  /** Parent document identifier */
  documentId: string;
  
  /** Text content of the chunk */
  content: string;
  
  /** Vector embedding of the content */
  embedding: number[];
  
  /** Position of this chunk within the document */
  chunkIndex: number;
  
  /** Title of the parent document */
  documentTitle: string;
  
  /** Source path or URL of the parent document */
  documentSource: string;
  
  /** URL to the document in blob storage */
  blobUrl?: string;
  
  /** JSON-serialized metadata */
  metadata: string;
  
  /** Timestamp when the chunk was indexed */
  indexedAt: Date;
  
  /** Category classification for filtering */
  category?: string;
  
  /** Document type (pdf, md, txt, json) */
  documentType?: string;
  
  /** Relevance score (populated during search) */
  score?: number;
}

/**
 * Creates the Azure Cognitive Search index schema
 * 
 * This function defines the complete schema for the vector store index,
 * including all fields, their types, and search capabilities.
 * 
 * @param indexName - Name of the index to create
 * @returns SearchIndex - Complete index definition
 */
export function createIndexSchema(indexName: string): SearchIndex {
  const fields: SearchField[] = [
    // Primary key field
    {
      name: 'id',
      type: 'Edm.String',
      key: true,
      searchable: false,
      filterable: true,
      sortable: false,
      facetable: false
    },
    
    // Document identifier field
    {
      name: 'documentId',
      type: 'Edm.String',
      searchable: false,
      filterable: true,
      sortable: false,
      facetable: true
    },
    
    // Main content field - searchable text
    {
      name: 'content',
      type: 'Edm.String',
      searchable: true,
      filterable: false,
      sortable: false,
      facetable: false,
      analyzerName: 'standard.lucene'
    },
    
    // Vector embedding field
    {
      name: 'embedding',
      type: 'Collection(Edm.Single)',
      searchable: true,
      filterable: false,
      sortable: false,
      facetable: false,
      // Note: dimensions and vectorSearchProfile are configured in the vectorSearch section
    } as SearchField,
    
    // Chunk index within document
    {
      name: 'chunkIndex',
      type: 'Edm.Int32',
      searchable: false,
      filterable: true,
      sortable: true,
      facetable: false
    },
    
    // Document title - searchable
    {
      name: 'documentTitle',
      type: 'Edm.String',
      searchable: true,
      filterable: true,
      sortable: true,
      facetable: true,
      analyzerName: 'standard.lucene'
    },
    
    // Document source/path
    {
      name: 'documentSource',
      type: 'Edm.String',
      searchable: false,
      filterable: true,
      sortable: false,
      facetable: true
    },
    
    // Blob storage URL
    {
      name: 'blobUrl',
      type: 'Edm.String',
      searchable: false,
      filterable: false,
      sortable: false,
      facetable: false
    },
    
    // JSON metadata field
    {
      name: 'metadata',
      type: 'Edm.String',
      searchable: false,
      filterable: false,
      sortable: false,
      facetable: false
    },
    
    // Indexing timestamp
    {
      name: 'indexedAt',
      type: 'Edm.DateTimeOffset',
      searchable: false,
      filterable: true,
      sortable: true,
      facetable: false
    },
    
    // Category for filtering
    {
      name: 'category',
      type: 'Edm.String',
      searchable: false,
      filterable: true,
      sortable: false,
      facetable: true
    },
    
    // Document type for filtering
    {
      name: 'documentType',
      type: 'Edm.String',
      searchable: false,
      filterable: true,
      sortable: false,
      facetable: true
    }
  ];

  // Create the index definition
  const index: SearchIndex = {
    name: indexName,
    fields: fields,
    
    // Vector search configuration
    vectorSearch: {
      profiles: [
        {
          name: 'vector-profile',
          algorithmConfigurationName: 'hnsw-config'
        }
      ],
      algorithms: [
        {
          name: 'hnsw-config',
          kind: 'hnsw',
          parameters: {
            metric: 'cosine',
            m: 4,
            efConstruction: 400,
            efSearch: 500
          }
        }
      ]
    },
    
    // Semantic search configuration (cast to any to handle SDK type limitations)
    semanticSearch: {
      configurations: [
        {
          name: 'anf-semantic-config',
          prioritizedFields: {
            titleField: {
              name: 'documentTitle'
            },
            prioritizedContentFields: [
              {
                name: 'content'
              }
            ]
          }
        }
      ]
    } as any,
    
    // Suggester configuration for autocomplete
    suggesters: [
      {
        name: 'sg',
        searchMode: 'analyzingInfixMatching',
        sourceFields: ['documentTitle', 'content']
      }
    ],
    
    // Scoring profiles for relevance tuning
    scoringProfiles: [
      {
        name: 'relevance-boost',
        textWeights: {
          weights: {
            documentTitle: 2.0,
            content: 1.0
          }
        },
        functions: [
          {
            type: 'freshness',
            fieldName: 'indexedAt',
            boost: 1.5,
            parameters: {
              boostingDuration: 'P30D' // 30-day freshness boost
            }
          } as any
        ]
      }
    ],
    
    // CORS settings for browser access
    corsOptions: {
      allowedOrigins: ['*'],
      maxAgeInSeconds: 300
    }
  };

  return index;
}

/**
 * Field mapping utilities for data transformation
 */
export const FieldMappings = {
  /**
   * Map a document to vector store format
   * 
   * @param doc - Source document
   * @returns VectorStoreDocument - Mapped document
   */
  toVectorStore: (doc: any): Partial<VectorStoreDocument> => {
    return {
      id: doc.id,
      documentId: doc.documentId,
      content: doc.content,
      embedding: doc.embedding,
      chunkIndex: doc.chunkIndex || 0,
      documentTitle: doc.title || doc.documentTitle,
      documentSource: doc.source || doc.documentSource,
      blobUrl: doc.blobUrl,
      metadata: typeof doc.metadata === 'string' 
        ? doc.metadata 
        : JSON.stringify(doc.metadata || {}),
      indexedAt: doc.indexedAt || new Date(),
      category: doc.category || doc.metadata?.category,
      documentType: doc.documentType || doc.metadata?.fileType
    };
  },

  /**
   * Map vector store document to application format
   * 
   * @param doc - Vector store document
   * @returns Application document format
   */
  fromVectorStore: (doc: VectorStoreDocument): any => {
    let parsedMetadata = {};
    try {
      parsedMetadata = JSON.parse(doc.metadata);
    } catch (e) {
      // Handle invalid JSON
    }

    return {
      id: doc.id,
      documentId: doc.documentId,
      content: doc.content,
      embedding: doc.embedding,
      chunkIndex: doc.chunkIndex,
      title: doc.documentTitle,
      source: doc.documentSource,
      blobUrl: doc.blobUrl,
      metadata: parsedMetadata,
      indexedAt: doc.indexedAt,
      category: doc.category,
      documentType: doc.documentType,
      score: doc.score
    };
  }
};

/**
 * Query builder utilities for vector store operations
 */
export const QueryBuilders = {
  /**
   * Build a vector similarity search query
   * 
   * @param embedding - Query embedding vector
   * @param top - Number of results
   * @param filters - Optional filters
   * @returns Search query parameters
   */
  vectorSearch: (embedding: number[], top: number = 5, filters?: any) => {
    return {
      search: '*',
      vector: {
        value: embedding,
        kNearestNeighborsCount: top,
        fields: ['embedding']
      },
      select: [
        'id',
        'documentId',
        'content',
        'documentTitle',
        'documentSource',
        'chunkIndex',
        'metadata',
        'blobUrl',
        'category',
        'documentType'
      ],
      filter: filters,
      top: top
    };
  },

  /**
   * Build a hybrid search query (vector + keyword)
   * 
   * @param query - Text query
   * @param embedding - Query embedding
   * @param top - Number of results
   * @returns Search query parameters
   */
  hybridSearch: (query: string, embedding: number[], top: number = 5) => {
    return {
      search: query,
      searchMode: 'all',
      queryType: 'semantic',
      semanticConfiguration: 'anf-semantic-config',
      vector: {
        value: embedding,
        kNearestNeighborsCount: top * 2,
        fields: ['embedding']
      },
      select: [
        'id',
        'documentId',
        'content',
        'documentTitle',
        'documentSource',
        'chunkIndex',
        'metadata',
        'blobUrl',
        'category',
        'documentType'
      ],
      top: top,
      scoringProfile: 'relevance-boost'
    };
  },

  /**
   * Build a filter expression
   * 
   * @param filters - Filter criteria
   * @returns OData filter string
   */
  buildFilter: (filters: {
    documentId?: string;
    category?: string;
    documentType?: string;
    dateRange?: { start?: Date; end?: Date };
  }): string => {
    const expressions: string[] = [];

    if (filters.documentId) {
      expressions.push(`documentId eq '${filters.documentId}'`);
    }

    if (filters.category) {
      expressions.push(`category eq '${filters.category}'`);
    }

    if (filters.documentType) {
      expressions.push(`documentType eq '${filters.documentType}'`);
    }

    if (filters.dateRange) {
      if (filters.dateRange.start) {
        expressions.push(`indexedAt ge ${filters.dateRange.start.toISOString()}`);
      }
      if (filters.dateRange.end) {
        expressions.push(`indexedAt le ${filters.dateRange.end.toISOString()}`);
      }
    }

    return expressions.join(' and ');
  }
};

/**
 * Index management utilities
 */
export const IndexManagement = {
  /**
   * Get index statistics query
   * 
   * @returns Statistics query parameters
   */
  getStatsQuery: () => {
    return {
      search: '*',
      count: true,
      top: 0,
      facets: ['documentId,count:1000', 'category,count:50', 'documentType,count:10']
    };
  },

  /**
   * Get cleanup query for old documents
   * 
   * @param daysOld - Age threshold in days
   * @returns Cleanup filter
   */
  getCleanupFilter: (daysOld: number = 90) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    return `indexedAt lt ${cutoffDate.toISOString()}`;
  }
};

/**
 * Validation utilities for vector store operations
 */
export const Validators = {
  /**
   * Validate embedding dimensions
   * 
   * @param embedding - Embedding vector
   * @param expectedDimensions - Expected dimensions
   * @returns boolean - Validation result
   */
  validateEmbedding: (embedding: number[], expectedDimensions: number = 1536): boolean => {
    return Array.isArray(embedding) && 
           embedding.length === expectedDimensions &&
           embedding.every(val => typeof val === 'number' && !isNaN(val));
  },

  /**
   * Validate document for indexing
   * 
   * @param doc - Document to validate
   * @returns Validation result with errors
   */
  validateDocument: (doc: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!doc.id) {
      errors.push('Document ID is required');
    }

    if (!doc.content || typeof doc.content !== 'string') {
      errors.push('Document content must be a non-empty string');
    }

    if (!doc.embedding || !Validators.validateEmbedding(doc.embedding)) {
      errors.push('Valid embedding vector is required');
    }

    if (doc.chunkIndex !== undefined && typeof doc.chunkIndex !== 'number') {
      errors.push('Chunk index must be a number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};

/**
 * Export all schema-related utilities
 */
export default {
  createIndexSchema,
  FieldMappings,
  QueryBuilders,
  IndexManagement,
  Validators
};