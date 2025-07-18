// Monitoring Module - Log Analytics and Application Insights
// Author: Dwiref Sharma <DwirefS@SapientEdge.io>

param workspaceName string
param location string
param environment string
param appInsightsName string

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: workspaceName
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
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    workspaceCapping: {
      dailyQuotaGb: environment == 'prod' ? 100 : 10
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: {
    Environment: environment
    Component: 'Monitoring'
    ManagedBy: 'ANF-AIops'
  }
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    RetentionInDays: environment == 'prod' ? 90 : 30
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ANF Monitoring Solution
resource anfMonitoringSolution 'Microsoft.OperationsManagement/solutions@2015-11-01-preview' = {
  name: 'NetApp(${logAnalyticsWorkspace.name})'
  location: location
  tags: {
    Environment: environment
    Component: 'Monitoring'
    ManagedBy: 'ANF-AIops'
  }
  plan: {
    name: 'NetApp(${logAnalyticsWorkspace.name})'
    publisher: 'Microsoft'
    product: 'OMSGallery/NetApp'
    promotionCode: ''
  }
  properties: {
    workspaceResourceId: logAnalyticsWorkspace.id
  }
}

// Diagnostic Settings for ANF
resource anfDiagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'anf-diagnostics'
  scope: resourceGroup()
  properties: {
    workspaceId: logAnalyticsWorkspace.id
    logs: [
      {
        category: 'Administrative'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: environment == 'prod' ? 90 : 30
        }
      }
      {
        category: 'Security'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: environment == 'prod' ? 90 : 30
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: environment == 'prod' ? 90 : 30
        }
      }
    ]
  }
}

// Alert Rules
resource capacityAlertRule 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'anf-capacity-alert'
  location: 'global'
  tags: {
    Environment: environment
    Component: 'Monitoring'
    ManagedBy: 'ANF-AIops'
  }
  properties: {
    description: 'Alert when ANF volume capacity exceeds 80%'
    severity: 2
    enabled: true
    scopes: [
      resourceGroup().id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'HighCapacityUsage'
          metricName: 'VolumeConsumedSizePercentage'
          metricNamespace: 'Microsoft.NetApp/netAppAccounts/capacityPools/volumes'
          operator: 'GreaterThan'
          threshold: 80
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    autoMitigate: true
    targetResourceType: 'Microsoft.NetApp/netAppAccounts/capacityPools/volumes'
    targetResourceRegion: location
    actions: []
  }
}

resource performanceAlertRule 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'anf-performance-alert'
  location: 'global'
  tags: {
    Environment: environment
    Component: 'Monitoring'
    ManagedBy: 'ANF-AIops'
  }
  properties: {
    description: 'Alert when ANF volume latency exceeds threshold'
    severity: 2
    enabled: true
    scopes: [
      resourceGroup().id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'HighLatency'
          metricName: 'AverageReadLatency'
          metricNamespace: 'Microsoft.NetApp/netAppAccounts/capacityPools/volumes'
          operator: 'GreaterThan'
          threshold: 20
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    autoMitigate: true
    targetResourceType: 'Microsoft.NetApp/netAppAccounts/capacityPools/volumes'
    targetResourceRegion: location
    actions: []
  }
}

output workspaceId string = logAnalyticsWorkspace.id
output workspaceName string = logAnalyticsWorkspace.name
output appInsightsId string = appInsights.id
output appInsightsName string = appInsights.name
output instrumentationKey string = appInsights.properties.InstrumentationKey
output connectionString string = appInsights.properties.ConnectionString