/**
 * License Checker Configuration for ANF-AIOps
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * License compliance checking configuration
 */

module.exports = {
  // Allowed licenses
  allowedLicenses: [
    'MIT',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'Apache-2.0',
    'ISC',
    'Unlicense',
    'CC0-1.0',
    'MPL-2.0',
    '0BSD',
    'BlueOak-1.0.0',
    'WTFPL',
  ],

  // Forbidden licenses
  forbiddenLicenses: [
    'GPL-2.0',
    'GPL-3.0',
    'LGPL-2.1',
    'LGPL-3.0',
    'AGPL-1.0',
    'AGPL-3.0',
    'CPAL-1.0',
    'EPL-1.0',
    'EPL-2.0',
    'EUPL-1.1',
    'EUPL-1.2',
    'OSL-3.0',
    'CC-BY-SA-4.0',
    'CC-BY-NC-4.0',
    'CC-BY-NC-SA-4.0',
  ],

  // Packages with specific license exceptions
  licenseExceptions: {
    // Development-only packages that may have stricter licenses
    '@types/*': ['MIT', 'Apache-2.0'],
    'eslint-*': ['MIT', 'BSD-2-Clause'],
    'jest': ['MIT'],
    'typescript': ['Apache-2.0'],
    'prettier': ['MIT'],
    
    // Microsoft packages commonly used in Azure development
    '@azure/*': ['MIT', 'Apache-2.0'],
    'botbuilder*': ['MIT'],
    '@microsoft/*': ['MIT', 'Apache-2.0'],
    
    // Common utility packages
    'lodash': ['MIT'],
    'moment': ['MIT'],
    'express': ['MIT'],
    'axios': ['MIT'],
    'winston': ['MIT'],
  },

  // Packages to ignore completely (usually dev dependencies)
  ignoredPackages: [
    '@types/node',
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
    'husky',
    'lint-staged',
    'nodemon',
    'ts-node',
    'rimraf',
  ],

  // Custom license validation rules
  customLicenseValidation: {
    // Allow packages without license field if they're in this list
    allowMissingLicense: [
      'anf-aiops-internal-*',
    ],
    
    // Require specific licenses for certain package types
    requireSpecificLicense: {
      'security-*': ['MIT', 'Apache-2.0'],
      'crypto-*': ['MIT', 'Apache-2.0', 'BSD-3-Clause'],
    },
  },

  // Output configuration
  output: {
    format: 'json',
    file: 'security/license-report.json',
    includeDevDependencies: false,
    includePeerDependencies: false,
    includeOptionalDependencies: false,
  },

  // Compliance reporting
  compliance: {
    // Generate SPDX document
    generateSPDX: true,
    spdxFile: 'security/SPDX-license-report.spdx',
    
    // Generate attribution file
    generateAttribution: true,
    attributionFile: 'ATTRIBUTION.md',
    
    // Generate notice file
    generateNotice: true,
    noticeFile: 'NOTICE.txt',
  },

  // Enterprise-specific configurations
  enterprise: {
    // Company-specific license policies
    companyPolicy: {
      allowCopyleft: false,
      requireCommercialUse: true,
      requireRedistribution: true,
      allowLinkingExceptions: false,
    },
    
    // Legal review requirements
    legalReview: {
      required: true,
      contact: 'DwirefS@SapientEdge.io',
      threshold: 'medium-risk',
    },
    
    // Audit trail
    auditTrail: {
      enabled: true,
      logFile: 'security/license-audit.log',
      includeTimestamp: true,
      includeUser: true,
    },
  },

  // Security considerations
  security: {
    // Check for known vulnerable packages
    vulnerabilityCheck: true,
    
    // Check for packages with security advisories
    advisoryCheck: true,
    
    // Minimum security rating
    minSecurityRating: 'medium',
    
    // Security databases to check
    securityDatabases: [
      'npm-audit',
      'snyk',
      'github-advisory',
    ],
  },

  // Notification settings
  notifications: {
    // Notify on license violations
    onViolation: {
      email: ['DwirefS@SapientEdge.io'],
      slack: process.env.SLACK_WEBHOOK_URL,
      teams: process.env.TEAMS_WEBHOOK_URL,
    },
    
    // Notify on new licenses
    onNewLicense: {
      email: ['DwirefS@SapientEdge.io'],
      requireApproval: true,
    },
  },

  // Integration settings
  integration: {
    // CI/CD integration
    cicd: {
      failOnViolation: true,
      generateReport: true,
      uploadArtifacts: true,
    },
    
    // Git hooks integration
    githooks: {
      preCommit: true,
      prePush: true,
    },
    
    // Package manager integration
    packageManager: {
      npm: true,
      yarn: true,
      pnpm: true,
    },
  },
};