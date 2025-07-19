using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Azure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Azure.Identity;
using ANFServer.Middleware;
using ANFServer.Services;
using ANFServer.Security;

/// <summary>
/// Main entry point for the Azure Functions application
/// </summary>
/// <author>Dwiref Sharma &lt;DwirefS@SapientEdge.io&gt;</author>
var host = new HostBuilder()
    .ConfigureFunctionsWebApplication(builder =>
    {
        // Register custom middleware for JWT validation
        builder.UseMiddleware<JwtValidationMiddleware>();
        
        // Configure logging
        builder.Services.AddApplicationInsightsTelemetryWorkerService();
        builder.Services.ConfigureFunctionsApplicationInsights();
    })
    .ConfigureAppConfiguration((context, config) =>
    {
        config.AddJsonFile("local.settings.json", optional: true, reloadOnChange: true);
        config.AddEnvironmentVariables();
    })
    .ConfigureServices((context, services) =>
    {
        var configuration = context.Configuration;
        
        // Configure logging
        services.AddLogging(builder =>
        {
            builder.AddConsole();
            builder.AddApplicationInsights();
            builder.SetMinimumLevel(LogLevel.Information);
        });
        
        // Register Azure clients
        services.AddAzureClients(clientBuilder =>
        {
            // Use DefaultAzureCredential for authentication
            clientBuilder.UseCredential(new DefaultAzureCredential());
            
            // Add NetApp management client
            clientBuilder.AddClient<Azure.ResourceManager.ArmClient, Azure.ResourceManager.ArmClientOptions>((options, token) =>
            {
                return new Azure.ResourceManager.ArmClient(token, options);
            });
        });
        
        // Register security services
        services.AddSingleton<SecureResponseBuilder>();
        services.AddSingleton<AuthGuards>();
        services.AddSingleton<PromptLibrary>();
        
        // Configure JWT validation
        services.Configure<JwtValidationOptions>(options =>
        {
            options.Authority = configuration["AzureAd:Authority"] ?? "https://login.microsoftonline.com/common";
            options.Audience = configuration["AzureAd:ClientId"];
            options.ValidateIssuer = true;
            options.ValidateAudience = true;
            options.ValidateLifetime = true;
            options.RequireExpirationTime = true;
            options.RequireSignedTokens = true;
        });
        
        // Register application services
        services.AddHttpClient();
        services.AddMemoryCache();
        
        // Register ANF services
        services.AddScoped<IANFService, ANFService>();
    })
    .Build();

// Run the host
await host.RunAsync();