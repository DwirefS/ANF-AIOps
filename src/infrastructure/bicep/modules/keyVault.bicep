// Key Vault Module
// Author: Dwiref Sharma <DwirefS@SapientEdge.com>

param keyVaultName string
param location string
param environment string

@secure()
param teamsBotAppId string

@secure()
param teamsBotAppPassword string

@secure()
param openAiApiKey string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: {
    Environment: environment
    Component: 'Security'
    ManagedBy: 'ANF-AIops'
  }
  properties: {
    sku: {
      family: 'A'
      name: environment == 'prod' ? 'premium' : 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: environment == 'prod' ? 90 : 7
    enablePurgeProtection: environment == 'prod' ? true : false
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      ipRules: []
      virtualNetworkRules: []
    }
  }
}

// Teams Bot Credentials
resource teamsBotIdSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'teams-bot-app-id'
  properties: {
    value: teamsBotAppId
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

resource teamsBotPasswordSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'teams-bot-app-password'
  properties: {
    value: teamsBotAppPassword
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Azure OpenAI Credentials
resource openAiApiKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'openai-api-key'
  properties: {
    value: openAiApiKey
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Azure NetApp Files Service Principal
resource anfServicePrincipalSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'anf-service-principal-secret'
  properties: {
    value: 'placeholder-will-be-updated'
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri