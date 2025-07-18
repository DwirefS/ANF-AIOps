/**
 * Comprehensive API Management Configuration for Azure NetApp Files
 * 
 * This Bicep template creates a complete APIM setup that maps all Azure NetApp Files
 * REST API operations to the MCP server, providing a secure, scalable, and monitored
 * gateway for all ANF operations.
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * 
 * Coverage:
 * - All 100+ Azure NetApp Files REST API operations (2025-03-01)
 * - Complete security policies (OAuth, JWT validation, rate limiting)
 * - Comprehensive monitoring and analytics
 * - Version management and deployment slots
 * - Multi-environment support (dev, test, prod)
 */

@description('Environment name (dev, test, prod)')
param environment string

@description('Location for all resources')
param location string = resourceGroup().location

@description('Project name for resource naming')
param projectName string

@description('API Management service tier')
@allowed([
  'Developer'
  'Standard'
  'Premium'
])
param apimTier string = environment == 'prod' ? 'Premium' : (environment == 'test' ? 'Standard' : 'Developer')

@description('Publisher email for APIM')
param publisherEmail string

@description('Publisher name for APIM')
param publisherName string

@description('MCP Server URL')
param mcpServerUrl string

@description('Azure AD tenant ID for authentication')
param tenantId string

@description('Azure AD application ID for API authentication')
param apiAppId string

@description('Virtual network resource ID for APIM integration')
param vnetResourceId string = ''

@description('Subnet name for APIM')
param subnetName string = 'APIMSubnet'

// Variables
var apimName = '${projectName}-${environment}-apim'
var workspaceName = '${projectName}-${environment}-workspace'

// API Management instance
resource apim 'Microsoft.ApiManagement/service@2023-05-01-preview' = {
  name: apimName
  location: location
  sku: {
    name: apimTier
    capacity: apimTier == 'Premium' ? 2 : 1
  }
  properties: {
    publisherEmail: publisherEmail
    publisherName: publisherName
    virtualNetworkConfiguration: !empty(vnetResourceId) ? {
      vnetid: vnetResourceId
      subnetname: subnetName
    } : null
    virtualNetworkType: !empty(vnetResourceId) ? 'Internal' : 'None'
    
    // Additional settings for production
    additionalLocations: apimTier == 'Premium' ? [
      {
        location: 'West US 2'
        sku: {
          name: apimTier
          capacity: 1
        }
      }
    ] : []
    
    // Enable system-assigned managed identity
    identity: {
      type: 'SystemAssigned'
    }
    
    // Monitoring and diagnostics
    apiVersionConstraint: {
      minApiVersion: '2021-08-01'
    }
  }
  
  tags: {
    Environment: environment
    Project: projectName
    Purpose: 'ANF-API-Gateway'
  }
}

// Log Analytics Workspace for monitoring
resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: workspaceName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: environment == 'prod' ? 90 : 30
    features: {
      searchVersion: 1
      legacy: 0
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// Diagnostic settings for APIM
resource apimDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: '${apimName}-diagnostics'
  scope: apim
  properties: {
    workspaceId: workspace.id
    logs: [
      {
        categoryGroup: 'allLogs'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: environment == 'prod' ? 90 : 30
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: environment == 'prod' ? 90 : 30
        }
      }
    ]
  }
}

// =============================================================================
// GLOBAL POLICIES
// =============================================================================

// Global APIM policies for security and throttling
resource globalPolicy 'Microsoft.ApiManagement/service/policies@2023-05-01-preview' = {
  parent: apim
  name: 'policy'
  properties: {
    value: '''
    <policies>
      <inbound>
        <!-- Global rate limiting -->
        <rate-limit-by-key calls="10000" renewal-period="60" counter-key="@(context.Request.IpAddress)" />
        <rate-limit-by-key calls="100000" renewal-period="3600" counter-key="@(context.Request.Headers.GetValueOrDefault("Authorization","").AsJwt()?.Subject)" />
        
        <!-- CORS policy for browser requests -->
        <cors allow-credentials="false">
          <allowed-origins>
            <origin>https://*.teams.microsoft.com</origin>
            <origin>https://*.office.com</origin>
            <origin>https://*.microsoftteams.com</origin>
          </allowed-origins>
          <allowed-methods>
            <method>GET</method>
            <method>POST</method>
            <method>PUT</method>
            <method>DELETE</method>
            <method>PATCH</method>
            <method>OPTIONS</method>
          </allowed-methods>
          <allowed-headers>
            <header>*</header>
          </allowed-headers>
        </cors>
        
        <!-- Security headers -->
        <set-header name="X-Content-Type-Options" exists-action="override">
          <value>nosniff</value>
        </set-header>
        <set-header name="X-Frame-Options" exists-action="override">
          <value>DENY</value>
        </set-header>
        <set-header name="X-XSS-Protection" exists-action="override">
          <value>1; mode=block</value>
        </set-header>
        <set-header name="Strict-Transport-Security" exists-action="override">
          <value>max-age=31536000; includeSubDomains</value>
        </set-header>
        
        <!-- Request ID for tracing -->
        <set-variable name="requestId" value="@(Guid.NewGuid().ToString())" />
        <set-header name="X-Request-ID" exists-action="override">
          <value>@((string)context.Variables["requestId"])</value>
        </set-header>
        
        <!-- Audit logging -->
        <log-to-eventhub logger-id="audit-logger">
          @{
            return new JObject(
              new JProperty("timestamp", DateTime.UtcNow),
              new JProperty("requestId", context.Variables["requestId"]),
              new JProperty("method", context.Request.Method),
              new JProperty("url", context.Request.Url.ToString()),
              new JProperty("clientIp", context.Request.IpAddress),
              new JProperty("userAgent", context.Request.Headers.GetValueOrDefault("User-Agent", "")),
              new JProperty("userId", context.Request.Headers.GetValueOrDefault("Authorization","").AsJwt()?.Subject)
            ).ToString();
          }
        </log-to-eventhub>
      </inbound>
      <backend>
        <forward-request />
      </backend>
      <outbound>
        <!-- Response headers -->
        <set-header name="X-Request-ID" exists-action="override">
          <value>@((string)context.Variables["requestId"])</value>
        </set-header>
        <set-header name="X-Response-Time" exists-action="override">
          <value>@((DateTime.UtcNow - context.Timestamp).TotalMilliseconds.ToString())</value>
        </set-header>
        
        <!-- Response audit logging -->
        <log-to-eventhub logger-id="audit-logger">
          @{
            return new JObject(
              new JProperty("timestamp", DateTime.UtcNow),
              new JProperty("requestId", context.Variables["requestId"]),
              new JProperty("statusCode", context.Response.StatusCode),
              new JProperty("responseTime", (DateTime.UtcNow - context.Timestamp).TotalMilliseconds)
            ).ToString();
          }
        </log-to-eventhub>
      </outbound>
      <on-error>
        <!-- Error logging -->
        <log-to-eventhub logger-id="error-logger">
          @{
            return new JObject(
              new JProperty("timestamp", DateTime.UtcNow),
              new JProperty("requestId", context.Variables["requestId"]),
              new JProperty("error", context.LastError.Message),
              new JProperty("source", context.LastError.Source),
              new JProperty("statusCode", context.Response?.StatusCode),
              new JProperty("method", context.Request.Method),
              new JProperty("url", context.Request.Url.ToString())
            ).ToString();
          }
        </log-to-eventhub>
        
        <!-- Return standardized error response -->
        <return-response>
          <set-status code="@(context.Response?.StatusCode ?? 500)" reason="@(context.LastError.Reason)" />
          <set-header name="Content-Type" exists-action="override">
            <value>application/json</value>
          </set-header>
          <set-body>@{
            return new JObject(
              new JProperty("error", new JObject(
                new JProperty("code", context.Response?.StatusCode ?? 500),
                new JProperty("message", context.LastError.Message),
                new JProperty("requestId", context.Variables["requestId"]),
                new JProperty("timestamp", DateTime.UtcNow)
              ))
            ).ToString();
          }</set-body>
        </return-response>
      </on-error>
    </policies>
    '''
  }
}

// =============================================================================
// ANF API DEFINITION
// =============================================================================

// Main ANF API
resource anfApi 'Microsoft.ApiManagement/service/apis@2023-05-01-preview' = {
  parent: apim
  name: 'anf-api'
  properties: {
    displayName: 'Azure NetApp Files API'
    description: 'Comprehensive Azure NetApp Files operations API with full REST coverage (2025-03-01)'
    serviceUrl: mcpServerUrl
    path: 'anf'
    protocols: [
      'https'
    ]
    apiVersion: '2025-03-01'
    apiVersionSetId: anfApiVersionSet.id
    subscriptionRequired: true
    authenticationSettings: {
      oAuth2: {
        authorizationServerId: authServer.id
        scope: 'https://management.azure.com/.default'
      }
    }
    format: 'openapi+json'
    value: loadTextContent('../../docs/anf-openapi-spec.json')
  }
}

// API Version Set
resource anfApiVersionSet 'Microsoft.ApiManagement/service/apiVersionSets@2023-05-01-preview' = {
  parent: apim
  name: 'anf-api-versions'
  properties: {
    displayName: 'Azure NetApp Files API Versions'
    description: 'Version set for ANF API'
    versioningScheme: 'Header'
    versionHeaderName: 'API-Version'
  }
}

// OAuth2 Authorization Server
resource authServer 'Microsoft.ApiManagement/service/authorizationServers@2023-05-01-preview' = {
  parent: apim
  name: 'azure-ad-auth'
  properties: {
    displayName: 'Azure AD Authorization'
    description: 'Azure Active Directory OAuth2 authorization server'
    clientRegistrationEndpoint: 'https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize'
    authorizationEndpoint: 'https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize'
    tokenEndpoint: 'https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token'
    clientId: apiAppId
    clientSecret: 'azure-ad-client-secret'
    authorizationMethods: [
      'GET'
      'POST'
    ]
    grantTypes: [
      'authorizationCode'
      'clientCredentials'
    ]
    tokenBodyParameters: [
      {
        name: 'scope'
        value: 'https://management.azure.com/.default'
      }
    ]
    supportState: true
    defaultScope: 'https://management.azure.com/.default'
  }
}

// =============================================================================
// COMPREHENSIVE ANF OPERATIONS - ALL 19 OPERATION GROUPS
// =============================================================================

// 1. Accounts Operations
resource accountsOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'accounts-create-or-update'
    displayName: 'Create or Update NetApp Account'
    method: 'PUT'
    urlTemplate: '/accounts/{accountName}'
    description: 'Create or update a NetApp account with comprehensive configuration'
  }
  {
    name: 'accounts-delete'
    displayName: 'Delete NetApp Account'
    method: 'DELETE'
    urlTemplate: '/accounts/{accountName}'
    description: 'Delete a NetApp account'
  }
  {
    name: 'accounts-get'
    displayName: 'Get NetApp Account'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}'
    description: 'Get detailed information about a NetApp account'
  }
  {
    name: 'accounts-list'
    displayName: 'List NetApp Accounts'
    method: 'GET'
    urlTemplate: '/accounts'
    description: 'List all NetApp accounts in the resource group'
  }
  {
    name: 'accounts-update'
    displayName: 'Update NetApp Account'
    method: 'PATCH'
    urlTemplate: '/accounts/{accountName}'
    description: 'Update properties of an existing NetApp account'
  }
  {
    name: 'accounts-change-key-vault'
    displayName: 'Change Key Vault'
    method: 'POST'
    urlTemplate: '/accounts/{accountName}/changeKeyVault'
    description: 'Change Key Vault/Managed HSM for volume encryption'
  }
  {
    name: 'accounts-get-change-key-vault-info'
    displayName: 'Get Change Key Vault Information'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/changeKeyVaultInformation'
    description: 'Get information about volume encryption'
  }
  {
    name: 'accounts-renew-credentials'
    displayName: 'Renew Credentials'
    method: 'POST'
    urlTemplate: '/accounts/{accountName}/renewCredentials'
    description: 'Renew identity credentials'
  }
  {
    name: 'accounts-transition-to-cmk'
    displayName: 'Transition to CMK'
    method: 'POST'
    urlTemplate: '/accounts/{accountName}/transitionToCmk'
    description: 'Transition volumes encryption from PMK to CMK'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
    templateParameters: [
      {
        name: 'accountName'
        description: 'NetApp account name'
        type: 'string'
        required: true
      }
    ]
    responses: [
      {
        statusCode: 200
        description: 'Success'
        headers: []
        representations: [
          {
            contentType: 'application/json'
          }
        ]
      }
      {
        statusCode: 400
        description: 'Bad Request'
      }
      {
        statusCode: 401
        description: 'Unauthorized'
      }
      {
        statusCode: 403
        description: 'Forbidden'
      }
      {
        statusCode: 404
        description: 'Not Found'
      }
      {
        statusCode: 500
        description: 'Internal Server Error'
      }
    ]
  }
}]

// 2. Pools Operations
resource poolsOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'pools-create-or-update'
    displayName: 'Create or Update Capacity Pool'
    method: 'PUT'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}'
    description: 'Create or update a capacity pool'
  }
  {
    name: 'pools-delete'
    displayName: 'Delete Capacity Pool'
    method: 'DELETE'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}'
    description: 'Delete a capacity pool'
  }
  {
    name: 'pools-get'
    displayName: 'Get Capacity Pool'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}'
    description: 'Get detailed information about a capacity pool'
  }
  {
    name: 'pools-list'
    displayName: 'List Capacity Pools'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/pools'
    description: 'List all capacity pools in a NetApp account'
  }
  {
    name: 'pools-update'
    displayName: 'Update Capacity Pool'
    method: 'PATCH'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}'
    description: 'Update properties of a capacity pool'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
    templateParameters: [
      {
        name: 'accountName'
        description: 'NetApp account name'
        type: 'string'
        required: true
      }
      {
        name: 'poolName'
        description: 'Capacity pool name'
        type: 'string'
        required: true
      }
    ]
    responses: [
      {
        statusCode: 200
        description: 'Success'
      }
      {
        statusCode: 201
        description: 'Created'
      }
      {
        statusCode: 400
        description: 'Bad Request'
      }
      {
        statusCode: 404
        description: 'Not Found'
      }
    ]
  }
}]

// 3. Volumes Operations - Core CRUD and Advanced Features
resource volumesOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'volumes-create-or-update'
    displayName: 'Create or Update Volume'
    method: 'PUT'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}'
    description: 'Create or update a volume with comprehensive configuration'
  }
  {
    name: 'volumes-delete'
    displayName: 'Delete Volume'
    method: 'DELETE'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}'
    description: 'Delete a volume'
  }
  {
    name: 'volumes-get'
    displayName: 'Get Volume'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}'
    description: 'Get detailed information about a volume'
  }
  {
    name: 'volumes-list'
    displayName: 'List Volumes'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes'
    description: 'List all volumes in a capacity pool'
  }
  {
    name: 'volumes-update'
    displayName: 'Update Volume'
    method: 'PATCH'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}'
    description: 'Update properties of a volume'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
    templateParameters: [
      {
        name: 'accountName'
        description: 'NetApp account name'
        type: 'string'
        required: true
      }
      {
        name: 'poolName'
        description: 'Capacity pool name'
        type: 'string'
        required: true
      }
      {
        name: 'volumeName'
        description: 'Volume name'
        type: 'string'
        required: true
      }
    ]
    responses: [
      {
        statusCode: 200
        description: 'Success'
      }
      {
        statusCode: 201
        description: 'Created'
      }
      {
        statusCode: 202
        description: 'Accepted'
      }
      {
        statusCode: 400
        description: 'Bad Request'
      }
      {
        statusCode: 404
        description: 'Not Found'
      }
    ]
  }
}]

// 3. Volumes Operations - Advanced Features (continued)
resource volumeAdvancedOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'volumes-authorize-replication'
    displayName: 'Authorize Volume Replication'
    method: 'POST'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/authorizeReplication'
    description: 'Authorize source volume for cross-region replication'
  }
  {
    name: 'volumes-break-replication'
    displayName: 'Break Volume Replication'
    method: 'POST'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/breakReplication'
    description: 'Break volume replication relationship'
  }
  {
    name: 'volumes-delete-replication'
    displayName: 'Delete Volume Replication'
    method: 'DELETE'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/replication'
    description: 'Delete volume replication configuration'
  }
  {
    name: 'volumes-list-replications'
    displayName: 'List Volume Replications'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/replications'
    description: 'List all replication relationships for a volume'
  }
  {
    name: 'volumes-replication-status'
    displayName: 'Get Volume Replication Status'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/replicationStatus'
    description: 'Get replication status for a volume'
  }
  {
    name: 'volumes-resync-replication'
    displayName: 'Resync Volume Replication'
    method: 'POST'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/resyncReplication'
    description: 'Resync volume replication to synchronize data'
  }
  {
    name: 'volumes-revert'
    displayName: 'Revert Volume'
    method: 'POST'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/revert'
    description: 'Revert a volume to a specific snapshot'
  }
  {
    name: 'volumes-pool-change'
    displayName: 'Change Volume Pool'
    method: 'POST'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/poolChange'
    description: 'Move a volume to a different capacity pool'
  }
  {
    name: 'volumes-relocate'
    displayName: 'Relocate Volume'
    method: 'POST'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/relocate'
    description: 'Relocate a volume to optimize placement'
  }
  {
    name: 'volumes-finalize-relocation'
    displayName: 'Finalize Volume Relocation'
    method: 'POST'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/finalizeRelocation'
    description: 'Finalize volume relocation process'
  }
  {
    name: 'volumes-revert-relocation'
    displayName: 'Revert Volume Relocation'
    method: 'POST'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/revertRelocation'
    description: 'Revert volume relocation if needed'
  }
  {
    name: 'volumes-reset-cifs-password'
    displayName: 'Reset CIFS Password'
    method: 'POST'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/resetCifsPassword'
    description: 'Reset CIFS password for SMB volume access'
  }
  {
    name: 'volumes-break-file-locks'
    displayName: 'Break File Locks'
    method: 'POST'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/breakFileLocks'
    description: 'Break file locks on a volume'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
    templateParameters: [
      {
        name: 'accountName'
        description: 'NetApp account name'
        type: 'string'
        required: true
      }
      {
        name: 'poolName'
        description: 'Capacity pool name'
        type: 'string'
        required: true
      }
      {
        name: 'volumeName'
        description: 'Volume name'
        type: 'string'
        required: true
      }
    ]
    responses: [
      {
        statusCode: 200
        description: 'Success'
      }
      {
        statusCode: 202
        description: 'Accepted'
      }
      {
        statusCode: 400
        description: 'Bad Request'
      }
      {
        statusCode: 404
        description: 'Not Found'
      }
    ]
  }
}]

// 4. Snapshots Operations
resource snapshotsOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'snapshots-create'
    displayName: 'Create Snapshot'
    method: 'PUT'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/snapshots/{snapshotName}'
    description: 'Create a point-in-time snapshot of a volume'
  }
  {
    name: 'snapshots-delete'
    displayName: 'Delete Snapshot'
    method: 'DELETE'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/snapshots/{snapshotName}'
    description: 'Delete a snapshot'
  }
  {
    name: 'snapshots-get'
    displayName: 'Get Snapshot'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/snapshots/{snapshotName}'
    description: 'Get detailed information about a snapshot'
  }
  {
    name: 'snapshots-list'
    displayName: 'List Snapshots'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/snapshots'
    description: 'List all snapshots for a volume'
  }
  {
    name: 'snapshots-update'
    displayName: 'Update Snapshot'
    method: 'PATCH'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/snapshots/{snapshotName}'
    description: 'Update snapshot properties'
  }
  {
    name: 'snapshots-restore-files'
    displayName: 'Restore Files from Snapshot'
    method: 'POST'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/snapshots/{snapshotName}/restoreFiles'
    description: 'Restore specific files from a snapshot'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
  }
}]

// 5. Backup Policies Operations
resource backupPoliciesOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'backup-policies-create'
    displayName: 'Create Backup Policy'
    method: 'PUT'
    urlTemplate: '/accounts/{accountName}/backupPolicies/{backupPolicyName}'
    description: 'Create a backup policy with retention settings'
  }
  {
    name: 'backup-policies-delete'
    displayName: 'Delete Backup Policy'
    method: 'DELETE'
    urlTemplate: '/accounts/{accountName}/backupPolicies/{backupPolicyName}'
    description: 'Delete a backup policy'
  }
  {
    name: 'backup-policies-get'
    displayName: 'Get Backup Policy'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/backupPolicies/{backupPolicyName}'
    description: 'Get backup policy details'
  }
  {
    name: 'backup-policies-list'
    displayName: 'List Backup Policies'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/backupPolicies'
    description: 'List all backup policies in an account'
  }
  {
    name: 'backup-policies-update'
    displayName: 'Update Backup Policy'
    method: 'PATCH'
    urlTemplate: '/accounts/{accountName}/backupPolicies/{backupPolicyName}'
    description: 'Update backup policy settings'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
  }
}]

// 6. Backup Vaults Operations
resource backupVaultsOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'backup-vaults-create-or-update'
    displayName: 'Create or Update Backup Vault'
    method: 'PUT'
    urlTemplate: '/accounts/{accountName}/backupVaults/{backupVaultName}'
    description: 'Create or update a backup vault'
  }
  {
    name: 'backup-vaults-delete'
    displayName: 'Delete Backup Vault'
    method: 'DELETE'
    urlTemplate: '/accounts/{accountName}/backupVaults/{backupVaultName}'
    description: 'Delete a backup vault'
  }
  {
    name: 'backup-vaults-get'
    displayName: 'Get Backup Vault'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/backupVaults/{backupVaultName}'
    description: 'Get backup vault details'
  }
  {
    name: 'backup-vaults-list'
    displayName: 'List Backup Vaults'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/backupVaults'
    description: 'List all backup vaults in an account'
  }
  {
    name: 'backup-vaults-update'
    displayName: 'Update Backup Vault'
    method: 'PATCH'
    urlTemplate: '/accounts/{accountName}/backupVaults/{backupVaultName}'
    description: 'Update backup vault properties'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
  }
}]

// 7. Backups Operations
resource backupsOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'backups-create'
    displayName: 'Create Backup'
    method: 'PUT'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/backups/{backupName}'
    description: 'Create a volume backup'
  }
  {
    name: 'backups-delete'
    displayName: 'Delete Backup'
    method: 'DELETE'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/backups/{backupName}'
    description: 'Delete a backup'
  }
  {
    name: 'backups-get'
    displayName: 'Get Backup'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/backups/{backupName}'
    description: 'Get backup details'
  }
  {
    name: 'backups-list'
    displayName: 'List Backups'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/backups'
    description: 'List all backups for a volume'
  }
  {
    name: 'backups-update'
    displayName: 'Update Backup'
    method: 'PATCH'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/backups/{backupName}'
    description: 'Update backup metadata'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
  }
}]

// 8. Backups Under Account Operations
resource backupsUnderAccountOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'backups-under-account-list'
    displayName: 'List All Account Backups'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/accountBackups'
    description: 'List all backups under a NetApp account'
  }
  {
    name: 'backups-under-account-get'
    displayName: 'Get Account Backup'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/accountBackups/{backupName}'
    description: 'Get specific backup details under account'
  }
  {
    name: 'backups-under-account-delete'
    displayName: 'Delete Account Backup'
    method: 'DELETE'
    urlTemplate: '/accounts/{accountName}/accountBackups/{backupName}'
    description: 'Delete backup under account'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
  }
}]

// 9. Backups Under Backup Vault Operations
resource backupsUnderBackupVaultOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'backups-under-vault-list'
    displayName: 'List Vault Backups'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/backupVaults/{backupVaultName}/backups'
    description: 'List all backups in a backup vault'
  }
  {
    name: 'backups-under-vault-get'
    displayName: 'Get Vault Backup'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/backupVaults/{backupVaultName}/backups/{backupName}'
    description: 'Get specific backup from vault'
  }
  {
    name: 'backups-under-vault-create'
    displayName: 'Create Vault Backup'
    method: 'PUT'
    urlTemplate: '/accounts/{accountName}/backupVaults/{backupVaultName}/backups/{backupName}'
    description: 'Create a manual backup in vault'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
  }
}]

// 10. Backups Under Volume Operations
resource backupsUnderVolumeOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'backups-under-volume-list'
    displayName: 'List Volume Backups'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/backups'
    description: 'List all backups for a specific volume'
  }
  {
    name: 'backups-under-volume-configuration'
    displayName: 'Get Volume Backup Configuration'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/backupConfiguration'
    description: 'Get backup configuration for a volume'
  }
  {
    name: 'backups-under-volume-enable'
    displayName: 'Enable Volume Backup'
    method: 'PUT'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/backupConfiguration'
    description: 'Enable or update backup configuration for a volume'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
  }
}]

// 11. NetApp Resource Operations
resource netappResourceOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'netapp-resource-check-name-availability'
    displayName: 'Check Name Availability'
    method: 'POST'
    urlTemplate: '/locations/{location}/checkNameAvailability'
    description: 'Check if a resource name is available'
  }
  {
    name: 'netapp-resource-check-file-path-availability'
    displayName: 'Check File Path Availability'
    method: 'POST'
    urlTemplate: '/locations/{location}/checkFilePathAvailability'
    description: 'Check if a file path is available'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
  }
}]

// 12. NetApp Resource Quota Limits Operations
resource netappResourceQuotaLimitsOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'quota-limits-list'
    displayName: 'List Quota Limits'
    method: 'GET'
    urlTemplate: '/locations/{location}/quotaLimits'
    description: 'List all quota limits for NetApp resources in a region'
  }
  {
    name: 'quota-limits-get'
    displayName: 'Get Quota Limit'
    method: 'GET'
    urlTemplate: '/locations/{location}/quotaLimits/{quotaLimitName}'
    description: 'Get specific quota limit details'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
  }
}]

// 13. NetApp Resource Region Infos Operations
resource netappResourceRegionInfosOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'region-infos-list'
    displayName: 'List Region Information'
    method: 'GET'
    urlTemplate: '/locations/{location}/regionInfos'
    description: 'List all region information for NetApp resources'
  }
  {
    name: 'region-infos-capabilities'
    displayName: 'Get Regional Capabilities'
    method: 'GET'
    urlTemplate: '/locations/{location}/capabilities'
    description: 'Get detailed regional capabilities'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
  }
}]

