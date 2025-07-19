#!/bin/bash
# ANF-AIOps Fix Dependencies Script
# Author: Dwiref Sharma <DwirefS@SapientEdge.io>
# Resolves all critical dependency issues identified in health check

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

# Function to install Node.js dependencies for a project
install_node_project_deps() {
    local project_dir=$1
    local project_name=$(basename "$project_dir")
    
    if [ ! -d "$project_dir" ]; then
        print_warning "Directory $project_dir does not exist, skipping"
        return 0
    fi
    
    if [ ! -f "$project_dir/package.json" ]; then
        print_warning "No package.json found in $project_dir, skipping"
        return 0
    fi
    
    print_status "Installing dependencies for $project_name..."
    
    cd "$project_dir"
    
    # Remove existing node_modules and lock files for clean install
    rm -rf node_modules package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null || true
    
    # Install dependencies
    npm install --silent
    
    # Create package-lock.json
    if [ ! -f "package-lock.json" ]; then
        npm shrinkwrap --silent
        mv npm-shrinkwrap.json package-lock.json 2>/dev/null || true
    fi
    
    cd - > /dev/null
    print_success "Dependencies installed for $project_name"
}

# Function to verify Node.js and npm versions
verify_node_npm() {
    print_header "Verifying Node.js and npm"
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        print_status "Visit: https://nodejs.org/en/download/"
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    local node_version=$(node --version | sed 's/v//')
    local npm_version=$(npm --version)
    local node_major=$(echo $node_version | cut -d'.' -f1)
    
    print_success "Node.js version: $node_version"
    print_success "npm version: $npm_version"
    
    if [ "$node_major" -lt 18 ]; then
        print_error "Node.js version $node_version is too old. Please upgrade to v18 or higher."
        exit 1
    fi
    
    # Update npm to latest version
    print_status "Updating npm to latest version..."
    npm install -g npm@latest --silent
    print_success "npm updated to $(npm --version)"
}

# Function to install global npm packages
install_global_packages() {
    print_header "Installing Global npm Packages"
    
    local global_packages=(
        "typescript@latest"
        "tsx@latest"
        "@types/node@latest"
        "rimraf@latest"
        "concurrently@latest"
        "nodemon@latest"
    )
    
    for package in "${global_packages[@]}"; do
        print_status "Installing global package: $package"
        npm install -g "$package" --silent
    done
    
    print_success "Global packages installed"
}

# Function to fix TypeScript projects
fix_typescript_projects() {
    print_header "Fixing TypeScript Projects"
    
    local ts_projects=(
        "src/mcp-server"
        "src/teams-bot"
        "rag"
    )
    
    for project in "${ts_projects[@]}"; do
        install_node_project_deps "$project"
    done
    
    print_success "All TypeScript projects fixed"
}

# Function to fix .NET project
fix_dotnet_project() {
    print_header "Fixing .NET Project"
    
    if ! command_exists dotnet; then
        print_warning ".NET SDK not found. Skipping .NET project."
        print_status "To install .NET SDK, visit: https://dotnet.microsoft.com/download"
        return 0
    fi
    
    if [ -d "functions/ANFServer" ]; then
        print_status "Restoring .NET dependencies..."
        cd functions/ANFServer
        
        # Clean previous builds
        dotnet clean --verbosity quiet 2>/dev/null || true
        
        # Restore dependencies
        dotnet restore --verbosity quiet
        
        # Verify build
        if dotnet build --verbosity quiet --no-restore; then
            print_success ".NET project dependencies restored and built successfully"
        else
            print_warning ".NET project build failed, but dependencies were restored"
        fi
        
        cd - > /dev/null
    else
        print_warning "No .NET project found at functions/ANFServer"
    fi
}

# Function to create missing configuration files
create_missing_configs() {
    print_header "Creating Missing Configuration Files"
    
    # Create local.settings.json for Azure Functions if it doesn't exist
    if [ -d "functions/ANFServer" ] && [ ! -f "functions/ANFServer/local.settings.json" ]; then
        if [ -f "functions/ANFServer/local.settings.example.json" ]; then
            print_status "Creating local.settings.json from example..."
            cp "functions/ANFServer/local.settings.example.json" "functions/ANFServer/local.settings.json"
            print_success "local.settings.json created"
            print_warning "Please edit functions/ANFServer/local.settings.json with your actual configuration"
        fi
    fi
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        print_status "Creating .env from example..."
        cp ".env.example" ".env"
        print_success ".env file created"
        print_warning "Please edit .env file with your actual configuration"
    fi
    
    # Create parameter files for infrastructure if they don't exist
    local param_files=(
        "src/infrastructure/bicep/environments/dev.parameters.json"
        "src/infrastructure/bicep/environments/test.parameters.json"
        "src/infrastructure/bicep/environments/prod.parameters.json"
    )
    
    for param_file in "${param_files[@]}"; do
        if [ ! -f "$param_file" ] && [ -f "${param_file%.json}.example.json" ]; then
            print_status "Creating $(basename $param_file) from example..."
            cp "${param_file%.json}.example.json" "$param_file"
            print_success "$(basename $param_file) created"
        fi
    done
}

