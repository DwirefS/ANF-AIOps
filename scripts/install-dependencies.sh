#!/bin/bash
# ANF-AIOps Install Dependencies Script
# Author: Dwiref Sharma <DwirefS@SapientEdge.io>
# Install and manage project dependencies

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
FORCE_INSTALL=${FORCE_INSTALL:-false}
PRODUCTION_ONLY=${PRODUCTION_ONLY:-false}
PARALLEL_INSTALL=${PARALLEL_INSTALL:-true}
VERIFY_INTEGRITY=${VERIFY_INTEGRITY:-true}

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

# Function to get package manager info
get_package_manager_info() {
    local project_dir=$1
    
    if [ -f "$project_dir/package-lock.json" ]; then
        echo "npm"
    elif [ -f "$project_dir/yarn.lock" ]; then
        echo "yarn"
    elif [ -f "$project_dir/pnpm-lock.yaml" ]; then
        echo "pnpm"
    else
        echo "npm"  # Default to npm
    fi
}

# Function to check Node.js version
check_node_version() {
    local project_dir=$1
    local required_version=""
    
    if [ -f "$project_dir/package.json" ]; then
        required_version=$(node -pe "
            try {
                const pkg = require('./$project_dir/package.json');
                pkg.engines && pkg.engines.node || '';
            } catch(e) { ''; }
        " 2>/dev/null || echo "")
    fi
    
    if [ -n "$required_version" ]; then
        local current_version=$(node --version | sed 's/v//')
        print_status "Required Node.js version for $project_dir: $required_version"
        print_status "Current Node.js version: $current_version"
        
        # Note: This is a simplified check. In production, you might want to use semver comparison
        local required_major=$(echo $required_version | sed 's/[^0-9].*//' | head -c 2)
        local current_major=$(echo $current_version | cut -d'.' -f1)
        
        if [ "$current_major" -lt "$required_major" ]; then
            print_warning "Node.js version might be incompatible with $project_dir"
        fi
    fi
}

# Function to install Node.js dependencies
install_node_dependencies() {
    local project_dir=$1
    local project_name=$(basename "$project_dir")
    
    if [ ! -f "$project_dir/package.json" ]; then
        print_warning "No package.json found in $project_dir, skipping"
        return 0
    fi
    
    print_status "Installing Node.js dependencies for $project_name..."
    
    cd "$project_dir"
    
    # Check Node.js version compatibility
    check_node_version "."
    
    # Get appropriate package manager
    local pkg_manager=$(get_package_manager_info ".")
    
    # Clean install if force flag is set
    if [ "$FORCE_INSTALL" = "true" ]; then
        print_status "Force install enabled, cleaning node_modules..."
        rm -rf node_modules package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null || true
    fi
    
    # Install dependencies based on package manager
    case $pkg_manager in
        npm)
            if [ "$PRODUCTION_ONLY" = "true" ]; then
                npm ci --only=production --silent
            else
                npm ci --silent
            fi
            ;;
        yarn)
            if [ "$PRODUCTION_ONLY" = "true" ]; then
                yarn install --production --silent
            else
                yarn install --silent
            fi
            ;;
        pnpm)
            if [ "$PRODUCTION_ONLY" = "true" ]; then
                pnpm install --prod --silent
            else
                pnpm install --silent
            fi
            ;;
    esac
    
    # Verify installation
    if [ "$VERIFY_INTEGRITY" = "true" ]; then
        case $pkg_manager in
            npm)
                npm ls --depth=0 > /dev/null 2>&1 || print_warning "Some dependencies may have issues"
                ;;
            yarn)
                yarn check --silent > /dev/null 2>&1 || print_warning "Some dependencies may have issues"
                ;;
            pnpm)
                pnpm list --depth=0 > /dev/null 2>&1 || print_warning "Some dependencies may have issues"
                ;;
        esac
    fi
    
    cd - > /dev/null
    print_success "Dependencies installed for $project_name"
}

