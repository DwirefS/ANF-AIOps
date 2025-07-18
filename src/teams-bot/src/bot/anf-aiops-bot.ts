/**
 * ANF AI-Ops Teams Bot
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import {
    ActivityHandler,
    ConversationState,
    UserState,
    TurnContext,
    MessageFactory,
    CardFactory,
    TeamsActivityHandler,
    TeamsInfo,
    ChannelInfo
} from 'botbuilder';
import { MCPService } from '../services/mcp.service';
import { AuthService, UserProfile } from '../services/auth.service';
import { LoggingService } from '../services/logging.service';
import { AdaptiveCardService } from './adaptive-card.service';
import { CommandProcessor } from './command-processor';

export class ANFAIOpsBot extends TeamsActivityHandler {
    private logger = LoggingService.getInstance();
    private adaptiveCardService: AdaptiveCardService;
    private commandProcessor: CommandProcessor;

    constructor(
        private conversationState: ConversationState,
        private userState: UserState,
        private mcpService: MCPService,
        private authService: AuthService
    ) {
        super();

        this.adaptiveCardService = new AdaptiveCardService();
        this.commandProcessor = new CommandProcessor(mcpService, authService);

        this.onMessage(async (context, next) => {
            await this.handleMessage(context);
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            await this.handleMembersAdded(context);
            await next();
        });

        this.onTeamsCardAction(async (context, next) => {
            await this.handleCardAction(context);
            await next();
        });
    }

    private async handleMessage(context: TurnContext): Promise<void> {
        try {
            // Authenticate user
            const authResult = await this.authService.authenticateUser(context);
            if (!authResult.success || !authResult.user) {
                await context.sendActivity(MessageFactory.text('❌ Authentication failed. Please try again.'));
                return;
            }

            const user = authResult.user;
            const messageText = context.activity.text?.trim() || '';

            this.logger.info('Processing message', {
                userId: user.id,
                userName: user.name,
                messageText: messageText
            });

            // Handle different message types
            if (messageText.startsWith('/')) {
                await this.handleCommand(context, user, messageText);
            } else if (messageText.toLowerCase().includes('help')) {
                await this.showHelp(context, user);
            } else if (messageText.toLowerCase().includes('status')) {
                await this.showStatus(context, user);
            } else {
                await this.handleNaturalLanguage(context, user, messageText);
            }

        } catch (error) {
            this.logger.error('Error handling message', { error });
            await context.sendActivity(MessageFactory.text('❌ An error occurred while processing your request.'));
        }
    }

    private async handleCommand(context: TurnContext, user: UserProfile, command: string): Promise<void> {
        try {
            const result = await this.commandProcessor.processCommand(command, user);
            
            if (result.adaptiveCard) {
                await context.sendActivity(MessageFactory.attachment(result.adaptiveCard));
            } else if (result.message) {
                await context.sendActivity(MessageFactory.text(result.message));
            }

        } catch (error) {
            this.logger.error('Error handling command', { error, command });
            await context.sendActivity(MessageFactory.text('❌ Command execution failed. Please try again.'));
        }
    }

    private async handleNaturalLanguage(context: TurnContext, user: UserProfile, message: string): Promise<void> {
        try {
            // Parse natural language intent
            const intent = this.parseIntent(message);
            
            switch (intent.action) {
                case 'list_volumes':
                    await this.listVolumes(context, user);
                    break;

                case 'create_volume':
                    await this.createVolumeFlow(context, user, intent.parameters);
                    break;

                case 'show_metrics':
                    await this.showMetrics(context, user, intent.parameters);
                    break;

                case 'get_help':
                    await this.showHelp(context, user);
                    break;

                default:
                    await context.sendActivity(MessageFactory.text(
                        `I understand you're asking about: "${message}"\n\n` +
                        'I can help you with:\n' +
                        '• Volume management (list, create, resize, delete)\n' +
                        '• Pool management (list, create, modify)\n' +
                        '• Snapshot operations (create, list, restore)\n' +
                        '• Monitoring and alerts\n' +
                        '• Security auditing\n\n' +
                        'Try typing `/help` for available commands.'
                    ));
                    break;
            }

        } catch (error) {
            this.logger.error('Error handling natural language', { error, message });
            await context.sendActivity(MessageFactory.text('❌ I had trouble understanding your request. Please try again or use `/help` for available commands.'));
        }
    }

    private async handleMembersAdded(context: TurnContext): Promise<void> {
        const membersAdded = context.activity.membersAdded;
        
        for (const member of membersAdded || []) {
            if (member.id !== context.activity.recipient.id) {
                const welcomeCard = this.adaptiveCardService.createWelcomeCard();
                await context.sendActivity(MessageFactory.attachment(welcomeCard));
            }
        }
    }

    private async handleCardAction(context: TurnContext): Promise<void> {
        try {
            const action = context.activity.value;
            const user = await this.authService.authenticateUser(context);
            
            if (!user.success || !user.user) {
                await context.sendActivity(MessageFactory.text('❌ Authentication required for this action.'));
                return;
            }

            await this.commandProcessor.processCardAction(action, user.user, context);

        } catch (error) {
            this.logger.error('Error handling card action', { error });
            await context.sendActivity(MessageFactory.text('❌ Card action failed. Please try again.'));
        }
    }

    private async listVolumes(context: TurnContext, user: UserProfile): Promise<void> {
        try {
            // Check authorization
            const isAuthorized = await this.authService.isAuthorized(user, 'volume:list');
            if (!isAuthorized) {
                await context.sendActivity(MessageFactory.text('❌ You are not authorized to list volumes.'));
                return;
            }

            // Get volumes from MCP service
            const volumes = await this.mcpService.listVolumes();
            
            if (volumes.length === 0) {
                await context.sendActivity(MessageFactory.text('📁 No volumes found.'));
                return;
            }

            const volumeCard = this.adaptiveCardService.createVolumeListCard(volumes);
            await context.sendActivity(MessageFactory.attachment(volumeCard));

        } catch (error) {
            this.logger.error('Error listing volumes', { error });
            await context.sendActivity(MessageFactory.text('❌ Failed to retrieve volumes. Please try again.'));
        }
    }

    private async createVolumeFlow(context: TurnContext, user: UserProfile, parameters: any): Promise<void> {
        try {
            // Check authorization
            const isAuthorized = await this.authService.isAuthorized(user, 'volume:create');
            if (!isAuthorized) {
                await context.sendActivity(MessageFactory.text('❌ You are not authorized to create volumes.'));
                return;
            }

            // Show volume creation form
            const creationCard = this.adaptiveCardService.createVolumeCreationCard();
            await context.sendActivity(MessageFactory.attachment(creationCard));

        } catch (error) {
            this.logger.error('Error in volume creation flow', { error });
            await context.sendActivity(MessageFactory.text('❌ Failed to start volume creation. Please try again.'));
        }
    }

    private async showMetrics(context: TurnContext, user: UserProfile, parameters: any): Promise<void> {
        try {
            // Check authorization
            const isAuthorized = await this.authService.isAuthorized(user, 'monitoring:read');
            if (!isAuthorized) {
                await context.sendActivity(MessageFactory.text('❌ You are not authorized to view metrics.'));
                return;
            }

            const volumeId = parameters?.volumeId;
            if (!volumeId) {
                await context.sendActivity(MessageFactory.text('Please specify a volume ID to view metrics.'));
                return;
            }

            // Get metrics from MCP service
            const metrics = await this.mcpService.getVolumeMetrics(volumeId);
            const metricsCard = this.adaptiveCardService.createMetricsCard(metrics);
            
            await context.sendActivity(MessageFactory.attachment(metricsCard));

        } catch (error) {
            this.logger.error('Error showing metrics', { error });
            await context.sendActivity(MessageFactory.text('❌ Failed to retrieve metrics. Please try again.'));
        }
    }

    private async showHelp(context: TurnContext, user: UserProfile): Promise<void> {
        const helpCard = this.adaptiveCardService.createHelpCard(user.roles);
        await context.sendActivity(MessageFactory.attachment(helpCard));
    }

    private async showStatus(context: TurnContext, user: UserProfile): Promise<void> {
        try {
            // Get system status
            const volumes = await this.mcpService.listVolumes();
            const pools = await this.mcpService.listPools();
            
            const statusCard = this.adaptiveCardService.createStatusCard({
                volumes: volumes.length,
                pools: pools.length,
                user: user.name,
                timestamp: new Date().toISOString()
            });

            await context.sendActivity(MessageFactory.attachment(statusCard));

        } catch (error) {
            this.logger.error('Error showing status', { error });
            await context.sendActivity(MessageFactory.text('❌ Failed to retrieve system status.'));
        }
    }

    private parseIntent(message: string): { action: string; parameters: any } {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('list') && lowerMessage.includes('volume')) {
            return { action: 'list_volumes', parameters: {} };
        }

        if (lowerMessage.includes('create') && lowerMessage.includes('volume')) {
            return { action: 'create_volume', parameters: {} };
        }

        if (lowerMessage.includes('metrics') || lowerMessage.includes('performance')) {
            return { action: 'show_metrics', parameters: {} };
        }

        if (lowerMessage.includes('help')) {
            return { action: 'get_help', parameters: {} };
        }

        return { action: 'unknown', parameters: {} };
    }

    public async run(context: TurnContext): Promise<void> {
        await super.run(context);
        
        // Save conversation state
        await this.conversationState.saveChanges(context);
        await this.userState.saveChanges(context);
    }
}