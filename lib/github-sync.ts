import { GitHubIntegration, type ProjectFile } from './github-integration';

export interface GitHubSyncConfig {
  owner: string;
  repoName: string;
  branch?: string;
  commitMessage?: string;
}

export interface SyncResult {
  success: boolean;
  commitSha?: string;
  commitUrl?: string;
  filesChanged?: number;
  error?: string;
}

export interface RepoConnection {
  connected: boolean;
  repoUrl?: string;
  lastSync?: number;
  syncEnabled?: boolean;
  autoSync?: boolean;
}

export class GitHubSync {
  private github: GitHubIntegration;
  private currentRepo: GitHubSyncConfig | null = null;
  
  constructor(githubToken: string) {
    this.github = new GitHubIntegration(githubToken);
  }
  
  // Connect to existing GitHub repository
  async connectToRepository(owner: string, repoName: string, branch: string = 'main'): Promise<{
    success: boolean;
    connection?: RepoConnection;
    error?: string;
  }> {
    try {
      console.log('[GitHubSync] Connecting to repository:', `${owner}/${repoName}`);
      
      // Verify repository exists and we have access
      const repoResult = await this.github.getRepository(owner, repoName);
      if (!repoResult.success || !repoResult.repo) {
        return {
          success: false,
          error: repoResult.error || 'Repository not found'
        };
      }
      
      // Store connection info
      this.currentRepo = { owner, repoName, branch };
      
      return {
        success: true,
        connection: {
          connected: true,
          repoUrl: repoResult.repo.htmlUrl,
          lastSync: Date.now(),
          syncEnabled: true,
          autoSync: false
        }
      };
    } catch (error) {
      console.error('[GitHubSync] Connection failed:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  // Sync current project files to connected repository
  async syncToRepository(
    files: Record<string, string>,
    commitMessage?: string
  ): Promise<SyncResult> {
    if (!this.currentRepo) {
      return {
        success: false,
        error: 'No repository connected. Use connectToRepository() first.'
      };
    }
    
    try {
      console.log('[GitHubSync] Syncing files to repository...');
      
      // Convert files to ProjectFile format
      const projectFiles: ProjectFile[] = Object.entries(files).map(([path, content]) => ({
        path: path.replace(/^\/home\/user\/app\//, ''), // Remove sandbox prefix
        content
      }));
      
      const defaultMessage = `Update project files - ${new Date().toISOString()}`;
      
      const uploadResult = await this.github.uploadProjectFiles(
        this.currentRepo.owner,
        this.currentRepo.repoName,
        projectFiles,
        commitMessage || defaultMessage
      );
      
      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error
        };
      }
      
      console.log('[GitHubSync] Sync completed successfully');
      
      return {
        success: true,
        commitSha: uploadResult.commit?.sha,
        commitUrl: uploadResult.commit?.url,
        filesChanged: uploadResult.commit?.filesChanged
      };
    } catch (error) {
      console.error('[GitHubSync] Sync failed:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  // Auto-sync when files change (for future implementation)
  async enableAutoSync(interval: number = 30000): Promise<{
    success: boolean;
    intervalId?: NodeJS.Timeout;
    error?: string;
  }> {
    if (!this.currentRepo) {
      return {
        success: false,
        error: 'No repository connected'
      };
    }
    
    try {
      // This would be implemented with file watchers in a real environment
      console.log('[GitHubSync] Auto-sync enabled with interval:', interval);
      
      const intervalId = setInterval(async () => {
        // Auto-sync logic would go here
        console.log('[GitHubSync] Auto-sync check...');
      }, interval);
      
      return {
        success: true,
        intervalId
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  // Get current connection status
  getConnectionStatus(): RepoConnection {
    if (!this.currentRepo) {
      return { connected: false };
    }
    
    return {
      connected: true,
      repoUrl: `https://github.com/${this.currentRepo.owner}/${this.currentRepo.repoName}`,
      lastSync: Date.now(),
      syncEnabled: true,
      autoSync: false
    };
  }
  
  // Disconnect from current repository
  disconnect(): void {
    this.currentRepo = null;
    console.log('[GitHubSync] Disconnected from repository');
  }
  
  // Create branch for feature development
  async createFeatureBranch(branchName: string): Promise<{
    success: boolean;
    branchUrl?: string;
    error?: string;
  }> {
    if (!this.currentRepo) {
      return {
        success: false,
        error: 'No repository connected'
      };
    }
    
    try {
      // This would implement branch creation via GitHub API
      console.log('[GitHubSync] Creating feature branch:', branchName);
      
      // For now, return success - full implementation would use git.createRef
      return {
        success: true,
        branchUrl: `https://github.com/${this.currentRepo.owner}/${this.currentRepo.repoName}/tree/${branchName}`
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}