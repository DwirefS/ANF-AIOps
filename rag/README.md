# RAG (Retrieval-Augmented Generation) System

## Overview

The RAG system for ANF-AIOps provides intelligent document retrieval and knowledge management capabilities for Azure NetApp Files operations. This system enhances the AI agents with contextual knowledge from documentation, operational guides, and historical data.

## Architecture

The RAG system consists of the following components:

### 1. Embedding Service (`/embedding`)
- Converts documents and queries into vector representations
- Supports multiple document formats (PDF, MD, TXT, JSON)
- Utilizes Azure OpenAI embeddings for high-quality vector generation

### 2. Document Indexer (`/indexer`)
- Processes and chunks documents for optimal retrieval
- Maintains metadata for document tracking
- Supports incremental indexing and updates

### 3. Retrieval Service (`/retriever`)
- Implements semantic search capabilities
- Provides relevance scoring and ranking
- Supports hybrid search (vector + keyword)

### 4. Vector Store (`/vector-store`)
- Manages vector database schema and operations
- Supports Azure Cognitive Search as the primary vector store
- Handles vector persistence and querying

### 5. Configuration (`/config`)
- Centralized configuration management
- Environment-specific settings
- Security and access control parameters

## Key Features

- **Semantic Search**: Find relevant information based on meaning, not just keywords
- **Context-Aware Retrieval**: Provides context-specific information for ANF operations
- **Multi-Format Support**: Process various document types including technical documentation
- **Scalable Architecture**: Designed to handle growing knowledge bases
- **Security-First**: Implements secure access patterns and data protection

## Integration Points

### MCP Server Integration
The RAG system integrates with the MCP (Microsoft Copilot) server to provide:
- Enhanced query responses with relevant documentation
- Context-aware suggestions for ANF operations
- Historical data retrieval for troubleshooting

### Azure Functions Integration
- Seamless integration with existing Azure Functions
- JWT-based authentication for secure access
- Rate limiting and quota management

### Teams Agent Integration
- Provides knowledge base for Teams bot responses
- Enables document-based Q&A capabilities
- Supports approval workflow context

## Getting Started

1. **Prerequisites**
   - Azure subscription with Cognitive Search enabled
   - Azure OpenAI service access
   - Node.js 18+ and npm

2. **Installation**
   ```bash
   cd rag
   npm install
   ```

3. **Configuration**
   - Copy `.env.example` to `.env`
   - Configure Azure services credentials
   - Set up vector store connection

4. **Initial Indexing**
   ```bash
   npm run index:docs
   ```

5. **Start Services**
   ```bash
   npm run start
   ```

## Usage Examples

### Indexing Documents
```typescript
import { DocumentIndexer } from './indexer/document-indexer';

const indexer = new DocumentIndexer();
await indexer.indexDocument({
  path: './docs/anf-operations-guide.pdf',
  metadata: {
    category: 'operations',
    version: '2.0'
  }
});
```

### Retrieving Information
```typescript
import { RetrievalService } from './retriever/retrieval-service';

const retriever = new RetrievalService();
const results = await retriever.search({
  query: 'How to create a capacity pool in ANF?',
  top: 5,
  filters: { category: 'operations' }
});
```

## Security Considerations

- All documents are encrypted at rest
- Access control through Azure AD integration
- Audit logging for all retrieval operations
- PII detection and redaction capabilities
- Rate limiting to prevent abuse

## Performance Optimization

- Chunk size optimization for better retrieval accuracy
- Caching frequently accessed documents
- Parallel processing for large document sets
- Vector dimension optimization based on use case

## Monitoring and Observability

- Application Insights integration
- Custom metrics for retrieval performance
- Document freshness tracking
- Query performance analytics

## Troubleshooting

Common issues and solutions:
1. **Slow retrieval**: Check vector store indexing status
2. **Poor relevance**: Adjust embedding model or chunk size
3. **Authentication errors**: Verify Azure AD configuration
4. **Rate limiting**: Review quota settings

## Contributing

Please follow the contribution guidelines in the main project README. Ensure all RAG system changes maintain backward compatibility and include appropriate tests.

## Author

Dwiref Sharma <DwirefS@SapientEdge.io>

## License

This project is licensed under the same terms as the ANF-AIOps project.