import { useState, useEffect } from 'react';
import { Loader2, ExternalLink, RefreshCw, Terminal, Smartphone, Monitor } from 'lucide-react';

interface SandboxPreviewProps {
  sandboxId: string;
  port: number;
  type: 'vite' | 'nextjs' | 'flutter' | 'console';
  output?: string;
  isLoading?: boolean;
}

export default function SandboxPreview({ 
  sandboxId, 
  port, 
  type, 
  output,
  isLoading = false 
}: SandboxPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showConsole, setShowConsole] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isMobileView, setIsMobileView] = useState(true); // For Flutter mobile simulation

  useEffect(() => {
    if (sandboxId && type !== 'console') {
      // In production, this would be the actual E2B sandbox URL
      // Format: https://{sandboxId}-{port}.e2b.dev
      // Flutter uses port 8080 by default for web builds
      const actualPort = type === 'flutter' ? 8080 : port;
      setPreviewUrl(`https://${sandboxId}-${actualPort}.e2b.dev`);
    }
  }, [sandboxId, port, type]);

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
  };

  const toggleMobileView = () => {
    setIsMobileView(!isMobileView);
  };

  if (type === 'console') {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="font-mono text-sm whitespace-pre-wrap text-gray-300">
          {output || 'No output yet...'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview Controls */}
      <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3 border border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {type === 'vite' ? '⚡ Vite' : 
             type === 'flutter' ? '📱 Flutter' : '▲ Next.js'} Preview
          </span>
          <code className="text-xs bg-gray-900 px-2 py-1 rounded text-blue-400">
            {previewUrl || 'No URL available'}
          </code>
        </div>
        <div className="flex items-center gap-2">
          {type === 'flutter' && (
            <button
              onClick={toggleMobileView}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title={isMobileView ? "Switch to desktop view" : "Switch to mobile view"}
            >
              {isMobileView ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => setShowConsole(!showConsole)}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title="Toggle console"
          >
            <Terminal className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title="Refresh preview"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Main Preview */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                {type === 'vite' ? 'Starting Vite dev server...' : 
                 type === 'flutter' ? 'Building Flutter web app...' : 'Starting Next.js dev server...'}
              </p>
            </div>
          </div>
        )}
        
        {type === 'flutter' ? (
          // Flutter mobile simulation view
          <div className="flex justify-center items-center p-8 bg-gray-800">
            <div className={`relative bg-white rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-300 ${
              isMobileView 
                ? 'w-[375px] h-[667px]' // iPhone SE dimensions
                : 'w-full max-w-4xl h-[600px]' // Desktop view
            }`}>
              {/* Mobile device frame (only in mobile view) */}
              {isMobileView && (
                <>
                  {/* Top notch/status bar */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-lg z-10"></div>
                  {/* Home indicator */}
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gray-400 rounded-full z-10"></div>
                </>
              )}
              
              <iframe
                key={iframeKey}
                src={previewUrl || 'about:blank'}
                className="w-full h-full bg-white border-0"
                title="Flutter mobile preview"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
          </div>
        ) : (
          // Standard web preview for React/Next.js
          <iframe
            key={iframeKey}
            src={previewUrl || 'about:blank'}
            className="w-full h-[600px] bg-white"
            title={`${type} preview`}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        )}
      </div>

      {/* Console Output (Toggle) */}
      {showConsole && output && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-400">Console Output</span>
          </div>
          <div className="font-mono text-xs whitespace-pre-wrap text-gray-300 max-h-48 overflow-y-auto">
            {output}
          </div>
        </div>
      )}
    </div>
  );
}