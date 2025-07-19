# ANF-AIOps Testing Infrastructure

This directory contains comprehensive testing infrastructure for the ANF-AIOps project, including unit tests, integration tests, end-to-end tests, load tests, and security tests.

**Author:** Dwiref Sharma <DwirefS@SapientEdge.io>

## Overview

The testing infrastructure is designed to ensure the reliability, performance, and security of the ANF-AIOps system across all components:

- **MCP Server** (`/src/mcp-server/`) - Azure NetApp Files MCP tools
- **Teams Bot** (`/src/teams-bot/`) - Microsoft Teams integration
- **Azure Functions** (`/functions/ANFServer/`) - Backend API services

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests
├── load/                   # Load testing with k6
├── security/               # Security and penetration tests
├── scripts/                # Test setup and utility scripts
├── package.json           # Test dependencies and scripts
└── README.md              # This file
```

Each component also has its own test structure:
```
src/mcp-server/tests/
├── unit/                   # Unit tests
├── integration/           # Integration tests
├── fixtures/              # Test data
└── mocks/                 # Mock objects

src/teams-bot/tests/
├── unit/                   # Unit tests
├── integration/           # Integration tests
├── fixtures/              # Test data
└── mocks/                 # Mock objects

functions/ANFServer/Tests/
├── Unit/                   # Unit tests
├── Integration/           # Integration tests
└── Fixtures/              # Test data
```

## Quick Start

### 1. Setup Test Environment

```bash
# Run the interactive setup script
cd tests
node scripts/setup-test-environment.js

# Or set up manually with environment variables
export TEST_AZURE_SUBSCRIPTION_ID="your-subscription-id"
export TEST_AZURE_TENANT_ID="your-tenant-id"
export TEST_AZURE_CLIENT_ID="your-client-id"
export TEST_AZURE_CLIENT_SECRET="your-client-secret"
export TEST_RESOURCE_GROUP="anf-aiops-test-rg"
```

### 2. Install Dependencies

```bash
cd tests
npm install
```

### 3. Start Services

```bash
# Terminal 1: Azure Functions
cd functions/ANFServer
func start

# Terminal 2: MCP Server
cd src/mcp-server
npm run dev

# Terminal 3: Teams Bot
cd src/teams-bot
npm run dev
```

### 4. Run Tests

```bash
cd tests

# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:load
```

## Test Types

### Unit Tests

Test individual components in isolation with mocked dependencies.

**Coverage Goals:**
- MCP Server: 80% line coverage
- Teams Bot: 75% line coverage  
- Azure Functions: 80% line coverage

**Running Unit Tests:**
```bash
# All unit tests
npm run test:unit

# By component
npm run test:unit:mcp
npm run test:unit:teams
npm run test:unit:functions

# With coverage
npm run test:coverage:unit
```

### Integration Tests

Test component interactions and external service integrations.

**What's Tested:**
- MCP Server tool execution pipeline
- Teams Bot command processing
- Azure Functions API endpoints
- Azure NetApp Files API integration

**Running Integration Tests:**
```bash
npm run test:integration
```

### End-to-End Tests

Test complete user workflows across all components.

**Test Scenarios:**
- Complete ANF resource lifecycle (Account → Pool → Volume → Snapshot)
- Cross-service communication (Teams Bot → MCP Server → Azure Functions)
- Error handling and recovery
- Authentication and authorization flows

**Prerequisites:**
- Valid Azure subscription with NetApp Files enabled
- Service principal with appropriate permissions
- Test resource group

**Running E2E Tests:**
```bash
npm run test:e2e
```

### Load Tests

Performance testing using k6 to validate system behavior under load.

**Test Scenarios:**
- Read-heavy operations (70% of traffic)
- Write operations (20% of traffic)
- Health checks (10% of traffic)

**Load Test Stages:**
1. Ramp-up to 10 users (5 minutes)
2. Sustain 10 users (10 minutes)
3. Ramp-up to 50 users (5 minutes)
4. Sustain 50 users (10 minutes)
5. Ramp-up to 100 users (5 minutes)
6. Sustain 100 users (10 minutes)
7. Ramp-down (5 minutes)

**Performance Thresholds:**
- Error rate < 1%
- 95th percentile response time < 2000ms
- Average response time < 1000ms

**Running Load Tests:**
```bash
# Requires k6 installation
npm run test:load
```

### Security Tests

Comprehensive security validation including authentication, authorization, input validation, and common vulnerabilities.

**Security Test Categories:**
- Authentication bypass attempts
- Authorization violations
- Input validation (XSS, SQL injection, command injection)
- Rate limiting verification
- Data protection validation
- Infrastructure security checks

**Running Security Tests:**
```bash
npm run test:security
```

## Test Configuration

### Environment Variables

**Required:**
- `TEST_AZURE_SUBSCRIPTION_ID` - Azure subscription for testing
- `TEST_AZURE_TENANT_ID` - Azure AD tenant ID
- `TEST_AZURE_CLIENT_ID` - Service principal client ID
- `TEST_AZURE_CLIENT_SECRET` - Service principal secret

**Optional:**
- `TEST_RESOURCE_GROUP` - Test resource group (default: anf-aiops-test-rg)
- `TEST_LOCATION` - Azure region (default: eastus)
- `AZURE_FUNCTIONS_URL` - Functions endpoint (default: http://localhost:7071)
- `MCP_SERVER_URL` - MCP Server endpoint (default: http://localhost:3000)
- `TEAMS_BOT_URL` - Teams Bot endpoint (default: http://localhost:3978)

### Test Data

Test fixtures are located in each component's `fixtures/` directory:

- **anf-data.ts** - Mock Azure NetApp Files resources
- **teams-messages.json** - Sample Teams Bot interactions
- **api-responses.json** - Mock API responses

## CI/CD Integration

### GitHub Actions

The test suite integrates with GitHub Actions for continuous testing:

```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm run test:unit