# Function to install .NET dependencies
install_dotnet_dependencies() {
    local project_dir=$1
    local project_name=$(basename "$project_dir")
    
    if [ ! -f "$project_dir"/*.csproj ]; then
        print_warning "No .csproj file found in $project_dir, skipping"
        return 0
    fi
    
    print_status "Installing .NET dependencies for $project_name..."
    
    cd "$project_dir"
    
    # Clean if force flag is set
    if [ "$FORCE_INSTALL" = "true" ]; then
        print_status "Force install enabled, cleaning .NET artifacts..."
        rm -rf bin obj 2>/dev/null || true
    fi
    
    # Restore dependencies
    if [ "$PRODUCTION_ONLY" = "true" ]; then
        dotnet restore --verbosity quiet --configuration Release
    else
        dotnet restore --verbosity quiet
    fi
    
    # Verify restoration
    if [ "$VERIFY_INTEGRITY" = "true" ]; then
        if ! dotnet build --no-restore --verbosity quiet > /dev/null 2>&1; then
            print_warning "Some .NET dependencies may have issues"
        fi
    fi
    
    cd - > /dev/null
    print_success "Dependencies restored for $project_name"
}

# Function to create package-lock.json files
create_lock_files() {
    print_header "Creating Package Lock Files"
    
    local node_projects=(
        "src/mcp-server"
        "src/teams-bot"
        "rag"
    )
    
    for project in "${node_projects[@]}"; do
        if [ -d "$project" ] && [ -f "$project/package.json" ]; then
            print_status "Creating lock file for $project..."
            cd "$project"
            
            # Only create if doesn't exist or force flag is set
            if [ ! -f "package-lock.json" ] || [ "$FORCE_INSTALL" = "true" ]; then
                rm -f package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null || true
                npm install --package-lock-only --silent
                print_success "package-lock.json created for $project"
            else
                print_success "package-lock.json already exists for $project"
            fi
            
            cd - > /dev/null
        fi
    done
}

# Function to update dependencies
update_dependencies() {
    print_header "Updating Dependencies"
    
    local node_projects=(
        "src/mcp-server"
        "src/teams-bot"
        "rag"
    )
    
    # Update Node.js projects
    for project in "${node_projects[@]}"; do
        if [ -d "$project" ] && [ -f "$project/package.json" ]; then
            print_status "Updating dependencies for $project..."
            cd "$project"
            
            local pkg_manager=$(get_package_manager_info ".")
            
            case $pkg_manager in
                npm)
                    npm update --silent
                    ;;
                yarn)
                    yarn upgrade --silent
                    ;;
                pnpm)
                    pnpm update --silent
                    ;;
            esac
            
            cd - > /dev/null
            print_success "Dependencies updated for $project"
        fi
    done
    
    # Update .NET project
    if [ -d "functions/ANFServer" ]; then
        print_status "Updating .NET dependencies..."
        cd functions/ANFServer
        
        # List outdated packages
        if command_exists dotnet; then
            dotnet list package --outdated --verbosity quiet 2>/dev/null || true
        fi
        
        cd - > /dev/null
        print_success ".NET dependencies checked for updates"
    fi
}

# Function to audit dependencies for security issues
audit_dependencies() {
    print_header "Auditing Dependencies for Security Issues"
    
    local audit_failed=false
    local node_projects=(
        "src/mcp-server"
        "src/teams-bot"
        "rag"
    )
    
    # Audit Node.js projects
    for project in "${node_projects[@]}"; do
        if [ -d "$project" ] && [ -f "$project/package.json" ]; then
            print_status "Auditing dependencies for $project..."
            cd "$project"
            
            local pkg_manager=$(get_package_manager_info ".")
            
            case $pkg_manager in
                npm)
                    if ! npm audit --audit-level moderate --silent; then
                        print_warning "Security vulnerabilities found in $project"
                        audit_failed=true
                    fi
                    ;;
                yarn)
                    if ! yarn audit --level moderate --silent; then
                        print_warning "Security vulnerabilities found in $project"
                        audit_failed=true
                    fi
                    ;;
                pnpm)
                    if ! pnpm audit --audit-level moderate; then
                        print_warning "Security vulnerabilities found in $project"
                        audit_failed=true
                    fi
                    ;;
            esac
            
            cd - > /dev/null
        fi
    done
    
    # Audit .NET project
    if [ -d "functions/ANFServer" ]; then
        print_status "Auditing .NET dependencies..."
        cd functions/ANFServer
        
        # Check for vulnerable packages (requires dotnet list package --vulnerable)
        if dotnet list package --vulnerable --verbosity quiet 2>/dev/null | grep -q "has known vulnerabilities"; then
            print_warning "Vulnerable .NET packages found"
            audit_failed=true
        fi
        
        cd - > /dev/null
    fi
    
    if [ "$audit_failed" = "true" ]; then
        print_warning "Security vulnerabilities found in dependencies. Please review and update."
    else
        print_success "No security vulnerabilities found"
    fi
}

# Function to generate dependency report
generate_dependency_report() {
    print_header "Generating Dependency Report"
    
    local report_file="dependency-report-$(date +%Y%m%d-%H%M%S).json"
    local temp_report="/tmp/dep_report_$$.json"
    
    echo '{"timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "projects": {}}' > "$temp_report"
    
    local node_projects=(
        "src/mcp-server"
        "src/teams-bot"
        "rag"
    )
    
    # Generate report for Node.js projects
    for project in "${node_projects[@]}"; do
        if [ -d "$project" ] && [ -f "$project/package.json" ]; then
            print_status "Generating report for $project..."
            cd "$project"
            
            local project_name=$(basename "$project")
            local pkg_count=$(npm ls --depth=0 --json 2>/dev/null | jq '.dependencies | length' 2>/dev/null || echo "0")
            local pkg_manager=$(get_package_manager_info ".")
            
            # Update report with project info
            cat "$temp_report" | jq --arg name "$project_name" --arg count "$pkg_count" --arg manager "$pkg_manager" \
                '.projects[$name] = {"package_count": ($count | tonumber), "package_manager": $manager, "type": "node"}' \
                > "${temp_report}.tmp" && mv "${temp_report}.tmp" "$temp_report"
            
            cd - > /dev/null
        fi
    done
    
    # Add .NET project info
    if [ -d "functions/ANFServer" ]; then
        cd functions/ANFServer
        local pkg_count=$(dotnet list package 2>/dev/null | grep -c ">" || echo "0")
        
        cat "$temp_report" | jq --arg count "$pkg_count" \
            '.projects["ANFServer"] = {"package_count": ($count | tonumber), "package_manager": "dotnet", "type": "dotnet"}' \
            > "${temp_report}.tmp" && mv "${temp_report}.tmp" "$temp_report"
        
        cd - > /dev/null
    fi
    
    # Move final report
    mv "$temp_report" "$report_file"
    
    print_success "Dependency report generated: $report_file"
    
    # Display summary
    if command_exists jq; then
        echo "Dependency Summary:"
        jq -r '.projects | to_entries[] | "  \(.key): \(.value.package_count) packages (\(.value.package_manager))"' "$report_file"
    fi
}

# Function to show usage
show_usage() {
    cat << EOF
ANF-AIOps Dependency Management Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  install     Install all dependencies (default)
  update      Update all dependencies
  audit       Audit dependencies for security issues
  report      Generate dependency report
  lock        Create package lock files
  clean       Clean all node_modules and restore

Environment Variables:
  FORCE_INSTALL=true/false       Force clean install (default: false)
  PRODUCTION_ONLY=true/false     Install only production dependencies (default: false)
  PARALLEL_INSTALL=true/false    Enable parallel installation (default: true)
  VERIFY_INTEGRITY=true/false    Verify installation integrity (default: true)

Examples:
  $0                                    # Install all dependencies
  $0 update                             # Update all dependencies
  $0 audit                              # Audit for security issues
  FORCE_INSTALL=true $0                 # Force clean install
  PRODUCTION_ONLY=true $0               # Install only production deps

EOF
}

# Function to install all dependencies
install_all_dependencies() {
    print_header "Installing All Dependencies"
    
    # Check prerequisites
    if ! command_exists node; then
        print_error "Node.js not found. Please install Node.js first."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm not found. Please install npm first."
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "CLAUDE.md" ]; then
        print_error "Please run this script from the ANF-AIOps root directory"
        exit 1
    fi
    
    local node_projects=(
        "src/mcp-server"
        "src/teams-bot"
        "rag"
    )
    
    if [ "$PARALLEL_INSTALL" = "true" ]; then
        print_status "Installing dependencies in parallel..."
        
        # Install Node.js dependencies in parallel
        for project in "${node_projects[@]}"; do
            if [ -d "$project" ]; then
                (install_node_dependencies "$project") &
            fi
        done
        
        # Install .NET dependencies
        if [ -d "functions/ANFServer" ]; then
            (install_dotnet_dependencies "functions/ANFServer") &
        fi
        
        # Wait for all installations to complete
        wait
    else
        # Sequential installation
        for project in "${node_projects[@]}"; do
            if [ -d "$project" ]; then
                install_node_dependencies "$project"
            fi
        done
        
        # Install .NET dependencies
        if [ -d "functions/ANFServer" ]; then
            install_dotnet_dependencies "functions/ANFServer"
        fi
    fi
    
    print_success "All dependencies installed successfully"
}

# Function to clean all dependencies
clean_dependencies() {
    print_header "Cleaning Dependencies"
    
    print_status "Removing node_modules directories..."
    find . -name "node_modules" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
    
    print_status "Removing lock files..."
    find . -name "package-lock.json" -type f -delete 2>/dev/null || true
    find . -name "yarn.lock" -type f -delete 2>/dev/null || true
    find . -name "pnpm-lock.yaml" -type f -delete 2>/dev/null || true
    
    print_status "Removing .NET build artifacts..."
    find . -name "bin" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
    find . -name "obj" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
    
    print_success "Dependencies cleaned"
    
    # Reinstall after cleaning
    install_all_dependencies
}

# Main execution function
main() {
    local command=${1:-install}
    
    case $command in
        install)
            install_all_dependencies
            ;;
        update)
            update_dependencies
            ;;
        audit)
            audit_dependencies
            ;;
        report)
            generate_dependency_report
            ;;
        lock)
            create_lock_files
            ;;
        clean)
            clean_dependencies
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Trap errors
trap 'print_error "Dependency installation failed at line $LINENO"; exit 1' ERR

# Check if jq is available for JSON processing
if ! command_exists jq; then
    print_warning "jq not found. Some features may not work properly."
    print_status "To install jq:"
    print_status "  macOS: brew install jq"
    print_status "  Ubuntu/Debian: apt-get install jq"
    print_status "  CentOS/RHEL: yum install jq"
fi

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    print_header "ANF-AIOps Dependency Management"
    print_status "Author: Dwiref Sharma <DwirefS@SapientEdge.io>"
    main "$@"
fi