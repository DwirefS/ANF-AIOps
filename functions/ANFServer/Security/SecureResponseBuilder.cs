using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ANFServer.Models;

namespace ANFServer.Security
{
    /// <summary>
    /// Provides secure response building with data sanitization and validation
    /// </summary>
    /// <author>Dwiref Sharma &lt;DwirefS@SapientEdge.io&gt;</author>
    public class SecureResponseBuilder
    {
        private readonly ILogger<SecureResponseBuilder> _logger;
        private readonly HashSet<string> _sensitiveFields;
        private readonly Dictionary<string, Regex> _sanitizationRules;

        /// <summary>
        /// Initializes a new instance of SecureResponseBuilder
        /// </summary>
        /// <param name="logger">Logger instance</param>
        public SecureResponseBuilder(ILogger<SecureResponseBuilder> logger)
        {
            _logger = logger;
            
            // Define sensitive fields that should be masked
            _sensitiveFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "password",
                "secret",
                "key",
                "token",
                "authorization",
                "apikey",
                "api_key",
                "clientsecret",
                "client_secret",
                "connectionstring",
                "connection_string"
            };

            // Define sanitization rules for various input types
            _sanitizationRules = new Dictionary<string, Regex>
            {
                ["script"] = new Regex(@"<script[^>]*>.*?</script>", RegexOptions.IgnoreCase | RegexOptions.Singleline),
                ["sql"] = new Regex(@"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|EXECUTE)\b)", RegexOptions.IgnoreCase),
                ["xss"] = new Regex(@"(javascript:|onerror=|onload=|onclick=|<iframe|<object|<embed)", RegexOptions.IgnoreCase),
                ["pathTraversal"] = new Regex(@"(\.\./|\.\.\\|%2e%2e%2f|%2e%2e\\)", RegexOptions.IgnoreCase)
            };
        }

