#!/bin/bash
# Setup Development Environment Script
# Author: Dwiref Sharma <DwirefS@SapientEdge.io>

set -e

echo "==================================="
echo "ANF-AIOps Development Environment Setup"
echo "==================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed"
        return 1
    else
        log_info "$1 is installed: $(command -v $1)"
        return 0
    fi
}

# Check prerequisites
log_info "Checking prerequisites..."

MISSING_DEPS=0

# Check for required tools
REQUIRED_TOOLS=("git" "node" "npm" "dotnet" "az" "terraform" "func")

for tool in "${REQUIRED_TOOLS[@]}"; do
    if ! check_command $tool; then
        MISSING_DEPS=1
        case $tool in
            "node")
                log_warn "Install Node.js from https://nodejs.org/"
                ;;
            "dotnet")
                log_warn "Install .NET SDK from https://dotnet.microsoft.com/download"
                ;;
            "az")
                log_warn "Install Azure CLI from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
                ;;
            "terraform")
                log_warn "Install Terraform from https://www.terraform.io/downloads"
                ;;
            "func")
                log_warn "Install Azure Functions Core Tools: npm install -g azure-functions-core-tools@4"
                ;;
        esac
    fi
done

if [ $MISSING_DEPS -eq 1 ]; then
    log_error "Missing required dependencies. Please install them and run this script again."
    exit 1
fi

# Check versions
log_info "Checking tool versions..."

NODE_VERSION=$(node --version | cut -d'v' -f2)
DOTNET_VERSION=$(dotnet --version)
TERRAFORM_VERSION=$(terraform version -json | jq -r '.terraform_version' 2>/dev/null || terraform version | head -n1 | cut -d' ' -f2)

log_info "Node.js version: $NODE_VERSION"
log_info ".NET SDK version: $DOTNET_VERSION"
log_info "Terraform version: $TERRAFORM_VERSION"

# Create necessary directories
log_info "Creating directory structure..."

mkdir -p .azure
mkdir -p logs
mkdir -p temp

# Setup Git hooks
log_info "Setting up Git hooks..."

cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook for ANF-AIOps

# Run linting for TypeScript projects
echo "Running TypeScript linting..."
for dir in rag src/mcp-server src/teams-bot; do
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        echo "Linting $dir..."
        cd "$dir"
        npm run lint || {
            echo "Linting failed in $dir"
            exit 1
        }
        cd - > /dev/null
    fi
done

# Check for secrets
echo "Checking for secrets..."
if git diff --cached --name-only | xargs grep -E "(password|secret|key)\s*=\s*[\"'][^\"']+[\"']" 2>/dev/null; then
    echo "Potential secrets detected! Please review your changes."
    exit 1
fi

echo "Pre-commit checks passed!"
EOF

chmod +x .git/hooks/pre-commit

# Install Node.js dependencies
log_info "Installing Node.js dependencies..."

for dir in rag src/mcp-server src/teams-bot; do
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        log_info "Installing dependencies for $dir..."
        cd "$dir"
        npm ci
        cd - > /dev/null
    fi
done

# Restore .NET packages
log_info "Restoring .NET packages..."

cd functions/ANFServer
dotnet restore
cd - > /dev/null

# Setup local settings files
log_info "Setting up local configuration files..."

# Create local.settings.json template for Azure Functions
if [ ! -f "functions/ANFServer/local.settings.json" ]; then
    cat > functions/ANFServer/local.settings.json << 'EOF'
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "Environment": "Development",
    "KeyVaultName": "your-keyvault-name",
    "TenantId": "your-tenant-id",
    "ClientId": "your-client-id",
    "ClientSecret": "your-client-secret"
  }
}
EOF
    log_warn "Created local.settings.json template. Please update with your values."
fi

# Create .env files for Node.js projects
for dir in rag src/mcp-server src/teams-bot; do
    if [ -d "$dir" ] && [ ! -f "$dir/.env" ]; then
        cat > "$dir/.env" << 'EOF'
NODE_ENV=development
PORT=3000
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
KEY_VAULT_NAME=your-keyvault-name
EOF
        log_warn "Created .env template in $dir. Please update with your values."
    fi
done

# Setup Azure CLI
log_info "Checking Azure CLI configuration..."

if ! az account show &> /dev/null; then
    log_warn "You are not logged into Azure. Run 'az login' to authenticate."
else
    CURRENT_SUB=$(az account show --query name -o tsv)
    log_info "Currently using Azure subscription: $CURRENT_SUB"
fi

# Initialize Terraform
log_info "Initializing Terraform..."

cd infra
terraform init -backend=false
cd - > /dev/null

# Create VS Code workspace settings
log_info "Creating VS Code workspace settings..."

mkdir -p .vscode

cat > .vscode/settings.json << 'EOF'
{
  "files.exclude": {
    "**/bin": true,
    "**/obj": true,
    "**/node_modules": true,
    "**/.terraform": true
  },
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "typescript"
  ],
  "azureFunctions.deploySubpath": "functions/ANFServer/bin/Release/net8.0/publish",
  "azureFunctions.projectLanguage": "C#",
  "azureFunctions.projectRuntime": "~4",
  "debug.internalConsoleOptions": "neverOpen",
  "dotnet.defaultSolution": "functions/ANFServer/ANFServer.sln"
}
EOF

cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "ms-azuretools.vscode-azurefunctions",
    "ms-dotnettools.csharp",
    "ms-azuretools.vscode-docker",
    "hashicorp.terraform",
    "ms-vscode.azure-account",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
EOF

# Final checks
log_info "Running final validation..."

# Check if all services can be built
log_info "Testing build processes..."

# Test .NET build
cd functions/ANFServer
if dotnet build --configuration Debug > /dev/null 2>&1; then
    log_info ".NET build successful"
else
    log_warn ".NET build failed - check error messages above"
fi
cd - > /dev/null

# Test Node.js builds
for dir in rag src/mcp-server src/teams-bot; do
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        cd "$dir"
        if npm run build > /dev/null 2>&1; then
            log_info "$dir build successful"
        else
            log_warn "$dir build failed - check package.json scripts"
        fi
        cd - > /dev/null
    fi
done

# Summary
echo ""
echo "==================================="
echo "Setup Summary"
echo "==================================="

log_info "Development environment setup completed!"
echo ""
echo "Next steps:"
echo "1. Update local configuration files with your Azure credentials"
echo "2. Run 'az login' if you haven't already"
echo "3. Install recommended VS Code extensions"
echo "4. Run './ci-cd/scripts/run-tests.sh' to verify everything is working"
echo ""
echo "To start development:"
echo "- Azure Functions: cd functions/ANFServer && func start"
echo "- MCP Server: cd src/mcp-server && npm run dev"
echo "- Teams Bot: cd src/teams-bot && npm run dev"
echo ""
log_info "Happy coding!"