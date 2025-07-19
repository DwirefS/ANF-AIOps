# ANF-AIOps Administrator Guide

**Author:** Dwiref Sharma <DwirefS@SapientEdge.io>  
**Version:** 2.0.0  
**Last Updated:** 2025-07-18

## Table of Contents

1. [Overview](#overview)
2. [System Administration](#system-administration)
3. [User Management](#user-management)
4. [Security Management](#security-management)
5. [Performance Monitoring](#performance-monitoring)
6. [Backup and Recovery](#backup-and-recovery)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance Procedures](#maintenance-procedures)
9. [Compliance and Auditing](#compliance-and-auditing)
10. [Disaster Recovery](#disaster-recovery)

## Overview

This guide provides comprehensive information for administrators managing the ANF-AIOps platform. It covers day-to-day operations, maintenance procedures, troubleshooting, and best practices for ensuring optimal system performance and security.

### Administrator Responsibilities

- **System Health Monitoring**: Ensure all components are operational
- **User Access Management**: Control user permissions and access
- **Security Compliance**: Maintain security policies and standards
- **Performance Optimization**: Monitor and optimize system performance
- **Backup Management**: Ensure data protection and recovery capabilities
- **Incident Response**: Handle system incidents and outages
- **Documentation Maintenance**: Keep system documentation current

### Key System Components

1. **Azure Functions**: Serverless compute for ANF operations
2. **MCP Server**: Model Context Protocol server for AI integration
3. **Teams Bot**: Microsoft Teams interface for user interactions
4. **RAG System**: Knowledge retrieval and document search
5. **Azure NetApp Files**: Core storage service being managed
6. **Monitoring Stack**: Application Insights, Log Analytics, alerts

## System Administration

### Dashboard Overview

#### Main Administrative Dashboard

Access the administrative dashboard at:
```
https://anf-aiops-admin.azurewebsites.net/dashboard
```

**Key Metrics Displayed:**
- System health status
- Active user sessions
- API call volume and response times
- ANF resource utilization
- Security alerts and incidents
- Recent system changes

#### Component Health Monitoring

```bash
# Check all component health
curl -s "https://anf-aiops-functions.azurewebsites.net/api/admin/health" \
  -H "Authorization: Bearer {admin-token}" | jq

# Expected healthy response:
{
  "status": "healthy",
  "components": {
    "functions": "healthy",
    "mcp_server": "healthy",
    "teams_bot": "healthy",
    "rag_system": "healthy",
    "azure_netapp": "accessible",
    "key_vault": "accessible"
  },
  "metrics": {
    "uptime": "99.98%",
    "response_time": "245ms",
    "active_users": 42,
    "api_calls_per_minute": 156
  }
}
```

### Service Management

#### Starting/Stopping Services

```bash
# Function App management
az functionapp start --resource-group "anf-aiops-prod" --name "anf-aiops-functions"
az functionapp stop --resource-group "anf-aiops-prod" --name "anf-aiops-functions"
az functionapp restart --resource-group "anf-aiops-prod" --name "anf-aiops-functions"

# MCP Server container management
az container start --resource-group "anf-aiops-prod" --name "anf-aiops-mcp"
az container stop --resource-group "anf-aiops-prod" --name "anf-aiops-mcp"
az container restart --resource-group "anf-aiops-prod" --name "anf-aiops-mcp"

# Teams Bot management
az webapp start --resource-group "anf-aiops-prod" --name "anf-aiops-bot"
az webapp stop --resource-group "anf-aiops-prod" --name "anf-aiops-bot"
az webapp restart --resource-group "anf-aiops-prod" --name "anf-aiops-bot"
```

#### Service Configuration Updates

```bash
# Update Function App settings
az functionapp config appsettings set \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-functions" \
  --settings "LOG_LEVEL=debug" "CACHE_TTL=300"

# Update container environment variables
az container restart --resource-group "anf-aiops-prod" --name "anf-aiops-mcp"

# Update bot configuration
az webapp config appsettings set \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-bot" \
  --settings "BOT_LOG_LEVEL=info"
```

### Log Management

#### Centralized Logging

All system logs are aggregated in Log Analytics workspace:

```kusto
// View all system logs from last 24 hours
union 
  FunctionAppLogs,
  ContainerInstanceLog_CL,
  AppServiceHTTPLogs,
  AppServiceConsoleLogs
| where TimeGenerated > ago(24h)
| order by TimeGenerated desc
| take 1000
```

#### Log Queries for Monitoring

```kusto
// Function execution errors
FunctionAppLogs
| where Level == "Error"
| where TimeGenerated > ago(1h)
| summarize count() by FunctionName, bin(TimeGenerated, 5m)

// MCP Server API errors
ContainerInstanceLog_CL
| where LogEntry_s contains "ERROR"
| where TimeGenerated > ago(1h)
| project TimeGenerated, LogEntry_s

// Teams Bot conversation failures
AppServiceConsoleLogs
| where ResultDescription contains "Bot framework error"
| where TimeGenerated > ago(1h)
| project TimeGenerated, ResultDescription

// ANF API rate limiting
FunctionAppLogs
| where Message contains "429" or Message contains "TooManyRequests"
| where TimeGenerated > ago(1h)
| summarize count() by bin(TimeGenerated, 5m)
```

## User Management

### User Access Control

#### Azure AD Integration

ANF-AIOps integrates with Azure Active Directory for authentication:

```bash
# List current application users
az ad app show --id "{app-id}" --query "requiredResourceAccess"

# Add user to application
az ad app update --id "{app-id}" --add requiredResourceAccess '{
  "resourceAppId": "00000003-0000-0000-c000-000000000000",
  "resourceAccess": [
    {
      "id": "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
      "type": "Scope"
    }
  ]
}'
```

#### Role-Based Access Control

Define and manage user roles:

```json
{
  "roles": {
    "anf_admin": {
      "description": "Full ANF management access",
      "permissions": [
        "anf:accounts:*",
        "anf:pools:*", 
        "anf:volumes:*",
        "anf:snapshots:*",
        "system:admin"
      ]
    },
    "anf_operator": {
      "description": "Standard ANF operations",
      "permissions": [
        "anf:volumes:create",
        "anf:volumes:read", 
        "anf:volumes:update",
        "anf:snapshots:create",
        "anf:snapshots:read"
      ]
    },
    "anf_viewer": {
      "description": "Read-only access",
      "permissions": [
        "anf:*:read",
        "system:health:read"
      ]
    }
  }
}
```

#### User Provisioning

```bash
# Add new user via Teams bot admin command
# In Teams channel with admin privileges:
@ANF-AIOps admin add-user
Email: newuser@company.com
Role: anf_operator
Teams: team1,team2
Expiry: 2025-12-31

# Remove user access
@ANF-AIOps admin remove-user newuser@company.com

# List active users
@ANF-AIOps admin list-users
```

### Session Management

#### Active Session Monitoring

```kusto
// Monitor active user sessions
CustomEvents
| where Name == "UserLogin" 
| where TimeGenerated > ago(24h)
| summarize Sessions = dcount(SessionId) by UserId = tostring(customDimensions.UserId), bin(TimeGenerated, 1h)
| order by TimeGenerated desc

// Detect suspicious login patterns
CustomEvents
| where Name == "UserLogin"
| where TimeGenerated > ago(7d)
| extend Location = tostring(customDimensions.Location)
| summarize Locations = make_set(Location) by UserId = tostring(customDimensions.UserId)
| where array_length(Locations) > 3
```

#### Session Configuration

```bash
# Update session timeout settings
az functionapp config appsettings set \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-functions" \
  --settings \
    "SESSION_TIMEOUT=3600" \
    "MAX_CONCURRENT_SESSIONS=5" \
    "IDLE_TIMEOUT=1800"
```

## Security Management

### Security Monitoring

#### Security Dashboard

Access security metrics through:

```bash
# Generate security report
curl -X POST "https://anf-aiops-functions.azurewebsites.net/api/admin/security-report" \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "period": "24h",
    "include_details": true
  }'
```

#### Real-time Security Alerts

```kusto
// Failed authentication attempts
CustomEvents
| where Name == "AuthenticationFailed"
| where TimeGenerated > ago(1h)
| summarize FailedAttempts = count() by UserId = tostring(customDimensions.UserId), bin(TimeGenerated, 5m)
| where FailedAttempts > 5

// Suspicious API calls
ApiManagementGatewayLogs
| where ResponseCode == 401 or ResponseCode == 403
| where TimeGenerated > ago(1h)
| summarize UnauthorizedCalls = count() by ClientIP, bin(TimeGenerated, 5m)
| where UnauthorizedCalls > 10
```

### Access Key Management

#### Rotating API Keys

```bash
# Generate new API key for MCP server
NEW_API_KEY=$(openssl rand -hex 32)

# Update Key Vault with new key
az keyvault secret set \
  --vault-name "anf-aiops-kv" \
  --name "mcp-api-key" \
  --value "$NEW_API_KEY"

# Update application settings to use new key
az functionapp config appsettings set \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-functions" \
  --settings "MCP_API_KEY=@Microsoft.KeyVault(SecretUri=https://anf-aiops-kv.vault.azure.net/secrets/mcp-api-key/)"

# Restart services to pick up new key
az functionapp restart --resource-group "anf-aiops-prod" --name "anf-aiops-functions"
az container restart --resource-group "anf-aiops-prod" --name "anf-aiops-mcp"
```

#### Certificate Management

```bash
# Check certificate expiration
az keyvault certificate show \
  --vault-name "anf-aiops-kv" \
  --name "anf-aiops-ssl" \
  --query "attributes.expires"

# Renew certificate (if using Let's Encrypt or similar)
# This would typically be automated through Azure App Service
az webapp config ssl bind \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-functions" \
  --certificate-thumbprint "{new-thumbprint}" \
  --ssl-type SNI
```

### Compliance Monitoring

#### Security Baseline Validation

```bash
# Run security baseline check
curl -X POST "https://anf-aiops-functions.azurewebsites.net/api/admin/security-baseline" \
  -H "Authorization: Bearer {admin-token}"

# Expected response includes:
# - Authentication configuration status
# - Encryption settings validation
# - Network security verification
# - Access control audit
# - Compliance framework adherence
```

## Performance Monitoring

### System Performance Metrics

#### Key Performance Indicators

```kusto
// API response time trends
FunctionAppLogs
| where Message contains "Duration"
| extend Duration = extract("Duration: ([0-9]+)ms", 1, Message)
| where isnotempty(Duration)
| summarize avg(todouble(Duration)), percentile(todouble(Duration), 95) by bin(TimeGenerated, 5m)

// Throughput analysis
ApiManagementGatewayLogs
| where TimeGenerated > ago(24h)
| summarize RequestCount = count() by bin(TimeGenerated, 1h)
| order by TimeGenerated desc

// Error rate monitoring
union FunctionAppLogs, AppServiceHTTPLogs
| where Level == "Error" or sc_status >= 400
| where TimeGenerated > ago(24h)
| summarize ErrorCount = count(), TotalRequests = countif(Level != "Error")
| extend ErrorRate = (ErrorCount * 100.0) / (ErrorCount + TotalRequests)
```

#### Performance Optimization

```bash
# Scale Function App based on metrics
az functionapp plan update \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-plan" \
  --sku "P2V2" \
  --number-of-workers 3

# Update container resources
az container update \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-mcp" \
  --cpu 2.0 \
  --memory 4.0
```

### Capacity Planning

#### Resource Utilization Analysis

```kusto
// Function App CPU and memory usage
PerformanceCounters
| where CounterName in ("% Processor Time", "Available MBytes")
| where TimeGenerated > ago(7d)
| summarize avg(CounterValue) by CounterName, bin(TimeGenerated, 1h)

// Container resource utilization
ContainerInstanceLog_CL
| where LogEntry_s contains "CPU" or LogEntry_s contains "Memory"
| where TimeGenerated > ago(7d)
| extend ResourceType = iff(LogEntry_s contains "CPU", "CPU", "Memory")
| extend Usage = extract("([0-9.]+)%", 1, LogEntry_s)
| summarize avg(todouble(Usage)) by ResourceType, bin(TimeGenerated, 1h)
```

#### Growth Projections

```kusto
// User growth trend
CustomEvents
| where Name == "UserActivity"
| where TimeGenerated > ago(30d)
| summarize UniqueUsers = dcount(UserId) by bin(TimeGenerated, 1d)
| extend Trend = series_decompose(UniqueUsers)

// API call volume growth
ApiManagementGatewayLogs
| where TimeGenerated > ago(30d)
| summarize CallVolume = count() by bin(TimeGenerated, 1d)
| extend Trend = series_decompose(CallVolume)
```

## Backup and Recovery

### Backup Procedures

#### Automated Backup Configuration

```bash
# Configure Function App backup
az webapp config backup create \
  --resource-group "anf-aiops-prod" \
  --webapp-name "anf-aiops-functions" \
  --container-url "{storage-container-url-with-sas}" \
  --frequency 24 \
  --retention-period-in-days 30

# Enable container instance backup (custom script)
az storage blob snapshot \
  --account-name "anf-aiops-storage" \
  --container-name "mcp-config" \
  --name "server-config.json"
```

#### Database Backup

```bash
# Backup Key Vault secrets (export for disaster recovery)
az keyvault secret list \
  --vault-name "anf-aiops-kv" \
  --query "[].{name:name, version:id}" \
  --output json > keyvault-backup-$(date +%Y%m%d).json

# Backup Application Insights data (export configuration)
az monitor app-insights component export-configuration \
  --app "anf-aiops-ai" \
  --resource-group "anf-aiops-prod" \
  > appinsights-config-backup-$(date +%Y%m%d).json
```

### Recovery Procedures

#### Service Recovery

```bash
#!/bin/bash
# Service recovery script

echo "Starting ANF-AIOps service recovery..."

# Check if services are responsive
check_service() {
  local url=$1
  local service_name=$2
  
  if curl -f -s "$url" > /dev/null; then
    echo "✓ $service_name is responsive"
    return 0
  else
    echo "✗ $service_name is not responsive"
    return 1
  fi
}

# Recovery steps
recover_functions() {
  echo "Recovering Function App..."
  az functionapp restart --resource-group "anf-aiops-prod" --name "anf-aiops-functions"
  sleep 30
  check_service "https://anf-aiops-functions.azurewebsites.net/api/health" "Function App"
}

recover_mcp() {
  echo "Recovering MCP Server..."
  az container restart --resource-group "anf-aiops-prod" --name "anf-aiops-mcp"
  sleep 60
  check_service "https://anf-aiops-mcp.eastus.azurecontainer.io:3000/health" "MCP Server"
}

recover_bot() {
  echo "Recovering Teams Bot..."
  az webapp restart --resource-group "anf-aiops-prod" --name "anf-aiops-bot"
  sleep 30
  check_service "https://anf-aiops-bot.azurewebsites.net/api/health" "Teams Bot"
}

# Execute recovery
recover_functions
recover_mcp  
recover_bot

echo "Service recovery completed"
```

#### Data Recovery

```bash
# Restore from backup
az webapp config backup restore \
  --resource-group "anf-aiops-prod" \
  --webapp-name "anf-aiops-functions" \
  --backup-name "backup-{timestamp}" \
  --restore-type "clone" \
  --target-name "anf-aiops-functions-restored"

# Restore Key Vault secrets
while read -r secret; do
  name=$(echo "$secret" | jq -r '.name')
  value=$(echo "$secret" | jq -r '.value')
  az keyvault secret set --vault-name "anf-aiops-kv" --name "$name" --value "$value"
done < keyvault-backup.json
```

## Troubleshooting

### Common Issues and Solutions

#### 1. High Response Times

**Symptoms**: API calls taking longer than 5 seconds

**Diagnostic Steps**:
```bash
# Check Application Insights performance
az monitor app-insights query \
  --app "anf-aiops-ai" \
  --analytics-query "requests | where duration > 5000 | top 10 by timestamp desc"

# Check ANF service health
curl -X GET "https://management.azure.com/subscriptions/{sub-id}/providers/Microsoft.NetApp/locations/eastus/checkNameAvailability?api-version=2025-03-01" \
  -H "Authorization: Bearer {token}"
```

**Solutions**:
```bash
# Scale up Function App
az functionapp plan update \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-plan" \
  --sku "P2V2"

# Increase container resources
az container update \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-mcp" \
  --cpu 2.0 \
  --memory 4.0

# Enable caching
az functionapp config appsettings set \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-functions" \
  --settings "ENABLE_CACHING=true" "CACHE_TTL=300"
```

#### 2. Authentication Failures

**Symptoms**: Users unable to authenticate or receive 401 errors

**Diagnostic Steps**:
```bash
# Check Azure AD application configuration
az ad app show --id "{app-id}" --query "requiredResourceAccess"

# Verify managed identity permissions
az role assignment list --assignee "{managed-identity-principal-id}"

# Check Key Vault access policies
az keyvault show --name "anf-aiops-kv" --query "properties.accessPolicies"
```

**Solutions**:
```bash
# Reset application credentials
az ad app credential reset --id "{app-id}"

# Update role assignments
az role assignment create \
  --assignee "{managed-identity-principal-id}" \
  --role "NetApp Contributor" \
  --scope "/subscriptions/{subscription-id}"

# Refresh Key Vault access
az keyvault set-policy \
  --name "anf-aiops-kv" \
  --object-id "{managed-identity-principal-id}" \
  --secret-permissions get list
```

#### 3. Teams Bot Not Responding

**Symptoms**: Bot messages not processed or responded to

**Diagnostic Steps**:
```bash
# Check bot service status
az bot show --resource-group "anf-aiops-prod" --name "anf-aiops-bot"

# Review bot logs
az webapp log tail --resource-group "anf-aiops-prod" --name "anf-aiops-bot"

# Test bot endpoint
curl -X POST "https://anf-aiops-bot.azurewebsites.net/api/messages" \
  -H "Content-Type: application/json" \
  -d '{"type":"ping"}'
```

**Solutions**:
```bash
# Restart bot service
az webapp restart --resource-group "anf-aiops-prod" --name "anf-aiops-bot"

# Update bot configuration
az webapp config appsettings set \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-bot" \
  --settings "MCP_SERVER_URL=https://anf-aiops-mcp.eastus.azurecontainer.io:3000"

# Verify Teams channel configuration
# Manual check in Teams admin center required
```

### Advanced Diagnostics

#### Network Connectivity Testing

```bash
# Test Function to MCP connectivity
az network watcher test-connectivity \
  --source-resource "/subscriptions/{sub-id}/resourceGroups/anf-aiops-prod/providers/Microsoft.Web/sites/anf-aiops-functions" \
  --dest-address "anf-aiops-mcp.eastus.azurecontainer.io" \
  --dest-port 3000

# Test ANF API connectivity
az network watcher test-connectivity \
  --source-resource "/subscriptions/{sub-id}/resourceGroups/anf-aiops-prod/providers/Microsoft.Web/sites/anf-aiops-functions" \
  --dest-address "management.azure.com" \
  --dest-port 443
```

#### Performance Profiling

```bash
# Enable detailed Function App diagnostics
az functionapp config appsettings set \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-functions" \
  --settings \
    "WEBSITE_HTTPLOGGING_RETENTION_DAYS=7" \
    "WEBSITE_DETAILED_ERROR_LOGGING_ENABLED=true"

# Capture network traces (requires App Service diagnostics)
az webapp log config \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-functions" \
  --web-server-logging filesystem \
  --detailed-error-messages true \
  --failed-request-tracing true
```

## Maintenance Procedures

### Scheduled Maintenance

#### Weekly Maintenance Checklist

```bash
#!/bin/bash
# Weekly maintenance script

echo "=== ANF-AIOps Weekly Maintenance ==="
echo "Date: $(date)"

# 1. Health check
echo "1. Performing health checks..."
curl -f "https://anf-aiops-functions.azurewebsites.net/api/health" || echo "WARNING: Function health check failed"
curl -f "https://anf-aiops-mcp.eastus.azurecontainer.io:3000/health" || echo "WARNING: MCP health check failed"

# 2. Log cleanup
echo "2. Cleaning up old logs..."
az monitor log-analytics workspace purge \
  --workspace "anf-aiops-logs" \
  --table "FunctionAppLogs" \
  --filters '[{"column": "TimeGenerated", "operator": "<", "value": "2025-07-01T00:00:00Z"}]'

# 3. Security updates
echo "3. Checking for security updates..."
az functionapp config appsettings list \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-functions" \
  --query "[?name=='WEBSITE_NODE_DEFAULT_VERSION']"

# 4. Performance review
echo "4. Reviewing performance metrics..."
az monitor metrics list \
  --resource "/subscriptions/{sub-id}/resourceGroups/anf-aiops-prod/providers/Microsoft.Web/sites/anf-aiops-functions" \
  --metric "FunctionExecutionCount,FunctionExecutionUnits" \
  --start-time "$(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# 5. Backup verification
echo "5. Verifying backup status..."
az webapp config backup list \
  --resource-group "anf-aiops-prod" \
  --webapp-name "anf-aiops-functions"

echo "=== Weekly Maintenance Complete ==="
```

#### Monthly Maintenance Tasks

1. **Security Review**
   - Update all certificates near expiration
   - Review and rotate API keys
   - Audit user access and permissions
   - Update security baseline configurations

2. **Performance Optimization**
   - Analyze usage patterns and optimize scaling
   - Review and adjust cache settings
   - Update resource allocation based on metrics
   - Clean up unused resources

3. **Documentation Updates**
   - Update system documentation
   - Review and update runbooks
   - Update contact information
   - Review and update disaster recovery procedures

### Emergency Procedures

#### Critical System Outage

```bash
#!/bin/bash
# Emergency outage response script

echo "EMERGENCY: ANF-AIOps System Outage Response"
echo "Timestamp: $(date)"

# Immediate actions
echo "1. Notifying stakeholders..."
# Send notifications to admin team
curl -X POST "{teams-webhook-url}" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "🚨 CRITICAL: ANF-AIOps system outage detected",
    "attachments": [{
      "color": "danger",
      "text": "Emergency response procedures initiated. Investigating cause and implementing recovery."
    }]
  }'

# Health assessment
echo "2. Assessing system health..."
HEALTH_STATUS=""
for service in "functions" "mcp" "bot"; do
  case $service in
    "functions")
      if ! curl -f -s "https://anf-aiops-functions.azurewebsites.net/api/health" > /dev/null; then
        HEALTH_STATUS="$HEALTH_STATUS $service:DOWN"
      else
        HEALTH_STATUS="$HEALTH_STATUS $service:UP"
      fi
      ;;
    "mcp")
      if ! curl -f -s "https://anf-aiops-mcp.eastus.azurecontainer.io:3000/health" > /dev/null; then
        HEALTH_STATUS="$HEALTH_STATUS $service:DOWN"
      else
        HEALTH_STATUS="$HEALTH_STATUS $service:UP"
      fi
      ;;
    "bot")
      if ! curl -f -s "https://anf-aiops-bot.azurewebsites.net/api/health" > /dev/null; then
        HEALTH_STATUS="$HEALTH_STATUS $service:DOWN"
      else
        HEALTH_STATUS="$HEALTH_STATUS $service:UP"
      fi
      ;;
  esac
done

echo "System status: $HEALTH_STATUS"

# Initiate recovery
echo "3. Initiating emergency recovery..."
az functionapp restart --resource-group "anf-aiops-prod" --name "anf-aiops-functions"
az container restart --resource-group "anf-aiops-prod" --name "anf-aiops-mcp"
az webapp restart --resource-group "anf-aiops-prod" --name "anf-aiops-bot"

# Wait and verify
echo "4. Waiting for services to recover..."
sleep 120

# Final verification
echo "5. Verifying recovery..."
# Re-run health checks and report status
```

## Compliance and Auditing

### Audit Logging

#### Comprehensive Audit Configuration

```bash
# Enable comprehensive audit logging
az monitor diagnostic-settings create \
  --resource "/subscriptions/{sub-id}/resourceGroups/anf-aiops-prod/providers/Microsoft.Web/sites/anf-aiops-functions" \
  --name "anf-aiops-audit" \
  --logs '[
    {
      "category": "FunctionAppLogs",
      "enabled": true,
      "retentionPolicy": {
        "enabled": true,
        "days": 2555
      }
    },
    {
      "category": "FunctionExecutionLogs", 
      "enabled": true,
      "retentionPolicy": {
        "enabled": true,
        "days": 2555
      }
    }
  ]' \
  --workspace "/subscriptions/{sub-id}/resourceGroups/anf-aiops-prod/providers/Microsoft.OperationalInsights/workspaces/anf-aiops-logs"
```

#### Audit Query Examples

```kusto
// User access audit
CustomEvents
| where Name in ("UserLogin", "UserLogout", "UserActionTaken")
| extend UserId = tostring(customDimensions.UserId)
| extend Action = tostring(customDimensions.Action)
| extend Resource = tostring(customDimensions.Resource)
| project TimeGenerated, UserId, Action, Resource, ClientIP = client_IP
| order by TimeGenerated desc

// Administrative actions audit
CustomEvents  
| where Name == "AdminAction"
| extend AdminUser = tostring(customDimensions.AdminUser)
| extend Action = tostring(customDimensions.Action)
| extend Target = tostring(customDimensions.Target)
| project TimeGenerated, AdminUser, Action, Target, ClientIP = client_IP
| order by TimeGenerated desc

// Data access patterns
FunctionAppLogs
| where Message contains "ANF API call"
| extend Operation = extract("Operation: ([A-Za-z]+)", 1, Message)
| extend Resource = extract("Resource: ([^,]+)", 1, Message)
| summarize count() by Operation, Resource, bin(TimeGenerated, 1h)
| order by TimeGenerated desc
```

### Compliance Reporting

#### Generate Compliance Reports

```bash
# Generate monthly compliance report
curl -X POST "https://anf-aiops-functions.azurewebsites.net/api/admin/compliance-report" \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "monthly",
    "period": "2025-07",
    "frameworks": ["SOC2", "ISO27001", "GDPR"],
    "includeEvidence": true
  }' \
  -o "compliance-report-2025-07.json"

# Generate security assessment
curl -X POST "https://anf-aiops-functions.azurewebsites.net/api/admin/security-assessment" \
  -H "Authorization: Bearer {admin-token}" \
  -o "security-assessment-$(date +%Y%m%d).json"
```

## Disaster Recovery

### Disaster Recovery Plan

#### RTO/RPO Targets

- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 1 hour
- **Maximum Tolerable Downtime**: 8 hours

#### DR Procedures

```bash
#!/bin/bash
# Disaster Recovery activation script

echo "=== ANF-AIOps Disaster Recovery Activation ==="

# 1. Assess current situation
echo "1. Assessing disaster scope..."
PRIMARY_REGION="eastus"
DR_REGION="westus2"

# Check primary region availability
PRIMARY_STATUS=$(az resource list --location "$PRIMARY_REGION" --query "length(@)" 2>/dev/null || echo "0")
echo "Primary region resources: $PRIMARY_STATUS"

# 2. Activate DR region
if [ "$PRIMARY_STATUS" == "0" ]; then
  echo "2. Primary region unavailable. Activating DR region..."
  
  # Deploy to DR region
  az deployment group create \
    --resource-group "anf-aiops-dr" \
    --template-file "src/infrastructure/dr-deployment.bicep" \
    --parameters "environmentName=dr" "location=$DR_REGION"
    
  # Update DNS to point to DR region
  az network dns record-set a update \
    --resource-group "dns-rg" \
    --zone-name "anf-aiops.com" \
    --name "api" \
    --set "aRecords[0].ipv4Address={dr-ip-address}"
    
  echo "DR region activated"
else
  echo "2. Primary region available. DR activation not required."
fi

# 3. Verify DR functionality
echo "3. Verifying DR functionality..."
curl -f "https://anf-aiops-dr.westus2.cloudapp.azure.com/api/health" && echo "DR health check passed"

# 4. Notify stakeholders
curl -X POST "{emergency-teams-webhook}" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "📋 ANF-AIOps DR activation completed",
    "attachments": [{
      "color": "warning",
      "text": "System is now running in disaster recovery mode. Monitor performance and prepare for failback when primary region is restored."
    }]
  }'

echo "=== Disaster Recovery Activation Complete ==="
```

#### Failback Procedures

```bash
#!/bin/bash
# Failback to primary region

echo "=== ANF-AIOps Failback to Primary Region ==="

# 1. Verify primary region health
echo "1. Verifying primary region readiness..."
PRIMARY_HEALTH=$(curl -s "https://anf-aiops-functions.azurewebsites.net/api/health" | jq -r '.status')

if [ "$PRIMARY_HEALTH" == "healthy" ]; then
  echo "Primary region is healthy. Proceeding with failback..."
  
  # 2. Sync data from DR to primary
  echo "2. Synchronizing data..."
  # Custom data sync procedures here
  
  # 3. Update DNS back to primary
  echo "3. Updating DNS to primary region..."
  az network dns record-set a update \
    --resource-group "dns-rg" \
    --zone-name "anf-aiops.com" \
    --name "api" \
    --set "aRecords[0].ipv4Address={primary-ip-address}"
    
  # 4. Graceful DR shutdown
  echo "4. Shutting down DR region..."
  az functionapp stop --resource-group "anf-aiops-dr" --name "anf-aiops-functions-dr"
  
  echo "Failback completed successfully"
else
  echo "Primary region not ready. Failback aborted."
  exit 1
fi
```

---

**Document Version**: 2.0.0  
**Last Review**: 2025-07-18  
**Next Review**: 2025-10-18  
**Emergency Contact**: DwirefS@SapientEdge.io  
**On-Call Support**: [Your organization's on-call procedures]