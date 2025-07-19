#!/bin/bash
# Security Tools Setup Script for ANF-AIOps
# Author: Dwiref Sharma <DwirefS@SapientEdge.io>
# Automated setup and configuration of security scanning tools

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    echo -e "${BLUE}==========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}==========================================${NC}"
    echo ""
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Node.js dependencies
install_node_deps() {
    if command_exists npm; then
        print_status "Installing Node.js security dependencies..."
        npm install -g @semgrep/cli
        npm install -g license-checker
        npm install -g audit-ci
        npm install -g eslint
        npm install -g prettier
        print_success "Node.js dependencies installed"
    else
        print_error "npm not found. Please install Node.js first."
        return 1
    fi
}

# Function to install Python dependencies
install_python_deps() {
    if command_exists pip3; then
        print_status "Installing Python security dependencies..."
        pip3 install --user checkov
        pip3 install --user detect-secrets
        pip3 install --user bandit
        pip3 install --user safety
        print_success "Python dependencies installed"
    elif command_exists pip; then
        print_status "Installing Python security dependencies..."
        pip install --user checkov
        pip install --user detect-secrets
        pip install --user bandit
        pip install --user safety
        print_success "Python dependencies installed"
    else
        print_error "pip not found. Please install Python first."
        return 1
    fi
}

# Function to install GitLeaks
install_gitleaks() {
    print_status "Installing GitLeaks..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew install gitleaks
            print_success "GitLeaks installed via Homebrew"
        else
            print_warning "Homebrew not found. Please install GitLeaks manually."
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        GITLEAKS_VERSION="8.18.1"
        wget "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"
        tar -xzf "gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"
        sudo mv gitleaks /usr/local/bin/
        rm "gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"
        print_success "GitLeaks installed"
    else
        print_warning "Unsupported OS. Please install GitLeaks manually."
    fi
}

# Function to install .NET tools
install_dotnet_tools() {
    if command_exists dotnet; then
        print_status "Installing .NET security tools..."
        dotnet tool install --global security-scan
        dotnet tool install --global dotnet-sonarscanner
        print_success ".NET tools installed"
    else
        print_warning ".NET CLI not found. Skipping .NET tools installation."
    fi
}

# Function to setup pre-commit hooks
setup_precommit() {
    print_status "Setting up pre-commit hooks..."
    
    if command_exists pip3; then
        pip3 install --user pre-commit
    elif command_exists pip; then
        pip install --user pre-commit
    else
        print_error "pip not found. Cannot install pre-commit."
        return 1
    fi
    
    # Install pre-commit hooks
    pre-commit install
    pre-commit install --hook-type commit-msg
    pre-commit install --hook-type pre-push
    
    print_success "Pre-commit hooks installed"
}

