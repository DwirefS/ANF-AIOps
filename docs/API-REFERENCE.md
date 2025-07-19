# ANF-AIOps API Reference

**Author:** Dwiref Sharma <DwirefS@SapientEdge.io>  
**Version:** 2.0.0  
**API Version:** 2025-03-01  
**Last Updated:** 2025-07-18

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URLs and Endpoints](#base-urls-and-endpoints)
4. [Request/Response Format](#requestresponse-format)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [API Operations](#api-operations)
8. [MCP Server Tools](#mcp-server-tools)
9. [Code Examples](#code-examples)
10. [SDKs and Libraries](#sdks-and-libraries)

## Overview

The ANF-AIOps API provides comprehensive access to Azure NetApp Files operations through multiple interfaces:

- **Azure REST API**: Direct access to Azure NetApp Files service
- **MCP Server**: Model Context Protocol server for AI integration
- **Azure Functions**: Serverless functions with business logic
- **Microsoft Teams Bot**: Conversational interface

### API Coverage

The API covers all 19 Azure NetApp Files operation groups:

1. **Accounts** - NetApp account management
2. **Pools** - Capacity pool operations
3. **Volumes** - Volume lifecycle management
4. **Snapshots** - Snapshot operations
5. **Backup Policies** - Backup policy configuration
6. **Backup Vaults** - Backup vault management
7. **Backups** - Backup operations
8. **Snapshot Policies** - Snapshot policy management
9. **Subvolumes** - Subvolume operations
10. **Volume Groups** - Application volume groups
11. **Volume Quota Rules** - Quota management
12. **Account Backups** - Account-level backup operations
13. **Resource Region Info** - Regional capability information
14. **Network Sibling Sets** - Network sibling management
15. **Query Network Sibling Sets** - Network sibling queries
16. **Volume Relocation** - Volume relocation operations
17. **Operation Results** - Long-running operation status
18. **Operations** - Available operations enumeration
19. **Check Availability** - Resource name availability checking

## Authentication

### Azure Authentication

All Azure NetApp Files operations require Azure authentication:

```http
Authorization: Bearer {access_token}
```

#### Service Principal Authentication

```bash
# Obtain access token
curl -X POST https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id={client_id}" \
  -d "client_secret={client_secret}" \
  -d "scope=https://management.azure.com/.default"
```

#### Managed Identity Authentication

```javascript
// Azure Functions with Managed Identity
const { DefaultAzureCredential } = require('@azure/identity');
const credential = new DefaultAzureCredential();
const accessToken = await credential.getToken('https://management.azure.com/.default');
```

### MCP Server Authentication

MCP server tools require API key authentication:

```http
X-API-Key: {your_api_key}
Content-Type: application/json
```

### Teams Bot Authentication

Teams integration uses OAuth 2.0 flow:

```
@ANF-AIOps login
```

## Base URLs and Endpoints

### Azure REST API

```
Base URL: https://management.azure.com
API Version: 2025-03-01
```

### MCP Server

```
Base URL: https://your-mcp-server.domain.com
Port: 3000 (default)
Protocol: HTTP/HTTPS
```

### Azure Functions

```
Base URL: https://your-function-app.azurewebsites.net
Function Key: Required for HTTP triggered functions
```

## Request/Response Format

### Content Types

- **Request**: `application/json`
- **Response**: `application/json`
- **Error**: `application/json`

### Common Headers

```http
Content-Type: application/json
Authorization: Bearer {access_token}
User-Agent: ANF-AIOps/2.0.0
Accept: application/json
```

### Response Structure

#### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "metadata": {
    "timestamp": "2025-07-18T10:30:00Z",
    "requestId": "uuid-request-id",
    "apiVersion": "2025-03-01"
  }
}
```

#### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ResourceNotFound",
    "message": "The specified resource was not found",
    "details": "Account 'test-account' not found in resource group 'test-rg'",
    "target": "accountName"
  },
  "metadata": {
    "timestamp": "2025-07-18T10:30:00Z",
    "requestId": "uuid-request-id",
    "correlationId": "uuid-correlation-id"
  }
}
```

## Error Handling

### HTTP Status Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 202 | Accepted | Long-running operation started |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Invalid or missing authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource already exists or conflict |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

### Error Codes

#### Azure NetApp Files Specific Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `ANF_AccountNotFound` | NetApp account not found | Verify account name and resource group |
| `ANF_InsufficientCapacity` | Insufficient capacity in pool | Increase pool size or use different pool |
| `ANF_InvalidSubnet` | Invalid or non-delegated subnet | Ensure subnet is delegated to Microsoft.NetApp/volumes |
| `ANF_VolumeInUse` | Volume is currently in use | Stop applications using the volume |
| `ANF_SnapshotInProgress` | Snapshot operation in progress | Wait for current operation to complete |

## Rate Limiting

### Limits

- **Azure REST API**: 1200 requests per hour per subscription
- **MCP Server**: 1000 requests per minute per API key
- **Azure Functions**: Based on consumption plan limits

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1642684800
Retry-After: 60
```

### Rate Limit Handling

```javascript
async function makeAPICall(endpoint, options) {
  try {
    const response = await fetch(endpoint, options);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      await sleep(retryAfter * 1000);
      return makeAPICall(endpoint, options); // Retry
    }
    
    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

## API Operations

### Accounts Operations

#### List Accounts

```http
GET /subscriptions/{subscriptionId}/providers/Microsoft.NetApp/netAppAccounts
```

**Parameters:**
- `subscriptionId` (path): Azure subscription ID

**Response:**
```json
{
  "value": [
    {
      "id": "/subscriptions/.../netAppAccounts/account1",
      "name": "account1",
      "type": "Microsoft.NetApp/netAppAccounts",
      "location": "eastus",
      "properties": {
        "activeDirectories": [],
        "encryption": {
          "keySource": "Microsoft.NetApp"
        }
      }
    }
  ]
}
```

#### Create Account

```http
PUT /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}
```

**Request Body:**
```json
{
  "location": "eastus",
  "properties": {
    "encryption": {
      "keySource": "Microsoft.NetApp",
      "identity": {
        "principalId": "string",
        "type": "SystemAssigned"
      }
    }
  },
  "tags": {
    "environment": "production"
  }
}
```

### Pools Operations

#### Create Capacity Pool

```http
PUT /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}
```

**Request Body:**
```json
{
  "location": "eastus",
  "properties": {
    "serviceLevel": "Premium",
    "size": 4398046511104,
    "qosType": "Auto",
    "coolAccess": false,
    "encryptionType": "Single"
  }
}
```

### Volumes Operations

#### Create Volume

```http
PUT /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}
```

**Request Body:**
```json
{
  "location": "eastus",
  "properties": {
    "serviceLevel": "Premium",
    "usageThreshold": 1099511627776,
    "protocolTypes": ["NFSv4.1"],
    "subnetId": "/subscriptions/.../subnets/anf-subnet",
    "exportPolicy": {
      "rules": [
        {
          "ruleIndex": 1,
          "unixReadOnly": false,
          "unixReadWrite": true,
          "allowedClients": "0.0.0.0/0",
          "nfsv3": false,
          "nfsv41": true
        }
      ]
    },
    "snapshotPolicy": {
      "enabled": true,
      "hourlySchedule": {
        "snapshotsToKeep": 24,
        "minute": 0
      }
    }
  }
}
```

### Snapshots Operations

#### Create Snapshot

```http
PUT /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.NetApp/netAppAccounts/{accountName}/capacityPools/{poolName}/volumes/{volumeName}/snapshots/{snapshotName}
```

**Request Body:**
```json
{
  "location": "eastus",
  "properties": {
    "description": "Manual snapshot created via API"
  }
}
```

## MCP Server Tools

### Tool Schema

All MCP tools follow this schema pattern:

```typescript
interface MCPTool {
  name: string;
  description: string;
  inputSchema: ZodSchema;
}
```

### Account Tools

#### anf_accounts_list

```typescript
{
  name: 'anf_accounts_list',
  description: 'List all NetApp accounts in a subscription or resource group',
  inputSchema: z.object({
    subscriptionId: z.string().describe('Azure subscription ID'),
    resourceGroupName: z.string().optional().describe('Filter by resource group')
  })
}
```

#### anf_accounts_create_or_update

```typescript
{
  name: 'anf_accounts_create_or_update',
  description: 'Create or update a NetApp account',
  inputSchema: z.object({
    subscriptionId: z.string(),
    resourceGroupName: z.string(),
    accountName: z.string(),
    location: z.string(),
    properties: z.object({
      encryption: z.object({
        keySource: z.enum(['Microsoft.NetApp', 'Microsoft.KeyVault'])
      }).optional()
    }).optional(),
    tags: z.record(z.string()).optional()
  })
}
```

### Volume Tools

#### anf_volumes_create_or_update

```typescript
{
  name: 'anf_volumes_create_or_update',
  description: 'Create or update a volume with comprehensive configuration',
  inputSchema: z.object({
    subscriptionId: z.string(),
    resourceGroupName: z.string(),
    accountName: z.string(),
    poolName: z.string(),
    volumeName: z.string(),
    body: z.object({
      location: z.string(),
      properties: z.object({
        serviceLevel: z.enum(['Standard', 'Premium', 'Ultra']),
        usageThreshold: z.number().min(107374182400).max(109951162777600),
        protocolTypes: z.array(z.enum(['NFSv3', 'NFSv4.1', 'CIFS'])),
        subnetId: z.string(),
        exportPolicy: z.object({
          rules: z.array(z.object({
            ruleIndex: z.number(),
            unixReadOnly: z.boolean().optional(),
            unixReadWrite: z.boolean().optional(),
            allowedClients: z.string(),
            nfsv3: z.boolean().optional(),
            nfsv41: z.boolean().optional()
          }))
        }).optional()
      })
    })
  })
}
```

## Code Examples

### JavaScript/Node.js

#### Using Azure SDK

```javascript
const { NetAppManagementClient } = require('@azure/arm-netapp');
const { DefaultAzureCredential } = require('@azure/identity');

const credential = new DefaultAzureCredential();
const client = new NetAppManagementClient(credential, subscriptionId);

// List accounts
async function listAccounts() {
  try {
    const accounts = [];
    for await (const account of client.accounts.list()) {
      accounts.push(account);
    }
    return accounts;
  } catch (error) {
    console.error('Error listing accounts:', error);
    throw error;
  }
}

// Create volume
async function createVolume(resourceGroupName, accountName, poolName, volumeName, volumeConfig) {
  try {
    const operation = await client.volumes.beginCreateOrUpdate(
      resourceGroupName,
      accountName,
      poolName,
      volumeName,
      volumeConfig
    );
    
    const result = await operation.pollUntilDone();
    return result;
  } catch (error) {
    console.error('Error creating volume:', error);
    throw error;
  }
}
```

#### Using MCP Server

```javascript
const { MCPClient } = require('@modelcontextprotocol/client');

const client = new MCPClient({
  baseURL: 'https://your-mcp-server.domain.com',
  apiKey: 'your-api-key'
});

// List accounts using MCP tool
async function listAccountsMCP() {
  try {
    const result = await client.callTool('anf_accounts_list', {
      subscriptionId: 'your-subscription-id'
    });
    
    return result.data;
  } catch (error) {
    console.error('MCP tool call failed:', error);
    throw error;
  }
}

// Create volume using MCP tool
async function createVolumeMCP(volumeSpec) {
  try {
    const result = await client.callTool('anf_volumes_create_or_update', volumeSpec);
    return result.data;
  } catch (error) {
    console.error('Volume creation failed:', error);
    throw error;
  }
}
```

### PowerShell

```powershell
# Connect to Azure
Connect-AzAccount

# List NetApp accounts
Get-AzNetAppFilesAccount

# Create new account
$accountParams = @{
    ResourceGroupName = 'myResourceGroup'
    Name = 'myNetAppAccount'
    Location = 'East US'
}
New-AzNetAppFilesAccount @accountParams

# Create capacity pool
$poolParams = @{
    ResourceGroupName = 'myResourceGroup'
    AccountName = 'myNetAppAccount'
    Name = 'myCapacityPool'
    Location = 'East US'
    ServiceLevel = 'Premium'
    PoolSize = 4TB
}
New-AzNetAppFilesPool @poolParams

# Create volume
$volumeParams = @{
    ResourceGroupName = 'myResourceGroup'
    AccountName = 'myNetAppAccount'
    PoolName = 'myCapacityPool'
    Name = 'myVolume'
    Location = 'East US'
    UsageThreshold = 1TB
    ServiceLevel = 'Premium'
    ProtocolType = 'NFSv4.1'
    SubnetId = '/subscriptions/.../subnets/mySubnet'
}
New-AzNetAppFilesVolume @volumeParams
```

### Python

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.netapp import NetAppManagementClient
from azure.mgmt.netapp.models import NetAppAccount, CapacityPool, Volume

# Initialize client
credential = DefaultAzureCredential()
client = NetAppManagementClient(credential, subscription_id)

# List accounts
def list_accounts():
    try:
        accounts = list(client.accounts.list())
        return accounts
    except Exception as e:
        print(f"Error listing accounts: {e}")
        raise

# Create account
def create_account(resource_group_name, account_name, location):
    account_body = NetAppAccount(
        location=location,
        encryption={'key_source': 'Microsoft.NetApp'}
    )
    
    try:
        operation = client.accounts.begin_create_or_update(
            resource_group_name,
            account_name,
            account_body
        )
        result = operation.result()
        return result
    except Exception as e:
        print(f"Error creating account: {e}")
        raise

# Create volume with advanced configuration
def create_volume_advanced(resource_group_name, account_name, pool_name, volume_name, config):
    volume_body = Volume(
        location=config['location'],
        usage_threshold=config['size'],
        service_level=config['service_level'],
        protocol_types=config['protocols'],
        subnet_id=config['subnet_id'],
        export_policy=config.get('export_policy'),
        snapshot_policy=config.get('snapshot_policy')
    )
    
    try:
        operation = client.volumes.begin_create_or_update(
            resource_group_name,
            account_name,
            pool_name,
            volume_name,
            volume_body
        )
        result = operation.result()
        return result
    except Exception as e:
        print(f"Error creating volume: {e}")
        raise
```

### C#

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.NetApp;
using Azure.ResourceManager.NetApp.Models;

// Initialize client
var credential = new DefaultAzureCredential();
var armClient = new ArmClient(credential);
var subscription = armClient.GetSubscriptionResource(subscriptionId);

// Create NetApp account
public async Task<NetAppAccountResource> CreateAccountAsync(
    string resourceGroupName, 
    string accountName, 
    string location)
{
    var resourceGroup = subscription.GetResourceGroup(resourceGroupName);
    var accountCollection = resourceGroup.GetNetAppAccounts();
    
    var accountData = new NetAppAccountData(location)
    {
        Encryption = new NetAppAccountEncryption
        {
            KeySource = NetAppKeySource.MicrosoftNetApp
        }
    };
    
    var operation = await accountCollection.CreateOrUpdateAsync(
        WaitUntil.Completed, 
        accountName, 
        accountData);
        
    return operation.Value;
}

// Create volume with full configuration
public async Task<NetAppVolumeResource> CreateVolumeAsync(
    string resourceGroupName,
    string accountName,
    string poolName,
    string volumeName,
    VolumeConfiguration config)
{
    var account = subscription
        .GetResourceGroup(resourceGroupName)
        .GetNetAppAccount(accountName);
        
    var pool = account.GetCapacityPool(poolName);
    var volumeCollection = pool.GetNetAppVolumes();
    
    var volumeData = new NetAppVolumeData(config.Location)
    {
        UsageThreshold = config.SizeInBytes,
        ServiceLevel = config.ServiceLevel,
        ProtocolTypes = { config.ProtocolTypes },
        SubnetId = config.SubnetId,
        ExportPolicy = new NetAppVolumeExportPolicy
        {
            Rules = 
            {
                new NetAppVolumeExportPolicyRule(1)
                {
                    AllowedClients = "0.0.0.0/0",
                    IsUnixReadOnly = false,
                    IsUnixReadWrite = true,
                    IsNfsV3Enabled = false,
                    IsNfsV41Enabled = true
                }
            }
        }
    };
    
    var operation = await volumeCollection.CreateOrUpdateAsync(
        WaitUntil.Completed, 
        volumeName, 
        volumeData);
        
    return operation.Value;
}
```

## SDKs and Libraries

### Official Azure SDKs

| Language | Package | Version | Documentation |
|----------|---------|---------|---------------|
| JavaScript | `@azure/arm-netapp` | 20.1.0+ | [Azure SDK for JS](https://docs.microsoft.com/javascript/api/@azure/arm-netapp/) |
| Python | `azure-mgmt-netapp` | 10.1.0+ | [Azure SDK for Python](https://docs.microsoft.com/python/api/azure-mgmt-netapp/) |
| .NET | `Azure.ResourceManager.NetApp` | 1.5.0+ | [Azure SDK for .NET](https://docs.microsoft.com/dotnet/api/azure.resourcemanager.netapp/) |
| Java | `azure-resourcemanager-netapp` | 1.2.0+ | [Azure SDK for Java](https://docs.microsoft.com/java/api/com.azure.resourcemanager.netapp/) |
| Go | `github.com/Azure/azure-sdk-for-go` | 68.0.0+ | [Azure SDK for Go](https://pkg.go.dev/github.com/Azure/azure-sdk-for-go/) |

### ANF-AIOps Specific Libraries

```bash
# Node.js MCP Client
npm install @anf-aiops/mcp-client

# Python MCP Client  
pip install anf-aiops-mcp-client

# PowerShell Module
Install-Module -Name ANF-AIOps

# CLI Tool
npm install -g @anf-aiops/cli
```

### REST API Clients

#### OpenAPI/Swagger

OpenAPI specifications available at:
- `mcp/openapi/anf-operations.yaml` - Complete ANF operations
- `mcp/openapi/mcp-server.yaml` - MCP server endpoints
- `mcp/openapi/teams-bot.yaml` - Teams bot integration

#### Postman Collection

Import the comprehensive API collection:
```
File: mcp/postman-collection.json
Environment: mcp/postman-environment.json
```

---

**Document Version**: 2.0.0  
**API Version**: 2025-03-01  
**Last Review**: 2025-07-18  
**Next Review**: 2025-10-18  
**Feedback**: DwirefS@SapientEdge.io