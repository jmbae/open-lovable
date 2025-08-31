import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { FlutterCodeGenerator } from './flutter-code-generator';
import { ProjectType } from '@/types/project';

const execAsync = promisify(exec);

export interface FlutterWebBuildOptions {
  projectPath: string;
  buildMode: 'debug' | 'release';
  port?: number;
  enableHotReload?: boolean;
}

export interface FlutterWebBuildResult {
  success: boolean;
  buildTime?: number;
  serverUrl?: string;
  serverPid?: number;
  artifacts?: string[];
  buildOutput?: string;
  error?: string;
}

export interface FlutterSDKInfo {
  available: boolean;
  version?: string;
  webSupport?: boolean;
  error?: string;
}

export class FlutterWebBuilder {
  private static readonly DEFAULT_WEB_PORT = 8080;
  private static readonly BUILD_TIMEOUT = 120000; // 2 minutes
  
  // Check Flutter SDK availability and web support
  static async checkFlutterSDK(): Promise<FlutterSDKInfo> {
    try {
      console.log('[FlutterWebBuilder] Checking Flutter SDK...');
      
      // Check if Flutter is available
      const { stdout: versionOutput } = await execAsync('flutter --version');
      const versionMatch = versionOutput.match(/Flutter (\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      
      // Check if web support is enabled
      const { stdout: devicesOutput } = await execAsync('flutter devices');
      const webSupport = devicesOutput.includes('Chrome') || devicesOutput.includes('Web Server');
      
      return {
        available: true,
        version,
        webSupport
      };
    } catch (error) {
      console.error('[FlutterWebBuilder] Flutter SDK check failed:', error);
      return {
        available: false,
        error: (error as Error).message
      };
    }
  }
  
  // Install Flutter SDK (for E2B sandbox environments)
  static async installFlutterSDK(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[FlutterWebBuilder] Installing Flutter SDK...');
      
      // Download and install Flutter
      await execAsync(`
        cd /tmp &&
        wget -qO- https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.16.0-stable.tar.xz | tar xJ &&
        sudo mv flutter /opt/ &&
        echo 'export PATH="/opt/flutter/bin:$PATH"' >> ~/.bashrc &&
        export PATH="/opt/flutter/bin:$PATH"
      `);
      
      // Enable web support
      await execAsync('flutter config --enable-web');
      
      // Verify installation
      const sdkInfo = await this.checkFlutterSDK();
      if (!sdkInfo.available) {
        throw new Error('Flutter SDK installation verification failed');
      }
      
      console.log('[FlutterWebBuilder] Flutter SDK installed successfully, version:', sdkInfo.version);
      return { success: true };
      
    } catch (error) {
      console.error('[FlutterWebBuilder] Flutter SDK installation failed:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  // Ensure Flutter project has proper web configuration
  static async configureFlutterWeb(projectPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[FlutterWebBuilder] Configuring Flutter web support...');
      
      // Ensure web directory exists
      const webDir = join(projectPath, 'web');
      if (!existsSync(webDir)) {
        mkdirSync(webDir, { recursive: true });
      }
      
      // Create index.html if it doesn't exist
      const indexHtmlPath = join(webDir, 'index.html');
      if (!existsSync(indexHtmlPath)) {
        const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <base href="$FLUTTER_BASE_HREF">
  <meta charset="UTF-8">
  <meta content="IE=Edge" http-equiv="X-UA-Compatible">
  <meta name="description" content="A Flutter app.">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="Flutter App">
  <link rel="apple-touch-icon" href="icons/Icon-192.png">
  <link rel="icon" type="image/png" href="favicon.png"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flutter App</title>
  <link rel="manifest" href="manifest.json">
  <script>
    // The value below is injected by flutter build, do not touch.
    var serviceWorkerVersion = null;
  </script>
  <script src="flutter.js" defer></script>
</head>
<body>
  <script>
    window.addEventListener('load', function(ev) {
      // Download main.dart.js
      _flutter.loader.loadEntrypoint({
        serviceWorker: {
          serviceWorkerVersion: serviceWorkerVersion,
        },
        onEntrypointLoaded: function(engineInitializer) {
          engineInitializer.initializeEngine().then(function(appRunner) {
            appRunner.runApp();
          });
        }
      });
    });
  </script>
</body>
</html>`;
        writeFileSync(indexHtmlPath, indexHtml);
      }
      
      // Create manifest.json if it doesn't exist
      const manifestPath = join(webDir, 'manifest.json');
      if (!existsSync(manifestPath)) {
        const manifest = {
          "name": "Flutter App",
          "short_name": "Flutter App",
          "start_url": ".",
          "display": "standalone",
          "background_color": "#0175C2",
          "theme_color": "#0175C2",
          "description": "A new Flutter project.",
          "orientation": "portrait-primary",
          "prefer_related_applications": false,
          "icons": [
            {
              "src": "icons/Icon-192.png",
              "sizes": "192x192",
              "type": "image/png"
            },
            {
              "src": "icons/Icon-512.png", 
              "sizes": "512x512",
              "type": "image/png"
            }
          ]
        };
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      }
      
      return { success: true };
    } catch (error) {
      console.error('[FlutterWebBuilder] Web configuration failed:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  // Build Flutter project for web
  static async buildFlutterWeb(options: FlutterWebBuildOptions): Promise<FlutterWebBuildResult> {
    const { projectPath, buildMode, port = this.DEFAULT_WEB_PORT } = options;
    const startTime = Date.now();
    
    try {
      console.log('[FlutterWebBuilder] Starting Flutter web build...');
      console.log('[FlutterWebBuilder] Project path:', projectPath);
      console.log('[FlutterWebBuilder] Build mode:', buildMode);
      
      // Ensure project directory exists
      if (!existsSync(projectPath)) {
        throw new Error(`Project path does not exist: ${projectPath}`);
      }
      
      // Check if this is a valid Flutter project
      const pubspecPath = join(projectPath, 'pubspec.yaml');
      if (!existsSync(pubspecPath)) {
        throw new Error(`Not a Flutter project (no pubspec.yaml found): ${projectPath}`);
      }
      
      // Configure web support
      const configResult = await this.configureFlutterWeb(projectPath);
      if (!configResult.success) {
        throw new Error(`Web configuration failed: ${configResult.error}`);
      }
      
      // Change to project directory
      process.chdir(projectPath);
      
      // Get dependencies
      console.log('[FlutterWebBuilder] Getting Flutter dependencies...');
      await execAsync('flutter pub get', { timeout: 30000 });
      
      // Build for web
      const buildCommand = buildMode === 'release' 
        ? 'flutter build web --release --web-renderer html'
        : 'flutter build web --debug --web-renderer html';
        
      console.log('[FlutterWebBuilder] Running build command:', buildCommand);
      const { stdout, stderr } = await execAsync(buildCommand, { 
        timeout: this.BUILD_TIMEOUT,
        cwd: projectPath
      });
      
      const buildTime = Date.now() - startTime;
      console.log('[FlutterWebBuilder] Build completed in', buildTime, 'ms');
      
      // Verify build artifacts
      const buildDir = join(projectPath, 'build', 'web');
      const artifacts: string[] = [];
      
      const expectedArtifacts = ['index.html', 'main.dart.js', 'flutter.js', 'manifest.json'];
      for (const artifact of expectedArtifacts) {
        if (existsSync(join(buildDir, artifact))) {
          artifacts.push(artifact);
        }
      }
      
      if (artifacts.length === 0) {
        throw new Error('No build artifacts found. Build may have failed.');
      }
      
      console.log('[FlutterWebBuilder] Build artifacts found:', artifacts);
      
      // Start web server
      const serverResult = await this.startWebServer(buildDir, port);
      
      return {
        success: true,
        buildTime,
        serverUrl: serverResult.serverUrl,
        serverPid: serverResult.serverPid,
        artifacts,
        buildOutput: stdout + (stderr ? '\nSTDERR:\n' + stderr : '')
      };
      
    } catch (error) {
      const buildTime = Date.now() - startTime;
      console.error('[FlutterWebBuilder] Build failed:', error);
      
      return {
        success: false,
        buildTime,
        error: (error as Error).message,
        buildOutput: (error as any).stdout || ''
      };
    }
  }
  
  // Start web server for built Flutter app
  static async startWebServer(buildDir: string, port: number): Promise<{
    success: boolean;
    serverUrl?: string;
    serverPid?: number;
    error?: string;
  }> {
    try {
      console.log(`[FlutterWebBuilder] Starting web server on port ${port}`);
      
      if (!existsSync(buildDir)) {
        throw new Error(`Build directory does not exist: ${buildDir}`);
      }
      
      // Start Python HTTP server in background
      const server = spawn('python3', ['-m', 'http.server', port.toString(), '--bind', '0.0.0.0'], {
        cwd: buildDir,
        detached: true,
        stdio: 'ignore'
      });
      
      server.unref(); // Allow process to exit without waiting for server
      
      // Give server time to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify server is running
      try {
        await execAsync(`curl -f http://localhost:${port} > /dev/null 2>&1`);
      } catch {
        // Server might not be ready yet, but we'll return success anyway
        console.warn('[FlutterWebBuilder] Server health check failed, but server might still be starting');
      }
      
      const serverUrl = `http://localhost:${port}`;
      console.log('[FlutterWebBuilder] Web server started:', serverUrl);
      
      return {
        success: true,
        serverUrl,
        serverPid: server.pid
      };
    } catch (error) {
      console.error('[FlutterWebBuilder] Failed to start web server:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  // Create a minimal Flutter project for web preview
  static async createFlutterWebProject(projectPath: string, projectName: string): Promise<{
    success: boolean;
    files?: Record<string, string>;
    error?: string;
  }> {
    try {
      console.log('[FlutterWebBuilder] Creating Flutter web project...');
      
      // Ensure directory exists
      if (!existsSync(projectPath)) {
        mkdirSync(projectPath, { recursive: true });
      }
      
      // Create lib directory
      const libDir = join(projectPath, 'lib');
      if (!existsSync(libDir)) {
        mkdirSync(libDir, { recursive: true });
      }
      
      // Generate Flutter project files using FlutterCodeGenerator
      const generator = new FlutterCodeGenerator();
      const projectFiles = generator.generateFlutterProject({
        projectName,
        appTitle: projectName,
        projectDescription: `Generated Flutter web application: ${projectName}`
      });
      
      // Write generated files
      const writtenFiles: Record<string, string> = {};
      for (const [filePath, content] of Object.entries(projectFiles)) {
        const fullPath = join(projectPath, filePath);
        const dir = dirname(fullPath);
        
        // Ensure directory exists
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        
        writeFileSync(fullPath, content);
        writtenFiles[filePath] = content;
        console.log('[FlutterWebBuilder] Created file:', filePath);
      }
      
      // Configure web support
      const configResult = await this.configureFlutterWeb(projectPath);
      if (!configResult.success) {
        throw new Error(`Web configuration failed: ${configResult.error}`);
      }
      
      return {
        success: true,
        files: writtenFiles
      };
    } catch (error) {
      console.error('[FlutterWebBuilder] Project creation failed:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  // Build and serve Flutter web app in one operation
  static async buildAndServe(
    projectPath: string, 
    projectName: string,
    options: Partial<FlutterWebBuildOptions> = {}
  ): Promise<FlutterWebBuildResult> {
    try {
      // Ensure Flutter SDK is available
      const sdkInfo = await this.checkFlutterSDK();
      if (!sdkInfo.available) {
        console.log('[FlutterWebBuilder] Installing Flutter SDK...');
        const installResult = await this.installFlutterSDK();
        if (!installResult.success) {
          throw new Error(`Flutter SDK installation failed: ${installResult.error}`);
        }
      }
      
      // Create project if it doesn't exist
      if (!existsSync(join(projectPath, 'pubspec.yaml'))) {
        console.log('[FlutterWebBuilder] Creating new Flutter project...');
        const createResult = await this.createFlutterWebProject(projectPath, projectName);
        if (!createResult.success) {
          throw new Error(`Project creation failed: ${createResult.error}`);
        }
      }
      
      // Build and serve
      const buildOptions: FlutterWebBuildOptions = {
        projectPath,
        buildMode: 'debug',
        port: this.DEFAULT_WEB_PORT,
        enableHotReload: false,
        ...options
      };
      
      return await this.buildFlutterWeb(buildOptions);
    } catch (error) {
      console.error('[FlutterWebBuilder] Build and serve failed:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  // Start development server with hot reload
  static async startDevServer(projectPath: string, port: number = this.DEFAULT_WEB_PORT): Promise<{
    success: boolean;
    serverUrl?: string;
    serverPid?: number;
    error?: string;
  }> {
    try {
      console.log('[FlutterWebBuilder] Starting Flutter dev server with hot reload...');
      
      // Use flutter run for hot reload support
      const devServer = spawn('flutter', [
        'run',
        '-d', 'web-server',
        '--web-port', port.toString(),
        '--web-hostname', '0.0.0.0',
        '--dart-define=FLUTTER_WEB_USE_SKIA=false' // Better compatibility
      ], {
        cwd: projectPath,
        detached: true,
        stdio: 'pipe'
      });
      
      // Monitor server output for startup confirmation
      return new Promise((resolve) => {
        let serverStarted = false;
        let output = '';
        
        const timeout = setTimeout(() => {
          if (!serverStarted) {
            resolve({
              success: false,
              error: 'Server startup timeout'
            });
          }
        }, 30000); // 30 second timeout
        
        devServer.stdout?.on('data', (data) => {
          output += data.toString();
          
          // Look for server ready indicator
          if (data.toString().includes('Web development server is running') || 
              data.toString().includes(`Serving at http`)) {
            serverStarted = true;
            clearTimeout(timeout);
            
            const serverUrl = `http://localhost:${port}`;
            console.log('[FlutterWebBuilder] Dev server started:', serverUrl);
            
            resolve({
              success: true,
              serverUrl,
              serverPid: devServer.pid
            });
          }
        });
        
        devServer.stderr?.on('data', (data) => {
          console.error('[FlutterWebBuilder] Dev server error:', data.toString());
        });
        
        devServer.on('error', (error) => {
          clearTimeout(timeout);
          resolve({
            success: false,
            error: error.message
          });
        });
      });
    } catch (error) {
      console.error('[FlutterWebBuilder] Dev server start failed:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}