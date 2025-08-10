# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

### Build Commands
- `npm run compile` - Compile TypeScript to JavaScript in the `out/` directory
- `npm run watch` - Compile in watch mode for development
- `npm run vscode:prepublish` - Build for publishing (runs compile)
- `npx @vscode/vsce package` - Package extension into VSIX file

### Development Commands  
- `npm run lint` - Run ESLint on TypeScript source files
- `npm run test` - Run VS Code extension tests (requires compile first)
- `npm run pretest` - Automatically runs compile and lint before tests
- `F5` in VS Code - Run extension in development mode (Extension Development Host)

### Installation Commands
- `code --install-extension claude-code-chat-sam-1.0.6.vsix` - Install VSIX file
- `./install.sh` - Automated build and install script

## Extension Architecture

### Core Components
- **Main Extension** (`src/extension.ts`): Entry point with activation/deactivation and command registration
- **Chat Provider** (`ClaudeChatProvider` class): Manages webview panels and chat functionality
- **Webview Provider** (`ClaudeChatWebviewProvider` class): Handles sidebar integration
- **UI Module** (`src/ui.ts`): HTML template generation for chat interface
- **UI Styles** (`src/ui-styles.ts`): CSS styling for the chat interface

### Key Features
- **Dual Interface**: Main panel and sidebar support with automatic switching
- **WSL Integration**: Windows Subsystem for Linux support with configurable paths
- **NVM Integration**: Node Version Manager support for terminal commands
- **Permission System**: Yolo mode and granular permission controls
- **Conversation Management**: Session saving/loading with checkpoint restoration
- **Thinking Modes**: Configurable AI reasoning intensity levels

### Configuration Options
The extension provides these VS Code settings:
- `claudeCodeChat.wsl.*` - WSL integration settings (enabled, distro, paths)
- `claudeCodeChat.thinking.intensity` - AI thinking mode (think, think-hard, think-harder, ultrathink)
- `claudeCodeChat.permissions.yoloMode` - Skip all permission checks
- `claudeCodeChat.nvm.*` - NVM integration settings (enabled, version)

### Extension Activation
- Activates on VS Code startup (`onStartupFinished`)
- Registers command: `claude-code-chat.openChat`
- Keyboard shortcut: `Ctrl+Shift+C` (Windows/Linux) / `Cmd+Shift+C` (Mac)
- Creates status bar item and activity bar panel

### File Structure
- `src/` - TypeScript source files
- `out/` - Compiled JavaScript output
- `claude-code-chat-permissions-mcp/` - MCP server for permissions management
- Generated VSIX files follow naming pattern: `claude-code-chat-sam-{version}.vsix`

## Development Notes

### TypeScript Configuration
- Target: ES2022
- Module: Node16  
- Strict mode enabled
- Source maps generated for debugging

### ESLint Configuration
- Uses TypeScript ESLint plugin
- Enforces naming conventions, semicolons, strict equality
- Configured in `eslint.config.mjs`

### Testing
- Uses `@vscode/test-cli` and `@vscode/test-electron`
- Test files in `src/test/`
- Sample test structure provided but minimal implementation

### MCP Server Integration
This extension includes a custom MCP (Model Context Protocol) server for managing permissions, located in the `claude-code-chat-permissions-mcp/` directory.