#!/bin/bash
# ANF-AIOps Development Environment Setup Script
# Author: Dwiref Sharma <DwirefS@SapientEdge.io>
# Comprehensive setup script for development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${PURPLE}==========================================${NC}"
    echo -e "${PURPLE} $1${NC}"
    echo -e "${PURPLE}==========================================${NC}"
    echo ""
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if running on supported OS
check_os() {
    print_status "Checking operating system..."
    
    case "$(uname -s)" in
        Darwin*)
            OS="macOS"
            PACKAGE_MANAGER="brew"
            ;;
        Linux*)
            OS="Linux"
            if command_exists apt-get; then
                PACKAGE_MANAGER="apt"
            elif command_exists yum; then
                PACKAGE_MANAGER="yum"
            elif command_exists dnf; then
                PACKAGE_MANAGER="dnf"
            else
                print_error "Unsupported Linux distribution. Please install dependencies manually."
                exit 1
            fi
            ;;
        CYGWIN*|MINGW32*|MSYS*|MINGW*)
            OS="Windows"
            PACKAGE_MANAGER="choco"
            ;;
        *)
            print_error "Unsupported operating system: $(uname -s)"
            exit 1
            ;;
    esac
    
    print_success "Detected OS: $OS with package manager: $PACKAGE_MANAGER"
}

# Function to install package manager if needed
install_package_manager() {
    case $PACKAGE_MANAGER in
        brew)
            if ! command_exists brew; then
                print_status "Installing Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                print_success "Homebrew installed"
            else
                print_success "Homebrew already installed"
            fi
            ;;
        choco)
            if ! command_exists choco; then
                print_status "Installing Chocolatey..."
                powershell.exe -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
                print_success "Chocolatey installed"
            else
                print_success "Chocolatey already installed"
            fi
            ;;
    esac
}

# Function to install Node.js
install_nodejs() {
    print_status "Installing Node.js..."
    
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js already installed: $NODE_VERSION"
        
        # Check if version is >= 18
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            print_warning "Node.js version is less than 18. Upgrading..."
        else
            return 0
        fi
    fi
    
    case $PACKAGE_MANAGER in
        brew)
            brew install node@18
            ;;
        apt)
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        yum|dnf)
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo $PACKAGE_MANAGER install -y nodejs npm
            ;;
        choco)
            choco install nodejs --version=18.19.0
            ;;
    esac
    
    print_success "Node.js installed: $(node --version)"
}

# Function to install .NET SDK
install_dotnet() {
    print_status "Installing .NET 8.0 SDK..."
    
    if command_exists dotnet; then
        DOTNET_VERSION=$(dotnet --version)
        print_success ".NET SDK already installed: $DOTNET_VERSION"
        
        # Check if version is >= 8.0
        MAJOR_VERSION=$(echo $DOTNET_VERSION | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -lt 8 ]; then
            print_warning ".NET SDK version is less than 8.0. Installing .NET 8.0..."
        else
            return 0
        fi
    fi
    
    case $PACKAGE_MANAGER in
        brew)
            brew install --cask dotnet
            ;;
        apt)
            wget https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
            sudo dpkg -i packages-microsoft-prod.deb
            rm packages-microsoft-prod.deb
            sudo apt-get update
            sudo apt-get install -y dotnet-sdk-8.0
            ;;
        yum|dnf)
            sudo rpm -Uvh https://packages.microsoft.com/config/rhel/8/packages-microsoft-prod.rpm
            sudo $PACKAGE_MANAGER install -y dotnet-sdk-8.0
            ;;
        choco)
            choco install dotnet-8.0-sdk
            ;;
    esac
    
    print_success ".NET SDK installed: $(dotnet --version)"
}

# Function to install Azure CLI
install_azure_cli() {
    print_status "Installing Azure CLI..."
    
    if command_exists az; then
        print_success "Azure CLI already installed: $(az --version | head -n1)"
        return 0
    fi
    
    case $PACKAGE_MANAGER in
        brew)
            brew install azure-cli
            ;;
        apt)
            curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
            ;;
        yum|dnf)
            sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
            sudo sh -c 'echo -e "[azure-cli]\nname=Azure CLI\nbaseurl=https://packages.microsoft.com/yumrepos/azure-cli\nenabled=1\ngpgcheck=1\ngpgkey=https://packages.microsoft.com/keys/microsoft.asc" > /etc/yum.repos.d/azure-cli.repo'
            sudo $PACKAGE_MANAGER install -y azure-cli
            ;;
        choco)
            choco install azure-cli
            ;;
    esac
    
    print_success "Azure CLI installed: $(az --version | head -n1)"
}

