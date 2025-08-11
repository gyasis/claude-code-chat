/**
 * Hybrid CLI Command Manager for Claude Code Chat
 * 
 * Provides seamless fallback system for Claude CLI commands:
 * - Auto-detects available CLI commands
 * - Routes known commands to UI, unknown to terminal
 * - Future-proof against CLI updates
 * 
 * @version 1.1.0.a
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CommandInfo {
	name: string;
	description: string;
	hasUIHandler: boolean;
	minVersion?: string;
	requiresCLI: boolean;
	category: 'core' | 'project' | 'system' | 'unknown';
	icon?: string;
}

export interface CLICapabilities {
	path: string;
	version: string;
	availableCommands: Set<string>;
	lastDetected: number;
	isValid: boolean;
}

export class HybridCliManager {
	private static instance: HybridCliManager;
	private cliCapabilities: CLICapabilities | null = null;
	private knownCommands: Map<string, CommandInfo> = new Map();
	private readonly CACHE_TTL = 300000; // 5 minutes
	private readonly context: vscode.ExtensionContext;

	private constructor(context: vscode.ExtensionContext) {
		this.context = context;
		this.initializeKnownCommands();
	}

	public static getInstance(context?: vscode.ExtensionContext): HybridCliManager {
		if (!HybridCliManager.instance) {
			if (!context) {
				throw new Error('Context required for first initialization');
			}
			HybridCliManager.instance = new HybridCliManager(context);
		}
		return HybridCliManager.instance;
	}

	/**
	 * Initialize the static list of known commands with UI handlers
	 */
	private initializeKnownCommands(): void {
		const knownCommands: CommandInfo[] = [
			// Commands with existing UI handlers
			{ name: 'bug', description: 'Report bugs (sends conversation to Anthropic)', hasUIHandler: true, requiresCLI: true, category: 'system', icon: '🐛' },
			{ name: 'clear', description: 'Clear conversation history', hasUIHandler: true, requiresCLI: true, category: 'core', icon: '🗑️' },
			{ name: 'compact', description: 'Compact conversation with optional focus instructions', hasUIHandler: true, requiresCLI: true, category: 'core', icon: '📦' },
			{ name: 'config', description: 'View/modify configuration', hasUIHandler: true, requiresCLI: true, category: 'system', icon: '⚙️' },
			{ name: 'cost', description: 'Show token usage statistics', hasUIHandler: true, requiresCLI: true, category: 'system', icon: '💰' },
			{ name: 'doctor', description: 'Checks the health of your Claude Code installation', hasUIHandler: true, requiresCLI: true, category: 'system', icon: '🩺' },
			{ name: 'help', description: 'Get usage help', hasUIHandler: true, requiresCLI: true, category: 'core', icon: '❓' },
			{ name: 'init', description: 'Initialize project with CLAUDE.md guide', hasUIHandler: true, requiresCLI: true, category: 'project', icon: '🚀' },
			{ name: 'login', description: 'Switch Anthropic accounts', hasUIHandler: true, requiresCLI: true, category: 'system', icon: '🔑' },
			{ name: 'logout', description: 'Sign out from your Anthropic account', hasUIHandler: true, requiresCLI: true, category: 'system', icon: '🚪' },
			{ name: 'mcp', description: 'Manage MCP server connections and OAuth authentication', hasUIHandler: true, requiresCLI: true, category: 'system', icon: '🔌' },
			{ name: 'memory', description: 'Edit CLAUDE.md memory files', hasUIHandler: true, requiresCLI: true, category: 'project', icon: '🧠' },
			{ name: 'model', description: 'Select or change the AI model', hasUIHandler: true, requiresCLI: true, category: 'system', icon: '🤖' },
			{ name: 'permissions', description: 'View or update permissions', hasUIHandler: true, requiresCLI: true, category: 'system', icon: '🔒' },
			{ name: 'pr_comments', description: 'View pull request comments', hasUIHandler: true, requiresCLI: true, category: 'project', icon: '💬' },
			{ name: 'review', description: 'Request code review', hasUIHandler: true, requiresCLI: true, category: 'project', icon: '👀' },
			{ name: 'status', description: 'View account and system statuses', hasUIHandler: true, requiresCLI: true, category: 'system', icon: '📊' },
			{ name: 'terminal-setup', description: 'Install Shift+Enter key binding for newlines', hasUIHandler: true, requiresCLI: true, category: 'system', icon: '⌨️' },
			{ name: 'vim', description: 'Enter vim mode for alternating insert and command modes', hasUIHandler: true, requiresCLI: true, category: 'system', icon: '📝' },
			
			// Commands that might exist in newer CLI versions (will be auto-detected)
			{ name: 'agents', description: 'Manage custom AI subagents for specialized tasks', hasUIHandler: false, requiresCLI: true, category: 'core', icon: '👥' },
			{ name: 'add-dir', description: 'Add additional working directories', hasUIHandler: false, requiresCLI: true, category: 'project', icon: '📁' }
		];

		knownCommands.forEach(cmd => {
			this.knownCommands.set(cmd.name, cmd);
		});
	}

	/**
	 * Detect Claude CLI capabilities including available commands
	 */
	public async detectCLICapabilities(): Promise<CLICapabilities | null> {
		try {
			// Check cache first
			if (this.cliCapabilities && 
				Date.now() - this.cliCapabilities.lastDetected < this.CACHE_TTL &&
				this.cliCapabilities.isValid) {
				return this.cliCapabilities;
			}

			const claudePath = await this.resolveClaudePath();
			if (!claudePath) {
				console.warn('Claude CLI not found');
				return null;
			}

			// Get version
			const versionResult = await this.executeWithTimeout(`"${claudePath}" --version`, 5000);
			const version = versionResult.stdout?.trim() || 'unknown';

			// Get available commands from help
			const helpResult = await this.executeWithTimeout(`"${claudePath}" --help`, 5000);
			const availableCommands = this.parseCommandsFromHelp(helpResult.stdout);

			const capabilities: CLICapabilities = {
				path: claudePath,
				version,
				availableCommands,
				lastDetected: Date.now(),
				isValid: true
			};

			this.cliCapabilities = capabilities;
			console.log(`Detected Claude CLI v${version} with ${availableCommands.size} commands`);
			
			return capabilities;

		} catch (error) {
			console.error('Failed to detect CLI capabilities:', error);
			return null;
		}
	}

	/**
	 * Resolve Claude CLI path using multiple strategies
	 */
	private async resolveClaudePath(): Promise<string | null> {
		const config = vscode.workspace.getConfiguration('claudeCodeChat');
		const wslEnabled = config.get<boolean>('wsl.enabled', false);
		
		if (wslEnabled) {
			const wslClaudePath = config.get<string>('wsl.claudePath', '/usr/local/bin/claude');
			return wslClaudePath;
		}

		// Try multiple common paths
		const commonPaths = [
			'/usr/local/bin/claude',
			'/usr/bin/claude',
			'claude' // Try PATH
		];

		for (const claudePath of commonPaths) {
			try {
				await execAsync(`which "${claudePath}"`);
				return claudePath;
			} catch {
				// Continue to next path
			}
		}

		return null;
	}

	/**
	 * Execute command with timeout
	 */
	private async executeWithTimeout(command: string, timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
		return Promise.race([
			execAsync(command),
			new Promise<never>((_, reject) => 
				setTimeout(() => reject(new Error('Command timeout')), timeoutMs)
			)
		]);
	}

	/**
	 * Parse available commands from CLI help output
	 */
	private parseCommandsFromHelp(helpOutput: string): Set<string> {
		const commands = new Set<string>();
		
		// Look for patterns like "/command" or "claude command"
		const commandPatterns = [
			/\/(\w+)/g,  // /command format
			/^\s+(\w+)\s+/gm,  // indented command format
		];

		for (const pattern of commandPatterns) {
			let match;
			while ((match = pattern.exec(helpOutput)) !== null) {
				const commandName = match[1];
				if (commandName && commandName.length > 1) {
					commands.add(commandName);
				}
			}
		}

		// Remove common false positives
		const falsePositives = ['help', 'version', 'usage', 'options', 'examples'];
		falsePositives.forEach(fp => commands.delete(fp));

		return commands;
	}

	/**
	 * Determine how to route a command
	 */
	public async routeCommand(commandName: string): Promise<{
		handler: 'ui' | 'terminal' | 'error';
		reason: string;
		commandInfo?: CommandInfo;
		fallbackAvailable?: boolean;
	}> {
		// Ensure we have fresh CLI capabilities
		const capabilities = await this.detectCLICapabilities();

		const knownCommand = this.knownCommands.get(commandName);
		
		if (knownCommand) {
			// Known command - check if CLI supports it
			if (knownCommand.requiresCLI && capabilities && !capabilities.availableCommands.has(commandName)) {
				return {
					handler: 'error',
					reason: `Command /${commandName} requires Claude CLI but is not available in version ${capabilities.version}`,
					commandInfo: knownCommand,
					fallbackAvailable: false
				};
			}

			return {
				handler: knownCommand.hasUIHandler ? 'ui' : 'terminal',
				reason: `Known command routed to ${knownCommand.hasUIHandler ? 'UI handler' : 'terminal'}`,
				commandInfo: knownCommand,
				fallbackAvailable: knownCommand.hasUIHandler
			};
		}

		// Unknown command - check if CLI supports it
		if (capabilities && capabilities.availableCommands.has(commandName)) {
			// Create dynamic command info
			const dynamicCommand: CommandInfo = {
				name: commandName,
				description: `Dynamic command from Claude CLI v${capabilities.version}`,
				hasUIHandler: false,
				requiresCLI: true,
				category: 'unknown',
				icon: '⚡'
			};

			return {
				handler: 'terminal',
				reason: `Unknown command found in CLI capabilities`,
				commandInfo: dynamicCommand,
				fallbackAvailable: false
			};
		}

		return {
			handler: 'error',
			reason: `Unknown command: /${commandName}`,
			fallbackAvailable: false
		};
	}

	/**
	 * Get all available commands (known + detected)
	 */
	public async getAllCommands(): Promise<CommandInfo[]> {
		const capabilities = await this.detectCLICapabilities();
		const allCommands = new Map<string, CommandInfo>();

		// Add known commands
		this.knownCommands.forEach((cmd, name) => {
			allCommands.set(name, cmd);
		});

		// Add dynamically detected commands
		if (capabilities) {
			capabilities.availableCommands.forEach(cmdName => {
				if (!allCommands.has(cmdName)) {
					allCommands.set(cmdName, {
						name: cmdName,
						description: `Command from Claude CLI v${capabilities.version}`,
						hasUIHandler: false,
						requiresCLI: true,
						category: 'unknown',
						icon: '⚡'
					});
				}
			});
		}

		return Array.from(allCommands.values()).sort((a, b) => a.name.localeCompare(b.name));
	}

	/**
	 * Check if CLI is available and working
	 */
	public async isCliAvailable(): Promise<boolean> {
		const capabilities = await this.detectCLICapabilities();
		return capabilities !== null && capabilities.isValid;
	}

	/**
	 * Get CLI information for debugging
	 */
	public getCLIInfo(): CLICapabilities | null {
		return this.cliCapabilities;
	}
}