import { NetAppManagementClient } from '@azure/arm-netapp';
import { TokenCredential } from '@azure/core-auth';
import { Logger } from 'winston';
import { Config } from '../config/index.js';

export interface ToolContext {
  args: any;
  netAppClient: NetAppManagementClient;
  credential: TokenCredential;
  config: Config;
  logger: Logger;
}

export interface ToolValidation {
  valid: boolean;
  error?: string;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  validate?: (args: any) => ToolValidation;
  handler: (context: ToolContext) => Promise<any>;
}