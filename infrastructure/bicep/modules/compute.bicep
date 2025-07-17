@description('Location for all resources')
param location string

@description('Resource prefix')
param resourcePrefix string

@description('Environment name')
param environment string

@description('Resource tags')
param tags object

@description('Subnet ID for compute resources')
param subnetId string

@description('Key Vault ID')
param keyVaultId string

@description('Managed Identity ID')
param managedIdentityId string

var containerAppsEnvName = '${resourcePrefix}-${environment}-cae'
var containerRegistryName = '${resourcePrefix}${environment}acr'
var mcpServerName = '${resourcePrefix}-${environment}-mcp'

// Container Registry
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: containerRegistryName
  location: location
  tags: tags
  sku: {
    name: 'Premium'
  }
  properties: {
    adminUserEnabled: false
    networkRuleSet: {
      defaultAction: 'Deny'
      ipRules: []
    }
    policies: {
      quarantinePolicy: {
        status: 'enabled'
      }
      trustPolicy: {
        type: 'Notary'
        status: 'enabled'
      }
      retentionPolicy: {
        days: 30
        status: 'enabled'
      }
    }
    encryption: {
      status: 'enabled'
    }
    dataEndpointEnabled: true
    publicNetworkAccess: 'Disabled'
  }
}

// Container Apps Environment
resource containerAppsEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppsEnvName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'azure-monitor'
    }
    vnetConfiguration: {
      infrastructureSubnetId: subnetId
      internal: true
    }
    zoneRedundant: environment == 'prod' ? true : false
  }
}

// MCP Server Container App
resource mcpServer 'Microsoft.App/containerApps@2023-05-01' = {
  name: mcpServerName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Multiple'
      ingress: {
        external: false
        targetPort: 3000
        transport: 'http'
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      secrets: [
        {
          name: 'azure-subscription-id'
          keyVaultUrl: '${keyVaultId}/secrets/azure-subscription-id'
          identity: managedIdentityId
        }
        {
          name: 'log-analytics-workspace-id'
          keyVaultUrl: '${keyVaultId}/secrets/log-analytics-workspace-id'
          identity: managedIdentityId
        }
      ]
      registries: [
        {
          server: containerRegistry.properties.loginServer
          identity: managedIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          image: '${containerRegistry.properties.loginServer}/anf-mcp-server:latest'
          name: 'mcp-server'
          resources: {
            cpu: json('1.0')
            memory: '2Gi'
          }
          env: [
            {
              name: 'AZURE_SUBSCRIPTION_ID'
              secretRef: 'azure-subscription-id'
            }
            {
              name: 'LOG_ANALYTICS_WORKSPACE_ID'
              secretRef: 'log-analytics-workspace-id'
            }
            {
              name: 'AZURE_RESOURCE_GROUP'
              value: resourceGroup().name
            }
            {
              name: 'AZURE_LOCATION'
              value: location
            }
            {
              name: 'KEY_VAULT_URL'
              value: reference(keyVaultId, '2023-02-01').vaultUri
            }
            {
              name: 'NODE_ENV'
              value: environment
            }
          ]
          probes: [
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 3000
              }
              periodSeconds: 10
            }
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 3000
              }
              periodSeconds: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: environment == 'prod' ? 3 : 1
        maxReplicas: environment == 'prod' ? 10 : 3
        rules: [
          {
            name: 'cpu-scaling'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '70'
              }
            }
          }
        ]
      }
    }
  }
}

// Outputs
output containerRegistryId string = containerRegistry.id
output containerRegistryName string = containerRegistry.name
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output containerAppsEnvId string = containerAppsEnv.id
output mcpServerId string = mcpServer.id
output mcpServerName string = mcpServer.name
output mcpServerFqdn string = mcpServer.properties.configuration.ingress.fqdn