#!/bin/bash
# ANF-AIOps Build All Components Script
# Author: Dwiref Sharma <DwirefS@SapientEdge.io>
# Unified build script for all project components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Build configuration
BUILD_MODE=${1:-development}  # development, production, test
PARALLEL_BUILD=${PARALLEL_BUILD:-true}
SKIP_TESTS=${SKIP_TESTS:-false}
SKIP_LINT=${SKIP_LINT:-false}
CLEAN_BUILD=${CLEAN_BUILD:-false}

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

# Function to get timestamp
timestamp() {
    date "+%Y-%m-%d %H:%M:%S"
}

# Function to log with timestamp
log() {
    echo "[$(timestamp)] $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_tools=()
    
    # Check Node.js
    if ! command_exists node; then
        missing_tools+=("Node.js")
    else
        NODE_VERSION=$(node --version | sed 's/v//')
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            print_error "Node.js version $NODE_VERSION is too old. Please upgrade to v18 or higher."
            exit 1
        fi
        print_success "Node.js: v$NODE_VERSION"
    fi
    
    # Check npm
    if ! command_exists npm; then
        missing_tools+=("npm")
    else
        print_success "npm: $(npm --version)"
    fi
    
    # Check .NET SDK
    if ! command_exists dotnet; then
        missing_tools+=(".NET SDK")
    else
        DOTNET_VERSION=$(dotnet --version)
        MAJOR_VERSION=$(echo $DOTNET_VERSION | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -lt 8 ]; then
            print_error ".NET SDK version $DOTNET_VERSION is too old. Please upgrade to v8.0 or higher."
            exit 1
        fi
        print_success ".NET SDK: $DOTNET_VERSION"
    fi
    
    # Check if we're in the right directory
    if [ ! -f "CLAUDE.md" ]; then
        print_error "Please run this script from the ANF-AIOps root directory"
        exit 1
    fi
    
    # Report missing tools
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_error "Please run ./scripts/setup-dev-environment.sh first"
        exit 1
    fi
    
    print_success "All prerequisites satisfied"
}

# Function to clean build artifacts
clean_build_artifacts() {
    if [ "$CLEAN_BUILD" = "true" ]; then
        print_header "Cleaning Build Artifacts"
        
        # Clean Node.js projects
        find . -name "node_modules" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
        find . -name "dist" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
        find . -name "build" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
        find . -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true
        
        # Clean .NET projects
        find . -name "bin" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
        find . -name "obj" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
        
        print_success "Build artifacts cleaned"
    fi
}

# Function to install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    local projects=(
        "src/mcp-server"
        "src/teams-bot" 
        "rag"
    )
    
    if [ "$PARALLEL_BUILD" = "true" ]; then
        print_status "Installing dependencies in parallel..."
        
        # Install Node.js dependencies in parallel
        for project in "${projects[@]}"; do
            if [ -d "$project" ] && [ -f "$project/package.json" ]; then
                (
                    cd "$project"
                    print_status "Installing dependencies for $project..."
                    npm ci --silent
                    print_success "Dependencies installed for $project"
                ) &
            fi
        done
        
        # Install .NET dependencies
        if [ -d "functions/ANFServer" ]; then
            (
                cd functions/ANFServer
                print_status "Restoring .NET dependencies..."
                dotnet restore --verbosity quiet
                print_success ".NET dependencies restored"
            ) &
        fi
        
        # Wait for all background jobs to complete
        wait
    else
        # Sequential installation
        for project in "${projects[@]}"; do
            if [ -d "$project" ] && [ -f "$project/package.json" ]; then
                print_status "Installing dependencies for $project..."
                cd "$project"
                npm ci --silent
                cd - > /dev/null
                print_success "Dependencies installed for $project"
            fi
        done
        
        # Install .NET dependencies
        if [ -d "functions/ANFServer" ]; then
            print_status "Restoring .NET dependencies..."
            cd functions/ANFServer
            dotnet restore --verbosity quiet
            cd - > /dev/null
            print_success ".NET dependencies restored"
        fi
    fi
    
    print_success "All dependencies installed"
}

