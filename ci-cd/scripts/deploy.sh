#!/bin/bash
# Deployment Script
# Author: Dwiref Sharma <DwirefS@SapientEdge.io>

set -e

echo "==================================="
echo "ANF-AIOps Deployment Script"
echo "==================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Default values
ENVIRONMENT=""
DEPLOY_INFRA=false
DEPLOY_FUNCTIONS=true
DEPLOY_NODEJS=true
DRY_RUN=false
SKIP_TESTS=false
SKIP_APPROVAL=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --infra)
            DEPLOY_INFRA=true
            shift
            ;;
        --no-functions)
            DEPLOY_FUNCTIONS=false
            shift
            ;;
        --no-nodejs)
            DEPLOY_NODEJS=false
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-approval)
            SKIP_APPROVAL=true
            shift
            ;;
        --help)
            echo "Usage: $0 --env <environment> [options]"
            echo ""
            echo "Required:"
            echo "  --env <environment>    Target environment (dev, test, prod)"
            echo ""
            echo "Options:"
            echo "  --infra               Deploy infrastructure (default: false)"
            echo "  --no-functions        Skip Azure Functions deployment"
            echo "  --no-nodejs           Skip Node.js apps deployment"
            echo "  --dry-run             Show what would be deployed without deploying"
            echo "  --skip-tests          Skip running tests before deployment"
            echo "  --skip-approval       Skip manual approval for production"
            echo "  --help                Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate environment
if [ -z "$ENVIRONMENT" ]; then
    log_error "Environment not specified. Use --env <environment>"
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(dev|test|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, test, or prod"
    exit 1
fi

# Set environment-specific variables
case $ENVIRONMENT in
    dev)
        RESOURCE_GROUP="rg-anf-aiops-dev"
        LOCATION="eastus"
        FUNCTION_APP_NAME="anf-aiops-functions-dev"
        MCP_APP_NAME="anf-aiops-mcp-dev"
        TEAMS_BOT_APP_NAME="anf-aiops-teams-dev"
        ;;
    test)
        RESOURCE_GROUP="rg-anf-aiops-test"
        LOCATION="eastus"
        FUNCTION_APP_NAME="anf-aiops-functions-test"
        MCP_APP_NAME="anf-aiops-mcp-test"
        TEAMS_BOT_APP_NAME="anf-aiops-teams-test"
        ;;
    prod)
        RESOURCE_GROUP="rg-anf-aiops-prod"
        LOCATION="eastus"
        FUNCTION_APP_NAME="anf-aiops-functions-prod"
        MCP_APP_NAME="anf-aiops-mcp-prod"
        TEAMS_BOT_APP_NAME="anf-aiops-teams-prod"
        ;;
esac

# Display deployment plan
echo ""
echo "Deployment Configuration:"
echo "========================="
echo "Environment: $ENVIRONMENT"
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"
echo "Deploy Infrastructure: $DEPLOY_INFRA"
echo "Deploy Functions: $DEPLOY_FUNCTIONS"
echo "Deploy Node.js Apps: $DEPLOY_NODEJS"
echo "Dry Run: $DRY_RUN"
echo ""

# Production approval
if [ "$ENVIRONMENT" = "prod" ] && [ "$SKIP_APPROVAL" = false ] && [ "$DRY_RUN" = false ]; then
    log_warn "You are about to deploy to PRODUCTION!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

# Check Azure CLI authentication
log_step "Checking Azure authentication..."
if ! az account show &> /dev/null; then
    log_error "Not logged into Azure. Run 'az login' first"
    exit 1
fi

CURRENT_SUB=$(az account show --query name -o tsv)
log_info "Using Azure subscription: $CURRENT_SUB"

# Run tests
if [ "$SKIP_TESTS" = false ] && [ "$DRY_RUN" = false ]; then
    log_step "Running tests..."
    if ./ci-cd/scripts/run-tests.sh --unit; then
        log_info "Tests passed"
    else
        log_error "Tests failed. Aborting deployment"
        exit 1
    fi
