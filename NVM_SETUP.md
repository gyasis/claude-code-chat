# NVM Integration for Claude Code Chat

This modified version of Claude Code Chat includes NVM (Node Version Manager) integration to ensure that terminal commands use your specific Node.js environment.

## Problem Solved

The original extension opens terminals without any environment setup, which means:
- Terminals use the system default Node.js version
- Your NVM environment is not loaded
- Commands may fail or use the wrong Node.js version

## Solution

This modified extension adds NVM support that:
- Automatically loads your specified NVM version before running commands
- Works with all terminal operations (login, model selection, slash commands)
- Provides error handling if NVM is not available

## Configuration

### Enable NVM Integration

1. Open VS Code Settings (Ctrl/Cmd + ,)
2. Search for "Claude Code Chat"
3. Find the "NVM" section
4. Enable "NVM Integration for terminal commands"
5. Set "NVM version to use in terminals" to your desired version (e.g., "22.9.0")

### Settings

- **claudeCodeChat.nvm.enabled**: Enable/disable NVM integration
- **claudeCodeChat.nvm.version**: Specify the Node.js version to use (e.g., "22.9.0")

## How It Works

When you execute a command that opens a terminal:

1. The extension creates a new terminal
2. If NVM is enabled, it automatically runs:
   ```bash
   export NVM_DIR="$HOME/.nvm"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
   nvm use 22.9.0
   ```
3. Then it executes your Claude command

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Compile the extension: `npm run compile`
4. Package the extension: `npm run vscode:prepublish`
5. Install the VSIX file in VS Code

## Troubleshooting

- **NVM not found**: Make sure NVM is installed and `$HOME/.nvm` exists
- **Version not available**: Ensure the specified Node.js version is installed via `nvm install 22.9.0`
- **Permission issues**: Check that your shell can execute NVM commands

## Example

With NVM enabled and version set to "22.9.0":

1. Open Claude Code Chat
2. Type `/terminal-setup` in the chat
3. The terminal will automatically:
   - Load NVM
   - Switch to Node.js 22.9.0
   - Run the Claude command

This ensures all terminal operations use your preferred Node.js environment. 