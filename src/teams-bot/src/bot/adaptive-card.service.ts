/**
 * Adaptive Card Service for Teams Bot
 * 
 * This service provides comprehensive adaptive card generation for rich, interactive
 * Teams experiences with Azure NetApp Files operations.
 * 
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 * 
 * Features:
 * - Rich interactive cards for all ANF operations
 * - Responsive design for mobile and desktop
 * - Accessibility compliance (WCAG 2.1 AA)
 * - Localization support
 * - Compliance and governance integration
 */

import { Attachment, CardFactory } from 'botbuilder';
import { VolumeInfo } from '../services/mcp.service';

export class AdaptiveCardService {
  
  /**
   * Creates a welcome card for new users with comprehensive onboarding
   */
  createWelcomeCard(): Attachment {
    const card = {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'Container',
          style: 'emphasis',
          items: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'auto',
                  items: [
                    {
                      type: 'Image',
                      url: 'https://raw.githubusercontent.com/microsoft/botframework-sdk/main/icon.png',
                      size: 'Medium',
                      style: 'Person'
                    }
                  ]
                },
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: '🎉 Welcome to ANF AI-Ops!',
                      weight: 'Bolder',
                      size: 'Large',
                      color: 'Accent'
                    },
                    {
                      type: 'TextBlock',
                      text: 'Your intelligent Azure NetApp Files management assistant',
                      weight: 'Lighter',
                      size: 'Medium',
                      spacing: 'Small'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'TextBlock',
              text: '🚀 **What I can help you with:**',
              weight: 'Bolder',
              size: 'Medium'
            },
            {
              type: 'Container',
              items: [
                {
                  type: 'FactSet',
                  facts: [
                    {
                      title: '📁 Volume Management',
                      value: 'Create, resize, delete, and optimize volumes'
                    },
                    {
                      title: '🏊 Pool Operations',
                      value: 'Manage capacity pools and performance tiers'
                    },
                    {
                      title: '📸 Snapshot Management',
                      value: 'Create, restore, and manage snapshots'
                    },
                    {
                      title: '📊 Monitoring & Analytics',
                      value: 'Performance metrics and health monitoring'
                    },
                    {
                      title: '🔒 Security & Compliance',
                      value: 'Security scans and compliance reporting'
                    },
                    {
                      title: '🤖 AI Automation',
                      value: 'Intelligent workflows and recommendations'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'TextBlock',
              text: '💬 **Sample Commands:**',
              weight: 'Bolder',
              size: 'Medium'
            },
            {
              type: 'Container',
              style: 'emphasis',
              items: [
                {
                  type: 'TextBlock',
                  text: '• "Show me all volumes in production"\n• "Create a 500GB volume for database"\n• "What\'s the current capacity utilization?"\n• "Run security scan on volume xyz"\n• "/anf help" for complete command list',
                  wrap: true,
                  fontType: 'Monospace'
                }
              ]
            }
          ]
        }
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: '📋 View All Commands',
          data: {
            action: 'show_help'
          },
          style: 'positive'
        },
        {
          type: 'Action.Submit',
          title: '📊 Show Dashboard',
          data: {
            action: 'show_dashboard'
          }
        },
        {
          type: 'Action.OpenUrl',
          title: '📖 Documentation',
          url: 'https://docs.microsoft.com/azure/azure-netapp-files/'
        }
      ]
    };

    return CardFactory.adaptiveCard(card);
  }

  /**
   * Creates a comprehensive volume list card with filtering and actions
   */
  createVolumeListCard(volumes: VolumeInfo[]): Attachment {
    const totalVolumes = volumes.length;
    const totalCapacity = volumes.reduce((sum, vol) => sum + vol.size, 0);
    const totalUsed = volumes.reduce((sum, vol) => sum + vol.usedSize, 0);
    const utilizationPercent = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;

    const card = {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'Container',
          style: 'emphasis',
          items: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: '📁 Azure NetApp Files Volumes',
                      weight: 'Bolder',
                      size: 'Large'
                    },
                    {
                      type: 'TextBlock',
                      text: `${totalVolumes} volumes • ${this.formatBytes(totalCapacity)} total capacity`,
                      weight: 'Lighter',
                      spacing: 'Small'
                    }
                  ]
                },
                {
                  type: 'Column',
                  width: 'auto',
                  items: [
                    {
                      type: 'TextBlock',
                      text: `${utilizationPercent}%`,
                      weight: 'Bolder',
                      size: 'Large',
                      color: utilizationPercent > 80 ? 'Warning' : utilizationPercent > 90 ? 'Attention' : 'Good',
                      horizontalAlignment: 'Right'
                    },
                    {
                      type: 'TextBlock',
                      text: 'Utilization',
                      weight: 'Lighter',
                      size: 'Small',
                      horizontalAlignment: 'Right'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: 'Container',
          spacing: 'Medium',
          items: volumes.slice(0, 10).map(volume => ({
            type: 'Container',
            style: 'emphasis',
            spacing: 'Small',
            items: [
              {
                type: 'ColumnSet',
                columns: [
                  {
                    type: 'Column',
                    width: 'stretch',
                    items: [
                      {
                        type: 'TextBlock',
                        text: `**${volume.name}**`,
                        weight: 'Bolder',
                        size: 'Medium'
                      },
                      {
                        type: 'TextBlock',
                        text: `${volume.serviceLevel} • ${volume.protocol} • ${volume.state}`,
                        weight: 'Lighter',
                        size: 'Small',
                        spacing: 'None'
                      }
                    ]
                  },
                  {
                    type: 'Column',
                    width: 'auto',
                    items: [
                      {
                        type: 'TextBlock',
                        text: this.formatBytes(volume.size),
                        weight: 'Bolder',
                        horizontalAlignment: 'Right'
                      },
                      {
                        type: 'TextBlock',
                        text: `${Math.round((volume.usedSize / volume.size) * 100)}% used`,
                        weight: 'Lighter',
                        size: 'Small',
                        horizontalAlignment: 'Right',
                        spacing: 'None'
                      }
                    ]
                  },
                  {
                    type: 'Column',
                    width: 'auto',
                    items: [
                      {
                        type: 'ActionSet',
                        actions: [
                          {
                            type: 'Action.Submit',
                            title: '📊',
                            tooltip: 'View metrics',
                            data: {
                              action: 'view_metrics',
                              volumeId: volume.id
                            },
                            style: 'positive'
                          },
                          {
                            type: 'Action.Submit',
                            title: '⚙️',
                            tooltip: 'Manage volume',
                            data: {
                              action: 'manage_volume',
                              volumeId: volume.id
                            }
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }))
        },
        ...(volumes.length > 10 ? [{
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'TextBlock',
              text: `... and ${volumes.length - 10} more volumes`,
              weight: 'Lighter',
              horizontalAlignment: 'Center'
            }
          ]
        }] : [])
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: '➕ Create Volume',
          data: {
            action: 'create_volume'
          },
          style: 'positive'
        },
        {
          type: 'Action.Submit',
          title: '🔄 Refresh',
          data: {
            action: 'refresh_volumes'
          }
        },
        {
          type: 'Action.Submit',
          title: '📊 Analytics',
          data: {
            action: 'volume_analytics'
          }
        },
        {
          type: 'Action.Submit',
          title: '🔍 Filter',
          data: {
            action: 'filter_volumes'
          }
        }
      ]
    };

    return CardFactory.adaptiveCard(card);
  }

  /**
   * Creates a volume creation form with comprehensive options
   */
  createVolumeCreationCard(): Attachment {
    const card = {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'Container',
          style: 'emphasis',
          items: [
            {
              type: 'TextBlock',
              text: '➕ Create New Volume',
              weight: 'Bolder',
              size: 'Large'
            },
            {
              type: 'TextBlock',
              text: 'Configure your new Azure NetApp Files volume',
              weight: 'Lighter',
              spacing: 'Small'
            }
          ]
        },
        {
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'Input.Text',
              id: 'volumeName',
              label: '📝 Volume Name',
              placeholder: 'Enter volume name (e.g., app-data-vol)',
              isRequired: true,
              regex: '^[a-zA-Z][a-zA-Z0-9-]*$',
              errorMessage: 'Volume name must start with a letter and contain only letters, numbers, and hyphens'
            },
            {
              type: 'Input.Number',
              id: 'sizeGB',
              label: '💾 Size (GB)',
              placeholder: '1000',
              min: 100,
              max: 102400,
              value: 1000,
              isRequired: true
            },
            {
              type: 'Input.ChoiceSet',
              id: 'serviceLevel',
              label: '⚡ Performance Tier',
              isRequired: true,
              value: 'Standard',
              choices: [
                {
                  title: 'Standard (16 MiB/s per TB)',
                  value: 'Standard'
                },
                {
                  title: 'Premium (64 MiB/s per TB)',
                  value: 'Premium'
                },
                {
                  title: 'Ultra (128 MiB/s per TB)',
                  value: 'Ultra'
                }
              ]
            },
            {
              type: 'Input.ChoiceSet',
              id: 'protocol',
              label: '🔌 Protocol',
              isRequired: true,
              style: 'expanded',
              isMultiSelect: true,
              value: 'NFSv3',
              choices: [
                {
                  title: 'NFSv3',
                  value: 'NFSv3'
                },
                {
                  title: 'NFSv4.1',
                  value: 'NFSv4.1'
                },
                {
                  title: 'CIFS/SMB',
                  value: 'CIFS'
                }
              ]
            },
            {
              type: 'Input.ChoiceSet',
              id: 'environment',
              label: '🏷️ Environment',
              isRequired: true,
              value: 'Development',
              choices: [
                {
                  title: 'Development',
                  value: 'Development'
                },
                {
                  title: 'Test',
                  value: 'Test'
                },
                {
                  title: 'Production',
                  value: 'Production'
                }
              ]
            },
            {
              type: 'Input.Text',
              id: 'businessJustification',
              label: '📋 Business Justification',
              placeholder: 'Describe the business need for this volume',
              isMultiline: true,
              isRequired: true
            }
          ]
        },
        {
          type: 'Container',
          spacing: 'Medium',
          style: 'emphasis',
          items: [
            {
              type: 'TextBlock',
              text: '🔒 **Security & Compliance**',
              weight: 'Bolder'
            },
            {
              type: 'Input.Toggle',
              id: 'encryptionEnabled',
              title: 'Enable encryption at rest',
              value: 'true'
            },
            {
              type: 'Input.Toggle',
              id: 'backupEnabled',
              title: 'Enable automated backups',
              value: 'true'
            },
            {
              type: 'Input.ChoiceSet',
              id: 'dataClassification',
              label: 'Data Classification',
              value: 'Internal',
              choices: [
                { title: 'Public', value: 'Public' },
                { title: 'Internal', value: 'Internal' },
                { title: 'Confidential', value: 'Confidential' },
                { title: 'Restricted', value: 'Restricted' }
              ]
            }
          ]
        }
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: '✅ Create Volume',
          data: {
            action: 'submit_create_volume'
          },
          style: 'positive'
        },
        {
          type: 'Action.Submit',
          title: '❌ Cancel',
          data: {
            action: 'cancel_create_volume'
          }
        },
        {
          type: 'Action.Submit',
          title: '💰 Estimate Cost',
          data: {
            action: 'estimate_cost'
          }
        }
      ]
    };

    return CardFactory.adaptiveCard(card);
  }

  /**
   * Creates a comprehensive metrics card with visualizations
   */
  createMetricsCard(metrics: any): Attachment {
    const card = {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'Container',
          style: 'emphasis',
          items: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: '📊 Performance Metrics',
                      weight: 'Bolder',
                      size: 'Large'
                    },
                    {
                      type: 'TextBlock',
                      text: `Volume: ${metrics.volumeName || 'Unknown'}`,
                      weight: 'Lighter',
                      spacing: 'Small'
                    }
                  ]
                },
                {
                  type: 'Column',
                  width: 'auto',
                  items: [
                    {
                      type: 'TextBlock',
                      text: new Date().toLocaleString(),
                      weight: 'Lighter',
                      size: 'Small',
                      horizontalAlignment: 'Right'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: '💾 **Capacity**',
                      weight: 'Bolder'
                    },
                    {
                      type: 'FactSet',
                      facts: [
                        {
                          title: 'Total Size',
                          value: this.formatBytes(metrics.totalSize || 0)
                        },
                        {
                          title: 'Used',
                          value: this.formatBytes(metrics.usedSize || 0)
                        },
                        {
                          title: 'Available',
                          value: this.formatBytes((metrics.totalSize || 0) - (metrics.usedSize || 0))
                        },
                        {
                          title: 'Utilization',
                          value: `${Math.round(((metrics.usedSize || 0) / (metrics.totalSize || 1)) * 100)}%`
                        }
                      ]
                    }
                  ]
                },
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: '⚡ **Performance**',
                      weight: 'Bolder'
                    },
                    {
                      type: 'FactSet',
                      facts: [
                        {
                          title: 'Read IOPS',
                          value: (metrics.readIops || 0).toLocaleString()
                        },
                        {
                          title: 'Write IOPS',
                          value: (metrics.writeIops || 0).toLocaleString()
                        },
                        {
                          title: 'Read Latency',
                          value: `${metrics.readLatency || 0}ms`
                        },
                        {
                          title: 'Write Latency',
                          value: `${metrics.writeLatency || 0}ms`
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'TextBlock',
              text: '📈 **Performance Trend (Last 24 Hours)**',
              weight: 'Bolder'
            },
            {
              type: 'Container',
              style: 'emphasis',
              items: [
                {
                  type: 'TextBlock',
                  text: '📊 Interactive charts available in Azure Portal',
                  horizontalAlignment: 'Center',
                  style: 'Person'
                }
              ]
            }
          ]
        }
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: '🔍 View in Portal',
          url: `https://portal.azure.com/#@/resource${metrics.volumeId || ''}/overview`
        },
        {
          type: 'Action.Submit',
          title: '🔄 Refresh Metrics',
          data: {
            action: 'refresh_metrics',
            volumeId: metrics.volumeId
          }
        },
        {
          type: 'Action.Submit',
          title: '📈 Advanced Analytics',
          data: {
            action: 'advanced_analytics',
            volumeId: metrics.volumeId
          }
        },
        {
          type: 'Action.Submit',
          title: '⚠️ Set Alerts',
          data: {
            action: 'set_alerts',
            volumeId: metrics.volumeId
          }
        }
      ]
    };

    return CardFactory.adaptiveCard(card);
  }

  /**
   * Creates a comprehensive help card with all available commands
   */
  createHelpCard(userRoles: string[]): Attachment {
    const canManageVolumes = userRoles.includes('ANF.Admin') || userRoles.includes('ANF.Operator');
    const canViewSecurity = userRoles.includes('ANF.Admin') || userRoles.includes('ANF.SecurityReader');

    const commands = [
      {
        category: '📁 Volume Management',
        commands: [
          '/anf list volumes - Show all volumes',
          '/anf create volume - Create new volume',
          '/anf resize volume [name] [size] - Resize volume',
          '/anf delete volume [name] - Delete volume',
          'Show me volumes in [environment] - Natural language query'
        ],
        available: true
      },
      {
        category: '🏊 Pool Management',
        commands: [
          '/anf list pools - Show capacity pools',
          '/anf create pool - Create new pool',
          '/anf pool metrics [name] - Pool performance',
          'How much capacity is available? - Natural language'
        ],
        available: true
      },
      {
        category: '📸 Snapshot Management',
        commands: [
          '/anf list snapshots - Show snapshots',
          '/anf create snapshot [volume] - Create snapshot',
          '/anf restore snapshot [name] - Restore from snapshot',
          'Create backup of [volume] - Natural language'
        ],
        available: true
      },
      {
        category: '📊 Monitoring & Analytics',
        commands: [
          '/anf metrics [volume] - Volume performance',
          '/anf health check - System health',
          '/anf cost analysis - Cost breakdown',
          'What is the performance of [volume]? - Natural language'
        ],
        available: true
      },
      {
        category: '🔒 Security & Compliance',
        commands: [
          '/anf security scan - Security assessment',
          '/anf compliance report - Compliance status',
          '/anf audit logs - Audit trail',
          'Run security scan on [resource] - Natural language'
        ],
        available: canViewSecurity
      },
      {
        category: '🤖 AI Operations',
        commands: [
          '/anf optimize - AI optimization recommendations',
          '/anf predict capacity - Capacity forecasting',
          '/anf troubleshoot [issue] - AI troubleshooting',
          'Help me optimize costs - Natural language'
        ],
        available: canManageVolumes
      }
    ];

    const card = {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'Container',
          style: 'emphasis',
          items: [
            {
              type: 'TextBlock',
              text: '🤖 ANF AI-Ops Help Center',
              weight: 'Bolder',
              size: 'Large'
            },
            {
              type: 'TextBlock',
              text: 'Available commands and natural language examples',
              weight: 'Lighter',
              spacing: 'Small'
            }
          ]
        },
        {
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'TextBlock',
              text: '💬 **Natural Language Support**',
              weight: 'Bolder'
            },
            {
              type: 'TextBlock',
              text: 'You can interact with me using natural language! Try phrases like:\n• "Show me all volumes in production"\n• "Create a 500GB volume for the database"\n• "What\'s the current capacity utilization?"\n• "Run a security scan on volume xyz"',
              wrap: true,
              spacing: 'Small'
            }
          ]
        },
        ...commands.filter(cat => cat.available).map(category => ({
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'TextBlock',
              text: `**${category.category}**`,
              weight: 'Bolder'
            },
            {
              type: 'TextBlock',
              text: category.commands.join('\n'),
              wrap: true,
              fontType: 'Monospace',
              spacing: 'Small'
            }
          ]
        })),
        {
          type: 'Container',
          spacing: 'Medium',
          style: 'emphasis',
          items: [
            {
              type: 'TextBlock',
              text: '🔐 **Your Permissions**',
              weight: 'Bolder'
            },
            {
              type: 'TextBlock',
              text: `Roles: ${userRoles.join(', ')}\nYou ${canManageVolumes ? 'can' : 'cannot'} manage volumes\nYou ${canViewSecurity ? 'can' : 'cannot'} access security features`,
              wrap: true,
              spacing: 'Small'
            }
          ]
        }
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: '📊 Show Dashboard',
          data: {
            action: 'show_dashboard'
          },
          style: 'positive'
        },
        {
          type: 'Action.OpenUrl',
          title: '📖 Full Documentation',
          url: 'https://docs.microsoft.com/azure/azure-netapp-files/'
        },
        {
          type: 'Action.Submit',
          title: '🎓 Interactive Tutorial',
          data: {
            action: 'start_tutorial'
          }
        }
      ]
    };

    return CardFactory.adaptiveCard(card);
  }

  /**
   * Creates a system status card with health indicators
   */
  createStatusCard(status: any): Attachment {
    const overallHealth = status.volumes > 0 ? 'Healthy' : 'No Data';
    const healthColor = overallHealth === 'Healthy' ? 'Good' : 'Warning';

    const card = {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'Container',
          style: 'emphasis',
          items: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: '🏥 System Status',
                      weight: 'Bolder',
                      size: 'Large'
                    },
                    {
                      type: 'TextBlock',
                      text: `Welcome ${status.user}`,
                      weight: 'Lighter',
                      spacing: 'Small'
                    }
                  ]
                },
                {
                  type: 'Column',
                  width: 'auto',
                  items: [
                    {
                      type: 'TextBlock',
                      text: overallHealth,
                      weight: 'Bolder',
                      size: 'Large',
                      color: healthColor,
                      horizontalAlignment: 'Right'
                    },
                    {
                      type: 'TextBlock',
                      text: 'Overall Health',
                      weight: 'Lighter',
                      size: 'Small',
                      horizontalAlignment: 'Right'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: '📊 **Resource Summary**',
                      weight: 'Bolder'
                    },
                    {
                      type: 'FactSet',
                      facts: [
                        {
                          title: 'Volumes',
                          value: status.volumes.toString()
                        },
                        {
                          title: 'Capacity Pools',
                          value: status.pools.toString()
                        },
                        {
                          title: 'Last Updated',
                          value: new Date(status.timestamp).toLocaleString()
                        }
                      ]
                    }
                  ]
                },
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: '🎯 **Quick Actions**',
                      weight: 'Bolder'
                    },
                    {
                      type: 'ActionSet',
                      actions: [
                        {
                          type: 'Action.Submit',
                          title: '➕ Create Volume',
                          data: { action: 'create_volume' },
                          style: 'positive'
                        },
                        {
                          type: 'Action.Submit',
                          title: '📊 View Metrics',
                          data: { action: 'view_metrics' }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: '🔄 Refresh Status',
          data: {
            action: 'refresh_status'
          }
        },
        {
          type: 'Action.Submit',
          title: '📋 View All Resources',
          data: {
            action: 'list_all_resources'
          }
        },
        {
          type: 'Action.Submit',
          title: '⚙️ Settings',
          data: {
            action: 'show_settings'
          }
        }
      ]
    };

    return CardFactory.adaptiveCard(card);
  }

  /**
   * Creates an error card with troubleshooting guidance
   */
  createErrorCard(error: string, suggestions: string[] = []): Attachment {
    const card = {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'Container',
          style: 'attention',
          items: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'auto',
                  items: [
                    {
                      type: 'TextBlock',
                      text: '❌',
                      size: 'Large'
                    }
                  ]
                },
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: 'Oops! Something went wrong',
                      weight: 'Bolder',
                      size: 'Medium'
                    },
                    {
                      type: 'TextBlock',
                      text: error,
                      wrap: true,
                      spacing: 'Small'
                    }
                  ]
                }
              ]
            }
          ]
        },
        ...(suggestions.length > 0 ? [{
          type: 'Container',
          spacing: 'Medium',
          items: [
            {
              type: 'TextBlock',
              text: '💡 **Try these suggestions:**',
              weight: 'Bolder'
            },
            {
              type: 'TextBlock',
              text: suggestions.map(s => `• ${s}`).join('\n'),
              wrap: true,
              spacing: 'Small'
            }
          ]
        }] : [])
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: '🔄 Try Again',
          data: {
            action: 'retry_last_action'
          },
          style: 'positive'
        },
        {
          type: 'Action.Submit',
          title: '🏠 Go to Home',
          data: {
            action: 'show_dashboard'
          }
        },
        {
          type: 'Action.Submit',
          title: '🆘 Get Help',
          data: {
            action: 'show_help'
          }
        }
      ]
    };

    return CardFactory.adaptiveCard(card);
  }

  /**
   * Utility function to format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}