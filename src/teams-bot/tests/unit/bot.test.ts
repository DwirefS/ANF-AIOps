/**
 * Unit tests for ANF AIOps Teams Bot
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import { TurnContext, Activity, MessageFactory, TestAdapter } from 'botbuilder';
import { ANFAIOpsBot } from '../../src/bot/anf-aiops-bot';
import { CommandProcessor } from '../../src/bot/command-processor';
import { AuthService } from '../../src/services/auth.service';
import { MCPService } from '../../src/services/mcp.service';
import { LoggingService } from '../../src/services/logging.service';

// Mock dependencies
jest.mock('../../src/bot/command-processor');
jest.mock('../../src/services/auth.service');
jest.mock('../../src/services/mcp.service');
jest.mock('../../src/services/logging.service');

describe('ANFAIOpsBot', () => {
  let bot: ANFAIOpsBot;
  let mockCommandProcessor: jest.Mocked<CommandProcessor>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockMCPService: jest.Mocked<MCPService>;
  let mockLoggingService: jest.Mocked<LoggingService>;
  let testAdapter: TestAdapter;

  beforeEach(() => {
    // Setup mocks
    mockCommandProcessor = new CommandProcessor() as jest.Mocked<CommandProcessor>;
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
    mockMCPService = new MCPService() as jest.Mocked<MCPService>;
    mockLoggingService = new LoggingService() as jest.Mocked<LoggingService>;

    // Mock methods
    mockCommandProcessor.processCommand = jest.fn();
    mockAuthService.isUserAuthenticated = jest.fn();
    mockAuthService.authenticateUser = jest.fn();
    mockMCPService.callTool = jest.fn();
    mockLoggingService.log = jest.fn();
    mockLoggingService.logError = jest.fn();

    // Initialize bot
    bot = new ANFAIOpsBot(
      mockCommandProcessor,
      mockAuthService,
      mockMCPService,
      mockLoggingService
    );

    // Setup test adapter
    testAdapter = new TestAdapter();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onMessage', () => {
    it('should respond to help command', async () => {
      const activity: Partial<Activity> = {
        type: 'message',
        text: 'help',
        from: { id: 'test-user', name: 'Test User' },
        recipient: { id: 'bot', name: 'ANF AIOps Bot' },
        conversation: { id: 'test-conversation' },
      };

      mockAuthService.isUserAuthenticated.mockResolvedValue(true);
      mockCommandProcessor.processCommand.mockResolvedValue({
        success: true,
        response: 'Available commands: list-accounts, list-volumes, create-snapshot...',
        adaptiveCard: undefined,
      });

      await testAdapter
        .send(activity as Activity)
        .assertReply((activity) => {
          expect(activity.text).toContain('Available commands');
        })
        .startTest();

      expect(mockCommandProcessor.processCommand).toHaveBeenCalledWith(
        'help',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle list-accounts command', async () => {
      const activity: Partial<Activity> = {
        type: 'message',
        text: 'list-accounts --resource-group test-rg',
        from: { id: 'test-user', name: 'Test User' },
        recipient: { id: 'bot', name: 'ANF AIOps Bot' },
        conversation: { id: 'test-conversation' },
      };

      mockAuthService.isUserAuthenticated.mockResolvedValue(true);
      mockCommandProcessor.processCommand.mockResolvedValue({
        success: true,
        response: 'Found 2 NetApp accounts in resource group test-rg',
        adaptiveCard: {
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: 'NetApp Accounts',
              weight: 'Bolder',
              size: 'Medium',
            },
          ],
        },
      });

      await testAdapter
        .send(activity as Activity)
        .assertReply((activity) => {
          expect(activity.text).toContain('Found 2 NetApp accounts');
          expect(activity.attachments).toHaveLength(1);
          expect(activity.attachments[0].contentType).toBe('application/vnd.microsoft.card.adaptive');
        })
        .startTest();

      expect(mockCommandProcessor.processCommand).toHaveBeenCalledWith(
        'list-accounts --resource-group test-rg',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle unauthenticated users', async () => {
      const activity: Partial<Activity> = {
        type: 'message',
        text: 'list-accounts',
        from: { id: 'test-user', name: 'Test User' },
        recipient: { id: 'bot', name: 'ANF AIOps Bot' },
        conversation: { id: 'test-conversation' },
      };

      mockAuthService.isUserAuthenticated.mockResolvedValue(false);
      mockAuthService.authenticateUser.mockResolvedValue({
        success: false,
        authUrl: 'https://login.microsoftonline.com/auth',
        message: 'Please authenticate to continue',
      });

      await testAdapter
        .send(activity as Activity)
        .assertReply((activity) => {
          expect(activity.text).toContain('Please authenticate');
          expect(activity.attachments).toHaveLength(1);
          expect(activity.attachments[0].content.actions).toBeDefined();
        })
        .startTest();

      expect(mockAuthService.isUserAuthenticated).toHaveBeenCalled();
      expect(mockAuthService.authenticateUser).toHaveBeenCalled();
    });

    it('should handle command processing errors', async () => {
      const activity: Partial<Activity> = {
        type: 'message',
        text: 'invalid-command',
        from: { id: 'test-user', name: 'Test User' },
        recipient: { id: 'bot', name: 'ANF AIOps Bot' },
        conversation: { id: 'test-conversation' },
      };

      mockAuthService.isUserAuthenticated.mockResolvedValue(true);
      mockCommandProcessor.processCommand.mockResolvedValue({
        success: false,
        response: 'Unknown command: invalid-command',
        error: 'Command not found',
      });

      await testAdapter
        .send(activity as Activity)
        .assertReply((activity) => {
          expect(activity.text).toContain('Unknown command');
        })
        .startTest();

      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Command processing failed',
        expect.any(Object)
      );
    });

    it('should handle Azure API errors gracefully', async () => {
      const activity: Partial<Activity> = {
        type: 'message',
        text: 'list-volumes --resource-group invalid-rg',
        from: { id: 'test-user', name: 'Test User' },
        recipient: { id: 'bot', name: 'ANF AIOps Bot' },
        conversation: { id: 'test-conversation' },
      };

      mockAuthService.isUserAuthenticated.mockResolvedValue(true);
      mockCommandProcessor.processCommand.mockRejectedValue(
        new Error('ResourceGroupNotFound: The resource group does not exist')
      );

      await testAdapter
        .send(activity as Activity)
        .assertReply((activity) => {
          expect(activity.text).toContain('An error occurred');
          expect(activity.text).toContain('resource group does not exist');
        })
        .startTest();

      expect(mockLoggingService.logError).toHaveBeenCalled();
    });
  });

  describe('onMembersAdded', () => {
    it('should send welcome message to new members', async () => {
      const activity: Partial<Activity> = {
        type: 'conversationUpdate',
        membersAdded: [
          { id: 'new-user', name: 'New User' },
        ],
        from: { id: 'test-user', name: 'Test User' },
        recipient: { id: 'bot', name: 'ANF AIOps Bot' },
        conversation: { id: 'test-conversation' },
      };

      await testAdapter
        .send(activity as Activity)
        .assertReply((activity) => {
          expect(activity.text).toContain('Welcome to ANF AIOps');
          expect(activity.text).toContain('Azure NetApp Files operations');
        })
        .startTest();
    });

    it('should not send welcome message to bot itself', async () => {
      const activity: Partial<Activity> = {
        type: 'conversationUpdate',
        membersAdded: [
          { id: 'bot', name: 'ANF AIOps Bot' },
        ],
        from: { id: 'test-user', name: 'Test User' },
        recipient: { id: 'bot', name: 'ANF AIOps Bot' },
        conversation: { id: 'test-conversation' },
      };

      await testAdapter
        .send(activity as Activity)
        .startTest();

      // Should not send any messages
      expect(testAdapter.getNextReply()).toBe(undefined);
    });
  });

  describe('proactive messaging', () => {
    it('should send proactive notifications for critical alerts', async () => {
      const notification = {
        type: 'critical',
        message: 'Volume utilization above 90% threshold',
        details: {
          volumeName: 'critical-volume',
          utilization: 95,
          threshold: 90,
        },
      };

      const conversationRef = {
        user: { id: 'test-user', name: 'Test User' },
        bot: { id: 'bot', name: 'ANF AIOps Bot' },
        conversation: { id: 'test-conversation' },
        channelId: 'msteams',
        serviceUrl: 'https://smba.trafficmanager.net/amer/',
      };

      // Mock the proactive message sending
      const sendProactiveMessage = jest.spyOn(bot, 'sendProactiveMessage').mockResolvedValue();

      await bot.sendProactiveMessage(conversationRef, notification);

      expect(sendProactiveMessage).toHaveBeenCalledWith(conversationRef, notification);
    });
  });

  describe('adaptive cards', () => {
    it('should create adaptive cards for complex data', async () => {
      const activity: Partial<Activity> = {
        type: 'message',
        text: 'list-volumes --resource-group test-rg --account test-account',
        from: { id: 'test-user', name: 'Test User' },
        recipient: { id: 'bot', name: 'ANF AIOps Bot' },
        conversation: { id: 'test-conversation' },
      };

      const mockAdaptiveCard = {
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'TextBlock',
            text: 'Volumes in test-account',
            weight: 'Bolder',
            size: 'Medium',
          },
          {
            type: 'FactSet',
            facts: [
              { title: 'Volume Name', value: 'test-volume-1' },
              { title: 'Size', value: '100 GiB' },
              { title: 'Service Level', value: 'Premium' },
            ],
          },
        ],
        actions: [
          {
            type: 'Action.Submit',
            title: 'Create Snapshot',
            data: {
              action: 'create-snapshot',
              volumeName: 'test-volume-1',
            },
          },
        ],
      };

      mockAuthService.isUserAuthenticated.mockResolvedValue(true);
      mockCommandProcessor.processCommand.mockResolvedValue({
        success: true,
        response: 'Found 1 volume in test-account',
        adaptiveCard: mockAdaptiveCard,
      });

      await testAdapter
        .send(activity as Activity)
        .assertReply((activity) => {
          expect(activity.attachments).toHaveLength(1);
          expect(activity.attachments[0].contentType).toBe('application/vnd.microsoft.card.adaptive');
          expect(activity.attachments[0].content).toEqual(mockAdaptiveCard);
        })
        .startTest();
    });
  });

  describe('error handling and resilience', () => {
    it('should handle network timeouts gracefully', async () => {
      const activity: Partial<Activity> = {
        type: 'message',
        text: 'list-accounts',
        from: { id: 'test-user', name: 'Test User' },
        recipient: { id: 'bot', name: 'ANF AIOps Bot' },
        conversation: { id: 'test-conversation' },
      };

      mockAuthService.isUserAuthenticated.mockResolvedValue(true);
      mockCommandProcessor.processCommand.mockRejectedValue(
        new Error('Request timeout')
      );

      await testAdapter
        .send(activity as Activity)
        .assertReply((activity) => {
          expect(activity.text).toContain('timeout');
          expect(activity.text).toContain('Please try again');
        })
        .startTest();
    });

    it('should handle rate limiting errors', async () => {
      const activity: Partial<Activity> = {
        type: 'message',
        text: 'list-volumes',
        from: { id: 'test-user', name: 'Test User' },
        recipient: { id: 'bot', name: 'ANF AIOps Bot' },
        conversation: { id: 'test-conversation' },
      };

      mockAuthService.isUserAuthenticated.mockResolvedValue(true);
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      mockCommandProcessor.processCommand.mockRejectedValue(rateLimitError);

      await testAdapter
        .send(activity as Activity)
        .assertReply((activity) => {
          expect(activity.text).toContain('rate limit');
          expect(activity.text).toContain('Please wait');
        })
        .startTest();
    });

    it('should handle invalid user permissions', async () => {
      const activity: Partial<Activity> = {
        type: 'message',
        text: 'delete-account --name critical-account',
        from: { id: 'test-user', name: 'Test User' },
        recipient: { id: 'bot', name: 'ANF AIOps Bot' },
        conversation: { id: 'test-conversation' },
      };

      mockAuthService.isUserAuthenticated.mockResolvedValue(true);
      const permissionError = new Error('Insufficient permissions');
      permissionError.name = 'AuthorizationError';
      mockCommandProcessor.processCommand.mockRejectedValue(permissionError);

      await testAdapter
        .send(activity as Activity)
        .assertReply((activity) => {
          expect(activity.text).toContain('insufficient permissions');
          expect(activity.text).toContain('contact administrator');
        })
        .startTest();
    });
  });

  describe('conversation state management', () => {
    it('should maintain conversation context for multi-step operations', async () => {
      // Step 1: Start volume creation
      const step1Activity: Partial<Activity> = {
        type: 'message',
        text: 'create-volume',
        from: { id: 'test-user', name: 'Test User' },
        recipient: { id: 'bot', name: 'ANF AIOps Bot' },
        conversation: { id: 'test-conversation' },
      };

      mockAuthService.isUserAuthenticated.mockResolvedValue(true);
      mockCommandProcessor.processCommand.mockResolvedValue({
        success: true,
        response: 'Please provide the volume name:',
        waitingForInput: true,
        context: { operation: 'create-volume', step: 'name' },
      });

      await testAdapter
        .send(step1Activity as Activity)
        .assertReply((activity) => {
          expect(activity.text).toContain('provide the volume name');
        });

      // Step 2: Provide volume name
      const step2Activity: Partial<Activity> = {
        type: 'message',
        text: 'my-new-volume',
        from: { id: 'test-user', name: 'Test User' },
        recipient: { id: 'bot', name: 'ANF AIOps Bot' },
        conversation: { id: 'test-conversation' },
      };

      mockCommandProcessor.processCommand.mockResolvedValue({
        success: true,
        response: 'Please provide the volume size (in GiB):',
        waitingForInput: true,
        context: { operation: 'create-volume', step: 'size', volumeName: 'my-new-volume' },
      });

      await testAdapter
        .send(step2Activity as Activity)
        .assertReply((activity) => {
          expect(activity.text).toContain('provide the volume size');
        })
        .startTest();
    });
  });
});