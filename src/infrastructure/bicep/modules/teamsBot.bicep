// Teams Bot App Service Module
// Author: Dwiref Sharma <DwirefS@SapientEdge.io>

param appName string
param location string
param environment string
param appServicePlanName string
param keyVaultName string
param mcpServerUrl string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanName
  location: location
  tags: {
    Environment: environment
    Component: 'Teams-Bot'
    ManagedBy: 'ANF-AIops'
  }
  sku: {
    name: environment == 'prod' ? 'P1v3' : 'B1'
    tier: environment == 'prod' ? 'PremiumV3' : 'Basic'
    capacity: environment == 'prod' ? 2 : 1
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource teamsBot 'Microsoft.Web/sites@2023-01-01' = {
  name: appName
  location: location
  tags: {
    Environment: environment
    Component: 'Teams-Bot'
    ManagedBy: 'ANF-AIops'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|18-lts'
      alwaysOn: environment == 'prod' ? true : false
      appSettings: [
        {
          name: 'NODE_ENV'
          value: environment
        }
        {
          name: 'MicrosoftAppId'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=teams-bot-app-id)'
        }
        {
          name: 'MicrosoftAppPassword'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=teams-bot-app-password)'
        }
        {
          name: 'MCP_SERVER_URL'
          value: mcpServerUrl
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=appinsights-connection-string)'
        }
      ]
      cors: {
        allowedOrigins: [
          'https://teams.microsoft.com'
          'https://*.teams.microsoft.com'
        ]
      }
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
    httpsOnly: true
  }
}

// Grant Key Vault access to the App Service
resource keyVaultAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2023-07-01' = {
  parent: keyVault
  name: 'add'
  properties: {
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: teamsBot.identity.principalId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

// Bot Channel Registration
resource botChannelRegistration 'Microsoft.BotService/botServices@2022-09-15' = {
  name: '${appName}-bot'
  location: 'global'
  tags: {
    Environment: environment
    Component: 'Teams-Bot'
    ManagedBy: 'ANF-AIops'
  }
  sku: {
    name: 'F0'
  }
  kind: 'azurebot'
  properties: {
    displayName: 'ANF AI-Ops Bot'
    endpoint: 'https://${teamsBot.properties.defaultHostName}/api/messages'
    msaAppId: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=teams-bot-app-id)'
    developerAppInsightKey: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=appinsights-instrumentation-key)'
    developerAppInsightsApplicationId: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=appinsights-app-id)'
  }
}

// Teams Channel
resource teamsChannel 'Microsoft.BotService/botServices/channels@2022-09-15' = {
  parent: botChannelRegistration
  name: 'MsTeamsChannel'
  properties: {
    channelName: 'MsTeamsChannel'
    properties: {
      isEnabled: true
      enableCalling: false
      enableVideo: false
    }
  }
}

output appId string = teamsBot.id
output appName string = teamsBot.name
output appUrl string = 'https://${teamsBot.properties.defaultHostName}'
output principalId string = teamsBot.identity.principalId
output botChannelRegistrationName string = botChannelRegistration.name