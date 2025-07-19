#!/bin/bash
# Smoke Tests Script
# Author: Dwiref Sharma <DwirefS@SapientEdge.io>

set -e

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

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

# Get environment from argument
ENVIRONMENT=${1:-dev}

# Set environment-specific URLs
case $ENVIRONMENT in
    dev)
        FUNCTIONS_URL="https://anf-aiops-functions-dev.azurewebsites.net"
        MCP_URL="https://anf-aiops-mcp-dev.azurewebsites.net"
        TEAMS_BOT_URL="https://anf-aiops-teams-dev.azurewebsites.net"
        APIM_URL="https://anf-aiops-apim-dev.azure-api.net"
        ;;
    test)
        FUNCTIONS_URL="https://anf-aiops-functions-test.azurewebsites.net"
        MCP_URL="https://anf-aiops-mcp-test.azurewebsites.net"
        TEAMS_BOT_URL="https://anf-aiops-teams-test.azurewebsites.net"
        APIM_URL="https://anf-aiops-apim-test.azure-api.net"
        ;;
    prod)
        FUNCTIONS_URL="https://anf-aiops-functions-prod.azurewebsites.net"
        MCP_URL="https://anf-aiops-mcp-prod.azurewebsites.net"
        TEAMS_BOT_URL="https://anf-aiops-teams-prod.azurewebsites.net"
        APIM_URL="https://anf-aiops-apim-prod.azure-api.net"
        ;;
    *)
        log_error "Invalid environment: $ENVIRONMENT"
        exit 1
        ;;
esac

echo "==================================="
echo "ANF-AIOps Smoke Tests"
echo "Environment: $ENVIRONMENT"
echo "==================================="
echo ""

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    local timeout=${4:-10}
    
    ((TOTAL_TESTS++))
    log_test "Testing $name..."
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $timeout "$url" || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        ((PASSED_TESTS++))
        log_info "$name: OK (Status: $response) ✓"
        return 0
    else
        ((FAILED_TESTS++))
        log_error "$name: FAILED (Expected: $expected_status, Got: $response) ✗"
        return 1
    fi
}

# Test Azure Functions
echo "Testing Azure Functions..."
test_endpoint "Functions Health Check" "$FUNCTIONS_URL/api/health"
test_endpoint "Functions API Root" "$FUNCTIONS_URL/api/" 401  # Expecting 401 Unauthorized without auth

# Test MCP Server
echo ""
echo "Testing MCP Server..."
test_endpoint "MCP Server Health" "$MCP_URL/health"
test_endpoint "MCP Server API Version" "$MCP_URL/api/version"

# Test Teams Bot
echo ""
echo "Testing Teams Bot..."
test_endpoint "Teams Bot Health" "$TEAMS_BOT_URL/health"
test_endpoint "Teams Bot Messages Endpoint" "$TEAMS_BOT_URL/api/messages" 401  # Expecting 401 without proper auth

# Test APIM Gateway (if deployed)
echo ""
echo "Testing API Management Gateway..."
test_endpoint "APIM Gateway" "$APIM_URL/" 404  # Root might return 404
test_endpoint "APIM Health" "$APIM_URL/health" 200 15  # Longer timeout for APIM

# Test specific API endpoints
echo ""
echo "Testing API Endpoints..."

# Get auth token if available
if [ -n "$AZURE_CLIENT_ID" ] && [ -n "$AZURE_CLIENT_SECRET" ] && [ -n "$AZURE_TENANT_ID" ]; then
    log_info "Acquiring authentication token..."
    TOKEN=$(az account get-access-token --resource api://anf-aiops --query accessToken -o tsv 2>/dev/null || echo "")
    
    if [ -n "$TOKEN" ]; then
        # Test authenticated endpoints
        test_endpoint "List NetApp Accounts" "$FUNCTIONS_URL/api/accounts" 200 15
    else
        log_warn "Could not acquire auth token. Skipping authenticated endpoint tests."
    fi
else
    log_warn "Azure credentials not set. Skipping authenticated endpoint tests."
fi

# Performance checks
echo ""
echo "Running performance checks..."

log_test "Checking response times..."
PERF_FAILED=false

# Check Functions response time
start_time=$(date +%s%3N)
curl -s -o /dev/null "$FUNCTIONS_URL/api/health"
end_time=$(date +%s%3N)
response_time=$((end_time - start_time))

if [ $response_time -lt 3000 ]; then
    log_info "Functions response time: ${response_time}ms ✓"
else
    log_warn "Functions response time: ${response_time}ms (slow)"
    PERF_FAILED=true
fi

# Check MCP Server response time
start_time=$(date +%s%3N)
curl -s -o /dev/null "$MCP_URL/health"
end_time=$(date +%s%3N)
response_time=$((end_time - start_time))

if [ $response_time -lt 3000 ]; then
    log_info "MCP Server response time: ${response_time}ms ✓"
else
    log_warn "MCP Server response time: ${response_time}ms (slow)"
    PERF_FAILED=true
fi

# Connectivity tests
echo ""
echo "Running connectivity tests..."

# Test Key Vault connectivity (if we have permissions)
if command -v az &> /dev/null && az account show &> /dev/null; then
    log_test "Testing Key Vault connectivity..."
    KV_NAME="kv-anf-aiops-$ENVIRONMENT"
    if az keyvault show --name $KV_NAME &> /dev/null; then
        log_info "Key Vault $KV_NAME is accessible ✓"
        ((PASSED_TESTS++))
    else
        log_warn "Key Vault $KV_NAME not accessible (may require permissions)"
    fi
    ((TOTAL_TESTS++))
fi

# Application Insights check
log_test "Checking Application Insights..."
# This would require the instrumentation key or connection string
log_info "Application Insights check skipped (requires instrumentation key)"

# Summary
echo ""
echo "==================================="
echo "Smoke Test Summary"
echo "==================================="
echo ""
echo -e "Total tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    log_info "All smoke tests passed! ✓"
    
    if [ "$PERF_FAILED" = true ]; then
        log_warn "Some performance issues detected. Monitor closely."
    fi
    
    exit 0
else
    log_error "Some smoke tests failed! ✗"
    log_info "Please investigate the failed endpoints."
    exit 1
fi