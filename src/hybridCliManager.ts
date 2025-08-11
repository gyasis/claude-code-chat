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
	color?: string;
}

export interface AgentInfo {
	name: string;
	description: string;
	category: 'development' | 'analysis' | 'security' | 'optimization' | 'documentation' | 'testing' | 'infrastructure' | 'custom';
	color: string;
	icon: string;
	isActive?: boolean;
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
	private knownAgents: Map<string, AgentInfo> = new Map();
	private readonly CACHE_TTL = 300000; // 5 minutes
	private readonly context: vscode.ExtensionContext;

	private constructor(context: vscode.ExtensionContext) {
		this.context = context;
		this.initializeKnownCommands();
		this.initializeKnownAgents();
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
	 * Initialize known agents with color coding based on function/psychology
	 */
	private initializeKnownAgents(): void {
		const knownAgents: AgentInfo[] = [
			// Security & Analysis Agents (Red/Orange tones - caution, authority)
			{ name: 'security-auditor', description: 'Security vulnerability analysis', category: 'security', color: '#FF6B6B', icon: '🛡️' },
			{ name: 'error-detective', description: 'Debug and troubleshoot issues', category: 'analysis', color: '#FF8E53', icon: '🔍' },
			{ name: 'incident-responder', description: 'Handle production incidents', category: 'security', color: '#D63031', icon: '🚨' },
			
			// Development Agents (Blue/Teal tones - logic, clarity, problem-solving)
			{ name: 'debugger', description: 'Debug code issues', category: 'development', color: '#4ECDC4', icon: '🐛' },
			{ name: 'code-reviewer', description: 'Review code quality', category: 'development', color: '#74B9FF', icon: '👀' },
			{ name: 'frontend-developer', description: 'Frontend development', category: 'development', color: '#00CEC9', icon: '🎨' },
			{ name: 'backend-architect', description: 'Backend architecture design', category: 'development', color: '#0984E3', icon: '🏗️' },
			{ name: 'python-pro', description: 'Python development expert', category: 'development', color: '#3F88C5', icon: '🐍' },
			{ name: 'javascript-pro', description: 'JavaScript development expert', category: 'development', color: '#F7DC6F', icon: '⚡' },
			{ name: 'cpp-pro', description: 'C++ development expert', category: 'development', color: '#6C5CE7', icon: '⚙️' },
			{ name: 'golang-pro', description: 'Go development expert', category: 'development', color: '#00D2D3', icon: '🐹' },
			{ name: 'rust-pro', description: 'Rust development expert', category: 'development', color: '#CE5A57', icon: '🦀' },
			
			// Testing & Quality (Green tones - success, validation, stability)
			{ name: 'test-automator', description: 'Automated testing', category: 'testing', color: '#55A3FF', icon: '🧪' },
			{ name: 'architect-reviewer', description: 'Architecture review', category: 'analysis', color: '#26DE81', icon: '🏛️' },
			
			// Documentation & Content (Yellow/Beige tones - clarity, communication)
			{ name: 'api-documenter', description: 'API documentation', category: 'documentation', color: '#FD79A8', icon: '📚' },
			{ name: 'content-marketer', description: 'Content creation', category: 'documentation', color: '#FDCB6E', icon: '✍️' },
			
			// Infrastructure & DevOps (Purple/Dark tones - system management, stability)
			{ name: 'devops-troubleshooter', description: 'DevOps and deployment', category: 'infrastructure', color: '#A29BFE', icon: '⚡' },
			{ name: 'cloud-architect', description: 'Cloud infrastructure', category: 'infrastructure', color: '#6C5CE7', icon: '☁️' },
			{ name: 'database-admin', description: 'Database administration', category: 'infrastructure', color: '#2D3436', icon: '🗄️' },
			{ name: 'network-engineer', description: 'Network configuration', category: 'infrastructure', color: '#636E72', icon: '🌐' },
			{ name: 'terraform-specialist', description: 'Infrastructure as Code', category: 'infrastructure', color: '#5F3DC4', icon: '🏗️' },
			
			// AI & Data (Cyan/Teal tones - intelligence, data processing)
			{ name: 'ai-engineer', description: 'AI/ML development', category: 'development', color: '#00CEC9', icon: '🤖' },
			{ name: 'ml-engineer', description: 'Machine learning', category: 'development', color: '#00B894', icon: '🧠' },
			{ name: 'data-scientist', description: 'Data analysis', category: 'analysis', color: '#0984E3', icon: '📊' },
			{ name: 'data-engineer', description: 'Data pipeline engineering', category: 'infrastructure', color: '#74B9FF', icon: '🔄' },
			
			// Optimization & Performance (Bright colors - energy, improvement)
			{ name: 'performance-engineer', description: 'Performance optimization', category: 'optimization', color: '#E17055', icon: '⚡' },
			{ name: 'database-optimizer', description: 'Database optimization', category: 'optimization', color: '#FDCB6E', icon: '🚀' },
			{ name: 'dx-optimizer', description: 'Developer experience', category: 'optimization', color: '#FD79A8', icon: '✨' },
			
			// Business & Support (Warm tones - communication, service)
			{ name: 'business-analyst', description: 'Business analysis', category: 'analysis', color: '#E84393', icon: '📈' },
			{ name: 'customer-support', description: 'Customer support', category: 'documentation', color: '#FFEAA7', icon: '💬' },
			{ name: 'legal-advisor', description: 'Legal compliance', category: 'documentation', color: '#DDA0DD', icon: '⚖️' },
			
			// Specialized Tools (Mixed bright colors)
			{ name: 'payment-integration', description: 'Payment systems', category: 'development', color: '#00B894', icon: '💳' },
			{ name: 'mobile-developer', description: 'Mobile app development', category: 'development', color: '#FF7675', icon: '📱' },
			{ name: 'legacy-modernizer', description: 'Legacy system updates', category: 'optimization', color: '#A29BFE', icon: '🔄' },
		];

		knownAgents.forEach(agent => {
			this.knownAgents.set(agent.name, agent);
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

	/**
	 * Get agent information by name
	 */
	public getAgentInfo(agentName: string): AgentInfo | undefined {
		return this.knownAgents.get(agentName);
	}

	/**
	 * Get all known agents
	 */
	public getAllAgents(): AgentInfo[] {
		return Array.from(this.knownAgents.values()).sort((a, b) => a.name.localeCompare(b.name));
	}

	/**
	 * Get agents by category
	 */
	public getAgentsByCategory(category: string): AgentInfo[] {
		return Array.from(this.knownAgents.values())
			.filter(agent => agent.category === category)
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	/**
	 * Detect if a command is likely invoking an agent
	 */
	public isAgentCommand(message: string): { isAgent: boolean; agentName?: string; agentInfo?: AgentInfo } {
		// Look for @agent-name patterns
		const agentMentionMatch = message.match(/@([a-z-]+)/);
		if (agentMentionMatch) {
			const agentName = agentMentionMatch[1];
			const agentInfo = this.knownAgents.get(agentName);
			if (agentInfo) {
				return { isAgent: true, agentName, agentInfo };
			}
		}

		// Look for agent-like keywords in the message
		const agentKeywords = Array.from(this.knownAgents.keys());
		for (const agentName of agentKeywords) {
			// Simple heuristic: if message contains agent name or related keywords
			if (message.toLowerCase().includes(agentName) || 
				message.toLowerCase().includes(agentName.replace('-', ' '))) {
				const agentInfo = this.knownAgents.get(agentName);
				return { isAgent: true, agentName, agentInfo };
			}
		}

		return { isAgent: false };
	}

	/**
	 * Get agent suggestions based on message content
	 */
	public suggestAgents(message: string): AgentInfo[] {
		const suggestions: AgentInfo[] = [];
		const messageLower = message.toLowerCase();

		// Keywords mapping for intelligent suggestions
		const keywordMapping = {
			'security': ['security-auditor', 'incident-responder'],
			'bug': ['debugger', 'error-detective'],
			'debug': ['debugger', 'error-detective'],
			'frontend': ['frontend-developer'],
			'backend': ['backend-architect'],
			'database': ['database-admin', 'database-optimizer'],
			'test': ['test-automator'],
			'deploy': ['devops-troubleshooter', 'cloud-architect'],
			'performance': ['performance-engineer'],
			'documentation': ['api-documenter', 'content-marketer'],
			'python': ['python-pro'],
			'javascript': ['javascript-pro'],
			'react': ['frontend-developer'],
			'api': ['backend-architect', 'api-documenter']
		};

		// Find matching agents based on keywords
		for (const [keyword, agents] of Object.entries(keywordMapping)) {
			if (messageLower.includes(keyword)) {
				agents.forEach(agentName => {
					const agentInfo = this.knownAgents.get(agentName);
					if (agentInfo && !suggestions.includes(agentInfo)) {
						suggestions.push(agentInfo);
					}
				});
			}
		}

		return suggestions.slice(0, 3); // Return top 3 suggestions
	}
}