/**
 * Configuration Service for Teams Bot
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { LoggingService } from './logging.service';

export interface BotConfiguration {
    microsoftAppId: string;
    microsoftAppPassword: string;
    mcpServerUrl: string;
    port: number;
    environment: string;
    keyVaultUrl?: string | undefined;
    tenantId: string;
    clientId: string;
    clientSecret: string;
    openAiApiKey: string;
}

export class ConfigurationService {
    private static instance: ConfigurationService;
    private config: BotConfiguration | null = null;
    private logger = LoggingService.getInstance();

    private constructor() {}

    public static getInstance(): ConfigurationService {
        if (!ConfigurationService.instance) {
            ConfigurationService.instance = new ConfigurationService();
        }
        return ConfigurationService.instance;
    }

    public async initialize(): Promise<BotConfiguration> {
        if (this.config) {
            return this.config;
        }

        try {
            // Load from environment variables first
            const config: BotConfiguration = {
                microsoftAppId: process.env.MicrosoftAppId || '',
                microsoftAppPassword: process.env.MicrosoftAppPassword || '',
                mcpServerUrl: process.env.MCP_SERVER_URL || '',
                port: parseInt(process.env.PORT || '3978', 10),
                environment: process.env.NODE_ENV || 'development',
                keyVaultUrl: process.env.KEY_VAULT_URL || undefined,
                tenantId: process.env.AZURE_TENANT_ID || '',
                clientId: process.env.AZURE_CLIENT_ID || '',
                clientSecret: process.env.AZURE_CLIENT_SECRET || '',
                openAiApiKey: process.env.OPENAI_API_KEY || ''
            };

            // If Key Vault URL is provided, load secrets from Key Vault
            if (config.keyVaultUrl) {
                await this.loadFromKeyVault(config);
            }

            this.validateConfiguration(config);
            this.config = config;

            this.logger.info('Configuration loaded successfully', {
                environment: config.environment,
                port: config.port,
                mcpServerUrl: config.mcpServerUrl,
                keyVaultUrl: config.keyVaultUrl
            });

            return config;
        } catch (error) {
            this.logger.error('Failed to load configuration', { error });
            throw error;
        }
    }

    private async loadFromKeyVault(config: BotConfiguration): Promise<void> {
        try {
            const credential = new DefaultAzureCredential();
            const client = new SecretClient(config.keyVaultUrl!, credential);

            // Load secrets from Key Vault
            const secrets = await Promise.all([
                client.getSecret('teams-bot-app-id'),
                client.getSecret('teams-bot-app-password'),
                client.getSecret('azure-client-id'),
                client.getSecret('anf-service-principal-secret'),
                client.getSecret('openai-api-key')
            ]);

            config.microsoftAppId = secrets[0].value || config.microsoftAppId;
            config.microsoftAppPassword = secrets[1].value || config.microsoftAppPassword;
            config.clientId = secrets[2].value || config.clientId;
            config.clientSecret = secrets[3].value || config.clientSecret;
            config.openAiApiKey = secrets[4].value || config.openAiApiKey;

            this.logger.info('Secrets loaded from Key Vault');
        } catch (error) {
            this.logger.warn('Failed to load secrets from Key Vault, using environment variables', { error });
        }
    }

    private validateConfiguration(config: BotConfiguration): void {
        const requiredFields = [
            'microsoftAppId',
            'microsoftAppPassword',
            'mcpServerUrl',
            'tenantId'
        ];

        for (const field of requiredFields) {
            if (!config[field as keyof BotConfiguration]) {
                throw new Error(`Missing required configuration: ${field}`);
            }
        }

        // Validate URLs
        if (config.mcpServerUrl && !this.isValidUrl(config.mcpServerUrl)) {
            throw new Error('Invalid MCP server URL');
        }

        if (config.keyVaultUrl && !this.isValidUrl(config.keyVaultUrl)) {
            throw new Error('Invalid Key Vault URL');
        }

        // Validate port
        if (config.port < 1 || config.port > 65535) {
            throw new Error('Invalid port number');
        }
    }

    private isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    public getConfiguration(): BotConfiguration {
        if (!this.config) {
            throw new Error('Configuration not initialized');
        }
        return this.config;
    }
}