using System.Collections.Generic;
using System.Threading.Tasks;
using Azure.ResourceManager.NetApp;
using Azure.ResourceManager.NetApp.Models;

namespace ANFServer.Services
{
    /// <summary>
    /// Interface for Azure NetApp Files service operations
    /// </summary>
    /// <author>Dwiref Sharma &lt;DwirefS@SapientEdge.io&gt;</author>
    public interface IANFService
    {
        #region Account Operations

        /// <summary>
        /// Lists all NetApp accounts in the subscription or resource group
        /// </summary>
        /// <param name="resourceGroupName">Optional resource group name to filter by</param>
        /// <returns>List of NetApp accounts</returns>
        Task<IEnumerable<NetAppAccountResource>> ListAccountsAsync(string? resourceGroupName = null);

        /// <summary>
        /// Gets a specific NetApp account
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <returns>NetApp account resource</returns>
        Task<NetAppAccountResource?> GetAccountAsync(string resourceGroupName, string accountName);

        /// <summary>
        /// Creates a new NetApp account
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="accountData">Account data</param>
        /// <returns>Created NetApp account resource</returns>
        Task<NetAppAccountResource> CreateAccountAsync(string resourceGroupName, string accountName, NetAppAccountData accountData);

        /// <summary>
        /// Updates an existing NetApp account
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="accountData">Updated account data</param>
        /// <returns>Updated NetApp account resource</returns>
        Task<NetAppAccountResource> UpdateAccountAsync(string resourceGroupName, string accountName, NetAppAccountData accountData);

        /// <summary>
        /// Deletes a NetApp account
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        Task DeleteAccountAsync(string resourceGroupName, string accountName);

        #endregion

        #region Capacity Pool Operations

        /// <summary>
        /// Lists all capacity pools in an account
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <returns>List of capacity pools</returns>
        Task<IEnumerable<CapacityPoolResource>> ListCapacityPoolsAsync(string resourceGroupName, string accountName);

        /// <summary>
        /// Gets a specific capacity pool
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        /// <returns>Capacity pool resource</returns>
        Task<CapacityPoolResource?> GetCapacityPoolAsync(string resourceGroupName, string accountName, string poolName);

        /// <summary>
        /// Creates a new capacity pool
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        /// <param name="poolData">Pool data</param>
        /// <returns>Created capacity pool resource</returns>
        Task<CapacityPoolResource> CreateCapacityPoolAsync(string resourceGroupName, string accountName, string poolName, CapacityPoolData poolData);

        /// <summary>
        /// Updates an existing capacity pool
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        /// <param name="poolData">Updated pool data</param>
        /// <returns>Updated capacity pool resource</returns>
        Task<CapacityPoolResource> UpdateCapacityPoolAsync(string resourceGroupName, string accountName, string poolName, CapacityPoolPatch poolData);

        /// <summary>
        /// Deletes a capacity pool
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        Task DeleteCapacityPoolAsync(string resourceGroupName, string accountName, string poolName);

        #endregion

        #region Volume Operations

        /// <summary>
        /// Lists all volumes in a capacity pool
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        /// <returns>List of volumes</returns>
        Task<IEnumerable<NetAppVolumeResource>> ListVolumesAsync(string resourceGroupName, string accountName, string poolName);

        /// <summary>
        /// Gets a specific volume
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        /// <param name="volumeName">Volume name</param>
        /// <returns>Volume resource</returns>
        Task<NetAppVolumeResource?> GetVolumeAsync(string resourceGroupName, string accountName, string poolName, string volumeName);

        /// <summary>
        /// Creates a new volume
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        /// <param name="volumeName">Volume name</param>
        /// <param name="volumeData">Volume data</param>
        /// <returns>Created volume resource</returns>
        Task<NetAppVolumeResource> CreateVolumeAsync(string resourceGroupName, string accountName, string poolName, string volumeName, NetAppVolumeData volumeData);

        /// <summary>
        /// Updates an existing volume
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        /// <param name="volumeName">Volume name</param>
        /// <param name="volumePatch">Volume patch data</param>
        /// <returns>Updated volume resource</returns>
        Task<NetAppVolumeResource> UpdateVolumeAsync(string resourceGroupName, string accountName, string poolName, string volumeName, NetAppVolumePatch volumePatch);

        /// <summary>
        /// Deletes a volume
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        /// <param name="volumeName">Volume name</param>
        Task DeleteVolumeAsync(string resourceGroupName, string accountName, string poolName, string volumeName);

        /// <summary>
        /// Resizes a volume
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        /// <param name="volumeName">Volume name</param>
        /// <param name="newSizeInBytes">New size in bytes</param>
        /// <returns>Updated volume resource</returns>
        Task<NetAppVolumeResource> ResizeVolumeAsync(string resourceGroupName, string accountName, string poolName, string volumeName, long newSizeInBytes);

        #endregion

        #region Snapshot Operations

        /// <summary>
        /// Lists all snapshots for a volume
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        /// <param name="volumeName">Volume name</param>
        /// <returns>List of snapshots</returns>
        Task<IEnumerable<SnapshotResource>> ListSnapshotsAsync(string resourceGroupName, string accountName, string poolName, string volumeName);

        /// <summary>
        /// Gets a specific snapshot
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        /// <param name="volumeName">Volume name</param>
        /// <param name="snapshotName">Snapshot name</param>
        /// <returns>Snapshot resource</returns>
        Task<SnapshotResource?> GetSnapshotAsync(string resourceGroupName, string accountName, string poolName, string volumeName, string snapshotName);

        /// <summary>
        /// Creates a new snapshot
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        /// <param name="volumeName">Volume name</param>
        /// <param name="snapshotName">Snapshot name</param>
        /// <param name="snapshotData">Snapshot data</param>
        /// <returns>Created snapshot resource</returns>
        Task<SnapshotResource> CreateSnapshotAsync(string resourceGroupName, string accountName, string poolName, string volumeName, string snapshotName, SnapshotData snapshotData);

        /// <summary>
        /// Deletes a snapshot
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        /// <param name="volumeName">Volume name</param>
        /// <param name="snapshotName">Snapshot name</param>
        Task DeleteSnapshotAsync(string resourceGroupName, string accountName, string poolName, string volumeName, string snapshotName);

        /// <summary>
        /// Restores a volume from a snapshot
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        /// <param name="volumeName">Volume name</param>
        /// <param name="snapshotName">Snapshot name</param>
        /// <returns>Restored volume resource</returns>
        Task<NetAppVolumeResource> RestoreSnapshotAsync(string resourceGroupName, string accountName, string poolName, string volumeName, string snapshotName);

        #endregion

        #region Replication Operations

        /// <summary>
        /// Creates a replication for a volume
        /// </summary>
        /// <param name="sourceResourceGroup">Source resource group</param>
        /// <param name="sourceAccountName">Source account name</param>
        /// <param name="sourcePoolName">Source pool name</param>
        /// <param name="sourceVolumeName">Source volume name</param>
        /// <param name="replicationData">Replication data</param>
        /// <returns>Created replication</returns>
        Task<NetAppVolumeResource> CreateReplicationAsync(
            string sourceResourceGroup, 
            string sourceAccountName, 
            string sourcePoolName, 
            string sourceVolumeName,
            NetAppReplicationObject replicationData);

        /// <summary>
        /// Breaks replication for a volume
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        /// <param name="volumeName">Volume name</param>
        Task BreakReplicationAsync(string resourceGroupName, string accountName, string poolName, string volumeName);

        /// <summary>
        /// Re-synchronizes replication for a volume
        /// </summary>
        /// <param name="resourceGroupName">Resource group name</param>
        /// <param name="accountName">Account name</param>
        /// <param name="poolName">Pool name</param>
        /// <param name="volumeName">Volume name</param>
        Task ResyncReplicationAsync(string resourceGroupName, string accountName, string poolName, string volumeName);

        #endregion
    }
}