- name: Run Integration Tests  
  run: npm run test:integration

- name: Run Security Tests
  run: npm run test:security

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

### Azure Pipelines

For Azure DevOps integration:

```yaml
# azure-pipelines-test.yml
- task: DotNetCoreCLI@2
  displayName: 'Run .NET Tests'
  inputs:
    command: 'test'
    projects: 'functions/ANFServer/Tests/*.csproj'

- task: Npm@1
  displayName: 'Run TypeScript Tests'
  inputs:
    command: 'run'
    arguments: 'test:ci'
```

## Test Data Management

### Cleanup

Tests automatically clean up resources created during execution. For manual cleanup:

```bash
node scripts/cleanup-test-environment.js
```

### Test Resource Isolation

Each test run uses unique resource names to prevent conflicts:
- Account names: `e2e-test-account-{timestamp}`
- Volume names: `test-volume-{timestamp}-{random}`
- Snapshot names: `test-snapshot-{timestamp}-{random}`

## Coverage Reports

Coverage reports are generated in each component's `coverage/` directory:

- **HTML Reports:** `coverage/index.html`
- **LCOV Reports:** `coverage/lcov.info`
- **JSON Reports:** `coverage/coverage-final.json`

### Viewing Coverage

```bash
# MCP Server coverage
cd src/mcp-server && npm run test:coverage
open coverage/index.html

# Teams Bot coverage  
cd src/teams-bot && npm run test:coverage
open coverage/index.html

# Combined coverage report
npm run test:coverage
```

## Debugging Tests

### Verbose Output

```bash
# Enable debug logging
DEBUG=* npm test

# Component-specific debugging
DEBUG=anf:mcp* npm run test:unit:mcp
DEBUG=anf:teams* npm run test:unit:teams
```

### Test Isolation

Run individual test files:

```bash
# Specific test file
npx mocha e2e/anf-aiops-e2e.test.js

# Specific test case
npx mocha e2e/anf-aiops-e2e.test.js --grep "should create a NetApp account"
```

### Mock Inspection

Enable mock call inspection:

```javascript
// In test files
console.log('Mock calls:', mockService.methodName.mock.calls);
```

## Performance Monitoring

### Test Execution Times

Monitor test execution performance:

```bash
# Generate performance report
npm run test -- --reporter json > test-results.json

# Analyze slow tests
node scripts/analyze-test-performance.js test-results.json
```

### Resource Usage

Monitor resource usage during tests:

```bash
# Memory usage
npm run test:load -- --out json=load-test-results.json

# Analyze results
k6 inspect load-test-results.json
```

## Troubleshooting

### Common Issues

**Authentication Errors:**
```
Error: Authentication failed
```
- Verify service principal credentials
- Check Azure subscription access
- Ensure NetApp Files provider is registered

**Rate Limiting:**
```
Error: Rate limit exceeded
```
- Reduce test parallelism
- Add delays between API calls
- Use different test subscriptions

**Resource Conflicts:**
```
Error: Resource already exists
```
- Ensure unique resource naming
- Check test cleanup completion
- Verify resource group isolation

**Network Timeouts:**
```
Error: Request timeout
```
- Increase test timeouts
- Check network connectivity
- Verify service endpoints

### Debug Mode

Enable debug mode for detailed logging:

```bash
export DEBUG=anf:*
export LOG_LEVEL=debug
npm test
```

### Log Analysis

Test logs are written to:
- Unit tests: Component-specific log files
- Integration tests: `logs/integration-tests.log`
- E2E tests: `logs/e2e-tests.log`
- Security tests: `logs/security-tests.log`

## Contributing

When adding new tests:

1. **Follow naming conventions:**
   - Test files: `*.test.ts` or `*.test.js`
   - Mock files: `*.mock.ts` or `mock-*.ts`
   - Fixture files: `*-fixture.ts` or `test-data.ts`

2. **Include comprehensive test cases:**
   - Happy path scenarios
   - Error conditions
   - Edge cases
   - Security considerations

3. **Maintain test isolation:**
   - Clean up test resources
   - Use unique identifiers
   - Mock external dependencies

4. **Document test scenarios:**
   - Clear test descriptions
   - Expected behaviors
   - Prerequisites and setup

5. **Update coverage thresholds:**
   - Maintain or improve coverage percentages
   - Add coverage for new features
   - Remove coverage for deprecated code

## Support

For test-related issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Review test logs in the `logs/` directory
3. Run tests in debug mode for detailed output
4. Contact: Dwiref Sharma <DwirefS@SapientEdge.io>

## License

This testing infrastructure is part of the ANF-AIOps project and is licensed under the MIT License.