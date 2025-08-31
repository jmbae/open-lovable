import { NextRequest, NextResponse } from 'next/server';
import { GitHubSync } from '@/lib/github-sync';

interface SyncRequest {
  action: 'connect' | 'sync' | 'disconnect' | 'status';
  owner?: string;
  repoName?: string;
  branch?: string;
  commitMessage?: string;
}

// Global sync instance (in real app, this would be session-based)
declare global {
  var githubSync: GitHubSync | null;
}

export async function POST(request: NextRequest) {
  try {
    const { action, owner, repoName, branch, commitMessage }: SyncRequest = await request.json();
    
    console.log('[github-sync] Request received:', { action, owner, repoName, branch });
    
    // Get GitHub token
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    if (!githubToken) {
      return NextResponse.json({
        success: false,
        error: 'GitHub access token not configured'
      }, { status: 500 });
    }
    
    // Initialize sync instance if needed
    if (!global.githubSync) {
      global.githubSync = new GitHubSync(githubToken);
    }
    
    switch (action) {
      case 'connect':
        if (!owner || !repoName) {
          return NextResponse.json({
            success: false,
            error: 'Owner and repository name are required for connect action'
          }, { status: 400 });
        }
        
        const connectResult = await global.githubSync.connectToRepository(owner, repoName, branch);
        return NextResponse.json(connectResult);
        
      case 'sync':
        // Get current sandbox files
        const filesResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/get-sandbox-files`);
        const filesData = await filesResponse.json();
        
        if (!filesData.success || !filesData.files) {
          return NextResponse.json({
            success: false,
            error: 'No project files found to sync'
          }, { status: 400 });
        }
        
        const syncResult = await global.githubSync.syncToRepository(
          filesData.files,
          commitMessage
        );
        
        return NextResponse.json(syncResult);
        
      case 'disconnect':
        global.githubSync.disconnect();
        return NextResponse.json({ success: true, message: 'Disconnected from repository' });
        
      case 'status':
        const status = global.githubSync.getConnectionStatus();
        return NextResponse.json({ success: true, connection: status });
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('[github-sync] API error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

// Get current sync status
export async function GET(request: NextRequest) {
  try {
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    if (!githubToken) {
      return NextResponse.json({
        configured: false,
        error: 'GitHub token not configured'
      });
    }
    
    // Initialize sync instance if needed
    if (!global.githubSync) {
      global.githubSync = new GitHubSync(githubToken);
    }
    
    const status = global.githubSync.getConnectionStatus();
    
    return NextResponse.json({
      configured: true,
      connection: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[github-sync] GET error:', error);
    return NextResponse.json({
      configured: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}