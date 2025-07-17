targetScope = 'subscription'

@description('The name of the environment (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string

@description('The Azure region for resources')
param location string

@description('The name prefix for all resources')
@minLength(3)
@maxLength(10)
param resourcePrefix string

@description('Tags to apply to all resources')
param tags object = {
  Environment: environment
  ManagedBy: 'ANF-AIops'
  Project: 'Azure NetApp Files AI Operations'
}

@description('Resource group names')
param resourceGroupNames object = {
  networking: '${resourcePrefix}-${environment}-network-rg'
  compute: '${resourcePrefix}-${environment}-compute-rg'
  storage: '${resourcePrefix}-${environment}-storage-rg'
  monitoring: '${resourcePrefix}-${environment}-monitor-rg'
  security: '${resourcePrefix}-${environment}-security-rg'
}

// Resource Groups
module resourceGroups 'modules/resource-groups.bicep' = {
  name: 'resourceGroups'
  params: {
    resourceGroupNames: resourceGroupNames
    location: location
    tags: tags
  }
}

// Networking
module networking 'modules/networking.bicep' = {
  name: 'networking'
  scope: resourceGroup(resourceGroupNames.networking)
  params: {
    location: location
    resourcePrefix: resourcePrefix
    environment: environment
    tags: tags
  }
  dependsOn: [
    resourceGroups
  ]
}

// Security (Key Vault, Managed Identities)
module security 'modules/security.bicep' = {
  name: 'security'
  scope: resourceGroup(resourceGroupNames.security)
  params: {
    location: location
    resourcePrefix: resourcePrefix
    environment: environment
    tags: tags
  }
  dependsOn: [
    resourceGroups
  ]
}

// Storage (NetApp Account and Pools)
module storage 'modules/storage.bicep' = {
  name: 'storage'
  scope: resourceGroup(resourceGroupNames.storage)
  params: {
    location: location
    resourcePrefix: resourcePrefix
    environment: environment
    tags: tags
    subnetId: networking.outputs.anfSubnetId
  }
  dependsOn: [
    networking
  ]
}

// Compute (Container Apps, Functions)
module compute 'modules/compute.bicep' = {
  name: 'compute'
  scope: resourceGroup(resourceGroupNames.compute)
  params: {
    location: location
    resourcePrefix: resourcePrefix
    environment: environment
    tags: tags
    subnetId: networking.outputs.computeSubnetId
    keyVaultId: security.outputs.keyVaultId
    managedIdentityId: security.outputs.managedIdentityId
  }
  dependsOn: [
    networking
    security
  ]
}

// API Management
module apiManagement 'modules/api-management.bicep' = {
  name: 'apiManagement'
  scope: resourceGroup(resourceGroupNames.compute)
  params: {
    location: location
    resourcePrefix: resourcePrefix
    environment: environment
    tags: tags
    subnetId: networking.outputs.apimSubnetId
    keyVaultId: security.outputs.keyVaultId
  }
  dependsOn: [
    networking
    security
  ]
}

// Monitoring (App Insights, Log Analytics)
module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  scope: resourceGroup(resourceGroupNames.monitoring)
  params: {
    location: location
    resourcePrefix: resourcePrefix
    environment: environment
    tags: tags
  }
  dependsOn: [
    resourceGroups
  ]
}

// Outputs
output resourceGroups object = {
  networking: resourceGroupNames.networking
  compute: resourceGroupNames.compute
  storage: resourceGroupNames.storage
  monitoring: resourceGroupNames.monitoring
  security: resourceGroupNames.security
}

output networkingOutputs object = networking.outputs
output securityOutputs object = security.outputs
output storageOutputs object = storage.outputs
output computeOutputs object = compute.outputs
output monitoringOutputs object = monitoring.outputs
output apiManagementOutputs object = apiManagement.outputs