# Product Requirements Document: MCP Configuration Unification

## Executive Summary
Unify MCP (Model Context Protocol) server configuration between Claude Code CLI and Claude Code Chat VS Code extension to eliminate duplicate configuration management and improve developer experience.

## Problem Statement

### Current State
- **Claude Code CLI** stores MCP configurations in `~/.claude/mcp-servers.json`
- **Claude Code Chat** stores MCP configurations in VS Code extension storage (`~/.config/Code/User/globalStorage/[extension-id]/mcp/mcp-servers.json`)
- Users must configure MCP servers **twice** - once for CLI, once for extension
- No synchronization mechanism exists between the two configuration stores
- Configuration drift occurs when servers are updated in one location but not the other

### Pain Points
1. **Redundant Configuration**: Every MCP server must be manually added to both CLI and extension
2. **Maintenance Overhead**: Updates/changes must be made in two places
3. **Configuration Drift**: Configs become out of sync over time
4. **Poor DX**: Confusing for users who expect unified behavior
5. **Lost Work**: Users configure CLI servers, then frustrated when extension doesn't see them
6. **No Single Source of Truth**: Unclear which configuration is "correct"

## User Stories

### As a Developer
- I want to configure an MCP server once and have it available in both CLI and VS Code
- I want changes made in either interface to be reflected in the other
- I want to understand clearly where my MCP configurations are stored
- I want the option to keep certain servers CLI-only or extension-only

### As a Power User
- I want to bulk import my existing CLI configurations into the extension
- I want to manage all MCP servers from a single location
- I want version control for my MCP configurations

## Proposed Solutions

### Solution 1: Automatic Bidirectional Sync (Recommended)
**Description**: Implement real-time synchronization between CLI and extension configurations

#### Features
- **File Watcher**: Monitor both config files for changes
- **Conflict Resolution**: Last-write-wins with user notification
- **Selective Sync**: Mark servers as "CLI-only", "Extension-only", or "Shared"
- **Sync Status Indicator**: Show sync state in VS Code status bar

#### Implementation
```typescript
interface MCPSyncConfig {
  syncMode: 'auto' | 'manual' | 'disabled';
  primarySource: 'cli' | 'extension';
  conflictResolution: 'last-write' | 'prompt' | 'merge';
  excludePatterns?: string[];
}

interface MCPServerEntry {
  name: string;
  config: any;
  syncScope: 'shared' | 'cli-only' | 'extension-only';
  lastModified: string;
  source: 'cli' | 'extension' | 'synced';
}
```

### Solution 2: One-Time Import Wizard
**Description**: Guided setup to import existing CLI configurations

#### Features
- **Discovery Phase**: Automatically detect existing CLI config
- **Preview & Selection**: Show all CLI servers with checkboxes for import
- **Merge Options**: Add to existing or replace extension config
- **Backup Creation**: Save current extension config before import

#### User Flow
1. Extension detects existing CLI config on first launch
2. Prompts: "Import X MCP servers from Claude CLI?"
3. Shows preview dialog with server list
4. User selects servers to import
5. Creates backup and performs import
6. Shows success notification with undo option

### Solution 3: Unified Configuration with Symlinks
**Description**: Use single configuration file via symbolic links

#### Features
- **Single Config File**: CLI config becomes the source of truth
- **Symlink Creation**: Extension creates symlink to CLI config
- **Fallback Mechanism**: Copy config if symlinks not supported
- **Permission Server Injection**: Dynamically inject extension-specific servers

### Solution 4: Configuration Federation (Advanced)
**Description**: Multiple config sources with intelligent merging

#### Features
- **Config Hierarchy**:
  1. Global CLI config (`~/.claude/mcp-servers.json`)
  2. Extension overrides (`extension-storage/mcp-overrides.json`)
  3. Workspace config (`.claude/workspace-mcp.json`)
  4. Project config (`claude.config.json`)

- **Smart Merging**: Configs merged based on precedence rules
- **Environment Variables**: Support `CLAUDE_MCP_CONFIG_PATH`
- **Config Profiles**: Switch between different MCP configurations

## Technical Specifications

### Configuration Sync Service
```typescript
class MCPConfigSyncService {
  private cliConfigPath = '~/.claude/mcp-servers.json';
  private extensionConfigPath: string;
  private fileWatcher: vscode.FileSystemWatcher;
  
  async initialize() {
    // Check for existing CLI config
    if (await this.cliConfigExists()) {
      await this.promptForImport();
    }
    
    // Set up file watchers
    this.watchConfigFiles();
    
    // Initial sync
    await this.performSync();
  }
  
  async performSync() {
    const strategy = this.getSyncStrategy();
    switch(strategy) {
      case 'cli-primary':
        await this.syncFromCLI();
        break;
      case 'extension-primary':
        await this.syncFromExtension();
        break;
      case 'bidirectional':
        await this.mergeBidirectional();
        break;
    }
  }
  
  private async mergeBidirectional() {
    // Intelligent merge based on timestamps
    const cliConfig = await this.readCLIConfig();
    const extConfig = await this.readExtensionConfig();
    
    const merged = this.mergeConfigs(cliConfig, extConfig);
    
    await this.writeCLIConfig(merged);
    await this.writeExtensionConfig(merged);
  }
}
```

### VS Code Settings Schema
```json
{
  "claudeCodeChat.mcp.syncMode": {
    "type": "string",
    "enum": ["auto", "manual", "disabled", "cli-to-extension", "extension-to-cli"],
    "default": "auto",
    "description": "MCP configuration synchronization mode"
  },
  "claudeCodeChat.mcp.syncOnStartup": {
    "type": "boolean",
    "default": true,
    "description": "Automatically sync MCP configurations on extension activation"
  },
  "claudeCodeChat.mcp.conflictResolution": {
    "type": "string",
    "enum": ["prompt", "cli-wins", "extension-wins", "newest-wins"],
    "default": "prompt",
    "description": "How to resolve configuration conflicts"
  },
  "claudeCodeChat.mcp.excludeFromSync": {
    "type": "array",
    "items": { "type": "string" },
    "default": [],
    "description": "MCP server names to exclude from synchronization"
  }
}
```

### Migration Path
1. **Phase 1: Import Wizard** (Week 1-2)
   - Implement one-time import functionality
   - Add "Import from CLI" button in settings UI
   - Create backup before import

2. **Phase 2: Basic Sync** (Week 3-4)
   - Implement file watchers
   - Add manual sync command
   - Basic conflict detection

3. **Phase 3: Advanced Sync** (Week 5-6)
   - Bidirectional sync
   - Conflict resolution UI
   - Sync status indicators

4. **Phase 4: Federation** (Week 7-8)
   - Multiple config sources
   - Workspace configurations
   - Config profiles

## Success Metrics
- **Configuration Time**: Reduce from 2x to 1x per server
- **User Satisfaction**: >80% prefer unified config
- **Bug Reports**: <5% config-related issues
- **Adoption Rate**: >60% enable sync feature

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Config corruption | High | Automatic backups before each sync |
| Performance impact | Medium | Debounce file watchers, async operations |
| Breaking changes | High | Versioned config format, migration scripts |
| Permission issues | Medium | Graceful fallbacks, clear error messages |
| Circular sync loops | High | Sync locks, timestamp tracking |

## Open Questions
1. Should we support partial server sync (sync only specific fields)?
2. How do we handle encrypted/sensitive configuration values?
3. Should workspace-specific configs override global configs?
4. Do we need a "reset to defaults" option?
5. Should we support config import/export for sharing?

## Appendix: User Research

### Survey Results (Hypothetical)
- 78% of users have configured MCP servers for CLI
- 45% were confused why extension didn't see CLI servers
- 89% want automatic synchronization
- 67% prefer CLI as primary configuration source

### Common User Feedback
- "Why do I have to add my servers twice?"
- "I updated my CLI config but the extension still uses old settings"
- "Which config file is the 'real' one?"
- "Can't I just use one configuration for everything?"

## Next Steps
1. Review and approve PRD
2. Conduct user survey for validation
3. Create technical design document
4. Implement Phase 1 (Import Wizard) as MVP
5. Gather feedback and iterate

---
*Document Version: 1.0.0*  
*Last Updated: 2025-01-10*  
*Author: Claude Code Chat Team*