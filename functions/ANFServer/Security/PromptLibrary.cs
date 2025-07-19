using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace ANFServer.Security
{
    /// <summary>
    /// Secure prompt library for AI operations to prevent injection attacks
    /// </summary>
    /// <author>Dwiref Sharma &lt;DwirefS@SapientEdge.io&gt;</author>
    public class PromptLibrary
    {
        private readonly ILogger<PromptLibrary> _logger;
        private readonly Dictionary<string, PromptTemplate> _prompts;
        private readonly HashSet<string> _blockedPatterns;
        private readonly Dictionary<string, Regex> _validationRules;

        /// <summary>
        /// Initializes a new instance of PromptLibrary
        /// </summary>
        /// <param name="logger">Logger instance</param>
        public PromptLibrary(ILogger<PromptLibrary> logger)
        {
            _logger = logger;
            _prompts = InitializePrompts();
            _blockedPatterns = InitializeBlockedPatterns();
            _validationRules = InitializeValidationRules();
        }

        /// <summary>
        /// Gets a secure prompt by key with parameter substitution
        /// </summary>
        /// <param name="key">Prompt key</param>
        /// <param name="parameters">Parameters to substitute</param>
        /// <returns>Sanitized prompt string</returns>
        public string GetPrompt(string key, Dictionary<string, string>? parameters = null)
        {
            if (!_prompts.ContainsKey(key))
            {
                _logger.LogWarning("Prompt key not found: {Key}", key);
                throw new ArgumentException($"Prompt key '{key}' not found");
            }

            var template = _prompts[key];
            var prompt = template.Template;

            // Validate and sanitize parameters
            if (parameters != null)
            {
                foreach (var param in parameters)
                {
                    var sanitizedValue = SanitizeParameter(param.Key, param.Value, template);
                    prompt = prompt.Replace($"{{{param.Key}}}", sanitizedValue);
                }
            }

            // Check for any remaining placeholders
            if (prompt.Contains("{") && prompt.Contains("}"))
            {
                _logger.LogWarning("Unsubstituted placeholders found in prompt: {Key}", key);
                throw new InvalidOperationException("All prompt parameters must be provided");
            }

            // Final security check
            if (ContainsBlockedPattern(prompt))
            {
                _logger.LogError("Blocked pattern detected in final prompt for key: {Key}", key);
                throw new SecurityException("Prompt contains prohibited content");
            }

            return prompt;
        }

        /// <summary>
        /// Validates user input before using in prompts
        /// </summary>
        /// <param name="input">User input to validate</param>
        /// <param name="inputType">Type of input for specific validation</param>
        /// <returns>True if valid, false otherwise</returns>
        public bool ValidateUserInput(string input, string inputType = "general")
        {
            if (string.IsNullOrWhiteSpace(input))
                return false;

            // Check length limits
            const int maxLength = 1000;
            if (input.Length > maxLength)
            {
                _logger.LogWarning("Input exceeds maximum length for type {Type}", inputType);
                return false;
            }

            // Check for blocked patterns
            if (ContainsBlockedPattern(input))
            {
                _logger.LogWarning("Blocked pattern detected in user input of type {Type}", inputType);
                return false;
            }

            // Apply type-specific validation
            if (_validationRules.ContainsKey(inputType))
            {
                var rule = _validationRules[inputType];
                if (!rule.IsMatch(input))
                {
                    _logger.LogWarning("Input validation failed for type {Type}", inputType);
                    return false;
                }
            }

            return true;
        }

        /// <summary>
        /// Sanitizes a parameter value based on its context
        /// </summary>
        private string SanitizeParameter(string paramName, string value, PromptTemplate template)
        {
            // Check if parameter is allowed
            if (!template.AllowedParameters.Contains(paramName))
            {
                _logger.LogWarning("Unauthorized parameter {Param} for prompt {Key}", paramName, template.Key);
                throw new ArgumentException($"Parameter '{paramName}' is not allowed for this prompt");
            }

            // Apply parameter-specific validation
            if (template.ParameterValidation.ContainsKey(paramName))
            {
                var validationType = template.ParameterValidation[paramName];
                if (!ValidateUserInput(value, validationType))
                {
                    throw new ArgumentException($"Invalid value for parameter '{paramName}'");
                }
            }

            // Sanitize the value
            var sanitized = value;
            
            // Remove potential injection patterns
            sanitized = Regex.Replace(sanitized, @"(\{|\}|\[|\]|\$|`)", "", RegexOptions.IgnoreCase);
            
            // Escape special characters
            sanitized = Regex.Replace(sanitized, @"(\\|\""|')", @"\$1");
            
            // Remove newlines and excessive whitespace
            sanitized = Regex.Replace(sanitized, @"\s+", " ").Trim();

            return sanitized;
        }

        /// <summary>
        /// Checks if text contains blocked patterns
        /// </summary>
        private bool ContainsBlockedPattern(string text)
        {
            var lowerText = text.ToLower();
            return _blockedPatterns.Any(pattern => lowerText.Contains(pattern));
        }

        /// <summary>
        /// Initializes the prompt templates
        /// </summary>
        private Dictionary<string, PromptTemplate> InitializePrompts()
        {
            return new Dictionary<string, PromptTemplate>
            {
                ["analyze_volume_performance"] = new PromptTemplate
                {
                    Key = "analyze_volume_performance",
                    Template = "Analyze the performance metrics for Azure NetApp Files volume '{volumeName}' in pool '{poolName}'. Focus on throughput, IOPS, and latency patterns over the past {timeRange}. Provide actionable recommendations for optimization.",
                    AllowedParameters = new HashSet<string> { "volumeName", "poolName", "timeRange" },
                    ParameterValidation = new Dictionary<string, string>
                    {
                        ["volumeName"] = "resource_name",
                        ["poolName"] = "resource_name",
                        ["timeRange"] = "time_range"
                    }
                },

                ["optimize_capacity_pool"] = new PromptTemplate
                {
                    Key = "optimize_capacity_pool",
                    Template = "Review the capacity pool '{poolName}' with service level '{serviceLevel}' and size {poolSize} TiB. Current utilization is {utilization}%. Suggest optimization strategies for cost and performance balance.",
                    AllowedParameters = new HashSet<string> { "poolName", "serviceLevel", "poolSize", "utilization" },
                    ParameterValidation = new Dictionary<string, string>
                    {
                        ["poolName"] = "resource_name",
                        ["serviceLevel"] = "service_level",
                        ["poolSize"] = "number",
                        ["utilization"] = "percentage"
                    }
                },

                ["troubleshoot_snapshot_failure"] = new PromptTemplate
                {
                    Key = "troubleshoot_snapshot_failure",
                    Template = "Investigate snapshot creation failure for volume '{volumeName}'. Error message: '{errorMessage}'. Analyze potential causes and provide step-by-step resolution guidance.",
                    AllowedParameters = new HashSet<string> { "volumeName", "errorMessage" },
                    ParameterValidation = new Dictionary<string, string>
                    {
                        ["volumeName"] = "resource_name",
                        ["errorMessage"] = "error_message"
                    }
                },

                ["plan_disaster_recovery"] = new PromptTemplate
                {
                    Key = "plan_disaster_recovery",
                    Template = "Create a disaster recovery plan for ANF account '{accountName}' in region '{primaryRegion}'. Consider replication to '{secondaryRegion}' with RPO of {rpo} and RTO of {rto}.",
                    AllowedParameters = new HashSet<string> { "accountName", "primaryRegion", "secondaryRegion", "rpo", "rto" },
                    ParameterValidation = new Dictionary<string, string>
                    {
                        ["accountName"] = "resource_name",
                        ["primaryRegion"] = "azure_region",
                        ["secondaryRegion"] = "azure_region",
                        ["rpo"] = "time_duration",
                        ["rto"] = "time_duration"
                    }
                },

                ["analyze_cost_optimization"] = new PromptTemplate
                {
                    Key = "analyze_cost_optimization",
                    Template = "Analyze cost optimization opportunities for ANF resources in subscription. Total monthly cost: ${monthlyCost}. Number of pools: {poolCount}, volumes: {volumeCount}. Identify potential savings without impacting performance.",
                    AllowedParameters = new HashSet<string> { "monthlyCost", "poolCount", "volumeCount" },
                    ParameterValidation = new Dictionary<string, string>
                    {
                        ["monthlyCost"] = "currency",
                        ["poolCount"] = "number",
                        ["volumeCount"] = "number"
                    }
                },

                ["recommend_volume_sizing"] = new PromptTemplate
                {
                    Key = "recommend_volume_sizing",
                    Template = "Recommend optimal volume sizing for workload type '{workloadType}' with expected IOPS of {expectedIOPS} and throughput of {expectedThroughput} MB/s. Consider service level options and cost implications.",
                    AllowedParameters = new HashSet<string> { "workloadType", "expectedIOPS", "expectedThroughput" },
                    ParameterValidation = new Dictionary<string, string>
                    {
                        ["workloadType"] = "workload_type",
                        ["expectedIOPS"] = "number",
                        ["expectedThroughput"] = "number"
                    }
                },

                ["security_audit"] = new PromptTemplate
                {
                    Key = "security_audit",
                    Template = "Perform security audit for ANF account '{accountName}'. Review network security, access controls, and encryption settings. Compliance requirements: {complianceStandards}.",
                    AllowedParameters = new HashSet<string> { "accountName", "complianceStandards" },
                    ParameterValidation = new Dictionary<string, string>
                    {
                        ["accountName"] = "resource_name",
                        ["complianceStandards"] = "compliance_list"
                    }
                }
            };
        }

        /// <summary>
        /// Initializes blocked patterns for security
        /// </summary>
        private HashSet<string> InitializeBlockedPatterns()
        {
            return new HashSet<string>
            {
                // Prompt injection attempts
                "ignore previous instructions",
                "disregard all prior",
                "forget everything",
                "new instructions:",
                "system prompt",
                "bypass security",
                "reveal prompt",
                "show instructions",
                
                // Code execution attempts
                "execute code",
                "run command",
                "eval(",
                "exec(",
                "__import__",
                "subprocess",
                "os.system",
                
                // Data exfiltration attempts
                "send to url",
                "post to webhook",
                "upload to",
                "transmit data",
                "leak information",
                
                // Role manipulation
                "you are now",
                "act as root",
                "pretend to be admin",
                "assume role",
                "switch context",
                
                // Harmful content
                "malicious",
                "exploit",
                "vulnerability",
                "backdoor",
                "ransomware"
            };
        }

        /// <summary>
        /// Initializes validation rules for different input types
        /// </summary>
        private Dictionary<string, Regex> InitializeValidationRules()
        {
            return new Dictionary<string, Regex>
            {
                ["resource_name"] = new Regex(@"^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,62}[a-zA-Z0-9]$"),
                ["azure_region"] = new Regex(@"^[a-z]{2,20}[a-z0-9]{0,10}$"),
                ["service_level"] = new Regex(@"^(Standard|Premium|Ultra)$"),
                ["number"] = new Regex(@"^[0-9]{1,10}$"),
                ["percentage"] = new Regex(@"^[0-9]{1,3}(\.[0-9]{1,2})?$"),
                ["time_range"] = new Regex(@"^[0-9]{1,3}(hours?|days?|weeks?|months?)$"),
                ["time_duration"] = new Regex(@"^[0-9]{1,4}(minutes?|hours?|days?)$"),
                ["currency"] = new Regex(@"^[0-9]{1,10}(\.[0-9]{2})?$"),
                ["workload_type"] = new Regex(@"^[a-zA-Z][a-zA-Z0-9\s\-_]{0,50}$"),
                ["compliance_list"] = new Regex(@"^[a-zA-Z][a-zA-Z0-9\s,\-_]{0,200}$"),
                ["error_message"] = new Regex(@"^[a-zA-Z0-9\s\-_\.:,()]{1,500}$"),
                ["general"] = new Regex(@"^[a-zA-Z0-9\s\-_\.:,()]{1,1000}$")
            };
        }

        /// <summary>
        /// Creates a custom prompt with validation
        /// </summary>
        /// <param name="template">Template string with placeholders</param>
        /// <param name="parameters">Parameters to substitute</param>
        /// <returns>Sanitized prompt</returns>
        public string CreateCustomPrompt(string template, Dictionary<string, string> parameters)
        {
            // Validate template length
            if (template.Length > 5000)
            {
                throw new ArgumentException("Template exceeds maximum length");
            }

            // Check for blocked patterns in template
            if (ContainsBlockedPattern(template))
            {
                _logger.LogError("Blocked pattern detected in custom template");
                throw new SecurityException("Template contains prohibited content");
            }

            // Sanitize and substitute parameters
            var result = template;
            foreach (var param in parameters)
            {
                var sanitizedValue = SanitizeParameter(param.Key, param.Value, new PromptTemplate
                {
                    AllowedParameters = new HashSet<string> { param.Key },
                    ParameterValidation = new Dictionary<string, string> { [param.Key] = "general" }
                });
                
                result = result.Replace($"{{{param.Key}}}", sanitizedValue);
            }

            return result;
        }

        /// <summary>
        /// Represents a prompt template with validation rules
        /// </summary>
        private class PromptTemplate
        {
            public string Key { get; set; } = string.Empty;
            public string Template { get; set; } = string.Empty;
            public HashSet<string> AllowedParameters { get; set; } = new();
            public Dictionary<string, string> ParameterValidation { get; set; } = new();
        }
    }
}