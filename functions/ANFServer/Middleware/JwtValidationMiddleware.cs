using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace ANFServer.Middleware
{
    /// <summary>
    /// Middleware for validating JWT tokens in Azure Functions
    /// </summary>
    /// <author>Dwiref Sharma &lt;DwirefS@SapientEdge.io&gt;</author>
    public class JwtValidationMiddleware : IFunctionsWorkerMiddleware
    {
        private readonly ILogger<JwtValidationMiddleware> _logger;
        private readonly JwtValidationOptions _options;
        private readonly IConfigurationManager<OpenIdConnectConfiguration> _configurationManager;
        private readonly JwtSecurityTokenHandler _tokenHandler;

        /// <summary>
        /// Initializes a new instance of JwtValidationMiddleware
        /// </summary>
        /// <param name="logger">Logger instance</param>
        /// <param name="options">JWT validation options</param>
        public JwtValidationMiddleware(
            ILogger<JwtValidationMiddleware> logger,
            IOptions<JwtValidationOptions> options)
        {
            _logger = logger;
            _options = options.Value;
            _tokenHandler = new JwtSecurityTokenHandler();

            // Initialize configuration manager for OpenID Connect
            var metadataAddress = $"{_options.Authority}/.well-known/openid-configuration";
            _configurationManager = new ConfigurationManager<OpenIdConnectConfiguration>(
                metadataAddress,
                new OpenIdConnectConfigurationRetriever(),
                new HttpDocumentRetriever());
        }

        /// <summary>
        /// Invokes the middleware
        /// </summary>
        /// <param name="context">Function context</param>
        /// <param name="next">Next middleware delegate</param>
        public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
        {
            try
            {
                var httpRequestData = await GetHttpRequestDataAsync(context);
                
                if (httpRequestData == null)
                {
                    // Not an HTTP trigger, skip validation
                    await next(context);
                    return;
                }

                // Check if endpoint requires authentication
                if (IsAnonymousEndpoint(httpRequestData))
                {
                    _logger.LogDebug("Skipping authentication for anonymous endpoint: {Path}", 
                        httpRequestData.Url.AbsolutePath);
                    await next(context);
                    return;
                }

                // Extract token from request
                var token = ExtractToken(httpRequestData);
                if (string.IsNullOrEmpty(token))
                {
                    _logger.LogWarning("No authorization token found in request to {Path}", 
                        httpRequestData.Url.AbsolutePath);
                    await CreateUnauthorizedResponse(context, "Authorization token required");
                    return;
                }

                // Validate token
                var principal = await ValidateToken(token);
                if (principal == null)
                {
                    await CreateUnauthorizedResponse(context, "Invalid token");
                    return;
                }

                // Store principal in context for use in functions
                context.Items["Principal"] = principal;
                context.Items["UserId"] = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                context.Items["UserName"] = principal.FindFirst(ClaimTypes.Name)?.Value;

                _logger.LogInformation("Successfully authenticated user {UserId} for {Path}", 
                    context.Items["UserId"], httpRequestData.Url.AbsolutePath);

                await next(context);
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning(ex, "Token validation failed");
                await CreateUnauthorizedResponse(context, "Token validation failed");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in JWT validation middleware");
                await CreateUnauthorizedResponse(context, "Authentication error");
            }
        }

        /// <summary>
        /// Gets HTTP request data from function context
        /// </summary>
        private async Task<HttpRequestData?> GetHttpRequestDataAsync(FunctionContext context)
        {
            var httpRequest = context.Features.Get<HttpRequestData>();
            return await Task.FromResult(httpRequest);
        }

        /// <summary>
        /// Checks if the endpoint allows anonymous access
        /// </summary>
        private bool IsAnonymousEndpoint(HttpRequestData request)
        {
            var anonymousEndpoints = new[]
            {
                "/api/health",
                "/api/status",
                "/api/version",
                "/api/.well-known"
            };

            var path = request.Url.AbsolutePath.ToLower();
            return anonymousEndpoints.Any(endpoint => path.StartsWith(endpoint));
        }

        /// <summary>
        /// Extracts JWT token from request
        /// </summary>
        private string? ExtractToken(HttpRequestData request)
        {
            // Check Authorization header
            if (request.Headers.TryGetValues("Authorization", out var authHeaders))
            {
                var authHeader = authHeaders.FirstOrDefault();
                if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    return authHeader.Substring("Bearer ".Length).Trim();
                }
            }

            // Check for token in query string (not recommended for production)
            var query = System.Web.HttpUtility.ParseQueryString(request.Url.Query);
            var queryToken = query["access_token"];
            if (!string.IsNullOrEmpty(queryToken))
            {
                _logger.LogWarning("Token found in query string - this is not recommended for security");
                return queryToken;
            }

            // Check for API key header as alternative
            if (request.Headers.TryGetValues("X-API-Key", out var apiKeyHeaders))
            {
                var apiKey = apiKeyHeaders.FirstOrDefault();
                if (!string.IsNullOrEmpty(apiKey))
                {
                    // In production, validate API key against secure store
                    return ConvertApiKeyToToken(apiKey);
                }
            }

            return null;
        }

        /// <summary>
        /// Validates JWT token
        /// </summary>
        private async Task<ClaimsPrincipal?> ValidateToken(string token)
        {
            try
            {
                // Get OpenID configuration
                var config = await _configurationManager.GetConfigurationAsync();
                
                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = _options.ValidateIssuer,
                    ValidIssuers = new[] { _options.Authority, $"{_options.Authority}/v2.0" },
                    
                    ValidateAudience = _options.ValidateAudience,
                    ValidAudiences = new[] { _options.Audience },
                    
                    ValidateLifetime = _options.ValidateLifetime,
                    RequireExpirationTime = _options.RequireExpirationTime,
                    ClockSkew = TimeSpan.FromMinutes(5),
                    
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeys = config.SigningKeys,
                    RequireSignedTokens = _options.RequireSignedTokens
                };

                // Validate token
                var principal = _tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);
                
                // Additional validation
                if (validatedToken is JwtSecurityToken jwtToken)
                {
                    // Ensure token has required claims
                    if (!jwtToken.Claims.Any(c => c.Type == ClaimTypes.NameIdentifier || c.Type == "sub" || c.Type == "oid"))
                    {
                        _logger.LogWarning("Token missing required user identifier claim");
                        return null;
                    }

                    // Check token type if required
                    var tokenType = jwtToken.Claims.FirstOrDefault(c => c.Type == "typ")?.Value;
                    if (!string.IsNullOrEmpty(tokenType) && tokenType != "JWT")
                    {
                        _logger.LogWarning("Invalid token type: {TokenType}", tokenType);
                        return null;
                    }
                }

                return principal;
            }
            catch (SecurityTokenValidationException ex)
            {
                _logger.LogWarning(ex, "Token validation failed");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error validating token");
                return null;
            }
        }

        /// <summary>
        /// Converts API key to a simple token format (for demonstration)
        /// </summary>
        private string ConvertApiKeyToToken(string apiKey)
        {
            // In production, this should validate the API key and return a proper JWT
            // For now, we'll create a simple token
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, apiKey),
                new Claim(ClaimTypes.Name, "API Key User"),
                new Claim(ClaimTypes.Role, "ServiceAccount"),
                new Claim("api_key", "true")
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.ApiKeySecret ?? "your-256-bit-secret"));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _options.Authority,
                audience: _options.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(1),
                signingCredentials: creds);

            return _tokenHandler.WriteToken(token);
        }

        /// <summary>
        /// Creates unauthorized response
        /// </summary>
        private async Task CreateUnauthorizedResponse(FunctionContext context, string message)
        {
            var response = context.Features.Get<HttpResponseData>();
            if (response == null)
            {
                var request = context.Features.Get<HttpRequestData>();
                if (request != null)
                {
                    response = request.CreateResponse();
                    response.StatusCode = System.Net.HttpStatusCode.Unauthorized;
                    response.Headers.Add("Content-Type", "application/json");
                    
                    var errorResponse = new
                    {
                        error = "Unauthorized",
                        message = message,
                        timestamp = DateTime.UtcNow
                    };
                    
                    await response.WriteAsJsonAsync(errorResponse);
                    context.Features.Set(response);
                }
            }
        }
    }

    /// <summary>
    /// Options for JWT validation
    /// </summary>
    public class JwtValidationOptions
    {
        /// <summary>
        /// Authority URL (e.g., https://login.microsoftonline.com/{tenant})
        /// </summary>
        public string Authority { get; set; } = string.Empty;

        /// <summary>
        /// Expected audience (client ID)
        /// </summary>
        public string Audience { get; set; } = string.Empty;

        /// <summary>
        /// Whether to validate the issuer
        /// </summary>
        public bool ValidateIssuer { get; set; } = true;

        /// <summary>
        /// Whether to validate the audience
        /// </summary>
        public bool ValidateAudience { get; set; } = true;

        /// <summary>
        /// Whether to validate token lifetime
        /// </summary>
        public bool ValidateLifetime { get; set; } = true;

        /// <summary>
        /// Whether to require expiration time
        /// </summary>
        public bool RequireExpirationTime { get; set; } = true;

        /// <summary>
        /// Whether to require signed tokens
        /// </summary>
        public bool RequireSignedTokens { get; set; } = true;

        /// <summary>
        /// Secret for API key validation
        /// </summary>
        public string? ApiKeySecret { get; set; }
    }
}