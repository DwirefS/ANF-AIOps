#!/usr/bin/env node

/**
 * Test Environment Setup Script
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');

const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg)
};

class TestEnvironmentSetup {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.testConfig = {};
  }

  async run() {
    try {
      log.info('Setting up ANF-AIOps test environment...');
      
      await this.checkPrerequisites();
      await this.promptConfiguration();
      await this.createEnvironmentFiles();
      await this.installDependencies();
      await this.setupAzureResources();
      await this.validateSetup();
      
      log.success('Test environment setup completed successfully!');
      this.displaySummary();
    } catch (error) {
      log.error(`Setup failed: ${error.message}`);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    const spinner = ora('Checking prerequisites...').start();
    
    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const requiredNodeVersion = '18.0.0';
      if (!this.isVersionCompatible(nodeVersion.slice(1), requiredNodeVersion)) {
        throw new Error(`Node.js ${requiredNodeVersion} or higher is required. Current: ${nodeVersion}`);
      }

      // Check if .NET is installed
      try {
        execSync('dotnet --version', { stdio: 'pipe' });
      } catch {
        throw new Error('.NET 8.0 SDK is required but not found');
      }

      // Check if Azure CLI is installed
      try {
        execSync('az --version', { stdio: 'pipe' });
      } catch {
        throw new Error('Azure CLI is required but not found');
      }

      // Check if k6 is available for load testing (optional)
      try {
        execSync('k6 version', { stdio: 'pipe' });
        this.testConfig.hasK6 = true;
      } catch {
        log.warn('k6 not found - load testing will be skipped');
        this.testConfig.hasK6 = false;
      }

      spinner.succeed('Prerequisites check passed');
    } catch (error) {
      spinner.fail('Prerequisites check failed');
      throw error;
    }
  }

  async promptConfiguration() {
    log.info('Please provide test configuration:');
    
    const questions = [
      {
        type: 'input',
        name: 'azureSubscriptionId',
        message: 'Azure Subscription ID:',
        validate: (input) => input.length > 0 || 'Subscription ID is required'
      },
      {
        type: 'input',
        name: 'azureTenantId',
        message: 'Azure Tenant ID:',
        validate: (input) => input.length > 0 || 'Tenant ID is required'
      },
      {
        type: 'input',
        name: 'azureClientId',
        message: 'Azure Client ID (Service Principal):',
        validate: (input) => input.length > 0 || 'Client ID is required'
      },
      {
        type: 'password',
        name: 'azureClientSecret',
        message: 'Azure Client Secret:',
        validate: (input) => input.length > 0 || 'Client Secret is required'
      },
      {
        type: 'input',
        name: 'testResourceGroup',
        message: 'Test Resource Group Name:',
        default: 'anf-aiops-test-rg'
      },
      {
        type: 'input',
        name: 'testLocation',
        message: 'Azure Region for test resources:',
        default: 'eastus'
      },
      {
        type: 'confirm',
        name: 'createTestResources',
        message: 'Create test Azure resources (NetApp Account, etc.)?',
        default: false
      },
      {
        type: 'confirm',
        name: 'runE2ETests',
        message: 'Enable end-to-end tests?',
        default: true
      },
      {
        type: 'confirm',
        name: 'runSecurityTests',
        message: 'Enable security tests?',
        default: true
      }
    ];

    this.testConfig = await inquirer.prompt(questions);
  }

  async createEnvironmentFiles() {
    const spinner = ora('Creating environment files...').start();
    
    try {
      // Create .env.test for MCP Server
      const mcpEnvContent = `
NODE_ENV=test
AZURE_SUBSCRIPTION_ID=${this.testConfig.azureSubscriptionId}
AZURE_TENANT_ID=${this.testConfig.azureTenantId}
AZURE_CLIENT_ID=${this.testConfig.azureClientId}
AZURE_CLIENT_SECRET=${this.testConfig.azureClientSecret}
KEY_VAULT_URL=https://test-keyvault.vault.azure.net
LOG_LEVEL=error
TEST_RESOURCE_GROUP=${this.testConfig.testResourceGroup}
TEST_LOCATION=${this.testConfig.testLocation}
`;

      await this.writeFile(
        path.join(this.projectRoot, 'src/mcp-server/.env.test'),
        mcpEnvContent.trim()
      );

      // Create .env.test for Teams Bot
      const teamsEnvContent = `
NODE_ENV=test
MicrosoftAppId=test-app-id
MicrosoftAppPassword=test-app-password
MicrosoftAppTenantId=${this.testConfig.azureTenantId}
BOT_ENDPOINT=https://test-bot.ngrok.io
MCP_SERVER_URL=http://localhost:3000
AZURE_SUBSCRIPTION_ID=${this.testConfig.azureSubscriptionId}
AZURE_TENANT_ID=${this.testConfig.azureTenantId}
AZURE_CLIENT_ID=${this.testConfig.azureClientId}
AZURE_CLIENT_SECRET=${this.testConfig.azureClientSecret}
LOG_LEVEL=error
`;

      await this.writeFile(
        path.join(this.projectRoot, 'src/teams-bot/.env.test'),
        teamsEnvContent.trim()
      );

      // Create appsettings.test.json for Azure Functions
      const functionsConfig = {
        "IsEncrypted": false,
        "Values": {
          "AzureWebJobsStorage": "UseDevelopmentStorage=true",
          "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
          "AZURE_SUBSCRIPTION_ID": this.testConfig.azureSubscriptionId,
          "AZURE_TENANT_ID": this.testConfig.azureTenantId,
          "AZURE_CLIENT_ID": this.testConfig.azureClientId,
          "AZURE_CLIENT_SECRET": this.testConfig.azureClientSecret,
          "TEST_RESOURCE_GROUP": this.testConfig.testResourceGroup,
          "TEST_LOCATION": this.testConfig.testLocation
        }
      };

      await this.writeFile(
        path.join(this.projectRoot, 'functions/ANFServer/Tests/appsettings.test.json'),
        JSON.stringify(functionsConfig, null, 2)
      );

      // Create test configuration for root tests
      const rootTestConfig = {
        "azure": {
          "subscriptionId": this.testConfig.azureSubscriptionId,
          "tenantId": this.testConfig.azureTenantId,
          "clientId": this.testConfig.azureClientId,
          "resourceGroup": this.testConfig.testResourceGroup,
          "location": this.testConfig.testLocation
        },
        "services": {
          "azureFunctionsUrl": "http://localhost:7071",
          "mcpServerUrl": "http://localhost:3000",
          "teamsBotUrl": "http://localhost:3978"
        },
        "features": {
          "e2eTests": this.testConfig.runE2ETests,
          "securityTests": this.testConfig.runSecurityTests,
          "loadTests": this.testConfig.hasK6,
          "createTestResources": this.testConfig.createTestResources
        }
      };

      await this.writeFile(
        path.join(this.projectRoot, 'tests/test-config.json'),
        JSON.stringify(rootTestConfig, null, 2)
      );

      // Create .env for tests directory
      const testsEnvContent = `
TEST_AZURE_SUBSCRIPTION_ID=${this.testConfig.azureSubscriptionId}
TEST_AZURE_TENANT_ID=${this.testConfig.azureTenantId}
TEST_AZURE_CLIENT_ID=${this.testConfig.azureClientId}
TEST_AZURE_CLIENT_SECRET=${this.testConfig.azureClientSecret}
TEST_RESOURCE_GROUP=${this.testConfig.testResourceGroup}
TEST_LOCATION=${this.testConfig.testLocation}
AZURE_FUNCTIONS_URL=http://localhost:7071
MCP_SERVER_URL=http://localhost:3000
TEAMS_BOT_URL=http://localhost:3978
NODE_ENV=test
`;

      await this.writeFile(
        path.join(this.projectRoot, 'tests/.env'),
        testsEnvContent.trim()
      );

      spinner.succeed('Environment files created');
    } catch (error) {
      spinner.fail('Failed to create environment files');
      throw error;
    }
  }

  async installDependencies() {
    const spinner = ora('Installing test dependencies...').start();
    
    try {
      // Install MCP Server dependencies
      execSync('npm install', { 
        cwd: path.join(this.projectRoot, 'src/mcp-server'),
        stdio: 'pipe'
      });

      // Install Teams Bot dependencies
      execSync('npm install', { 
        cwd: path.join(this.projectRoot, 'src/teams-bot'),
        stdio: 'pipe'
      });

      // Install root tests dependencies
      execSync('npm install', { 
        cwd: path.join(this.projectRoot, 'tests'),
        stdio: 'pipe'
      });

      // Restore .NET packages
      execSync('dotnet restore', { 
        cwd: path.join(this.projectRoot, 'functions/ANFServer'),
        stdio: 'pipe'
      });

      spinner.succeed('Dependencies installed');
    } catch (error) {
      spinner.fail('Failed to install dependencies');
      throw error;
    }
  }

  async setupAzureResources() {
    if (!this.testConfig.createTestResources) {
      log.info('Skipping Azure resource creation');
      return;
    }

    const spinner = ora('Setting up Azure test resources...').start();
    
    try {
      // Login to Azure CLI
      execSync(`az login --service-principal -u ${this.testConfig.azureClientId} -p ${this.testConfig.azureClientSecret} --tenant ${this.testConfig.azureTenantId}`, { stdio: 'pipe' });
      
      // Set subscription
      execSync(`az account set --subscription ${this.testConfig.azureSubscriptionId}`, { stdio: 'pipe' });
      
      // Create resource group
      execSync(`az group create --name ${this.testConfig.testResourceGroup} --location ${this.testConfig.testLocation}`, { stdio: 'pipe' });
      
      // Create VNet for NetApp Files
      execSync(`az network vnet create --resource-group ${this.testConfig.testResourceGroup} --name test-vnet --address-prefix 10.0.0.0/16`, { stdio: 'pipe' });
      
      // Create subnet for NetApp Files
      execSync(`az network vnet subnet create --resource-group ${this.testConfig.testResourceGroup} --vnet-name test-vnet --name anf-subnet --address-prefix 10.0.1.0/24 --delegations Microsoft.NetApp/volumes`, { stdio: 'pipe' });
      
      spinner.succeed('Azure test resources created');
    } catch (error) {
      spinner.fail('Failed to setup Azure resources');
      log.warn('You may need to create test resources manually');
      // Don't throw error here as tests can still run without pre-created resources
    }
  }

  async validateSetup() {
    const spinner = ora('Validating test setup...').start();
    
    try {
      // Check if all environment files exist
      const requiredFiles = [
        'src/mcp-server/.env.test',
        'src/teams-bot/.env.test',
        'functions/ANFServer/Tests/appsettings.test.json',
        'tests/test-config.json',
        'tests/.env'
      ];

      for (const file of requiredFiles) {
        const filePath = path.join(this.projectRoot, file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Required file missing: ${file}`);
        }
      }

      // Test Azure authentication
      execSync(`az account show --subscription ${this.testConfig.azureSubscriptionId}`, { stdio: 'pipe' });
      
      spinner.succeed('Setup validation passed');
    } catch (error) {
      spinner.fail('Setup validation failed');
      throw error;
    }
  }

  displaySummary() {
    console.log('\n' + chalk.green.bold('✓ Test Environment Setup Complete!'));
    console.log('\nConfiguration:');
    console.log(`  • Subscription: ${this.testConfig.azureSubscriptionId}`);
    console.log(`  • Resource Group: ${this.testConfig.testResourceGroup}`);
    console.log(`  • Location: ${this.testConfig.testLocation}`);
    console.log(`  • E2E Tests: ${this.testConfig.runE2ETests ? 'Enabled' : 'Disabled'}`);
    console.log(`  • Security Tests: ${this.testConfig.runSecurityTests ? 'Enabled' : 'Disabled'}`);
    console.log(`  • Load Tests: ${this.testConfig.hasK6 ? 'Available' : 'Not Available'}`);
    
    console.log('\nNext steps:');
    console.log('1. Start the services:');
    console.log('   • Azure Functions: cd functions/ANFServer && func start');
    console.log('   • MCP Server: cd src/mcp-server && npm run dev');
    console.log('   • Teams Bot: cd src/teams-bot && npm run dev');
    console.log('2. Run tests: cd tests && npm test');
    console.log('3. View coverage: open coverage reports in each component');
  }

  async writeFile(filePath, content) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
  }

  isVersionCompatible(current, required) {
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (currentParts[i] > requiredParts[i]) return true;
      if (currentParts[i] < requiredParts[i]) return false;
    }
    return true;
  }
}

// Run the setup if called directly
if (require.main === module) {
  const setup = new TestEnvironmentSetup();
  setup.run().catch(error => {
    console.error(chalk.red('Setup failed:'), error.message);
    process.exit(1);
  });
}

module.exports = TestEnvironmentSetup;