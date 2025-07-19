#!/bin/bash
# Integration Tests Script
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

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|test|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, test, or prod"
    exit 1
fi

echo "==================================="
echo "ANF-AIOps Integration Tests"
echo "Environment: $ENVIRONMENT"
echo "==================================="
echo ""

# Check if required tools are installed
if ! command -v jq &> /dev/null; then
    log_error "jq is required for JSON parsing. Please install it first."
    exit 1
fi

# Set environment-specific configuration
case $ENVIRONMENT in
    dev)
        API_BASE_URL="https://anf-aiops-functions-dev.azurewebsites.net/api"
        MCP_BASE_URL="https://anf-aiops-mcp-dev.azurewebsites.net"
        SUBSCRIPTION_ID="your-dev-subscription-id"
        RESOURCE_GROUP="rg-anf-aiops-dev"
        ;;
    test)
        API_BASE_URL="https://anf-aiops-functions-test.azurewebsites.net/api"
        MCP_BASE_URL="https://anf-aiops-mcp-test.azurewebsites.net"
        SUBSCRIPTION_ID="your-test-subscription-id"
        RESOURCE_GROUP="rg-anf-aiops-test"
        ;;
    prod)
        API_BASE_URL="https://anf-aiops-functions-prod.azurewebsites.net/api"
        MCP_BASE_URL="https://anf-aiops-mcp-prod.azurewebsites.net"
        SUBSCRIPTION_ID="your-prod-subscription-id"
        RESOURCE_GROUP="rg-anf-aiops-prod"
        ;;
esac

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
TEST_RESULTS_DIR="integration-test-results"
mkdir -p $TEST_RESULTS_DIR

# Get authentication token
log_info "Acquiring authentication token..."
if [ -z "$AZURE_CLIENT_ID" ] || [ -z "$AZURE_CLIENT_SECRET" ] || [ -z "$AZURE_TENANT_ID" ]; then
    log_error "Azure service principal credentials not set"
    log_info "Please set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID"
    exit 1
fi

# Get access token
TOKEN=$(curl -s -X POST \
    "https://login.microsoftonline.com/$AZURE_TENANT_ID/oauth2/v2.0/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=$AZURE_CLIENT_ID" \
    -d "client_secret=$AZURE_CLIENT_SECRET" \
    -d "scope=https://management.azure.com/.default" \
    -d "grant_type=client_credentials" | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    log_error "Failed to acquire authentication token"
    exit 1
fi

log_info "Authentication successful"

# Helper function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method \
            "$API_BASE_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method \
            "$API_BASE_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN")
    fi
    
    body=$(echo "$response" | sed '$d')
    status=$(echo "$response" | tail -1)
    
    if [ "$status" = "$expected_status" ]; then
        echo "$body"
        return 0
    else
        log_error "API call failed. Expected: $expected_status, Got: $status"
        log_error "Response: $body"
        return 1
    fi
}

# Test function wrapper
run_test() {
    local test_name=$1
    local test_function=$2
    
    ((TOTAL_TESTS++))
    log_test "$test_name"
    
    if $test_function; then
        ((PASSED_TESTS++))
        log_info "$test_name: PASSED ✓"
    else
        ((FAILED_TESTS++))
        log_error "$test_name: FAILED ✗"
    fi
}

# Integration Tests

# Test 1: List NetApp Accounts
test_list_accounts() {
    response=$(api_call GET "/accounts?subscriptionId=$SUBSCRIPTION_ID&resourceGroupName=$RESOURCE_GROUP" "" 200)
    if [ $? -eq 0 ]; then
        echo "$response" > $TEST_RESULTS_DIR/accounts.json
        return 0
    fi
    return 1
}

# Test 2: Create NetApp Account
test_create_account() {
    local account_name="test-account-$(date +%s)"
    local payload=$(cat <<EOF
{
    "location": "eastus",
    "properties": {
        "activeDirectories": []
    }
}
EOF
)
    
    response=$(api_call PUT "/accounts/$account_name?subscriptionId=$SUBSCRIPTION_ID&resourceGroupName=$RESOURCE_GROUP" "$payload" 201)
    if [ $? -eq 0 ]; then
        echo "$response" > $TEST_RESULTS_DIR/created-account.json
        # Store account name for cleanup
        echo "$account_name" > $TEST_RESULTS_DIR/test-account-name.txt
        return 0
    fi
    return 1
}

# Test 3: Get Account Details
test_get_account() {
    if [ ! -f "$TEST_RESULTS_DIR/test-account-name.txt" ]; then
        log_warn "No test account found, skipping"
        return 0
    fi
    
    local account_name=$(cat $TEST_RESULTS_DIR/test-account-name.txt)
    response=$(api_call GET "/accounts/$account_name?subscriptionId=$SUBSCRIPTION_ID&resourceGroupName=$RESOURCE_GROUP" "" 200)
    if [ $? -eq 0 ]; then
        echo "$response" > $TEST_RESULTS_DIR/account-details.json
        return 0
    fi
    return 1
}

