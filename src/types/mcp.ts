/**
 * MCP (Model Context Protocol) type definitions for Claude Code Chat extension
 * v1.0.7 - MCP Sync Feature
 */

export interface MCPServer {
	name: string;
	command: string;
	args?: string[];
	env?: Record<string, string>;
	source: 'cli' | 'extension' | 'synced';
	isActive?: boolean;
	version?: string;
	description?: string;
}

export interface MCPSyncState {
	version: string;
	activeCliServers: string[];
	syncAll: boolean;
	lastSyncTime: string;
	serverStates: Record<string, { 
		active: boolean; 
		lastUsed?: string;
		syncEnabled?: boolean;
	}>;
	cliConfigHash?: string; // To detect CLI config changes
}

export interface ClaudeCLIConfig {
	mcpServers?: Record<string, {
		command: string;
		args?: string[];
		env?: Record<string, string>;
	}>;
	[key: string]: any; // Allow other CLI config properties
}

export interface MCPSyncConfig {
	enabled: boolean;
	syncAll: boolean;
	selectedServers: string[];
	cliConfigPath: string;
	autoRefresh: boolean;
	refreshIntervalMs: number;
}

export interface MCPServerStatus {
	name: string;
	isActive: boolean;
	source: 'cli' | 'extension' | 'synced';
	hasConflict: boolean;
	errorMessage?: string;
	lastSeen?: string;
}

export interface MCPSyncEvent {
	type: 'server_added' | 'server_removed' | 'server_updated' | 'sync_state_changed';
	serverName: string;
	data?: any;
}

export interface MCPConflictResolution {
	serverName: string;
	conflictType: 'name' | 'command' | 'args';
	cliConfig: MCPServer;
	extensionConfig: MCPServer;
	resolution: 'use_cli' | 'use_extension' | 'keep_both';
}