using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Azure;
using Azure.Core;
using Azure.ResourceManager;
using Azure.ResourceManager.NetApp;
using Azure.ResourceManager.NetApp.Models;
using Azure.ResourceManager.Resources;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ANFServer.Services
{
    /// <summary>
    /// Implementation of Azure NetApp Files service operations
    /// </summary>
    /// <author>Dwiref Sharma &lt;DwirefS@SapientEdge.io&gt;</author>
    public class ANFService : IANFService
    {
        private readonly ILogger<ANFService> _logger;
        private readonly ArmClient _armClient;
        private readonly string _subscriptionId;

        /// <summary>
        /// Initializes a new instance of ANFService
        /// </summary>
        /// <param name="logger">Logger instance</param>
        /// <param name="armClient">ARM client instance</param>
        /// <param name="configuration">Configuration</param>
        public ANFService(ILogger<ANFService> logger, ArmClient armClient, IConfiguration configuration)
        {
            _logger = logger;
            _armClient = armClient;
            _subscriptionId = configuration["ANF:SubscriptionId"] ?? throw new InvalidOperationException("ANF:SubscriptionId not configured");
        }

        #region Account Operations

        /// <inheritdoc/>
        public async Task<IEnumerable<NetAppAccountResource>> ListAccountsAsync(string? resourceGroupName = null)
        {
            try
            {
                var subscription = await _armClient.GetSubscriptionResource(new ResourceIdentifier($"/subscriptions/{_subscriptionId}")).GetAsync();
                
                if (!string.IsNullOrEmpty(resourceGroupName))
                {
                    var resourceGroup = await subscription.Value.GetResourceGroupAsync(resourceGroupName);
                    var accounts = resourceGroup.Value.GetNetAppAccounts();
                    return await accounts.GetAllAsync().ToListAsync();
                }
                else
                {
                    var accounts = subscription.Value.GetNetAppAccounts();
                    return await accounts.GetAllAsync().ToListAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listing NetApp accounts");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<NetAppAccountResource?> GetAccountAsync(string resourceGroupName, string accountName)
        {
            try
            {
                var subscription = await _armClient.GetSubscriptionResource(new ResourceIdentifier($"/subscriptions/{_subscriptionId}")).GetAsync();
                var resourceGroup = await subscription.Value.GetResourceGroupAsync(resourceGroupName);
                var accounts = resourceGroup.Value.GetNetAppAccounts();
                
                var response = await accounts.GetAsync(accountName);
                return response.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                _logger.LogWarning("NetApp account {AccountName} not found in resource group {ResourceGroup}", 
                    accountName, resourceGroupName);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting NetApp account {AccountName}", accountName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<NetAppAccountResource> CreateAccountAsync(string resourceGroupName, string accountName, NetAppAccountData accountData)
        {
            try
            {
                var subscription = await _armClient.GetSubscriptionResource(new ResourceIdentifier($"/subscriptions/{_subscriptionId}")).GetAsync();
                var resourceGroup = await subscription.Value.GetResourceGroupAsync(resourceGroupName);
                var accounts = resourceGroup.Value.GetNetAppAccounts();
                
                var operation = await accounts.CreateOrUpdateAsync(WaitUntil.Completed, accountName, accountData);
                _logger.LogInformation("Successfully created NetApp account {AccountName}", accountName);
                return operation.Value;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating NetApp account {AccountName}", accountName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<NetAppAccountResource> UpdateAccountAsync(string resourceGroupName, string accountName, NetAppAccountData accountData)
        {
            try
            {
                var subscription = await _armClient.GetSubscriptionResource(new ResourceIdentifier($"/subscriptions/{_subscriptionId}")).GetAsync();
                var resourceGroup = await subscription.Value.GetResourceGroupAsync(resourceGroupName);
                var accounts = resourceGroup.Value.GetNetAppAccounts();
                
                var operation = await accounts.CreateOrUpdateAsync(WaitUntil.Completed, accountName, accountData);
                _logger.LogInformation("Successfully updated NetApp account {AccountName}", accountName);
                return operation.Value;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating NetApp account {AccountName}", accountName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task DeleteAccountAsync(string resourceGroupName, string accountName)
        {
            try
            {
                var account = await GetAccountAsync(resourceGroupName, accountName);
                if (account == null)
                {
                    throw new InvalidOperationException($"NetApp account {accountName} not found");
                }

                await account.DeleteAsync(WaitUntil.Completed);
                _logger.LogInformation("Successfully deleted NetApp account {AccountName}", accountName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting NetApp account {AccountName}", accountName);
                throw;
            }
        }

        #endregion

        #region Capacity Pool Operations

        /// <inheritdoc/>
        public async Task<IEnumerable<CapacityPoolResource>> ListCapacityPoolsAsync(string resourceGroupName, string accountName)
        {
            try
            {
                var account = await GetAccountAsync(resourceGroupName, accountName);
                if (account == null)
                {
                    throw new InvalidOperationException($"NetApp account {accountName} not found");
                }

                var pools = account.GetCapacityPools();
                return await pools.GetAllAsync().ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listing capacity pools for account {AccountName}", accountName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<CapacityPoolResource?> GetCapacityPoolAsync(string resourceGroupName, string accountName, string poolName)
        {
            try
            {
                var account = await GetAccountAsync(resourceGroupName, accountName);
                if (account == null)
                {
                    return null;
                }

                var pools = account.GetCapacityPools();
                var response = await pools.GetAsync(poolName);
                return response.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                _logger.LogWarning("Capacity pool {PoolName} not found in account {AccountName}", 
                    poolName, accountName);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting capacity pool {PoolName}", poolName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<CapacityPoolResource> CreateCapacityPoolAsync(string resourceGroupName, string accountName, string poolName, CapacityPoolData poolData)
        {
            try
            {
                var account = await GetAccountAsync(resourceGroupName, accountName);
                if (account == null)
                {
                    throw new InvalidOperationException($"NetApp account {accountName} not found");
                }

                var pools = account.GetCapacityPools();
                var operation = await pools.CreateOrUpdateAsync(WaitUntil.Completed, poolName, poolData);
                _logger.LogInformation("Successfully created capacity pool {PoolName} in account {AccountName}", 
                    poolName, accountName);
                return operation.Value;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating capacity pool {PoolName}", poolName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<CapacityPoolResource> UpdateCapacityPoolAsync(string resourceGroupName, string accountName, string poolName, CapacityPoolPatch poolData)
        {
            try
            {
                var pool = await GetCapacityPoolAsync(resourceGroupName, accountName, poolName);
                if (pool == null)
                {
                    throw new InvalidOperationException($"Capacity pool {poolName} not found");
                }

                var operation = await pool.UpdateAsync(WaitUntil.Completed, poolData);
                _logger.LogInformation("Successfully updated capacity pool {PoolName}", poolName);
                return operation.Value;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating capacity pool {PoolName}", poolName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task DeleteCapacityPoolAsync(string resourceGroupName, string accountName, string poolName)
        {
            try
            {
                var pool = await GetCapacityPoolAsync(resourceGroupName, accountName, poolName);
                if (pool == null)
                {
                    throw new InvalidOperationException($"Capacity pool {poolName} not found");
                }

                await pool.DeleteAsync(WaitUntil.Completed);
                _logger.LogInformation("Successfully deleted capacity pool {PoolName}", poolName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting capacity pool {PoolName}", poolName);
                throw;
            }
        }

        #endregion

        #region Volume Operations

        /// <inheritdoc/>
        public async Task<IEnumerable<NetAppVolumeResource>> ListVolumesAsync(string resourceGroupName, string accountName, string poolName)
        {
            try
            {
                var pool = await GetCapacityPoolAsync(resourceGroupName, accountName, poolName);
                if (pool == null)
                {
                    throw new InvalidOperationException($"Capacity pool {poolName} not found");
                }

                var volumes = pool.GetNetAppVolumes();
                return await volumes.GetAllAsync().ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listing volumes for pool {PoolName}", poolName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<NetAppVolumeResource?> GetVolumeAsync(string resourceGroupName, string accountName, string poolName, string volumeName)
        {
            try
            {
                var pool = await GetCapacityPoolAsync(resourceGroupName, accountName, poolName);
                if (pool == null)
                {
                    return null;
                }

                var volumes = pool.GetNetAppVolumes();
                var response = await volumes.GetAsync(volumeName);
                return response.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                _logger.LogWarning("Volume {VolumeName} not found in pool {PoolName}", 
                    volumeName, poolName);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting volume {VolumeName}", volumeName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<NetAppVolumeResource> CreateVolumeAsync(string resourceGroupName, string accountName, string poolName, string volumeName, NetAppVolumeData volumeData)
        {
            try
            {
                var pool = await GetCapacityPoolAsync(resourceGroupName, accountName, poolName);
                if (pool == null)
                {
                    throw new InvalidOperationException($"Capacity pool {poolName} not found");
                }

                var volumes = pool.GetNetAppVolumes();
                var operation = await volumes.CreateOrUpdateAsync(WaitUntil.Completed, volumeName, volumeData);
                _logger.LogInformation("Successfully created volume {VolumeName} in pool {PoolName}", 
                    volumeName, poolName);
                return operation.Value;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating volume {VolumeName}", volumeName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<NetAppVolumeResource> UpdateVolumeAsync(string resourceGroupName, string accountName, string poolName, string volumeName, NetAppVolumePatch volumePatch)
        {
            try
            {
                var volume = await GetVolumeAsync(resourceGroupName, accountName, poolName, volumeName);
                if (volume == null)
                {
                    throw new InvalidOperationException($"Volume {volumeName} not found");
                }

                var operation = await volume.UpdateAsync(WaitUntil.Completed, volumePatch);
                _logger.LogInformation("Successfully updated volume {VolumeName}", volumeName);
                return operation.Value;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating volume {VolumeName}", volumeName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task DeleteVolumeAsync(string resourceGroupName, string accountName, string poolName, string volumeName)
        {
            try
            {
                var volume = await GetVolumeAsync(resourceGroupName, accountName, poolName, volumeName);
                if (volume == null)
                {
                    throw new InvalidOperationException($"Volume {volumeName} not found");
                }

                await volume.DeleteAsync(WaitUntil.Completed);
                _logger.LogInformation("Successfully deleted volume {VolumeName}", volumeName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting volume {VolumeName}", volumeName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<NetAppVolumeResource> ResizeVolumeAsync(string resourceGroupName, string accountName, string poolName, string volumeName, long newSizeInBytes)
        {
            try
            {
                var volume = await GetVolumeAsync(resourceGroupName, accountName, poolName, volumeName);
                if (volume == null)
                {
                    throw new InvalidOperationException($"Volume {volumeName} not found");
                }

                var volumePatch = new NetAppVolumePatch
                {
                    UsageThreshold = newSizeInBytes
                };

                return await UpdateVolumeAsync(resourceGroupName, accountName, poolName, volumeName, volumePatch);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resizing volume {VolumeName} to {NewSize} bytes", 
                    volumeName, newSizeInBytes);
                throw;
            }
        }

        #endregion

        #region Snapshot Operations

        /// <inheritdoc/>
        public async Task<IEnumerable<SnapshotResource>> ListSnapshotsAsync(string resourceGroupName, string accountName, string poolName, string volumeName)
        {
            try
            {
                var volume = await GetVolumeAsync(resourceGroupName, accountName, poolName, volumeName);
                if (volume == null)
                {
                    throw new InvalidOperationException($"Volume {volumeName} not found");
                }

                var snapshots = volume.GetSnapshots();
                return await snapshots.GetAllAsync().ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listing snapshots for volume {VolumeName}", volumeName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<SnapshotResource?> GetSnapshotAsync(string resourceGroupName, string accountName, string poolName, string volumeName, string snapshotName)
        {
            try
            {
                var volume = await GetVolumeAsync(resourceGroupName, accountName, poolName, volumeName);
                if (volume == null)
                {
                    return null;
                }

                var snapshots = volume.GetSnapshots();
                var response = await snapshots.GetAsync(snapshotName);
                return response.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                _logger.LogWarning("Snapshot {SnapshotName} not found for volume {VolumeName}", 
                    snapshotName, volumeName);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting snapshot {SnapshotName}", snapshotName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<SnapshotResource> CreateSnapshotAsync(string resourceGroupName, string accountName, string poolName, string volumeName, string snapshotName, SnapshotData snapshotData)
        {
            try
            {
                var volume = await GetVolumeAsync(resourceGroupName, accountName, poolName, volumeName);
                if (volume == null)
                {
                    throw new InvalidOperationException($"Volume {volumeName} not found");
                }

                var snapshots = volume.GetSnapshots();
                var operation = await snapshots.CreateOrUpdateAsync(WaitUntil.Completed, snapshotName, snapshotData);
                _logger.LogInformation("Successfully created snapshot {SnapshotName} for volume {VolumeName}", 
                    snapshotName, volumeName);
                return operation.Value;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating snapshot {SnapshotName}", snapshotName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task DeleteSnapshotAsync(string resourceGroupName, string accountName, string poolName, string volumeName, string snapshotName)
        {
            try
            {
                var snapshot = await GetSnapshotAsync(resourceGroupName, accountName, poolName, volumeName, snapshotName);
                if (snapshot == null)
                {
                    throw new InvalidOperationException($"Snapshot {snapshotName} not found");
                }

                await snapshot.DeleteAsync(WaitUntil.Completed);
                _logger.LogInformation("Successfully deleted snapshot {SnapshotName}", snapshotName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting snapshot {SnapshotName}", snapshotName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<NetAppVolumeResource> RestoreSnapshotAsync(string resourceGroupName, string accountName, string poolName, string volumeName, string snapshotName)
        {
            try
            {
                var volume = await GetVolumeAsync(resourceGroupName, accountName, poolName, volumeName);
                if (volume == null)
                {
                    throw new InvalidOperationException($"Volume {volumeName} not found");
                }

                var snapshot = await GetSnapshotAsync(resourceGroupName, accountName, poolName, volumeName, snapshotName);
                if (snapshot == null)
                {
                    throw new InvalidOperationException($"Snapshot {snapshotName} not found");
                }

                // Restore is done by updating the volume with the snapshot ID
                var restoreRequest = new NetAppVolumeRevertContent
                {
                    SnapshotId = snapshot.Id
                };

                await volume.RevertAsync(WaitUntil.Completed, restoreRequest);
                _logger.LogInformation("Successfully restored volume {VolumeName} from snapshot {SnapshotName}", 
                    volumeName, snapshotName);
                
                return volume;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error restoring volume {VolumeName} from snapshot {SnapshotName}", 
                    volumeName, snapshotName);
                throw;
            }
        }

        #endregion

        #region Replication Operations

        /// <inheritdoc/>
        public async Task<NetAppVolumeResource> CreateReplicationAsync(
            string sourceResourceGroup, 
            string sourceAccountName, 
            string sourcePoolName, 
            string sourceVolumeName,
            NetAppReplicationObject replicationData)
        {
            try
            {
                var sourceVolume = await GetVolumeAsync(sourceResourceGroup, sourceAccountName, sourcePoolName, sourceVolumeName);
                if (sourceVolume == null)
                {
                    throw new InvalidOperationException($"Source volume {sourceVolumeName} not found");
                }

                // Update source volume with replication data
                var volumePatch = new NetAppVolumePatch
                {
                    DataProtection = new NetAppVolumeDataProtection
                    {
                        Replication = replicationData
                    }
                };

                var operation = await sourceVolume.UpdateAsync(WaitUntil.Completed, volumePatch);
                _logger.LogInformation("Successfully created replication for volume {VolumeName}", sourceVolumeName);
                return operation.Value;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating replication for volume {VolumeName}", sourceVolumeName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task BreakReplicationAsync(string resourceGroupName, string accountName, string poolName, string volumeName)
        {
            try
            {
                var volume = await GetVolumeAsync(resourceGroupName, accountName, poolName, volumeName);
                if (volume == null)
                {
                    throw new InvalidOperationException($"Volume {volumeName} not found");
                }

                var breakRequest = new NetAppVolumeBreakReplicationContent();
                await volume.BreakReplicationAsync(WaitUntil.Completed, breakRequest);
                _logger.LogInformation("Successfully broke replication for volume {VolumeName}", volumeName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error breaking replication for volume {VolumeName}", volumeName);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task ResyncReplicationAsync(string resourceGroupName, string accountName, string poolName, string volumeName)
        {
            try
            {
                var volume = await GetVolumeAsync(resourceGroupName, accountName, poolName, volumeName);
                if (volume == null)
                {
                    throw new InvalidOperationException($"Volume {volumeName} not found");
                }

                await volume.ResyncReplicationAsync(WaitUntil.Completed);
                _logger.LogInformation("Successfully re-synced replication for volume {VolumeName}", volumeName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error re-syncing replication for volume {VolumeName}", volumeName);
                throw;
            }
        }

        #endregion
    }
}