fi

# Create deployment directory
DEPLOYMENT_DIR="deployments/$(date +%Y%m%d-%H%M%S)-$ENVIRONMENT"
mkdir -p $DEPLOYMENT_DIR

# Build applications
if [ "$DRY_RUN" = false ]; then
    log_step "Building applications..."
    
    # Build Azure Functions
    if [ "$DEPLOY_FUNCTIONS" = true ]; then
        log_info "Building Azure Functions..."
        cd functions/ANFServer
        dotnet publish --configuration Release --output $DEPLOYMENT_DIR/functions
        cd - > /dev/null
    fi
    
    # Build Node.js applications
    if [ "$DEPLOY_NODEJS" = true ]; then
        for app in rag mcp-server teams-bot; do
            if [ -d "src/$app" ] || [ -d "$app" ]; then
                log_info "Building $app..."
                app_dir=$([[ -d "src/$app" ]] && echo "src/$app" || echo "$app")
                cd $app_dir
                npm ci
                npm run build
                cp -r dist package.json package-lock.json $DEPLOYMENT_DIR/$app/
                cd - > /dev/null
            fi
        done
    fi
fi

# Deploy infrastructure
if [ "$DEPLOY_INFRA" = true ]; then
    log_step "Deploying infrastructure..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would deploy infrastructure to $ENVIRONMENT"
        cd infra
        terraform plan -var="environment=$ENVIRONMENT" -var="location=$LOCATION"
        cd - > /dev/null
    else
        cd infra
        terraform init
        terraform plan -var="environment=$ENVIRONMENT" -var="location=$LOCATION" -out=tfplan
        
        log_warn "Review the Terraform plan above"
        read -p "Continue with infrastructure deployment? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            terraform apply tfplan
        else
            log_info "Infrastructure deployment skipped"
        fi
        cd - > /dev/null
    fi
fi

# Deploy Azure Functions
if [ "$DEPLOY_FUNCTIONS" = true ]; then
    log_step "Deploying Azure Functions..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would deploy Functions to $FUNCTION_APP_NAME"
    else
        # Create zip package
        cd $DEPLOYMENT_DIR/functions
        zip -r ../functions.zip .
        cd - > /dev/null
        
        # Deploy to staging slot
        log_info "Deploying to staging slot..."
        az functionapp deployment source config-zip \
            --resource-group $RESOURCE_GROUP \
            --name $FUNCTION_APP_NAME \
            --src $DEPLOYMENT_DIR/functions.zip \
            --slot staging
        
        # Update app settings
        az functionapp config appsettings set \
            --name $FUNCTION_APP_NAME \
            --resource-group $RESOURCE_GROUP \
            --slot staging \
            --settings "Environment=$ENVIRONMENT"
        
        # Test staging slot
        log_info "Testing staging slot..."
        STAGING_URL="https://$FUNCTION_APP_NAME-staging.azurewebsites.net"
        if curl -f "$STAGING_URL/api/health" > /dev/null 2>&1; then
            log_info "Staging slot health check passed"
            
            # Swap slots
            log_info "Swapping deployment slots..."
            az functionapp deployment slot swap \
                --name $FUNCTION_APP_NAME \
                --resource-group $RESOURCE_GROUP \
                --slot staging \
                --target-slot production
            
            log_info "Azure Functions deployed successfully"
        else
            log_error "Staging slot health check failed"
            exit 1
        fi
    fi
fi

