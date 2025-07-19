/**
 * Unit tests for Command Processor
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import { CommandProcessor } from '../../src/bot/command-processor';
import { MCPService } from '../../src/services/mcp.service';
import { LoggingService } from '../../src/services/logging.service';
import { TurnContext } from 'botbuilder';

// Mock dependencies
jest.mock('../../src/services/mcp.service');
jest.mock('../../src/services/logging.service');

describe('CommandProcessor', () => {
  let commandProcessor: CommandProcessor;
  let mockMCPService: jest.Mocked<MCPService>;
  let mockLoggingService: jest.Mocked<LoggingService>;
  let mockTurnContext: jest.Mocked<TurnContext>;
  let mockUserProfile: any;

  beforeEach(() => {
    // Setup mocks
    mockMCPService = new MCPService() as jest.Mocked<MCPService>;
    mockLoggingService = new LoggingService() as jest.Mocked<LoggingService>;
    
    mockMCPService.callTool = jest.fn();
    mockLoggingService.log = jest.fn();
    mockLoggingService.logError = jest.fn();

    // Mock user profile
    mockUserProfile = {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
      roles: ['Reader', 'Contributor'],
      subscriptionId: 'test-subscription',
    };

    // Mock turn context
    mockTurnContext = {
      activity: {
        from: { id: 'test-user', name: 'Test User' },
        text: '',
        conversation: { id: 'test-conversation' },
      },
    } as any;

    // Initialize command processor
    commandProcessor = new CommandProcessor(mockMCPService, mockLoggingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseCommand', () => {
    it('should parse simple commands', () => {
      const result = commandProcessor.parseCommand('help');
      
      expect(result.command).toBe('help');
      expect(result.parameters).toEqual({});
    });

    it('should parse commands with parameters', () => {
      const result = commandProcessor.parseCommand('list-accounts --resource-group test-rg --location eastus');
      
      expect(result.command).toBe('list-accounts');
      expect(result.parameters).toEqual({
        'resource-group': 'test-rg',
        'location': 'eastus',
      });
    });

    it('should parse commands with quoted parameters', () => {
      const result = commandProcessor.parseCommand('create-volume --name "My Volume" --size 100');
      
      expect(result.command).toBe('create-volume');
      expect(result.parameters).toEqual({
        'name': 'My Volume',
        'size': '100',
      });
    });

    it('should handle commands with equals sign parameters', () => {
      const result = commandProcessor.parseCommand('update-volume --tags environment=prod,owner=admin');
      
      expect(result.command).toBe('update-volume');
      expect(result.parameters).toEqual({
        'tags': 'environment=prod,owner=admin',
      });
    });
  });

  describe('processCommand', () => {
    it('should process help command', async () => {
      const result = await commandProcessor.processCommand('help', mockTurnContext, mockUserProfile);
      
      expect(result.success).toBe(true);
      expect(result.response).toContain('Available commands');
      expect(result.response).toContain('list-accounts');
      expect(result.response).toContain('list-volumes');
      expect(result.response).toContain('create-snapshot');
    });

    it('should process list-accounts command', async () => {
      const mockAccountsResponse = {
        accounts: [
          {
            id: '/subscriptions/test-subscription/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/account1',
            name: 'account1',
            location: 'eastus',
            tags: { environment: 'prod' },
          },
          {
            id: '/subscriptions/test-subscription/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/account2',
            name: 'account2',
            location: 'westus',
            tags: { environment: 'dev' },
          },
        ],
        message: 'Found 2 NetApp accounts',
      };

      mockMCPService.callTool.mockResolvedValue({
        isError: false,
        content: mockAccountsResponse,
      });

      const result = await commandProcessor.processCommand(
        'list-accounts --resource-group test-rg',
        mockTurnContext,
        mockUserProfile
      );

      expect(result.success).toBe(true);
      expect(result.response).toContain('Found 2 NetApp accounts');
      expect(result.adaptiveCard).toBeDefined();
      expect(result.adaptiveCard.body).toContainEqual(
        expect.objectContaining({
          type: 'TextBlock',
          text: 'NetApp Accounts (2)',
        })
      );

      expect(mockMCPService.callTool).toHaveBeenCalledWith('list_accounts', {
        subscriptionId: 'test-subscription',
        resourceGroupName: 'test-rg',
      });
    });

    it('should process list-volumes command', async () => {
      const mockVolumesResponse = {
        volumes: [
          {
            id: '/subscriptions/test-subscription/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/account1/capacityPools/pool1/volumes/volume1',
            name: 'volume1',
            properties: {
              serviceLevel: 'Premium',
              usageThreshold: 107374182400, // 100 GiB
              provisioningState: 'Succeeded',
              mountTargets: [{ ipAddress: '10.0.1.4' }],
            },
          },
        ],
        message: 'Found 1 volume',
      };

      mockMCPService.callTool.mockResolvedValue({
        isError: false,
        content: mockVolumesResponse,
      });

      const result = await commandProcessor.processCommand(
        'list-volumes --resource-group test-rg --account account1 --pool pool1',
        mockTurnContext,
        mockUserProfile
      );

      expect(result.success).toBe(true);
      expect(result.response).toContain('Found 1 volume');
      expect(result.adaptiveCard).toBeDefined();
      
      expect(mockMCPService.callTool).toHaveBeenCalledWith('list_volumes', {
        subscriptionId: 'test-subscription',
        resourceGroupName: 'test-rg',
        accountName: 'account1',
        poolName: 'pool1',
      });
    });

    it('should process create-snapshot command', async () => {
      const mockSnapshotResponse = {
        snapshot: {
          id: '/subscriptions/test-subscription/resourceGroups/test-rg/providers/Microsoft.NetApp/netAppAccounts/account1/capacityPools/pool1/volumes/volume1/snapshots/snapshot1',
          name: 'snapshot1',
          properties: {
            provisioningState: 'Succeeded',
            created: new Date(),
          },
        },
        message: 'Snapshot created successfully',
      };

      mockMCPService.callTool.mockResolvedValue({
        isError: false,
        content: mockSnapshotResponse,
      });

      const result = await commandProcessor.processCommand(
        'create-snapshot --resource-group test-rg --account account1 --pool pool1 --volume volume1 --snapshot snapshot1',
        mockTurnContext,
        mockUserProfile
      );

      expect(result.success).toBe(true);
      expect(result.response).toContain('Snapshot created successfully');
      
      expect(mockMCPService.callTool).toHaveBeenCalledWith('create_snapshot', {
        subscriptionId: 'test-subscription',
        resourceGroupName: 'test-rg',
        accountName: 'account1',
        poolName: 'pool1',
        volumeName: 'volume1',
        snapshotName: 'snapshot1',
        location: undefined,
      });
    });

    it('should handle unknown commands', async () => {
      const result = await commandProcessor.processCommand(
        'unknown-command',
        mockTurnContext,
        mockUserProfile
      );

      expect(result.success).toBe(false);
      expect(result.response).toContain('Unknown command');
      expect(result.response).toContain('unknown-command');
      expect(result.error).toBe('Command not found');
    });

    it('should handle missing required parameters', async () => {
      const result = await commandProcessor.processCommand(
        'list-accounts',
        mockTurnContext,
        mockUserProfile
      );

      expect(result.success).toBe(false);
      expect(result.response).toContain('Missing required parameter');
      expect(result.response).toContain('resource-group');
    });

    it('should handle MCP service errors', async () => {
      mockMCPService.callTool.mockResolvedValue({
        isError: true,
        content: 'Azure API error: ResourceGroupNotFound',
      });

      const result = await commandProcessor.processCommand(
        'list-accounts --resource-group invalid-rg',
        mockTurnContext,
        mockUserProfile
      );

      expect(result.success).toBe(false);
      expect(result.response).toContain('Azure API error');
      expect(result.error).toContain('ResourceGroupNotFound');
    });
  });

  describe('validateParameters', () => {
    it('should validate required parameters for list-accounts', () => {
      const parameters = { 'resource-group': 'test-rg' };
      const validation = commandProcessor.validateParameters('list-accounts', parameters);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject missing required parameters', () => {
      const parameters = {};
      const validation = commandProcessor.validateParameters('list-accounts', parameters);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing required parameter: resource-group');
    });

    it('should validate volume creation parameters', () => {
      const parameters = {
        'resource-group': 'test-rg',
        'account': 'test-account',
        'pool': 'test-pool',
        'volume': 'test-volume',
        'size': '100',
        'service-level': 'Premium',
      };
      
      const validation = commandProcessor.validateParameters('create-volume', parameters);
      
      expect(validation.isValid).toBe(true);
    });

    it('should validate size parameter format', () => {
      const parameters = {
        'resource-group': 'test-rg',
        'account': 'test-account',
        'pool': 'test-pool',
        'volume': 'test-volume',
        'size': 'invalid-size',
        'service-level': 'Premium',
      };
      
      const validation = commandProcessor.validateParameters('create-volume', parameters);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid size format. Must be a number in GiB');
    });

    it('should validate service level values', () => {
      const parameters = {
        'resource-group': 'test-rg',
        'account': 'test-account',
        'pool': 'test-pool',
        'volume': 'test-volume',
        'size': '100',
        'service-level': 'InvalidLevel',
      };
      
      const validation = commandProcessor.validateParameters('create-volume', parameters);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid service level. Must be one of: Standard, Premium, Ultra');
    });
  });

  describe('createAdaptiveCards', () => {
    it('should create adaptive card for accounts list', () => {
      const accounts = [
        {
          name: 'account1',
          location: 'eastus',
          tags: { environment: 'prod' },
          properties: { provisioningState: 'Succeeded' },
        },
        {
          name: 'account2',
          location: 'westus',
          tags: { environment: 'dev' },
          properties: { provisioningState: 'Succeeded' },
        },
      ];

      const card = commandProcessor.createAccountsCard(accounts);
      
      expect(card.type).toBe('AdaptiveCard');
      expect(card.version).toBe('1.4');
      expect(card.body).toContainEqual(
        expect.objectContaining({
          type: 'TextBlock',
          text: 'NetApp Accounts (2)',
          weight: 'Bolder',
        })
      );
      
      // Should have a container for each account
      const containers = card.body.filter((item: any) => item.type === 'Container');
      expect(containers).toHaveLength(2);
    });

    it('should create adaptive card for volumes list', () => {
      const volumes = [
        {
          name: 'volume1',
          properties: {
            serviceLevel: 'Premium',
            usageThreshold: 107374182400,
            provisioningState: 'Succeeded',
            mountTargets: [{ ipAddress: '10.0.1.4' }],
          },
        },
      ];

      const card = commandProcessor.createVolumesCard(volumes);
      
      expect(card.type).toBe('AdaptiveCard');
      expect(card.body).toContainEqual(
        expect.objectContaining({
          type: 'TextBlock',
          text: 'Volumes (1)',
          weight: 'Bolder',
        })
      );

      // Should include mount target information
      const factSets = card.body.filter((item: any) => item.type === 'FactSet');
      expect(factSets.length).toBeGreaterThan(0);
    });

    it('should create adaptive card for snapshots list', () => {
      const snapshots = [
        {
          name: 'snapshot1',
          properties: {
            created: new Date('2024-01-01T12:00:00Z'),
            provisioningState: 'Succeeded',
          },
        },
        {
          name: 'snapshot2',
          properties: {
            created: new Date('2024-01-02T12:00:00Z'),
            provisioningState: 'Succeeded',
          },
        },
      ];

      const card = commandProcessor.createSnapshotsCard(snapshots);
      
      expect(card.type).toBe('AdaptiveCard');
      expect(card.body).toContainEqual(
        expect.objectContaining({
          type: 'TextBlock',
          text: 'Snapshots (2)',
          weight: 'Bolder',
        })
      );
    });
  });

  describe('formatters', () => {
    it('should format bytes to human readable', () => {
      expect(commandProcessor.formatBytes(1024)).toBe('1 KiB');
      expect(commandProcessor.formatBytes(1048576)).toBe('1 MiB');
      expect(commandProcessor.formatBytes(1073741824)).toBe('1 GiB');
      expect(commandProcessor.formatBytes(1099511627776)).toBe('1 TiB');
    });

    it('should format dates consistently', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const formatted = commandProcessor.formatDate(date);
      
      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
    });

    it('should format provisioning states with appropriate styling', () => {
      expect(commandProcessor.formatProvisioningState('Succeeded')).toContain('Good');
      expect(commandProcessor.formatProvisioningState('Failed')).toContain('Attention');
      expect(commandProcessor.formatProvisioningState('Creating')).toContain('Warning');
    });
  });

  describe('permission checking', () => {
    it('should allow read operations for Reader role', () => {
      const userProfile = { ...mockUserProfile, roles: ['Reader'] };
      
      expect(commandProcessor.checkPermissions('list-accounts', userProfile)).toBe(true);
      expect(commandProcessor.checkPermissions('list-volumes', userProfile)).toBe(true);
      expect(commandProcessor.checkPermissions('list-snapshots', userProfile)).toBe(true);
    });

    it('should deny write operations for Reader role', () => {
      const userProfile = { ...mockUserProfile, roles: ['Reader'] };
      
      expect(commandProcessor.checkPermissions('create-volume', userProfile)).toBe(false);
      expect(commandProcessor.checkPermissions('delete-snapshot', userProfile)).toBe(false);
      expect(commandProcessor.checkPermissions('create-account', userProfile)).toBe(false);
    });

    it('should allow write operations for Contributor role', () => {
      const userProfile = { ...mockUserProfile, roles: ['Contributor'] };
      
      expect(commandProcessor.checkPermissions('create-volume', userProfile)).toBe(true);
      expect(commandProcessor.checkPermissions('create-snapshot', userProfile)).toBe(true);
      expect(commandProcessor.checkPermissions('update-volume', userProfile)).toBe(true);
    });

    it('should deny destructive operations for non-admin users', () => {
      const userProfile = { ...mockUserProfile, roles: ['Contributor'] };
      
      expect(commandProcessor.checkPermissions('delete-account', userProfile)).toBe(false);
      expect(commandProcessor.checkPermissions('delete-pool', userProfile)).toBe(false);
    });

    it('should allow all operations for Owner role', () => {
      const userProfile = { ...mockUserProfile, roles: ['Owner'] };
      
      expect(commandProcessor.checkPermissions('delete-account', userProfile)).toBe(true);
      expect(commandProcessor.checkPermissions('delete-pool', userProfile)).toBe(true);
      expect(commandProcessor.checkPermissions('create-volume', userProfile)).toBe(true);
    });
  });
});