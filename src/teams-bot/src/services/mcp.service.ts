/**
 * MCP Service for Teams Bot
 * Author: Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import axios, { AxiosInstance } from 'axios';
import { LoggingService } from './logging.service';

export interface MCPToolRequest {
    name: string;
    arguments: Record<string, any>;
}

export interface MCPToolResponse {
    content: Array<{
        type: string;
        text: string;
    }>;
    isError?: boolean;
}

export interface VolumeInfo {
    id: string;
    name: string;
    size: number;
    usedSize: number;
    serviceLevel: string;
    state: string;
    mountPath: string;
    protocol: string;
    createdAt: string;
}

export interface PoolInfo {
    id: string;
    name: string;
    size: number;
    usedSize: number;
    serviceLevel: string;
    state: string;
    volumes: number;
    createdAt: string;
}

export interface SnapshotInfo {
    id: string;
    name: string;
    volumeId: string;
    size: number;
    createdAt: string;
    state: string;
}

export class MCPService {
    private client: AxiosInstance;
    private logger = LoggingService.getInstance();

    constructor(baseUrl: string) {
        this.client = axios.create({
            baseURL: baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'ANF-AIOps-Teams-Bot/1.0.0'
            }
        });

        // Add request interceptor for logging
        this.client.interceptors.request.use(
            (config) => {
                this.logger.debug('MCP request', {
                    method: config.method,
                    url: config.url,
                    data: config.data
                });
                return config;
            },
            (error) => {
                this.logger.error('MCP request error', { error });
                return Promise.reject(error);
            }
        );

        // Add response interceptor for logging
        this.client.interceptors.response.use(
            (response) => {
                this.logger.debug('MCP response', {
                    status: response.status,
                    data: response.data
                });
                return response;
            },
            (error) => {
                this.logger.error('MCP response error', {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message
                });
                return Promise.reject(error);
            }
        );
    }

    public async callTool(toolRequest: MCPToolRequest): Promise<MCPToolResponse> {
        try {
            const response = await this.client.post('/tools/call', {
                name: toolRequest.name,
                arguments: toolRequest.arguments
            });

            return response.data;
        } catch (error) {
            this.logger.error('Failed to call MCP tool', { error, toolRequest });
            throw new Error(`MCP tool call failed: ${error}`);
        }
    }

    // Volume operations
    public async listVolumes(): Promise<VolumeInfo[]> {
        const response = await this.callTool({
            name: 'anf_list_volumes',
            arguments: {}
        });

        return this.parseResponse<VolumeInfo[]>(response);
    }

    public async getVolume(volumeId: string): Promise<VolumeInfo> {
        const response = await this.callTool({
            name: 'anf_get_volume',
            arguments: { volume_id: volumeId }
        });

        return this.parseResponse<VolumeInfo>(response);
    }

    public async createVolume(options: {
        name: string;
        size: number;
        serviceLevel: string;
        protocol: string;
        subnetId: string;
        poolId: string;
    }): Promise<VolumeInfo> {
        const response = await this.callTool({
            name: 'anf_create_volume',
            arguments: {
                name: options.name,
                size_gb: options.size,
                service_level: options.serviceLevel,
                protocol: options.protocol,
                subnet_id: options.subnetId,
                pool_id: options.poolId
            }
        });

        return this.parseResponse<VolumeInfo>(response);
    }

    public async deleteVolume(volumeId: string): Promise<boolean> {
        const response = await this.callTool({
            name: 'anf_delete_volume',
            arguments: { volume_id: volumeId }
        });

        return this.parseResponse<boolean>(response);
    }

    public async resizeVolume(volumeId: string, newSize: number): Promise<VolumeInfo> {
        const response = await this.callTool({
            name: 'anf_resize_volume',
            arguments: {
                volume_id: volumeId,
                new_size_gb: newSize
            }
        });

        return this.parseResponse<VolumeInfo>(response);
    }

    // Pool operations
    public async listPools(): Promise<PoolInfo[]> {
        const response = await this.callTool({
            name: 'anf_list_pools',
            arguments: {}
        });

        return this.parseResponse<PoolInfo[]>(response);
    }

    public async getPool(poolId: string): Promise<PoolInfo> {
        const response = await this.callTool({
            name: 'anf_get_pool',
            arguments: { pool_id: poolId }
        });

        return this.parseResponse<PoolInfo>(response);
    }

    public async createPool(options: {
        name: string;
        size: number;
        serviceLevel: string;
        accountId: string;
    }): Promise<PoolInfo> {
        const response = await this.callTool({
            name: 'anf_create_pool',
            arguments: {
                name: options.name,
                size_gb: options.size,
                service_level: options.serviceLevel,
                account_id: options.accountId
            }
        });

        return this.parseResponse<PoolInfo>(response);
    }

    // Snapshot operations
    public async listSnapshots(volumeId?: string): Promise<SnapshotInfo[]> {
        const response = await this.callTool({
            name: 'anf_list_snapshots',
            arguments: volumeId ? { volume_id: volumeId } : {}
        });

        return this.parseResponse<SnapshotInfo[]>(response);
    }

    public async createSnapshot(volumeId: string, name: string): Promise<SnapshotInfo> {
        const response = await this.callTool({
            name: 'anf_create_snapshot',
            arguments: {
                volume_id: volumeId,
                name: name
            }
        });

        return this.parseResponse<SnapshotInfo>(response);
    }

    public async deleteSnapshot(snapshotId: string): Promise<boolean> {
        const response = await this.callTool({
            name: 'anf_delete_snapshot',
            arguments: { snapshot_id: snapshotId }
        });

        return this.parseResponse<boolean>(response);
    }

    // Monitoring operations
    public async getVolumeMetrics(volumeId: string, timeRange: string = '1h'): Promise<any> {
        const response = await this.callTool({
            name: 'anf_get_volume_metrics',
            arguments: {
                volume_id: volumeId,
                time_range: timeRange
            }
        });

        return this.parseResponse<any>(response);
    }

    public async checkVolumeHealth(volumeId: string): Promise<any> {
        const response = await this.callTool({
            name: 'anf_check_volume_health',
            arguments: { volume_id: volumeId }
        });

        return this.parseResponse<any>(response);
    }

    // Security operations
    public async getSecurityAuditLog(startTime: string, endTime: string): Promise<any> {
        const response = await this.callTool({
            name: 'anf_get_security_audit_log',
            arguments: {
                start_time: startTime,
                end_time: endTime
            }
        });

        return this.parseResponse<any>(response);
    }

    public async scanVulnerabilities(): Promise<any> {
        const response = await this.callTool({
            name: 'anf_scan_vulnerabilities',
            arguments: {}
        });

        return this.parseResponse<any>(response);
    }

    private parseResponse<T>(response: MCPToolResponse): T {
        if (response.isError) {
            throw new Error(`MCP tool error: ${response.content[0]?.text || 'Unknown error'}`);
        }

        const textContent = response.content[0]?.text;
        if (!textContent) {
            throw new Error('Empty response from MCP tool');
        }

        try {
            return JSON.parse(textContent);
        } catch (error) {
            this.logger.error('Failed to parse MCP response', { error, textContent });
            throw new Error('Invalid JSON response from MCP tool');
        }
    }
}