# Function to run linting
run_linting() {
    if [ "$SKIP_LINT" = "true" ]; then
        print_warning "Skipping linting (SKIP_LINT=true)"
        return 0
    fi
    
    print_header "Running Code Linting"
    
    local lint_failed=false
    
    # Lint TypeScript projects
    local ts_projects=("src/mcp-server" "src/teams-bot" "rag")
    
    for project in "${ts_projects[@]}"; do
        if [ -d "$project" ] && [ -f "$project/package.json" ]; then
            print_status "Linting $project..."
            cd "$project"
            
            if npm run lint > /dev/null 2>&1; then
                print_success "Linting passed for $project"
            else
                print_error "Linting failed for $project"
                lint_failed=true
            fi
            
            cd - > /dev/null
        fi
    done
    
    # Lint .NET project (if tools are available)
    if [ -d "functions/ANFServer" ]; then
        print_status "Checking .NET code formatting..."
        cd functions/ANFServer
        
        if command_exists dotnet-format; then
            if dotnet format --verify-no-changes --verbosity quiet; then
                print_success ".NET code formatting check passed"
            else
                print_warning ".NET code formatting issues found (run 'dotnet format' to fix)"
            fi
        else
            print_warning "dotnet-format not available, skipping .NET linting"
        fi
        
        cd - > /dev/null
    fi
    
    if [ "$lint_failed" = "true" ]; then
        print_error "Linting failed for one or more projects"
        exit 1
    fi
    
    print_success "All linting checks passed"
}

# Function to build TypeScript projects
build_typescript_projects() {
    print_header "Building TypeScript Projects"
    
    local ts_projects=("src/mcp-server" "src/teams-bot" "rag")
    local build_config=""
    
    # Set build configuration based on mode
    case $BUILD_MODE in
        production)
            build_config="--mode production"
            ;;
        development)
            build_config="--mode development"
            ;;
        test)
            build_config="--mode test"
            ;;
    esac
    
    if [ "$PARALLEL_BUILD" = "true" ]; then
        print_status "Building TypeScript projects in parallel..."
        
        for project in "${ts_projects[@]}"; do
            if [ -d "$project" ] && [ -f "$project/package.json" ]; then
                (
                    cd "$project"
                    print_status "Building $project..."
                    
                    if npm run build $build_config > /dev/null 2>&1; then
                        print_success "Build completed for $project"
                    else
                        print_error "Build failed for $project"
                        exit 1
                    fi
                ) &
            fi
        done
        
        # Wait for all builds to complete
        wait
    else
        # Sequential build
        for project in "${ts_projects[@]}"; do
            if [ -d "$project" ] && [ -f "$project/package.json" ]; then
                print_status "Building $project..."
                cd "$project"
                
                if npm run build $build_config; then
                    print_success "Build completed for $project"
                else
                    print_error "Build failed for $project"
                    exit 1
                fi
                
                cd - > /dev/null
            fi
        done
    fi
    
    print_success "All TypeScript projects built successfully"
}

# Function to build .NET project
build_dotnet_project() {
    print_header "Building .NET Project"
    
    if [ ! -d "functions/ANFServer" ]; then
        print_warning "No .NET project found, skipping"
        return 0
    fi
    
    cd functions/ANFServer
    
    local build_config=""
    case $BUILD_MODE in
        production)
            build_config="Release"
            ;;
        development|test)
            build_config="Debug"
            ;;
    esac
    
    print_status "Building ANF Server (.NET)..."
    
    if dotnet build --configuration $build_config --verbosity quiet; then
        print_success ".NET project built successfully"
    else
        print_error ".NET build failed"
        exit 1
    fi
    
    cd - > /dev/null
}

# Function to run tests
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        print_warning "Skipping tests (SKIP_TESTS=true)"
        return 0
    fi
    
    print_header "Running Tests"
    
    local test_failed=false
    
    # Test TypeScript projects
    local ts_projects=("src/mcp-server" "src/teams-bot" "rag")
    
    for project in "${ts_projects[@]}"; do
        if [ -d "$project" ] && [ -f "$project/package.json" ]; then
            print_status "Testing $project..."
            cd "$project"
            
            if npm test > /dev/null 2>&1; then
                print_success "Tests passed for $project"
            else
                print_error "Tests failed for $project"
                test_failed=true
            fi
            
            cd - > /dev/null
        fi
    done
    
    # Test .NET project
    if [ -d "functions/ANFServer" ]; then
        print_status "Testing ANF Server (.NET)..."
        cd functions/ANFServer
        
        if dotnet test --verbosity quiet --no-build; then
            print_success ".NET tests passed"
        else
            print_error ".NET tests failed"
            test_failed=true
        fi
        
        cd - > /dev/null
    fi
    
    if [ "$test_failed" = "true" ]; then
        print_error "Tests failed for one or more projects"
        exit 1
    fi
    
    print_success "All tests passed"
}

