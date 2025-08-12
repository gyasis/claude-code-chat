# 🚀 Claude Code Chat v1.1.1 - Beautiful Claude Code Chat Interface for VS Code

[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=andrepimenta.claude-code-chat)
[![Claude Code](https://img.shields.io/badge/Powered%20by-Claude%20Code-orange?style=for-the-badge)](https://claude.ai/code)
[![TypeScript](https://img.shields.io/badge/Built%20with-TypeScript-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

> **No more terminal commands. Chat with Claude Code through a beautiful, intuitive interface right inside VS Code.**
> **New in v1.1.1: Agent Color Coding, Three-Source MCP Integration, Dynamic Commands**

Ditch the command line and experience Claude Code like never before. This extension brings a stunning chat interface directly into your editor, making AI assistance accessible, visual, and enjoyable.

🤖 **Built by Claude Code for Claude Code** - This extension was entirely developed using Claude Code itself. Claude Code created its own chat interface!

---

## ✨ **Why Choose Claude Code Chat?**

🖥️ **No Terminal Required** - Beautiful chat interface replaces command-line interactions  
⏪ **Restore Checkpoints** - Undo changes and restore code to any previous state   
🔌 **Three-Source MCP Integration** - CLI sync, extension servers, and global config all merged seamlessly  
🎨 **Agent Color Coding** - 40+ agents with visual color indicators based on specialization
💾 **Conversation History** - Automatic conversation history and session management  
🧠 **VS Code Native** - Claude Code integrated directly into VS Code with native theming and sidebar support  
⚡ **Dynamic Commands** - Slash commands automatically loaded from Claude CLI with /agents support
🖼️ **Smart File/Image Context** - Reference any file, paste images or screenshots for visual context  
🤖 **Model Selection** - Choose between Opus, Sonnet, or Default based on your needs  
🐧 **Windows/WSL Support** - Full native Windows and WSL support

![Claude Code Chat 1 0 0](https://github.com/user-attachments/assets/5954a74c-eff7-4205-8482-6a1c9de6e102)


---

## 🌟 **Key Features**

### 💬 **Beautiful Chat Graphical Interface**
- No terminal required - everything through the UI
- Real-time streaming responses with typing indicators
- One-click message copying with visual feedback
- Enhanced markdown support with syntax highlighting
- Auto-resizing input that grows with your content
- Copy-to-clipboard for code blocks

### ⏪ **Checkpoint & Session Management**
- **Restore Checkpoints** - Instantly undo changes and restore to any previous state
- Automatic Git-based backup system for safe experimentation
- Browse and restore from any conversation checkpoint
- Automatic conversation saving and restoration
- Real-time cost and token tracking
- Session statistics and performance metrics

### 🔌 **MCP Server Management** ⭐ **MAJOR UPGRADE IN V1.1.1**
- **Three-Source Integration** - Merges servers from CLI config, extension storage, and global extension config
- **CLI Config Synchronization** - Automatically sync and activate servers from your Claude CLI configuration
- **Extension Server Management** - Local servers managed directly by the extension
- **Global Extension Config** - Additional servers from `~/.claude/mcp.json`
- **Unified Server Registry** - All three sources merge seamlessly when running Claude
- **Modal State Management** - Save/Cancel buttons with proper state persistence
- **Real-time Configuration** - Changes only applied when Save is clicked
- **Popular Servers Gallery** - One-click installation of common MCP servers
- **Custom Server Creation** - Build and configure your own MCP servers
- **Cross-platform Support** - Full WSL compatibility with path conversion

### 🔒 **Advanced Permissions System** ⭐ **NEW IN V1.0**
- **Interactive Permission Dialogs** - Detailed tool information with command previews
- **Always Allow Functionality** - Smart command pattern matching for common tools (npm, git, docker)
- **YOLO Mode** - Skip all permission checks for power users
- **Workspace Permissions** - Granular control over what tools can execute
- **Real-time Permission Management** - Add/remove permissions through intuitive UI

### 🖼️ **Image & Clipboard Support** ⭐ **NEW IN V1.0**
- **Drag & Drop Images** - Simply drag images directly into the chat
- **Clipboard Paste** - Press Ctrl+V to paste screenshots and copied images
- **Multiple Image Selection** - Choose multiple images through VS Code's file picker
- **Organized Storage** - Automatic organization in `.claude/claude-code-chat-images/`
- **Format Support** - PNG, JPG, JPEG, GIF, SVG, WebP, BMP formats

### 📱 **Sidebar Integration** ⭐ **NEW IN V1.0**
- **Native VS Code Sidebar** - Full chat functionality in the sidebar panel
- **Smart Panel Management** - Automatic switching between main and sidebar views
- **Persistent Sessions** - State maintained across panel switches
- **Activity Bar Integration** - Quick access from VS Code's activity bar

### 📁 **Smart File Integration**
- Type `@` to instantly search and reference workspace files
- Image attachments via file browser and copy-paste screeshots
- Lightning-fast file search across your entire project
- Seamless context preservation for multi-file discussions

### 🛠️ **Tool Management**
- Visual dashboard showing all available Claude Code tools
- Real-time tool execution with formatted results
- Process control - start, stop, and monitor operations
- Smart permission system for secure tool execution

### 🎨 **VS Code Integration**
- Native theming that matches your editor
- Status bar integration with connection status
- Activity bar panel for quick access
- Responsive design for any screen size

### 🤖 **Model Selection**
- **Opus** - Most capable model for complex tasks requiring deep reasoning
- **Sonnet** - Balanced model offering great performance for most use cases
- **Default** - Uses your configured model setting
- Model preference persists across sessions and is saved automatically
- Easy switching via dropdown selector in the chat interface
- Visual confirmation when switching between models
- One-click model configuration through integrated terminal

### ⚡ **Slash Commands Integration** ⭐ **ENHANCED IN V1.1.1**
- **Dynamic Command Detection** - Commands are now dynamically loaded from Claude CLI
- **Enhanced /agents Command** - Now works properly with agent color coding
- **40+ Agent Support** - Full integration with Claude's agent ecosystem
- **Fallback System** - Graceful handling of unknown or new commands
- **Session-Aware Execution** - All commands run with current conversation context
- **Terminal Integration** - Commands open directly in VS Code terminal with WSL support

### 🎨 **Agent Color Coding System** ⭐ **NEW IN V1.1.1**
- **Visual Agent Recognition** - Each of the 40+ Claude agents has a unique background color
- **Color Psychology Mapping** - Intuitive color scheme based on agent specialization:
  - 🔴 **Red Tones** - Security, permissions, and safety-focused agents
  - 🔵 **Blue Tones** - Development, coding, and technical agents
  - 🟢 **Green Tones** - Data analysis, research, and information agents
  - 🟣 **Purple Tones** - Creative, design, and artistic agents
  - 🟡 **Yellow Tones** - Communication, documentation, and writing agents
- **Real-time Indicators** - Chat interface dynamically shows active agent colors
- **Enhanced UX** - Instant visual feedback about which specialized agent is handling your request
- **Theme Integration** - Colors work seamlessly with all VS Code themes (light/dark/high contrast)

### 🧠 **Advanced AI Modes** ⭐ **NEW IN V1.1.1**
- **Agent Color Coding** - 40+ agents with unique background colors based on their function
- **Visual Agent Indicators** - Color psychology system (red=security, blue=dev, green=data, etc.)
- **Active Agent Display** - Real-time indication when specific agents are active
- **Plan First Mode** - Toggle to make Claude plan before implementing changes
- **Thinking Mode** - Configurable intensity levels (Think, Think Hard, Think Harder, Ultrathink)
- **Mode Toggles** - Simple switches above the text input area
- **Intelligent Prompting** - Different prompts based on selected thinking intensity
- **Token Awareness** - Higher thinking levels consume more tokens but provide deeper reasoning

---

## 🚀 **Getting Started**

### Prerequisites
- **VS Code 1.80+** - Latest version recommended
- **Claude Code CLI** - [Install from Anthropic](https://claude.ai/code)
- **Active Claude API or subscription** - API or Pro/Max plan

### Installation

#### Option 1: Install from VS Code Marketplace (Original Version)
```
ext install claude-code-chat
```

#### Option 2: Install from This Fork (Includes NVM Integration & MCP Sync)
Since this is a fork with advanced MCP integration, agent color coding, and enhanced features, you'll need to build and install it manually:

1. **Clone and build the extension**:
   ```bash
   git clone https://github.com/gyasis/claude-code-chat.git
   cd claude-code-chat
   npm install
   npm run compile
   npx @vscode/vsce package
   ```
   This will create `claude-code-chat-sam-1.1.1.vsix` in the project directory.

2. **Install the VSIX**:
   - **Method A**: In VS Code, go to Extensions → "..." → "Install from VSIX" → Select the `.vsix` file
   - **Method B**: Command line: `code --install-extension claude-code-chat-sam-1.1.1.vsix`
   - **Method C**: Drag and drop the `.vsix` file into VS Code

3. **Configure NVM Integration** (Optional but Recommended):
   - Open VS Code Settings (Ctrl/Cmd + ,)
   - Search for "Claude Code Chat"
   - Enable "NVM Integration for terminal commands"
   - Set "NVM version to use in terminals" to your preferred version (e.g., "22.9.0")

#### Option 3: Use the Installation Script (Easiest)
```bash
git clone https://github.com/gyasis/claude-code-chat.git
cd claude-code-chat
./install.sh
```
This script will automatically build the VSIX file and install it for you.

#### Option 4: Build from Source (Detailed Steps)
```bash
# 1. Clone the repository
git clone https://github.com/gyasis/claude-code-chat.git
cd claude-code-chat

# 2. Install dependencies
npm install

# 3. Compile TypeScript to JavaScript
npm run compile

# 4. Package into VSIX file
npx @vscode/vsce package

# 5. Install the generated VSIX file
code --install-extension claude-code-chat-1.0.5.vsix
```

3. **Open Claude Code Chat**
   - Press `Ctrl+Shift+C` (or `Cmd+Shift+C` on Mac)
   - Or click the Claude icon in your status bar
   - Or use Command Palette: `Claude Code: Open Chat`

---

## 💡 **Usage Examples**

### 🔥 **Code Review & Refactoring**
```
You: @src/components/UserProfile.tsx Can you review this component and suggest improvements?

Claude: I'll analyze your UserProfile component. Looking at the code, here are my recommendations:

1. **Performance Optimization**: Add React.memo() to prevent unnecessary re-renders
2. **TypeScript Enhancement**: The props interface could be more specific
3. **Accessibility**: Missing ARIA labels for screen readers

[Detailed analysis with code examples follows...]
```

### 📊 **Project Analysis**
```
You: Analyze the overall architecture of my project and identify potential issues

Claude: I'll examine your project structure and identify areas for improvement:

🏗️ **Architecture Overview**
- React frontend with TypeScript
- Node.js backend with Express
- MongoDB database layer

⚠️ **Identified Issues**
- Missing error boundaries in React components
- Database queries lack proper indexing
- API routes missing input validation

[Detailed recommendations with implementation examples...]
```

### 🐛 **Debugging Assistant**
```
You: I'm getting a strange error in my API. Here's the stack trace: [paste error]

Claude: Looking at this stack trace, the issue appears to be a race condition in your async middleware. Here's what's happening:

1. **Root Cause**: Multiple requests are modifying shared state
2. **Solution**: Implement proper request isolation
3. **Prevention**: Add comprehensive error handling

[Step-by-step debugging guide follows...]
```

### ⏪ **Safe Experimentation with Checkpoints**
```
You: Can you refactor this entire component to use hooks instead of class components?

Claude: I'll refactor your component to use React hooks. Don't worry - I'll create a checkpoint first so you can easily restore if needed.

[Creates automatic checkpoint]

Here's the refactored component using hooks:
[Shows the new implementation]

If you want to revert these changes, just click "Restore Checkpoint" to go back to your original code instantly.
```

### 🎨 **Agent Color Coding in Action** ⭐ **NEW IN V1.1.1**
```
You: /agents

Claude: [Background turns blue indicating development agent is active]
🔵 DevAgent: Here are all available agents:
- SecurityAgent (🔴 Red) - Handles security, permissions, and safety
- DataAnalyst (🟢 Green) - Processes data, creates charts and analysis
- DesignAgent (🟣 Purple) - UI/UX design and creative tasks
- TechnicalWriter (🟡 Yellow) - Documentation and communication
... [40+ agents with color indicators]

You: Analyze the security vulnerabilities in my authentication system

Claude: [Background shifts to red indicating SecurityAgent is now active]
🔴 SecurityAgent: I'll analyze your authentication system for security vulnerabilities...
```

### 🔌 **Three-Source MCP Integration** ⭐ **NEW IN V1.1.1**
```
You: [Opens MCP settings]

Extension automatically merges:
✅ CLI Servers (from claude_config.json): playwright, postgres, filesystem
✅ Extension Servers: permissions-mcp, custom-tools
✅ Global Config (~/.claude/mcp.json): shared-database, api-tools

All 6 servers available in unified interface with Save/Cancel state management.
```

---

## ⚙️ **Configuration**

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+C` | Open Claude Code Chat |
| `Enter` | Send message |
| `@` | Open file picker |
| `/` | Open slash commands modal |

### WSL Configuration (Windows Users)
If you're using Claude Code through WSL (Windows Subsystem for Linux), you can configure the extension to use WSL:

1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "Claude Code Chat"
3. Configure these settings:
   - **Claude Code Chat: WSL Enabled** - Enable WSL integration
   - **Claude Code Chat: WSL Distro** - Your WSL distribution name (e.g., `Ubuntu`, `Debian`)
   - **Claude Code Chat: WSL Node Path** - Path to Node.js in WSL (default: `/usr/bin/node`)
   - **Claude Code Chat: WSL Claude Path** - Path to Claude in WSL (default: `/usr/local/bin/claude`)

Example configuration in `settings.json`:
```json
{
  "claudeCodeChat.wsl.enabled": true,
  "claudeCodeChat.wsl.distro": "Ubuntu",
  "claudeCodeChat.wsl.nodePath": "/usr/bin/node",
  "claudeCodeChat.wsl.claudePath": "/usr/local/bin/claude"
}
```

### NVM Integration (This Fork Only) ⭐ **NEW**
This fork includes NVM (Node Version Manager) integration to ensure terminal commands use your preferred Node.js environment:

1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "Claude Code Chat"
3. Configure these settings:
   - **Claude Code Chat: NVM Enabled** - Enable NVM integration
   - **Claude Code Chat: NVM Version** - Specify your Node.js version (e.g., `22.9.0`)

Example configuration in `settings.json`:
```json
{
  "claudeCodeChat.nvm.enabled": true,
  "claudeCodeChat.nvm.version": "22.9.0"
}
```

**How it works**: When you execute commands that open terminals (like `/terminal-setup`), the extension automatically:
1. Loads your NVM environment
2. Switches to the specified Node.js version
3. Then executes the Claude command

This ensures all terminal operations use your preferred Node.js environment instead of the system default.

---

## 🔧 **Build Troubleshooting**

### Common Issues

**"command not found: code"**
- Install VS Code CLI: `npm install -g @vscode/vsce`
- Or install manually through VS Code UI

**"npm run compile failed"**
- Make sure you have Node.js installed
- Try: `npm install` then `npm run compile`

**"vsce package failed"**
- Install vsce globally: `npm install -g @vscode/vsce`
- Or use npx: `npx @vscode/vsce package`

**"Permission denied"**
- Make sure the install script is executable: `chmod +x install.sh`
- Or run manually: `./install.sh`

---

## 🎯 **Pro Tips & Tricks**

### 🔥 **File Context Magic**
- Type `@` followed by your search term to quickly reference files
- Use `@src/` to narrow down to specific directories
- Reference multiple files in one message for cross-file analysis
- **NEW**: Copy-paste images directly into chat for visual context
- **NEW**: Paste screenshots with Ctrl+V for instant visual communication

### ⚡ **Productivity Boosters**
- **Creates checkpoints automatically** before changes for safe experimentation
- **Restore instantly** if changes don't work out as expected
- **NEW**: Permission system prevents accidental tool execution
- **NEW**: YOLO mode for power users who want speed over safety
- Use the stop button to cancel long-running operations
- Copy message contents to reuse Claude's responses
- Open history panel to reference previous conversations
- **NEW**: Sidebar integration for multi-panel workflow

### 🎨 **Interface Customization**
- The UI automatically adapts to your VS Code theme
- Messages are color-coded: Green for you, Blue for Claude
- Hover over messages to reveal the copy button
- **NEW**: Enhanced code block rendering with syntax highlighting
- **NEW**: Copy-to-clipboard functionality for code blocks

---

## 🔧 **Advanced Features**

### 🛠️ **Tool Integration**
Claude Code Chat provides secure access to all Claude Code tools:
- **Bash** - Execute shell commands with permission controls
- **File Operations** - Read, write, and edit files
- **Search** - Grep and glob pattern matching across workspace
- **Web** - Fetch and search web content
- **Multi-edit** - Batch file modifications
- **MCP Servers** - Extend functionality with Model Context Protocol servers
- **Permissions System** - Granular control over tool execution for security

### 📊 **Analytics & Monitoring**
- **Real-time cost tracking** - Monitor your API usage
- **Token consumption** - See input/output token counts
- **Response timing** - Track performance metrics
- **Session statistics** - Comprehensive usage analytics

### ⏪ **Checkpoint System**
- **Instant restoration** - One-click restore to any previous state
- **Conversation checkpoints** - Every change creates a restore point
- **Visual timeline** - See and navigate through all your project states

### 🔄 **Conversation History**
- **Automatic saving** - Every conversation is preserved
- **Smart restoration** - Resume exactly where you left off
- **Switch between chats** - Easily check and switch to previous conversations

---

## 🤝 **Contributing**

We welcome contributions! Here's how you can help:

1. **🐛 Report Bugs** - Use our issue tracker
2. **💡 Suggest Features** - Share your ideas
3. **🔧 Submit PRs** - Help us improve the codebase
4. **📚 Improve Docs** - Make the documentation better

### Development Setup
```bash
git clone https://github.com/andrepimenta/claude-code-chat
cd claude-code-chat
npm install

Click "F5" to run the extension or access the "Run and Debug" section in VSCode
```

---

## 📝 **License**

See the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- **Anthropic** - For creating the amazing Claude AI and more specifically the Claude Code SDK
- **VS Code Team** - For the incredible extension platform
- **Our Community** - For feedback, suggestions, and contributions

---

## 📞 **Support**

Need help? We've got you covered:

- 🐛 **Issues**: [GitHub Issues](https://github.com/andrepimenta/claude-code-chat/issues)

---

<div align="center">

**⭐ Star us on GitHub if this project helped you!**

[**Download Now**](https://marketplace.visualstudio.com/items?itemName=andrepimenta.claude-code-chat)

</div>
