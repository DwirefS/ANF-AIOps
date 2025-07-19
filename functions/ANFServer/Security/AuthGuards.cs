using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ANFServer.Security
{
    /// <summary>
    /// Provides authentication and authorization guards for securing API endpoints
    /// </summary>
    /// <author>Dwiref Sharma &lt;DwirefS@SapientEdge.io&gt;</author>
    public class AuthGuards
    {
        private readonly ILogger<AuthGuards> _logger;
        private readonly IConfiguration _configuration;
        private readonly Dictionary<string, List<string>> _rolePermissions;
        private readonly HashSet<string> _validScopes;

        /// <summary>
        /// Initializes a new instance of AuthGuards
        /// </summary>
        /// <param name="logger">Logger instance</param>
        /// <param name="configuration">Configuration instance</param>
        public AuthGuards(ILogger<AuthGuards> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;

            // Initialize role-based permissions
            _rolePermissions = new Dictionary<string, List<string>>
            {
                ["Admin"] = new List<string> 
                { 
                    "anf.accounts.read", "anf.accounts.write", "anf.accounts.delete",
                    "anf.pools.read", "anf.pools.write", "anf.pools.delete",
                    "anf.volumes.read", "anf.volumes.write", "anf.volumes.delete",
                    "anf.snapshots.read", "anf.snapshots.write", "anf.snapshots.delete",
                    "anf.admin"
                },
                ["Operator"] = new List<string> 
                { 
                    "anf.accounts.read", "anf.accounts.write",
                    "anf.pools.read", "anf.pools.write",
                    "anf.volumes.read", "anf.volumes.write",
                    "anf.snapshots.read", "anf.snapshots.write"
                },
                ["Reader"] = new List<string> 
                { 
                    "anf.accounts.read",
                    "anf.pools.read",
                    "anf.volumes.read",
                    "anf.snapshots.read"
                },
                ["ServiceAccount"] = new List<string>
                {
                    "anf.service.read",
                    "anf.service.write",
                    "anf.service.automation"
                }
            };

            // Initialize valid scopes
            _validScopes = new HashSet<string>
            {
                "anf.accounts.read", "anf.accounts.write", "anf.accounts.delete",
                "anf.pools.read", "anf.pools.write", "anf.pools.delete",
                "anf.volumes.read", "anf.volumes.write", "anf.volumes.delete",
                "anf.snapshots.read", "anf.snapshots.write", "anf.snapshots.delete",
                "anf.admin", "anf.service.read", "anf.service.write", "anf.service.automation"
            };
        }

        /// <summary>
        /// Checks if the current user is authenticated
        /// </summary>
        /// <param name="httpContext">HTTP context</param>
        /// <returns>True if authenticated, false otherwise</returns>
        public bool IsAuthenticated(HttpContext httpContext)
        {
            if (httpContext?.User?.Identity == null)
            {
                _logger.LogWarning("No user identity found in HTTP context");
                return false;
            }

            var isAuthenticated = httpContext.User.Identity.IsAuthenticated;
            if (!isAuthenticated)
            {
                _logger.LogWarning("User is not authenticated");
            }

            return isAuthenticated;
        }

        /// <summary>
        /// Checks if the current user has a specific role
        /// </summary>
        /// <param name="httpContext">HTTP context</param>
        /// <param name="role">Role to check</param>
        /// <returns>True if user has the role, false otherwise</returns>
        public bool HasRole(HttpContext httpContext, string role)
        {
            if (!IsAuthenticated(httpContext))
                return false;

            var hasRole = httpContext.User.IsInRole(role);
            if (!hasRole)
            {
                _logger.LogWarning("User {User} does not have role {Role}", 
                    GetUserIdentifier(httpContext), role);
            }

            return hasRole;
        }

        /// <summary>
        /// Checks if the current user has any of the specified roles
        /// </summary>
        /// <param name="httpContext">HTTP context</param>
        /// <param name="roles">Roles to check</param>
        /// <returns>True if user has any of the roles, false otherwise</returns>
        public bool HasAnyRole(HttpContext httpContext, params string[] roles)
        {
            if (!IsAuthenticated(httpContext))
                return false;

            foreach (var role in roles)
            {
                if (httpContext.User.IsInRole(role))
                    return true;
            }

            _logger.LogWarning("User {User} does not have any of the required roles: {Roles}", 
                GetUserIdentifier(httpContext), string.Join(", ", roles));
            return false;
        }

        /// <summary>
        /// Checks if the current user has a specific permission
        /// </summary>
        /// <param name="httpContext">HTTP context</param>
        /// <param name="permission">Permission to check</param>
        /// <returns>True if user has the permission, false otherwise</returns>
        public bool HasPermission(HttpContext httpContext, string permission)
        {
            if (!IsAuthenticated(httpContext))
                return false;

            // Check if permission is valid
            if (!_validScopes.Contains(permission))
            {
                _logger.LogWarning("Invalid permission requested: {Permission}", permission);
                return false;
            }

            // Check scope claims first
            var scopeClaim = httpContext.User.FindFirst("scope") ?? 
                             httpContext.User.FindFirst("scp");
            if (scopeClaim != null)
            {
                var scopes = scopeClaim.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                if (scopes.Contains(permission))
                    return true;
            }

            // Check role-based permissions
            foreach (var role in _rolePermissions.Keys)
            {
                if (httpContext.User.IsInRole(role) && _rolePermissions[role].Contains(permission))
                    return true;
            }

            _logger.LogWarning("User {User} does not have permission {Permission}", 
                GetUserIdentifier(httpContext), permission);
            return false;
        }

        /// <summary>
        /// Checks if the current user has all of the specified permissions
        /// </summary>
        /// <param name="httpContext">HTTP context</param>
        /// <param name="permissions">Permissions to check</param>
        /// <returns>True if user has all permissions, false otherwise</returns>
        public bool HasAllPermissions(HttpContext httpContext, params string[] permissions)
        {
            foreach (var permission in permissions)
            {
                if (!HasPermission(httpContext, permission))
                    return false;
            }
            return true;
        }

        /// <summary>
        /// Checks if the current user has any of the specified permissions
        /// </summary>
        /// <param name="httpContext">HTTP context</param>
        /// <param name="permissions">Permissions to check</param>
        /// <returns>True if user has any permission, false otherwise</returns>
        public bool HasAnyPermission(HttpContext httpContext, params string[] permissions)
        {
            foreach (var permission in permissions)
            {
                if (HasPermission(httpContext, permission))
                    return true;
            }

            _logger.LogWarning("User {User} does not have any of the required permissions: {Permissions}", 
                GetUserIdentifier(httpContext), string.Join(", ", permissions));
            return false;
        }

        /// <summary>
        /// Validates resource access based on ownership or permissions
        /// </summary>
        /// <param name="httpContext">HTTP context</param>
        /// <param name="resourceOwnerId">Resource owner ID</param>
        /// <param name="requiredPermission">Required permission if not owner</param>
        /// <returns>True if access is allowed, false otherwise</returns>
        public bool CanAccessResource(HttpContext httpContext, string resourceOwnerId, string requiredPermission)
        {
            if (!IsAuthenticated(httpContext))
                return false;

            var userId = GetUserId(httpContext);
            
            // Check if user is the owner
            if (!string.IsNullOrEmpty(userId) && userId.Equals(resourceOwnerId, StringComparison.OrdinalIgnoreCase))
                return true;

            // Check if user has admin permission
            if (HasPermission(httpContext, "anf.admin"))
                return true;

            // Check if user has the required permission
            return HasPermission(httpContext, requiredPermission);
        }

        /// <summary>
        /// Validates if the request is from a trusted service account
        /// </summary>
        /// <param name="httpContext">HTTP context</param>
        /// <returns>True if from a trusted service, false otherwise</returns>
        public bool IsServiceAccount(HttpContext httpContext)
        {
            if (!IsAuthenticated(httpContext))
                return false;

            // Check for service account role
            if (HasRole(httpContext, "ServiceAccount"))
                return true;

            // Check for service account claim
            var isServiceClaim = httpContext.User.FindFirst("is_service_account");
            if (isServiceClaim != null && bool.TryParse(isServiceClaim.Value, out var isService))
                return isService;

            // Check app_id claim for known service accounts
            var appIdClaim = httpContext.User.FindFirst("appid") ?? 
                            httpContext.User.FindFirst("azp");
            if (appIdClaim != null)
            {
                var trustedServiceIds = _configuration.GetSection("Security:TrustedServiceAccounts")
                    .Get<string[]>() ?? Array.Empty<string>();
                return trustedServiceIds.Contains(appIdClaim.Value);
            }

            return false;
        }

        /// <summary>
        /// Gets the user ID from the current context
        /// </summary>
        /// <param name="httpContext">HTTP context</param>
        /// <returns>User ID or null</returns>
        public string? GetUserId(HttpContext httpContext)
        {
            if (!IsAuthenticated(httpContext))
                return null;

            // Try different claim types for user ID
            var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier) ??
                             httpContext.User.FindFirst("sub") ??
                             httpContext.User.FindFirst("oid") ??
                             httpContext.User.FindFirst("uid");

            return userIdClaim?.Value;
        }

        /// <summary>
        /// Gets the user's display name or identifier
        /// </summary>
        /// <param name="httpContext">HTTP context</param>
        /// <returns>User identifier</returns>
        public string GetUserIdentifier(HttpContext httpContext)
        {
            if (!IsAuthenticated(httpContext))
                return "Anonymous";

            // Try to get display name
            var nameClaim = httpContext.User.FindFirst(ClaimTypes.Name) ??
                           httpContext.User.FindFirst("name") ??
                           httpContext.User.FindFirst("preferred_username") ??
                           httpContext.User.FindFirst("upn");

            if (nameClaim != null)
                return nameClaim.Value;

            // Fall back to user ID
            return GetUserId(httpContext) ?? "Unknown";
        }

        /// <summary>
        /// Gets all roles for the current user
        /// </summary>
        /// <param name="httpContext">HTTP context</param>
        /// <returns>List of roles</returns>
        public List<string> GetUserRoles(HttpContext httpContext)
        {
            if (!IsAuthenticated(httpContext))
                return new List<string>();

            var roles = new List<string>();

            // Get role claims
            var roleClaims = httpContext.User.FindAll(ClaimTypes.Role)
                .Union(httpContext.User.FindAll("roles"))
                .Union(httpContext.User.FindAll("role"));

            foreach (var claim in roleClaims)
            {
                // Handle both single roles and comma-separated roles
                var roleValues = claim.Value.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(r => r.Trim());
                roles.AddRange(roleValues);
            }

            return roles.Distinct().ToList();
        }

        /// <summary>
        /// Gets all permissions for the current user
        /// </summary>
        /// <param name="httpContext">HTTP context</param>
        /// <returns>List of permissions</returns>
        public List<string> GetUserPermissions(HttpContext httpContext)
        {
            if (!IsAuthenticated(httpContext))
                return new List<string>();

            var permissions = new HashSet<string>();

            // Get scope-based permissions
            var scopeClaim = httpContext.User.FindFirst("scope") ?? 
                            httpContext.User.FindFirst("scp");
            if (scopeClaim != null)
            {
                var scopes = scopeClaim.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                foreach (var scope in scopes.Where(s => _validScopes.Contains(s)))
                {
                    permissions.Add(scope);
                }
            }

            // Get role-based permissions
            var roles = GetUserRoles(httpContext);
            foreach (var role in roles)
            {
                if (_rolePermissions.ContainsKey(role))
                {
                    foreach (var permission in _rolePermissions[role])
                    {
                        permissions.Add(permission);
                    }
                }
            }

            return permissions.ToList();
        }

        /// <summary>
        /// Validates API key authentication
        /// </summary>
        /// <param name="apiKey">API key to validate</param>
        /// <returns>True if valid, false otherwise</returns>
        public async Task<bool> ValidateApiKey(string apiKey)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("Empty API key provided");
                return false;
            }

            // In production, this should validate against a secure store
            var validApiKeys = _configuration.GetSection("Security:ApiKeys")
                .Get<Dictionary<string, string>>() ?? new Dictionary<string, string>();

            var isValid = validApiKeys.ContainsValue(apiKey);
            if (!isValid)
            {
                _logger.LogWarning("Invalid API key attempted");
            }

            return await Task.FromResult(isValid);
        }

        /// <summary>
        /// Logs an authorization failure
        /// </summary>
        /// <param name="httpContext">HTTP context</param>
        /// <param name="resource">Resource being accessed</param>
        /// <param name="action">Action being attempted</param>
        public void LogAuthorizationFailure(HttpContext httpContext, string resource, string action)
        {
            var user = GetUserIdentifier(httpContext);
            var roles = string.Join(", ", GetUserRoles(httpContext));
            var permissions = string.Join(", ", GetUserPermissions(httpContext));

            _logger.LogWarning(
                "Authorization failed for user {User}. Resource: {Resource}, Action: {Action}, Roles: [{Roles}], Permissions: [{Permissions}]",
                user, resource, action, roles, permissions);
        }
    }
}