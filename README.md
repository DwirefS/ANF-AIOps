# ANF AI-Ops: Azure NetApp Files AI-Powered Operations

An intelligent AI-Ops solution for Azure NetApp Files management integrated with Microsoft Teams and powered by Copilot agents.

## Author
**Dwiref Sharma** - DwirefS@SapientEdge.com

## Overview

This solution provides AI-powered operations management for Azure NetApp Files (ANF) through:
- **Microsoft Teams Integration** for natural language operations
- **MCP (Model Context Protocol) Server** for tool orchestration
- **Copilot Agents** for automated workflows
- **Azure Infrastructure** for scalable deployment

## Architecture

### Core Components

1. **MCP Server** (`/src/mcp-server/`)
   - TypeScript-based server providing ANF management tools
   - Handles volumes, pools, snapshots, monitoring, and security operations
   - Integrates with Azure NetApp Files APIs

2. **Teams Bot** (`/src/teams-bot/`)
   - Microsoft Teams bot for user interaction
   - Natural language processing for ANF operations
   - Authentication and authorization with Azure AD

3. **Copilot Agents** (`/src/copilot-agents/`)
   - **Orchestrator**: Master coordination agent
   - **Monitor**: Real-time monitoring and analytics
   - **Creator**: Resource creation workflows
   - **Notifier**: Alert and notification management
   - **Modifier**: Maintenance and optimization
   - **Deletion**: Safe deletion with compliance

4. **Azure Infrastructure** (`/src/infrastructure/bicep/`)
   - Complete Bicep templates for Azure deployment
   - Container Apps for MCP server hosting
   - App Service for Teams bot
   - API Management for secure gateway
   - Key Vault for secrets management

## Quick Start

### Prerequisites

- Azure subscription with NetApp Files enabled
- Microsoft Teams app registration
- Node.js 18+ and TypeScript
- Azure CLI and Bicep

### Deployment

1. **Deploy Infrastructure**
   ```bash
   cd src/infrastructure/bicep
   ./deploy.sh -e dev -l eastus
   ```

2. **Build and Deploy MCP Server**
   ```bash
   cd src/mcp-server
   npm install
   npm run build
   # Deploy to Azure Container Apps
   ```

3. **Deploy Teams Bot**
   ```bash
   cd src/teams-bot
   npm install
   npm run build
   # Deploy to Azure App Service
   ```

4. **Configure Copilot Agents**
   - Deploy agent definitions from `/src/copilot-agents/`
   - Configure with deployed MCP server endpoint

## Features

### ANF Management
- **Volume Operations**: Create, resize, delete, list volumes
- **Pool Management**: Capacity pool operations and optimization
- **Snapshot Management**: Create, restore, and manage snapshots
- **Performance Monitoring**: Real-time metrics and alerts
- **Security Auditing**: Compliance and vulnerability scanning

### AI-Powered Operations
- **Natural Language Interface**: Teams chat for ANF operations
- **Automated Workflows**: Copilot agents for routine tasks
- **Predictive Analytics**: Capacity planning and optimization
- **Intelligent Alerts**: Context-aware notifications

### Security & Compliance
- **Azure AD Integration**: Role-based access control
- **Audit Logging**: Comprehensive operation tracking
- **Secure Communication**: End-to-end encryption
- **Compliance Reporting**: Regulatory compliance tools

## Usage Examples

### Teams Bot Commands
```
/anf list volumes
/anf create volume myvolume 100GB
/anf show metrics volume-id
/anf help
```

### Natural Language
```
"Show me all volumes in the production environment"
"Create a new 500GB volume for the database"
"What's the current capacity utilization?"
```

## Configuration

### Environment Variables
```bash
# Teams Bot
MICROSOFT_APP_ID=your-app-id
MICROSOFT_APP_PASSWORD=your-app-password
MCP_SERVER_URL=https://your-mcp-server.azurecontainerapps.io

# MCP Server
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

### Infrastructure Parameters
Update parameter files in `/src/infrastructure/bicep/environments/`:
- `dev.parameters.json` - Development environment
- `test.parameters.json` - Testing environment
- `prod.parameters.json` - Production environment

## Project Structure

```
src/
├── mcp-server/           # MCP server implementation
│   ├── src/
│   │   ├── tools/        # ANF management tools
│   │   ├── config/       # Configuration management
│   │   └── utils/        # Utilities and logging
│   └── package.json
├── teams-bot/            # Microsoft Teams bot
│   ├── src/
│   │   ├── bot/          # Bot implementation
│   │   └── services/     # Auth, MCP, logging services
│   └── package.json
├── copilot-agents/       # Copilot agent definitions
│   ├── orchestrator/     # Master coordination
│   ├── monitor/          # Monitoring & analytics
│   ├── creator/          # Resource creation
│   ├── notifier/         # Alerts & notifications
│   ├── modifier/         # Maintenance & optimization
│   └── deletion/         # Safe deletion workflows
└── infrastructure/       # Azure infrastructure
    └── bicep/
        ├── main.bicep    # Main template
        ├── modules/      # Resource modules
        └── environments/ # Environment parameters
```

## Development

### MCP Server
```bash
cd src/mcp-server
npm install
npm run dev
```

### Teams Bot
```bash
cd src/teams-bot
npm install
npm run dev
```

### Infrastructure
```bash
cd src/infrastructure/bicep
az deployment sub create --template-file main.bicep --parameters @environments/dev.parameters.json
```

## Contributing

1. Follow the project plan in `ProjectPlan.md`
2. Review development guidelines in `CLAUDE.md`
3. Ensure all changes align with the MCP architecture
4. Test with both development and production environments

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Review the project plan: `ProjectPlan.md`
- Check development guidelines: `CLAUDE.md`
- Contact: DwirefS@SapientEdge.com