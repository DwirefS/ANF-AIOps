// Azure NetApp Files AI-Ops Infrastructure
// Author: Dwiref Sharma <DwirefS@SapientEdge.io>

targetScope = 'subscription'

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environment string

@description('Azure region for all resources')
param location string = 'eastus'

@description('Project name')
param projectName string = 'anf-aiops'

@description('Azure NetApp Files account name')
param anfAccountName string = '${projectName}-${environment}-anf'

@description('Teams bot app ID')
@secure()
param teamsBotAppId string

@description('Teams bot app password')
@secure()
param teamsBotAppPassword string

@description('Azure OpenAI API key')
@secure()
param openAiApiKey string

@description('Log Analytics workspace ID')
param logAnalyticsWorkspaceId string = ''

var resourceGroupName = '${projectName}-${environment}-rg'
var uniqueSuffix = uniqueString(subscription().subscriptionId, resourceGroupName)

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: resourceGroupName
  location: location
  tags: {
    Environment: environment
    Project: projectName
    ManagedBy: 'ANF-AIops'
    Author: 'Dwiref Sharma'
  }
}

// Key Vault Module
module keyVault './modules/keyVault.bicep' = {
  name: 'keyVault'
  scope: rg
  params: {
    keyVaultName: '${projectName}-${environment}-kv-${uniqueSuffix}'
    location: location
    environment: environment
    teamsBotAppId: teamsBotAppId
    teamsBotAppPassword: teamsBotAppPassword
    openAiApiKey: openAiApiKey
  }
}

// Virtual Network Module
module network './modules/network.bicep' = {
  name: 'network'
  scope: rg
  params: {
    vnetName: '${projectName}-${environment}-vnet'
    location: location
    environment: environment
  }
}

// Container Registry Module
module containerRegistry './modules/containerRegistry.bicep' = {
  name: 'containerRegistry'
  scope: rg
  params: {
    registryName: '${projectName}${environment}acr${uniqueSuffix}'
    location: location
    environment: environment
  }
}

// Container Apps Environment Module
module containerAppsEnvironment './modules/containerAppsEnvironment.bicep' = {
  name: 'containerAppsEnvironment'
  scope: rg
  params: {
    environmentName: '${projectName}-${environment}-cae'
    location: location
    environment: environment
    subnetId: network.outputs.containerAppsSubnetId
    logAnalyticsWorkspaceId: logAnalyticsWorkspaceId
  }
}

// MCP Server Container App Module
module mcpServer './modules/mcpServer.bicep' = {
  name: 'mcpServer'
  scope: rg
  params: {
    appName: '${projectName}-${environment}-mcp'
    location: location
    environment: environment
    containerAppsEnvironmentId: containerAppsEnvironment.outputs.environmentId
    registryLoginServer: containerRegistry.outputs.loginServer
    keyVaultName: keyVault.outputs.keyVaultName
  }
  dependsOn: [
    containerRegistry
    containerAppsEnvironment
  ]
}

// Teams Bot App Service Module
module teamsBot './modules/teamsBot.bicep' = {
  name: 'teamsBot'
  scope: rg
  params: {
    appName: '${projectName}-${environment}-bot'
    location: location
    environment: environment
    appServicePlanName: '${projectName}-${environment}-asp'
    keyVaultName: keyVault.outputs.keyVaultName
    mcpServerUrl: mcpServer.outputs.appUrl
  }
  dependsOn: [
    keyVault
    mcpServer
  ]
}

// API Management Module
module apiManagement './modules/apiManagement.bicep' = {
  name: 'apiManagement'
  scope: rg
  params: {
    apimName: '${projectName}-${environment}-apim'
    location: location
    environment: environment
    publisherEmail: 'DwirefS@SapientEdge.io'
    publisherName: 'Dwiref Sharma'
    subnetId: network.outputs.apimSubnetId
    mcpServerUrl: mcpServer.outputs.appUrl
  }
  dependsOn: [
    network
    mcpServer
  ]
}

// Azure NetApp Files Module
module anfAccount './modules/netappAccount.bicep' = {
  name: 'anfAccount'
  scope: rg
  params: {
    accountName: anfAccountName
    location: location
    environment: environment
  }
}

// Storage Account for Documents Module
module storage './modules/storage.bicep' = {
  name: 'storage'
  scope: rg
  params: {
    storageAccountName: '${projectName}${environment}st${uniqueSuffix}'
    location: location
    environment: environment
  }
}

// Azure Cognitive Search Module
module cognitiveSearch './modules/cognitiveSearch.bicep' = {
  name: 'cognitiveSearch'
  scope: rg
  params: {
    searchServiceName: '${projectName}-${environment}-search'
    location: location
    environment: environment
    storageAccountId: storage.outputs.storageAccountId
  }
  dependsOn: [
    storage
  ]
}

// Monitoring Module
module monitoring './modules/monitoring.bicep' = {
  name: 'monitoring'
  scope: rg
  params: {
    workspaceName: '${projectName}-${environment}-law'
    location: location
    environment: environment
    appInsightsName: '${projectName}-${environment}-ai'
  }
}

// Outputs
output resourceGroupName string = rg.name
output keyVaultName string = keyVault.outputs.keyVaultName
output mcpServerUrl string = mcpServer.outputs.appUrl
output teamsBotUrl string = teamsBot.outputs.appUrl
output apimGatewayUrl string = apiManagement.outputs.gatewayUrl
output storageAccountName string = storage.outputs.storageAccountName
output searchServiceName string = cognitiveSearch.outputs.searchServiceName
output anfAccountName string = anfAccount.outputs.accountName
output logAnalyticsWorkspaceId string = monitoring.outputs.workspaceId
output appInsightsInstrumentationKey string = monitoring.outputs.instrumentationKey