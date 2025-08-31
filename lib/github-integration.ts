import { Octokit } from '@octokit/rest';

export interface GitHubRepoConfig {
  name: string;
  description?: string;
  private?: boolean;
  projectType?: 'react' | 'flutter';
  includeReadme?: boolean;
  license?: 'mit' | 'apache-2.0' | 'gpl-3.0' | null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl: string;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFile {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
}

export interface CommitResult {
  sha: string;
  url: string;
  message: string;
  filesChanged: number;
}

export class GitHubIntegration {
  private octokit: Octokit;
  
  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token
    });
  }
  
  // Create a new GitHub repository
  async createRepository(config: GitHubRepoConfig): Promise<{
    success: boolean;
    repo?: GitHubRepo;
    error?: string;
  }> {
    try {
      console.log('[GitHubIntegration] Creating repository:', config.name);
      
      // Validate repository name
      if (!/^[a-zA-Z0-9._-]+$/.test(config.name)) {
        throw new Error('Repository name can only contain alphanumeric characters, periods, hyphens, and underscores');
      }
      
      const { data: repo } = await this.octokit.rest.repos.createForAuthenticatedUser({
        name: config.name,
        description: config.description,
        private: config.private ?? true,
        auto_init: config.includeReadme ?? true,
        gitignore_template: config.projectType === 'flutter' ? undefined : 'Node',
        license_template: config.license || 'mit'
      });
      
      // Add Flutter-specific .gitignore if needed
      if (config.projectType === 'flutter' && config.includeReadme) {
        await this.addFlutterGitignore(repo.owner.login, repo.name);
      }
      
      return {
        success: true,
        repo: {
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          private: repo.private,
          htmlUrl: repo.html_url,
          cloneUrl: repo.clone_url,
          sshUrl: repo.ssh_url,
          defaultBranch: repo.default_branch,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at
        }
      };
      
    } catch (error: any) {
      console.error('[GitHubIntegration] Repository creation failed:', error);
      
      let errorMessage = error.message || 'Unknown error';
      
      if (error.status === 422) {
        errorMessage = `Repository "${config.name}" already exists or name is invalid`;
      } else if (error.status === 401) {
        errorMessage = 'GitHub authentication failed. Please check your access token.';
      } else if (error.status === 403) {
        errorMessage = 'Insufficient permissions or rate limit exceeded';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  // Upload project files to repository
  async uploadProjectFiles(
    owner: string, 
    repoName: string, 
    files: ProjectFile[], 
    commitMessage: string = 'Add project files from Open Lovable'
  ): Promise<{
    success: boolean;
    commit?: CommitResult;
    error?: string;
  }> {
    try {
      console.log('[GitHubIntegration] Uploading files to', `${owner}/${repoName}`);
      
      // Get repository info
      const { data: repo } = await this.octokit.rest.repos.get({
        owner,
        repo: repoName
      });
      
      // Get the latest commit SHA
      const { data: ref } = await this.octokit.rest.git.getRef({
        owner,
        repo: repoName,
        ref: `heads/${repo.default_branch}`
      });
      
      const baseCommitSha = ref.object.sha;
      
      // Create blobs for all files
      const treeItems = [];
      for (const file of files) {
        const { data: blob } = await this.octokit.rest.git.createBlob({
          owner,
          repo: repoName,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64'
        });
        
        treeItems.push({
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha
        });
      }
      
      // Create a new tree
      const { data: tree } = await this.octokit.rest.git.createTree({
        owner,
        repo: repoName,
        base_tree: baseCommitSha,
        tree: treeItems
      });
      
      // Create a commit
      const { data: commit } = await this.octokit.rest.git.createCommit({
        owner,
        repo: repoName,
        message: commitMessage,
        tree: tree.sha,
        parents: [baseCommitSha]
      });
      
      // Update the main branch reference
      await this.octokit.rest.git.updateRef({
        owner,
        repo: repoName,
        ref: `heads/${repo.default_branch}`,
        sha: commit.sha
      });
      
      console.log('[GitHubIntegration] Files uploaded successfully:', commit.sha);
      
      return {
        success: true,
        commit: {
          sha: commit.sha,
          url: commit.html_url,
          message: commit.message,
          filesChanged: files.length
        }
      };
      
    } catch (error: any) {
      console.error('[GitHubIntegration] Upload failed:', error);
      
      let errorMessage = error.message || 'Upload failed';
      
      if (error.status === 404) {
        errorMessage = `Repository ${owner}/${repoName} not found`;
      } else if (error.status === 403) {
        errorMessage = 'Insufficient permissions to write to repository';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  // Get repository information
  async getRepository(owner: string, repoName: string): Promise<{
    success: boolean;
    repo?: GitHubRepo;
    error?: string;
  }> {
    try {
      const { data: repo } = await this.octokit.rest.repos.get({
        owner,
        repo: repoName
      });
      
      return {
        success: true,
        repo: {
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          private: repo.private,
          htmlUrl: repo.html_url,
          cloneUrl: repo.clone_url,
          sshUrl: repo.ssh_url,
          defaultBranch: repo.default_branch,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.status === 404 ? 'Repository not found' : error.message
      };
    }
  }
  
  // List user repositories
  async listRepositories(type: 'all' | 'owner' | 'private' = 'all'): Promise<{
    success: boolean;
    repositories?: GitHubRepo[];
    error?: string;
  }> {
    try {
      const { data: repos } = await this.octokit.rest.repos.listForAuthenticatedUser({
        type,
        sort: 'updated',
        per_page: 100
      });
      
      const repositories = repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
        defaultBranch: repo.default_branch,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at
      }));
      
      return {
        success: true,
        repositories
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Create complete project repository with files
  async createProjectRepository(
    config: GitHubRepoConfig,
    files: ProjectFile[],
    commitMessage: string = 'Initial project setup'
  ): Promise<{
    success: boolean;
    repo?: GitHubRepo;
    commit?: CommitResult;
    error?: string;
  }> {
    try {
      // First create the repository
      const repoResult = await this.createRepository(config);
      if (!repoResult.success || !repoResult.repo) {
        return {
          success: false,
          error: repoResult.error || 'Failed to create repository'
        };
      }
      
      // Wait a moment for repository to be fully created
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Upload project files
      const uploadResult = await this.uploadProjectFiles(
        repoResult.repo.fullName.split('/')[0],
        repoResult.repo.name,
        files,
        commitMessage
      );
      
      if (!uploadResult.success) {
        return {
          success: false,
          repo: repoResult.repo,
          error: `Repository created but file upload failed: ${uploadResult.error}`
        };
      }
      
      return {
        success: true,
        repo: repoResult.repo,
        commit: uploadResult.commit
      };
      
    } catch (error) {
      console.error('[GitHubIntegration] Project repository creation failed:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  // Helper method to add Flutter .gitignore
  private async addFlutterGitignore(owner: string, repoName: string): Promise<void> {
    const flutterGitignore = `# Miscellaneous
*.class
*.log
*.pyc
*.swp
.DS_Store
.atom/
.buildlog/
.history
.svn/
migrate_working_dir/

# IntelliJ related
*.iml
*.ipr
*.iws
.idea/

# The .vscode folder contains launch configuration and tasks you configure in
# VS Code which you may wish to be included in version control, so this line
# is commented out by default.
#.vscode/

# Flutter/Dart/Pub related
**/doc/api/
**/ios/Flutter/app.framework/
**/ios/Flutter/Flutter.framework/
**/ios/Flutter/Flutter.podspec
**/ios/Flutter/Generated.xcconfig
**/ios/Flutter/ephemeral/
**/ios/Runner/GeneratedPluginRegistrant.*
**/android/gradle/
**/android/gradlew
**/android/gradlew.bat
**/android/local.properties
**/android/**/GeneratedPluginRegistrant.java
**/android/key.properties
*.jks

# Flutter Web
build/
.dart_tool/
.packages
pubspec.lock

# Node.js (if using for tools)
node_modules/

# IDE
.vscode/
.idea/

# Environment
.env
.env.local
.env.*.local`;

    try {
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path: '.gitignore',
        message: 'Add Flutter .gitignore',
        content: Buffer.from(flutterGitignore).toString('base64')
      });
    } catch (error) {
      console.warn('[GitHubIntegration] Failed to add Flutter .gitignore:', error);
      // Don't throw - this is not critical
    }
  }
  
  // Validate GitHub token
  async validateToken(): Promise<{
    valid: boolean;
    user?: {
      login: string;
      name: string;
      email: string;
    };
    error?: string;
  }> {
    try {
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      
      return {
        valid: true,
        user: {
          login: user.login,
          name: user.name || user.login,
          email: user.email || ''
        }
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.status === 401 ? 'Invalid token' : error.message
      };
    }
  }
}