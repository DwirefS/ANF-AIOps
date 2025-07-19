# ANF-AIOps Deployment Guide

**Author:** Dwiref Sharma <DwirefS@SapientEdge.io>  
**Version:** 2.0.0  
**Last Updated:** 2025-07-18

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Component Deployment](#component-deployment)
5. [Configuration](#configuration)
6. [Testing and Validation](#testing-and-validation)
7. [Post-Deployment Tasks](#post-deployment-tasks)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Security Considerations](#security-considerations)

## Overview

ANF-AIOps is a comprehensive Azure NetApp Files management solution that requires multiple Azure services and components to be deployed and configured. This guide provides step-by-step instructions for deploying the complete solution.

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Microsoft      │    │   Azure API     │    │   Azure NetApp  │
│  Teams Bot      │────│   Management    │────│   Files         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────│   Azure         │──────────────┘
                        │   Functions     │
                        └─────────────────┘
                                 │
                    ┌─────────────────────────────┐
                    │     MCP Server              │
                    │  (Model Context Protocol)   │
                    └─────────────────────────────┘
                                 │
                    ┌─────────────────────────────┐
                    │      RAG System             │
                    │ (Azure Cognitive Search)    │
                    └─────────────────────────────┘
```

### Deployment Strategy

The deployment follows a phased approach:

1. **Infrastructure Phase**: Deploy core Azure infrastructure
2. **Platform Phase**: Deploy platform services and MCP server
3. **Application Phase**: Deploy Azure Functions and Teams bot
4. **Integration Phase**: Configure integrations and test connectivity
5. **Validation Phase**: End-to-end testing and validation

## Prerequisites

### Azure Requirements

- **Azure Subscription** with sufficient credits/budget
- **Owner or Contributor** role on the subscription
- **Global Administrator** access to Azure AD tenant (for app registrations)
- **Azure CLI** version 2.40.0 or later
- **PowerShell** 7.0 or later (optional but recommended)

### Development Tools

```bash
# Node.js and npm
node --version  # v18.0.0 or later
npm --version   # v8.0.0 or later

# .NET SDK
dotnet --version  # 8.0.0 or later

# Azure CLI
az --version

# Azure Functions Core Tools
func --version  # v4.0.0 or later

# Terraform (optional, for IaC)
terraform --version  # v1.5.0 or later
```

### Service Principal Setup

Create a service principal for deployment automation:

```bash
# Create service principal
az ad sp create-for-rbac \
  --name "anf-aiops-deployment" \
  --role "Contributor" \
  --scopes "/subscriptions/{subscription-id}"

# Note the output values:
# - appId (clientId)
# - password (clientSecret)
# - tenant
```

### Resource Quotas

Verify sufficient Azure quotas:

```bash
# Check compute quotas
az vm list-usage --location eastus

# Check storage quotas  
az storage account show-usage

# Check NetApp Files quotas
az netappfiles quota-limit list --location eastus
```

## Infrastructure Setup

### Option 1: Bicep Deployment (Recommended)

#### 1. Clone Repository

```bash
git clone https://github.com/your-org/ANF-AIOps.git
cd ANF-AIOps
```

#### 2. Configure Parameters

```bash
# Copy parameter template
cp src/infrastructure/main.parameters.example.json src/infrastructure/main.parameters.json

# Edit parameters file
nano src/infrastructure/main.parameters.json
```

**Example parameters:**
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environmentName": {
      "value": "prod"
    },
    "location": {
      "value": "eastus"
    },
    "applicationName": {
      "value": "anf-aiops"
    },
    "administratorEmail": {
      "value": "DwirefS@SapientEdge.io"
    },
    "enableVnetIntegration": {
      "value": true
    },
    "enablePrivateEndpoints": {
      "value": true
    },
    "skuName": {
      "value": "S1"
    }
  }
}
```

#### 3. Deploy Infrastructure

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "{subscription-id}"

# Create resource group
az group create \
  --name "anf-aiops-prod" \
  --location "eastus"

# Deploy Bicep template
az deployment group create \
  --resource-group "anf-aiops-prod" \
  --template-file "src/infrastructure/main.bicep" \
  --parameters "@src/infrastructure/main.parameters.json"
```

### Option 2: Terraform Deployment

#### 1. Initialize Terraform

```bash
cd infra
terraform init
```

#### 2. Configure Variables

```bash
# Copy variables template
cp examples.tfvars terraform.tfvars

# Edit variables
nano terraform.tfvars
```

**Example terraform.tfvars:**
```hcl
# Basic Configuration
environment = "prod"
location = "East US"
resource_group_name = "anf-aiops-prod"

# Application Configuration
app_name = "anf-aiops"
app_version = "2.0.0"

# Network Configuration
vnet_address_space = "10.0.0.0/16"
subnet_anf_address_prefix = "10.0.1.0/24"
subnet_functions_address_prefix = "10.0.2.0/24"

# ANF Configuration
netapp_account_name = "anf-aiops-account"
capacity_pool_name = "anf-aiops-pool"
capacity_pool_size = 4398046511104  # 4 TiB

# Security Configuration
enable_private_endpoints = true
enable_network_security_groups = true

# Tags
tags = {
  Environment = "Production"
  Application = "ANF-AIOps"
  Owner = "DwirefS@SapientEdge.io"
  CostCenter = "IT"
}
```

#### 3. Deploy with Terraform

```bash
# Plan deployment
terraform plan -var-file="terraform.tfvars"

# Apply deployment
terraform apply -var-file="terraform.tfvars"
```

## Component Deployment

### 1. Azure Functions Deployment

#### Build and Package

```bash
cd functions/ANFServer

# Restore dependencies
dotnet restore

# Build project
dotnet build --configuration Release

# Publish for deployment
dotnet publish --configuration Release --output publish
```

#### Deploy to Azure

```bash
# Create deployment package
cd publish
zip -r ../anf-functions.zip .

# Deploy using Azure CLI
az functionapp deployment source config-zip \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-functions" \
  --src "../anf-functions.zip"
```

#### Configure Function Settings

```bash
# Set application settings
az functionapp config appsettings set \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-functions" \
  --settings \
    "AZURE_CLIENT_ID={client-id}" \
    "AZURE_CLIENT_SECRET={client-secret}" \
    "AZURE_TENANT_ID={tenant-id}" \
    "APPLICATIONINSIGHTS_CONNECTION_STRING={ai-connection-string}"
```

### 2. MCP Server Deployment

#### Container Deployment

```bash
cd src/mcp-server

# Build container image
docker build -t anf-aiops-mcp:latest .

# Tag for Azure Container Registry
docker tag anf-aiops-mcp:latest {acr-name}.azurecr.io/anf-aiops-mcp:latest

# Push to ACR
az acr login --name {acr-name}
docker push {acr-name}.azurecr.io/anf-aiops-mcp:latest
```

#### Deploy to Container Instance

```bash
# Deploy container instance
az container create \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-mcp" \
  --image "{acr-name}.azurecr.io/anf-aiops-mcp:latest" \
  --registry-login-server "{acr-name}.azurecr.io" \
  --registry-username "{acr-username}" \
  --registry-password "{acr-password}" \
  --dns-name-label "anf-aiops-mcp" \
  --ports 3000 \
  --environment-variables \
    "NODE_ENV=production" \
    "PORT=3000" \
    "AZURE_CLIENT_ID={client-id}" \
    "AZURE_CLIENT_SECRET={client-secret}" \
    "AZURE_TENANT_ID={tenant-id}"
```

### 3. RAG System Deployment

#### Setup Azure Cognitive Search

```bash
# Create search service (if not already created by infrastructure)
az search service create \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-search" \
  --sku "standard" \
  --location "eastus"

# Get admin keys
az search admin-key show \
  --resource-group "anf-aiops-prod" \
  --service-name "anf-aiops-search"
```

#### Deploy RAG Components

```bash
cd rag

# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy to Azure Functions (as a separate function app)
func azure functionapp publish anf-aiops-rag-functions
```

#### Initialize Search Index

```bash
# Run index creation script
node dist/scripts/setup-search-index.js \
  --search-service "anf-aiops-search" \
  --search-key "{admin-key}" \
  --index-name "anf-documentation"
```

### 4. Teams Bot Deployment

#### Register Bot Application

```bash
# Create Azure AD app registration for the bot
az ad app create \
  --display-name "ANF-AIOps Bot" \
  --available-to-other-tenants false \
  --reply-urls "https://anf-aiops-bot.azurewebsites.net/api/messages"

# Note the appId from the response
```

#### Configure Bot Service

```bash
# Create bot service
az bot create \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-bot" \
  --kind "webapp" \
  --app-id "{bot-app-id}" \
  --app-password "{bot-app-password}" \
  --endpoint "https://anf-aiops-bot.azurewebsites.net/api/messages"
```

#### Deploy Bot Code

```bash
cd src/teams-bot

# Install dependencies
npm install

# Build project
npm run build

# Deploy to Azure Web App
az webapp deployment source config-zip \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-bot" \
  --src "dist.zip"
```

## Configuration

### 1. Environment Variables

Set up environment variables for all components:

#### Azure Functions

```bash
az functionapp config appsettings set \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-functions" \
  --settings \
    "AZURE_SUBSCRIPTION_ID={subscription-id}" \
    "ANF_ACCOUNT_NAME={netapp-account}" \
    "ANF_RESOURCE_GROUP={netapp-rg}" \
    "JWT_SECRET={jwt-secret}" \
    "CORS_ALLOWED_ORIGINS=https://teams.microsoft.com"
```

#### MCP Server

```bash
# Update container instance environment variables
az container restart \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-mcp"
```

#### Teams Bot

```bash
az webapp config appsettings set \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-bot" \
  --settings \
    "MICROSOFT_APP_ID={bot-app-id}" \
    "MICROSOFT_APP_PASSWORD={bot-app-password}" \
    "MCP_SERVER_URL=https://anf-aiops-mcp.eastus.azurecontainer.io:3000"
```

### 2. Azure Key Vault Integration

#### Store Secrets in Key Vault

```bash
# Store sensitive configuration in Key Vault
az keyvault secret set \
  --vault-name "anf-aiops-kv" \
  --name "azure-client-secret" \
  --value "{client-secret}"

az keyvault secret set \
  --vault-name "anf-aiops-kv" \
  --name "bot-app-password" \
  --value "{bot-app-password}"

az keyvault secret set \
  --vault-name "anf-aiops-kv" \
  --name "jwt-secret" \
  --value "{jwt-secret}"
```

#### Configure Managed Identity Access

```bash
# Enable system-assigned managed identity for Functions
az functionapp identity assign \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-functions"

# Grant Key Vault access
az keyvault set-policy \
  --name "anf-aiops-kv" \
  --object-id "{function-identity-principal-id}" \
  --secret-permissions get list
```

### 3. Network Configuration

#### Configure Private Endpoints

```bash
# Create private endpoint for Function App
az network private-endpoint create \
  --resource-group "anf-aiops-prod" \
  --name "anf-functions-pe" \
  --vnet-name "anf-aiops-vnet" \
  --subnet "private-endpoints" \
  --private-connection-resource-id "{function-app-id}" \
  --group-id "sites" \
  --connection-name "anf-functions-connection"
```

#### Configure DNS

```bash
# Create private DNS zone
az network private-dns zone create \
  --resource-group "anf-aiops-prod" \
  --name "privatelink.azurewebsites.net"

# Link to VNet
az network private-dns link vnet create \
  --resource-group "anf-aiops-prod" \
  --zone-name "privatelink.azurewebsites.net" \
  --name "anf-aiops-dns-link" \
  --virtual-network "anf-aiops-vnet" \
  --registration-enabled false
```

## Testing and Validation

### 1. Health Checks

#### Test Azure Functions

```bash
# Test function health endpoint
curl -X GET "https://anf-aiops-functions.azurewebsites.net/api/health"

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-07-18T10:30:00Z",
#   "services": {
#     "azure": "connected",
#     "keyvault": "accessible",
#     "netapp": "available"
#   }
# }
```

#### Test MCP Server

```bash
# Test MCP server health
curl -X GET "https://anf-aiops-mcp.eastus.azurecontainer.io:3000/health"

# Test MCP tools endpoint
curl -X GET "https://anf-aiops-mcp.eastus.azurecontainer.io:3000/tools" \
  -H "X-API-Key: {api-key}"
```

#### Test Teams Bot

```bash
# Test bot endpoint
curl -X POST "https://anf-aiops-bot.azurewebsites.net/api/messages" \
  -H "Content-Type: application/json" \
  -d '{"type": "ping"}'
```

### 2. Integration Tests

#### Test ANF Operations

```bash
# Test account listing via MCP
curl -X POST "https://anf-aiops-mcp.eastus.azurecontainer.io:3000/call-tool" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: {api-key}" \
  -d '{
    "name": "anf_accounts_list",
    "arguments": {
      "subscriptionId": "{subscription-id}"
    }
  }'
```

#### Test RAG System

```bash
# Test document search
curl -X POST "https://anf-aiops-rag-functions.azurewebsites.net/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "how to create a volume",
    "top": 5
  }'
```

### 3. End-to-End Testing

#### Teams Bot Testing

1. Add the bot to a Teams channel
2. Test basic commands:
   ```
   @ANF-AIOps hello
   @ANF-AIOps list accounts
   @ANF-AIOps help
   ```

#### Performance Testing

```bash
# Install k6 for load testing
npm install -g k6

# Run performance tests
cd tests/performance
k6 run --vus 10 --duration 30s api-load-test.js
```

## Post-Deployment Tasks

### 1. Security Hardening

#### Enable Application Insights

```bash
# Configure Application Insights for monitoring
az monitor app-insights component create \
  --app "anf-aiops-ai" \
  --location "eastus" \
  --resource-group "anf-aiops-prod" \
  --kind "web"
```

#### Configure Alerts

```bash
# Create alert rule for function failures
az monitor metrics alert create \
  --name "anf-functions-failures" \
  --resource-group "anf-aiops-prod" \
  --resource "{function-app-id}" \
  --metric "FunctionExecutionCount" \
  --operator "LessThan" \
  --threshold 1 \
  --aggregation "Total" \
  --window-size "5m" \
  --evaluation-frequency "1m"
```

### 2. Backup Configuration

#### Setup Automated Backups

```bash
# Enable backup for Function Apps
az webapp config backup create \
  --resource-group "anf-aiops-prod" \
  --webapp-name "anf-aiops-functions" \
  --container-url "{storage-container-url}" \
  --frequency 7 \
  --retention-period-in-days 30
```

### 3. Documentation Updates

Update configuration documentation:

```bash
# Update CLAUDE.md with actual deployment values
sed -i 's/your-function-app/anf-aiops-functions/g' CLAUDE.md
sed -i 's/your-mcp-server/anf-aiops-mcp/g' CLAUDE.md
```

## Monitoring and Maintenance

### 1. Monitoring Setup

#### Application Insights Dashboards

Create custom dashboards for:
- API response times and success rates
- Function execution metrics
- ANF operation success/failure rates
- User activity and bot conversations

#### Log Analytics Queries

```kusto
// Function execution failures
FunctionExecutionLogs
| where Status == "Failed"
| summarize count() by FunctionName, bin(TimeGenerated, 1h)

// MCP tool usage patterns
ApiManagementGatewayLogs
| where OperationName startswith "anf_"
| summarize count() by OperationName, bin(TimeGenerated, 1d)

// Bot conversation analysis
BotFrameworkLogs
| where EventName == "MessageReceived"
| extend Intent = tostring(customDimensions.Intent)
| summarize count() by Intent, bin(TimeGenerated, 1h)
```

### 2. Maintenance Tasks

#### Weekly Maintenance

```bash
#!/bin/bash
# Weekly maintenance script

# Update function app settings
az functionapp config appsettings set \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-functions" \
  --settings "LAST_MAINTENANCE=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Restart services for updates
az functionapp restart \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-functions"

az container restart \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-mcp"

# Check service health
curl -f "https://anf-aiops-functions.azurewebsites.net/api/health" || echo "Function health check failed"
curl -f "https://anf-aiops-mcp.eastus.azurecontainer.io:3000/health" || echo "MCP health check failed"
```

#### Monthly Updates

- Review and update security patches
- Analyze usage patterns and optimize resources
- Update documentation and runbooks
- Perform disaster recovery testing

## Troubleshooting

### Common Issues

#### 1. Function App Authentication Failures

**Symptoms**: 401 Unauthorized errors when calling Azure APIs

**Solution**:
```bash
# Verify managed identity is enabled
az functionapp identity show \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-functions"

# Check RBAC assignments
az role assignment list \
  --assignee "{managed-identity-principal-id}" \
  --scope "/subscriptions/{subscription-id}"
```

#### 2. MCP Server Connection Issues

**Symptoms**: Teams bot cannot communicate with MCP server

**Solution**:
```bash
# Check container status
az container show \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-mcp" \
  --query "containers[0].instanceView.currentState"

# Review container logs
az container logs \
  --resource-group "anf-aiops-prod" \
  --name "anf-aiops-mcp"

# Test network connectivity
az network watcher test-connectivity \
  --source-resource "{teams-bot-resource-id}" \
  --dest-address "anf-aiops-mcp.eastus.azurecontainer.io" \
  --dest-port 3000
```

#### 3. ANF API Rate Limiting

**Symptoms**: 429 Too Many Requests errors

**Solution**:
```bash
# Implement exponential backoff in function code
# Check API usage patterns in Application Insights
# Consider implementing request queuing
```

### Diagnostic Commands

```bash
# Comprehensive health check script
#!/bin/bash

echo "=== ANF-AIOps Deployment Health Check ==="

# Check resource group
az group show --name "anf-aiops-prod" --query "properties.provisioningState"

# Check all resources
az resource list --resource-group "anf-aiops-prod" --query "[].{Name:name, Type:type, State:properties.provisioningState}"

# Test function endpoints
curl -s "https://anf-aiops-functions.azurewebsites.net/api/health" | jq '.status'

# Test MCP server
curl -s "https://anf-aiops-mcp.eastus.azurecontainer.io:3000/health" | jq '.status'

# Check Application Insights
az monitor app-insights component show \
  --app "anf-aiops-ai" \
  --resource-group "anf-aiops-prod" \
  --query "provisioningState"

echo "=== Health Check Complete ==="
```

## Security Considerations

### 1. Network Security

- **Private Endpoints**: All internal communication uses private endpoints
- **NSG Rules**: Network Security Groups restrict traffic to necessary ports
- **VNet Integration**: Function Apps are integrated with VNet for secure communication

### 2. Identity and Access

- **Managed Identity**: Use system-assigned managed identities where possible
- **RBAC**: Implement principle of least privilege with Azure RBAC
- **Key Vault**: Store all secrets in Azure Key Vault with proper access policies

### 3. Data Protection

- **Encryption in Transit**: All communications use TLS 1.2 or higher
- **Encryption at Rest**: Enable encryption for all storage services
- **Data Classification**: Implement data classification and handling policies

### 4. Compliance

- **Audit Logging**: Enable comprehensive audit logging
- **Compliance Monitoring**: Regular compliance assessments
- **Incident Response**: Documented incident response procedures

---

**Document Version**: 2.0.0  
**Last Review**: 2025-07-18  
**Next Review**: 2025-10-18  
**Support**: DwirefS@SapientEdge.io