/**
 * Security Permission Types for Claude Code Chat Extension
 * v2.0 - Enhanced Security Permission System
 */

export type PermissionType = 'read' | 'write' | 'execute';
export type PermissionScope = 'once' | 'session' | 'workspace' | 'global';
export type SecurityLevel = 'workspace-only' | 'contextual' | 'session-override' | 'workspace-override' | 'danger-mode';

export interface SecurityPermission {
	/** Absolute path to the file or directory */
	filePath: string;
	
	/** Type of permission requested */
	permissionType: PermissionType;
	
	/** How long this permission should last */
	scope: PermissionScope;
	
	/** When this permission expires (for session/timed permissions) */
	expiration?: Date;
	
	/** Human-readable reason for the permission request */
	reason: string;
	
	/** When this permission was granted */
	grantedAt: Date;
	
	/** User who granted the permission */
	grantedBy?: string;
	
	/** Whether this permission was granted automatically via settings */
	autoGranted?: boolean;
}

export interface PermissionRequest {
	/** Absolute path to the file or directory */
	filePath: string;
	
	/** Type of permission requested */
	permissionType: PermissionType;
	
	/** Human-readable reason for the permission request */
	reason: string;
	
	/** Tool or component requesting access */
	requestedBy: string;
	
	/** Optional context about what operation triggered this */
	context?: string;
	
	/** Whether this is a critical operation that can't proceed without permission */
	required?: boolean;
}

export interface PermissionResponse {
	/** Whether permission was granted */
	granted: boolean;
	
	/** Scope of the permission if granted */
	scope?: PermissionScope;
	
	/** How long the permission should last */
	duration?: number;
	
	/** Whether to remember this decision for similar requests */
	remember?: boolean;
	
	/** User-provided reason for denial (if applicable) */
	denyReason?: string;
}

export interface SecuritySettings {
	/** Current security level */
	permissionLevel: SecurityLevel;
	
	/** Glob patterns for always-allowed paths */
	allowedPaths: string[];
	
	/** Glob patterns for always-denied paths */
	deniedPaths: string[];
	
	/** Whether to log all permission attempts */
	auditLog: boolean;
	
	/** Session timeout in milliseconds */
	sessionTimeout: number;
	
	/** Whether to show file previews in permission dialogs */
	showFilePreview: boolean;
	
	/** Maximum file size to preview (in bytes) */
	maxPreviewSize: number;
	
	/** Whether to auto-grant permissions for common safe paths */
	autoGrantSafePaths: boolean;
}

export interface PermissionAuditEntry {
	/** Timestamp of the permission attempt */
	timestamp: Date;
	
	/** File path that was requested */
	filePath: string;
	
	/** Type of permission requested */
	permissionType: PermissionType;
	
	/** Whether permission was granted */
	granted: boolean;
	
	/** Reason for the request */
	reason: string;
	
	/** Tool or component that requested access */
	requestedBy: string;
	
	/** User response (if interactive) */
	userResponse?: string;
	
	/** IP address or session identifier */
	sessionId?: string;
	
	/** Duration the permission was granted for */
	duration?: number;
}

export interface PathValidationResult {
	/** Whether the path is valid and safe */
	isValid: boolean;
	
	/** Normalized absolute path */
	normalizedPath: string;
	
	/** Whether the path exists */
	exists: boolean;
	
	/** Type of file system object */
	type?: 'file' | 'directory' | 'symlink' | 'other';
	
	/** Any security warnings */
	warnings: string[];
	
	/** Whether the path is within workspace */
	inWorkspace: boolean;
	
	/** Whether the path matches any allowed patterns */
	matchesAllowedPattern?: string;
	
	/** Whether the path matches any denied patterns */
	matchesDeniedPattern?: string;
}

export interface SecurityManagerOptions {
	/** VS Code workspace root */
	workspaceRoot: string;
	
	/** Extension context for storing permissions */
	extensionContext: any;
	
	/** Security settings */
	settings: SecuritySettings;
	
	/** Callback for showing permission dialogs */
	showPermissionDialog?: (request: PermissionRequest) => Promise<PermissionResponse>;
	
	/** Callback for logging audit entries */
	logAuditEntry?: (entry: PermissionAuditEntry) => void;
}

export class SecurityError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly filePath?: string,
		public readonly permissionType?: PermissionType
	) {
		super(message);
		this.name = 'SecurityError';
	}
}

// Common security error codes
export const SecurityErrorCodes = {
	ACCESS_DENIED: 'ACCESS_DENIED',
	INVALID_PATH: 'INVALID_PATH',
	PATH_TRAVERSAL: 'PATH_TRAVERSAL',
	PERMISSION_EXPIRED: 'PERMISSION_EXPIRED',
	UNSAFE_OPERATION: 'UNSAFE_OPERATION',
	USER_DENIED: 'USER_DENIED',
	SETTINGS_OVERRIDE: 'SETTINGS_OVERRIDE'
} as const;

export type SecurityErrorCode = typeof SecurityErrorCodes[keyof typeof SecurityErrorCodes];