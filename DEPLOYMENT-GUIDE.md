# ANF AI-Ops Deployment Guide

**Author:** Dwiref Sharma <DwirefS@SapientEdge.io>  
**Version:** 1.0.0  
**Date:** July 17, 2025  

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Azure Infrastructure Deployment](#azure-infrastructure-deployment)
4. [Application Deployment](#application-deployment)
5. [Configuration and Security](#configuration-and-security)
6. [Testing and Validation](#testing-and-validation)
7. [Post-Deployment Tasks](#post-deployment-tasks)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedures](#rollback-procedures)

## Prerequisites

### Technical Requirements

#### Azure Subscription
- **Active Azure Subscription** with appropriate credits/budget
- **Owner or Contributor** role at subscription level
- **Resource Provider Registration** for:
  - Microsoft.NetApp
  - Microsoft.ContainerInstance
  - Microsoft.Web
  - Microsoft.KeyVault
  - Microsoft.Storage
  - Microsoft.Search
  - Microsoft.OperationalInsights

#### Development Environment
- **Azure CLI** version 2.50.0 or later
- **PowerShell** version 7.0 or later (for Windows)
- **Bash** (for Linux/macOS)
- **Git** version 2.30 or later
- **Node.js** version 18.0 or later
- **TypeScript** version 5.0 or later
- **Docker** version 20.0 or later

#### Azure Permissions
- **Subscription Owner** or **Contributor** role
- **Key Vault Administrator** role
- **NetApp Contributor** role (if available)
- **User Access Administrator** for RBAC assignments

#### Teams App Registration
- **Microsoft 365 tenant** with Teams enabled
- **App registration permissions** in Azure AD
- **Teams app deployment permissions**

### Planning Requirements

#### Capacity Planning
- **Storage Requirements**: Estimate total ANF capacity needed
- **Performance Requirements**: Determine service level needs (Standard/Premium/Ultra)
- **User Count**: Number of Teams users who will access the system
- **Geographic Requirements**: Regions for deployment and DR

#### Security Planning
- **Compliance Requirements**: Identify applicable frameworks (SOC2, HIPAA, etc.)
- **Network Security**: VNet design and private endpoint requirements
- **Access Control**: User roles and permissions mapping
- **Data Classification**: Sensitivity levels for different workloads

## Environment Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/anf-aiops.git
cd anf-aiops

# Verify repository structure
ls -la src/
```

### 2. Install Development Tools

#### Azure CLI Setup
```bash
# Install Azure CLI (if not already installed)
# Windows (PowerShell)
Invoke-WebRequest -Uri https://aka.ms/installazurecliwindows -OutFile .\AzureCLI.msi
Start-Process msiexec.exe -Wait -ArgumentList '/I AzureCLI.msi /quiet'

# macOS
brew install azure-cli

# Ubuntu/Debian
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login --tenant YOUR_TENANT_ID
az account set --subscription YOUR_SUBSCRIPTION_ID
```

#### Node.js and Dependencies
```bash
# Install Node.js dependencies for MCP Server
cd src/mcp-server
npm install
npm run build

# Install Node.js dependencies for Teams Bot
cd ../teams-bot
npm install
npm run build

# Return to root directory
cd ../..
```

### 3. Azure Resource Providers

```bash
# Register required resource providers
az provider register --namespace Microsoft.NetApp
az provider register --namespace Microsoft.ContainerInstance
az provider register --namespace Microsoft.Web
az provider register --namespace Microsoft.KeyVault
az provider register --namespace Microsoft.Storage
az provider register --namespace Microsoft.Search
az provider register --namespace Microsoft.OperationalInsights

# Verify registration status
az provider list --query "[?namespace=='Microsoft.NetApp'].registrationState" -o table
```

### 4. Teams App Registration

#### Create Azure AD App Registration
```bash
# Create the app registration
az ad app create \
  --display-name "ANF AI-Ops Bot" \
  --sign-in-audience AzureADMultipleOrgs \
  --required-resource-accesses '[
    {
      "resourceAppId": "00000003-0000-0000-c000-000000000000",
      "resourceAccess": [
        {
          "id": "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
          "type": "Scope"
        }
      ]
    }
  ]'

# Note the appId from the output
export TEAMS_BOT_APP_ID="<app-id-from-output>"

# Create app secret
az ad app credential reset --id $TEAMS_BOT_APP_ID --display-name "ANF-AIOps-Secret"
# Note the password from the output
export TEAMS_BOT_APP_SECRET="<password-from-output>"
```

## Azure Infrastructure Deployment

### 1. Prepare Deployment Parameters

#### Create Parameter Files
```bash
# Create development parameters
cat > src/infrastructure/bicep/environments/dev.parameters.json << EOF
{
  "\$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": {
      "value": "dev"
    },
    "location": {
      "value": "eastus"
    },
    "projectName": {
      "value": "anf-aiops"
    },
    "teamsBotAppId": {
      "value": "$TEAMS_BOT_APP_ID"
    },
    "teamsBotAppPassword": {
      "value": "$TEAMS_BOT_APP_SECRET"
    },
    "openAiApiKey": {
      "value": "your-openai-api-key"
    }
  }
}
EOF

# Update production parameters similarly
cp src/infrastructure/bicep/environments/dev.parameters.json src/infrastructure/bicep/environments/prod.parameters.json
# Edit prod.parameters.json with production values
```

### 2. Deploy Infrastructure

#### Development Environment
```bash
cd src/infrastructure/bicep

# Validate the template
az deployment sub validate \
  --location eastus \
  --template-file main.bicep \
  --parameters @environments/dev.parameters.json

# Deploy to development
./deploy.sh -e dev -l eastus

# Capture outputs
az deployment sub show \
  --name "anf-aiops-dev-$(date +%Y%m%d)" \
  --query properties.outputs \
  --output json > deployment-outputs-dev.json
```

#### Production Environment
```bash
# Deploy to production with additional confirmations
./deploy.sh -e prod -l eastus -s YOUR_SUBSCRIPTION_ID

# Verify deployment
az resource list \
  --resource-group anf-aiops-prod-rg \
  --output table
```

### 3. Verify Infrastructure Deployment

#### Check Resource Status
```bash
# Verify all resources are deployed
az resource list \
  --resource-group anf-aiops-dev-rg \
  --query "[].{Name:name, Type:type, Status:properties.provisioningState}" \
  --output table

# Check ANF account status
az netappfiles account list \
  --resource-group anf-aiops-dev-rg \
  --output table

# Verify Key Vault access
az keyvault secret list \
  --vault-name anf-aiops-dev-kv-UNIQUEID \
  --output table
```

## Application Deployment

### 1. Container Image Preparation

#### Build MCP Server Image
```bash
cd src/mcp-server

# Create Dockerfile
cat > Dockerfile << EOF
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY dist/ ./dist/
COPY src/config/ ./src/config/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
USER node
CMD ["node", "dist/index.js"]
EOF

# Build and push image
az acr login --name anfaiopsdatacr UNIQUEID
docker build -t anf-mcp-server:latest .
docker tag anf-mcp-server:latest anfaiopsdatacr UNIQUEID.azurecr.io/mcp-server:latest
docker push anfaiopsdatacr UNIQUEID.azurecr.io/mcp-server:latest
```

#### Deploy MCP Server to Container Apps
```bash
# Update container app with new image
az containerapp update \
  --name anf-aiops-dev-mcp \
  --resource-group anf-aiops-dev-rg \
  --image anfaiopsdatacr UNIQUEID.azurecr.io/mcp-server:latest \
  --environment-variables \
    NODE_ENV=production \
    AZURE_SUBSCRIPTION_ID=YOUR_SUBSCRIPTION_ID \
    AZURE_TENANT_ID=YOUR_TENANT_ID

# Verify deployment
az containerapp show \
  --name anf-aiops-dev-mcp \
  --resource-group anf-aiops-dev-rg \
  --query "properties.{Status:provisioningState,FQDN:configuration.ingress.fqdn}" \
  --output table
```

### 2. Teams Bot Deployment

#### Deploy to App Service
```bash
cd src/teams-bot

# Create deployment package
npm run build
zip -r teams-bot.zip dist/ node_modules/ package.json

# Deploy to App Service
az webapp deployment source config-zip \
  --resource-group anf-aiops-dev-rg \
  --name anf-aiops-dev-bot \
  --src teams-bot.zip

# Configure app settings
az webapp config appsettings set \
  --resource-group anf-aiops-dev-rg \
  --name anf-aiops-dev-bot \
  --settings \
    NODE_ENV=production \
    MicrosoftAppId="@Microsoft.KeyVault(VaultName=anf-aiops-dev-kv-UNIQUEID;SecretName=teams-bot-app-id)" \
    MicrosoftAppPassword="@Microsoft.KeyVault(VaultName=anf-aiops-dev-kv-UNIQUEID;SecretName=teams-bot-app-password)" \
    MCP_SERVER_URL="https://anf-aiops-dev-mcp.REGION.azurecontainerapps.io"

# Verify deployment
az webapp show \
  --resource-group anf-aiops-dev-rg \
  --name anf-aiops-dev-bot \
  --query "{Name:name,State:state,DefaultHostName:defaultHostName}" \
  --output table
```

## Configuration and Security

### 1. Key Vault Configuration

#### Store Secrets
```bash
# Store OpenAI API key
az keyvault secret set \
  --vault-name anf-aiops-dev-kv-UNIQUEID \
  --name "openai-api-key" \
  --value "YOUR_OPENAI_API_KEY"

# Store Azure service principal credentials
az keyvault secret set \
  --vault-name anf-aiops-dev-kv-UNIQUEID \
  --name "azure-client-id" \
  --value "YOUR_SERVICE_PRINCIPAL_ID"

az keyvault secret set \
  --vault-name anf-aiops-dev-kv-UNIQUEID \
  --name "anf-service-principal-secret" \
  --value "YOUR_SERVICE_PRINCIPAL_SECRET"
```

#### Configure Access Policies
```bash
# Grant Container App access to Key Vault
CONTAINER_APP_PRINCIPAL_ID=$(az containerapp show \
  --name anf-aiops-dev-mcp \
  --resource-group anf-aiops-dev-rg \
  --query identity.principalId -o tsv)

az keyvault set-policy \
  --name anf-aiops-dev-kv-UNIQUEID \
  --object-id $CONTAINER_APP_PRINCIPAL_ID \
  --secret-permissions get list

# Grant App Service access to Key Vault
APP_SERVICE_PRINCIPAL_ID=$(az webapp identity show \
  --name anf-aiops-dev-bot \
  --resource-group anf-aiops-dev-rg \
  --query principalId -o tsv)

az keyvault set-policy \
  --name anf-aiops-dev-kv-UNIQUEID \
  --object-id $APP_SERVICE_PRINCIPAL_ID \
  --secret-permissions get list
```

### 2. Network Security

#### Configure Private Endpoints
```bash
# Create private endpoint for Key Vault
az network private-endpoint create \
  --resource-group anf-aiops-dev-rg \
  --name anf-aiops-kv-pe \
  --vnet-name anf-aiops-dev-vnet \
  --subnet PrivateEndpointsSubnet \
  --private-connection-resource-id "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/anf-aiops-dev-rg/providers/Microsoft.KeyVault/vaults/anf-aiops-dev-kv-UNIQUEID" \
  --connection-name anf-aiops-kv-connection \
  --group-id vault

# Configure DNS for private endpoint
az network private-dns zone create \
  --resource-group anf-aiops-dev-rg \
  --name "privatelink.vaultcore.azure.net"

az network private-dns link vnet create \
  --resource-group anf-aiops-dev-rg \
  --zone-name "privatelink.vaultcore.azure.net" \
  --name anf-aiops-kv-dns-link \
  --virtual-network anf-aiops-dev-vnet \
  --registration-enabled false
```

### 3. RBAC Configuration

#### Create Custom Roles
```bash
# Create ANF Operator role
cat > anf-operator-role.json << EOF
{
  "Name": "ANF AI-Ops Operator",
  "IsCustom": true,
  "Description": "Can manage ANF resources through AI-Ops system",
  "Actions": [
    "Microsoft.NetApp/*/read",
    "Microsoft.NetApp/netAppAccounts/capacityPools/volumes/write",
    "Microsoft.NetApp/netAppAccounts/capacityPools/volumes/delete",
    "Microsoft.NetApp/netAppAccounts/capacityPools/volumes/snapshots/*"
  ],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": [
    "/subscriptions/YOUR_SUBSCRIPTION_ID"
  ]
}
EOF

az role definition create --role-definition anf-operator-role.json
```

#### Assign Roles
```bash
# Assign role to MCP server managed identity
az role assignment create \
  --assignee $CONTAINER_APP_PRINCIPAL_ID \
  --role "ANF AI-Ops Operator" \
  --scope "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/anf-aiops-dev-rg"

# Assign NetApp Contributor role
az role assignment create \
  --assignee $CONTAINER_APP_PRINCIPAL_ID \
  --role "NetApp Contributor" \
  --scope "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/anf-aiops-dev-rg"
```

## Testing and Validation

### 1. Infrastructure Testing

#### Connectivity Tests
```bash
# Test Key Vault connectivity
az keyvault secret show \
  --vault-name anf-aiops-dev-kv-UNIQUEID \
  --name teams-bot-app-id \
  --query value -o tsv

# Test Container App health
curl -f https://anf-aiops-dev-mcp.REGION.azurecontainerapps.io/health

# Test App Service health
curl -f https://anf-aiops-dev-bot.azurewebsites.net/health
```

#### ANF Integration Tests
```bash
# Test ANF account access
az netappfiles account show \
  --resource-group anf-aiops-dev-rg \
  --name anf-aiops-dev-anf \
  --output table

# Test capacity pool creation
az netappfiles pool create \
  --resource-group anf-aiops-dev-rg \
  --account-name anf-aiops-dev-anf \
  --name test-pool \
  --size 4398046511104 \
  --service-level Standard \
  --location eastus
```

### 2. Application Testing

#### MCP Server Tests
```bash
# Test MCP server endpoints
curl -X POST https://anf-aiops-dev-mcp.REGION.azurecontainerapps.io/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "anf_list_volumes",
    "arguments": {}
  }'
```

#### Teams Bot Tests
```bash
# Test bot framework endpoint
curl -X POST https://anf-aiops-dev-bot.azurewebsites.net/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VALID_TOKEN" \
  -d '{
    "type": "message",
    "text": "/anf help",
    "from": {"id": "test-user", "name": "Test User"}
  }'
