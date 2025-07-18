// MCP Server Container App Module
// Author: Dwiref Sharma <DwirefS@SapientEdge.io>

param appName string
param location string
param environment string
param containerAppsEnvironmentId string
param registryLoginServer string
param keyVaultName string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource mcpServerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: appName
  location: location
  tags: {
    Environment: environment
    Component: 'MCP-Server'
    ManagedBy: 'ANF-AIops'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironmentId
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
        corsPolicy: {
          allowedOrigins: [
            'https://teams.microsoft.com'
            'https://*.teams.microsoft.com'
          ]
          allowedMethods: [
            'GET'
            'POST'
            'PUT'
            'DELETE'
            'OPTIONS'
          ]
          allowedHeaders: [
            '*'
          ]
          allowCredentials: true
        }
      }
      secrets: [
        {
          name: 'azure-client-id'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/azure-client-id'
          identity: 'system'
        }
        {
          name: 'azure-client-secret'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/anf-service-principal-secret'
          identity: 'system'
        }
        {
          name: 'openai-api-key'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/openai-api-key'
          identity: 'system'
        }
      ]
      registries: [
        {
          server: registryLoginServer
          identity: 'system-environment'
        }
      ]
      activeRevisionsMode: 'Single'
    }
    template: {
      containers: [
        {
          image: '${registryLoginServer}/mcp-server:latest'
          name: 'mcp-server'
          resources: {
            cpu: json(environment == 'prod' ? '2.0' : '0.5')
            memory: environment == 'prod' ? '4Gi' : '1Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: environment
            }
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'AZURE_TENANT_ID'
              value: subscription().tenantId
            }
            {
              name: 'AZURE_SUBSCRIPTION_ID'
              value: subscription().subscriptionId
            }
            {
              name: 'AZURE_CLIENT_ID'
              secretRef: 'azure-client-id'
            }
            {
              name: 'AZURE_CLIENT_SECRET'
              secretRef: 'azure-client-secret'
            }
            {
              name: 'OPENAI_API_KEY'
              secretRef: 'openai-api-key'
            }
            {
              name: 'LOG_LEVEL'
              value: environment == 'prod' ? 'info' : 'debug'
            }
          ]
          probes: [
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 3000
              }
              initialDelaySeconds: 10
              periodSeconds: 10
            }
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 3000
              }
              initialDelaySeconds: 30
              periodSeconds: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: environment == 'prod' ? 2 : 1
        maxReplicas: environment == 'prod' ? 10 : 3
        rules: [
          {
            name: 'http-requests'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}

// Grant Key Vault access to the Container App
resource keyVaultAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2023-07-01' = {
  parent: keyVault
  name: 'add'
  properties: {
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: mcpServerApp.identity.principalId
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

output appId string = mcpServerApp.id
output appName string = mcpServerApp.name
output appUrl string = 'https://${mcpServerApp.properties.configuration.ingress.fqdn}'
output principalId string = mcpServerApp.identity.principalId