/**
 * Create Azure Cognitive Search Index Script
 * 
 * This script creates the vector store index in Azure Cognitive Search
 * with the appropriate schema for the RAG system.
 * 
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import { SearchIndexClient, AzureKeyCredential } from '@azure/search-documents';
import { createIndexSchema } from '../vector-store/schema';
import { ragConfig, validateConfig } from '../config/rag-config';
import { Logger } from '../utils/logger';

async function createIndex() {
  const logger = new Logger('CreateIndex');
  
  try {
    // Validate configuration
    validateConfig();
    
    logger.info('Creating Azure Cognitive Search index...');
    
    // Create index client
    const indexClient = new SearchIndexClient(
      ragConfig.search.endpoint,
      new AzureKeyCredential(ragConfig.search.apiKey)
    );
    
    // Check if index already exists
    try {
      await indexClient.getIndex(ragConfig.search.indexName);
      logger.warn(`Index ${ragConfig.search.indexName} already exists`);
      
      // Optionally delete and recreate
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise<string>(resolve => {
        readline.question('Do you want to delete and recreate the index? (yes/no): ', resolve);
      });
      
      readline.close();
      
      if (answer.toLowerCase() !== 'yes') {
        logger.info('Keeping existing index');
        return;
      }
      
      logger.info('Deleting existing index...');
      await indexClient.deleteIndex(ragConfig.search.indexName);
      
    } catch (error) {
      // Index doesn't exist, which is fine
      logger.info('Index does not exist, creating new index');
    }
    
    // Create the index schema
    const indexSchema = createIndexSchema(ragConfig.search.indexName);
    
    // Create the index
    logger.info(`Creating index: ${ragConfig.search.indexName}`);
    const result = await indexClient.createIndex(indexSchema);
    
    logger.info(`Index created successfully: ${result.name}`);
    logger.info('Index fields:', result.fields.map(f => f.name).join(', '));
    
  } catch (error) {
    logger.error('Failed to create index:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createIndex();
}