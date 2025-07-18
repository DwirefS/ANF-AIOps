/**
 * Command Processor for Teams Bot
 * 
 * This service processes natural language commands and structured commands
 * for Azure NetApp Files operations with comprehensive security and validation.
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * 
 * Features:
 * - Natural language processing and intent recognition
 * - Structured command parsing and validation
 * - Role-based access control enforcement
 * - Comprehensive audit logging
 * - Error handling and user guidance
 * - Multi-step workflow management
 */

import { TurnContext } from 'botbuilder';
import { MCPService } from '../services/mcp.service';
import { AuthService, UserProfile } from '../services/auth.service';
import { LoggingService } from '../services/logging.service';
import { AdaptiveCardService } from './adaptive-card.service';

interface CommandResult {
  success: boolean;
  message?: string;
  adaptiveCard?: any;
  followUpActions?: string[];
  error?: string;
}

interface ParsedCommand {
  action: string;
  entity?: string;
  parameters?: Record<string, any>;
  confidence: number;
  originalText: string;
}

export class CommandProcessor {
  private logger = LoggingService.getInstance();
  private adaptiveCardService = new AdaptiveCardService();

  constructor(
    private mcpService: MCPService,
    private authService: AuthService
  ) {}

  /**
   * Process structured command (starts with /anf)
   */
  async processCommand(command: string, user: UserProfile): Promise<CommandResult> {
    try {
      this.logger.info('Processing structured command', {
        command,
        userId: user.id,
        userRoles: user.roles
      });

      const parsedCommand = this.parseStructuredCommand(command);
      
      if (!parsedCommand) {
        return {
          success: false,
          error: 'Invalid command format. Type `/anf help` for available commands.'
        };
      }

      // Check authorization for the command
      const isAuthorized = await this.checkCommandAuthorization(parsedCommand, user);
      if (!isAuthorized) {
        return {
          success: false,
          error: 'You are not authorized to perform this action. Contact your administrator if you need additional permissions.'
        };
      }

      // Execute the command
      return await this.executeCommand(parsedCommand, user);

    } catch (error) {
      this.logger.error('Failed to process command', {
        command,
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'An error occurred while processing your command. Please try again.'
      };
    }
  }

  /**
   * Process card action (button clicks, form submissions)
   */
  async processCardAction(action: any, user: UserProfile, context: TurnContext): Promise<void> {
    try {
      this.logger.info('Processing card action', {
        action: action.action,
        userId: user.id,
        data: action
      });

      switch (action.action) {
        case 'show_help':
          await context.sendActivity({
            attachments: [this.adaptiveCardService.createHelpCard(user.roles)]
          });
          break;

        case 'show_dashboard':
          await this.showDashboard(context, user);
          break;

        case 'create_volume':
          await context.sendActivity({
            attachments: [this.adaptiveCardService.createVolumeCreationCard()]
          });
          break;

        case 'submit_create_volume':
          await this.handleVolumeCreation(action, context, user);
          break;

        case 'view_metrics':
          await this.showVolumeMetrics(action.volumeId, context, user);
          break;

        case 'refresh_volumes':
          await this.refreshVolumeList(context, user);
          break;

        case 'estimate_cost':
          await this.estimateVolumeCost(action, context, user);
          break;

        default:
          await context.sendActivity('Unknown action. Please try again or use `/anf help` for assistance.');
      }

    } catch (error) {
      this.logger.error('Failed to process card action', {
        action: action.action,
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      await context.sendActivity({
        attachments: [this.adaptiveCardService.createErrorCard(
          'Failed to process your request',
          ['Try refreshing the page', 'Check your permissions', 'Contact support if the issue persists']
        )]
      });
    }
  }

  /**
   * Parse structured command format: /anf <action> [entity] [parameters]
   */
  private parseStructuredCommand(command: string): ParsedCommand | null {
    const commandRegex = /^\/anf\s+(\w+)(?:\s+(\w+))?(?:\s+(.+))?$/i;
    const match = command.match(commandRegex);

    if (!match) {
      return null;
    }

    const [, action, entity, parametersStr] = match;
    const parameters: Record<string, any> = {};

    // Parse parameters from the command string
    if (parametersStr) {
      const paramPairs = parametersStr.split(/\s+/);
      for (let i = 0; i < paramPairs.length; i += 2) {
        if (i + 1 < paramPairs.length) {
          parameters[paramPairs[i]] = paramPairs[i + 1];
        }
      }
    }

    return {
      action: action.toLowerCase(),
      entity: entity?.toLowerCase(),
      parameters,
      confidence: 1.0,
      originalText: command
    };
  }

  /**
   * Check if user is authorized to execute the command
   */
  private async checkCommandAuthorization(command: ParsedCommand, user: UserProfile): Promise<boolean> {
    const actionPermissionMap: Record<string, string> = {
      'list': 'anf:read',
      'get': 'anf:read',
      'show': 'anf:read',
      'view': 'anf:read',
      'help': 'anf:read',
      'status': 'anf:read',
      'metrics': 'anf:read',
      'create': 'anf:create',
      'add': 'anf:create',
      'delete': 'anf:delete',
      'remove': 'anf:delete',
      'update': 'anf:update',
      'modify': 'anf:update',
      'resize': 'anf:update',
      'security': 'anf:security:read',
      'compliance': 'anf:security:read',
      'audit': 'anf:security:read'
    };

    const requiredPermission = actionPermissionMap[command.action];
    if (!requiredPermission) {
      this.logger.warn('Unknown command action', {
        action: command.action,
        userId: user.id
      });
      return false;
    }

    return await this.authService.isAuthorized(user, command.action, command.entity);
  }

  /**
   * Execute the parsed command
   */
  private async executeCommand(command: ParsedCommand, user: UserProfile): Promise<CommandResult> {
    this.logger.info('Executing command', {
      action: command.action,
      entity: command.entity,
      userId: user.id
    });

    switch (command.action) {
      case 'help':
        return {
          success: true,
          adaptiveCard: this.adaptiveCardService.createHelpCard(user.roles)
        };

      case 'list':
        return await this.handleListCommand(command, user);

      case 'create':
        return await this.handleCreateCommand(command, user);

      case 'delete':
        return await this.handleDeleteCommand(command, user);

      case 'metrics':
      case 'show':
        return await this.handleMetricsCommand(command, user);

      case 'resize':
        return await this.handleResizeCommand(command, user);

      case 'security':
        return await this.handleSecurityCommand(command, user);

      case 'status':
        return await this.handleStatusCommand(command, user);

      default:
        return {
          success: false,
          error: `Unknown command: ${command.action}. Type \`/anf help\` for available commands.`
        };
    }
  }

  /**
   * Handle list commands (volumes, pools, snapshots)
   */
  private async handleListCommand(command: ParsedCommand, user: UserProfile): Promise<CommandResult> {
    try {
      switch (command.entity) {
        case 'volumes':
          const volumes = await this.mcpService.listVolumes();
          return {
            success: true,
            adaptiveCard: this.adaptiveCardService.createVolumeListCard(volumes)
          };

        case 'pools':
          const pools = await this.mcpService.listPools();
          return {
            success: true,
            message: `Found ${pools.length} capacity pools`,
            followUpActions: ['View detailed metrics', 'Create new pool']
          };

        case 'snapshots':
          const snapshots = await this.mcpService.listSnapshots();
          return {
            success: true,
            message: `Found ${snapshots.length} snapshots`,
            followUpActions: ['Create new snapshot', 'Restore from snapshot']
          };

        default:
          return {
            success: false,
            error: 'Please specify what to list: volumes, pools, or snapshots'
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to list ${command.entity}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Handle create commands
   */
  private async handleCreateCommand(command: ParsedCommand, user: UserProfile): Promise<CommandResult> {
    switch (command.entity) {
      case 'volume':
        return {
          success: true,
          adaptiveCard: this.adaptiveCardService.createVolumeCreationCard(),
          message: 'Please fill out the volume creation form'
        };

      case 'snapshot':
        if (!command.parameters?.volume) {
          return {
            success: false,
            error: 'Please specify the volume name: `/anf create snapshot volume <volume-name>`'
          };
        }
        // Implementation would call MCP service
        return {
          success: true,
          message: `Creating snapshot for volume ${command.parameters.volume}...`,
          followUpActions: ['View snapshot status', 'List all snapshots']
        };

      default:
        return {
          success: false,
          error: 'Please specify what to create: volume, pool, or snapshot'
        };
    }
  }

  /**
   * Handle delete commands with safety checks
   */
  private async handleDeleteCommand(command: ParsedCommand, user: UserProfile): Promise<CommandResult> {
    if (!command.entity || !command.parameters?.name) {
      return {
        success: false,
        error: 'Please specify what to delete and the name: `/anf delete volume <volume-name>`'
      };
    }

    // Safety confirmation required for delete operations
    return {
      success: true,
      message: `⚠️ **Warning**: You are about to delete ${command.entity} "${command.parameters.name}". This action cannot be undone.\n\nPlease type \`/anf confirm delete ${command.entity} ${command.parameters.name}\` to proceed.`,
      followUpActions: ['Cancel operation', 'Get help with deletion']
    };
  }

  /**
   * Handle metrics and performance commands
   */
  private async handleMetricsCommand(command: ParsedCommand, user: UserProfile): Promise<CommandResult> {
    try {
      const volumeId = command.parameters?.volume || command.parameters?.name;
      
      if (!volumeId) {
        return {
          success: false,
          error: 'Please specify the volume name: `/anf metrics <volume-name>`'
        };
      }

      const metrics = await this.mcpService.getVolumeMetrics(volumeId);
      return {
        success: true,
        adaptiveCard: this.adaptiveCardService.createMetricsCard(metrics)
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Handle resize commands
   */
  private async handleResizeCommand(command: ParsedCommand, user: UserProfile): Promise<CommandResult> {
    const volumeName = command.parameters?.volume || command.parameters?.name;
    const newSize = command.parameters?.size;

    if (!volumeName || !newSize) {
      return {
        success: false,
        error: 'Please specify volume name and new size: `/anf resize volume <name> size <size-gb>`'
      };
    }

    try {
      const result = await this.mcpService.resizeVolume(volumeName, parseInt(newSize));
      return {
        success: true,
        message: `✅ Successfully resized volume "${volumeName}" to ${newSize}GB`,
        followUpActions: ['View updated metrics', 'Check resize status']
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to resize volume: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Handle security commands
   */
  private async handleSecurityCommand(command: ParsedCommand, user: UserProfile): Promise<CommandResult> {
    try {
      const scanResult = await this.mcpService.scanVulnerabilities();
      return {
        success: true,
        message: `🔒 Security scan completed:\n• ${scanResult.issuesFound || 0} issues found\n• Security score: ${scanResult.securityScore || 'N/A'}\n• Last scan: ${new Date().toLocaleString()}`,
        followUpActions: ['View detailed report', 'Schedule regular scans', 'Fix identified issues']
      };
    } catch (error) {
      return {
        success: false,
        error: `Security scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Handle status commands
   */
  private async handleStatusCommand(command: ParsedCommand, user: UserProfile): Promise<CommandResult> {
    try {
      const volumes = await this.mcpService.listVolumes();
      const pools = await this.mcpService.listPools();
      
      const status = {
        volumes: volumes.length,
        pools: pools.length,
        user: user.name,
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        adaptiveCard: this.adaptiveCardService.createStatusCard(status)
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Show comprehensive dashboard
   */
  private async showDashboard(context: TurnContext, user: UserProfile): Promise<void> {
    try {
      const volumes = await this.mcpService.listVolumes();
      const pools = await this.mcpService.listPools();
      
      const status = {
        volumes: volumes.length,
        pools: pools.length,
        user: user.name,
        timestamp: new Date().toISOString()
      };

      await context.sendActivity({
        attachments: [this.adaptiveCardService.createStatusCard(status)]
      });
    } catch (error) {
      await context.sendActivity({
        attachments: [this.adaptiveCardService.createErrorCard(
          'Failed to load dashboard',
          ['Check your network connection', 'Verify your permissions', 'Try again in a few moments']
        )]
      });
    }
  }

  /**
   * Handle volume creation from form submission
   */
  private async handleVolumeCreation(formData: any, context: TurnContext, user: UserProfile): Promise<void> {
    try {
      this.logger.info('Creating volume from form', {
        volumeName: formData.volumeName,
        userId: user.id
      });

      const volumeOptions = {
        name: formData.volumeName,
        size: parseInt(formData.sizeGB),
        serviceLevel: formData.serviceLevel,
        protocol: Array.isArray(formData.protocol) ? formData.protocol.join(',') : formData.protocol,
        subnetId: '/subscriptions/.../subnets/default', // This would come from configuration
        poolId: '/subscriptions/.../pools/default' // This would come from configuration
      };

      const result = await this.mcpService.createVolume(volumeOptions);
      
      await context.sendActivity(`✅ **Volume created successfully!**\n\n• **Name**: ${result.name}\n• **Size**: ${formData.sizeGB}GB\n• **Service Level**: ${formData.serviceLevel}\n• **Mount Path**: ${result.mountPath || 'Pending'}\n\nThe volume is being provisioned and will be available shortly.`);

    } catch (error) {
      this.logger.error('Volume creation failed', {
        formData,
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      await context.sendActivity({
        attachments: [this.adaptiveCardService.createErrorCard(
          'Failed to create volume',
          ['Check the volume name is unique', 'Verify you have sufficient quota', 'Ensure the subnet is properly configured']
        )]
      });
    }
  }

  /**
   * Show volume metrics
   */
  private async showVolumeMetrics(volumeId: string, context: TurnContext, user: UserProfile): Promise<void> {
    try {
      const metrics = await this.mcpService.getVolumeMetrics(volumeId);
      await context.sendActivity({
        attachments: [this.adaptiveCardService.createMetricsCard(metrics)]
      });
    } catch (error) {
      await context.sendActivity({
        attachments: [this.adaptiveCardService.createErrorCard(
          'Failed to load metrics',
          ['Check if the volume exists', 'Verify your permissions', 'Try again in a few moments']
        )]
      });
    }
  }

  /**
   * Refresh volume list
   */
  private async refreshVolumeList(context: TurnContext, user: UserProfile): Promise<void> {
    try {
      const volumes = await this.mcpService.listVolumes();
      await context.sendActivity({
        attachments: [this.adaptiveCardService.createVolumeListCard(volumes)]
      });
    } catch (error) {
      await context.sendActivity({
        attachments: [this.adaptiveCardService.createErrorCard(
          'Failed to refresh volume list',
          ['Check your network connection', 'Verify your permissions', 'Try again in a few moments']
        )]
      });
    }
  }

  /**
   * Estimate volume cost
   */
  private async estimateVolumeCost(formData: any, context: TurnContext, user: UserProfile): Promise<void> {
    try {
      const sizeGB = parseInt(formData.sizeGB || '1000');
      const serviceLevel = formData.serviceLevel || 'Standard';
      
      // Cost calculation based on Azure NetApp Files pricing
      const costPerGBPerMonth = {
        'Standard': 0.000202 * 24 * 30, // $0.000202/GB/hour
        'Premium': 0.000403 * 24 * 30,  // $0.000403/GB/hour
        'Ultra': 0.000538 * 24 * 30     // $0.000538/GB/hour
      };

      const monthlyCost = sizeGB * (costPerGBPerMonth[serviceLevel as keyof typeof costPerGBPerMonth] || costPerGBPerMonth.Standard);
      const annualCost = monthlyCost * 12;

      await context.sendActivity(`💰 **Cost Estimate**\n\n• **Volume Size**: ${sizeGB}GB\n• **Service Level**: ${serviceLevel}\n• **Monthly Cost**: $${monthlyCost.toFixed(2)}\n• **Annual Cost**: $${annualCost.toFixed(2)}\n\n*Note: Costs may vary based on actual usage and regional pricing. This is an estimate only.*`);

    } catch (error) {
      await context.sendActivity('Failed to calculate cost estimate. Please check your input values.');
    }
  }
}