```

### 3. End-to-End Testing

#### Teams Integration Test
1. **Install Teams App**:
   - Navigate to Teams Admin Center
   - Upload the app manifest
   - Approve for organization use

2. **Test Basic Commands**:
   ```
   /anf help
   /anf status
   /anf list volumes
   ```

3. **Test Natural Language**:
   ```
   "Show me all volumes"
   "What's the current status?"
   "Create a new volume"
   ```

## Post-Deployment Tasks

### 1. Monitoring Setup

#### Configure Alerts
```bash
# Create action group for notifications
az monitor action-group create \
  --resource-group anf-aiops-dev-rg \
  --name anf-aiops-alerts \
  --short-name anf-alerts \
  --email-receivers \
    name=admin \
    email=admin@yourcompany.com \
    useCommonSchema=true

# Create metric alerts
az monitor metrics alert create \
  --name "ANF High Capacity Usage" \
  --resource-group anf-aiops-dev-rg \
  --scopes "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/anf-aiops-dev-rg" \
  --condition "avg VolumeConsumedSizePercentage > 80" \
  --action anf-aiops-alerts \
  --description "Alert when volume capacity exceeds 80%"
```

#### Configure Dashboards
```bash
# Create Application Insights dashboard
az portal dashboard create \
  --resource-group anf-aiops-dev-rg \
  --name "ANF AI-Ops Dashboard" \
  --input-path dashboard-template.json
