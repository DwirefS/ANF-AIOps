#!/bin/bash
# Run Tests Script
# Author: Dwiref Sharma <DwirefS@SapientEdge.io>

set -e

echo "==================================="
echo "ANF-AIOps Test Runner"
echo "==================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
TEST_RESULTS_DIR="test-results"

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

# Parse command line arguments
RUN_UNIT=true
RUN_INTEGRATION=false
RUN_E2E=false
RUN_SECURITY=false
COVERAGE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --unit)
            RUN_UNIT=true
            shift
            ;;
        --integration)
            RUN_INTEGRATION=true
            shift
            ;;
        --e2e)
            RUN_E2E=true
            shift
            ;;
        --security)
            RUN_SECURITY=true
            shift
            ;;
        --all)
            RUN_UNIT=true
            RUN_INTEGRATION=true
            RUN_E2E=true
            RUN_SECURITY=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --unit          Run unit tests (default)"
            echo "  --integration   Run integration tests"
            echo "  --e2e           Run end-to-end tests"
            echo "  --security      Run security tests"
            echo "  --all           Run all tests"
            echo "  --coverage      Generate coverage reports"
            echo "  --help          Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Create test results directory
mkdir -p $TEST_RESULTS_DIR
rm -rf $TEST_RESULTS_DIR/*

# Function to run tests and track results
run_test_suite() {
    local suite_name=$1
    local command=$2
    local working_dir=$3
    
    ((TOTAL_TESTS++))
    
    log_test "Running $suite_name..."
    
    if [ -n "$working_dir" ]; then
        cd "$working_dir"
    fi
    
    if eval "$command"; then
        ((PASSED_TESTS++))
        log_info "$suite_name passed ✓"
    else
        ((FAILED_TESTS++))
        log_error "$suite_name failed ✗"
    fi
    
    if [ -n "$working_dir" ]; then
        cd - > /dev/null
    fi
}

# Unit Tests
if [ "$RUN_UNIT" = true ]; then
    echo ""
    echo "=== Running Unit Tests ==="
    echo ""
    
    # .NET Unit Tests
    if [ -d "functions/ANFServer/Tests" ]; then
        if [ "$COVERAGE" = true ]; then
            run_test_suite ".NET Unit Tests" \
                "dotnet test Tests/ --configuration Release --collect:'XPlat Code Coverage' --results-directory $PWD/../../$TEST_RESULTS_DIR/dotnet" \
                "functions/ANFServer"
        else
            run_test_suite ".NET Unit Tests" \
                "dotnet test Tests/ --configuration Release --logger:trx --results-directory $PWD/../../$TEST_RESULTS_DIR/dotnet" \
                "functions/ANFServer"
        fi
    else
        log_warn ".NET test project not found at functions/ANFServer/Tests/"
    fi
    
    # TypeScript Unit Tests
    for dir in rag src/mcp-server src/teams-bot; do
        if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
            if [ "$COVERAGE" = true ]; then
                run_test_suite "$dir Unit Tests" \
                    "npm test -- --coverage --coverageDirectory=$PWD/../$TEST_RESULTS_DIR/$dir-coverage" \
                    "$dir"
            else
                run_test_suite "$dir Unit Tests" \
                    "npm test" \
                    "$dir"
            fi
        fi
    done
fi

# Integration Tests
if [ "$RUN_INTEGRATION" = true ]; then
    echo ""
    echo "=== Running Integration Tests ==="
    echo ""
    
    # Check if Azure Functions Core Tools is running
    if ! lsof -i :7071 > /dev/null 2>&1; then
        log_warn "Azure Functions not running. Starting Functions runtime..."
        cd functions/ANFServer
        func start &
        FUNC_PID=$!
        sleep 10
        cd - > /dev/null
    fi
    
    # Run TypeScript integration tests
    for dir in src/mcp-server src/teams-bot; do
        if [ -d "$dir/tests/integration" ]; then
            if [ "$COVERAGE" = true ]; then
                run_test_suite "$dir Integration Tests" \
                    "npm run test:integration -- --coverage --coverageDirectory=$PWD/../$TEST_RESULTS_DIR/$dir-integration-coverage" \
                    "$dir"
            else
                run_test_suite "$dir Integration Tests" \
                    "npm run test:integration" \
                    "$dir"
            fi
        fi
    done
    
    # Run .NET integration tests
    if [ -d "functions/ANFServer/Tests" ]; then
        run_test_suite ".NET Integration Tests" \
            "dotnet test Tests/ --configuration Release --filter Category=Integration --logger:trx --results-directory $PWD/../../$TEST_RESULTS_DIR/dotnet-integration" \
            "functions/ANFServer"
    fi
    
    # Cleanup Functions runtime if we started it
    if [ -n "$FUNC_PID" ]; then
        kill $FUNC_PID 2>/dev/null || true
    fi
fi

# E2E Tests
if [ "$RUN_E2E" = true ]; then
    echo ""
    echo "=== Running E2E Tests ==="
    echo ""
    
    log_warn "E2E tests require full environment setup"
    
    # Check if services are running
    SERVICES_RUNNING=true
    
    if ! curl -s http://localhost:7071/api/health > /dev/null 2>&1; then
        log_warn "Azure Functions not accessible at http://localhost:7071"
        SERVICES_RUNNING=false
    fi
    
    if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
        log_warn "MCP Server not accessible at http://localhost:3000"
        SERVICES_RUNNING=false
    fi
    
    if [ "$SERVICES_RUNNING" = false ]; then
        log_error "Required services not running. Skipping E2E tests."
        log_info "Start services with:"
        log_info "  - Azure Functions: cd functions/ANFServer && func start"
        log_info "  - MCP Server: cd src/mcp-server && npm run dev"
        log_info "  - Teams Bot: cd src/teams-bot && npm run dev"
    else
        run_test_suite "E2E Tests" \
            "npm run test:e2e" \
            "tests"
    fi
fi

# Security Tests
if [ "$RUN_SECURITY" = true ]; then
    echo ""
    echo "=== Running Security Tests ==="
    echo ""
    
    # Check for secrets in code
    log_test "Checking for hardcoded secrets..."
    if grep -r "password\s*=\s*[\"'][^\"']*[\"']" . \
        --include="*.cs" \
        --include="*.ts" \
        --include="*.js" \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude-dir=$TEST_RESULTS_DIR \
        > $TEST_RESULTS_DIR/hardcoded-secrets.txt 2>/dev/null; then
        
        if [ -s $TEST_RESULTS_DIR/hardcoded-secrets.txt ]; then
            ((FAILED_TESTS++))
            log_error "Potential hardcoded secrets found!"
            cat $TEST_RESULTS_DIR/hardcoded-secrets.txt
        else
            ((PASSED_TESTS++))
            log_info "No hardcoded secrets found ✓"
        fi
    else
        ((PASSED_TESTS++))
        log_info "No hardcoded secrets found ✓"
    fi
    ((TOTAL_TESTS++))
    
    # Run comprehensive security tests
    if [ -d "tests" ] && [ -f "tests/package.json" ]; then
        run_test_suite "Security Tests" \
            "npm run test:security" \
            "tests"
    fi
    
    # Run npm audit
    log_test "Running npm security audit..."
    AUDIT_FAILED=false
    for dir in rag src/mcp-server src/teams-bot tests; do
        if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
            cd "$dir"
            if ! npm audit --audit-level=high > ../$TEST_RESULTS_DIR/$dir-audit.txt 2>&1; then
                AUDIT_FAILED=true
                log_warn "Security vulnerabilities found in $dir"
            fi
            cd - > /dev/null
        fi
    done
    
    if [ "$AUDIT_FAILED" = true ]; then
        ((FAILED_TESTS++))
        log_error "Security audit failed - check audit reports"
    else
        ((PASSED_TESTS++))
        log_info "Security audit passed ✓"
    fi
    ((TOTAL_TESTS++))
    
    # Check for unsafe HTTP usage
    log_test "Checking for unsafe HTTP usage..."
    if grep -r "http://" . \
        --include="*.cs" \
        --include="*.ts" \
        --include="*.js" \
        --include="*.json" \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude="*test*" \
        | grep -v "localhost" \
        | grep -v "127.0.0.1" \
        > $TEST_RESULTS_DIR/unsafe-http.txt 2>/dev/null; then
        
        if [ -s $TEST_RESULTS_DIR/unsafe-http.txt ]; then
            ((FAILED_TESTS++))
            log_warn "Unsafe HTTP usage found:"
            cat $TEST_RESULTS_DIR/unsafe-http.txt
        else
            ((PASSED_TESTS++))
            log_info "No unsafe HTTP usage found ✓"
        fi
    else
        ((PASSED_TESTS++))
        log_info "No unsafe HTTP usage found ✓"
    fi
    ((TOTAL_TESTS++))
fi

# Generate coverage report
if [ "$COVERAGE" = true ] && [ "$RUN_UNIT" = true ]; then
    echo ""
    echo "=== Generating Coverage Report ==="
    echo ""
    
    # Merge coverage reports
    if command -v nyc &> /dev/null; then
        log_info "Merging coverage reports..."
        nyc merge $TEST_RESULTS_DIR/*-coverage coverage-merged
        nyc report --reporter=html --reporter=text --report-dir=$TEST_RESULTS_DIR/coverage-report
        log_info "Coverage report generated at $TEST_RESULTS_DIR/coverage-report/index.html"
    else
        log_warn "nyc not installed. Install with: npm install -g nyc"
    fi
fi

# Summary
echo ""
echo "==================================="
echo "Test Summary"
echo "==================================="
echo ""
echo -e "Total test suites run: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    log_info "All tests passed! ✓"
    exit 0
else
    log_error "Some tests failed! ✗"
    log_info "Check test results in $TEST_RESULTS_DIR/"
    exit 1
fi