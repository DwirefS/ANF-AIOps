// Azure NetApp Files Account Module
// Author: Dwiref Sharma <DwirefS@SapientEdge.com>

param accountName string
param location string
param environment string

resource netAppAccount 'Microsoft.NetApp/netAppAccounts@2023-05-01' = {
  name: accountName
  location: location
  tags: {
    Environment: environment
    Component: 'Storage'
    ManagedBy: 'ANF-AIops'
    Author: 'Dwiref Sharma'
  }
  properties: {
    activeDirectories: []
    encryption: {
      keySource: 'Microsoft.NetApp'
    }
  }
}

// Default Capacity Pool
resource defaultPool 'Microsoft.NetApp/netAppAccounts/capacityPools@2023-05-01' = {
  parent: netAppAccount
  name: '${accountName}-default-pool'
  location: location
  tags: {
    Environment: environment
    Component: 'Storage'
    PoolType: 'Default'
    ManagedBy: 'ANF-AIops'
  }
  properties: {
    serviceLevel: environment == 'prod' ? 'Premium' : 'Standard'
    size: 4398046511104 // 4 TiB
    qosType: 'Auto'
    coolAccess: false
    encryptionType: 'Single'
  }
}

// Premium Pool for High-Performance Workloads
resource premiumPool 'Microsoft.NetApp/netAppAccounts/capacityPools@2023-05-01' = if (environment == 'prod') {
  parent: netAppAccount
  name: '${accountName}-premium-pool'
  location: location
  tags: {
    Environment: environment
    Component: 'Storage'
    PoolType: 'Premium'
    ManagedBy: 'ANF-AIops'
  }
  properties: {
    serviceLevel: 'Ultra'
    size: 4398046511104 // 4 TiB
    qosType: 'Manual'
    coolAccess: false
    encryptionType: 'Single'
  }
}

output accountName string = netAppAccount.name
output accountId string = netAppAccount.id
output defaultPoolName string = defaultPool.name
output defaultPoolId string = defaultPool.id
output premiumPoolName string = environment == 'prod' ? premiumPool.name : ''
output premiumPoolId string = environment == 'prod' ? premiumPool.id : ''