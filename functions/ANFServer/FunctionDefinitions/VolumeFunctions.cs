using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Azure.ResourceManager.NetApp.Models;
using ANFServer.Models;
using ANFServer.Security;
using ANFServer.Services;

namespace ANFServer.FunctionDefinitions
{
    /// <summary>
    /// Azure Functions for managing Azure NetApp Files volumes
    /// </summary>
    /// <author>Dwiref Sharma &lt;DwirefS@SapientEdge.io&gt;</author>
    public class VolumeFunctions
    {
        private readonly ILogger<VolumeFunctions> _logger;
        private readonly IANFService _anfService;
        private readonly SecureResponseBuilder _responseBuilder;
        private readonly AuthGuards _authGuards;
        private readonly PromptLibrary _promptLibrary;

        /// <summary>
        /// Initializes a new instance of VolumeFunctions
        /// </summary>
        public VolumeFunctions(
            ILogger<VolumeFunctions> logger,
            IANFService anfService,
            SecureResponseBuilder responseBuilder,
            AuthGuards authGuards,
            PromptLibrary promptLibrary)
        {
            _logger = logger;
            _anfService = anfService;
            _responseBuilder = responseBuilder;
            _authGuards = authGuards;
            _promptLibrary = promptLibrary;
        }

        /// <summary>
        /// Lists all volumes in a capacity pool
        /// </summary>
        [Function("ListVolumes")]
        public async Task<HttpResponseData> ListVolumes(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "accounts/{accountName}/pools/{poolName}/volumes")] HttpRequestData req,
            string accountName,
            string poolName)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("ListVolumes function processing request {RequestId} for pool {PoolName}", requestId, poolName);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.volumes.read"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, $"volumes/{poolName}", "read");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                var resourceGroup = req.Query["resourceGroup"];
                if (string.IsNullOrWhiteSpace(resourceGroup))
                {
                    return await CreateBadRequestResponse(req, "Resource group is required", requestId);
                }

                // Get volumes
                var volumes = await _anfService.ListVolumesAsync(resourceGroup, accountName, poolName);

                // Map to response model
                var response = volumes.Select(v => MapVolumeToModel(v)).ToList();

                _logger.LogInformation("Successfully retrieved {Count} volumes for pool {PoolName}, request {RequestId}", 
                    response.Count, poolName, requestId);

                return await CreateSuccessResponse(req, response, requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing ListVolumes request {RequestId}", requestId);
                return await CreateErrorResponse(req, "Failed to retrieve volumes", requestId);
            }
        }

        /// <summary>
        /// Gets a specific volume
        /// </summary>
        [Function("GetVolume")]
        public async Task<HttpResponseData> GetVolume(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "accounts/{accountName}/pools/{poolName}/volumes/{volumeName}")] HttpRequestData req,
            string accountName,
            string poolName,
            string volumeName)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("GetVolume function processing request {RequestId} for volume {VolumeName}", requestId, volumeName);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.volumes.read"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, $"volume/{volumeName}", "read");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                var resourceGroup = req.Query["resourceGroup"];
                if (string.IsNullOrWhiteSpace(resourceGroup))
                {
                    return await CreateBadRequestResponse(req, "Resource group is required", requestId);
                }

                // Get volume
                var volume = await _anfService.GetVolumeAsync(resourceGroup, accountName, poolName, volumeName);
                if (volume == null)
                {
                    return await CreateNotFoundResponse(req, $"Volume '{volumeName}' not found", requestId);
                }

                // Map to response model
                var response = MapVolumeToModel(volume);

                _logger.LogInformation("Successfully retrieved volume {VolumeName} for request {RequestId}", volumeName, requestId);

                return await CreateSuccessResponse(req, response, requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing GetVolume request {RequestId} for volume {VolumeName}", 
                    requestId, volumeName);
                return await CreateErrorResponse(req, "Failed to retrieve volume", requestId);
            }
        }

        /// <summary>
        /// Creates a new volume
        /// </summary>
        [Function("CreateVolume")]
        public async Task<HttpResponseData> CreateVolume(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "accounts/{accountName}/pools/{poolName}/volumes")] HttpRequestData req,
            string accountName,
            string poolName)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("CreateVolume function processing request {RequestId} for pool {PoolName}", requestId, poolName);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.volumes.write"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, "volumes", "create");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                // Parse request body
                var createRequest = await req.ReadFromJsonAsync<CreateVolumeRequest>();
                if (createRequest == null)
                {
                    return await CreateBadRequestResponse(req, "Invalid request body", requestId);
                }

                // Validate request
                var validationErrors = ValidateCreateVolumeRequest(createRequest);
                if (validationErrors.Any())
                {
                    return await CreateValidationErrorResponse(req, validationErrors, requestId);
                }

                var resourceGroup = req.Query["resourceGroup"];
                if (string.IsNullOrWhiteSpace(resourceGroup))
                {
                    return await CreateBadRequestResponse(req, "Resource group is required", requestId);
                }

                // Get capacity pool to determine location
                var pool = await _anfService.GetCapacityPoolAsync(resourceGroup, accountName, poolName);
                if (pool == null)
                {
                    return await CreateNotFoundResponse(req, $"Capacity pool '{poolName}' not found", requestId);
                }

                // Create volume data
                var volumeData = new NetAppVolumeData(pool.Data.Location, createRequest.CreationToken, createRequest.SubnetId)
                {
                    UsageThreshold = createRequest.SizeInGiB * 1024L * 1024L * 1024L, // Convert GiB to bytes
                    ServiceLevel = pool.Data.ServiceLevel,
                    Tags = createRequest.Tags,
                    SnapshotDirectoryVisible = createRequest.SnapshotDirectoryVisible
                };

                // Set protocol types
                foreach (var protocol in createRequest.ProtocolTypes)
                {
                    volumeData.ProtocolTypes.Add(protocol);
                }

                // Set export policy if provided
                if (createRequest.ExportPolicy != null)
                {
                    volumeData.ExportPolicy = MapExportPolicyToNetApp(createRequest.ExportPolicy);
                }

                // Create volume
                var volume = await _anfService.CreateVolumeAsync(resourceGroup, accountName, poolName, createRequest.Name, volumeData);

                // Map to response model
                var response = MapVolumeToModel(volume);

                _logger.LogInformation("Successfully created volume {VolumeName} in pool {PoolName} for request {RequestId}", 
                    createRequest.Name, poolName, requestId);

                var httpResponse = await CreateSuccessResponse(req, response, requestId);
                httpResponse.StatusCode = HttpStatusCode.Created;
                return httpResponse;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing CreateVolume request {RequestId}", requestId);
                return await CreateErrorResponse(req, "Failed to create volume", requestId);
            }
        }

        /// <summary>
        /// Updates an existing volume
        /// </summary>
        [Function("UpdateVolume")]
        public async Task<HttpResponseData> UpdateVolume(
            [HttpTrigger(AuthorizationLevel.Function, "put", "patch", Route = "accounts/{accountName}/pools/{poolName}/volumes/{volumeName}")] HttpRequestData req,
            string accountName,
            string poolName,
            string volumeName)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("UpdateVolume function processing request {RequestId} for volume {VolumeName}", requestId, volumeName);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.volumes.write"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, $"volume/{volumeName}", "update");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                var resourceGroup = req.Query["resourceGroup"];
                if (string.IsNullOrWhiteSpace(resourceGroup))
                {
                    return await CreateBadRequestResponse(req, "Resource group is required", requestId);
                }

                // Get existing volume
                var volume = await _anfService.GetVolumeAsync(resourceGroup, accountName, poolName, volumeName);
                if (volume == null)
                {
                    return await CreateNotFoundResponse(req, $"Volume '{volumeName}' not found", requestId);
                }

                // Parse update request
                var updateRequest = await req.ReadFromJsonAsync<Dictionary<string, object>>();
                if (updateRequest == null)
                {
                    return await CreateBadRequestResponse(req, "Invalid request body", requestId);
                }

                var volumePatch = new NetAppVolumePatch();

                // Apply updates
                if (updateRequest.ContainsKey("sizeInGiB") && updateRequest["sizeInGiB"] is long sizeInGiB)
                {
                    volumePatch.UsageThreshold = sizeInGiB * 1024L * 1024L * 1024L;
                }

                if (updateRequest.ContainsKey("tags") && updateRequest["tags"] is Dictionary<string, string> tags)
                {
                    volumePatch.Tags = tags;
                }

                if (updateRequest.ContainsKey("exportPolicy") && updateRequest["exportPolicy"] is ExportPolicy exportPolicy)
                {
                    volumePatch.ExportPolicy = MapExportPolicyToNetApp(exportPolicy);
                }

                // Update volume
                var updatedVolume = await _anfService.UpdateVolumeAsync(resourceGroup, accountName, poolName, volumeName, volumePatch);

                // Map to response model
                var response = MapVolumeToModel(updatedVolume);

                _logger.LogInformation("Successfully updated volume {VolumeName} for request {RequestId}", volumeName, requestId);

                return await CreateSuccessResponse(req, response, requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing UpdateVolume request {RequestId} for volume {VolumeName}", 
                    requestId, volumeName);
                return await CreateErrorResponse(req, "Failed to update volume", requestId);
            }
        }

        /// <summary>
        /// Deletes a volume
        /// </summary>
        [Function("DeleteVolume")]
        public async Task<HttpResponseData> DeleteVolume(
            [HttpTrigger(AuthorizationLevel.Function, "delete", Route = "accounts/{accountName}/pools/{poolName}/volumes/{volumeName}")] HttpRequestData req,
            string accountName,
            string poolName,
            string volumeName)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("DeleteVolume function processing request {RequestId} for volume {VolumeName}", requestId, volumeName);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.volumes.delete"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, $"volume/{volumeName}", "delete");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                var resourceGroup = req.Query["resourceGroup"];
                if (string.IsNullOrWhiteSpace(resourceGroup))
                {
                    return await CreateBadRequestResponse(req, "Resource group is required", requestId);
                }

                // Check if volume exists
                var volume = await _anfService.GetVolumeAsync(resourceGroup, accountName, poolName, volumeName);
                if (volume == null)
                {
                    return await CreateNotFoundResponse(req, $"Volume '{volumeName}' not found", requestId);
                }

                // Check if volume has snapshots
                var snapshots = await _anfService.ListSnapshotsAsync(resourceGroup, accountName, poolName, volumeName);
                if (snapshots.Any())
                {
                    return await CreateConflictResponse(req, 
                        $"Cannot delete volume '{volumeName}' because it contains {snapshots.Count()} snapshots", 
                        requestId);
                }

                // Delete volume
                await _anfService.DeleteVolumeAsync(resourceGroup, accountName, poolName, volumeName);

                _logger.LogInformation("Successfully deleted volume {VolumeName} for request {RequestId}", volumeName, requestId);

                var response = new
                {
                    message = $"Volume '{volumeName}' deleted successfully",
                    volumeName = volumeName,
                    poolName = poolName,
                    accountName = accountName
                };

                return await CreateSuccessResponse(req, response, requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing DeleteVolume request {RequestId} for volume {VolumeName}", 
                    requestId, volumeName);
                return await CreateErrorResponse(req, "Failed to delete volume", requestId);
            }
        }

        /// <summary>
        /// Resizes a volume
        /// </summary>
        [Function("ResizeVolume")]
        public async Task<HttpResponseData> ResizeVolume(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/resize")] HttpRequestData req,
            string accountName,
            string poolName,
            string volumeName)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("ResizeVolume function processing request {RequestId} for volume {VolumeName}", requestId, volumeName);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.volumes.write"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, $"volume/{volumeName}", "resize");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                var resourceGroup = req.Query["resourceGroup"];
                if (string.IsNullOrWhiteSpace(resourceGroup))
                {
                    return await CreateBadRequestResponse(req, "Resource group is required", requestId);
                }

                // Parse resize request
                var resizeRequest = await req.ReadFromJsonAsync<ResizeVolumeRequest>();
                if (resizeRequest == null || resizeRequest.NewSizeInGiB <= 0)
                {
                    return await CreateBadRequestResponse(req, "Invalid resize request. NewSizeInGiB must be greater than 0", requestId);
                }

                // Validate size (100 GiB to 100 TiB)
                if (resizeRequest.NewSizeInGiB < 100 || resizeRequest.NewSizeInGiB > 102400)
                {
                    return await CreateBadRequestResponse(req, "Volume size must be between 100 GiB and 100 TiB", requestId);
                }

                // Get current volume
                var currentVolume = await _anfService.GetVolumeAsync(resourceGroup, accountName, poolName, volumeName);
                if (currentVolume == null)
                {
                    return await CreateNotFoundResponse(req, $"Volume '{volumeName}' not found", requestId);
                }

                var currentSizeInGiB = currentVolume.Data.UsageThreshold / (1024L * 1024L * 1024L);
                if (resizeRequest.NewSizeInGiB == currentSizeInGiB)
                {
                    return await CreateBadRequestResponse(req, $"Volume is already {currentSizeInGiB} GiB", requestId);
                }

                // Resize volume
                var newSizeInBytes = resizeRequest.NewSizeInGiB * 1024L * 1024L * 1024L;
                var resizedVolume = await _anfService.ResizeVolumeAsync(resourceGroup, accountName, poolName, volumeName, newSizeInBytes);

                // Map to response model
                var response = new
                {
                    volume = MapVolumeToModel(resizedVolume),
                    previousSizeInGiB = currentSizeInGiB,
                    newSizeInGiB = resizeRequest.NewSizeInGiB,
                    message = $"Volume '{volumeName}' resized from {currentSizeInGiB} GiB to {resizeRequest.NewSizeInGiB} GiB"
                };

                _logger.LogInformation("Successfully resized volume {VolumeName} from {OldSize} GiB to {NewSize} GiB for request {RequestId}", 
                    volumeName, currentSizeInGiB, resizeRequest.NewSizeInGiB, requestId);

                return await CreateSuccessResponse(req, response, requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing ResizeVolume request {RequestId} for volume {VolumeName}", 
                    requestId, volumeName);
                return await CreateErrorResponse(req, "Failed to resize volume", requestId);
            }
        }

        /// <summary>
        /// Analyzes volume performance using AI
        /// </summary>
        [Function("AnalyzeVolumePerformance")]
        public async Task<HttpResponseData> AnalyzeVolumePerformance(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/analyze-performance")] HttpRequestData req,
            string accountName,
            string poolName,
            string volumeName)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("AnalyzeVolumePerformance function processing request {RequestId} for volume {VolumeName}", requestId, volumeName);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.volumes.read"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, $"volume/{volumeName}", "analyze");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                var resourceGroup = req.Query["resourceGroup"];
                if (string.IsNullOrWhiteSpace(resourceGroup))
                {
                    return await CreateBadRequestResponse(req, "Resource group is required", requestId);
                }

                // Parse analysis request
                var analysisRequest = await req.ReadFromJsonAsync<PerformanceAnalysisRequest>();
                var timeRange = analysisRequest?.TimeRange ?? "24 hours";

                // Validate time range
                if (!_promptLibrary.ValidateUserInput(timeRange, "time_range"))
                {
                    return await CreateBadRequestResponse(req, "Invalid time range format", requestId);
                }

                // Get volume details
                var volume = await _anfService.GetVolumeAsync(resourceGroup, accountName, poolName, volumeName);
                if (volume == null)
                {
                    return await CreateNotFoundResponse(req, $"Volume '{volumeName}' not found", requestId);
                }

                // Create AI prompt for performance analysis
                var promptParams = new Dictionary<string, string>
                {
                    ["volumeName"] = volumeName,
                    ["poolName"] = poolName,
                    ["timeRange"] = timeRange
                };

                var aiPrompt = _promptLibrary.GetPrompt("analyze_volume_performance", promptParams);

                // In production, this would call the AI service
                // For now, return a structured response
                var response = new
                {
                    volumeName = volumeName,
                    timeRange = timeRange,
                    analysis = new
                    {
                        summary = $"Performance analysis for volume '{volumeName}' over {timeRange}",
                        currentMetrics = new
                        {
                            sizeInGiB = volume.Data.UsageThreshold / (1024L * 1024L * 1024L),
                            serviceLevel = volume.Data.ServiceLevel.ToString(),
                            protocolTypes = volume.Data.ProtocolTypes.ToArray()
                        },
                        recommendations = new[]
                        {
                            "Consider upgrading to Premium service level for better IOPS",
                            "Enable snapshot scheduling for data protection",
                            "Monitor capacity utilization - currently at 75%"
                        },
                        aiPromptUsed = aiPrompt
                    }
                };

                _logger.LogInformation("Successfully analyzed performance for volume {VolumeName} for request {RequestId}", 
                    volumeName, requestId);

                return await CreateSuccessResponse(req, response, requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing AnalyzeVolumePerformance request {RequestId} for volume {VolumeName}", 
                    requestId, volumeName);
                return await CreateErrorResponse(req, "Failed to analyze volume performance", requestId);
            }
        }

        #region Helper Methods

        /// <summary>
        /// Maps volume resource to response model
        /// </summary>
        private Volume MapVolumeToModel(Azure.ResourceManager.NetApp.NetAppVolumeResource volume)
        {
            return new Volume
            {
                Id = volume.Id,
                Name = volume.Data.Name,
                AccountName = volume.Id.Parent?.Parent?.Name ?? string.Empty,
                PoolName = volume.Id.Parent?.Name ?? string.Empty,
                CreationToken = volume.Data.CreationToken,
                ServiceLevel = volume.Data.ServiceLevel?.ToString() ?? "Standard",
                UsageThreshold = volume.Data.UsageThreshold,
                ProvisioningState = volume.Data.ProvisioningState,
                SubnetId = volume.Data.SubnetId?.ToString() ?? string.Empty,
                ProtocolTypes = volume.Data.ProtocolTypes?.ToList(),
                SnapshotDirectoryVisible = volume.Data.IsSnapshotDirectoryVisible,
                Tags = volume.Data.Tags?.ToDictionary(kvp => kvp.Key, kvp => kvp.Value),
                ExportPolicy = MapExportPolicyFromNetApp(volume.Data.ExportPolicy),
                MountTargets = volume.Data.MountTargets?.Select(mt => new MountTarget
                {
                    MountTargetId = mt.MountTargetId?.ToString(),
                    FileSystemId = mt.FileSystemId?.ToString(),
                    IpAddress = mt.IPAddress
                }).ToList()
            };
        }

        /// <summary>
        /// Maps export policy to NetApp model
        /// </summary>
        private VolumePropertiesExportPolicy MapExportPolicyToNetApp(ExportPolicy exportPolicy)
        {
            var netAppPolicy = new VolumePropertiesExportPolicy();

            if (exportPolicy.Rules != null)
            {
                foreach (var rule in exportPolicy.Rules)
                {
                    netAppPolicy.Rules.Add(new ExportPolicyRule
                    {
                        RuleIndex = rule.RuleIndex,
                        IsUnixReadOnly = rule.UnixReadOnly,
                        IsUnixReadWrite = rule.UnixReadWrite,
                        IsKerberos5ReadOnly = rule.Kerberos5ReadOnly ?? false,
                        IsKerberos5ReadWrite = rule.Kerberos5ReadWrite ?? false,
                        IsKerberos5IReadOnly = false,
                        IsKerberos5IReadWrite = false,
                        IsKerberos5PReadOnly = false,
                        IsKerberos5PReadWrite = false,
                        AllowedClients = rule.AllowedClients,
                        HasRootAccess = rule.HasRootAccess ?? true,
                        IsNfsv3 = rule.Nfsv3 ?? true,
                        IsNfsv41 = rule.Nfsv41 ?? false
                    });
                }
            }

            return netAppPolicy;
        }

        /// <summary>
        /// Maps export policy from NetApp model
        /// </summary>
        private ExportPolicy? MapExportPolicyFromNetApp(VolumePropertiesExportPolicy? netAppPolicy)
        {
            if (netAppPolicy == null)
                return null;

            return new ExportPolicy
            {
                Rules = netAppPolicy.Rules?.Select(r => new ExportPolicyRule
                {
                    RuleIndex = r.RuleIndex ?? 0,
                    UnixReadOnly = r.IsUnixReadOnly ?? false,
                    UnixReadWrite = r.IsUnixReadWrite ?? false,
                    Kerberos5ReadOnly = r.IsKerberos5ReadOnly,
                    Kerberos5ReadWrite = r.IsKerberos5ReadWrite,
                    Nfsv3 = r.IsNfsv3,
                    Nfsv41 = r.IsNfsv41,
                    AllowedClients = r.AllowedClients,
                    HasRootAccess = r.HasRootAccess
                }).ToList()
            };
        }

        /// <summary>
        /// Validates create volume request
        /// </summary>
        private Dictionary<string, List<string>> ValidateCreateVolumeRequest(CreateVolumeRequest request)
        {
            var errors = new Dictionary<string, List<string>>();

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                errors["name"] = new List<string> { "Volume name is required" };
            }
            else if (!System.Text.RegularExpressions.Regex.IsMatch(request.Name, @"^[a-zA-Z][a-zA-Z0-9\-_]{2,63}$"))
            {
                errors["name"] = new List<string> { "Volume name must be 3-64 characters, start with a letter, and contain only letters, numbers, hyphens, and underscores" };
            }

            if (string.IsNullOrWhiteSpace(request.CreationToken))
            {
                errors["creationToken"] = new List<string> { "Creation token is required" };
            }

            if (request.SizeInGiB < 100 || request.SizeInGiB > 102400)
            {
                errors["sizeInGiB"] = new List<string> { "Volume size must be between 100 GiB and 100 TiB (102400 GiB)" };
            }

            if (string.IsNullOrWhiteSpace(request.SubnetId))
            {
                errors["subnetId"] = new List<string> { "Subnet ID is required" };
            }

            if (!request.ProtocolTypes.Any())
            {
                errors["protocolTypes"] = new List<string> { "At least one protocol type is required" };
            }

            return errors;
        }

        /// <summary>
        /// Creates a success response
        /// </summary>
        private async Task<HttpResponseData> CreateSuccessResponse<T>(HttpRequestData req, T data, string requestId)
        {
            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new ApiResponse<T>
            {
                Success = true,
                Data = data,
                RequestId = requestId,
                Timestamp = DateTime.UtcNow
            });
            return response;
        }

        /// <summary>
        /// Creates an error response
        /// </summary>
        private async Task<HttpResponseData> CreateErrorResponse(HttpRequestData req, string error, string requestId)
        {
            var response = req.CreateResponse(HttpStatusCode.InternalServerError);
            await response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Error = error,
                RequestId = requestId,
                Timestamp = DateTime.UtcNow
            });
            return response;
        }

        /// <summary>
        /// Creates a bad request response
        /// </summary>
        private async Task<HttpResponseData> CreateBadRequestResponse(HttpRequestData req, string error, string requestId)
        {
            var response = req.CreateResponse(HttpStatusCode.BadRequest);
            await response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Error = error,
                RequestId = requestId,
                Timestamp = DateTime.UtcNow
            });
            return response;
        }

        /// <summary>
        /// Creates an unauthorized response
        /// </summary>
        private async Task<HttpResponseData> CreateUnauthorizedResponse(HttpRequestData req, string error)
        {
            var response = req.CreateResponse(HttpStatusCode.Unauthorized);
            await response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Error = error,
                Timestamp = DateTime.UtcNow
            });
            return response;
        }

        /// <summary>
        /// Creates a forbidden response
        /// </summary>
        private async Task<HttpResponseData> CreateForbiddenResponse(HttpRequestData req, string error)
        {
            var response = req.CreateResponse(HttpStatusCode.Forbidden);
            await response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Error = error,
                Timestamp = DateTime.UtcNow
            });
            return response;
        }

        /// <summary>
        /// Creates a not found response
        /// </summary>
        private async Task<HttpResponseData> CreateNotFoundResponse(HttpRequestData req, string error, string requestId)
        {
            var response = req.CreateResponse(HttpStatusCode.NotFound);
            await response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Error = error,
                RequestId = requestId,
                Timestamp = DateTime.UtcNow
            });
            return response;
        }

        /// <summary>
        /// Creates a conflict response
        /// </summary>
        private async Task<HttpResponseData> CreateConflictResponse(HttpRequestData req, string error, string requestId)
        {
            var response = req.CreateResponse(HttpStatusCode.Conflict);
            await response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Error = error,
                RequestId = requestId,
                Timestamp = DateTime.UtcNow
            });
            return response;
        }

        /// <summary>
        /// Creates a validation error response
        /// </summary>
        private async Task<HttpResponseData> CreateValidationErrorResponse(HttpRequestData req, 
            Dictionary<string, List<string>> errors, string requestId)
        {
            var response = req.CreateResponse(HttpStatusCode.BadRequest);
            await response.WriteAsJsonAsync(new ApiResponse<object>
            {
                Success = false,
                Error = "Validation failed",
                Details = new Dictionary<string, object> { ["validationErrors"] = errors },
                RequestId = requestId,
                Timestamp = DateTime.UtcNow
            });
            return response;
        }

        #endregion

        #region Request Models

        /// <summary>
        /// Request model for resizing a volume
        /// </summary>
        private class ResizeVolumeRequest
        {
            public int NewSizeInGiB { get; set; }
        }

        /// <summary>
        /// Request model for performance analysis
        /// </summary>
        private class PerformanceAnalysisRequest
        {
            public string TimeRange { get; set; } = "24 hours";
        }

        #endregion
    }
}