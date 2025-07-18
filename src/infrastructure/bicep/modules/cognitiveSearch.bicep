// Azure Cognitive Search Module for RAG
// Author: Dwiref Sharma <DwirefS@SapientEdge.io>

param searchServiceName string
param location string
param environment string
param storageAccountId string

resource cognitiveSearch 'Microsoft.Search/searchServices@2023-11-01' = {
  name: searchServiceName
  location: location
  tags: {
    Environment: environment
    Component: 'AI-Search'
    Purpose: 'RAG'
    ManagedBy: 'ANF-AIops'
  }
  sku: {
    name: environment == 'prod' ? 'standard' : 'basic'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    replicaCount: environment == 'prod' ? 2 : 1
    partitionCount: environment == 'prod' ? 2 : 1
    hostingMode: 'default'
    publicNetworkAccess: 'enabled'
    networkRuleSet: {
      ipRules: []
    }
    encryptionWithCmk: {
      enforcement: 'Unspecified'
    }
  }
}

// Grant Search Service access to Storage Account
resource storageRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(cognitiveSearch.id, storageAccountId, 'Storage Blob Data Reader')
  scope: resourceId('Microsoft.Storage/storageAccounts', split(storageAccountId, '/')[8])
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1') // Storage Blob Data Reader
    principalId: cognitiveSearch.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output searchServiceName string = cognitiveSearch.name
output searchServiceId string = cognitiveSearch.id
output searchServiceEndpoint string = 'https://${cognitiveSearch.name}.search.windows.net'
output searchServicePrincipalId string = cognitiveSearch.identity.principalId
output searchServiceApiKey string = cognitiveSearch.listAdminKeys().primaryKey