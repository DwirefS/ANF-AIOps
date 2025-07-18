# Azure NetApp Files MCP Server

A Model Context Protocol (MCP) server implementation for managing Azure NetApp Files through natural language commands.

## Author

**Dwiref Sharma**  
Email: DwirefS@SapientEdge.io

## Overview

This MCP server provides comprehensive tools for managing Azure NetApp Files resources including:
- Volume management (create, list, update, delete, resize)
- Capacity pool operations
- Snapshot management and policies
- Performance monitoring and metrics
- Security auditing and compliance
- Cost analysis

## Prerequisites

- Node.js 18+ 
- Azure subscription with NetApp Files enabled
- Azure service principal with appropriate permissions
- Log Analytics Workspace for monitoring

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`
2. Fill in your Azure credentials and configuration:

```bash
cp .env.example .env
```

## Available Tools

### Volume Management
- `anf_create_volume` - Create a new volume
- `anf_list_volumes` - List all volumes
- `anf_get_volume` - Get volume details
- `anf_update_volume` - Update volume configuration
- `anf_delete_volume` - Delete a volume
- `anf_resize_volume` - Resize a volume

### Capacity Pool Management
- `anf_create_pool` - Create a capacity pool
- `anf_list_pools` - List capacity pools
- `anf_get_pool` - Get pool details
- `anf_update_pool` - Update pool configuration
- `anf_delete_pool` - Delete a pool
- `anf_pool_performance` - Get pool performance metrics

### Snapshot Management
- `anf_create_snapshot` - Create a volume snapshot
- `anf_list_snapshots` - List snapshots
- `anf_get_snapshot` - Get snapshot details
- `anf_delete_snapshot` - Delete a snapshot
- `anf_restore_snapshot` - Restore from snapshot
- `anf_create_snapshot_policy` - Create snapshot policy
- `anf_list_snapshot_policies` - List snapshot policies

### Monitoring Tools
- `anf_get_volume_metrics` - Get volume performance metrics
- `anf_get_pool_metrics` - Get pool metrics
- `anf_get_alerts` - Get active alerts
- `anf_health_status` - Check resource health
- `anf_cost_analysis` - Analyze costs

### Security Tools
- `anf_audit_logs` - Retrieve audit logs
- `anf_compliance_check` - Check compliance status
- `anf_encryption_status` - Check encryption configuration
- `anf_access_review` - Review access permissions
- `anf_vulnerability_scan` - Scan for vulnerabilities

## Development

### Build
```bash
npm run build
```

### Run in development mode
```bash
npm run dev
```

### Run tests
```bash
npm test
```

### Linting and formatting
```bash
npm run lint
npm run format
```

## Architecture

The MCP server follows a modular architecture:

```
src/
├── index.ts          # Main server entry point
├── config/           # Configuration management
├── tools/            # Tool implementations
│   ├── volumes.ts    # Volume management tools
│   ├── pools.ts      # Pool management tools
│   ├── snapshots.ts  # Snapshot tools
│   ├── monitoring.ts # Monitoring tools
│   └── security.ts   # Security tools
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
    └── logger.ts     # Logging utilities
```

## Security

- All operations require Azure AD authentication
- Supports managed identities for passwordless auth
- Audit logging for all operations
- Compliance checking against Azure policies
- Encryption at rest and in transit

## Error Handling

The server implements comprehensive error handling:
- Input validation using Zod schemas
- Retry logic for transient failures
- Detailed error messages for troubleshooting
- Correlation IDs for request tracking

## Performance

- Optimized for high-throughput operations
- Connection pooling for Azure clients
- Request timeout controls
- Performance metrics logging

## License

MIT