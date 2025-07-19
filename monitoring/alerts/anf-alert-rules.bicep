// ANF-AIOps Alert Rules Configuration
// Author: Dwiref Sharma <DwirefS@SapientEdge.io>
// Comprehensive alerting configuration for ANF-AIOps monitoring

@description('Name prefix for alert rules')
param alertNamePrefix string = 'ANF-AIOps'

@description('Resource group name containing ANF-AIOps resources')
param resourceGroupName string

@description('Application Insights resource ID')
param applicationInsightsId string

@description('Log Analytics workspace resource ID') 
param logAnalyticsWorkspaceId string

@description('Function App resource ID')
param functionAppId string

@description('Container Instance resource ID')
param containerInstanceId string

@description('Action group resource ID for notifications')
param actionGroupId string

@description('Environment (dev, test, prod)')
@allowed(['dev', 'test', 'prod'])
param environment string = 'prod'

@description('Tags to apply to all alert rules')
param tags object = {
  Environment: environment
  Application: 'ANF-AIOps'
  Owner: 'DwirefS@SapientEdge.io'
  AlertType: 'Operational'
}

// Variables for alert thresholds based on environment
var alertThresholds = {
  dev: {
    errorRate: 10.0        // 10% error rate threshold for dev
    responseTime: 10000    // 10 seconds response time threshold
    availability: 90.0     // 90% availability threshold
    cpuUsage: 90.0        // 90% CPU usage threshold
    memoryUsage: 90.0     // 90% memory usage threshold
  }
  test: {
    errorRate: 5.0         // 5% error rate threshold for test
    responseTime: 5000     // 5 seconds response time threshold
    availability: 95.0     // 95% availability threshold
    cpuUsage: 85.0        // 85% CPU usage threshold
    memoryUsage: 85.0     // 85% memory usage threshold
  }
  prod: {
    errorRate: 2.0         // 2% error rate threshold for production
    responseTime: 3000     // 3 seconds response time threshold
    availability: 99.0     // 99% availability threshold
    cpuUsage: 80.0        // 80% CPU usage threshold
    memoryUsage: 80.0     // 80% memory usage threshold
  }
}

var currentThresholds = alertThresholds[environment]

// =============================================================================
// CRITICAL ALERTS - P0 SEVERITY
// =============================================================================

// Critical: Service Availability Alert
resource serviceAvailabilityAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: '${alertNamePrefix}-Service-Availability-Critical'
  location: resourceGroup().location
  tags: union(tags, {
    Severity: 'Critical'
    Priority: 'P0'
  })
  properties: {
    displayName: 'ANF-AIOps Service Availability Critical'
    description: 'Alerts when service availability drops below threshold'
    severity: 0 // Critical
    enabled: true
    evaluationFrequency: 'PT1M'  // Evaluate every 1 minute
    windowSize: 'PT5M'           // 5 minute window
    criteria: {
      allOf: [
        {
          query: '''
            requests
            | where timestamp > ago(5m)
            | summarize 
                TotalRequests = count(),
                SuccessfulRequests = countif(success == true)
            | extend AvailabilityPercent = (SuccessfulRequests * 100.0) / TotalRequests
            | where AvailabilityPercent < ${currentThresholds.availability}
          '''
          timeAggregation: 'Average'
          dimensions: []
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 2
            minFailingPeriodsToAlert: 2
          }
        }
      ]
    }
    targetResourceTypes: [
      'Microsoft.Insights/components'
    ]
    scopes: [
      applicationInsightsId
    ]
    actions: {
      actionGroups: [
        actionGroupId
      ]
      customProperties: {
        AlertType: 'ServiceAvailability'
        Severity: 'Critical'
        Environment: environment
      }
    }
  }
}

// Critical: High Error Rate Alert
resource highErrorRateAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: '${alertNamePrefix}-High-Error-Rate-Critical'
  location: resourceGroup().location
  tags: union(tags, {
    Severity: 'Critical'
    Priority: 'P0'
  })
  properties: {
    displayName: 'ANF-AIOps High Error Rate Critical'
    description: 'Alerts when error rate exceeds critical threshold'
    severity: 0 // Critical
    enabled: true
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      allOf: [
        {
          query: '''
            requests
            | where timestamp > ago(5m)
            | summarize 
                TotalRequests = count(),
                FailedRequests = countif(success == false)
            | extend ErrorRate = (FailedRequests * 100.0) / TotalRequests
            | where ErrorRate > ${currentThresholds.errorRate}
          '''
          timeAggregation: 'Average'
          dimensions: []
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 3
            minFailingPeriodsToAlert: 2
          }
        }
      ]
    }
    targetResourceTypes: [
      'Microsoft.Insights/components'
    ]
    scopes: [
      applicationInsightsId
    ]
    actions: {
      actionGroups: [
        actionGroupId
      ]
      customProperties: {
        AlertType: 'ErrorRate'
        Severity: 'Critical'
        Environment: environment
      }
    }
  }
}