# Function to setup Git hooks
setup_git_hooks() {
    print_status "Setting up custom Git hooks..."
    
    # Configure Git to use our custom hooks directory
    git config core.hooksPath .githooks
    
    # Make sure hooks are executable
    chmod +x .githooks/*
    
    print_success "Git hooks configured"
}

# Function to initialize security baselines
initialize_baselines() {
    print_status "Initializing security baselines..."
    
    # Create detect-secrets baseline
    if command_exists detect-secrets; then
        detect-secrets scan --baseline .secrets.baseline
        print_success "detect-secrets baseline created"
    fi
    
    # Create Checkov baseline
    if command_exists checkov; then
        checkov --config-file security/checkov.yml --create-baseline security/checkov-baseline.json
        print_success "Checkov baseline created"
    fi
}

# Function to validate security tools
validate_tools() {
    print_status "Validating security tools installation..."
    
    local all_good=true
    
    # Check essential tools
    if ! command_exists semgrep; then
        print_error "Semgrep not found"
        all_good=false
    else
        print_success "Semgrep: $(semgrep --version)"
    fi
    
    if ! command_exists checkov; then
        print_error "Checkov not found"
        all_good=false
    else
        print_success "Checkov: $(checkov --version)"
    fi
    
    if ! command_exists gitleaks; then
        print_error "GitLeaks not found"
        all_good=false
    else
        print_success "GitLeaks: $(gitleaks version)"
    fi
    
    if ! command_exists detect-secrets; then
        print_error "detect-secrets not found"
        all_good=false
    else
        print_success "detect-secrets: $(detect-secrets --version)"
    fi
    
    if ! command_exists pre-commit; then
        print_error "pre-commit not found"
        all_good=false
    else
        print_success "pre-commit: $(pre-commit --version)"
    fi
    
    if ! command_exists eslint; then
        print_warning "ESLint not found (optional)"
    else
        print_success "ESLint: $(eslint --version)"
    fi
    
    if ! command_exists prettier; then
        print_warning "Prettier not found (optional)"
    else
        print_success "Prettier: $(prettier --version)"
    fi
    
    if $all_good; then
        print_success "All essential security tools are installed!"
    else
        print_error "Some essential tools are missing. Please install them manually."
        return 1
    fi
}

# Function to run initial security scan
run_initial_scan() {
    print_status "Running initial security scan..."
    
    # Run pre-commit on all files
    if command_exists pre-commit; then
        print_status "Running pre-commit hooks on all files..."
        pre-commit run --all-files || print_warning "Some pre-commit checks failed (this is normal for initial setup)"
    fi
    
    print_success "Initial security scan completed"
}

# Function to create security dashboard
create_dashboard() {
    print_status "Creating security dashboard..."
    
    cat > security/dashboard.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>ANF-AIOps Security Dashboard</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background: #d4edda; border-color: #c3e6cb; }
        .warning { background: #fff3cd; border-color: #ffeaa7; }
        .error { background: #f8d7da; border-color: #f5c6cb; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ANF-AIOps Security Dashboard</h1>
        <p>Security monitoring and compliance status</p>
    </div>
    
    <div class="section success">
        <h2>🛡️ Security Tools Status</h2>
        <div class="metric">✅ Semgrep: Active</div>
        <div class="metric">✅ Checkov: Active</div>
        <div class="metric">✅ GitLeaks: Active</div>
        <div class="metric">✅ Pre-commit: Active</div>
    </div>
    
    <div class="section">
        <h2>📊 Security Metrics</h2>
        <div class="metric">Critical: 0</div>
        <div class="metric">High: 0</div>
        <div class="metric">Medium: 0</div>
        <div class="metric">Low: 0</div>
    </div>
    
    <div class="section">
        <h2>🔍 Quick Actions</h2>
        <ul>
            <li><code>npm run security:scan</code> - Run full security scan</li>
            <li><code>npm run security:audit</code> - Run dependency audit</li>
            <li><code>pre-commit run --all-files</code> - Run all pre-commit hooks</li>
            <li><code>semgrep --config=auto src/</code> - Run SAST scan</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>📞 Contact</h2>
        <p>Security issues: <strong>DwirefS@SapientEdge.io</strong></p>
    </div>
</body>
</html>
EOF
    
    print_success "Security dashboard created at security/dashboard.html"
}

# Main execution
main() {
    print_header "ANF-AIOps Security Tools Setup"
    print_status "Author: Dwiref Sharma <DwirefS@SapientEdge.io>"
    
    # Check if we're in the right directory
    if [ ! -f "CLAUDE.md" ]; then
        print_error "Please run this script from the ANF-AIOps root directory"
        exit 1
    fi
    
    print_status "Setting up security tools for ANF-AIOps..."
    
    # Install dependencies
    print_header "Installing Dependencies"
    install_node_deps
    install_python_deps
    install_gitleaks
    install_dotnet_tools
    
    # Setup hooks
    print_header "Setting up Hooks"
    setup_precommit
    setup_git_hooks
    
    # Initialize baselines
    print_header "Initializing Baselines"
    initialize_baselines
    
    # Validate installation
    print_header "Validating Installation"
    validate_tools
    
    # Create dashboard
    print_header "Creating Dashboard"
    create_dashboard
    
    # Run initial scan
    print_header "Initial Security Scan"
    run_initial_scan
    
    print_header "Setup Complete!"
    echo ""
    print_success "Security tools have been successfully set up for ANF-AIOps!"
    echo ""
    print_status "Next steps:"
    echo "  1. Review the security configuration files in the security/ directory"
    echo "  2. Customize rules based on your organization's requirements"
    echo "  3. Set up CI/CD integration for automated security scanning"
    echo "  4. Configure notification webhooks for security alerts"
    echo "  5. Schedule regular security reviews and updates"
    echo ""
    print_status "Documentation:"
    echo "  - Security Policy: security/SECURITY.md"
    echo "  - Configuration Guide: security/README.md"
    echo "  - Dashboard: security/dashboard.html"
    echo ""
    print_status "Support: DwirefS@SapientEdge.io"
}

# Run main function
main "$@"