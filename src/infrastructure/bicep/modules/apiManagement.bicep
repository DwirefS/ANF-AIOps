// API Management Module
// Author: Dwiref Sharma <DwirefS@SapientEdge.io>

param apimName string
param location string
param environment string
param publisherEmail string
param publisherName string
param subnetId string
param mcpServerUrl string

resource apiManagement 'Microsoft.ApiManagement/service@2023-03-01-preview' = {
  name: apimName
  location: location
  tags: {
    Environment: environment
    Component: 'API-Management'
    ManagedBy: 'ANF-AIops'
  }
  sku: {
    name: environment == 'prod' ? 'Premium' : 'Developer'
    capacity: environment == 'prod' ? 2 : 1
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    publisherEmail: publisherEmail
    publisherName: publisherName
    virtualNetworkType: 'External'
    virtualNetworkConfiguration: {
      subnetResourceId: subnetId
    }
    customProperties: {
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Tls10': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Tls11': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Tls10': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Tls11': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Ssl30': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Protocols.Server.Http2': 'true'
    }
  }
}

// ANF AI-Ops API
resource anfApi 'Microsoft.ApiManagement/service/apis@2023-03-01-preview' = {
  parent: apiManagement
  name: 'anf-aiops-api'
  properties: {
    displayName: 'ANF AI-Ops API'
    description: 'Azure NetApp Files AI-Ops management API'
    subscriptionRequired: true
    apiType: 'http'
    path: 'anf'
    protocols: [
      'https'
    ]
    serviceUrl: mcpServerUrl
    apiRevision: '1'
    apiVersion: 'v1'
    isCurrent: true
  }
}

// API Operations
resource listVolumesOperation 'Microsoft.ApiManagement/service/apis/operations@2023-03-01-preview' = {
  parent: anfApi
  name: 'list-volumes'
  properties: {
    displayName: 'List Volumes'
    method: 'GET'
    urlTemplate: '/volumes'
    description: 'List all Azure NetApp Files volumes'
  }
}

resource createVolumeOperation 'Microsoft.ApiManagement/service/apis/operations@2023-03-01-preview' = {
  parent: anfApi
  name: 'create-volume'
  properties: {
    displayName: 'Create Volume'
    method: 'POST'
    urlTemplate: '/volumes'
    description: 'Create a new Azure NetApp Files volume'
  }
}

resource getVolumeOperation 'Microsoft.ApiManagement/service/apis/operations@2023-03-01-preview' = {
  parent: anfApi
  name: 'get-volume'
  properties: {
    displayName: 'Get Volume'
    method: 'GET'
    urlTemplate: '/volumes/{volumeId}'
    description: 'Get details of a specific volume'
    templateParameters: [
      {
        name: 'volumeId'
        description: 'Volume identifier'
        type: 'string'
        required: true
      }
    ]
  }
}

// API Policy
resource apiPolicy 'Microsoft.ApiManagement/service/apis/policies@2023-03-01-preview' = {
  parent: anfApi
  name: 'policy'
  properties: {
    value: '''
      <policies>
        <inbound>
          <base />
          <validate-jwt header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Unauthorized">
            <openid-config url="https://login.microsoftonline.com/${tenant().tenantId}/v2.0/.well-known/openid-configuration" />
            <audiences>
              <audience>api://${apimName}</audience>
            </audiences>
            <issuers>
              <issuer>https://sts.windows.net/${tenant().tenantId}/</issuer>
            </issuers>
          </validate-jwt>
          <rate-limit calls="100" renewal-period="60" />
          <quota calls="10000" renewal-period="86400" />
        </inbound>
        <backend>
          <base />
        </backend>
        <outbound>
          <base />
          <set-header name="X-API-Version" exists-action="override">
            <value>v1</value>
          </set-header>
        </outbound>
        <on-error>
          <base />
        </on-error>
      </policies>
    '''
    format: 'xml'
  }
}

// Products
resource anfProduct 'Microsoft.ApiManagement/service/products@2023-03-01-preview' = {
  parent: apiManagement
  name: 'anf-aiops-product'
  properties: {
    displayName: 'ANF AI-Ops Product'
    description: 'Product for Azure NetApp Files AI-Ops API access'
    terms: 'Terms of use for ANF AI-Ops API'
    subscriptionRequired: true
    approvalRequired: true
    subscriptionsLimit: 5
    state: 'published'
  }
}

resource productApi 'Microsoft.ApiManagement/service/products/apis@2023-03-01-preview' = {
  parent: anfProduct
  name: anfApi.name
}

output serviceName string = apiManagement.name
output serviceId string = apiManagement.id
output gatewayUrl string = apiManagement.properties.gatewayUrl
output managementApiUrl string = apiManagement.properties.managementApiUrl
output principalId string = apiManagement.identity.principalId