# Function to install Azure Functions Core Tools
install_func_tools() {
    print_status "Installing Azure Functions Core Tools..."
    
    if command_exists func; then
        print_success "Azure Functions Core Tools already installed: $(func --version)"
        return 0
    fi
    
    case $PACKAGE_MANAGER in
        brew)
            brew tap azure/functions
            brew install azure-functions-core-tools@4
            ;;
        apt)
            curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
            sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg
            sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-ubuntu-$(lsb_release -cs)-prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
            sudo apt-get update
            sudo apt-get install -y azure-functions-core-tools-4
            ;;
        yum|dnf)
            sudo $PACKAGE_MANAGER install -y azure-functions-core-tools-4
            ;;
        choco)
            choco install azure-functions-core-tools
            ;;
        *)
            npm install -g azure-functions-core-tools@4 --unsafe-perm true
            ;;
    esac
    
    print_success "Azure Functions Core Tools installed: $(func --version)"
}

# Function to install Docker
install_docker() {
    print_status "Installing Docker..."
    
    if command_exists docker; then
        print_success "Docker already installed: $(docker --version)"
        return 0
    fi
    
    case $PACKAGE_MANAGER in
        brew)
            brew install --cask docker
            print_warning "Please start Docker Desktop manually"
            ;;
        apt)
            sudo apt-get update
            sudo apt-get install -y ca-certificates curl gnupg lsb-release
            sudo mkdir -m 0755 -p /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            sudo systemctl start docker
            sudo systemctl enable docker
            sudo usermod -aG docker $USER
            ;;
        yum|dnf)
            sudo $PACKAGE_MANAGER install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo $PACKAGE_MANAGER install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            sudo systemctl start docker
            sudo systemctl enable docker
            sudo usermod -aG docker $USER
            ;;
        choco)
            choco install docker-desktop
            ;;
    esac
    
    print_success "Docker installed: $(docker --version)"
}

# Function to install Git
install_git() {
    print_status "Installing Git..."
    
    if command_exists git; then
        print_success "Git already installed: $(git --version)"
        return 0
    fi
    
    case $PACKAGE_MANAGER in
        brew)
            brew install git
            ;;
        apt)
            sudo apt-get install -y git
            ;;
        yum|dnf)
            sudo $PACKAGE_MANAGER install -y git
            ;;
        choco)
            choco install git
            ;;
    esac
    
    print_success "Git installed: $(git --version)"
}

# Function to install development tools
install_dev_tools() {
    print_status "Installing development tools..."
    
    # Install VS Code (optional)
    if ! command_exists code; then
        case $PACKAGE_MANAGER in
            brew)
                brew install --cask visual-studio-code
                ;;
            apt)
                wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
                sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
                sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
                sudo apt-get update
                sudo apt-get install -y code
                ;;
            choco)
                choco install vscode
                ;;
        esac
        print_success "VS Code installed"
    fi
    
    # Install curl if not present
    if ! command_exists curl; then
        case $PACKAGE_MANAGER in
            brew)
                brew install curl
                ;;
            apt)
                sudo apt-get install -y curl
                ;;
            yum|dnf)
                sudo $PACKAGE_MANAGER install -y curl
                ;;
            choco)
                choco install curl
                ;;
        esac
        print_success "curl installed"
    fi
    
    # Install jq for JSON processing
    if ! command_exists jq; then
        case $PACKAGE_MANAGER in
            brew)
                brew install jq
                ;;
            apt)
                sudo apt-get install -y jq
                ;;
            yum|dnf)
                sudo $PACKAGE_MANAGER install -y jq
                ;;
            choco)
                choco install jq
                ;;
        esac
        print_success "jq installed"
    fi
}

# Function to install project dependencies
install_project_dependencies() {
    print_header "Installing Project Dependencies"
    
    # Check if we're in the correct directory
    if [ ! -f "CLAUDE.md" ]; then
        print_error "Please run this script from the ANF-AIOps root directory"
        exit 1
    fi
    
    # Install MCP Server dependencies
    if [ -d "src/mcp-server" ]; then
        print_status "Installing MCP Server dependencies..."
        cd src/mcp-server
        npm install
        cd ../..
        print_success "MCP Server dependencies installed"
    fi
    
    # Install Teams Bot dependencies
    if [ -d "src/teams-bot" ]; then
        print_status "Installing Teams Bot dependencies..."
        cd src/teams-bot
        npm install
        cd ../..
        print_success "Teams Bot dependencies installed"
    fi
    
    # Install RAG System dependencies
    if [ -d "rag" ]; then
        print_status "Installing RAG System dependencies..."
        cd rag
        npm install
        cd ..
        print_success "RAG System dependencies installed"
    fi
    
    # Restore .NET dependencies
    if [ -d "functions/ANFServer" ]; then
        print_status "Restoring .NET dependencies..."
        cd functions/ANFServer
        dotnet restore
        cd ../..
        print_success ".NET dependencies restored"
    fi
}

