import { useState } from 'react';
import { Github, Loader2, Check, AlertCircle } from 'lucide-react';
import { ProjectType } from '@/types/project';

interface GitHubRepoButtonProps {
  sandboxData: any;
  currentProjectType: ProjectType;
  disabled?: boolean;
}

interface CreateRepoState {
  isCreating: boolean;
  showDialog: boolean;
  repoName: string;
  description: string;
  isPrivate: boolean;
  success: boolean;
  error: string | null;
  repoUrl: string | null;
}

export default function GitHubRepoButton({ 
  sandboxData, 
  currentProjectType, 
  disabled = false 
}: GitHubRepoButtonProps) {
  const [state, setState] = useState<CreateRepoState>({
    isCreating: false,
    showDialog: false,
    repoName: '',
    description: '',
    isPrivate: true,
    success: false,
    error: null,
    repoUrl: null
  });

  const openDialog = () => {
    const defaultName = currentProjectType === ProjectType.FLUTTER_MOBILE 
      ? 'flutter-app' 
      : 'react-app';
    const defaultDescription = currentProjectType === ProjectType.FLUTTER_MOBILE
      ? 'Flutter mobile application generated with Open Lovable AI'
      : 'React web application generated with Open Lovable AI';

    setState(prev => ({
      ...prev,
      showDialog: true,
      repoName: defaultName,
      description: defaultDescription,
      success: false,
      error: null,
      repoUrl: null
    }));
  };

  const closeDialog = () => {
    setState(prev => ({
      ...prev,
      showDialog: false,
      isCreating: false,
      success: false,
      error: null
    }));
  };

  const createRepository = async () => {
    if (!state.repoName.trim()) {
      setState(prev => ({ ...prev, error: 'Repository name is required' }));
      return;
    }

    setState(prev => ({ ...prev, isCreating: true, error: null }));

    try {
      // Create GitHub repository
      const createResponse = await fetch('/api/create-github-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: state.repoName,
          description: state.description,
          private: state.isPrivate,
          projectType: currentProjectType === ProjectType.FLUTTER_MOBILE ? 'flutter' : 'react',
          includeReadme: true
        })
      });

      const createResult = await createResponse.json();

      if (!createResult.success) {
        throw new Error(createResult.error || 'Failed to create repository');
      }

      console.log('Repository created:', createResult.repoData);

      // Get current sandbox files
      const filesResponse = await fetch('/api/get-sandbox-files');
      const filesData = await filesResponse.json();

      if (!filesData.success || !filesData.files) {
        throw new Error('No project files found to upload');
      }

      // Upload project files to the repository
      const uploadResponse = await fetch('/api/create-github-repo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoOwner: createResult.repoData.fullName.split('/')[0],
          repoName: createResult.repoData.name,
          files: Object.entries(filesData.files).map(([path, content]) => ({
            path: path.replace(/^\/home\/user\/app\//, ''), // Remove sandbox path prefix
            content: content as string
          })),
          commitMessage: `Initial ${currentProjectType === ProjectType.FLUTTER_MOBILE ? 'Flutter' : 'React'} project from Open Lovable`
        })
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload files');
      }

      setState(prev => ({
        ...prev,
        isCreating: false,
        success: true,
        repoUrl: createResult.repoUrl,
        error: null
      }));

    } catch (error) {
      console.error('GitHub repository creation failed:', error);
      setState(prev => ({
        ...prev,
        isCreating: false,
        error: (error as Error).message
      }));
    }
  };

  if (!state.showDialog) {
    return (
      <button
        onClick={openDialog}
        disabled={disabled || !sandboxData}
        className="inline-flex items-center gap-2 bg-[#2D3748] text-white px-3 py-2 rounded-[10px] text-sm font-medium [box-shadow:inset_0px_-2px_0px_0px_#1A202C,_0px_1px_6px_0px_rgba(0,_0,_0,_30%)] hover:translate-y-[1px] hover:scale-[0.98] hover:[box-shadow:inset_0px_-1px_0px_0px_#1A202C,_0px_1px_3px_0px_rgba(0,_0,_0,_20%)] active:translate-y-[2px] active:scale-[0.97] active:[box-shadow:inset_0px_1px_1px_0px_#1A202C,_0px_1px_2px_0px_rgba(0,_0,_0,_15%)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Create GitHub private repository"
      >
        <Github className="w-4 h-4" />
        GitHub
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <Github className="w-6 h-6" />
          <h3 className="text-lg font-semibold">Create GitHub Repository</h3>
        </div>

        {state.success ? (
          <div className="text-center py-4">
            <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h4 className="text-lg font-semibold text-green-700 mb-2">Repository Created!</h4>
            <p className="text-gray-600 mb-4">
              Your {currentProjectType === ProjectType.FLUTTER_MOBILE ? 'Flutter' : 'React'} project has been uploaded to GitHub.
            </p>
            <a
              href={state.repoUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#2D3748] text-white px-4 py-2 rounded-lg hover:bg-[#4A5568] transition-colors"
            >
              <Github className="w-4 h-4" />
              View Repository
            </a>
            <button
              onClick={closeDialog}
              className="block w-full mt-3 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repository Name *
                </label>
                <input
                  type="text"
                  value={state.repoName}
                  onChange={(e) => setState(prev => ({ ...prev, repoName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="my-awesome-app"
                  disabled={state.isCreating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={state.description}
                  onChange={(e) => setState(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                  placeholder="Describe your project..."
                  disabled={state.isCreating}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="private-repo"
                  checked={state.isPrivate}
                  onChange={(e) => setState(prev => ({ ...prev, isPrivate: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={state.isCreating}
                />
                <label htmlFor="private-repo" className="text-sm text-gray-700">
                  Create as private repository
                </label>
              </div>

              {state.error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{state.error}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeDialog}
                disabled={state.isCreating}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={createRepository}
                disabled={state.isCreating || !state.repoName.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#2D3748] text-white px-4 py-2 rounded-lg hover:bg-[#4A5568] transition-colors disabled:opacity-50"
              >
                {state.isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4" />
                    Create Repository
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}