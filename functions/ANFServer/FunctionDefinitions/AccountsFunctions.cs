using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Azure.ResourceManager;
using Azure.ResourceManager.NetApp;
using Azure.ResourceManager.NetApp.Models;
using ANFServer.Models;
using ANFServer.Security;
using ANFServer.Services;
using System.Net;

namespace ANFServer.FunctionDefinitions
{
    /// <summary>
    /// Azure Functions for managing Azure NetApp Files accounts
    /// </summary>
    /// <author>Dwiref Sharma &lt;DwirefS@SapientEdge.io&gt;</author>
    public class AccountsFunctions
    {
        private readonly ILogger<AccountsFunctions> _logger;
        private readonly IANFService _anfService;
        private readonly SecureResponseBuilder _responseBuilder;
        private readonly AuthGuards _authGuards;

        /// <summary>
        /// Initializes a new instance of AccountsFunctions
        /// </summary>
        public AccountsFunctions(
            ILogger<AccountsFunctions> logger,
            IANFService anfService,
            SecureResponseBuilder responseBuilder,
            AuthGuards authGuards)
        {
            _logger = logger;
            _anfService = anfService;
            _responseBuilder = responseBuilder;
            _authGuards = authGuards;
        }

        /// <summary>
        /// Lists all NetApp accounts in the subscription
        /// </summary>
        /// <param name="req">HTTP request</param>
        /// <returns>List of NetApp accounts</returns>
        [Function("ListAccounts")]
        public async Task<HttpResponseData> ListAccounts(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "accounts")] HttpRequestData req)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("ListAccounts function processing request {RequestId}", requestId);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.accounts.read"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, "accounts", "read");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                // Get query parameters
                var resourceGroup = req.Query["resourceGroup"];
                var includeDetails = bool.TryParse(req.Query["includeDetails"], out var details) && details;

                // Get accounts
                var accounts = await _anfService.ListAccountsAsync(resourceGroup);

                // Map to response model
                var response = accounts.Select(a => new ANFAccount
                {
                    Id = a.Id,
                    Name = a.Data.Name,
                    Location = a.Data.Location.Name,
                    ResourceGroup = a.Id.ResourceGroupName,
                    ProvisioningState = a.Data.ProvisioningState?.ToString(),
                    Tags = a.Data.Tags?.ToDictionary(kvp => kvp.Key, kvp => kvp.Value),
                    ActiveDirectories = includeDetails ? MapActiveDirectories(a.Data.ActiveDirectories) : null
                }).ToList();

                _logger.LogInformation("Successfully retrieved {Count} accounts for request {RequestId}", 
                    response.Count, requestId);

                return await CreateSuccessResponse(req, response, requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing ListAccounts request {RequestId}", requestId);
                return await CreateErrorResponse(req, "Failed to retrieve accounts", requestId);
            }
        }

        /// <summary>
        /// Gets a specific NetApp account by name
        /// </summary>
        /// <param name="req">HTTP request</param>
        /// <param name="accountName">Account name</param>
        /// <returns>NetApp account details</returns>
        [Function("GetAccount")]
        public async Task<HttpResponseData> GetAccount(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "accounts/{accountName}")] HttpRequestData req,
            string accountName)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("GetAccount function processing request {RequestId} for account {AccountName}", 
                requestId, accountName);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.accounts.read"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, $"account/{accountName}", "read");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                // Validate input
                if (string.IsNullOrWhiteSpace(accountName))
                {
                    return await CreateBadRequestResponse(req, "Account name is required", requestId);
                }

                var resourceGroup = req.Query["resourceGroup"];
                if (string.IsNullOrWhiteSpace(resourceGroup))
                {
                    return await CreateBadRequestResponse(req, "Resource group is required", requestId);
                }

                // Get account
                var account = await _anfService.GetAccountAsync(resourceGroup, accountName);
                if (account == null)
                {
                    return await CreateNotFoundResponse(req, $"Account '{accountName}' not found", requestId);
                }

                // Map to response model
                var response = new ANFAccount
                {
                    Id = account.Id,
                    Name = account.Data.Name,
                    Location = account.Data.Location.Name,
                    ResourceGroup = account.Id.ResourceGroupName,
                    ProvisioningState = account.Data.ProvisioningState?.ToString(),
                    Tags = account.Data.Tags?.ToDictionary(kvp => kvp.Key, kvp => kvp.Value),
                    ActiveDirectories = MapActiveDirectories(account.Data.ActiveDirectories)
                };

                _logger.LogInformation("Successfully retrieved account {AccountName} for request {RequestId}", 
                    accountName, requestId);

                return await CreateSuccessResponse(req, response, requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing GetAccount request {RequestId} for account {AccountName}", 
                    requestId, accountName);
                return await CreateErrorResponse(req, "Failed to retrieve account", requestId);
            }
        }

        /// <summary>
        /// Creates a new NetApp account
        /// </summary>
        /// <param name="req">HTTP request</param>
        /// <returns>Created account details</returns>
        [Function("CreateAccount")]
        public async Task<HttpResponseData> CreateAccount(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "accounts")] HttpRequestData req)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("CreateAccount function processing request {RequestId}", requestId);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.accounts.write"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, "accounts", "create");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                // Parse request body
                var createRequest = await req.ReadFromJsonAsync<CreateAccountRequest>();
                if (createRequest == null)
                {
                    return await CreateBadRequestResponse(req, "Invalid request body", requestId);
                }

                // Validate request
                var validationErrors = ValidateCreateAccountRequest(createRequest);
                if (validationErrors.Any())
                {
                    return await CreateValidationErrorResponse(req, validationErrors, requestId);
                }

                // Create account data
                var accountData = new NetAppAccountData(createRequest.Location)
                {
                    Tags = createRequest.Tags
                };

                // Add Active Directory configurations if provided
                if (createRequest.ActiveDirectories != null)
                {
                    foreach (var ad in createRequest.ActiveDirectories)
                    {
                        accountData.ActiveDirectories.Add(new NetAppAccountActiveDirectory
                        {
                            ActiveDirectoryId = ad.ActiveDirectoryId,
                            Domain = ad.Domain,
                            Site = ad.Site,
                            SmbServerName = ad.SmbServerName,
                            OrganizationalUnit = ad.OrganizationalUnit
                        });
                    }
                }

                // Create account
                var account = await _anfService.CreateAccountAsync(
                    createRequest.ResourceGroup, 
                    createRequest.Name, 
                    accountData);

                // Map to response model
                var response = new ANFAccount
                {
                    Id = account.Id,
                    Name = account.Data.Name,
                    Location = account.Data.Location.Name,
                    ResourceGroup = account.Id.ResourceGroupName,
                    ProvisioningState = account.Data.ProvisioningState?.ToString(),
                    Tags = account.Data.Tags?.ToDictionary(kvp => kvp.Key, kvp => kvp.Value),
                    ActiveDirectories = MapActiveDirectories(account.Data.ActiveDirectories)
                };

                _logger.LogInformation("Successfully created account {AccountName} for request {RequestId}", 
                    createRequest.Name, requestId);

                var httpResponse = await CreateSuccessResponse(req, response, requestId);
                httpResponse.StatusCode = HttpStatusCode.Created;
                return httpResponse;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing CreateAccount request {RequestId}", requestId);
                return await CreateErrorResponse(req, "Failed to create account", requestId);
            }
        }

        /// <summary>
        /// Updates an existing NetApp account
        /// </summary>
        /// <param name="req">HTTP request</param>
        /// <param name="accountName">Account name</param>
        /// <returns>Updated account details</returns>
        [Function("UpdateAccount")]
        public async Task<HttpResponseData> UpdateAccount(
            [HttpTrigger(AuthorizationLevel.Function, "put", "patch", Route = "accounts/{accountName}")] HttpRequestData req,
            string accountName)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("UpdateAccount function processing request {RequestId} for account {AccountName}", 
                requestId, accountName);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.accounts.write"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, $"account/{accountName}", "update");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                var resourceGroup = req.Query["resourceGroup"];
                if (string.IsNullOrWhiteSpace(resourceGroup))
                {
                    return await CreateBadRequestResponse(req, "Resource group is required", requestId);
                }

                // Get existing account
                var account = await _anfService.GetAccountAsync(resourceGroup, accountName);
                if (account == null)
                {
                    return await CreateNotFoundResponse(req, $"Account '{accountName}' not found", requestId);
                }

                // Parse update request
                var updateRequest = await req.ReadFromJsonAsync<Dictionary<string, object>>();
                if (updateRequest == null)
                {
                    return await CreateBadRequestResponse(req, "Invalid request body", requestId);
                }

                // Apply updates (currently only tags are updateable)
                if (updateRequest.ContainsKey("tags") && updateRequest["tags"] is Dictionary<string, string> tags)
                {
                    account.Data.Tags.Clear();
                    foreach (var tag in tags)
                    {
                        account.Data.Tags[tag.Key] = tag.Value;
                    }
                }

                // Update account
                var updatedAccount = await _anfService.UpdateAccountAsync(resourceGroup, accountName, account.Data);

                // Map to response model
                var response = new ANFAccount
                {
                    Id = updatedAccount.Id,
                    Name = updatedAccount.Data.Name,
                    Location = updatedAccount.Data.Location.Name,
                    ResourceGroup = updatedAccount.Id.ResourceGroupName,
                    ProvisioningState = updatedAccount.Data.ProvisioningState?.ToString(),
                    Tags = updatedAccount.Data.Tags?.ToDictionary(kvp => kvp.Key, kvp => kvp.Value),
                    ActiveDirectories = MapActiveDirectories(updatedAccount.Data.ActiveDirectories)
                };

                _logger.LogInformation("Successfully updated account {AccountName} for request {RequestId}", 
                    accountName, requestId);

                return await CreateSuccessResponse(req, response, requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing UpdateAccount request {RequestId} for account {AccountName}", 
                    requestId, accountName);
                return await CreateErrorResponse(req, "Failed to update account", requestId);
            }
        }

        /// <summary>
        /// Deletes a NetApp account
        /// </summary>
        /// <param name="req">HTTP request</param>
        /// <param name="accountName">Account name</param>
        /// <returns>Deletion confirmation</returns>
        [Function("DeleteAccount")]
        public async Task<HttpResponseData> DeleteAccount(
            [HttpTrigger(AuthorizationLevel.Function, "delete", Route = "accounts/{accountName}")] HttpRequestData req,
            string accountName)
        {
            var requestId = Guid.NewGuid().ToString();
            _logger.LogInformation("DeleteAccount function processing request {RequestId} for account {AccountName}", 
                requestId, accountName);

            try
            {
                // Check authentication
                if (!_authGuards.IsAuthenticated(req.Context))
                {
                    return await CreateUnauthorizedResponse(req, "Authentication required");
                }

                // Check authorization
                if (!_authGuards.HasPermission(req.Context, "anf.accounts.delete"))
                {
                    _authGuards.LogAuthorizationFailure(req.Context, $"account/{accountName}", "delete");
                    return await CreateForbiddenResponse(req, "Insufficient permissions");
                }

                var resourceGroup = req.Query["resourceGroup"];
                if (string.IsNullOrWhiteSpace(resourceGroup))
                {
                    return await CreateBadRequestResponse(req, "Resource group is required", requestId);
                }

                // Check if account exists
                var account = await _anfService.GetAccountAsync(resourceGroup, accountName);
                if (account == null)
                {
                    return await CreateNotFoundResponse(req, $"Account '{accountName}' not found", requestId);
                }

                // Check if account has capacity pools
                var pools = await _anfService.ListCapacityPoolsAsync(resourceGroup, accountName);
                if (pools.Any())
                {
                    return await CreateConflictResponse(req, 
                        $"Cannot delete account '{accountName}' because it contains {pools.Count()} capacity pools", 
                        requestId);
                }

                // Delete account
                await _anfService.DeleteAccountAsync(resourceGroup, accountName);

                _logger.LogInformation("Successfully deleted account {AccountName} for request {RequestId}", 
                    accountName, requestId);

                var response = new
                {
                    message = $"Account '{accountName}' deleted successfully",
                    accountName = accountName,
                    resourceGroup = resourceGroup
                };

                return await CreateSuccessResponse(req, response, requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing DeleteAccount request {RequestId} for account {AccountName}", 
                    requestId, accountName);
                return await CreateErrorResponse(req, "Failed to delete account", requestId);
            }
        }

        #region Helper Methods

        /// <summary>
        /// Maps Active Directory configurations to response model
        /// </summary>
        private List<ActiveDirectoryConfig> MapActiveDirectories(IList<NetAppAccountActiveDirectory> directories)
        {
            return directories.Select(ad => new ActiveDirectoryConfig
            {
                ActiveDirectoryId = ad.ActiveDirectoryId,
                Domain = ad.Domain,
                Site = ad.Site,
                SmbServerName = ad.SmbServerName,
                OrganizationalUnit = ad.OrganizationalUnit
            }).ToList();
        }

        /// <summary>
        /// Validates create account request
        /// </summary>
        private Dictionary<string, List<string>> ValidateCreateAccountRequest(CreateAccountRequest request)
        {
            var errors = new Dictionary<string, List<string>>();

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                errors["name"] = new List<string> { "Account name is required" };
            }
            else if (!System.Text.RegularExpressions.Regex.IsMatch(request.Name, @"^[a-zA-Z][a-zA-Z0-9\-_]{2,63}$"))
            {
                errors["name"] = new List<string> { "Account name must be 3-64 characters, start with a letter, and contain only letters, numbers, hyphens, and underscores" };
            }

            if (string.IsNullOrWhiteSpace(request.Location))
            {
                errors["location"] = new List<string> { "Location is required" };
            }

            if (string.IsNullOrWhiteSpace(request.ResourceGroup))
            {
                errors["resourceGroup"] = new List<string> { "Resource group is required" };
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
    }
}