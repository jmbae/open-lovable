import { useState, useEffect } from 'react';
import { Github, GitBranch, Loader2, Check, AlertCircle, Link, Unlink } from 'lucide-react';

interface GitHubConnection {
  connected: boolean;
  repoUrl?: string;
  lastSync?: number;
  syncEnabled?: boolean;
  autoSync?: boolean;
}

interface GitHubSyncStatusProps {
  onSyncComplete?: (result: any) => void;
}

export default function GitHubSyncStatus({ onSyncComplete }: GitHubSyncStatusProps) {
  const [connection, setConnection] = useState<GitHubConnection>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [connectForm, setConnectForm] = useState({
    owner: '',
    repoName: '',
    branch: 'main'
  });
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check GitHub sync status on component mount
  useEffect(() => {
    checkSyncStatus();
  }, []);

  const checkSyncStatus = async () => {
    try {
      const response = await fetch('/api/github-sync');
      const data = await response.json();
      
      if (data.configured && data.connection) {
        setConnection(data.connection);
        if (data.connection.lastSync) {
          setLastSyncTime(new Date(data.connection.lastSync));
        }
      }
    } catch (error) {
      console.error('Failed to check GitHub sync status:', error);
    }
  };

  const connectToRepository = async () => {
    if (!connectForm.owner || !connectForm.repoName) {
      setError('Owner and repository name are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/github-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          owner: connectForm.owner,
          repoName: connectForm.repoName,
          branch: connectForm.branch
        })
      });

      const result = await response.json();

      if (result.success && result.connection) {
        setConnection(result.connection);
        setShowConnectDialog(false);
        setConnectForm({ owner: '', repoName: '', branch: 'main' });
        console.log('Connected to GitHub repository successfully');
      } else {
        setError(result.error || 'Failed to connect to repository');
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const syncToRepository = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/github-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          commitMessage: `Update project - ${new Date().toLocaleString()}`
        })
      });

      const result = await response.json();

      if (result.success) {
        setLastSyncTime(new Date());
        setConnection(prev => ({ ...prev, lastSync: Date.now() }));
        
        if (onSyncComplete) {
          onSyncComplete(result);
        }
        
        console.log('Project synced to GitHub successfully');
      } else {
        setError(result.error || 'Sync failed');
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectRepository = async () => {
    try {
      await fetch('/api/github-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' })
      });

      setConnection({ connected: false });
      setLastSyncTime(null);
      console.log('Disconnected from GitHub repository');
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  if (!connection.connected) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowConnectDialog(true)}
          className="inline-flex items-center gap-2 bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-gray-600 transition-colors"
          title="Connect to existing GitHub repository"
        >
          <Link className="w-4 h-4" />
          Connect GitHub
        </button>

        {showConnectDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <Github className="w-6 h-6" />
                <h3 className="text-lg font-semibold">Connect to GitHub Repository</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repository Owner/Organization
                  </label>
                  <input
                    type="text"
                    value={connectForm.owner}
                    onChange={(e) => setConnectForm(prev => ({ ...prev, owner: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="username or organization"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    value={connectForm.repoName}
                    onChange={(e) => setConnectForm(prev => ({ ...prev, repoName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="repository-name"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch
                  </label>
                  <input
                    type="text"
                    value={connectForm.branch}
                    onChange={(e) => setConnectForm(prev => ({ ...prev, branch: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="main"
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowConnectDialog(false);
                    setError(null);
                  }}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={connectToRepository}
                  disabled={isLoading || !connectForm.owner || !connectForm.repoName}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4" />
                      Connect
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-green-700">
        <Check className="w-4 h-4" />
        <span>Connected to GitHub</span>
        {connection.repoUrl && (
          <a
            href={connection.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline"
          >
            {connection.repoUrl.split('/').slice(-2).join('/')}
          </a>
        )}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {lastSyncTime && (
          <span className="text-xs text-gray-500">
            Last sync: {lastSyncTime.toLocaleTimeString()}
          </span>
        )}
        
        <button
          onClick={syncToRepository}
          disabled={isLoading}
          className="inline-flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
          title="Sync current project to GitHub"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <GitBranch className="w-3 h-3" />
          )}
          Sync
        </button>
        
        <button
          onClick={disconnectRepository}
          className="p-1 text-gray-500 hover:text-red-600 transition-colors"
          title="Disconnect from GitHub repository"
        >
          <Unlink className="w-3 h-3" />
        </button>
      </div>

      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}