# Deploy Node.js applications
if [ "$DEPLOY_NODEJS" = true ]; then
    log_step "Deploying Node.js applications..."
    
    # Deploy MCP Server
    if [ -d "$DEPLOYMENT_DIR/mcp-server" ]; then
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] Would deploy MCP Server to $MCP_APP_NAME"
        else
            log_info "Deploying MCP Server..."
            cd $DEPLOYMENT_DIR/mcp-server
            zip -r ../mcp-server.zip .
            cd - > /dev/null
            
            az webapp deployment source config-zip \
                --resource-group $RESOURCE_GROUP \
                --name $MCP_APP_NAME \
                --src $DEPLOYMENT_DIR/mcp-server.zip \
                --slot staging
            
            # Swap slots after health check
            sleep 30
            az webapp deployment slot swap \
                --name $MCP_APP_NAME \
                --resource-group $RESOURCE_GROUP \
                --slot staging
        fi
    fi
    
    # Deploy Teams Bot
    if [ -d "$DEPLOYMENT_DIR/teams-bot" ]; then
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] Would deploy Teams Bot to $TEAMS_BOT_APP_NAME"
        else
            log_info "Deploying Teams Bot..."
            cd $DEPLOYMENT_DIR/teams-bot
            zip -r ../teams-bot.zip .
            cd - > /dev/null
            
            az webapp deployment source config-zip \
                --resource-group $RESOURCE_GROUP \
                --name $TEAMS_BOT_APP_NAME \
                --src $DEPLOYMENT_DIR/teams-bot.zip \
                --slot staging
            
            # Swap slots after health check
            sleep 30
            az webapp deployment slot swap \
                --name $TEAMS_BOT_APP_NAME \
                --resource-group $RESOURCE_GROUP \
                --slot staging
        fi
    fi
fi

# Post-deployment validation
if [ "$DRY_RUN" = false ]; then
    log_step "Running post-deployment validation..."
    
    # Check all endpoints
    VALIDATION_FAILED=false
    
    if [ "$DEPLOY_FUNCTIONS" = true ]; then
        if ! curl -f "https://$FUNCTION_APP_NAME.azurewebsites.net/api/health" > /dev/null 2>&1; then
            log_error "Functions health check failed"
            VALIDATION_FAILED=true
        else
            log_info "Functions health check passed"
        fi
    fi
    
    if [ "$DEPLOY_NODEJS" = true ]; then
        if ! curl -f "https://$MCP_APP_NAME.azurewebsites.net/health" > /dev/null 2>&1; then
            log_error "MCP Server health check failed"
            VALIDATION_FAILED=true
        else
            log_info "MCP Server health check passed"
        fi
        
        if ! curl -f "https://$TEAMS_BOT_APP_NAME.azurewebsites.net/health" > /dev/null 2>&1; then
            log_error "Teams Bot health check failed"
            VALIDATION_FAILED=true
        else
            log_info "Teams Bot health check passed"
        fi
    fi
    
    if [ "$VALIDATION_FAILED" = true ]; then
        log_error "Post-deployment validation failed"
        exit 1
    fi
fi

# Create deployment record
log_step "Creating deployment record..."
cat > $DEPLOYMENT_DIR/deployment-record.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "deployed_by": "$(whoami)",
  "git_commit": "$(git rev-parse HEAD)",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD)",
  "components": {
    "infrastructure": $DEPLOY_INFRA,
    "functions": $DEPLOY_FUNCTIONS,
    "nodejs_apps": $DEPLOY_NODEJS
  },
  "dry_run": $DRY_RUN
}
EOF

# Summary
echo ""
echo "==================================="
echo "Deployment Summary"
echo "==================================="
echo ""

if [ "$DRY_RUN" = true ]; then
    log_info "Dry run completed successfully"
    log_info "No actual deployment was performed"
else
    log_info "Deployment completed successfully!"
    log_info "Environment: $ENVIRONMENT"
    log_info "Deployment record: $DEPLOYMENT_DIR/deployment-record.json"
    
    if [ "$ENVIRONMENT" = "prod" ]; then
        log_warn "Remember to:"
        log_warn "1. Monitor application logs and metrics"
        log_warn "2. Run smoke tests"
        log_warn "3. Update documentation if needed"
    fi
fi