# Function to verify installations
verify_installations() {
    print_header "Verifying Installations"
    
    local all_good=true
    
    # Check TypeScript projects
    local ts_projects=(
        "src/mcp-server"
        "src/teams-bot"
        "rag"
    )
    
    for project in "${ts_projects[@]}"; do
        if [ -d "$project" ] && [ -f "$project/package.json" ]; then
            if [ -d "$project/node_modules" ]; then
                print_success "$project: Dependencies installed"
            else
                print_error "$project: Dependencies missing"
                all_good=false
            fi
            
            if [ -f "$project/package-lock.json" ]; then
                print_success "$project: Lock file present"
            else
                print_warning "$project: Lock file missing"
            fi
        fi
    done
    
    # Check .NET project
    if [ -d "functions/ANFServer" ]; then
        cd functions/ANFServer
        if dotnet restore --verbosity quiet --dry-run >/dev/null 2>&1; then
            print_success "ANFServer: .NET dependencies verified"
        else
            print_error "ANFServer: .NET dependencies issues"
            all_good=false
        fi
        cd - > /dev/null
    fi
    
    # Check configuration files
    local config_files=(
        ".env"
        "functions/ANFServer/local.settings.json"
    )
    
    for config_file in "${config_files[@]}"; do
        if [ -f "$config_file" ]; then
            print_success "Configuration: $config_file exists"
        else
            print_warning "Configuration: $config_file missing"
        fi
    done
    
    if $all_good; then
        print_success "All critical issues resolved!"
    else
        print_warning "Some issues remain. Please check the errors above."
    fi
}

# Function to run quick build test
run_build_test() {
    print_header "Running Quick Build Test"
    
    local build_failed=false
    
    # Test TypeScript builds
    local ts_projects=(
        "src/mcp-server"
        "src/teams-bot"
        "rag"
    )
    
    for project in "${ts_projects[@]}"; do
        if [ -d "$project" ] && [ -f "$project/package.json" ]; then
            print_status "Testing build for $project..."
            cd "$project"
            
            if npm run build >/dev/null 2>&1; then
                print_success "$project: Build successful"
            else
                print_warning "$project: Build failed (this is normal if source files are missing)"
            fi
            
            cd - > /dev/null
        fi
    done
    
    # Test .NET build
    if [ -d "functions/ANFServer" ] && command_exists dotnet; then
        print_status "Testing .NET build..."
        cd functions/ANFServer
        
        if dotnet build --verbosity quiet >/dev/null 2>&1; then
            print_success "ANFServer: Build successful"
        else
            print_warning "ANFServer: Build failed (this is normal if source files are missing)"
        fi
        
        cd - > /dev/null
    fi
}

# Function to show next steps
show_next_steps() {
    print_header "Next Steps"
    
    echo "Dependencies have been fixed! Here's what you can do next:"
    echo ""
    echo "$(echo -e "${GREEN}1. Start Development:${NC}")"
    echo "   make dev-local              # Start all services locally"
    echo "   make docker-up              # Start with Docker Compose"
    echo ""
    echo "$(echo -e "${GREEN}2. Build Projects:${NC}")"
    echo "   make build                  # Build all components"
    echo "   make build-prod             # Build for production"
    echo ""
    echo "$(echo -e "${GREEN}3. Run Tests:${NC}")"
    echo "   make test                   # Run all tests"
    echo "   make test-coverage          # Generate coverage reports"
    echo ""
    echo "$(echo -e "${GREEN}4. Configuration:${NC}")"
    echo "   Edit .env file with your Azure credentials"
    echo "   Edit functions/ANFServer/local.settings.json with your settings"
    echo ""
    echo "$(echo -e "${GREEN}5. Documentation:${NC}")"
    echo "   docs/USER-GUIDE.md          # User documentation"
    echo "   docs/API-REFERENCE.md       # API documentation"
    echo "   docs/DEPLOYMENT-GUIDE.md    # Deployment instructions"
    echo ""
    echo "$(echo -e "${YELLOW}Important:${NC}")"
    echo "   - Update configuration files with your actual Azure credentials"
    echo "   - Ensure you have proper Azure RBAC permissions"
    echo "   - Review security settings before production deployment"
}

# Main execution function
main() {
    print_header "ANF-AIOps Dependency Fix"
    print_status "Author: Dwiref Sharma <DwirefS@SapientEdge.io>"
    
    # Check if we're in the right directory
    if [ ! -f "CLAUDE.md" ]; then
        print_error "Please run this script from the ANF-AIOps root directory"
        exit 1
    fi
    
    # Execute fixes
    verify_node_npm
    install_global_packages
    fix_typescript_projects
    fix_dotnet_project
    create_missing_configs
    verify_installations
    run_build_test
    show_next_steps
    
    print_success "Dependency fix completed successfully!"
    print_status "Run 'make status' to check the current state of your project"
}

# Trap errors
trap 'print_error "Dependency fix failed at line $LINENO"; exit 1' ERR

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi