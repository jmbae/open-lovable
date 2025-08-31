import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

interface CreateRepoRequest {
  repoName: string;
  description?: string;
  private?: boolean;
  projectType?: 'react' | 'flutter';
  includeReadme?: boolean;
}

interface CreateRepoResponse {
  success: boolean;
  repoUrl?: string;
  cloneUrl?: string;
  error?: string;
  repoData?: {
    id: number;
    name: string;
    fullName: string;
    private: boolean;
    defaultBranch: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { 
      repoName, 
      description, 
      private: isPrivate = true, 
      projectType = 'react',
      includeReadme = true 
    }: CreateRepoRequest = await request.json();
    
    console.log('[create-github-repo] Request received:', { 
      repoName, 
      description, 
      isPrivate, 
      projectType,
      includeReadme 
    });
    
    if (!repoName) {
      return NextResponse.json({
        success: false,
        error: 'Repository name is required'
      }, { status: 400 });
    }
    
    // Validate repository name format
    if (!/^[a-zA-Z0-9._-]+$/.test(repoName)) {
      return NextResponse.json({
        success: false,
        error: 'Repository name can only contain alphanumeric characters, periods, hyphens, and underscores'
      }, { status: 400 });
    }
    
    // Check if GitHub token is available
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    if (!githubToken) {
      return NextResponse.json({
        success: false,
        error: 'GitHub access token not configured. Please set GITHUB_TOKEN environment variable.'
      }, { status: 500 });
    }
    
    // Initialize Octokit with the token
    const octokit = new Octokit({
      auth: githubToken
    });
    
    // Generate appropriate description based on project type
    const defaultDescription = projectType === 'flutter' 
      ? `Flutter mobile application generated with Open Lovable AI`
      : `React web application generated with Open Lovable AI`;
    
    const repoDescription = description || defaultDescription;
    
    try {
      console.log('[create-github-repo] Creating repository...');
      
      // Create the repository
      const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        description: repoDescription,
        private: isPrivate,
        auto_init: includeReadme, // Creates initial README.md
        gitignore_template: projectType === 'flutter' ? undefined : 'Node', // GitHub doesn't have Flutter template
        license_template: 'mit'
      });
      
      console.log('[create-github-repo] Repository created successfully:', repo.full_name);
      
      // If Flutter project, create appropriate .gitignore
      if (projectType === 'flutter' && includeReadme) {
        try {
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

          await octokit.rest.repos.createOrUpdateFileContents({
            owner: repo.owner.login,
            repo: repo.name,
            path: '.gitignore',
            message: 'Add Flutter .gitignore',
            content: Buffer.from(flutterGitignore).toString('base64')
          });
          
          console.log('[create-github-repo] Flutter .gitignore added');
        } catch (gitignoreError) {
          console.warn('[create-github-repo] Failed to add Flutter .gitignore:', gitignoreError);
          // Don't fail the entire operation for this
        }
      }
      
      const response: CreateRepoResponse = {
        success: true,
        repoUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        repoData: {
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          private: repo.private,
          defaultBranch: repo.default_branch
        }
      };
      