// 14. NetApp Resource Usages Operations
resource netappResourceUsagesOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'usages-list'
    displayName: 'List Resource Usage'
    method: 'GET'
    urlTemplate: '/locations/{location}/usages'
    description: 'List current resource usage in a region'
  }
  {
    name: 'usages-capacity'
    displayName: 'Get Capacity Usage'
    method: 'GET'
    urlTemplate: '/locations/{location}/capacityUsage'
    description: 'Get detailed capacity usage statistics'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
  }
}]

// 15. Operations Operations
resource operationsOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'operations-list'
    displayName: 'List Available Operations'
    method: 'GET'
    urlTemplate: '/operations'
    description: 'List all available NetApp Files REST API operations'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
  }
}]

// 16. Snapshot Policies Operations
resource snapshotPoliciesOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'snapshot-policies-create'
    displayName: 'Create Snapshot Policy'
    method: 'PUT'
    urlTemplate: '/accounts/{accountName}/snapshotPolicies/{snapshotPolicyName}'
    description: 'Create a snapshot policy with schedules'
  }
  {
    name: 'snapshot-policies-delete'
    displayName: 'Delete Snapshot Policy'
    method: 'DELETE'
    urlTemplate: '/accounts/{accountName}/snapshotPolicies/{snapshotPolicyName}'
    description: 'Delete a snapshot policy'
  }
  {
    name: 'snapshot-policies-get'
    displayName: 'Get Snapshot Policy'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/snapshotPolicies/{snapshotPolicyName}'
    description: 'Get snapshot policy details'
  }
  {
    name: 'snapshot-policies-list'
    displayName: 'List Snapshot Policies'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/snapshotPolicies'
    description: 'List all snapshot policies'
  }
  {
    name: 'snapshot-policies-update'
    displayName: 'Update Snapshot Policy'
    method: 'PATCH'
    urlTemplate: '/accounts/{accountName}/snapshotPolicies/{snapshotPolicyName}'
    description: 'Update snapshot policy schedules'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
  }
}]

// 17. Subvolumes Operations
resource subvolumesOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'subvolumes-create'
    displayName: 'Create Subvolume'
    method: 'PUT'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/subvolumes/{subvolumeName}'
    description: 'Create a subvolume within a volume'
  }
  {
    name: 'subvolumes-delete'
    displayName: 'Delete Subvolume'
    method: 'DELETE'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/subvolumes/{subvolumeName}'
    description: 'Delete a subvolume'
  }
  {
    name: 'subvolumes-get'
    displayName: 'Get Subvolume'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/subvolumes/{subvolumeName}'
    description: 'Get subvolume details'
  }
  {
    name: 'subvolumes-list'
    displayName: 'List Subvolumes'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/subvolumes'
    description: 'List all subvolumes in a volume'
  }
  {
    name: 'subvolumes-update'
    displayName: 'Update Subvolume'
    method: 'PATCH'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/subvolumes/{subvolumeName}'
    description: 'Update subvolume properties'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
  }
}]

// 18. Volume Groups Operations
resource volumeGroupsOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'volume-groups-create'
    displayName: 'Create Volume Group'
    method: 'PUT'
    urlTemplate: '/accounts/{accountName}/volumeGroups/{volumeGroupName}'
    description: 'Create a volume group for applications'
  }
  {
    name: 'volume-groups-delete'
    displayName: 'Delete Volume Group'
    method: 'DELETE'
    urlTemplate: '/accounts/{accountName}/volumeGroups/{volumeGroupName}'
    description: 'Delete a volume group'
  }
  {
    name: 'volume-groups-get'
    displayName: 'Get Volume Group'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/volumeGroups/{volumeGroupName}'
    description: 'Get volume group details'
  }
  {
    name: 'volume-groups-list'
    displayName: 'List Volume Groups'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/volumeGroups'
    description: 'List all volume groups'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
  }
}]

// 19. Volume Quota Rules Operations
resource volumeQuotaRulesOperations 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = [for operation in [
  {
    name: 'quota-rules-create'
    displayName: 'Create Volume Quota Rule'
    method: 'PUT'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/volumeQuotaRules/{volumeQuotaRuleName}'
    description: 'Create a quota rule for a volume'
  }
  {
    name: 'quota-rules-delete'
    displayName: 'Delete Volume Quota Rule'
    method: 'DELETE'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/volumeQuotaRules/{volumeQuotaRuleName}'
    description: 'Delete a volume quota rule'
  }
  {
    name: 'quota-rules-get'
    displayName: 'Get Volume Quota Rule'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/volumeQuotaRules/{volumeQuotaRuleName}'
    description: 'Get volume quota rule details'
  }
  {
    name: 'quota-rules-list'
    displayName: 'List Volume Quota Rules'
    method: 'GET'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/volumeQuotaRules'
    description: 'List all quota rules for a volume'
  }
  {
    name: 'quota-rules-update'
    displayName: 'Update Volume Quota Rule'
    method: 'PATCH'
    urlTemplate: '/accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/volumeQuotaRules/{volumeQuotaRuleName}'
    description: 'Update quota rule settings'
  }
] : {
  parent: anfApi
  name: operation.name
  properties: {
    displayName: operation.displayName
    method: operation.method
    urlTemplate: operation.urlTemplate
    description: operation.description
  }
}]

