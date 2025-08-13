// Development testing script for Claude Code AI Commit Message Button extension
// Run with: node test-functionality.js

console.log('🧪 Testing Extension Dependencies...\n');

// Test Anthropic SDK import
try {
    const Anthropic = require('@anthropic-ai/sdk');
    console.log('✅ Anthropic SDK imported successfully');
    
    // Test basic instantiation
    const client = new Anthropic({ apiKey: 'test-key' });
    console.log('✅ Anthropic SDK can be instantiated');
} catch (error) {
    console.log('❌ Anthropic SDK error:', error.message);
}

// Test child_process for git commands
try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    console.log('✅ Child process utilities imported successfully');
} catch (error) {
    console.log('❌ Child process error:', error.message);
}

// Test git commands that the extension will use
async function testGitCommands() {
    console.log('\n🔍 Testing Git Commands...');
    
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        // Test git status
        try {
            const { stdout } = await execAsync('git status --porcelain');
            if (stdout.trim()) {
                console.log('✅ Git status shows changes:', stdout.trim().split('\n').length, 'files');
            } else {
                console.log('✅ Git status command works (clean working tree)');
            }
        } catch (error) {
            console.log('⚠️ Git status error:', error.message);
        }
        
        // Test git diff --cached (for staged changes)
        try {
            const { stdout } = await execAsync('git diff --cached');
            if (stdout.trim()) {
                console.log('✅ Git diff --cached shows staged changes');
            } else {
                console.log('✅ Git diff --cached command works (no staged changes)');
            }
        } catch (error) {
            console.log('⚠️ Git diff --cached error:', error.message);
        }
        
        // Test git diff (for unstaged changes) 
        try {
            const { stdout } = await execAsync('git diff');
            if (stdout.trim()) {
                console.log('✅ Git diff shows unstaged changes');
            } else {
                console.log('✅ Git diff command works (no unstaged changes)');
            }
        } catch (error) {
            console.log('⚠️ Git diff error:', error.message);
        }
        
    } catch (error) {
        console.log('❌ Git commands error:', error.message);
    }
}

// Test configuration structure
function testConfigStructure() {
    console.log('\n⚙️ Testing Configuration Structure...');
    
    const expectedConfig = {
        authToken: 'string - Your Anthropic API auth token',
        baseUrl: 'string - Custom Anthropic API base URL (optional)',
        model: 'string - Claude model (default: claude-4-sonnet)',
        maxTokens: 'number - Max response tokens (default: 200)'
    };
    
    console.log('✅ Extension configuration schema:');
    Object.entries(expectedConfig).forEach(([key, description]) => {
        console.log(`  • ${key}: ${description}`);
    });
}

// Test build artifacts
function testBuildArtifacts() {
    console.log('\n📦 Testing Build Artifacts...');
    
    const fs = require('fs');
    const path = require('path');
    
    const requiredFiles = [
        'package.json',
        'icon.png',
        'out/extension.js',
        'src/extension.ts'
    ];
    
    requiredFiles.forEach(file => {
        if (fs.existsSync(path.join(__dirname, file))) {
            console.log(`✅ ${file} exists`);
        } else {
            console.log(`❌ ${file} missing`);
        }
    });
}

// Main test runner
async function runTests() {
    await testGitCommands();
    testConfigStructure();
    testBuildArtifacts();
    
    console.log('\n🎯 Manual Testing Instructions:');
    console.log('1. Press F5 in VS Code to open Extension Development Host');
    console.log('2. Open a git repository in the new window');
    console.log('3. Make some changes to files');
    console.log('4. Look for the sparkle ✨ button in the Git panel');
    console.log('5. Click the button to test commit message generation');
    
    console.log('\n🔑 Configuration Setup:');
    console.log('- Go to Settings > Extensions > Claude Code AI Commit Message Button');
    console.log('- Add your Anthropic auth token');
    console.log('- Optionally configure model and other settings');
    
    console.log('\n🚀 Publishing Commands:');
    console.log('- npm run compile    # Build the extension');
    console.log('- vsce package      # Create .vsix file');
    console.log('- vsce publish      # Publish to marketplace');
}

// Run all tests
runTests().catch(console.error);