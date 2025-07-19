using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace ANFServer.Models
{
    /// <summary>
    /// Data models for Azure NetApp Files resources
    /// </summary>
    /// <author>Dwiref Sharma &lt;DwirefS@SapientEdge.io&gt;</author>
    
    /// <summary>
    /// Represents an Azure NetApp Files account
    /// </summary>
    public class ANFAccount
    {
        /// <summary>
        /// The unique identifier of the account
        /// </summary>
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        /// <summary>
        /// The name of the account
        /// </summary>
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// The location of the account
        /// </summary>
        [JsonPropertyName("location")]
        public string Location { get; set; } = string.Empty;

        /// <summary>
        /// The resource group containing the account
        /// </summary>
        [JsonPropertyName("resourceGroup")]
        public string ResourceGroup { get; set; } = string.Empty;

        /// <summary>
        /// Tags associated with the account
        /// </summary>
        [JsonPropertyName("tags")]
        public Dictionary<string, string>? Tags { get; set; }

        /// <summary>
        /// The provisioning state of the account
        /// </summary>
        [JsonPropertyName("provisioningState")]
        public string? ProvisioningState { get; set; }

        /// <summary>
        /// Active Directory configurations
        /// </summary>
        [JsonPropertyName("activeDirectories")]
        public List<ActiveDirectoryConfig>? ActiveDirectories { get; set; }
    }

    /// <summary>
    /// Represents Active Directory configuration for ANF
    /// </summary>
    public class ActiveDirectoryConfig
    {
        /// <summary>
        /// The Active Directory ID
        /// </summary>
        [JsonPropertyName("activeDirectoryId")]
        public string? ActiveDirectoryId { get; set; }

        /// <summary>
        /// The domain name
        /// </summary>
        [JsonPropertyName("domain")]
        public string Domain { get; set; } = string.Empty;

        /// <summary>
        /// The site name
        /// </summary>
        [JsonPropertyName("site")]
        public string? Site { get; set; }

        /// <summary>
        /// The SMB server name
        /// </summary>
        [JsonPropertyName("smbServerName")]
        public string? SmbServerName { get; set; }

        /// <summary>
        /// The organizational unit
        /// </summary>
        [JsonPropertyName("organizationalUnit")]
        public string? OrganizationalUnit { get; set; }
    }

    /// <summary>
    /// Represents a capacity pool in Azure NetApp Files
    /// </summary>
    public class CapacityPool
    {
        /// <summary>
        /// The unique identifier of the capacity pool
        /// </summary>
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        /// <summary>
        /// The name of the capacity pool
        /// </summary>
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// The NetApp account name
        /// </summary>
        [JsonPropertyName("accountName")]
        public string AccountName { get; set; } = string.Empty;

        /// <summary>
        /// The size of the capacity pool in bytes
        /// </summary>
        [JsonPropertyName("size")]
        public long Size { get; set; }

        /// <summary>
        /// The service level (Standard, Premium, Ultra)
        /// </summary>
        [JsonPropertyName("serviceLevel")]
        public string ServiceLevel { get; set; } = "Standard";

        /// <summary>
        /// The provisioning state
        /// </summary>
        [JsonPropertyName("provisioningState")]
        public string? ProvisioningState { get; set; }

        /// <summary>
        /// The utilized size in bytes
        /// </summary>
        [JsonPropertyName("utilizedSize")]
        public long? UtilizedSize { get; set; }

        /// <summary>
        /// QoS type (Auto or Manual)
        /// </summary>
        [JsonPropertyName("qosType")]
        public string? QosType { get; set; }

        /// <summary>
        /// Tags associated with the capacity pool
        /// </summary>
        [JsonPropertyName("tags")]
        public Dictionary<string, string>? Tags { get; set; }
    }

    /// <summary>
    /// Represents a volume in Azure NetApp Files
    /// </summary>
    public class Volume
    {
        /// <summary>
        /// The unique identifier of the volume
        /// </summary>
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        /// <summary>
        /// The name of the volume
        /// </summary>
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// The NetApp account name
        /// </summary>
        [JsonPropertyName("accountName")]
        public string AccountName { get; set; } = string.Empty;

        /// <summary>
        /// The capacity pool name
        /// </summary>
        [JsonPropertyName("poolName")]
        public string PoolName { get; set; } = string.Empty;

        /// <summary>
        /// The creation token (file path)
        /// </summary>
        [JsonPropertyName("creationToken")]
        public string CreationToken { get; set; } = string.Empty;

        /// <summary>
        /// The service level
        /// </summary>
        [JsonPropertyName("serviceLevel")]
        public string ServiceLevel { get; set; } = "Standard";

        /// <summary>
        /// The usage threshold in bytes
        /// </summary>
        [JsonPropertyName("usageThreshold")]
        public long UsageThreshold { get; set; }

        /// <summary>
        /// Export policy rules
        /// </summary>
        [JsonPropertyName("exportPolicy")]
        public ExportPolicy? ExportPolicy { get; set; }

        /// <summary>
        /// Protocol types (NFSv3, NFSv4.1, CIFS)
        /// </summary>
        [JsonPropertyName("protocolTypes")]
        public List<string>? ProtocolTypes { get; set; }

        /// <summary>
        /// The subnet ID
        /// </summary>
        [JsonPropertyName("subnetId")]
        public string SubnetId { get; set; } = string.Empty;

        /// <summary>
        /// Mount targets
        /// </summary>
        [JsonPropertyName("mountTargets")]
        public List<MountTarget>? MountTargets { get; set; }

        /// <summary>
        /// The provisioning state
        /// </summary>
        [JsonPropertyName("provisioningState")]
        public string? ProvisioningState { get; set; }

        /// <summary>
        /// Snapshot directory visible
        /// </summary>
        [JsonPropertyName("snapshotDirectoryVisible")]
        public bool? SnapshotDirectoryVisible { get; set; }

        /// <summary>
        /// Tags associated with the volume
        /// </summary>
        [JsonPropertyName("tags")]
        public Dictionary<string, string>? Tags { get; set; }
    }

    /// <summary>
    /// Represents export policy for a volume
    /// </summary>
    public class ExportPolicy
    {
        /// <summary>
        /// Export policy rules
        /// </summary>
        [JsonPropertyName("rules")]
        public List<ExportPolicyRule>? Rules { get; set; }
    }

    /// <summary>
    /// Represents an export policy rule
    /// </summary>
    public class ExportPolicyRule
    {
        /// <summary>
        /// Rule index
        /// </summary>
        [JsonPropertyName("ruleIndex")]
        public int RuleIndex { get; set; }

        /// <summary>
        /// Unix read-only permission
        /// </summary>
        [JsonPropertyName("unixReadOnly")]
        public bool UnixReadOnly { get; set; }

        /// <summary>
        /// Unix read-write permission
        /// </summary>
        [JsonPropertyName("unixReadWrite")]
        public bool UnixReadWrite { get; set; }

        /// <summary>
        /// Kerberos 5 read-only permission
        /// </summary>
        [JsonPropertyName("kerberos5ReadOnly")]
        public bool? Kerberos5ReadOnly { get; set; }

        /// <summary>
        /// Kerberos 5 read-write permission
        /// </summary>
        [JsonPropertyName("kerberos5ReadWrite")]
        public bool? Kerberos5ReadWrite { get; set; }

        /// <summary>
        /// CIFS permission
        /// </summary>
        [JsonPropertyName("cifs")]
        public bool? Cifs { get; set; }

        /// <summary>
        /// NFSv3 permission
        /// </summary>
        [JsonPropertyName("nfsv3")]
        public bool? Nfsv3 { get; set; }

        /// <summary>
        /// NFSv4.1 permission
        /// </summary>
        [JsonPropertyName("nfsv41")]
        public bool? Nfsv41 { get; set; }

        /// <summary>
        /// Allowed clients
        /// </summary>
        [JsonPropertyName("allowedClients")]
        public string AllowedClients { get; set; } = "0.0.0.0/0";

        /// <summary>
        /// Has root access
        /// </summary>
        [JsonPropertyName("hasRootAccess")]
        public bool? HasRootAccess { get; set; }
    }

    /// <summary>
    /// Represents a mount target
    /// </summary>
    public class MountTarget
    {
        /// <summary>
        /// Mount target ID
        /// </summary>
        [JsonPropertyName("mountTargetId")]
        public string? MountTargetId { get; set; }

        /// <summary>
        /// File system ID
        /// </summary>
        [JsonPropertyName("fileSystemId")]
        public string? FileSystemId { get; set; }

        /// <summary>
        /// IP address
        /// </summary>
        [JsonPropertyName("ipAddress")]
        public string? IpAddress { get; set; }
    }

    /// <summary>
    /// Represents a snapshot in Azure NetApp Files
    /// </summary>
    public class Snapshot
    {
        /// <summary>
        /// The unique identifier of the snapshot
        /// </summary>
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        /// <summary>
        /// The name of the snapshot
        /// </summary>
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// The NetApp account name
        /// </summary>
        [JsonPropertyName("accountName")]
        public string AccountName { get; set; } = string.Empty;

        /// <summary>
        /// The capacity pool name
        /// </summary>
        [JsonPropertyName("poolName")]
        public string PoolName { get; set; } = string.Empty;

        /// <summary>
        /// The volume name
        /// </summary>
        [JsonPropertyName("volumeName")]
        public string VolumeName { get; set; } = string.Empty;

        /// <summary>
        /// The location of the snapshot
        /// </summary>
        [JsonPropertyName("location")]
        public string Location { get; set; } = string.Empty;

        /// <summary>
        /// The creation date
        /// </summary>
        [JsonPropertyName("created")]
        public DateTime? Created { get; set; }

        /// <summary>
        /// The provisioning state
        /// </summary>
        [JsonPropertyName("provisioningState")]
        public string? ProvisioningState { get; set; }
    }

    /// <summary>
    /// Represents a request to create a new ANF account
    /// </summary>
    public class CreateAccountRequest
    {
        /// <summary>
        /// The name of the account
        /// </summary>
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// The location for the account
        /// </summary>
        [JsonPropertyName("location")]
        public string Location { get; set; } = string.Empty;

        /// <summary>
        /// The resource group name
        /// </summary>
        [JsonPropertyName("resourceGroup")]
        public string ResourceGroup { get; set; } = string.Empty;

        /// <summary>
        /// Tags to apply to the account
        /// </summary>
        [JsonPropertyName("tags")]
        public Dictionary<string, string>? Tags { get; set; }

        /// <summary>
        /// Active Directory configurations
        /// </summary>
        [JsonPropertyName("activeDirectories")]
        public List<ActiveDirectoryConfig>? ActiveDirectories { get; set; }
    }

    /// <summary>
    /// Represents a request to create a capacity pool
    /// </summary>
    public class CreateCapacityPoolRequest
    {
        /// <summary>
        /// The name of the capacity pool
        /// </summary>
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// The NetApp account name
        /// </summary>
        [JsonPropertyName("accountName")]
        public string AccountName { get; set; } = string.Empty;

        /// <summary>
        /// The size in TiB (4-500)
        /// </summary>
        [JsonPropertyName("sizeInTiB")]
        public int SizeInTiB { get; set; }

        /// <summary>
        /// The service level (Standard, Premium, Ultra)
        /// </summary>
        [JsonPropertyName("serviceLevel")]
        public string ServiceLevel { get; set; } = "Standard";

        /// <summary>
        /// QoS type (Auto or Manual)
        /// </summary>
        [JsonPropertyName("qosType")]
        public string? QosType { get; set; } = "Auto";

        /// <summary>
        /// Tags to apply
        /// </summary>
        [JsonPropertyName("tags")]
        public Dictionary<string, string>? Tags { get; set; }
    }

    /// <summary>
    /// Represents a request to create a volume
    /// </summary>
    public class CreateVolumeRequest
    {
        /// <summary>
        /// The name of the volume
        /// </summary>
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// The NetApp account name
        /// </summary>
        [JsonPropertyName("accountName")]
        public string AccountName { get; set; } = string.Empty;

        /// <summary>
        /// The capacity pool name
        /// </summary>
        [JsonPropertyName("poolName")]
        public string PoolName { get; set; } = string.Empty;

        /// <summary>
        /// The creation token (file path)
        /// </summary>
        [JsonPropertyName("creationToken")]
        public string CreationToken { get; set; } = string.Empty;

        /// <summary>
        /// The size in GiB (100-100,000)
        /// </summary>
        [JsonPropertyName("sizeInGiB")]
        public int SizeInGiB { get; set; }

        /// <summary>
        /// Protocol types
        /// </summary>
        [JsonPropertyName("protocolTypes")]
        public List<string> ProtocolTypes { get; set; } = new List<string> { "NFSv3" };

        /// <summary>
        /// The subnet ID
        /// </summary>
        [JsonPropertyName("subnetId")]
        public string SubnetId { get; set; } = string.Empty;

        /// <summary>
        /// Export policy rules
        /// </summary>
        [JsonPropertyName("exportPolicy")]
        public ExportPolicy? ExportPolicy { get; set; }

        /// <summary>
        /// Snapshot directory visible
        /// </summary>
        [JsonPropertyName("snapshotDirectoryVisible")]
        public bool? SnapshotDirectoryVisible { get; set; } = true;

        /// <summary>
        /// Tags to apply
        /// </summary>
        [JsonPropertyName("tags")]
        public Dictionary<string, string>? Tags { get; set; }
    }

    /// <summary>
    /// Represents a request to create a snapshot
    /// </summary>
    public class CreateSnapshotRequest
    {
        /// <summary>
        /// The name of the snapshot
        /// </summary>
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// The NetApp account name
        /// </summary>
        [JsonPropertyName("accountName")]
        public string AccountName { get; set; } = string.Empty;

        /// <summary>
        /// The capacity pool name
        /// </summary>
        [JsonPropertyName("poolName")]
        public string PoolName { get; set; } = string.Empty;

        /// <summary>
        /// The volume name
        /// </summary>
        [JsonPropertyName("volumeName")]
        public string VolumeName { get; set; } = string.Empty;
    }

    /// <summary>
    /// Standard API response wrapper
    /// </summary>
    /// <typeparam name="T">The type of data in the response</typeparam>
    public class ApiResponse<T>
    {
        /// <summary>
        /// Indicates if the operation was successful
        /// </summary>
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        /// <summary>
        /// The response data
        /// </summary>
        [JsonPropertyName("data")]
        public T? Data { get; set; }

        /// <summary>
        /// Error message if operation failed
        /// </summary>
        [JsonPropertyName("error")]
        public string? Error { get; set; }

        /// <summary>
        /// Detailed error information
        /// </summary>
        [JsonPropertyName("details")]
        public Dictionary<string, object>? Details { get; set; }

        /// <summary>
        /// Request tracking ID
        /// </summary>
        [JsonPropertyName("requestId")]
        public string RequestId { get; set; } = Guid.NewGuid().ToString();

        /// <summary>
        /// Timestamp of the response
        /// </summary>
        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Represents a health check response
    /// </summary>
    public class HealthCheckResponse
    {
        /// <summary>
        /// Overall health status
        /// </summary>
        [JsonPropertyName("status")]
        public string Status { get; set; } = "Healthy";

        /// <summary>
        /// Individual service health checks
        /// </summary>
        [JsonPropertyName("services")]
        public Dictionary<string, ServiceHealth> Services { get; set; } = new();

        /// <summary>
        /// Timestamp of the health check
        /// </summary>
        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Represents health status of a service
    /// </summary>
    public class ServiceHealth
    {
        /// <summary>
        /// Service name
        /// </summary>
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Health status
        /// </summary>
        [JsonPropertyName("status")]
        public string Status { get; set; } = "Healthy";

        /// <summary>
        /// Additional details
        /// </summary>
        [JsonPropertyName("details")]
        public string? Details { get; set; }
    }
}