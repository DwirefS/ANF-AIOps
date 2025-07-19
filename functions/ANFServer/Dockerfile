# ANF-AIOps Azure Functions Dockerfile
# Author: Dwiref Sharma <DwirefS@SapientEdge.io>
# .NET 8.0 Azure Functions container

# =============================================================================
# BUILD STAGE
# =============================================================================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

# Set working directory
WORKDIR /src

# Copy project files
COPY ["ANFServer.csproj", "./"]

# Restore dependencies
RUN dotnet restore "ANFServer.csproj"

# Copy source code
COPY . .

# Build the application
RUN dotnet build "ANFServer.csproj" -c Release -o /app/build

# Publish the application
RUN dotnet publish "ANFServer.csproj" -c Release -o /app/publish \
    --no-restore --no-build

# =============================================================================
# RUNTIME STAGE
# =============================================================================
FROM mcr.microsoft.com/azure-functions/dotnet-isolated:4-dotnet-isolated8.0

# Create non-root user for security
RUN groupadd -r dotnet && useradd -r -g dotnet dotnet

# Set environment variables
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    FUNCTIONS_WORKER_RUNTIME=dotnet-isolated \
    DOTNET_USE_POLLING_FILE_WATCHER=true

# Create application directory
WORKDIR /home/site/wwwroot

# Copy published application
COPY --from=build /app/publish .

# Copy configuration files
COPY docker/functions/config/ ./config/

# Install additional dependencies for Azure integration
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create necessary directories
RUN mkdir -p /home/site/wwwroot/logs && \
    chown -R dotnet:dotnet /home/site/wwwroot

# Switch to non-root user
USER dotnet

# Health check for Azure Functions
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost/api/health || exit 1

# =============================================================================
# LABELS
# =============================================================================
LABEL maintainer="Dwiref Sharma <DwirefS@SapientEdge.io>"
LABEL version="2.0.0"
LABEL description="ANF-AIOps Azure Functions"
LABEL org.opencontainers.image.title="ANF-AIOps Azure Functions"
LABEL org.opencontainers.image.description="Azure Functions for Azure NetApp Files AI operations"
LABEL org.opencontainers.image.version="2.0.0"
LABEL org.opencontainers.image.authors="Dwiref Sharma <DwirefS@SapientEdge.io>"
LABEL org.opencontainers.image.url="https://github.com/your-org/ANF-AIOps"
LABEL org.opencontainers.image.documentation="https://github.com/your-org/ANF-AIOps/blob/main/docs/README.md"
LABEL org.opencontainers.image.source="https://github.com/your-org/ANF-AIOps"
LABEL org.opencontainers.image.licenses="MIT"