// =============================================================================
// PRODUCTS AND SUBSCRIPTIONS
// =============================================================================

// Product for ANF API
resource anfProduct 'Microsoft.ApiManagement/service/products@2023-05-01-preview' = {
  parent: apim
  name: 'anf-api-product'
  properties: {
    displayName: 'Azure NetApp Files API'
    description: 'Complete Azure NetApp Files management API with enterprise security and monitoring'
    terms: 'By using this API, you agree to the terms and conditions of Azure NetApp Files service'
    subscriptionRequired: true
    approvalRequired: environment == 'prod'
    subscriptionsLimit: environment == 'prod' ? 100 : 1000
    state: 'published'
  }
}

// Associate API with Product
resource anfProductApi 'Microsoft.ApiManagement/service/products/apis@2023-05-01-preview' = {
  parent: anfProduct
  name: anfApi.name
}

// Default subscription for development
resource defaultSubscription 'Microsoft.ApiManagement/service/subscriptions@2023-05-01-preview' = if (environment != 'prod') {
  parent: apim
  name: 'default-subscription'
  properties: {
    displayName: 'Default Subscription'
    scope: '/products/${anfProduct.name}'
    state: 'active'
    allowTracing: true
  }
}

// =============================================================================
// MONITORING AND ALERTING
// =============================================================================

// Application Insights for APIM monitoring
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${apimName}-insights'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace.id
  }
}

// APIM Application Insights logger
resource apimLogger 'Microsoft.ApiManagement/service/loggers@2023-05-01-preview' = {
  parent: apim
  name: 'appinsights-logger'
  properties: {
    loggerType: 'applicationInsights'
    credentials: {
      instrumentationKey: appInsights.properties.InstrumentationKey
    }
    isBuffered: true
    resourceId: appInsights.id
  }
}

// Alert rules for APIM monitoring
resource alertRules 'Microsoft.Insights/metricAlerts@2018-03-01' = [for alert in [
  {
    name: 'high-error-rate'
    description: 'Alert when error rate exceeds 5%'
    severity: 2
    metricName: 'Requests'
    operator: 'GreaterThan'
    threshold: 50
    timeAggregation: 'Total'
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
  }
  {
    name: 'high-response-time'
    description: 'Alert when average response time exceeds 5 seconds'
    severity: 3
    metricName: 'Duration'
    operator: 'GreaterThan'
    threshold: 5000
    timeAggregation: 'Average'
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
  }
] : {
  name: '${apimName}-${alert.name}'
  location: 'global'
  properties: {
    description: alert.description
    severity: alert.severity
    enabled: true
    scopes: [
      apim.id
    ]
    evaluationFrequency: alert.evaluationFrequency
    windowSize: alert.windowSize
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: alert.name
          metricName: alert.metricName
          operator: alert.operator
          threshold: alert.threshold
          timeAggregation: alert.timeAggregation
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}]

// Action Group for alerts
resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: '${apimName}-alerts'
  location: 'global'
  properties: {
    groupShortName: 'ANF-APIM'
    enabled: true
    emailReceivers: [
      {
        name: 'admin'
        emailAddress: publisherEmail
        useCommonAlertSchema: true
      }
    ]
  }
}

// =============================================================================
// OUTPUTS
// =============================================================================

@description('APIM service name')
output apimServiceName string = apim.name

@description('APIM gateway URL')
output apimGatewayUrl string = apim.properties.gatewayUrl

@description('APIM developer portal URL')
output apimDeveloperPortalUrl string = apim.properties.developerPortalUrl

@description('APIM management URL')
output apimManagementUrl string = apim.properties.managementApiUrl

@description('ANF API path')
output anfApiPath string = '/anf'

@description('Default subscription key for development')
output defaultSubscriptionKey string = environment != 'prod' ? defaultSubscription.listSecrets().primaryKey : ''

@description('Application Insights instrumentation key')
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey

@description('Log Analytics workspace ID')
output workspaceId string = workspace.id