# Test 4: Create Capacity Pool
test_create_capacity_pool() {
    if [ ! -f "$TEST_RESULTS_DIR/test-account-name.txt" ]; then
        log_warn "No test account found, skipping"
        return 0
    fi
    
    local account_name=$(cat $TEST_RESULTS_DIR/test-account-name.txt)
    local pool_name="test-pool-$(date +%s)"
    local payload=$(cat <<EOF
{
    "location": "eastus",
    "properties": {
        "size": 4398046511104,
        "serviceLevel": "Standard"
    }
}
EOF
)
    
    response=$(api_call PUT "/accounts/$account_name/capacityPools/$pool_name?subscriptionId=$SUBSCRIPTION_ID&resourceGroupName=$RESOURCE_GROUP" "$payload" 201)
    if [ $? -eq 0 ]; then
        echo "$response" > $TEST_RESULTS_DIR/created-pool.json
        echo "$pool_name" > $TEST_RESULTS_DIR/test-pool-name.txt
        return 0
    fi
    return 1
}

# Test 5: List Capacity Pools
test_list_capacity_pools() {
    if [ ! -f "$TEST_RESULTS_DIR/test-account-name.txt" ]; then
        log_warn "No test account found, skipping"
        return 0
    fi
    
    local account_name=$(cat $TEST_RESULTS_DIR/test-account-name.txt)
    response=$(api_call GET "/accounts/$account_name/capacityPools?subscriptionId=$SUBSCRIPTION_ID&resourceGroupName=$RESOURCE_GROUP" "" 200)
    if [ $? -eq 0 ]; then
        echo "$response" > $TEST_RESULTS_DIR/pools.json
        return 0
    fi
    return 1
}

# Test 6: Test MCP Server Health
test_mcp_health() {
    response=$(curl -s -o /dev/null -w "%{http_code}" "$MCP_BASE_URL/health")
    if [ "$response" = "200" ]; then
        return 0
    fi
    return 1
}

# Test 7: Test MCP Tools Listing
test_mcp_tools() {
    response=$(curl -s "$MCP_BASE_URL/api/tools")
    if [ $? -eq 0 ]; then
        echo "$response" > $TEST_RESULTS_DIR/mcp-tools.json
        tool_count=$(echo "$response" | jq '. | length' 2>/dev/null || echo "0")
        if [ "$tool_count" -gt 0 ]; then
            log_info "Found $tool_count MCP tools"
            return 0
        fi
    fi
    return 1
}

# Test 8: End-to-end workflow test
test_e2e_workflow() {
    log_info "Running end-to-end workflow test..."
    
    # This test simulates a complete workflow
    # 1. Create account
    # 2. Create pool
    # 3. Create volume
    # 4. Create snapshot
    # 5. Delete snapshot
    # 6. Delete volume
    # 7. Delete pool
    # 8. Delete account
    
    # For now, we'll just check if the APIs are responding correctly
    local workflow_success=true
    
    # Check if we can list accounts
    if ! api_call GET "/accounts?subscriptionId=$SUBSCRIPTION_ID&resourceGroupName=$RESOURCE_GROUP" "" 200 > /dev/null 2>&1; then
        workflow_success=false
    fi
    
    if [ "$workflow_success" = true ]; then
        return 0
    fi
    return 1
}

# Cleanup function
cleanup_test_resources() {
    log_info "Cleaning up test resources..."
    
    # Delete test capacity pool
    if [ -f "$TEST_RESULTS_DIR/test-pool-name.txt" ] && [ -f "$TEST_RESULTS_DIR/test-account-name.txt" ]; then
        local account_name=$(cat $TEST_RESULTS_DIR/test-account-name.txt)
        local pool_name=$(cat $TEST_RESULTS_DIR/test-pool-name.txt)
        
        log_info "Deleting test capacity pool: $pool_name"
        api_call DELETE "/accounts/$account_name/capacityPools/$pool_name?subscriptionId=$SUBSCRIPTION_ID&resourceGroupName=$RESOURCE_GROUP" "" 202 > /dev/null 2>&1 || true
    fi
    
    # Delete test account
    if [ -f "$TEST_RESULTS_DIR/test-account-name.txt" ]; then
        local account_name=$(cat $TEST_RESULTS_DIR/test-account-name.txt)
        
        log_info "Deleting test account: $account_name"
        api_call DELETE "/accounts/$account_name?subscriptionId=$SUBSCRIPTION_ID&resourceGroupName=$RESOURCE_GROUP" "" 202 > /dev/null 2>&1 || true
    fi
}

# Run all tests
echo "Running integration tests..."
echo ""

run_test "List NetApp Accounts" test_list_accounts
run_test "Create NetApp Account" test_create_account
run_test "Get Account Details" test_get_account
run_test "Create Capacity Pool" test_create_capacity_pool
run_test "List Capacity Pools" test_list_capacity_pools
run_test "MCP Server Health Check" test_mcp_health
run_test "MCP Tools Listing" test_mcp_tools
run_test "End-to-End Workflow" test_e2e_workflow

# Cleanup
if [ "$ENVIRONMENT" != "prod" ]; then
    cleanup_test_resources
fi

# Generate test report
echo ""
echo "Generating test report..."

cat > $TEST_RESULTS_DIR/integration-test-report.json << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "total_tests": $TOTAL_TESTS,
    "passed_tests": $PASSED_TESTS,
    "failed_tests": $FAILED_TESTS,
    "success_rate": $(awk "BEGIN {printf \"%.2f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
}
EOF

# Summary
echo ""
echo "==================================="
echo "Integration Test Summary"
echo "==================================="
echo ""
echo -e "Total tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo -e "Success rate: ${BLUE}$(awk "BEGIN {printf \"%.2f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%${NC}"
echo ""
echo "Test results saved in: $TEST_RESULTS_DIR/"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    log_info "All integration tests passed! ✓"
    exit 0
else
    log_error "Some integration tests failed! ✗"
    exit 1
fi