// Critical: Function App Down Alert
resource functionAppDownAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${alertNamePrefix}-Function-App-Down-Critical'
  location: 'global'
  tags: union(tags, {
    Severity: 'Critical'
    Priority: 'P0'
  })
  properties: {
    displayName: 'ANF-AIOps Function App Down Critical'
    description: 'Alerts when Function App is not responding'
    severity: 0 // Critical
    enabled: true
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Http5xx'
          metricName: 'Http5xx'
          operator: 'GreaterThan'
          threshold: 5
          timeAggregation: 'Total'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    scopes: [
      functionAppId
    ]
    actions: [
      {
        actionGroupId: actionGroupId
        webHookProperties: {
          AlertType: 'FunctionAppDown'
          Severity: 'Critical'
          Environment: environment
        }
      }
    ]
  }
}

// =============================================================================
// HIGH PRIORITY ALERTS - P1 SEVERITY
// =============================================================================

// High: Slow Response Time Alert
resource slowResponseTimeAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: '${alertNamePrefix}-Slow-Response-Time-High'
  location: resourceGroup().location
  tags: union(tags, {
    Severity: 'High'
    Priority: 'P1'
  })
  properties: {
    displayName: 'ANF-AIOps Slow Response Time High'
    description: 'Alerts when average response time exceeds threshold'
    severity: 1 // High
    enabled: true
    evaluationFrequency: 'PT5M'
    windowSize: 'PT10M'
    criteria: {
      allOf: [
        {
          query: '''
            requests
            | where timestamp > ago(10m)
            | summarize AvgDuration = avg(duration)
            | where AvgDuration > ${currentThresholds.responseTime}
          '''
          timeAggregation: 'Average'
          dimensions: []
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 2
            minFailingPeriodsToAlert: 2
          }
        }
      ]
    }
    targetResourceTypes: [
      'Microsoft.Insights/components'
    ]
    scopes: [
      applicationInsightsId
    ]
    actions: {
      actionGroups: [
        actionGroupId
      ]
      customProperties: {
        AlertType: 'SlowResponseTime'
        Severity: 'High'
        Environment: environment
      }
    }
  }
}

// High: ANF API Rate Limiting Alert
resource anfApiRateLimitAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: '${alertNamePrefix}-ANF-API-Rate-Limit-High'
  location: resourceGroup().location
  tags: union(tags, {
    Severity: 'High'
    Priority: 'P1'
  })
  properties: {
    displayName: 'ANF-AIOps ANF API Rate Limiting High'
    description: 'Alerts when ANF API calls are being rate limited'
    severity: 1 // High
    enabled: true
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: '''
            traces
            | where timestamp > ago(15m)
            | where message contains "429" or message contains "TooManyRequests"
            | summarize RateLimitCount = count()
            | where RateLimitCount > 10
          '''
          timeAggregation: 'Average'
          dimensions: []
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    targetResourceTypes: [
      'Microsoft.Insights/components'
    ]
    scopes: [
      applicationInsightsId
    ]
    actions: {
      actionGroups: [
        actionGroupId
      ]
      customProperties: {
        AlertType: 'ANFApiRateLimit'
        Severity: 'High'
        Environment: environment
      }
    }
  }
}

// High: Container Resource Usage Alert
resource containerResourceAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${alertNamePrefix}-Container-Resource-High'
  location: 'global'
  tags: union(tags, {
    Severity: 'High'
    Priority: 'P1'
  })
  properties: {
    displayName: 'ANF-AIOps Container Resource Usage High'
    description: 'Alerts when container resource usage is high'
    severity: 1 // High
    enabled: true
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'CpuUsage'
          metricName: 'CpuUsage'
          operator: 'GreaterThan'
          threshold: currentThresholds.cpuUsage
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    scopes: [
      containerInstanceId
    ]
    actions: [
      {
        actionGroupId: actionGroupId
        webHookProperties: {
          AlertType: 'ContainerResourceUsage'
          Severity: 'High'
          Environment: environment
        }
      }
    ]
  }
}

// =============================================================================
// MEDIUM PRIORITY ALERTS - P2 SEVERITY
// =============================================================================

