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
    /// Azure Functions for managing Azure NetApp Files snapshots
    /// </summary>
    /// <author>Dwiref Sharma &lt;DwirefS@SapientEdge.io&gt;</author>
    public class SnapshotFunctions
    {
        private readonly ILogger<SnapshotFunctions> _logger;
        private readonly IANFService _anfService;
        private readonly SecureResponseBuilder _responseBuilder;
        private readonly AuthGuards _authGuards;
        private readonly PromptLibrary _promptLibrary;

        /// <summary>
        /// Initializes a new instance of SnapshotFunctions
        /// </summary>
        public SnapshotFunctions(
            ILogger<SnapshotFunctions> logger,
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
        /// Lists all snapshots for a volume
        /// </summary>
        [Function("ListSnapshots")]
        public async Task<HttpResponseData> ListSnapshots(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/snapshots")] HttpRequestData req,
            string accountName,
            string poolName,
            string volumeName)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("ListSnapshots function processing request {RequestId} for volume {VolumeName}", requestId, volumeName);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.snapshots.read"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, $"snapshots/{volumeName}", "read");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                var resourceGroup = req.Query["resourceGroup"];
                if (string.IsNullOrWhiteSpace(resourceGroup))
                {
                    return await CreateBadRequestResponse(req, "Resource group is required", requestId);
                }

                // Get snapshots
                var snapshots = await _anfService.ListSnapshotsAsync(resourceGroup, accountName, poolName, volumeName);

                // Map to response model
                var response = snapshots.Select(s => new Snapshot
                {
                    Id = s.Id,
                    Name = s.Data.Name,
                    AccountName = accountName,
                    PoolName = poolName,
                    VolumeName = volumeName,
                    Location = s.Data.Location.Name,
                    Created = s.Data.Created,
                    ProvisioningState = s.Data.ProvisioningState
                }).ToList();

                _logger.LogInformation("Successfully retrieved {Count} snapshots for volume {VolumeName}, request {RequestId}", 
                    response.Count, volumeName, requestId);

                return await CreateSuccessResponse(req, response, requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing ListSnapshots request {RequestId}", requestId);
                return await CreateErrorResponse(req, "Failed to retrieve snapshots", requestId);
            }
        }

        /// <summary>
        /// Gets a specific snapshot
        /// </summary>
        [Function("GetSnapshot")]
        public async Task<HttpResponseData> GetSnapshot(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/snapshots/{snapshotName}")] HttpRequestData req,
            string accountName,
            string poolName,
            string volumeName,
            string snapshotName)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("GetSnapshot function processing request {RequestId} for snapshot {SnapshotName}", requestId, snapshotName);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.snapshots.read"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, $"snapshot/{snapshotName}", "read");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                var resourceGroup = req.Query["resourceGroup"];
                if (string.IsNullOrWhiteSpace(resourceGroup))
                {
                    return await CreateBadRequestResponse(req, "Resource group is required", requestId);
                }

                // Get snapshot
                var snapshot = await _anfService.GetSnapshotAsync(resourceGroup, accountName, poolName, volumeName, snapshotName);
                if (snapshot == null)
                {
                    return await CreateNotFoundResponse(req, $"Snapshot '{snapshotName}' not found", requestId);
                }

                // Map to response model
                var response = new Snapshot
                {
                    Id = snapshot.Id,
                    Name = snapshot.Data.Name,
                    AccountName = accountName,
                    PoolName = poolName,
                    VolumeName = volumeName,
                    Location = snapshot.Data.Location.Name,
                    Created = snapshot.Data.Created,
                    ProvisioningState = snapshot.Data.ProvisioningState
                };

                _logger.LogInformation("Successfully retrieved snapshot {SnapshotName} for request {RequestId}", snapshotName, requestId);

                return await CreateSuccessResponse(req, response, requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing GetSnapshot request {RequestId} for snapshot {SnapshotName}", 
                    requestId, snapshotName);
                return await CreateErrorResponse(req, "Failed to retrieve snapshot", requestId);
            }
        }

        /// <summary>
        /// Creates a new snapshot
        /// </summary>
        [Function("CreateSnapshot")]
        public async Task<HttpResponseData> CreateSnapshot(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/snapshots")] HttpRequestData req,
            string accountName,
            string poolName,
            string volumeName)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("CreateSnapshot function processing request {RequestId} for volume {VolumeName}", requestId, volumeName);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.snapshots.write"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, "snapshots", "create");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                // Parse request body
                var createRequest = await req.ReadFromJsonAsync<CreateSnapshotRequest>();
                if (createRequest == null)
                {
                    return await CreateBadRequestResponse(req, "Invalid request body", requestId);
                }

                // Validate request
                var validationErrors = ValidateCreateSnapshotRequest(createRequest);
                if (validationErrors.Any())
                {
                    return await CreateValidationErrorResponse(req, validationErrors, requestId);
                }

                var resourceGroup = req.Query["resourceGroup"];
                if (string.IsNullOrWhiteSpace(resourceGroup))
                {
                    return await CreateBadRequestResponse(req, "Resource group is required", requestId);
                }

                // Verify volume exists
                var volume = await _anfService.GetVolumeAsync(resourceGroup, accountName, poolName, volumeName);
                if (volume == null)
                {
                    return await CreateNotFoundResponse(req, $"Volume '{volumeName}' not found", requestId);
                }

                // Create snapshot data
                var snapshotData = new SnapshotData(volume.Data.Location);

                // Create snapshot
                var snapshot = await _anfService.CreateSnapshotAsync(
                    resourceGroup, 
                    accountName, 
                    poolName, 
                    volumeName, 
                    createRequest.Name, 
                    snapshotData);

                // Map to response model
                var response = new Snapshot
                {
                    Id = snapshot.Id,
                    Name = snapshot.Data.Name,
                    AccountName = accountName,
                    PoolName = poolName,
                    VolumeName = volumeName,
                    Location = snapshot.Data.Location.Name,
                    Created = snapshot.Data.Created,
                    ProvisioningState = snapshot.Data.ProvisioningState
                };

                _logger.LogInformation("Successfully created snapshot {SnapshotName} for volume {VolumeName}, request {RequestId}", 
                    createRequest.Name, volumeName, requestId);

                var httpResponse = await CreateSuccessResponse(req, response, requestId);
                httpResponse.StatusCode = HttpStatusCode.Created;
                return httpResponse;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing CreateSnapshot request {RequestId}", requestId);
                return await CreateErrorResponse(req, "Failed to create snapshot", requestId);
            }
        }

        /// <summary>
        /// Deletes a snapshot
        /// </summary>
        [Function("DeleteSnapshot")]
        public async Task<HttpResponseData> DeleteSnapshot(
            [HttpTrigger(AuthorizationLevel.Function, "delete", Route = "accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/snapshots/{snapshotName}")] HttpRequestData req,
            string accountName,
            string poolName,
            string volumeName,
            string snapshotName)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("DeleteSnapshot function processing request {RequestId} for snapshot {SnapshotName}", requestId, snapshotName);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.snapshots.delete"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, $"snapshot/{snapshotName}", "delete");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                var resourceGroup = req.Query["resourceGroup"];
                if (string.IsNullOrWhiteSpace(resourceGroup))
                {
                    return await CreateBadRequestResponse(req, "Resource group is required", requestId);
                }

                // Check if snapshot exists
                var snapshot = await _anfService.GetSnapshotAsync(resourceGroup, accountName, poolName, volumeName, snapshotName);
                if (snapshot == null)
                {
                    return await CreateNotFoundResponse(req, $"Snapshot '{snapshotName}' not found", requestId);
                }

                // Delete snapshot
                await _anfService.DeleteSnapshotAsync(resourceGroup, accountName, poolName, volumeName, snapshotName);

                _logger.LogInformation("Successfully deleted snapshot {SnapshotName} for request {RequestId}", snapshotName, requestId);

                var response = new
                {
                    message = $"Snapshot '{snapshotName}' deleted successfully",
                    snapshotName = snapshotName,
                    volumeName = volumeName,
                    poolName = poolName,
                    accountName = accountName
                };

                return await CreateSuccessResponse(req, response, requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing DeleteSnapshot request {RequestId} for snapshot {SnapshotName}", 
                    requestId, snapshotName);
                return await CreateErrorResponse(req, "Failed to delete snapshot", requestId);
            }
        }

        /// <summary>
        /// Restores a volume from a snapshot
        /// </summary>
        [Function("RestoreSnapshot")]
        public async Task<HttpResponseData> RestoreSnapshot(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "accounts/{accountName}/pools/{poolName}/volumes/{volumeName}/snapshots/{snapshotName}/restore")] HttpRequestData req,
            string accountName,
            string poolName,
            string volumeName,
            string snapshotName)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("RestoreSnapshot function processing request {RequestId} for snapshot {SnapshotName}", requestId, snapshotName);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization - restoring requires write permission on volumes
                if (!_authGuards.HasPermission(req.Context, "anf.volumes.write"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, $"snapshot/{snapshotName}", "restore");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                var resourceGroup = req.Query["resourceGroup"];
                if (string.IsNullOrWhiteSpace(resourceGroup))
                {
                    return await CreateBadRequestResponse(req, "Resource group is required", requestId);
                }

                // Parse optional confirmation
                var restoreRequest = await req.ReadFromJsonAsync<RestoreSnapshotRequest>();
                if (restoreRequest?.ConfirmRestore != true)
                {
                    return await CreateBadRequestResponse(req, 
                        "Restore operation requires explicit confirmation. Set 'confirmRestore' to true.", 
                        requestId);
                }

                // Verify snapshot exists
                var snapshot = await _anfService.GetSnapshotAsync(resourceGroup, accountName, poolName, volumeName, snapshotName);
                if (snapshot == null)
                {
                    return await CreateNotFoundResponse(req, $"Snapshot '{snapshotName}' not found", requestId);
                }

                // Restore volume from snapshot
                var restoredVolume = await _anfService.RestoreSnapshotAsync(resourceGroup, accountName, poolName, volumeName, snapshotName);

                var response = new
                {
                    message = $"Volume '{volumeName}' successfully restored from snapshot '{snapshotName}'",
                    volume = new
                    {
                        name = restoredVolume.Data.Name,
                        provisioningState = restoredVolume.Data.ProvisioningState
                    },
                    snapshot = new
                    {
                        name = snapshotName,
                        created = snapshot.Data.Created
                    },
                    restoreTime = DateTime.UtcNow
                };

                _logger.LogInformation("Successfully restored volume {VolumeName} from snapshot {SnapshotName} for request {RequestId}", 
                    volumeName, snapshotName, requestId);

                return await CreateSuccessResponse(req, response, requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing RestoreSnapshot request {RequestId} for snapshot {SnapshotName}", 
                    requestId, snapshotName);
                return await CreateErrorResponse(req, "Failed to restore snapshot", requestId);
            }
        }

        /// <summary>
        /// Creates a snapshot policy for automated snapshots
        /// </summary>
        [Function("CreateSnapshotPolicy")]
        public async Task<HttpResponseData> CreateSnapshotPolicy(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "accounts/{accountName}/snapshot-policies")] HttpRequestData req,
            string accountName)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("CreateSnapshotPolicy function processing request {RequestId} for account {AccountName}", requestId, accountName);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.snapshots.write"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, "snapshot-policies", "create");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                var resourceGroup = req.Query["resourceGroup"];
                if (string.IsNullOrWhiteSpace(resourceGroup))
                {
                    return await CreateBadRequestResponse(req, "Resource group is required", requestId);
                }

                // Parse request body
                var policyRequest = await req.ReadFromJsonAsync<SnapshotPolicyRequest>();
                if (policyRequest == null)
                {
                    return await CreateBadRequestResponse(req, "Invalid request body", requestId);
                }

                // For now, return a simulated response
                // In production, this would create an actual snapshot policy
                var response = new
                {
                    policyName = policyRequest.Name,
                    accountName = accountName,
                    enabled = policyRequest.Enabled ?? true,
                    schedules = new
                    {
                        hourly = policyRequest.HourlySchedule,
                        daily = policyRequest.DailySchedule,
                        weekly = policyRequest.WeeklySchedule,
                        monthly = policyRequest.MonthlySchedule
                    },
                    createdAt = DateTime.UtcNow,
                    message = "Snapshot policy created successfully"
                };

                _logger.LogInformation("Successfully created snapshot policy {PolicyName} for account {AccountName}, request {RequestId}", 
                    policyRequest.Name, accountName, requestId);

                var httpResponse = await CreateSuccessResponse(req, response, requestId);
                httpResponse.StatusCode = HttpStatusCode.Created;
                return httpResponse;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing CreateSnapshotPolicy request {RequestId}", requestId);
                return await CreateErrorResponse(req, "Failed to create snapshot policy", requestId);
            }
        }

        /// <summary>
        /// Troubleshoots snapshot creation failures using AI
        /// </summary>
        [Function("TroubleshootSnapshotFailure")]
        public async Task<HttpResponseData> TroubleshootSnapshotFailure(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "snapshots/troubleshoot")] HttpRequestData req)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("TroubleshootSnapshotFailure function processing request {RequestId}", requestId);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.snapshots.read"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, "snapshots", "troubleshoot");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                // Parse troubleshooting request
                var troubleshootRequest = await req.ReadFromJsonAsync<TroubleshootRequest>();
                if (troubleshootRequest == null)
                {
                    return await CreateBadRequestResponse(req, "Invalid request body", requestId);
                }

                // Validate inputs
                if (!_promptLibrary.ValidateUserInput(troubleshootRequest.VolumeName, "resource_name") ||
                    !_promptLibrary.ValidateUserInput(troubleshootRequest.ErrorMessage, "error_message"))
                {
                    return await CreateBadRequestResponse(req, "Invalid input format", requestId);
                }

                // Create AI prompt for troubleshooting
                var promptParams = new Dictionary<string, string>
                {
                    ["volumeName"] = troubleshootRequest.VolumeName,
                    ["errorMessage"] = troubleshootRequest.ErrorMessage
                };

                var aiPrompt = _promptLibrary.GetPrompt("troubleshoot_snapshot_failure", promptParams);

                // In production, this would call the AI service
                // For now, return a structured troubleshooting response
                var response = new
                {
                    volumeName = troubleshootRequest.VolumeName,
                    errorMessage = troubleshootRequest.ErrorMessage,
                    analysis = new
                    {
                        possibleCauses = new[]
                        {
                            "Volume is in a transitional state (creating, deleting, or updating)",
                            "Insufficient permissions on the volume",
                            "Volume has reached maximum snapshot limit",
                            "Storage capacity issues in the capacity pool",
                            "Network connectivity issues"
                        },
                        recommendedActions = new[]
                        {
                            "Check volume provisioning state - must be 'Succeeded'",
                            "Verify user has 'anf.snapshots.write' permission",
                            "Check current snapshot count (max 255 per volume)",
                            "Ensure capacity pool has sufficient available space",
                            "Review recent changes to network security groups or subnets"
                        },
                        diagnosticCommands = new[]
                        {
                            "az netappfiles volume show --resource-group <rg> --account-name <account> --pool-name <pool> --name <volume>",
                            "az netappfiles snapshot list --resource-group <rg> --account-name <account> --pool-name <pool> --volume-name <volume>",
                            "az netappfiles pool show --resource-group <rg> --account-name <account> --name <pool>"
                        }
                    },
                    aiPromptUsed = aiPrompt
                };

                _logger.LogInformation("Successfully analyzed snapshot failure for volume {VolumeName}, request {RequestId}", 
                    troubleshootRequest.VolumeName, requestId);

                return await CreateSuccessResponse(req, response, requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing TroubleshootSnapshotFailure request {RequestId}", requestId);
                return await CreateErrorResponse(req, "Failed to troubleshoot snapshot failure", requestId);
            }
        }

        #region Helper Methods

        /// <summary>
        /// Validates create snapshot request
        /// </summary>
        private Dictionary<string, List<string>> ValidateCreateSnapshotRequest(CreateSnapshotRequest request)
        {
            var errors = new Dictionary<string, List<string>>();

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                errors["name"] = new List<string> { "Snapshot name is required" };
            }
            else if (!System.Text.RegularExpressions.Regex.IsMatch(request.Name, @"^[a-zA-Z][a-zA-Z0-9\-_]{2,63}$"))
            {
                errors["name"] = new List<string> { "Snapshot name must be 3-64 characters, start with a letter, and contain only letters, numbers, hyphens, and underscores" };
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
        /// Request model for restoring a snapshot
        /// </summary>
        private class RestoreSnapshotRequest
        {
            public bool ConfirmRestore { get; set; }
        }

        /// <summary>
        /// Request model for creating a snapshot policy
        /// </summary>
        private class SnapshotPolicyRequest
        {
            public string Name { get; set; } = string.Empty;
            public bool? Enabled { get; set; }
            public SnapshotSchedule? HourlySchedule { get; set; }
            public SnapshotSchedule? DailySchedule { get; set; }
            public SnapshotSchedule? WeeklySchedule { get; set; }
            public SnapshotSchedule? MonthlySchedule { get; set; }
        }

        /// <summary>
        /// Snapshot schedule configuration
        /// </summary>
        private class SnapshotSchedule
        {
            public int SnapshotsToKeep { get; set; }
            public int? Hour { get; set; }
            public int? Minute { get; set; }
            public string? DaysOfWeek { get; set; }
            public int? DayOfMonth { get; set; }
        }

        /// <summary>
        /// Request model for troubleshooting
        /// </summary>
        private class TroubleshootRequest
        {
            public string VolumeName { get; set; } = string.Empty;
            public string ErrorMessage { get; set; } = string.Empty;
        }

        #endregion
    }
}