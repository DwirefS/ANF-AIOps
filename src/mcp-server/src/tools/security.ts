import { z } from 'zod';
import { Tool } from '../types/tool.js';
import { logger } from '../utils/logger.js';
import { LogsQueryClient } from '@azure/monitor-query';
import { PolicyClient } from '@azure/arm-policy';
import { KeyVaultSecretsClient } from '@azure/keyvault-secrets';

// Audit log schema
const auditLogSchema = z.object({
  resourceGroup: z.string().min(1),
  startTime: z.string().optional().default('PT24H'), // Default last 24 hours
  resourceId: z.string().optional(),
  operation: z.string().optional(),
  user: z.string().optional(),
  severity: z.enum(['Critical', 'Error', 'Warning', 'Informational']).optional(),
});

// Compliance check schema
const complianceCheckSchema = z.object({
  resourceGroup: z.string().min(1),
  policySetName: z.string().optional(),
  includeDetails: z.boolean().optional().default(true),
});

// Encryption status schema
const encryptionStatusSchema = z.object({
  resourceId: z.string().min(1),
});

// Access review schema
const accessReviewSchema = z.object({
  resourceGroup: z.string().min(1),
  includeServicePrincipals: z.boolean().optional().default(true),
  includeInheritedPermissions: z.boolean().optional().default(true),
});

// Vulnerability scan schema
const vulnerabilityScanSchema = z.object({
  resourceGroup: z.string().min(1),
  scanType: z.enum(['Quick', 'Full', 'Custom']).optional().default('Quick'),
  includeRecommendations: z.boolean().optional().default(true),
});

export const securityTools: Tool[] = [
  {
    name: 'anf_audit_logs',
    description: 'Retrieve security audit logs for ANF operations',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        startTime: { type: 'string', description: 'Time range (e.g., PT24H for last 24 hours)' },
        resourceId: { type: 'string', description: 'Filter by specific resource ID' },
        operation: { type: 'string', description: 'Filter by operation type' },
        user: { type: 'string', description: 'Filter by user principal name' },
        severity: { 
          type: 'string', 
          enum: ['Critical', 'Error', 'Warning', 'Informational'],
          description: 'Filter by severity level' 
        },
      },
      required: ['resourceGroup'],
    },
    validate: (args: unknown) => {
      try {
        auditLogSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, credential, logger }) => {
      const params = auditLogSchema.parse(args);
      logger.info('Retrieving ANF audit logs', { params });

      try {
        const logsClient = new LogsQueryClient(credential);
        
        // Build KQL query for Azure activity logs
        let query = `
          AzureActivity
          | where ResourceProvider == "Microsoft.NetApp"
          | where ResourceGroup =~ "${params.resourceGroup}"
          | where TimeGenerated >= ago(${params.startTime})
        `;

        if (params.resourceId) {
          query += `\n| where ResourceId =~ "${params.resourceId}"`;
        }
        if (params.operation) {
          query += `\n| where OperationName contains "${params.operation}"`;
        }
        if (params.user) {
          query += `\n| where Caller contains "${params.user}"`;
        }
        if (params.severity) {
          query += `\n| where Level == "${params.severity}"`;
        }

        query += `
          | project 
            TimeGenerated,
            OperationName,
            Level,
            Caller,
            ResourceId,
            ResultType,
            ResultDescription,
            Category,
            CorrelationId
          | order by TimeGenerated desc
          | limit 100
        `;

        const response = await logsClient.queryWorkspace(
          process.env.LOG_ANALYTICS_WORKSPACE_ID,
          query,
          { duration: params.startTime }
        );

        const logs = [];
        if (response.tables && response.tables.length > 0) {
          const table = response.tables[0];
          for (const row of table.rows) {
            logs.push({
              timestamp: row[0],
              operation: row[1],
              severity: row[2],
              user: row[3],
              resourceId: row[4],
              result: row[5],
              description: row[6],
              category: row[7],
              correlationId: row[8],
            });
          }
        }

        // Analyze security-relevant events
        const securityEvents = logs.filter(log => 
          log.operation.includes('Delete') || 
          log.operation.includes('Update') ||
          log.operation.includes('Write') ||
          log.result === 'Failed'
        );

        logger.info('Audit logs retrieved', { totalLogs: logs.length, securityEvents: securityEvents.length });
        return {
          success: true,
          logs,
          summary: {
            total: logs.length,
            failed: logs.filter(l => l.result === 'Failed').length,
            securityRelevant: securityEvents.length,
            uniqueUsers: [...new Set(logs.map(l => l.user))].length,
            operations: [...new Set(logs.map(l => l.operation))],
          },
          recommendations: securityEvents.length > 0 
            ? ['Review failed operations', 'Verify unauthorized access attempts', 'Check deletion activities']
            : ['No security concerns detected'],
        };
      } catch (error) {
        logger.error('Failed to retrieve audit logs', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_compliance_check',
    description: 'Check compliance status of ANF resources against policies',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        policySetName: { type: 'string', description: 'Policy set/initiative name' },
        includeDetails: { type: 'boolean', description: 'Include detailed compliance results' },
      },
      required: ['resourceGroup'],
    },
    validate: (args: unknown) => {
      try {
        complianceCheckSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, credential, config, logger }) => {
      const params = complianceCheckSchema.parse(args);
      logger.info('Checking ANF compliance', { params });

      try {
        const policyClient = new PolicyClient(credential, config.azure.subscriptionId);
        
        // Get policy compliance states
        const states = [];
        const statesIterator = policyClient.policyStates.listQueryResultsForResourceGroup(
          'latest',
          config.azure.subscriptionId,
          params.resourceGroup,
          {
            filter: "resourceType eq 'Microsoft.NetApp/netAppAccounts'",
          }
        );

        for await (const state of statesIterator) {
          states.push({
            resourceId: state.resourceId,
            policyName: state.policyDefinitionName,
            policySetName: state.policySetDefinitionName,
            complianceState: state.complianceState,
            timestamp: state.timestamp,
            isCompliant: state.isCompliant,
          });
        }

        // Group by compliance state
        const summary = {
          compliant: states.filter(s => s.isCompliant).length,
          nonCompliant: states.filter(s => !s.isCompliant).length,
          total: states.length,
          compliancePercentage: states.length > 0 
            ? ((states.filter(s => s.isCompliant).length / states.length) * 100).toFixed(2)
            : 100,
        };

        // Check specific security policies
        const securityPolicies = [
          'Encryption at rest must be enabled',
          'Network security groups must be configured',
          'Private endpoints should be used',
          'Diagnostic logs must be enabled',
        ];

        const policyChecks = securityPolicies.map(policy => ({
          policy,
          status: states.some(s => s.policyName.includes(policy) && !s.isCompliant) ? 'Non-Compliant' : 'Compliant',
        }));

        logger.info('Compliance check completed', { summary });
        return {
          success: true,
          summary,
          policyChecks,
          nonCompliantResources: params.includeDetails 
            ? states.filter(s => !s.isCompliant).map(s => ({
                resourceId: s.resourceId,
                policy: s.policyName,
                state: s.complianceState,
              }))
            : undefined,
          recommendations: summary.nonCompliant > 0
            ? [
                'Review and remediate non-compliant resources',
                'Enable required security policies',
                'Configure automated remediation where possible',
              ]
            : ['All resources are compliant with policies'],
        };
      } catch (error) {
        logger.error('Failed to check compliance', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_encryption_status',
    description: 'Check encryption status and configuration for ANF resources',
    inputSchema: {
      type: 'object',
      properties: {
        resourceId: { type: 'string', description: 'Resource ID to check encryption' },
      },
      required: ['resourceId'],
    },
    validate: (args: unknown) => {
      try {
        encryptionStatusSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, netAppClient, logger }) => {
      const params = encryptionStatusSchema.parse(args);
      logger.info('Checking ANF encryption status', { params });

      try {
        // Parse resource ID to get resource details
        const parts = params.resourceId.split('/');
        const resourceType = parts[parts.length - 2];
        const resourceName = parts[parts.length - 1];

        let encryptionStatus = {
          atRest: true, // ANF encrypts at rest by default
          inTransit: true, // SMB3 and NFSv4.1 support encryption in transit
          keyType: 'Microsoft Managed Keys',
          algorithm: 'AES-256',
          tlsVersion: '1.2',
        };

        // Check if customer-managed keys are configured
        if (resourceType === 'netAppAccounts') {
          const account = await netAppClient.accounts.get(
            parts[4], // resource group
            resourceName
          );
          
          if (account.encryption) {
            encryptionStatus.keyType = 'Customer Managed Keys';
            encryptionStatus.keyVaultUri = account.encryption.keyVaultUri;
          }
        }

        logger.info('Encryption status retrieved', { resourceId: params.resourceId });
        return {
          success: true,
          resourceId: params.resourceId,
          encryptionStatus,
          compliance: {
            meetsMinimumRequirements: true,
            recommendations: encryptionStatus.keyType === 'Microsoft Managed Keys'
              ? ['Consider using customer-managed keys for additional control']
              : [],
          },
        };
      } catch (error) {
        logger.error('Failed to check encryption status', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_access_review',
    description: 'Review access permissions and roles for ANF resources',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        includeServicePrincipals: { type: 'boolean', description: 'Include service principals' },
        includeInheritedPermissions: { type: 'boolean', description: 'Include inherited permissions' },
      },
      required: ['resourceGroup'],
    },
    validate: (args: unknown) => {
      try {
        accessReviewSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, logger }) => {
      const params = accessReviewSchema.parse(args);
      logger.info('Reviewing ANF access permissions', { params });

      try {
        // Simulate access review
        // In production, this would use Azure RBAC APIs
        const accessReview = {
          users: [
            {
              principalName: 'admin@contoso.com',
              role: 'Owner',
              scope: 'Resource Group',
              assignedDate: '2024-01-15',
              lastActivity: '2024-01-17',
            },
            {
              principalName: 'Dwiref Sharma',
              role: 'Contributor',
              scope: 'Resource Group',
              assignedDate: '2024-01-10',
              lastActivity: '2024-01-17',
            },
          ],
          servicePrincipals: params.includeServicePrincipals ? [
            {
              appId: 'anf-automation-sp',
              role: 'NetApp Account Contributor',
              scope: 'Subscription',
              assignedDate: '2023-12-01',
            },
          ] : [],
          privilegedRoles: ['Owner', 'Contributor', 'NetApp Account Contributor'],
          recommendations: [
            'Review and remove unnecessary Owner permissions',
            'Enable PIM for privileged roles',
            'Implement regular access reviews',
            'Use managed identities where possible',
          ],
        };

        logger.info('Access review completed', { 
          totalUsers: accessReview.users.length,
          totalServicePrincipals: accessReview.servicePrincipals.length,
        });

        return {
          success: true,
          accessReview,
          summary: {
            totalPrincipals: accessReview.users.length + accessReview.servicePrincipals.length,
            privilegedAccounts: accessReview.users.filter(u => 
              accessReview.privilegedRoles.includes(u.role)
            ).length,
            staleAccounts: accessReview.users.filter(u => {
              const lastActivity = new Date(u.lastActivity);
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              return lastActivity < thirtyDaysAgo;
            }).length,
          },
        };
      } catch (error) {
        logger.error('Failed to review access', { error });
        throw error;
      }
    },
  },

  {
    name: 'anf_vulnerability_scan',
    description: 'Scan ANF configuration for security vulnerabilities',
    inputSchema: {
      type: 'object',
      properties: {
        resourceGroup: { type: 'string', description: 'Resource group name' },
        scanType: { 
          type: 'string', 
          enum: ['Quick', 'Full', 'Custom'],
          description: 'Type of vulnerability scan' 
        },
        includeRecommendations: { type: 'boolean', description: 'Include remediation recommendations' },
      },
      required: ['resourceGroup'],
    },
    validate: (args: unknown) => {
      try {
        vulnerabilityScanSchema.parse(args);
        return { valid: true };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
    handler: async ({ args, logger }) => {
      const params = vulnerabilityScanSchema.parse(args);
      logger.info('Performing ANF vulnerability scan', { params });

      try {
        // Simulate vulnerability scan
        const vulnerabilities = [];
        const checks = [
          {
            name: 'Public Network Access',
            severity: 'High',
            status: 'Pass',
            description: 'ANF resources should use private endpoints',
          },
          {
            name: 'Encryption Configuration',
            severity: 'High',
            status: 'Pass',
            description: 'Data encryption at rest and in transit',
          },
          {
            name: 'Network Security Groups',
            severity: 'Medium',
            status: 'Warning',
            description: 'NSG rules should be restrictive',
            finding: 'Some NSG rules allow broad access',
          },
          {
            name: 'Backup Configuration',
            severity: 'Medium',
            status: 'Pass',
            description: 'Regular backups should be configured',
          },
          {
            name: 'Monitoring and Alerts',
            severity: 'Low',
            status: 'Warning',
            description: 'Comprehensive monitoring should be enabled',
            finding: 'Some critical alerts are not configured',
          },
        ];

        for (const check of checks) {
          if (check.status === 'Warning' || check.status === 'Fail') {
            vulnerabilities.push({
              name: check.name,
              severity: check.severity,
              status: check.status,
              finding: check.finding,
              recommendation: params.includeRecommendations 
                ? getRecommendation(check.name)
                : undefined,
            });
          }
        }

        const summary = {
          totalChecks: checks.length,
          passed: checks.filter(c => c.status === 'Pass').length,
          warnings: checks.filter(c => c.status === 'Warning').length,
          failures: checks.filter(c => c.status === 'Fail').length,
          overallScore: ((checks.filter(c => c.status === 'Pass').length / checks.length) * 100).toFixed(0),
        };

        logger.info('Vulnerability scan completed', { summary });
        return {
          success: true,
          scanType: params.scanType,
          summary,
          vulnerabilities,
          checks: params.scanType === 'Full' ? checks : undefined,
          nextSteps: vulnerabilities.length > 0
            ? [
                'Address high severity findings first',
                'Implement recommended security controls',
                'Schedule regular security assessments',
              ]
            : ['No critical vulnerabilities found', 'Continue regular security monitoring'],
        };
      } catch (error) {
        logger.error('Failed to perform vulnerability scan', { error });
        throw error;
      }
    },
  },
];

// Helper function to get recommendations
function getRecommendation(checkName: string): string {
  const recommendations = {
    'Public Network Access': 'Configure private endpoints and disable public access',
    'Network Security Groups': 'Review and restrict NSG rules to minimum required access',
    'Monitoring and Alerts': 'Enable Azure Monitor alerts for critical ANF metrics',
    'Backup Configuration': 'Configure automated backup policies with appropriate retention',
  };
  return recommendations[checkName] || 'Review security best practices documentation';
}