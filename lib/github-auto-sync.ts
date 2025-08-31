import { GitHubSync, type SyncResult } from './github-sync';

export interface AutoSyncConfig {
  enabled: boolean;
  interval: number; // milliseconds
  onFileChange: boolean;
  commitMessageTemplate: string;
  maxCommitsPerHour: number;
}

export interface FileChangeEvent {
  filePath: string;
  content: string;
  changeType: 'created' | 'modified' | 'deleted';
  timestamp: number;
}

export interface AutoSyncStatus {
  enabled: boolean;
  lastSync?: number;
  nextSync?: number;
  pendingChanges: number;
  syncCount: number;
  errors: string[];
}

export class GitHubAutoSync {
  private githubSync: GitHubSync;
  private config: AutoSyncConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private pendingChanges: Map<string, FileChangeEvent> = new Map();
  private syncHistory: Array<{ timestamp: number; success: boolean; error?: string }> = [];
  private isRunning: boolean = false;
  
  constructor(githubSync: GitHubSync, config: Partial<AutoSyncConfig> = {}) {
    this.githubSync = githubSync;
    this.config = {
      enabled: false,
      interval: 60000, // 1 minute default
      onFileChange: true,
      commitMessageTemplate: 'Auto-sync: Update project files - {{timestamp}}',
      maxCommitsPerHour: 10,
      ...config
    };
  }
  
  // Start auto-sync monitoring
  start(): { success: boolean; error?: string } {
    if (this.isRunning) {
      return { success: false, error: 'Auto-sync is already running' };
    }
    
    if (!this.githubSync.getConnectionStatus().connected) {
      return { success: false, error: 'No GitHub repository connected' };
    }
    
    console.log('[GitHubAutoSync] Starting auto-sync with interval:', this.config.interval);
    
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.performAutoSync();
    }, this.config.interval);
    
    return { success: true };
  }
  
  // Stop auto-sync monitoring
  stop(): void {
    console.log('[GitHubAutoSync] Stopping auto-sync');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
  }
  
  // Record file change for batching
  recordFileChange(event: FileChangeEvent): void {
    if (!this.config.enabled || !this.config.onFileChange) {
      return;
    }
    
    console.log('[GitHubAutoSync] Recording file change:', event.filePath);
    this.pendingChanges.set(event.filePath, event);
    
    // If we have too many pending changes, trigger immediate sync
    if (this.pendingChanges.size > 10) {
      this.performAutoSync();
    }
  }
  
  // Perform automatic sync if conditions are met
  private async performAutoSync(): Promise<void> {
    if (!this.config.enabled || this.pendingChanges.size === 0) {
      return;
    }
    
    // Check rate limiting
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentSyncs = this.syncHistory.filter(sync => sync.timestamp > oneHourAgo);
    
    if (recentSyncs.length >= this.config.maxCommitsPerHour) {
      console.log('[GitHubAutoSync] Rate limit reached, skipping auto-sync');
      return;
    }
    
    try {
      console.log('[GitHubAutoSync] Performing auto-sync for', this.pendingChanges.size, 'changes');
      
      // Get current sandbox files
      const filesResponse = await fetch('/api/get-sandbox-files');
      const filesData = await filesResponse.json();
      
      if (!filesData.success || !filesData.files) {
        throw new Error('No project files found');
      }
      
      // Generate commit message
      const timestamp = new Date().toISOString();
      const commitMessage = this.config.commitMessageTemplate.replace('{{timestamp}}', timestamp);
      
      // Perform sync
      const syncResult = await this.githubSync.syncToRepository(filesData.files, commitMessage);
      
      if (syncResult.success) {
        // Record successful sync
        this.syncHistory.push({
          timestamp: Date.now(),
          success: true
        });
        
        // Clear pending changes
        this.pendingChanges.clear();
        
        console.log('[GitHubAutoSync] Auto-sync completed successfully');
      } else {
        throw new Error(syncResult.error || 'Sync failed');
      }
    } catch (error) {
      console.error('[GitHubAutoSync] Auto-sync failed:', error);
      
      // Record failed sync
      this.syncHistory.push({
        timestamp: Date.now(),
        success: false,
        error: (error as Error).message
      });
    }
  }
  
  // Get current auto-sync status
  getStatus(): AutoSyncStatus {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentSyncs = this.syncHistory.filter(sync => sync.timestamp > oneHourAgo);
    const recentErrors = this.syncHistory
      .filter(sync => !sync.success && sync.timestamp > oneHourAgo)
      .map(sync => sync.error || 'Unknown error');
    
    const lastSync = this.syncHistory.length > 0 
      ? this.syncHistory[this.syncHistory.length - 1].timestamp 
      : undefined;
    
    const nextSync = this.isRunning && lastSync 
      ? lastSync + this.config.interval 
      : undefined;
    
    return {
      enabled: this.isRunning,
      lastSync,
      nextSync,
      pendingChanges: this.pendingChanges.size,
      syncCount: recentSyncs.length,
      errors: recentErrors
    };
  }
  
  // Update configuration
  updateConfig(newConfig: Partial<AutoSyncConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart if interval changed and auto-sync is running
    if (this.isRunning && newConfig.interval && newConfig.interval !== this.config.interval) {
      this.stop();
      this.start();
    }
  }
  
  // Manual trigger for immediate sync
  async triggerSync(commitMessage?: string): Promise<SyncResult> {
    if (!this.githubSync.getConnectionStatus().connected) {
      return {
        success: false,
        error: 'No GitHub repository connected'
      };
    }
    
    try {
      // Get current files
      const filesResponse = await fetch('/api/get-sandbox-files');
      const filesData = await filesResponse.json();
      
      if (!filesData.success || !filesData.files) {
        return {
          success: false,
          error: 'No project files found'
        };
      }
      
      // Perform sync
      const defaultMessage = `Manual sync - ${new Date().toLocaleString()}`;
      const result = await this.githubSync.syncToRepository(
        filesData.files, 
        commitMessage || defaultMessage
      );
      
      if (result.success) {
        // Record sync and clear pending changes
        this.syncHistory.push({
          timestamp: Date.now(),
          success: true
        });
        this.pendingChanges.clear();
      } else {
        this.syncHistory.push({
          timestamp: Date.now(),
          success: false,
          error: result.error
        });
      }
      
      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        error: (error as Error).message
      };
      
      this.syncHistory.push({
        timestamp: Date.now(),
        success: false,
        error: errorResult.error
      });
      
      return errorResult;
    }
  }
  
  // Clean up old sync history
  cleanup(): void {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.syncHistory = this.syncHistory.filter(sync => sync.timestamp > oneDayAgo);
    console.log('[GitHubAutoSync] Cleaned up old sync history');
  }
}