```

### 2. Backup Configuration

#### Configure Automated Backups
```bash
# Create backup policy for ANF
az backup policy create \
  --resource-group anf-aiops-dev-rg \
  --vault-name anf-aiops-backup-vault \
  --name anf-daily-backup \
  --policy backup-policy.json

# Enable backup for volumes
az backup protection enable-for-vm \
  --resource-group anf-aiops-dev-rg \
  --vault-name anf-aiops-backup-vault \
  --vm anf-volume-name \
  --policy-name anf-daily-backup
```

### 3. Security Configuration

#### Enable Microsoft Defender
```bash
# Enable Defender for Cloud
az security pricing create \
  --name VirtualMachines \
  --tier Standard

# Enable Defender for Storage
az security pricing create \
  --name StorageAccounts \
  --tier Standard

# Configure security contacts
az security contact create \
  --email admin@yourcompany.com \
  --phone "+1-555-0123" \
  --alert-notifications-minimal-severity High \
  --notifications-by-role Owner
```

## Monitoring and Maintenance

### 1. Regular Monitoring Tasks

#### Daily Checks
```bash
#!/bin/bash
# daily-checks.sh

echo "=== Daily ANF AI-Ops Health Check ==="
echo "Date: $(date)"

# Check service health
echo "Checking MCP Server health..."
curl -f https://anf-aiops-dev-mcp.REGION.azurecontainerapps.io/health

