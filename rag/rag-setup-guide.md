# RAG System Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Azure Services Setup](#azure-services-setup)
3. [Local Development Setup](#local-development-setup)
4. [Configuration](#configuration)
5. [Initial Data Loading](#initial-data-loading)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Azure Services
- Azure Cognitive Search (Standard tier or higher)
- Azure OpenAI Service with access to embedding models
- Azure Storage Account for document storage
- Azure Key Vault for secrets management

### Development Tools
- Node.js 18.x or higher
- npm or yarn package manager
- Azure CLI installed and configured
- Git for version control
- Visual Studio Code (recommended)

### Access Requirements
- Azure subscription with appropriate permissions
- Azure AD application registration for authentication
- Access to ANF documentation repository

## Azure Services Setup

### 1. Azure Cognitive Search

```bash
# Create Cognitive Search service
az search service create \
  --name anf-aiops-search \
  --resource-group anf-aiops-rg \
  --sku standard \
  --location eastus

# Get admin key
az search admin-key show \
  --resource-group anf-aiops-rg \
  --service-name anf-aiops-search
```

### 2. Azure OpenAI Service

```bash
# Create OpenAI service
az cognitiveservices account create \
  --name anf-aiops-openai \
  --resource-group anf-aiops-rg \
  --kind OpenAI \
  --sku S0 \
  --location eastus

# Deploy embedding model
az cognitiveservices account deployment create \
  --name anf-aiops-openai \
  --resource-group anf-aiops-rg \
  --deployment-name text-embedding-ada-002 \
  --model-name text-embedding-ada-002 \
  --model-version "2" \
  --model-format OpenAI
```

### 3. Storage Account

```bash
# Create storage account
az storage account create \
  --name anfaiopstorage \
  --resource-group anf-aiops-rg \
  --location eastus \
  --sku Standard_LRS

# Create container for documents
az storage container create \
  --name documents \
  --account-name anfaiopstorage
```

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-org/ANF-AIOps.git
cd ANF-AIOps/rag

# Install dependencies
npm install

# Install development dependencies
npm install --save-dev \
  @types/node \
  @types/jest \
  typescript \
  ts-node \
  jest \
  eslint \
  prettier
```

### 2. Environment Configuration

Create a `.env` file in the `/rag` directory:

```env
# Azure Cognitive Search
AZURE_SEARCH_ENDPOINT=https://anf-aiops-search.search.windows.net
AZURE_SEARCH_ADMIN_KEY=your-admin-key
AZURE_SEARCH_INDEX_NAME=anf-knowledge-base

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://anf-aiops-openai.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=text-embedding-ada-002

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
AZURE_STORAGE_CONTAINER_NAME=documents

# Azure AD
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Application Settings
NODE_ENV=development
LOG_LEVEL=debug
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
VECTOR_DIMENSIONS=1536

# MCP Integration
MCP_SERVER_URL=http://localhost:8080
MCP_API_KEY=your-mcp-api-key
```

### 3. TypeScript Configuration

Ensure `tsconfig.json` is properly configured:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowJs": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## Configuration

### 1. Create Vector Store Index

```bash
# Run the index creation script
npm run create-index

# Or manually using the CLI
npx ts-node scripts/create-index.ts
```

### 2. Configure Document Processing Pipeline

Edit `config/rag-config.ts` to customize:
- Document chunk sizes
- Overlap settings
- Supported file types
- Metadata extraction rules

### 3. Set Up Authentication

```bash
# Register Azure AD application
az ad app create --display-name "ANF-AIOps-RAG"

# Create service principal
az ad sp create --id <app-id>

# Assign roles
az role assignment create \
  --assignee <sp-object-id> \
  --role "Cognitive Search Index Data Contributor" \
  --scope /subscriptions/<sub-id>/resourceGroups/anf-aiops-rg
```

## Initial Data Loading

### 1. Prepare Documents

Organize your documents in the following structure:
```
/documents
  /operations
    - anf-operations-guide.pdf
    - capacity-pool-management.md
  /troubleshooting
    - common-issues.md
    - performance-tuning.pdf
  /api-reference
    - anf-rest-api.json
    - terraform-docs.md
```

### 2. Run Initial Indexing

```bash
# Index all documents
npm run index:all

# Index specific category
npm run index:category -- --category=operations

# Index single document
npm run index:document -- --path="./documents/operations/anf-operations-guide.pdf"
```

### 3. Verify Indexing

```bash
# Check index statistics
npm run index:stats

# Test retrieval
npm run test:retrieval -- --query="How to create capacity pool"
```

## Testing

### 1. Unit Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- embedding.test.ts

# Run with coverage
npm run test:coverage
```

### 2. Integration Tests

```bash
# Test Azure services integration
npm run test:integration

# Test MCP server integration
npm run test:mcp
```

### 3. Performance Tests

```bash
# Run performance benchmarks
npm run benchmark

# Test retrieval latency
npm run test:performance
```

## Production Deployment

### 1. Build for Production

```bash
# Build TypeScript
npm run build

# Create production package
npm run package
```

### 2. Deploy to Azure Functions

```bash
# Deploy using Azure CLI
func azure functionapp publish anf-aiops-functions

# Or use GitHub Actions
git push origin main
```

### 3. Configure Production Settings

Update production environment variables in Azure:
```bash
az functionapp config appsettings set \
  --name anf-aiops-functions \
  --resource-group anf-aiops-rg \
  --settings @production.env
```

## Troubleshooting

### Common Issues

#### 1. Authentication Failures
```bash
# Check service principal permissions
az role assignment list --assignee <sp-object-id>

# Verify token acquisition
npm run debug:auth
```

#### 2. Slow Indexing
- Check document chunk size settings
- Verify network connectivity to Azure
- Monitor rate limiting from Azure OpenAI

#### 3. Poor Retrieval Quality
- Review embedding model selection
- Adjust chunk size and overlap
- Check document preprocessing quality

#### 4. Connection Issues
```bash
# Test Azure connectivity
npm run test:connection

# Check firewall rules
az network firewall list
```

### Debug Mode

Enable detailed logging:
```bash
export LOG_LEVEL=debug
npm run start:debug
```

### Health Checks

```bash
# Run health check
npm run health

# Check individual services
npm run health:search
npm run health:openai
npm run health:storage
```

## Maintenance

### Regular Tasks
1. Update document index weekly
2. Monitor retrieval performance metrics
3. Review and optimize chunk strategies
4. Update embedding models as needed

### Backup and Recovery
```bash
# Backup index
npm run backup:index

# Restore from backup
npm run restore:index -- --backup-id=<id>
```

## Support

For issues or questions:
- Check the troubleshooting section above
- Review logs in Application Insights
- Contact: Dwiref Sharma <DwirefS@SapientEdge.io>

## Author

Dwiref Sharma <DwirefS@SapientEdge.io>