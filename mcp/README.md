# Azure NetApp Files MCP (Microsoft Copilot Connector) Integration

**Author:** Dwiref Sharma <DwirefS@SapientEdge.io>  
**Version:** 1.0.0  
**Date:** July 18, 2025  
**API Version:** 2025-03-01

## Overview

The Azure NetApp Files MCP Integration provides comprehensive Microsoft Copilot Connector configuration for managing Azure NetApp Files (ANF) resources through natural language interactions in Microsoft Teams. This integration covers all 19 operation groups with 200+ REST operations from the Azure NetApp Files API.

## Architecture

The MCP integration consists of several key components:

### Directory Structure

```
mcp/
├── README.md                           # This documentation
├── connectors/
│   └── anf-connector.json             # Main connector configuration
├── openapi/
│   └── anf-api.yaml                    # Complete OpenAPI 3.0 specification
├── schemas/
│   └── anf-schemas.json                # JSON schemas for all ANF resources
├── postman/
│   └── anf-api-collection.json         # Postman collection for API testing
└── config/
    └── connector-config.json           # Environment configuration
```

## Features

### Complete API Coverage

The MCP integration provides access to all 19 Azure NetApp Files operation groups:

1. **Accounts Operations** (10 operations) - NetApp account management
2. **Pools Operations** (5 operations) - Capacity pool management
3. **Volumes Operations** (26 operations) - Volume lifecycle and operations
4. **Snapshots Operations** (8 operations) - Point-in-time snapshots
5. **Backup Policies Operations** (5 operations) - Automated backup policies
6. **Backup Vaults Operations** (7 operations) - Backup vault management
7. **Backups Operations** (15 operations) - Backup lifecycle management
8. **Backups Under Account Operations** (9 operations) - Account-level backup operations
9. **Backups Under Backup Vault Operations** (10 operations) - Vault-specific backup operations
10. **Backups Under Volume Operations** (10 operations) - Volume-specific backup operations
11. **NetApp Resource Operations** (10 operations) - Resource provider management
12. **NetApp Resource Quota Limits Operations** (6 operations) - Quota management
13. **NetApp Resource Region Infos Operations** (9 operations) - Regional capabilities
14. **NetApp Resource Usages Operations** (9 operations) - Usage analytics
15. **Operations Operations** (7 operations) - API operation metadata
16. **Snapshot Policies Operations** (9 operations) - Automated snapshot policies
17. **Subvolumes Operations** (8 operations) - Subvolume management
18. **Volume Groups Operations** (6 operations) - Application volume groups
19. **Volume Quota Rules Operations** (6 operations) - User/group quotas

### Security and Compliance

- **Authentication**: Azure AD OAuth2 with JWT token validation
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: TLS 1.3 for transport, AES-256 for data at rest
- **Compliance**: SOC2, HIPAA, ISO27001, PCI-DSS, GDPR ready
- **Audit Logging**: Comprehensive operation tracking

### Natural Language Interface

The connector enables Teams users to interact with ANF using natural language:

- "Create a new volume with 1TB capacity in the production pool"
- "Show me all snapshots for the database volume from last week"
- "Set up backup policy for critical volumes with daily retention"
- "What's the current usage of our capacity pools?"

## Quick Start

### Prerequisites

1. Azure subscription with NetApp Files enabled
2. Microsoft Teams with Copilot integration
3. Azure AD tenant with appropriate permissions
4. API Management instance (optional but recommended)

### Configuration

1. **Environment Setup**
   ```bash
   # Copy the connector configuration
   cp config/connector-config.json.example config/connector-config.json
   
   # Update with your Azure details
   nano config/connector-config.json
   ```

2. **Azure AD App Registration**
   ```bash
   # Create an App Registration for the connector
   az ad app create --display-name "ANF-AIOps-Connector" \
     --sign-in-audience "AzureADMyOrg" \
     --required-resource-accesses @app-permissions.json
   ```

3. **Teams Integration**
   - Upload the connector configuration to Teams Admin Center
   - Configure the bot permissions and scopes
   - Test the integration with sample commands

### Testing

Use the provided Postman collection to test API endpoints:

```bash
# Import the collection
newman run postman/anf-api-collection.json \
  --environment postman/environments/dev.json
```

## API Operations

### Core Operations

#### Account Management
- `anf_accounts_create_or_update` - Create or update NetApp account
- `anf_accounts_delete` - Delete NetApp account
- `anf_accounts_get` - Get account details
- `anf_accounts_list` - List accounts in resource group

#### Volume Management
- `anf_volumes_create_or_update` - Create or update volume
- `anf_volumes_delete` - Delete volume
- `anf_volumes_get` - Get volume details
- `anf_volumes_list` - List volumes in pool

#### Backup Operations
- `anf_backups_create` - Create backup
- `anf_backups_delete` - Delete backup
- `anf_backups_restore_files` - Restore files from backup