# Function to generate build report
generate_build_report() {
    print_header "Build Report"
    
    local report_file="build-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "build": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "mode": "$BUILD_MODE",
    "status": "success",
    "duration": "$SECONDS seconds",
    "parallel_build": $PARALLEL_BUILD,
    "skip_tests": $SKIP_TESTS,
    "skip_lint": $SKIP_LINT,
    "clean_build": $CLEAN_BUILD
  },
  "environment": {
    "node_version": "$(node --version 2>/dev/null || echo 'not available')",
    "npm_version": "$(npm --version 2>/dev/null || echo 'not available')",
    "dotnet_version": "$(dotnet --version 2>/dev/null || echo 'not available')",
    "os": "$(uname -s)",
    "arch": "$(uname -m)"
  },
  "components": {
    "mcp_server": {
      "status": "$([ -d "src/mcp-server/dist" ] && echo 'built' || echo 'not built')",
      "tests": "$([ "$SKIP_TESTS" = "true" ] && echo 'skipped' || echo 'passed')"
    },
    "teams_bot": {
      "status": "$([ -d "src/teams-bot/dist" ] && echo 'built' || echo 'not built')",
      "tests": "$([ "$SKIP_TESTS" = "true" ] && echo 'skipped' || echo 'passed')"
    },
    "rag_system": {
      "status": "$([ -d "rag/dist" ] && echo 'built' || echo 'not built')",
      "tests": "$([ "$SKIP_TESTS" = "true" ] && echo 'skipped' || echo 'passed')"
    },
    "azure_functions": {
      "status": "$([ -d "functions/ANFServer/bin" ] && echo 'built' || echo 'not built')",
      "tests": "$([ "$SKIP_TESTS" = "true" ] && echo 'skipped' || echo 'passed')"
    }
  }
}
EOF
    
    print_success "Build report generated: $report_file"
    
    # Display summary
    echo "Build Summary:"
    echo "  Mode: $BUILD_MODE"
    echo "  Duration: $SECONDS seconds"
    echo "  Components built: $(find . -name "dist" -type d | wc -l) TypeScript, $(find . -name "bin" -type d | wc -l) .NET"
    echo "  Tests: $([ "$SKIP_TESTS" = "true" ] && echo 'skipped' || echo 'passed')"
    echo "  Linting: $([ "$SKIP_LINT" = "true" ] && echo 'skipped' || echo 'passed')"
}

# Function to show usage
show_usage() {
    cat << EOF
ANF-AIOps Build Script

Usage: $0 [MODE] [OPTIONS]

Modes:
  development    Build for development (default)
  production     Build for production with optimizations
  test           Build for testing

Environment Variables:
  PARALLEL_BUILD=true/false    Enable parallel building (default: true)
  SKIP_TESTS=true/false        Skip running tests (default: false)
  SKIP_LINT=true/false         Skip linting (default: false)
  CLEAN_BUILD=true/false       Clean before building (default: false)

Examples:
  $0                           # Build in development mode
  $0 production                # Build for production
  SKIP_TESTS=true $0           # Build without running tests
  CLEAN_BUILD=true $0          # Clean build
  PARALLEL_BUILD=false $0      # Sequential build

EOF
}

# Main execution function
main() {
    local start_time=$SECONDS
    
    # Parse arguments
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        development|production|test)
            BUILD_MODE=$1
            ;;
        *)
            if [ -n "$1" ]; then
                print_error "Invalid build mode: $1"
                show_usage
                exit 1
            fi
            ;;
    esac
    
    print_header "ANF-AIOps Build Script"
    print_status "Author: Dwiref Sharma <DwirefS@SapientEdge.io>"
    print_status "Build Mode: $BUILD_MODE"
    print_status "Parallel Build: $PARALLEL_BUILD"
    print_status "Skip Tests: $SKIP_TESTS"
    print_status "Skip Lint: $SKIP_LINT"
    print_status "Clean Build: $CLEAN_BUILD"
    
    # Execute build pipeline
    check_prerequisites
    clean_build_artifacts
    install_dependencies
    run_linting
    build_typescript_projects
    build_dotnet_project
    run_tests
    generate_build_report
    
    local end_time=$SECONDS
    local duration=$((end_time - start_time))
    
    print_success "Build completed successfully in ${duration} seconds!"
    print_status "All components are ready for deployment"
}

# Trap errors and cleanup
trap 'print_error "Build failed at line $LINENO"; exit 1' ERR

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi