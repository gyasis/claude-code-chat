# MCP Configuration Sync - Implementation Plan

## Quick Start Implementation (Phase 1)

### 1. Add Import Command to Extension

```typescript
// In src/extension.ts - Add to activate() function
context.subscriptions.push(
    vscode.commands.registerCommand('claude-code-chat.importMCPFromCLI', async () => {
        await importMCPServersFromCLI(context);
    })
);

// New function to handle import
async function importMCPServersFromCLI(context: vscode.ExtensionContext): Promise<void> {
    const homedir = os.homedir();
    const cliConfigPath = path.join(homedir, '.claude', 'mcp-servers.json');
    
    try {
        // Check if CLI config exists
        if (!fs.existsSync(cliConfigPath)) {
            vscode.window.showInformationMessage('No Claude CLI configuration found at ~/.claude/mcp-servers.json');
            return;
        }
        
        // Read CLI config
        const cliConfig = JSON.parse(fs.readFileSync(cliConfigPath, 'utf8'));
        
        if (!cliConfig.mcpServers || Object.keys(cliConfig.mcpServers).length === 0) {
            vscode.window.showInformationMessage('No MCP servers found in CLI configuration');
            return;
        }
        
        // Show preview and get confirmation
        const serverNames = Object.keys(cliConfig.mcpServers);
        const result = await vscode.window.showQuickPick(
            [...serverNames, '✓ Import All Servers'],
            {
                canPickMany: true,
                placeHolder: `Found ${serverNames.length} MCP servers. Select servers to import:`,
                ignoreFocusOut: true
            }
        );
        
        if (!result || result.length === 0) {
            return;
        }
        
        // Get extension's MCP config path
        const storagePath = context.storageUri?.fsPath;
        if (!storagePath) {
            vscode.window.showErrorMessage('Extension storage not available');
            return;
        }
        
        const extConfigPath = path.join(storagePath, 'mcp', 'mcp-servers.json');
        
        // Create backup of existing config
        if (fs.existsSync(extConfigPath)) {
            const backupPath = path.join(storagePath, 'mcp', `mcp-servers-backup-${Date.now()}.json`);
            fs.copyFileSync(extConfigPath, backupPath);
            console.log(`Created backup at: ${backupPath}`);
        }
        
        // Ensure directory exists
        const mcpDir = path.join(storagePath, 'mcp');
        if (!fs.existsSync(mcpDir)) {
            fs.mkdirSync(mcpDir, { recursive: true });
        }
        
        // Load existing extension config
        let extConfig: any = { mcpServers: {} };
        if (fs.existsSync(extConfigPath)) {
            try {
                extConfig = JSON.parse(fs.readFileSync(extConfigPath, 'utf8'));
            } catch (e) {
                console.error('Error reading extension config:', e);
            }
        }
        
        // Merge servers
        let importCount = 0;
        const serversToImport = result.includes('✓ Import All Servers') 
            ? serverNames 
            : result;
            
        for (const serverName of serversToImport) {
            if (serverName !== '✓ Import All Servers' && cliConfig.mcpServers[serverName]) {
                extConfig.mcpServers[serverName] = {
                    ...cliConfig.mcpServers[serverName],
                    _source: 'cli-import',
                    _importedAt: new Date().toISOString()
                };
                importCount++;
            }
        }
        
        // Always add the permissions server
        extConfig.mcpServers['claude-code-chat-permissions'] = {
            command: 'node',
            args: [path.join(context.extensionPath, 'claude-code-chat-permissions-mcp', 'index.js')],
            _source: 'extension',
            _required: true
        };
        
        // Write merged config
        fs.writeFileSync(extConfigPath, JSON.stringify(extConfig, null, 2));
        
        vscode.window.showInformationMessage(
            `Successfully imported ${importCount} MCP servers from CLI configuration`
        );
        
        // Refresh the webview
        vscode.commands.executeCommand('claude-code-chat.refreshMCPServers');
        
    } catch (error) {
        console.error('Error importing MCP servers:', error);
        vscode.window.showErrorMessage(`Failed to import MCP servers: ${error}`);
    }
}
```

### 2. Add Auto-Detection on Startup

```typescript
// In activate() function, after context setup
async function checkForCLIConfig(context: vscode.ExtensionContext) {
    const homedir = os.homedir();
    const cliConfigPath = path.join(homedir, '.claude', 'mcp-servers.json');
    const storagePath = context.storageUri?.fsPath;
    
    if (!storagePath) return;
    
    const extConfigPath = path.join(storagePath, 'mcp', 'mcp-servers.json');
    const hasImportedKey = 'claudeCodeChat.hasImportedCLIConfig';
    
    // Check if we've already prompted
    if (context.globalState.get(hasImportedKey)) {
        return;
    }
    
    // Check if CLI config exists and has servers
    if (fs.existsSync(cliConfigPath)) {
        try {
            const cliConfig = JSON.parse(fs.readFileSync(cliConfigPath, 'utf8'));
            const serverCount = Object.keys(cliConfig.mcpServers || {}).length;
            
            if (serverCount > 0) {
                const result = await vscode.window.showInformationMessage(
                    `Found ${serverCount} MCP servers in Claude CLI configuration. Import them?`,
                    'Import Now',
                    'Later',
                    'Never Ask Again'
                );
                
                if (result === 'Import Now') {
                    await vscode.commands.executeCommand('claude-code-chat.importMCPFromCLI');
                }
                
                if (result === 'Never Ask Again') {
                    await context.globalState.update(hasImportedKey, true);
                }
            }
        } catch (e) {
            console.error('Error checking CLI config:', e);
        }
    }
}

// Call in activate()
checkForCLIConfig(context);
```

### 3. Add Continuous Sync Option

```typescript
// In src/mcp-sync.ts (new file)
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class MCPConfigSync {
    private cliWatcher?: fs.FSWatcher;
    private extWatcher?: vscode.FileSystemWatcher;
    private syncInProgress = false;
    private lastSyncTime = 0;
    
    constructor(
        private context: vscode.ExtensionContext,
        private onConfigChanged: () => void
    ) {}
    
    public async startSync() {
        const config = vscode.workspace.getConfiguration('claudeCodeChat');
        const syncMode = config.get<string>('mcp.syncMode', 'disabled');
        
        if (syncMode === 'disabled') {
            this.stopSync();
            return;
        }
        
        const homedir = os.homedir();
        const cliConfigPath = path.join(homedir, '.claude', 'mcp-servers.json');
        
        // Watch CLI config file
        if (fs.existsSync(cliConfigPath)) {
            this.cliWatcher = fs.watch(cliConfigPath, async (eventType) => {
                if (eventType === 'change' && !this.syncInProgress) {
                    console.log('CLI config changed, syncing...');
                    await this.syncFromCLI();
                }
            });
        }
        
        // Watch extension config file
        const storagePath = this.context.storageUri?.fsPath;
        if (storagePath) {
            const extConfigPath = path.join(storagePath, 'mcp', 'mcp-servers.json');
            const pattern = new vscode.RelativePattern(
                vscode.Uri.file(path.dirname(extConfigPath)),
                path.basename(extConfigPath)
            );
            
            this.extWatcher = vscode.workspace.createFileSystemWatcher(pattern);
            this.extWatcher.onDidChange(async () => {
                if (!this.syncInProgress) {
                    console.log('Extension config changed, syncing...');
                    await this.syncTowardsCLI();
                }
            });
        }
        
        // Initial sync
        await this.performInitialSync();
    }
    
    public stopSync() {
        this.cliWatcher?.close();
        this.extWatcher?.dispose();
    }
    
    private async syncFromCLI() {
        const now = Date.now();
        if (now - this.lastSyncTime < 1000) {
            return; // Debounce
        }
        
        this.syncInProgress = true;
        this.lastSyncTime = now;
        
        try {
            const config = vscode.workspace.getConfiguration('claudeCodeChat');
            const syncMode = config.get<string>('mcp.syncMode');
            
            if (syncMode === 'auto' || syncMode === 'cli-to-extension') {
                // Read both configs
                const cliConfig = this.readCLIConfig();
                const extConfig = this.readExtensionConfig();
                
                // Merge (CLI wins)
                const merged = this.mergeConfigs(cliConfig, extConfig, 'cli-wins');
                
                // Write to extension
                this.writeExtensionConfig(merged);
                
                // Notify UI
                this.onConfigChanged();
                
                vscode.window.showInformationMessage('MCP servers synced from CLI');
            }
        } finally {
            this.syncInProgress = false;
        }
    }
    
    private async syncTowardsCLI() {
        const config = vscode.workspace.getConfiguration('claudeCodeChat');
        const syncMode = config.get<string>('mcp.syncMode');
        
        if (syncMode === 'bidirectional' || syncMode === 'extension-to-cli') {
            this.syncInProgress = true;
            
            try {
                const cliConfig = this.readCLIConfig();
                const extConfig = this.readExtensionConfig();
                
                // Remove extension-only servers before syncing to CLI
                const filtered = this.filterForCLI(extConfig);
                
                // Merge
                const merged = this.mergeConfigs(cliConfig, filtered, 'extension-wins');
                
                // Write to CLI
                this.writeCLIConfig(merged);
                
            } finally {
                this.syncInProgress = false;
            }
        }
    }
    
    private mergeConfigs(config1: any, config2: any, strategy: string): any {
        const merged = { mcpServers: {} };
        
        // Start with all servers from config1
        Object.assign(merged.mcpServers, config1.mcpServers || {});
        
        // Add/override with servers from config2 based on strategy
        for (const [name, server] of Object.entries(config2.mcpServers || {})) {
            if (strategy === 'cli-wins' && merged.mcpServers[name]) {
                continue; // Skip if already exists
            }
            merged.mcpServers[name] = server;
        }
        
        return merged;
    }
    
    private filterForCLI(config: any): any {
        const filtered = { mcpServers: {} };
        
        for (const [name, server] of Object.entries(config.mcpServers || {})) {
            // Don't sync extension-specific servers to CLI
            if (name !== 'claude-code-chat-permissions' && 
                !(server as any)._extensionOnly) {
                filtered.mcpServers[name] = server;
            }
        }
        
        return filtered;
    }
    
    private readCLIConfig(): any {
        const homedir = os.homedir();
        const cliConfigPath = path.join(homedir, '.claude', 'mcp-servers.json');
        
        try {
            if (fs.existsSync(cliConfigPath)) {
                return JSON.parse(fs.readFileSync(cliConfigPath, 'utf8'));
            }
        } catch (e) {
            console.error('Error reading CLI config:', e);
        }
        
        return { mcpServers: {} };
    }
    
    private readExtensionConfig(): any {
        const storagePath = this.context.storageUri?.fsPath;
        if (!storagePath) return { mcpServers: {} };
        
        const extConfigPath = path.join(storagePath, 'mcp', 'mcp-servers.json');
        
        try {
            if (fs.existsSync(extConfigPath)) {
                return JSON.parse(fs.readFileSync(extConfigPath, 'utf8'));
            }
        } catch (e) {
            console.error('Error reading extension config:', e);
        }
        
        return { mcpServers: {} };
    }
    
    private writeExtensionConfig(config: any) {
        const storagePath = this.context.storageUri?.fsPath;
        if (!storagePath) return;
        
        const mcpDir = path.join(storagePath, 'mcp');
        if (!fs.existsSync(mcpDir)) {
            fs.mkdirSync(mcpDir, { recursive: true });
        }
        
        const extConfigPath = path.join(mcpDir, 'mcp-servers.json');
        fs.writeFileSync(extConfigPath, JSON.stringify(config, null, 2));
    }
    
    private writeCLIConfig(config: any) {
        const homedir = os.homedir();
        const cliDir = path.join(homedir, '.claude');
        
        if (!fs.existsSync(cliDir)) {
            fs.mkdirSync(cliDir, { recursive: true });
        }
        
        const cliConfigPath = path.join(cliDir, 'mcp-servers.json');
        fs.writeFileSync(cliConfigPath, JSON.stringify(config, null, 2));
    }
    
    private async performInitialSync() {
        const config = vscode.workspace.getConfiguration('claudeCodeChat');
        const syncOnStartup = config.get<boolean>('mcp.syncOnStartup', true);
        
        if (syncOnStartup) {
            await this.syncFromCLI();
        }
    }
}
```

### 4. Update Package.json

```json
{
  "contributes": {
    "commands": [
      {
        "command": "claude-code-chat.importMCPFromCLI",
        "title": "Import MCP Servers from Claude CLI",
        "category": "Claude Code Chat"
      },
      {
        "command": "claude-code-chat.syncMCPConfigs",
        "title": "Sync MCP Configurations",
        "category": "Claude Code Chat"
      }
    ],
    "configuration": {
      "properties": {
        "claudeCodeChat.mcp.syncMode": {
          "type": "string",
          "enum": ["disabled", "auto", "cli-to-extension", "extension-to-cli", "bidirectional"],
          "default": "disabled",
          "description": "MCP configuration synchronization mode",
          "enumDescriptions": [
            "No synchronization",
            "Automatic bidirectional sync",
            "One-way sync from CLI to extension",
            "One-way sync from extension to CLI",
            "Full bidirectional sync with conflict resolution"
          ]
        },
        "claudeCodeChat.mcp.syncOnStartup": {
          "type": "boolean",
          "default": true,
          "description": "Sync MCP configurations when extension starts"
        },
        "claudeCodeChat.mcp.showSyncNotifications": {
          "type": "boolean",
          "default": true,
          "description": "Show notifications when MCP configs are synced"
        }
      }
    }
  }
}
```

## Testing Plan

1. **Manual Import Test**
   - Set up CLI with 3 test MCP servers
   - Run import command
   - Verify servers appear in extension

2. **Auto-Sync Test**
   - Enable auto-sync
   - Add server to CLI config
   - Verify it appears in extension within 2 seconds

3. **Conflict Resolution Test**
   - Modify same server in both configs
   - Verify correct resolution based on strategy

4. **Backup Test**
   - Verify backup created before import
   - Test restore from backup

## Deployment Strategy

### Week 1: MVP Release
- Import command only
- Manual trigger
- Basic conflict detection

### Week 2: Auto-Detection
- Prompt on first launch
- Remember user preference
- Show server preview

### Week 3: File Watching
- Real-time sync option
- Debounced updates
- Status indicator

### Week 4: Polish
- Sync UI in settings
- Conflict resolution dialog
- Import/export features

## Success Criteria
✅ Users can import CLI configs with one click  
✅ No data loss during sync operations  
✅ Clear feedback on sync status  
✅ Option to disable sync if desired  
✅ Backward compatible with existing setups