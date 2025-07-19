/**
 * Authentication Service for Teams Bot
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import { ConfidentialClientApplication } from '@azure/msal-node';
import { TurnContext } from 'botbuilder';
import { BotConfiguration } from './configuration.service';
import { LoggingService } from './logging.service';

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    tenantId: string;
    roles: string[];
    permissions: string[];
}

export interface AuthResult {
    success: boolean;
    user?: UserProfile;
    error?: string;
}

export class AuthService {
    private msalClient: ConfidentialClientApplication;
    private logger = LoggingService.getInstance();

    constructor(config: BotConfiguration) {
        this.msalClient = new ConfidentialClientApplication({
            auth: {
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                authority: `https://login.microsoftonline.com/${config.tenantId}`
            }
        });
    }

    public async authenticateUser(context: TurnContext): Promise<AuthResult> {
        try {
            const activity = context.activity;
            
            // Get user information from Teams context
            const userId = activity.from?.id;
            const userName = activity.from?.name;
            const userEmail = activity.from?.properties?.email;
            const tenantId = activity.channelData?.tenant?.id;

            if (!userId || !userName || !tenantId) {
                return {
                    success: false,
                    error: 'Missing user information in Teams context'
                };
            }

            // Get user roles and permissions
            const roles = await this.getUserRoles(userId, tenantId);
            const permissions = await this.getUserPermissions(roles);

            const user: UserProfile = {
                id: userId,
                name: userName,
                email: userEmail || `${userId}@${tenantId}`,
                tenantId: tenantId,
                roles: roles,
                permissions: permissions
            };

            this.logger.info('User authenticated successfully', {
                userId: user.id,
                userName: user.name,
                tenantId: user.tenantId,
                roles: user.roles
            });

            return {
                success: true,
                user: user
            };

        } catch (error) {
            this.logger.error('Authentication failed', { error });
            return {
                success: false,
                error: 'Authentication failed'
            };
        }
    }

    public async isAuthorized(user: UserProfile, action: string, resource?: string): Promise<boolean> {
        try {
            // Check if user has required permission
            const requiredPermissions = this.getRequiredPermissions(action, resource);
            
            for (const permission of requiredPermissions) {
                if (user.permissions.includes(permission)) {
                    return true;
                }
            }

            // Check if user has admin role
            if (user.roles.includes('ANF.Admin')) {
                return true;
            }

            this.logger.warn('User not authorized for action', {
                userId: user.id,
                action: action,
                resource: resource,
                userPermissions: user.permissions
            });

            return false;

        } catch (error) {
            this.logger.error('Authorization check failed', { error });
            return false;
        }
    }

    private async getUserRoles(userId: string, _tenantId: string): Promise<string[]> {
        try {
            // In a real implementation, this would query Microsoft Graph API
            // For now, we'll implement a basic role assignment based on user ID
            
            // Default roles for all users
            const roles = ['ANF.Reader'];

            // Add specific roles based on user or group membership
            // This would typically be done through Azure AD group membership
            if (this.isAdminUser(userId)) {
                roles.push('ANF.Admin');
            }

            if (this.isOperatorUser(userId)) {
                roles.push('ANF.Operator');
            }

            return roles;

        } catch (error) {
            this.logger.error('Failed to get user roles', { error, userId });
            return ['ANF.Reader']; // Default role
        }
    }

    private async getUserPermissions(roles: string[]): Promise<string[]> {
        const permissions: string[] = [];

        for (const role of roles) {
            switch (role) {
                case 'ANF.Admin':
                    permissions.push(
                        'anf:read',
                        'anf:create',
                        'anf:update',
                        'anf:delete',
                        'anf:manage',
                        'anf:security:read',
                        'anf:security:manage'
                    );
                    break;

                case 'ANF.Operator':
                    permissions.push(
                        'anf:read',
                        'anf:create',
                        'anf:update',
                        'anf:manage'
                    );
                    break;

                case 'ANF.Reader':
                    permissions.push(
                        'anf:read'
                    );
                    break;

                default:
                    this.logger.warn('Unknown role', { role });
                    break;
            }
        }

        return [...new Set(permissions)]; // Remove duplicates
    }

    private getRequiredPermissions(action: string, _resource?: string): string[] {
        const permissionMap: Record<string, string[]> = {
            'volume:list': ['anf:read'],
            'volume:get': ['anf:read'],
            'volume:create': ['anf:create'],
            'volume:update': ['anf:update'],
            'volume:delete': ['anf:delete'],
            'volume:resize': ['anf:update'],
            'pool:list': ['anf:read'],
            'pool:get': ['anf:read'],
            'pool:create': ['anf:create'],
            'pool:update': ['anf:update'],
            'pool:delete': ['anf:delete'],
            'snapshot:list': ['anf:read'],
            'snapshot:create': ['anf:create'],
            'snapshot:delete': ['anf:delete'],
            'monitoring:read': ['anf:read'],
            'security:read': ['anf:security:read'],
            'security:manage': ['anf:security:manage']
        };

        return permissionMap[action] || ['anf:read'];
    }

    private isAdminUser(userId: string): boolean {
        // In a real implementation, this would check Azure AD group membership
        // For demo purposes, we'll use a simple check
        const adminUsers = process.env.ADMIN_USERS?.split(',') || [];
        return adminUsers.includes(userId);
    }

    private isOperatorUser(userId: string): boolean {
        // In a real implementation, this would check Azure AD group membership
        // For demo purposes, we'll use a simple check
        const operatorUsers = process.env.OPERATOR_USERS?.split(',') || [];
        return operatorUsers.includes(userId);
    }

    public async getAccessToken(): Promise<string> {
        try {
            const clientCredentialRequest = {
                scopes: ['https://graph.microsoft.com/.default']
            };

            const response = await this.msalClient.acquireTokenByClientCredential(clientCredentialRequest);
            
            if (!response || !response.accessToken) {
                throw new Error('Failed to acquire access token');
            }

            return response.accessToken;

        } catch (error) {
            this.logger.error('Failed to get access token', { error });
            throw error;
        }
    }
}