#### Advanced Operations
- `anf_volumes_authorize_replication` - Set up cross-region replication
- `anf_snapshot_policies_create` - Create automated snapshot policy
- `anf_volume_groups_create` - Create application volume group

### Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": { /* operation result */ },
  "requestId": "uuid",
  "timestamp": "2025-07-18T12:00:00Z"
}
```

Error responses include detailed information:

```json
{
  "success": false,
  "error": "Error description",
  "details": {
    "validationErrors": { /* field-specific errors */ }
  },
  "requestId": "uuid",
  "timestamp": "2025-07-18T12:00:00Z"
}
```

## Connector Configuration

### Authentication Configuration

```json
{
  "authentication": {
    "type": "oauth2",
    "authorizationUrl": "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
    "tokenUrl": "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
    "scopes": [
      "https://management.azure.com/.default"
    ]
  }
}
```

### Security Settings

```json
{
  "security": {
    "rateLimiting": {
      "requestsPerMinute": 1000,
      "burstAllowance": 100
    },
    "ipWhitelist": ["10.0.0.0/8", "172.16.0.0/12"],
    "requiredHeaders": ["Authorization", "X-Request-ID"]
  }
}
```

## Usage Examples

### Creating Storage Infrastructure

```
User: "Set up a new NetApp account called 'production-anf' in East US with a 4TB Premium pool"

Connector Response:
- Creates NetApp account 'production-anf' in East US
- Creates capacity pool 'premium-pool' with 4TB Premium service level
- Returns account and pool details
- Sets up monitoring and alerting
```

### Backup Management

```
User: "Create a daily backup policy for all database volumes with 30-day retention"

Connector Response:
- Creates backup policy with daily schedule
- Sets 30-day retention period
- Applies policy to volumes tagged as 'database'
- Configures backup vault if needed
```

### Performance Optimization

```
User: "Show me volumes using more than 80% capacity and suggest optimizations"

Connector Response:
- Queries volume usage metrics
- Identifies volumes over 80% capacity
- Suggests pool migration or volume expansion
- Provides cost impact analysis
```

## Monitoring and Analytics

### Performance Metrics

The connector tracks and reports on:

- **Response Times**: API call latency and throughput
- **Error Rates**: Failed operations and error categories
- **Usage Patterns**: Most frequently used operations
- **Resource Utilization**: ANF capacity and performance metrics

### Alerting

Configurable alerts for:

- High API error rates
- Quota approaching limits
- Backup failures
- Replication issues
- Security violations

### Dashboards

Pre-built dashboards for:

- ANF Resource Overview
- Performance Analytics
- Cost Analysis
- Security and Compliance
- Backup and Disaster Recovery

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify Azure AD app registration
   - Check token scopes and permissions
   - Validate client ID and secret

2. **Permission Denied**
   - Ensure proper RBAC assignments
   - Verify NetApp resource provider registration
   - Check subscription-level permissions

3. **Rate Limiting**
   - Implement exponential backoff
   - Use bulk operations where possible
   - Monitor rate limit headers

### Debug Mode

Enable debug logging in connector configuration:

```json
{
  "debug": {
    "enabled": true,
    "level": "verbose",
    "logRequests": true,
    "logResponses": true
  }
}
```

## API Reference

### Base URLs

- **Production**: `https://management.azure.com/subscriptions/{subscriptionId}/providers/Microsoft.NetApp/`
- **API Version**: `2025-03-01`

### Authentication

All requests require Bearer token authentication:

```
Authorization: Bearer {access_token}
```

### Rate Limits

- **Standard**: 1000 requests per minute
- **Burst**: 100 additional requests
- **Premium**: 5000 requests per minute (with APIM)

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies
3. Configure local environment
4. Run tests

```bash
git clone https://github.com/your-org/anf-aiops
cd anf-aiops/mcp
npm install
npm test
```

### Adding New Operations

1. Update OpenAPI specification
2. Add JSON schema definitions
3. Update connector configuration
4. Add test cases
5. Update documentation

## Support

### Documentation
- [Azure NetApp Files Documentation](https://docs.microsoft.com/azure/azure-netapp-files/)
- [Microsoft Copilot Connector Guide](https://docs.microsoft.com/copilot/connectors/)
- [Teams Bot Framework](https://docs.microsoft.com/microsoftteams/platform/)

### Contact
- **Author**: Dwiref Sharma <DwirefS@SapientEdge.io>
- **Repository**: [ANF-AIOps GitHub](https://github.com/your-org/anf-aiops)
- **Issues**: [GitHub Issues](https://github.com/your-org/anf-aiops/issues)

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## Changelog

### Version 1.0.0 (2025-07-18)
- Initial release with complete API coverage
- All 19 operation groups implemented
- Microsoft Teams integration
- Comprehensive security and compliance features
- Performance monitoring and analytics
- Complete documentation and examples

---

**Security Notice**: This connector handles sensitive Azure resources. Ensure proper authentication, authorization, and audit logging are configured before production deployment.