echo "Checking Teams Bot health..."
curl -f https://anf-aiops-dev-bot.azurewebsites.net/health

# Check ANF capacity
echo "Checking ANF capacity utilization..."
az netappfiles volume list \
  --resource-group anf-aiops-dev-rg \
  --account-name anf-aiops-dev-anf \
  --query "[].{Name:name, Size:usageThreshold, Used:consumedBytes}" \
  --output table

# Check recent alerts
echo "Checking recent alerts..."
az monitor activity-log list \
  --start-time $(date -d "1 day ago" -u +%Y-%m-%dT%H:%M:%SZ) \
  --query "[?level=='Error' || level=='Warning'].{Time:eventTimestamp, Level:level, Message:operationName.value}" \
  --output table
```

#### Weekly Tasks
```bash
#!/bin/bash
# weekly-maintenance.sh

echo "=== Weekly ANF AI-Ops Maintenance ==="

# Update container images
echo "Updating container images..."
az containerapp update \
  --name anf-aiops-dev-mcp \
  --resource-group anf-aiops-dev-rg \
  --image anfaiopsdatacr UNIQUEID.azurecr.io/mcp-server:latest

# Check backup status
echo "Checking backup status..."
az backup job list \
  --resource-group anf-aiops-dev-rg \
  --vault-name anf-aiops-backup-vault \
  --query "[?properties.status!='Completed'].{JobId:name, Status:properties.status, StartTime:properties.startTime}" \
  --output table