        /// <summary>
        /// Creates a successful API response
        /// </summary>
        /// <typeparam name="T">Type of the response data</typeparam>
        /// <param name="data">The response data</param>
        /// <param name="requestId">Optional request ID</param>
        /// <returns>IActionResult with sanitized response</returns>
        public IActionResult CreateSuccessResponse<T>(T data, string? requestId = null)
        {
            try
            {
                var sanitizedData = SanitizeData(data);
                var response = new ApiResponse<T>
                {
                    Success = true,
                    Data = sanitizedData,
                    RequestId = requestId ?? Guid.NewGuid().ToString(),
                    Timestamp = DateTime.UtcNow
                };

                _logger.LogInformation("Successful response created for request {RequestId}", response.RequestId);
                return new OkObjectResult(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating success response");
                return CreateErrorResponse("An error occurred while processing the response", StatusCodes.Status500InternalServerError);
            }
        }

        /// <summary>
        /// Creates an error API response
        /// </summary>
        /// <param name="error">Error message</param>
        /// <param name="statusCode">HTTP status code</param>
        /// <param name="details">Additional error details</param>
        /// <param name="requestId">Optional request ID</param>
        /// <returns>IActionResult with error response</returns>
        public IActionResult CreateErrorResponse(string error, int statusCode = StatusCodes.Status400BadRequest, 
            Dictionary<string, object>? details = null, string? requestId = null)
        {
            var sanitizedError = SanitizeString(error);
            var sanitizedDetails = details != null ? SanitizeData(details) : null;

            var response = new ApiResponse<object>
            {
                Success = false,
                Error = sanitizedError,
                Details = sanitizedDetails,
                RequestId = requestId ?? Guid.NewGuid().ToString(),
                Timestamp = DateTime.UtcNow
            };

            _logger.LogWarning("Error response created: {Error} for request {RequestId}", sanitizedError, response.RequestId);

            return statusCode switch
            {
                StatusCodes.Status400BadRequest => new BadRequestObjectResult(response),
                StatusCodes.Status401Unauthorized => new UnauthorizedObjectResult(response),
                StatusCodes.Status403Forbidden => new ObjectResult(response) { StatusCode = StatusCodes.Status403Forbidden },
                StatusCodes.Status404NotFound => new NotFoundObjectResult(response),
                StatusCodes.Status409Conflict => new ConflictObjectResult(response),
                StatusCodes.Status500InternalServerError => new ObjectResult(response) { StatusCode = StatusCodes.Status500InternalServerError },
                _ => new ObjectResult(response) { StatusCode = statusCode }
            };
        }

        /// <summary>
        /// Creates a validation error response
        /// </summary>
        /// <param name="validationErrors">Dictionary of validation errors</param>
        /// <param name="requestId">Optional request ID</param>
        /// <returns>IActionResult with validation error response</returns>
        public IActionResult CreateValidationErrorResponse(Dictionary<string, List<string>> validationErrors, string? requestId = null)
        {
            var details = new Dictionary<string, object>
            {
                ["validationErrors"] = validationErrors
            };

            return CreateErrorResponse("Validation failed", StatusCodes.Status400BadRequest, details, requestId);
        }

        /// <summary>
        /// Sanitizes data by removing or masking sensitive information
        /// </summary>
        /// <typeparam name="T">Type of data to sanitize</typeparam>
        /// <param name="data">Data to sanitize</param>
        /// <returns>Sanitized data</returns>
        private T SanitizeData<T>(T data)
        {
            if (data == null)
                return data;

            var json = JsonSerializer.Serialize(data);
            var jsonDoc = JsonDocument.Parse(json);
            var sanitized = SanitizeJsonElement(jsonDoc.RootElement);
            
            var sanitizedJson = JsonSerializer.Serialize(sanitized);
            return JsonSerializer.Deserialize<T>(sanitizedJson)!;
        }

        /// <summary>
        /// Recursively sanitizes JSON elements
        /// </summary>
        /// <param name="element">JSON element to sanitize</param>
        /// <returns>Sanitized object</returns>
        private object? SanitizeJsonElement(JsonElement element)
        {
            switch (element.ValueKind)
            {
                case JsonValueKind.Object:
                    var obj = new Dictionary<string, object?>();
                    foreach (var property in element.EnumerateObject())
                    {
                        var value = SanitizeJsonElement(property.Value);
                        
                        // Mask sensitive fields
                        if (_sensitiveFields.Contains(property.Name))
                        {
                            obj[property.Name] = "***MASKED***";
                        }
                        else
                        {
                            obj[property.Name] = value;
                        }
                    }
                    return obj;

                case JsonValueKind.Array:
                    var arr = new List<object?>();
                    foreach (var item in element.EnumerateArray())
                    {
                        arr.Add(SanitizeJsonElement(item));
                    }
                    return arr;

                case JsonValueKind.String:
                    return SanitizeString(element.GetString() ?? string.Empty);

                case JsonValueKind.Number:
                    if (element.TryGetInt64(out var longValue))
                        return longValue;
                    return element.GetDouble();

                case JsonValueKind.True:
                    return true;

                case JsonValueKind.False:
                    return false;

                case JsonValueKind.Null:
                    return null;

                default:
                    return element.ToString();
            }
        }

        /// <summary>
        /// Sanitizes a string value by removing potentially harmful content
        /// </summary>
        /// <param name="input">String to sanitize</param>
        /// <returns>Sanitized string</returns>
        private string SanitizeString(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return input;

            var sanitized = input;

            // Apply sanitization rules
            foreach (var rule in _sanitizationRules)
            {
                if (rule.Value.IsMatch(sanitized))
                {
                    _logger.LogWarning("Potential {ThreatType} detected and sanitized", rule.Key);
                    sanitized = rule.Value.Replace(sanitized, string.Empty);
                }
            }

            // Remove control characters
            sanitized = Regex.Replace(sanitized, @"[\x00-\x1F\x7F]", string.Empty);

            // Limit string length to prevent DoS
            const int maxLength = 10000;
            if (sanitized.Length > maxLength)
            {
                sanitized = sanitized.Substring(0, maxLength);
                _logger.LogWarning("String truncated to maximum length of {MaxLength}", maxLength);
            }

            return sanitized;
        }

        /// <summary>
        /// Validates and sanitizes request headers
        /// </summary>
        /// <param name="headers">HTTP headers to validate</param>
        /// <returns>Dictionary of validated headers</returns>
        public Dictionary<string, string> ValidateHeaders(IHeaderDictionary headers)
        {
            var validatedHeaders = new Dictionary<string, string>();

            foreach (var header in headers)
            {
                // Skip sensitive headers
                if (_sensitiveFields.Contains(header.Key))
                    continue;

                var sanitizedValue = SanitizeString(header.Value.ToString());
                validatedHeaders[header.Key] = sanitizedValue;
            }

            return validatedHeaders;
        }

        /// <summary>
        /// Creates a rate limit exceeded response
        /// </summary>
        /// <param name="retryAfterSeconds">Seconds until retry is allowed</param>
        /// <param name="requestId">Optional request ID</param>
        /// <returns>IActionResult with rate limit response</returns>
        public IActionResult CreateRateLimitResponse(int retryAfterSeconds = 60, string? requestId = null)
        {
            var response = CreateErrorResponse(
                "Rate limit exceeded. Please try again later.",
                StatusCodes.Status429TooManyRequests,
                new Dictionary<string, object>
                {
                    ["retryAfter"] = retryAfterSeconds
                },
                requestId
            );

            if (response is ObjectResult objResult)
            {
                objResult.StatusCode = StatusCodes.Status429TooManyRequests;
            }

            return response;
        }

        /// <summary>
        /// Creates a service unavailable response
        /// </summary>
        /// <param name="reason">Reason for unavailability</param>
        /// <param name="requestId">Optional request ID</param>
        /// <returns>IActionResult with service unavailable response</returns>
        public IActionResult CreateServiceUnavailableResponse(string reason = "Service temporarily unavailable", string? requestId = null)
        {
            return CreateErrorResponse(reason, StatusCodes.Status503ServiceUnavailable, null, requestId);
        }
    }
}