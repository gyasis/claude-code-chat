/**
 * MCP Sync Manager - Core logic for syncing MCP servers between Claude CLI and VS Code extension
 * v1.0.7 - MCP Sync Feature
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { MCPServer, MCPSyncState, ClaudeCLIConfig, MCPSyncConfig, MCPServerStatus } from './types/mcp';

export class MCPSyncManager {
	private context: vscode.ExtensionContext;
	private syncState: MCPSyncState | null = null;
	private cliServers: MCPServer[] = [];
	private extensionServers: MCPServer[] = [];
	private refreshTimer: NodeJS.Timeout | null = null;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	/**
	 * Initialize the MCP sync manager
	 */
	public async initialize(): Promise<void> {
		console.log('Initializing MCP Sync Manager v1.0.7');
		
		// Load saved sync state
		await this.loadSyncState();
		
		// Load CLI servers
		await this.refreshCLIServers();
		
		// Load extension servers (existing functionality)
		await this.loadExtensionServers();
		
		// Set up auto-refresh if enabled
		this.setupAutoRefresh();
		
		console.log('MCP Sync Manager initialized', {
			cliServers: this.cliServers.length,
			extensionServers: this.extensionServers.length,
			syncAll: this.syncState?.syncAll || false
		});
	}

	/**
	 * Read Claude CLI configuration file
	 */
	private async readCLIConfig(): Promise<ClaudeCLIConfig | null> {
		try {
			const homeDir = process.env.HOME || process.env.USERPROFILE || '';
			const cliConfigPath = path.join(homeDir, '.claude', 'claude_config.json');
			
			console.log('Reading CLI config from:', cliConfigPath);
			
			if (!fs.existsSync(cliConfigPath)) {
				console.log('CLI config file not found');
				return null;
			}

			const configContent = fs.readFileSync(cliConfigPath, 'utf8');
			const config = JSON.parse(configContent) as ClaudeCLIConfig;
			
			console.log('CLI config loaded successfully', {
				mcpServerCount: Object.keys(config.mcpServers || {}).length
			});
			
			return config;
		} catch (error) {
			console.error('Error reading CLI config:', error);
			return null;
		}
	}

	/**
	 * Calculate hash of CLI config to detect changes
	 */
	private calculateConfigHash(config: ClaudeCLIConfig): string {
		const configStr = JSON.stringify(config.mcpServers || {}, null, 2);
		return crypto.createHash('md5').update(configStr).digest('hex');
	}

	/**
	 * Refresh CLI servers from configuration
	 */
	public async refreshCLIServers(): Promise<void> {
		console.log('Refreshing CLI servers...');
		
		const config = await this.readCLIConfig();
		if (!config || !config.mcpServers) {
			console.log('No CLI servers found');
			this.cliServers = [];
			return;
		}

		// Check if config has changed
		const newHash = this.calculateConfigHash(config);
		const hasChanged = this.syncState?.cliConfigHash !== newHash;
		
		if (hasChanged) {
			console.log('CLI config has changed, refreshing servers');
		}

		// Convert CLI config to MCPServer objects
		this.cliServers = Object.entries(config.mcpServers).map(([name, serverConfig]) => {
			const server: MCPServer = {
				name,
				command: serverConfig.command,
				args: serverConfig.args,
				env: serverConfig.env,
				source: 'cli',
				isActive: this.getServerActiveState(name)
			};
			return server;
		});

		// Update config hash in state
		if (this.syncState) {
			this.syncState.cliConfigHash = newHash;
			await this.saveSyncState();
		}

		console.log('CLI servers refreshed:', this.cliServers.length);
	}

	/**
	 * Get the active state for a server
	 */
	private getServerActiveState(serverName: string): boolean {
		if (!this.syncState) return false;
		
		// If sync all is enabled, all CLI servers are active
		if (this.syncState.syncAll) {
			return true;
		}
		
		// Check if server is in active list
		return this.syncState.activeCliServers.includes(serverName);
	}

	/**
	 * Toggle a CLI server's active state
	 */
	public async toggleServer(serverName: string, isActive: boolean): Promise<void> {
		console.log('Toggling server:', serverName, 'to', isActive);
		
		if (!this.syncState) {
			await this.initializeSyncState();
		}

		// Update server state
		if (isActive) {
			if (!this.syncState!.activeCliServers.includes(serverName)) {
				this.syncState!.activeCliServers.push(serverName);
			}
		} else {
			this.syncState!.activeCliServers = this.syncState!.activeCliServers.filter(
				name => name !== serverName
			);
		}

		// Update server states
		this.syncState!.serverStates[serverName] = {
			active: isActive,
			lastUsed: new Date().toISOString(),
			syncEnabled: true
		};

		// Update CLI servers active state
		const server = this.cliServers.find(s => s.name === serverName);
		if (server) {
			server.isActive = isActive;
		}

		await this.saveSyncState();
		console.log('Server toggle complete:', serverName, isActive);
	}

	/**
	 * Set sync all mode
	 */
	public async setSyncAll(enabled: boolean): Promise<void> {
		console.log('Setting sync all mode:', enabled);
		
		if (!this.syncState) {
			await this.initializeSyncState();
		}

		this.syncState!.syncAll = enabled;

		if (enabled) {
			// Add all CLI servers to active list
			this.syncState!.activeCliServers = this.cliServers.map(s => s.name);
			
			// Update all CLI servers to active
			this.cliServers.forEach(server => {
				server.isActive = true;
				this.syncState!.serverStates[server.name] = {
					active: true,
					lastUsed: new Date().toISOString(),
					syncEnabled: true
				};
			});
		} else {
			// Keep current individual selections
			this.cliServers.forEach(server => {
				server.isActive = this.syncState!.activeCliServers.includes(server.name);
			});
		}

		await this.saveSyncState();
		console.log('Sync all mode set:', enabled);
	}

	/**
	 * Get all servers (CLI + Extension) with their current status
	 */
	public getAllServers(): MCPServerStatus[] {
		const servers: MCPServerStatus[] = [];

		// Add CLI servers
		this.cliServers.forEach(server => {
			servers.push({
				name: server.name,
				isActive: server.isActive || false,
				source: 'cli',
				hasConflict: this.hasConflictWithExtension(server.name),
				lastSeen: this.syncState?.serverStates[server.name]?.lastUsed
			});
		});

		// Add extension servers
		this.extensionServers.forEach(server => {
			// Skip if already added as CLI server
			if (!servers.find(s => s.name === server.name)) {
				servers.push({
					name: server.name,
					isActive: server.isActive || false,
					source: 'extension',
					hasConflict: false,
					lastSeen: this.syncState?.serverStates[server.name]?.lastUsed
				});
			}
		});

		return servers;
	}

	/**
	 * Check if a server name conflicts with extension servers
	 */
	private hasConflictWithExtension(serverName: string): boolean {
		return this.extensionServers.some(s => s.name === serverName);
	}

	/**
	 * Load extension servers (existing functionality)
	 */
	private async loadExtensionServers(): Promise<void> {
		// This would integrate with existing extension MCP server logic
		// For now, initialize as empty array
		this.extensionServers = [];
		console.log('Extension servers loaded:', this.extensionServers.length);
	}

	/**
	 * Load sync state from VS Code storage
	 */
	private async loadSyncState(): Promise<void> {
		try {
			const savedState = this.context.workspaceState.get<MCPSyncState>('mcpSyncState');
			
			if (savedState && savedState.version) {
				this.syncState = savedState;
				console.log('Loaded sync state:', {
					version: savedState.version,
					syncAll: savedState.syncAll,
					activeServers: savedState.activeCliServers.length
				});
			} else {
				await this.initializeSyncState();
			}
		} catch (error) {
			console.error('Error loading sync state:', error);
			await this.initializeSyncState();
		}
	}

	/**
	 * Initialize default sync state
	 */
	private async initializeSyncState(): Promise<void> {
		this.syncState = {
			version: '1.0.7',
			activeCliServers: [],
			syncAll: false,
			lastSyncTime: new Date().toISOString(),
			serverStates: {},
			cliConfigHash: ''
		};
		
		await this.saveSyncState();
		console.log('Initialized default sync state');
	}

	/**
	 * Save sync state to VS Code storage
	 */
	public async saveSyncState(): Promise<void> {
		if (!this.syncState) return;
		
		this.syncState.lastSyncTime = new Date().toISOString();
		
		try {
			await this.context.workspaceState.update('mcpSyncState', this.syncState);
			console.log('Sync state saved');
		} catch (error) {
			console.error('Error saving sync state:', error);
		}
	}

	/**
	 * Setup auto-refresh timer
	 */
	private setupAutoRefresh(): void {
		const config = vscode.workspace.getConfiguration('claudeCodeChat');
		const autoRefresh = config.get<boolean>('mcp.autoRefresh', false);
		const intervalMs = config.get<number>('mcp.refreshIntervalMs', 30000);

		if (autoRefresh && !this.refreshTimer) {
			this.refreshTimer = setInterval(async () => {
				await this.refreshCLIServers();
			}, intervalMs);
			
			console.log('Auto-refresh enabled, interval:', intervalMs + 'ms');
		}
	}

	/**
	 * Get sync configuration
	 */
	public getSyncConfig(): MCPSyncConfig {
		const config = vscode.workspace.getConfiguration('claudeCodeChat');
		return {
			enabled: config.get<boolean>('mcp.syncEnabled', true),
			syncAll: this.syncState?.syncAll || false,
			selectedServers: this.syncState?.activeCliServers || [],
			cliConfigPath: config.get<string>('mcp.cliConfigPath', '~/.claude/claude_config.json'),
			autoRefresh: config.get<boolean>('mcp.autoRefresh', false),
			refreshIntervalMs: config.get<number>('mcp.refreshIntervalMs', 30000)
		};
	}

	/**
	 * Get current sync state for UI
	 */
	public getSyncState(): MCPSyncState | null {
		return this.syncState;
	}

	/**
	 * Cleanup resources
	 */
	public dispose(): void {
		if (this.refreshTimer) {
			clearInterval(this.refreshTimer);
			this.refreshTimer = null;
		}
		console.log('MCP Sync Manager disposed');
	}
}