# Security scan
echo "Running security assessment..."
az security assessment list \
  --query "[?properties.status.code!='Healthy'].{Name:name, Status:properties.status.code, Severity:properties.metadata.severity}" \
  --output table
```

### 2. Performance Optimization

#### Monitor Performance Metrics
```bash
# Check application performance
az monitor metrics list \
  --resource "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/anf-aiops-dev-rg/providers/Microsoft.App/containerApps/anf-aiops-dev-mcp" \
  --metric "CpuPercentage" \
  --start-time $(date -d "1 hour ago" -u +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --interval PT5M

# Check ANF performance
az netappfiles volume show \
  --resource-group anf-aiops-dev-rg \
  --account-name anf-aiops-dev-anf \
  --pool-name default-pool \
  --name volume-name \
  --query "{Name:name, Throughput:throughputMibps, IOPS:actualThroughputMibps}" \
  --output table
```

### 3. Cost Management

#### Monitor Costs
```bash
# Get cost analysis
az consumption usage list \
  --start-date $(date -d "30 days ago" +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d) \
  --query "[?contains(instanceName, 'anf-aiops')].{Service:instanceName, Cost:pretaxCost, Currency:currency}" \
  --output table

# Set up budget alerts
az consumption budget create \
  --budget-name "ANF-AIOps-Monthly-Budget" \
  --amount 10000 \
  --time-grain Monthly \
  --start-date $(date +%Y-%m-01) \
  --end-date 2025-12-31 \
  --resource-group-filter anf-aiops-dev-rg
```

## Troubleshooting

### 1. Common Issues

#### Container App Not Starting
```bash
# Check container app logs
az containerapp logs show \
  --name anf-aiops-dev-mcp \
  --resource-group anf-aiops-dev-rg \
  --follow

# Check environment variables
az containerapp show \
  --name anf-aiops-dev-mcp \
  --resource-group anf-aiops-dev-rg \
  --query "properties.template.containers[0].env" \
  --output table

# Restart container app
az containerapp revision restart \
  --name anf-aiops-dev-mcp \
  --resource-group anf-aiops-dev-rg
```

#### Teams Bot Authentication Issues
```bash
# Verify app registration
az ad app show --id $TEAMS_BOT_APP_ID \
  --query "{AppId:appId, DisplayName:displayName, SignInAudience:signInAudience}" \
  --output table

# Check Key Vault access
az keyvault secret show \
  --vault-name anf-aiops-dev-kv-UNIQUEID \
  --name teams-bot-app-id

# Test bot endpoint
curl -X POST https://anf-aiops-dev-bot.azurewebsites.net/api/messages \
  -H "Content-Type: application/json" \
  -d '{"type":"ping"}'
```

#### ANF Connectivity Issues
```bash
# Check ANF account status
az netappfiles account show \
  --resource-group anf-aiops-dev-rg \
  --name anf-aiops-dev-anf \
  --query "{Name:name, ProvisioningState:provisioningState, Location:location}" \
  --output table

# Verify RBAC assignments
az role assignment list \
  --assignee $CONTAINER_APP_PRINCIPAL_ID \
  --all \
  --query "[].{Role:roleDefinitionName, Scope:scope}" \
  --output table

# Test ANF API access
az rest \
  --method GET \
  --url "https://management.azure.com/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/anf-aiops-dev-rg/providers/Microsoft.NetApp/netAppAccounts?api-version=2022-05-01" \
  --query "value[].{Name:name, State:provisioningState}"
```

### 2. Diagnostic Commands

#### Health Check Script
```bash
#!/bin/bash
# health-check.sh

echo "=== ANF AI-Ops Health Diagnostic ==="

# Check Azure login
echo "1. Checking Azure authentication..."
az account show --query "{Subscription:name, User:user.name}" --output table

# Check resource group
echo "2. Checking resource group..."
az group show --name anf-aiops-dev-rg --query "{Name:name, State:properties.provisioningState, Location:location}" --output table

# Check Key Vault
echo "3. Checking Key Vault..."
az keyvault show --name anf-aiops-dev-kv-UNIQUEID --query "{Name:name, State:properties.provisioningState}" --output table

# Check Container App
echo "4. Checking Container App..."
az containerapp show --name anf-aiops-dev-mcp --resource-group anf-aiops-dev-rg --query "{Name:name, State:properties.provisioningState, FQDN:properties.configuration.ingress.fqdn}" --output table

# Check App Service
echo "5. Checking App Service..."
az webapp show --name anf-aiops-dev-bot --resource-group anf-aiops-dev-rg --query "{Name:name, State:state, DefaultHostName:defaultHostName}" --output table

# Check ANF account
echo "6. Checking ANF account..."
az netappfiles account show --resource-group anf-aiops-dev-rg --name anf-aiops-dev-anf --query "{Name:name, State:provisioningState}" --output table

echo "=== Health Check Complete ==="
```

## Rollback Procedures

### 1. Application Rollback

#### Rollback Container App
```bash
# List revisions
az containerapp revision list \
  --name anf-aiops-dev-mcp \
  --resource-group anf-aiops-dev-rg \
  --query "[].{Name:name, Active:properties.active, CreatedTime:properties.createdTime}" \
  --output table

# Activate previous revision
az containerapp revision activate \
  --name anf-aiops-dev-mcp \
  --resource-group anf-aiops-dev-rg \
  --revision PREVIOUS_REVISION_NAME
```

#### Rollback App Service
```bash
# List deployment slots
az webapp deployment slot list \
  --name anf-aiops-dev-bot \
  --resource-group anf-aiops-dev-rg \
  --output table

# Swap to previous deployment
az webapp deployment slot swap \
  --name anf-aiops-dev-bot \
  --resource-group anf-aiops-dev-rg \
  --slot staging \
  --target-slot production
```

### 2. Infrastructure Rollback

#### Emergency Rollback
```bash
# Delete resource group (nuclear option)
az group delete \
  --name anf-aiops-dev-rg \
  --yes \
  --no-wait

# Redeploy from known good state
./deploy.sh -e dev -l eastus
```

### 3. Configuration Rollback

#### Restore Key Vault Secrets
```bash
# List secret versions
az keyvault secret list-versions \
  --vault-name anf-aiops-dev-kv-UNIQUEID \
  --name teams-bot-app-password \
  --query "[].{Version:id, Enabled:attributes.enabled, Created:attributes.created}" \
  --output table

# Restore previous version
az keyvault secret set-attributes \
  --vault-name anf-aiops-dev-kv-UNIQUEID \
  --name teams-bot-app-password \
  --version PREVIOUS_VERSION_ID
```

---

## Summary

This deployment guide provides comprehensive steps for deploying the ANF AI-Ops solution from development to production. Key success factors include:

1. **Thorough Prerequisites**: Ensure all requirements are met before starting
2. **Incremental Deployment**: Deploy and test each component before proceeding
3. **Security First**: Configure security controls throughout the deployment
4. **Comprehensive Testing**: Validate each layer before moving to the next
5. **Monitoring Setup**: Establish monitoring before going live
6. **Documentation**: Keep deployment notes and configurations documented

For support and troubleshooting, refer to the troubleshooting section or contact the development team.

---

**Document Control**
- **Version**: 1.0.0
- **Author**: Dwiref Sharma
- **Review Date**: July 17, 2025
- **Next Review**: October 17, 2025
- **Approval**: [Pending]