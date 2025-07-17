# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ANF-AIOps is an Azure NetApp Files (ANF) AIOps solution that integrates AI-powered operations management with Microsoft Teams. The project combines Azure Functions, Terraform infrastructure as code, and a RAG (Retrieval-Augmented Generation) system to provide intelligent management of Azure NetApp Files resources.

## Architecture

The codebase is organized into the following major components:

1. **agents/** - AI agent configurations and security controls for Teams integration
   - Agent orchestration, monitoring, and security audit capabilities
   - Teams integration components for user interaction
   - Authentication and authorization policies

2. **functions/ANFServer/** - Azure Functions backend for ANF operations
   - FunctionDefinitions: Core functions for managing Accounts, CapacityPools, Snapshots, and Volumes
   - Middleware: JWT validation and security layers
   - Models: Data models for ANF resources
   - Security features: SecureResponseBuilder, AuthGuards, and PromptLibrary

3. **infra/** - Terraform infrastructure as code
   - Complete Azure infrastructure definitions including APIM, Functions, KeyVault, Identity, and Network
   - NetApp-specific infrastructure configurations
   - Search and storage services for RAG implementation

4. **rag/** - Retrieval-Augmented Generation system
   - Embedding utilities for document processing
   - Vector storage schema and indexer functions
   - Retriever library for intelligent document search

5. **mcp/** - Microsoft Copilot Connector integration
   - OpenAPI specifications for ANF operations
   - Copilot connector configuration
   - API testing collections

6. **ci-cd/** - Continuous Integration/Deployment configurations
   - Azure Pipelines and GitHub Actions workflows
   - Bootstrap scripts for environment setup

## Development Commands

### Infrastructure Deployment
```bash
# Initialize Terraform
cd infra
terraform init

# Plan infrastructure changes
terraform plan -var-file="examples.tfvars"

# Apply infrastructure changes
terraform apply -var-file="examples.tfvars"
```

### Azure Functions Development
```bash
# Navigate to functions directory
cd functions/ANFServer

# Build the C# project (requires .NET SDK)
dotnet build

# Run functions locally (requires Azure Functions Core Tools)
func start

# Run tests (if present)
dotnet test
```

### RAG System Setup
```bash
# Follow the setup guide
cd rag
# Refer to rag-setup-guide.md for detailed instructions
```

## Key Development Considerations

1. **Security-First Approach**: All functions include authentication guards and JWT validation. The PromptLibrary.cs manages secure AI prompts to prevent injection attacks.

2. **Multi-Component Architecture**: Changes often require coordination between:
   - Azure Functions (C# backend logic)
   - Terraform infrastructure (resource provisioning)
   - Teams agents (user interface and interaction)
   - RAG system (knowledge management)

3. **Azure NetApp Files Integration**: Core functionality revolves around managing ANF resources including:
   - NetApp accounts
   - Capacity pools
   - Volumes
   - Snapshots

4. **AI Operations**: The system integrates AI capabilities through:
   - Agent orchestration for automated operations
   - RAG for intelligent document retrieval
   - Prompt management for secure AI interactions

5. **Teams Integration**: User interactions primarily occur through Microsoft Teams, with dedicated components for:
   - Agent user interface
   - Authentication flow
   - Approval workflows

## Testing and Validation

- Use the Postman collection in `mcp/postman-collection.json` for API testing
- Validate infrastructure changes with `terraform plan` before applying
- Test Azure Functions locally using Azure Functions Core Tools
- Ensure all security policies are maintained when modifying authentication flows