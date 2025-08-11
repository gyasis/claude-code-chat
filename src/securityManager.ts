/**
 * SecurityManager - Enhanced permission system for Claude Code Chat
 * Handles file access permissions, path validation, and audit logging
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { minimatch } from 'minimatch';
import {
	SecurityPermission,
	PermissionRequest,
	PermissionResponse,
	SecuritySettings,
	PermissionAuditEntry,
	PathValidationResult,
	SecurityManagerOptions,
	SecurityError,
	SecurityErrorCodes,
	SecurityLevel,
	PermissionType,
	PermissionScope
} from './types/security';

export class SecurityManager {
	private workspaceRoot: string;
	private context: vscode.ExtensionContext;
	private settings: SecuritySettings;
	private sessionPermissions: Map<string, SecurityPermission> = new Map();
	private outputChannel: vscode.OutputChannel;
	
	private readonly STORAGE_KEY_PERMISSIONS = 'claudeCodeChat.permissions';
	private readonly SAFE_PATHS = [
		'~/.bashrc',
		'~/.bash_profile',
		'~/.zshrc',
		'~/.profile',
		'~/.*rc',
		'**/package.json',
		'**/tsconfig.json',
		'**/package-lock.json',
		'**/yarn.lock',
		'**/.gitignore',
		'**/.env.example'
	];

	constructor(options: SecurityManagerOptions) {
		this.workspaceRoot = options.workspaceRoot;
		this.context = options.extensionContext;
		this.settings = options.settings;
		this.outputChannel = vscode.window.createOutputChannel('Claude Code Chat Security');
		
		this.loadStoredPermissions();
		this.setupCleanupTimer();
	}

	/**
	 * Main entry point for requesting file access permission
	 */
	public async requestPermission(request: PermissionRequest): Promise<boolean> {
		const auditEntry: PermissionAuditEntry = {
			timestamp: new Date(),
			filePath: request.filePath,
			permissionType: request.permissionType,
			granted: false,
			reason: request.reason,
			requestedBy: request.requestedBy,
			sessionId: this.context.globalState.get('sessionId')
		};

		try {
			// Validate path first
			const validation = await this.validatePath(request.filePath);
			if (!validation.isValid) {
				throw new SecurityError(
					`Invalid path: ${validation.warnings.join(', ')}`,
					SecurityErrorCodes.INVALID_PATH,
					request.filePath,
					request.permissionType
				);
			}

			// Check if already within workspace (always allowed)
			if (validation.inWorkspace) {
				auditEntry.granted = true;
				auditEntry.userResponse = 'auto-granted (workspace)';
				this.logAuditEntry(auditEntry);
				return true;
			}

			// Check security level
			if (this.settings.permissionLevel === 'workspace-only') {
				throw new SecurityError(
					'Access denied: Security level is set to workspace-only',
					SecurityErrorCodes.ACCESS_DENIED,
					request.filePath,
					request.permissionType
				);
			}

			// Check if path is explicitly denied
			if (validation.matchesDeniedPattern) {
				throw new SecurityError(
					`Access denied: Path matches denied pattern: ${validation.matchesDeniedPattern}`,
					SecurityErrorCodes.ACCESS_DENIED,
					request.filePath,
					request.permissionType
				);
			}

			// Check if already granted
			const existingPermission = this.findExistingPermission(request.filePath, request.permissionType);
			if (existingPermission && !this.isPermissionExpired(existingPermission)) {
				auditEntry.granted = true;
				auditEntry.userResponse = 'auto-granted (existing permission)';
				this.logAuditEntry(auditEntry);
				return true;
			}

			// Check allowed patterns
			if (validation.matchesAllowedPattern) {
				const permission = this.createPermission(request, 'workspace', false);
				this.storePermission(permission);
				auditEntry.granted = true;
				auditEntry.userResponse = `auto-granted (allowed pattern: ${validation.matchesAllowedPattern})`;
				this.logAuditEntry(auditEntry);
				return true;
			}

			// Check safe paths (if enabled)
			if (this.settings.autoGrantSafePaths && this.isSafePath(request.filePath)) {
				const permission = this.createPermission(request, 'session', true);
				this.sessionPermissions.set(this.getPermissionKey(request.filePath, request.permissionType), permission);
				auditEntry.granted = true;
				auditEntry.userResponse = 'auto-granted (safe path)';
				this.logAuditEntry(auditEntry);
				return true;
			}

			// For danger mode, auto-grant everything with warning
			if (this.settings.permissionLevel === 'danger-mode') {
				const permission = this.createPermission(request, 'session', true);
				this.sessionPermissions.set(this.getPermissionKey(request.filePath, request.permissionType), permission);
				auditEntry.granted = true;
				auditEntry.userResponse = 'auto-granted (danger mode)';
				this.logAuditEntry(auditEntry);
				
				// Show warning
				vscode.window.showWarningMessage(
					`⚠️ DANGER MODE: Auto-granted access to ${request.filePath}. Security is disabled!`,
					'Disable Danger Mode'
				).then(response => {
					if (response === 'Disable Danger Mode') {
						vscode.workspace.getConfiguration('claudeCodeChat').update(
							'security.permissionLevel', 
							'contextual', 
							vscode.ConfigurationTarget.Workspace
						);
					}
				});
				
				return true;
			}

			// Show permission dialog for interactive approval
			const response = await this.showPermissionDialog(request, validation);
			auditEntry.granted = response.granted;
			auditEntry.userResponse = response.granted ? `granted (${response.scope})` : 'denied by user';
			auditEntry.duration = response.duration;
			
			if (response.granted && response.scope) {
				const permission = this.createPermission(request, response.scope, false);
				if (response.scope === 'session') {
					this.sessionPermissions.set(this.getPermissionKey(request.filePath, request.permissionType), permission);
				} else {
					this.storePermission(permission);
				}
			}

			this.logAuditEntry(auditEntry);
			return response.granted;

		} catch (error) {
			auditEntry.granted = false;
			auditEntry.userResponse = `error: ${error instanceof Error ? error.message : 'Unknown error'}`;
			this.logAuditEntry(auditEntry);
			
			if (error instanceof SecurityError) {
				throw error;
			}
			
			throw new SecurityError(
				`Permission check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				SecurityErrorCodes.UNSAFE_OPERATION,
				request.filePath,
				request.permissionType
			);
		}
	}

	/**
	 * Validate and sanitize a file path
	 */
	public async validatePath(filePath: string): Promise<PathValidationResult> {
		const warnings: string[] = [];
		let normalizedPath: string;

		try {
			// Expand home directory
			if (filePath.startsWith('~')) {
				const os = require('os');
				normalizedPath = filePath.replace('~', os.homedir());
			} else {
				normalizedPath = filePath;
			}

			// Resolve to absolute path and normalize
			normalizedPath = path.resolve(normalizedPath);
			
			// Check for path traversal attempts
			if (filePath.includes('..') || filePath.includes('./') || filePath.includes('.\\')) {
				warnings.push('Path contains potentially dangerous traversal sequences');
			}

			// Check for suspicious characters
			const suspiciousChars = /[<>:"|?*\x00-\x1f]/;
			if (suspiciousChars.test(filePath)) {
				warnings.push('Path contains suspicious characters');
			}

			// Check if path exists and get type
			let exists = false;
			let type: 'file' | 'directory' | 'symlink' | 'other' | undefined;
			
			try {
				const stats = await fs.promises.lstat(normalizedPath);
				exists = true;
				if (stats.isFile()) {
					type = 'file';
				} else if (stats.isDirectory()) {
					type = 'directory';
				} else if (stats.isSymbolicLink()) {
					type = 'symlink';
					warnings.push('Path is a symbolic link');
				} else {
					type = 'other';
					warnings.push('Path is not a regular file or directory');
				}
			} catch {
				// Path doesn't exist, which is fine for some operations
			}

			// Check if within workspace
			const inWorkspace = normalizedPath.startsWith(this.workspaceRoot);

			// Check against allowed patterns
			let matchesAllowedPattern: string | undefined;
			for (const pattern of this.settings.allowedPaths) {
				if (minimatch(normalizedPath, pattern) || minimatch(filePath, pattern)) {
					matchesAllowedPattern = pattern;
					break;
				}
			}

			// Check against denied patterns
			let matchesDeniedPattern: string | undefined;
			for (const pattern of this.settings.deniedPaths) {
				if (minimatch(normalizedPath, pattern) || minimatch(filePath, pattern)) {
					matchesDeniedPattern = pattern;
					break;
				}
			}

			return {
				isValid: warnings.length === 0,
				normalizedPath,
				exists,
				type,
				warnings,
				inWorkspace,
				matchesAllowedPattern,
				matchesDeniedPattern
			};

		} catch (error) {
			warnings.push(`Path validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			return {
				isValid: false,
				normalizedPath: filePath,
				exists: false,
				warnings,
				inWorkspace: false
			};
		}
	}

	/**
	 * Show interactive permission dialog
	 */
	private async showPermissionDialog(request: PermissionRequest, validation: PathValidationResult): Promise<PermissionResponse> {
		const items = [
			{ label: '🔒 Allow Once', description: 'Grant access for this single operation', scope: 'once' as PermissionScope },
			{ label: '⏱️ Allow for Session', description: 'Grant access until VS Code restarts', scope: 'session' as PermissionScope },
			{ label: '💾 Allow for Workspace', description: 'Remember this decision for this workspace', scope: 'workspace' as PermissionScope },
			{ label: '❌ Deny', description: 'Deny access and block this operation', scope: null }
		];

		// Create rich dialog message
		let message = `🔐 **Permission Request**\n\n`;
		message += `**Path:** \`${request.filePath}\`\n`;
		message += `**Operation:** ${request.permissionType}\n`;
		message += `**Reason:** ${request.reason}\n`;
		message += `**Requested by:** ${request.requestedBy}\n`;
		
		if (validation.warnings.length > 0) {
			message += `\n⚠️ **Warnings:**\n${validation.warnings.map(w => `• ${w}`).join('\n')}\n`;
		}

		// Add file preview if enabled and file exists
		if (this.settings.showFilePreview && validation.exists && validation.type === 'file' && request.permissionType === 'read') {
			try {
				const stats = await fs.promises.stat(validation.normalizedPath);
				if (stats.size <= this.settings.maxPreviewSize) {
					const content = await fs.promises.readFile(validation.normalizedPath, 'utf8');
					const preview = content.substring(0, 500);
					message += `\n📄 **File Preview:**\n\`\`\`\n${preview}${content.length > 500 ? '\n... (truncated)' : ''}\n\`\`\`\n`;
				} else {
					message += `\n📄 **File Info:** ${(stats.size / 1024).toFixed(1)}KB (too large to preview)\n`;
				}
			} catch {
				// Ignore preview errors
			}
		}

		// Show the quick pick
		const selected = await vscode.window.showQuickPick(items, {
			title: 'Claude Code Chat - Permission Request',
			placeHolder: 'Choose how to respond to this permission request',
			ignoreFocusOut: true
		});

		if (!selected || !selected.scope) {
			return { granted: false, denyReason: 'User denied permission' };
		}

		return {
			granted: true,
			scope: selected.scope,
			duration: selected.scope === 'session' ? this.settings.sessionTimeout : undefined
		};
	}

	/**
	 * Helper methods
	 */
	private isSafePath(filePath: string): boolean {
		return this.SAFE_PATHS.some(pattern => minimatch(filePath, pattern));
	}

	private findExistingPermission(filePath: string, permissionType: PermissionType): SecurityPermission | undefined {
		const key = this.getPermissionKey(filePath, permissionType);
		
		// Check session permissions first
		const sessionPerm = this.sessionPermissions.get(key);
		if (sessionPerm) return sessionPerm;

		// Check stored permissions
		const stored = this.context.workspaceState.get<SecurityPermission[]>(this.STORAGE_KEY_PERMISSIONS, []);
		return stored.find(p => 
			p.filePath === filePath && 
			p.permissionType === permissionType
		);
	}

	private isPermissionExpired(permission: SecurityPermission): boolean {
		if (!permission.expiration) return false;
		return new Date() > permission.expiration;
	}

	private createPermission(request: PermissionRequest, scope: PermissionScope, autoGranted: boolean): SecurityPermission {
		const permission: SecurityPermission = {
			filePath: request.filePath,
			permissionType: request.permissionType,
			scope,
			reason: request.reason,
			grantedAt: new Date(),
			autoGranted
		};

		if (scope === 'session') {
			permission.expiration = new Date(Date.now() + this.settings.sessionTimeout);
		}

		return permission;
	}

	private getPermissionKey(filePath: string, permissionType: PermissionType): string {
		return `${filePath}:${permissionType}`;
	}

	private storePermission(permission: SecurityPermission): void {
		const stored = this.context.workspaceState.get<SecurityPermission[]>(this.STORAGE_KEY_PERMISSIONS, []);
		stored.push(permission);
		this.context.workspaceState.update(this.STORAGE_KEY_PERMISSIONS, stored);
	}

	private loadStoredPermissions(): void {
		// Session permissions are always empty on startup
		this.sessionPermissions.clear();
	}

	private setupCleanupTimer(): void {
		// Clean up expired permissions every hour
		setInterval(() => {
			this.cleanupExpiredPermissions();
		}, 60 * 60 * 1000);
	}

	private cleanupExpiredPermissions(): void {
		// Clean session permissions
		for (const [key, permission] of this.sessionPermissions) {
			if (this.isPermissionExpired(permission)) {
				this.sessionPermissions.delete(key);
			}
		}

		// Clean stored permissions
		const stored = this.context.workspaceState.get<SecurityPermission[]>(this.STORAGE_KEY_PERMISSIONS, []);
		const cleaned = stored.filter(p => !this.isPermissionExpired(p));
		if (cleaned.length !== stored.length) {
			this.context.workspaceState.update(this.STORAGE_KEY_PERMISSIONS, cleaned);
		}
	}

	private logAuditEntry(entry: PermissionAuditEntry): void {
		if (!this.settings.auditLog) return;

		const logMessage = `[${entry.timestamp.toISOString()}] ${entry.granted ? 'GRANTED' : 'DENIED'} - ${entry.permissionType} access to ${entry.filePath} - Reason: ${entry.reason} - Response: ${entry.userResponse || 'none'}`;
		
		this.outputChannel.appendLine(logMessage);
		console.log(`[Claude Code Chat Security] ${logMessage}`);
	}

	/**
	 * Public methods for managing permissions
	 */
	public clearSessionPermissions(): void {
		this.sessionPermissions.clear();
		this.logAuditEntry({
			timestamp: new Date(),
			filePath: '*',
			permissionType: 'read',
			granted: false,
			reason: 'Session permissions cleared',
			requestedBy: 'user'
		});
	}

	public clearAllPermissions(): void {
		this.sessionPermissions.clear();
		this.context.workspaceState.update(this.STORAGE_KEY_PERMISSIONS, []);
		this.logAuditEntry({
			timestamp: new Date(),
			filePath: '*',
			permissionType: 'read',
			granted: false,
			reason: 'All permissions cleared',
			requestedBy: 'user'
		});
	}

	public getActivePermissions(): SecurityPermission[] {
		const session = Array.from(this.sessionPermissions.values());
		const stored = this.context.workspaceState.get<SecurityPermission[]>(this.STORAGE_KEY_PERMISSIONS, []);
		return [...session, ...stored].filter(p => !this.isPermissionExpired(p));
	}

	public updateSettings(newSettings: Partial<SecuritySettings>): void {
		this.settings = { ...this.settings, ...newSettings };
		
		// If security level changed to more restrictive, clear permissions
		if (newSettings.permissionLevel === 'workspace-only') {
			this.clearAllPermissions();
		}
	}

	public dispose(): void {
		this.outputChannel.dispose();
	}
}