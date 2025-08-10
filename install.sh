#!/bin/bash

# Claude Code Chat with NVM Integration - Installation Script
echo "🚀 Installing Claude Code Chat with NVM Integration..."

# Check if VSIX file exists
if [ ! -f "claude-code-chat-1.0.5.vsix" ]; then
    echo "❌ VSIX file not found. Building extension..."
    npm run vscode:prepublish
    npx @vscode/vsce package
fi

# Check if VS Code is installed
if ! command -v code &> /dev/null; then
    echo "❌ VS Code CLI not found. Please install VS Code first."
    echo "   You can also install manually by:"
    echo "   1. Opening VS Code"
    echo "   2. Going to Extensions → ... → Install from VSIX"
    echo "   3. Selecting claude-code-chat-1.0.5.vsix"
    exit 1
fi

# Install the extension
echo "📦 Installing extension..."
code --install-extension claude-code-chat-1.0.5.vsix

if [ $? -eq 0 ]; then
    echo "✅ Installation successful!"
    echo ""
    echo "🎉 Next steps:"
    echo "1. Restart VS Code if it's open"
    echo "2. Open Settings (Ctrl/Cmd + ,)"
    echo "3. Search for 'Claude Code Chat'"
    echo "4. Enable 'NVM Integration for terminal commands'"
    echo "5. Set 'NVM version to use in terminals' to your preferred version (e.g., '22.9.0')"
    echo ""
    echo "🚀 Open Claude Code Chat with Ctrl+Shift+C"
else
    echo "❌ Installation failed. Try installing manually:"
    echo "   In VS Code: Extensions → ... → Install from VSIX → Select claude-code-chat-1.0.5.vsix"
fi 