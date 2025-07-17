# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ANF-AIOps is an Azure NetApp Files (ANF) AI-Ops solution that integrates AI-powered operations management with Microsoft Teams. The project uses a modern MCP (Model Context Protocol) architecture with Copilot agents for intelligent automation.

## Architecture

The codebase is organized into the following major components:

1. **src/mcp-server/** - TypeScript-based MCP server for ANF operations
   - Tools for managing volumes, pools, snapshots, monitoring, and security
   - Integration with Azure NetApp Files APIs
   - Comprehensive logging and error handling

2. **src/teams-bot/** - Microsoft Teams bot for user interaction
   - Natural language processing for ANF operations
   - Authentication and authorization with Azure AD
   - MCP client for communicating with the server

3. **src/copilot-agents/** - AI agent definitions for automated workflows
   - Orchestrator: Master coordination agent
   - Monitor: Real-time monitoring and analytics
   - Creator: Resource creation workflows
   - Notifier: Alert and notification management
   - Modifier: Maintenance and optimization
   - Deletion: Safe deletion with compliance

4. **src/infrastructure/bicep/** - Azure infrastructure as code
   - Complete Bicep templates for all Azure resources
   - Container Apps for MCP server hosting
   - App Service for Teams bot
   - API Management, Key Vault, Storage, and monitoring

## Development Commands

### MCP Server Development
```bash
cd src/mcp-server
npm install
npm run dev        # Start development server
npm run build      # Build for production
npm run lint       # Run linter
```

### Teams Bot Development
```bash
cd src/teams-bot
npm install
npm run dev        # Start development server
npm run build      # Build for production
npm run lint       # Run linter
```

### Infrastructure Deployment
```bash
cd src/infrastructure/bicep
./deploy.sh -e dev -l eastus                    # Deploy to dev environment
./deploy.sh -e prod -l eastus -s <subscription> # Deploy to production
```

## Key Development Considerations

1. **MCP Architecture**: The system uses Model Context Protocol for tool orchestration between the Teams bot and ANF operations.

2. **TypeScript First**: All code is written in TypeScript with strict type checking enabled.

3. **Security-First Approach**: 
   - All operations include authentication and authorization
   - Azure Key Vault for secrets management
   - Comprehensive audit logging
   - Role-based access control

4. **Azure Integration**: Deep integration with Azure services:
   - Azure NetApp Files for storage operations
   - Azure AD for authentication
   - Azure Monitor for logging and metrics
   - Azure Container Apps for hosting

5. **Copilot Agent Orchestration**: Six specialized agents handle different aspects:
   - Each agent has specific capabilities and workflows
   - JSON-based configuration for easy modification
   - Integration with MCP server tools

## Testing and Validation

### Local Development
```bash
# Test MCP server
cd src/mcp-server
npm test

# Test Teams bot
cd src/teams-bot
npm test

# Validate infrastructure
cd src/infrastructure/bicep
az deployment sub validate --template-file main.bicep --parameters @environments/dev.parameters.json
```

### Environment Testing
- Use `dev.parameters.json` for development testing
- Use `test.parameters.json` for integration testing
- Use `prod.parameters.json` for production deployment

## Important Instructions

### File Organization
- Keep all new components in the `/src/` directory
- Follow the established TypeScript project structure
- Use the existing logging and configuration patterns

### Configuration Management
- Environment-specific parameters go in `/src/infrastructure/bicep/environments/`
- Application configuration in each component's config directory
- Secrets managed through Azure Key Vault integration

### Error Handling
- Use the established logging patterns from utils/logger.ts
- Follow the error handling patterns in the MCP tools
- Ensure all Azure API calls have proper retry logic

### Security
- Never commit secrets or API keys
- Use Azure managed identities where possible
- Follow the authentication patterns established in the auth service
- Ensure all user inputs are validated

### Development Workflow
1. Make changes to the appropriate component in `/src/`
2. Test locally using the npm scripts
3. Validate infrastructure changes with Bicep
4. Deploy to dev environment first
5. Test end-to-end functionality through Teams bot

## File Structure Reference

```
src/
├── mcp-server/
│   ├── src/
│   │   ├── tools/          # ANF management tools
│   │   ├── config/         # Configuration management
│   │   ├── utils/          # Logging and utilities
│   │   └── types/          # TypeScript type definitions
│   ├── package.json
│   └── tsconfig.json
├── teams-bot/
│   ├── src/
│   │   ├── bot/            # Bot implementation
│   │   ├── services/       # Auth, MCP, logging services
│   │   └── index.ts        # Entry point
│   ├── package.json
│   └── tsconfig.json
├── copilot-agents/
│   ├── orchestrator/       # Master coordination
│   ├── monitor/           # Monitoring & analytics
│   ├── creator/           # Resource creation
│   ├── notifier/          # Alerts & notifications
│   ├── modifier/          # Maintenance & optimization
│   ├── deletion/          # Safe deletion workflows
│   └── shared/            # Shared configurations
└── infrastructure/
    └── bicep/
        ├── main.bicep      # Main template
        ├── modules/        # Resource modules
        ├── environments/   # Environment parameters
        └── deploy.sh       # Deployment script
```

## Author Information

**Author**: Dwiref Sharma  
**Contact**: DwirefS@SapientEdge.com  
**Project**: ANF AI-Ops Solution

All code and documentation should maintain this authorship information.