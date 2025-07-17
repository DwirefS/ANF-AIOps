// Container Apps Environment Module
// Author: Dwiref Sharma <DwirefS@SapientEdge.com>

param environmentName string
param location string
param environment string
param subnetId string
param logAnalyticsWorkspaceId string = ''

// Create Log Analytics workspace if not provided
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = if (empty(logAnalyticsWorkspaceId)) {
  name: '${environmentName}-law'
  location: location
  tags: {
    Environment: environment
    Component: 'Monitoring'
    ManagedBy: 'ANF-AIops'
  }
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: environment == 'prod' ? 90 : 30
  }
}

var workspaceId = empty(logAnalyticsWorkspaceId) ? logAnalyticsWorkspace.id : logAnalyticsWorkspaceId

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: environmentName
  location: location
  tags: {
    Environment: environment
    Component: 'Container'
    ManagedBy: 'ANF-AIops'
  }
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: reference(workspaceId, '2022-10-01').customerId
        sharedKey: listKeys(workspaceId, '2022-10-01').primarySharedKey
      }
    }
    vnetConfiguration: {
      infrastructureSubnetId: subnetId
      internal: false
    }
    zoneRedundant: environment == 'prod' ? true : false
  }
}

output environmentId string = containerAppsEnvironment.id
output environmentName string = containerAppsEnvironment.name
output defaultDomain string = containerAppsEnvironment.properties.defaultDomain
output staticIp string = containerAppsEnvironment.properties.staticIp