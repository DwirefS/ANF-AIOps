/**
 * ANF AI-Ops Teams Bot Entry Point
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import express from 'express';
import { BotFrameworkAdapter, ConversationState, MemoryStorage, UserState } from 'botbuilder';
import { ConfigurationService } from './services/configuration.service';
import { LoggingService } from './services/logging.service';
import { ANFAIOpsBot } from './bot/anf-aiops-bot';
import { MCPService } from './services/mcp.service';
import { AuthService } from './services/auth.service';

const logger = LoggingService.getInstance();

async function main(): Promise<void> {
    try {
        // Load configuration
        const config = await ConfigurationService.getInstance().initialize();
        
        // Create Express app
        const app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Create Bot Framework Adapter
        const adapter = new BotFrameworkAdapter({
            appId: config.microsoftAppId,
            appPassword: config.microsoftAppPassword,
        });

        // Error handler
        adapter.onTurnError = async (context, error) => {
            logger.error(`Bot error: ${error.message}`, { error, context: context.activity });
            
            // Send error message to user
            await context.sendActivity('Sorry, an error occurred. Please try again later.');
        };

        // Create conversation and user state
        const memoryStorage = new MemoryStorage();
        const conversationState = new ConversationState(memoryStorage);
        const userState = new UserState(memoryStorage);

        // Create services
        const mcpService = new MCPService(config.mcpServerUrl);
        const authService = new AuthService(config);

        // Create bot
        const bot = new ANFAIOpsBot(conversationState, userState, mcpService, authService);

        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                author: 'Dwiref Sharma'
            });
        });

        // Bot messages endpoint
        app.post('/api/messages', async (req, res) => {
            try {
                await adapter.process(req, res, async (context) => {
                    await bot.run(context);
                });
            } catch (error) {
                logger.error('Failed to process bot message', { error, body: req.body });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Start server
        const port = config.port || 3978;
        app.listen(port, () => {
            logger.info(`ANF AI-Ops Teams Bot server started on port ${port}`);
            logger.info(`Bot endpoint: http://localhost:${port}/api/messages`);
        });

    } catch (error) {
        logger.error('Failed to start bot', { error });
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
    process.exit(1);
});

// Start the bot
main().catch((error) => {
    logger.error('Failed to start application', { error });
    process.exit(1);
});