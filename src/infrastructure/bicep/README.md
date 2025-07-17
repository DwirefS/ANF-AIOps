# ANF AI-Ops Infrastructure

This directory contains the Bicep templates for deploying the Azure NetApp Files AI-Ops solution infrastructure.

## Author
Dwiref Sharma <DwirefS@SapientEdge.com>

## Architecture Overview

The infrastructure includes:
- **Azure NetApp Files**: Storage accounts and capacity pools
- **Container Apps**: MCP server hosting
- **App Service**: Teams bot hosting
- **API Management**: API gateway and security
- **Key Vault**: Secrets management
- **Storage Account**: Document storage for RAG
- **Cognitive Search**: Vector search for RAG
- **Monitoring**: Log Analytics and Application Insights

## Prerequisites

1. Azure CLI installed and configured
2. Appropriate permissions in Azure subscription
3. Teams bot application registered in Azure AD
4. OpenAI API key (if using OpenAI)

## Deployment

### Quick Start

```bash
# Deploy to development environment
./deploy.sh -e dev -l eastus

# Deploy to production environment
./deploy.sh -e prod -l eastus -s <subscription-id>
```

### Manual Deployment

```bash
# Login to Azure
az login

# Set subscription (optional)
az account set --subscription <subscription-id>

# Deploy
az deployment sub create \
    --name anf-aiops-dev \
    --location eastus \
    --template-file main.bicep \
    --parameters @environments/dev.parameters.json \
    --parameters location=eastus
```

## Configuration

### Parameter Files

Update the parameter files in `environments/` with your specific values:

- `dev.parameters.json`: Development environment
- `test.parameters.json`: Test environment  
- `prod.parameters.json`: Production environment

### Required Parameters

- `teamsBotAppId`: Microsoft Teams bot application ID
- `teamsBotAppPassword`: Microsoft Teams bot application secret
- `openAiApiKey`: OpenAI API key for AI operations

### Optional Parameters

- `logAnalyticsWorkspaceId`: Existing Log Analytics workspace ID
- `projectName`: Project name (default: anf-aiops)

## Modules

### Core Infrastructure

- `modules/keyVault.bicep`: Azure Key Vault for secrets
- `modules/network.bicep`: Virtual network and subnets
- `modules/monitoring.bicep`: Log Analytics and Application Insights

### Application Components

- `modules/containerRegistry.bicep`: Container registry
- `modules/containerAppsEnvironment.bicep`: Container Apps environment
- `modules/mcpServer.bicep`: MCP server container app
- `modules/teamsBot.bicep`: Teams bot app service
- `modules/apiManagement.bicep`: API Management gateway

### Storage and AI

- `modules/netappAccount.bicep`: Azure NetApp Files account
- `modules/storage.bicep`: Storage account for documents
- `modules/cognitiveSearch.bicep`: Azure Cognitive Search

## Security

- All resources use managed identities where possible
- Network security groups restrict traffic appropriately
- Key Vault stores all secrets securely
- HTTPS enforced for all web endpoints
- RBAC permissions follow principle of least privilege

## Monitoring

- Azure Monitor collects metrics and logs
- Application Insights tracks application performance
- Custom alert rules for ANF capacity and performance
- Diagnostic settings for comprehensive logging

## Post-Deployment

After deployment, you'll need to:

1. Build and push container images to the registry
2. Update Teams bot manifest with the deployed endpoints
3. Configure Copilot agents with the deployed MCP server URL
4. Set up monitoring dashboards and alerts

## Troubleshooting

### Common Issues

1. **Deployment fails with permission errors**
   - Ensure you have Contributor access to the subscription
   - Check if required resource providers are registered

2. **Container Apps fail to start**
   - Verify container images are pushed to the registry
   - Check container app logs in Azure Portal

3. **Teams bot authentication fails**
   - Verify bot application ID and secret in Key Vault
   - Check bot channel registration configuration

### Useful Commands

```bash
# Check deployment status
az deployment sub show --name <deployment-name>

# View deployment outputs
az deployment sub show --name <deployment-name> --query properties.outputs

# Delete resource group (dev/test only)
az group delete --name anf-aiops-dev-rg --yes --no-wait
```

## Environment-Specific Configurations

### Development
- Basic SKUs for cost optimization
- Shorter retention periods
- Single replicas for most services

### Test
- Standard SKUs for testing
- Moderate retention periods
- Limited redundancy

### Production
- Premium SKUs for performance
- Extended retention periods
- High availability and redundancy
- Enhanced security features