# Function to setup environment files
setup_environment_files() {
    print_header "Setting Up Environment Files"
    
    # Copy .env.example to .env if it doesn't exist
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        print_status "Creating .env from .env.example..."
        cp .env.example .env
        print_success ".env file created"
        print_warning "Please edit .env file with your actual configuration values"
    fi
    
    # Setup local.settings.json for Azure Functions
    if [ -d "functions/ANFServer" ] && [ ! -f "functions/ANFServer/local.settings.json" ]; then
        print_status "Creating local.settings.json for Azure Functions..."
        cat > functions/ANFServer/local.settings.json << 'EOF'
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "AZURE_CLIENT_ID": "your-client-id",
    "AZURE_CLIENT_SECRET": "your-client-secret",
    "AZURE_TENANT_ID": "your-tenant-id",
    "AZURE_SUBSCRIPTION_ID": "your-subscription-id",
    "ANF_ACCOUNT_NAME": "your-anf-account",
    "ANF_RESOURCE_GROUP": "your-resource-group",
    "JWT_SECRET": "your-jwt-secret-key",
    "MCP_SERVER_URL": "http://localhost:3000",
    "MCP_API_KEY": "your-mcp-api-key"
  },
  "Host": {
    "CORS": "*"
  }
}
EOF
        print_success "local.settings.json created"
        print_warning "Please edit functions/ANFServer/local.settings.json with your actual configuration values"
    fi
}

# Function to setup Git hooks
setup_git_hooks() {
    print_header "Setting Up Git Hooks"
    
    if [ -d ".git" ]; then
        print_status "Setting up pre-commit hooks..."
        
        # Install pre-commit if available
        if command_exists pip3; then
            pip3 install --user pre-commit
        elif command_exists pip; then
            pip install --user pre-commit
        fi
        
        if command_exists pre-commit; then
            pre-commit install
            print_success "Pre-commit hooks installed"
        else
            print_warning "pre-commit not available. Please install it manually for optimal development experience."
        fi
    fi
}

# Function to verify installation
verify_installation() {
    print_header "Verifying Installation"
    
    local all_good=true
    
    # Check Node.js
    if command_exists node; then
        print_success "Node.js: $(node --version)"
    else
        print_error "Node.js not found"
        all_good=false
    fi
    
    # Check .NET
    if command_exists dotnet; then
        print_success ".NET SDK: $(dotnet --version)"
    else
        print_error ".NET SDK not found"
        all_good=false
    fi
    
    # Check Azure CLI
    if command_exists az; then
        print_success "Azure CLI: $(az --version | head -n1 | cut -d' ' -f2)"
    else
        print_warning "Azure CLI not found (optional for development)"
    fi
    
    # Check Functions Core Tools
    if command_exists func; then
        print_success "Azure Functions Core Tools: $(func --version)"
    else
        print_warning "Azure Functions Core Tools not found (needed for local function development)"
    fi
    
    # Check Docker
    if command_exists docker; then
        print_success "Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
    else
        print_warning "Docker not found (optional for containerized development)"
    fi
    
    # Check Git
    if command_exists git; then
        print_success "Git: $(git --version | cut -d' ' -f3)"
    else
        print_error "Git not found"
        all_good=false
    fi
    
    if $all_good; then
        print_success "All essential tools are installed!"
    else
        print_error "Some essential tools are missing. Please install them manually."
        return 1
    fi
}

# Function to display next steps
show_next_steps() {
    print_header "Next Steps"
    
    echo "1. Edit configuration files:"
    echo "   - .env (main environment configuration)"
    echo "   - functions/ANFServer/local.settings.json (Azure Functions settings)"
    echo ""
    echo "2. Start development services:"
    echo "   - MCP Server: cd src/mcp-server && npm run dev"
    echo "   - Teams Bot: cd src/teams-bot && npm run dev"
    echo "   - RAG System: cd rag && npm run dev"
    echo "   - Azure Functions: cd functions/ANFServer && func start"
    echo ""
    echo "3. Or use Docker Compose for complete environment:"
    echo "   - docker-compose up -d"
    echo ""
    echo "4. Access development tools:"
    echo "   - Swagger UI: http://localhost:8080"
    echo "   - Redis Commander: http://localhost:8081"
    echo "   - ElasticHQ: http://localhost:5000"
    echo "   - Grafana: http://localhost:3001"
    echo ""
    echo "5. Run tests:"
    echo "   - npm run test (in each TypeScript project)"
    echo "   - dotnet test (in functions/ANFServer)"
    echo ""
    echo "📖 Documentation: docs/USER-GUIDE.md, docs/API-REFERENCE.md, docs/DEPLOYMENT-GUIDE.md"
    echo "🐛 Issues: https://github.com/your-org/ANF-AIOps/issues"
    echo "📧 Support: DwirefS@SapientEdge.io"
}

# Main execution
main() {
    print_header "ANF-AIOps Development Environment Setup"
    print_status "Author: Dwiref Sharma <DwirefS@SapientEdge.io>"
    
    # Check OS and package manager
    check_os
    
    # Install package manager if needed
    install_package_manager
    
    # Install essential tools
    print_header "Installing Essential Tools"
    install_git
    install_nodejs
    install_dotnet
    install_azure_cli
    install_func_tools
    install_docker
    install_dev_tools
    
    # Install project dependencies
    install_project_dependencies
    
    # Setup environment files
    setup_environment_files
    
    # Setup Git hooks
    setup_git_hooks
    
    # Verify installation
    verify_installation
    
    # Show next steps
    show_next_steps
    
    print_success "Development environment setup completed!"
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi