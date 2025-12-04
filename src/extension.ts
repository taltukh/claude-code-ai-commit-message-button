// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import Anthropic from '@anthropic-ai/sdk';
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class CommitMessageGenerator {
    private anthropic: Anthropic;

    constructor() {
        // Get configuration
        const config = vscode.workspace.getConfiguration('claude-code-ai-commit-message-button');
        const anthropicConfig: any = {};

        if (config.get<string>('baseUrl')) {
            anthropicConfig.baseURL = config.get<string>('baseUrl');
        }

        if (config.get<string>('authToken')) {
            anthropicConfig.authToken = config.get<string>('authToken');
        }

        this.anthropic = new Anthropic(anthropicConfig);
    }

    async generateCommitMessage(repositoryPath?: string): Promise<string> {
        try {
            // Get configuration
            const config = vscode.workspace.getConfiguration('claude-code-ai-commit-message-button');
            const model = config.get<string>('model') || 'claude-4-sonnet';
            const maxTokens = config.get<number>('maxTokens') || 200;
            const customRules = config.get<string[]>('customRules') || [];
            const commitFormat = config.get<string>('commitFormat') || 'conventional';
            const customTemplate = config.get<string>('customTemplate') || '';

            const cwd = repositoryPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            
            // First try to get staged changes
            let { stdout: diff } = await execAsync('git diff --cached', { cwd });
            let isStaged = true;
            
            // If no staged changes, get all changed files
            if (!diff.trim()) {
                const result = await execAsync('git diff', { cwd });
                diff = result.stdout;
                isStaged = false;
            }

            if (!diff.trim()) {
                throw new Error('No changes found (staged or unstaged)');
            }

            const fileType = isStaged ? 'staged files' : 'changed files';
            
            // Build the prompt based on configuration
            let formatRules = this.getFormatRules(commitFormat, customTemplate);
            let customRulesText = customRules.length > 0 ? `\n\nAdditional custom rules:\n${customRules.map(rule => `- ${rule}`).join('\n')}` : '';
            
            // Call Claude
            const response = await this.anthropic.messages.create({
                model: model,
                max_tokens: maxTokens,
                messages: [{
                    role: 'user',
                    content: `write me a commit message for the ${fileType}, do not commit

Git diff:
${diff}

${formatRules}${customRulesText}
- Do not wrap the response in code blocks or backticks
- Return plain text only`
                }]
            });

            const textContent = response.content.find(block => block.type === 'text');
            return textContent ? (textContent as any).text : 'Unable to generate commit message';
        } catch (error: any) {
            throw new Error(`Failed to generate commit message: ${error.message}`);
        }
    }

    private getFormatRules(commitFormat: string, customTemplate: string): string {
        switch (commitFormat) {
            case 'conventional':
                return `Rules:
- Use conventional commit format
- Keep under 72 characters for the first line
- Be specific and clear
- Common types: feat, fix, docs, style, refactor, test, chore`;
            case 'angular':
                return `Rules:
- Use Angular commit format: <type>(<scope>): <description>
- Types: build, ci, docs, feat, fix, perf, refactor, style, test
- Keep under 100 characters for the first line
- Use imperative mood`;
            case 'custom':
                return customTemplate ? `Rules:
- Follow this custom template: ${customTemplate}
- Be specific and clear` : `Rules:
- Use conventional commit format
- Keep under 72 characters for the first line
- Be specific and clear`;
            default:
                return `Rules:
- Use conventional commit format
- Keep under 72 characters for the first line
- Be specific and clear
- Common types: feat, fix, docs, style, refactor, test, chore`;
        }
    }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "claude-code-ai-commit-message-button" is now active!');

	const createCommitDisposable = vscode.commands.registerCommand('claude-code-ai-commit-message-button.createCommitMessage', async (uri?: vscode.Uri) => {
		try {
            const generator = new CommitMessageGenerator();
            
            // Get the Git extension and find the right repository
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            if (!gitExtension) {
                vscode.window.showErrorMessage('Git extension not available');
                return;
            }

            const git = gitExtension.getAPI(1);
            let targetRepo;

            // If uri is provided, find the repo that contains this path
            if (uri) {
                targetRepo = git.repositories.find((repo: any) => {
                    const uriPath = (uri as any).E?.fsPath || (uri as any).G?.fsPath || uri.path;
                    console.log('Comparing:', uriPath, 'with repo:', repo.rootUri.fsPath);
                    return uriPath && uriPath.startsWith(repo.rootUri.fsPath);
                });
                
                if (!targetRepo) {
                    console.log('No matching repo found for URI, available repos:');
                    git.repositories.forEach((repo: any, index: number) => {
                        console.log(`  Repo ${index}: ${repo.rootUri.fsPath}`);
                    });
                }
            }

            // If no specific repo found, let user choose or use the first one
            if (!targetRepo) {
                if (git.repositories.length > 1) {
                    interface RepoItem {
                        label: string;
                        repo: any;
                    }
                    
                    const repoItems: RepoItem[] = git.repositories.map((repo: any) => ({
                        label: repo.rootUri.fsPath,
                        repo: repo
                    }));
                    
                    const selected = await vscode.window.showQuickPick(repoItems, {
                        placeHolder: 'Select repository'
                    });
                    
                    if (!selected) {
                        return;
                    }
                    targetRepo = selected.repo;
                } else if (git.repositories.length === 1) {
                    targetRepo = git.repositories[0];
                } else {
                    vscode.window.showErrorMessage('No Git repository found');
                    return;
                }
            }
            
            // Show progress
            const commitMessage = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Generating commit message...",
                cancellable: false
            }, async () => {
                return await generator.generateCommitMessage(targetRepo.rootUri.fsPath);
            });

            if (commitMessage) {
                // Set the commit message in the specific repository's input box
                targetRepo.inputBox.value = commitMessage;
                vscode.window.showInformationMessage(`Commit message set for ${targetRepo.rootUri.fsPath}!`);
            }

        } catch (error: any) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
	});

	context.subscriptions.push(createCommitDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