// Medium: Authentication Failures Alert
resource authFailuresAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: '${alertNamePrefix}-Auth-Failures-Medium'
  location: resourceGroup().location
  tags: union(tags, {
    Severity: 'Medium'
    Priority: 'P2'
  })
  properties: {
    displayName: 'ANF-AIOps Authentication Failures Medium'
    description: 'Alerts when authentication failures exceed threshold'
    severity: 2 // Medium
    enabled: true
    evaluationFrequency: 'PT10M'
    windowSize: 'PT30M'
    criteria: {
      allOf: [
        {
          query: '''
            customEvents
            | where timestamp > ago(30m)
            | where name == "AuthenticationFailed"
            | summarize FailureCount = count() by bin(timestamp, 10m)
            | where FailureCount > 10
          '''
          timeAggregation: 'Average'
          dimensions: []
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 2
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    targetResourceTypes: [
      'Microsoft.Insights/components'
    ]
    scopes: [
      applicationInsightsId
    ]
    actions: {
      actionGroups: [
        actionGroupId
      ]
      customProperties: {
        AlertType: 'AuthenticationFailures'
        Severity: 'Medium'
        Environment: environment
      }
    }
  }
}

// Medium: Teams Bot Conversation Failures Alert
resource teamsBotFailuresAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: '${alertNamePrefix}-Teams-Bot-Failures-Medium'
  location: resourceGroup().location
  tags: union(tags, {
    Severity: 'Medium'
    Priority: 'P2'
  })
  properties: {
    displayName: 'ANF-AIOps Teams Bot Failures Medium'
    description: 'Alerts when Teams bot conversation failures exceed threshold'
    severity: 2 // Medium
    enabled: true
    evaluationFrequency: 'PT15M'
    windowSize: 'PT1H'
    criteria: {
      allOf: [
        {
          query: '''
            customEvents
            | where timestamp > ago(1h)
            | where name == "TeamsBot_Conversation"
            | extend Success = tobool(customDimensions.Success)
            | summarize 
                TotalConversations = count(),
                FailedConversations = countif(Success == false)
            | extend FailureRate = (FailedConversations * 100.0) / TotalConversations
            | where FailureRate > 10.0
          '''
          timeAggregation: 'Average'
          dimensions: []
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    targetResourceTypes: [
      'Microsoft.Insights/components'
    ]
    scopes: [
      applicationInsightsId
    ]
    actions: {
      actionGroups: [
        actionGroupId
      ]
      customProperties: {
        AlertType: 'TeamsBotFailures'
        Severity: 'Medium'
        Environment: environment
      }
    }
  }
}

// =============================================================================
// INFORMATION ALERTS - P3 SEVERITY
// =============================================================================

// Info: High Volume Operations Alert
resource highVolumeOpsAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: '${alertNamePrefix}-High-Volume-Ops-Info'
  location: resourceGroup().location
  tags: union(tags, {
    Severity: 'Information'
    Priority: 'P3'
  })
  properties: {
    displayName: 'ANF-AIOps High Volume Operations Info'
    description: 'Informational alert for high volume of operations'
    severity: 3 // Information
    enabled: true
    evaluationFrequency: 'PT1H'
    windowSize: 'PT1H'
    criteria: {
      allOf: [
        {
          query: '''
            requests
            | where timestamp > ago(1h)
            | summarize RequestCount = count()
            | where RequestCount > 1000
          '''
          timeAggregation: 'Average'
          dimensions: []
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    targetResourceTypes: [
      'Microsoft.Insights/components'
    ]
    scopes: [
      applicationInsightsId
    ]
    actions: {
      actionGroups: [
        actionGroupId
      ]
      customProperties: {
        AlertType: 'HighVolumeOperations'
        Severity: 'Information'
        Environment: environment
      }
    }
  }
}

// =============================================================================
// OUTPUTS
// =============================================================================

output alertRuleIds object = {
  serviceAvailability: serviceAvailabilityAlert.id
  highErrorRate: highErrorRateAlert.id
  functionAppDown: functionAppDownAlert.id
  slowResponseTime: slowResponseTimeAlert.id
  anfApiRateLimit: anfApiRateLimitAlert.id
  containerResource: containerResourceAlert.id
  authFailures: authFailuresAlert.id
  teamsBotFailures: teamsBotFailuresAlert.id
  highVolumeOps: highVolumeOpsAlert.id
}

output alertRuleNames array = [
  serviceAvailabilityAlert.name
  highErrorRateAlert.name
  functionAppDownAlert.name
  slowResponseTimeAlert.name
  anfApiRateLimitAlert.name
  containerResourceAlert.name
  authFailuresAlert.name
  teamsBotFailuresAlert.name
  highVolumeOpsAlert.name
]