      return NextResponse.json(response);
      
    } catch (githubError: any) {
      console.error('[create-github-repo] GitHub API error:', githubError);
      
      // Handle specific GitHub API errors
      if (githubError.status === 422) {
        return NextResponse.json({
          success: false,
          error: `Repository name "${repoName}" already exists or is invalid`
        }, { status: 422 });
      } else if (githubError.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'GitHub authentication failed. Please check your access token.'
        }, { status: 401 });
      } else if (githubError.status === 403) {
        return NextResponse.json({
          success: false,
          error: 'GitHub API rate limit exceeded or insufficient permissions'
        }, { status: 403 });
      }
      
      return NextResponse.json({
        success: false,
        error: `GitHub API error: ${githubError.message || 'Unknown error'}`
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[create-github-repo] API error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

// Upload project files to GitHub repository
export async function PUT(request: NextRequest) {
  try {
    const { 
      repoOwner,
      repoName, 
      files,
      commitMessage = 'Initial commit from Open Lovable'
    } = await request.json();
    
    console.log('[create-github-repo] Upload request:', { repoOwner, repoName, fileCount: files?.length });
    
    if (!repoOwner || !repoName || !files) {
      return NextResponse.json({
        success: false,
        error: 'Repository owner, name, and files are required'
      }, { status: 400 });
    }
    
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    if (!githubToken) {
      return NextResponse.json({
        success: false,
        error: 'GitHub access token not configured'
      }, { status: 500 });
    }
    
    const octokit = new Octokit({
      auth: githubToken
    });
    
    try {
      // Get the default branch
      const { data: repo } = await octokit.rest.repos.get({
        owner: repoOwner,
        repo: repoName
      });
      
      const defaultBranch = repo.default_branch;
      
      // Get the latest commit SHA
      const { data: ref } = await octokit.rest.git.getRef({
        owner: repoOwner,
        repo: repoName,
        ref: `heads/${defaultBranch}`
      });
      
      const baseCommitSha = ref.object.sha;
      
      // Create blobs for all files
      const fileBlobs = [];
      for (const file of files) {
        const { data: blob } = await octokit.rest.git.createBlob({
          owner: repoOwner,
          repo: repoName,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64'
        });
        
        fileBlobs.push({
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha
        });
      }
      
      // Create a tree with all files
      const { data: tree } = await octokit.rest.git.createTree({
        owner: repoOwner,
        repo: repoName,
        base_tree: baseCommitSha,
        tree: fileBlobs
      });
      
      // Create a commit
      const { data: commit } = await octokit.rest.git.createCommit({
        owner: repoOwner,
        repo: repoName,
        message: commitMessage,
        tree: tree.sha,
        parents: [baseCommitSha]
      });
      
      // Update the reference
      await octokit.rest.git.updateRef({
        owner: repoOwner,
        repo: repoName,
        ref: `heads/${defaultBranch}`,
        sha: commit.sha
      });
      
      console.log('[create-github-repo] Files uploaded successfully, commit:', commit.sha);
      
      return NextResponse.json({
        success: true,
        commitSha: commit.sha,
        commitUrl: commit.html_url,
        filesUploaded: files.length,
        message: `Successfully uploaded ${files.length} files to ${repoOwner}/${repoName}`
      });
      
    } catch (uploadError: any) {
      console.error('[create-github-repo] Upload error:', uploadError);
      
      if (uploadError.status === 404) {
        return NextResponse.json({
          success: false,
          error: `Repository ${repoOwner}/${repoName} not found or access denied`
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: false,
        error: `Upload failed: ${uploadError.message || 'Unknown error'}`
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[create-github-repo] Upload API error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

// Get repository information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoOwner = searchParams.get('owner');
    const repoName = searchParams.get('name');
    
    if (!repoOwner || !repoName) {
      return NextResponse.json({
        success: false,
        error: 'Repository owner and name are required'
      }, { status: 400 });
    }
    
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    if (!githubToken) {
      return NextResponse.json({
        success: false,
        error: 'GitHub access token not configured'
      }, { status: 500 });
    }
    
    const octokit = new Octokit({
      auth: githubToken
    });
    
    try {
      const { data: repo } = await octokit.rest.repos.get({
        owner: repoOwner,
        repo: repoName
      });
      
      return NextResponse.json({
        success: true,
        repository: {
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          private: repo.private,
          description: repo.description,
          url: repo.html_url,
          cloneUrl: repo.clone_url,
          defaultBranch: repo.default_branch,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at
        }
      });
      
    } catch (repoError: any) {
      if (repoError.status === 404) {
        return NextResponse.json({
          success: false,
          error: 'Repository not found or access denied'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: false,
        error: `Failed to fetch repository: ${repoError.message}`
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[create-github-repo] GET error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}