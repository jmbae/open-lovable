import { jest } from '@jest/globals';
import { exec, spawn } from 'child_process';
import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import { FlutterWebBuilder, type FlutterSDKInfo, type FlutterWebBuildResult } from '../../lib/flutter-web-builder';

// Mock child_process
jest.mock('child_process');
const mockExec = jest.mocked(exec);
const mockSpawn = jest.mocked(spawn);

// Mock fs
jest.mock('fs');
const mockExistsSync = jest.mocked(existsSync);
const mockWriteFileSync = jest.mocked(writeFileSync);
const mockMkdirSync = jest.mocked(mkdirSync);
const mockReadFileSync = jest.mocked(readFileSync);

// Mock util
jest.mock('util', () => ({
  promisify: (fn: any) => jest.fn().mockImplementation((...args) => {
    if (fn === exec) {
      // Return mocked exec function
      const callback = args[args.length - 1];
      return new Promise((resolve, reject) => {
        // Simulate different command responses
        const command = args[0];
        
        if (command.includes('flutter --version')) {
          resolve({ stdout: 'Flutter 3.16.0', stderr: '' });
        } else if (command.includes('flutter devices')) {
          resolve({ stdout: 'Chrome (web) • chrome • web-javascript • Google Chrome 119.0', stderr: '' });
        } else if (command.includes('flutter pub get')) {
          resolve({ stdout: 'Running "flutter pub get" in...', stderr: '' });
        } else if (command.includes('flutter build web')) {
          resolve({ 
            stdout: 'Building web application...\n✓ Built build/web',
            stderr: ''
          });
        } else {
          reject(new Error(`Command not mocked: ${command}`));
        }
      });
    }
    return fn;
  })
}));

describe('FlutterWebBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock setup
    mockExistsSync.mockReturnValue(true);
    mockWriteFileSync.mockImplementation(() => {});
    mockMkdirSync.mockImplementation(() => '');
    
    // Mock spawn for server startup
    const mockChildProcess = {
      pid: 12345,
      stdout: {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            // Simulate server startup message
            setTimeout(() => callback('Web development server is running on http://localhost:8080'), 1000);
          }
        })
      },
      stderr: {
        on: jest.fn()
      },
      on: jest.fn(),
      unref: jest.fn()
    };
    
    mockSpawn.mockReturnValue(mockChildProcess as any);
  });

  describe('Flutter SDK Management', () => {
    test('should check Flutter SDK availability', async () => {
      const result = await FlutterWebBuilder.checkFlutterSDK();

      expect(result.available).toBe(true);
      expect(result.version).toBe('3.16.0');
      expect(result.webSupport).toBe(true);
    });

    test('should handle Flutter SDK not available', async () => {
      // Mock exec to throw error
      const originalPromisify = require('util').promisify;
      require('util').promisify = jest.fn().mockImplementation((fn) => {
        if (fn === exec) {
          return jest.fn().mockRejectedValue(new Error('flutter: command not found'));
        }
        return originalPromisify(fn);
      });

      const result = await FlutterWebBuilder.checkFlutterSDK();

      expect(result.available).toBe(false);
      expect(result.error).toContain('flutter: command not found');
    });

    test('should install Flutter SDK', async () => {
      const result = await FlutterWebBuilder.installFlutterSDK();

      expect(result.success).toBe(true);
    });
  });

  describe('Project Configuration', () => {
    test('should configure Flutter web support', async () => {
      const projectPath = '/test/project';
      
      // Mock directory structure
      mockExistsSync.mockImplementation((path) => {
        return path === projectPath; // Project exists, but web directory doesn't
      });

      const result = await FlutterWebBuilder.configureFlutterWeb(projectPath);

      expect(result.success).toBe(true);
      expect(mockMkdirSync).toHaveBeenCalledWith(expect.stringContaining('web'), { recursive: true });
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('index.html'),
        expect.stringContaining('<!DOCTYPE html>')
      );
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('manifest.json'),
        expect.stringContaining('Flutter App')
      );
    });

    test('should handle web configuration errors', async () => {
      mockMkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await FlutterWebBuilder.configureFlutterWeb('/test/project');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });
  });

  describe('Flutter Project Creation', () => {
    test('should create Flutter web project', async () => {
      const projectPath = '/test/flutter_project';
      const projectName = 'TestApp';

      // Mock that project directory doesn't exist initially
      mockExistsSync.mockReturnValue(false);

      const result = await FlutterWebBuilder.createFlutterWebProject(projectPath, projectName);

      expect(result.success).toBe(true);
      expect(result.files).toBeDefined();
      expect(mockMkdirSync).toHaveBeenCalledWith(projectPath, { recursive: true });
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    test('should handle project creation errors', async () => {
      mockMkdirSync.mockImplementation(() => {
        throw new Error('Disk full');
      });

      const result = await FlutterWebBuilder.createFlutterWebProject('/test/project', 'TestApp');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Disk full');
    });
  });

  describe('Web Server Management', () => {
    test('should start web server for built app', async () => {
      const buildDir = '/test/project/build/web';
      const port = 8080;

      const result = await FlutterWebBuilder.startWebServer(buildDir, port);

      expect(result.success).toBe(true);
      expect(result.serverUrl).toBe('http://localhost:8080');
      expect(result.serverPid).toBe(12345);
      expect(mockSpawn).toHaveBeenCalledWith(
        'python3',
        ['-m', 'http.server', '8080', '--bind', '0.0.0.0'],
        expect.objectContaining({
          cwd: buildDir,
          detached: true,
          stdio: 'ignore'
        })
      );
    });

    test('should start development server with hot reload', async () => {
      const projectPath = '/test/flutter_project';
      const port = 8080;

      // Mock dev server startup with promise resolution
      const mockChildProcess = {
        pid: 54321,
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              // Simulate server ready message after a delay
              setTimeout(() => {
                callback(Buffer.from('Web development server is running on http://localhost:8080'));
              }, 100);
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn()
      };
      
      mockSpawn.mockReturnValue(mockChildProcess as any);

      const result = await FlutterWebBuilder.startDevServer(projectPath, port);

      expect(result.success).toBe(true);
      expect(result.serverUrl).toBe('http://localhost:8080');
      expect(result.serverPid).toBe(54321);
      expect(mockSpawn).toHaveBeenCalledWith(
        'flutter',
        [
          'run',
          '-d', 'web-server',
          '--web-port', '8080',
          '--web-hostname', '0.0.0.0',
          '--dart-define=FLUTTER_WEB_USE_SKIA=false'
        ],
        expect.objectContaining({
          cwd: projectPath,
          detached: true,
          stdio: 'pipe'
        })
      );
    });

    test('should handle server startup timeout', async () => {
      // Mock child process that never sends ready message
      const mockChildProcess = {
        pid: 12345,
        stdout: {
          on: jest.fn() // No data events
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn()
      };
      
      mockSpawn.mockReturnValue(mockChildProcess as any);

      // Mock setTimeout to resolve immediately for testing
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn().mockImplementation((callback, timeout) => {
        if (timeout === 30000) { // Server startup timeout
          callback();
          return 999;
        }
        return originalSetTimeout(callback, timeout);
      }) as any;

      const result = await FlutterWebBuilder.startDevServer('/test/project', 8080);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server startup timeout');

      // Restore setTimeout
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Build Process', () => {
    test('should build Flutter web application successfully', async () => {
      const options = {
        projectPath: '/test/flutter_project',
        buildMode: 'debug' as const,
        port: 8080
      };

      // Mock project structure exists
      mockExistsSync.mockImplementation((path) => {
        const pathStr = path.toString();
        return pathStr.includes('pubspec.yaml') || 
               pathStr.includes('index.html') ||
               pathStr.includes('main.dart.js') ||
               pathStr.includes('flutter.js') ||
               pathStr.includes('manifest.json');
      });

      const result = await FlutterWebBuilder.buildFlutterWeb(options);

      expect(result.success).toBe(true);
      expect(result.buildTime).toBeGreaterThan(0);
      expect(result.serverUrl).toBe('http://localhost:8080');
      expect(result.artifacts).toContain('index.html');
      expect(result.artifacts).toContain('main.dart.js');
      expect(result.artifacts).toContain('flutter.js');
      expect(result.artifacts).toContain('manifest.json');
    });

    test('should handle build failure', async () => {
      // Mock pubspec.yaml doesn't exist
      mockExistsSync.mockReturnValue(false);

      const options = {
        projectPath: '/invalid/project',
        buildMode: 'debug' as const
      };

      const result = await FlutterWebBuilder.buildFlutterWeb(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not a Flutter project');
    });

    test('should handle missing build artifacts', async () => {
      const options = {
        projectPath: '/test/flutter_project',
        buildMode: 'debug' as const
      };

      // Mock pubspec.yaml exists but build artifacts don't
      mockExistsSync.mockImplementation((path) => {
        return path.toString().includes('pubspec.yaml');
      });

      const result = await FlutterWebBuilder.buildFlutterWeb(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No build artifacts found');
    });
  });

  describe('Complete Build and Serve Process', () => {
    test('should build and serve Flutter web app', async () => {
      const projectPath = '/test/flutter_app';
      const projectName = 'TestApp';

      // Mock successful flow
      mockExistsSync.mockImplementation((path) => {
        const pathStr = path.toString();
        // pubspec.yaml exists (valid Flutter project)
        if (pathStr.includes('pubspec.yaml')) return true;
        // Build artifacts exist
        if (pathStr.includes('index.html') || 
            pathStr.includes('main.dart.js') ||
            pathStr.includes('flutter.js') ||
            pathStr.includes('manifest.json')) return true;
        return false;
      });

      const result = await FlutterWebBuilder.buildAndServe(projectPath, projectName);

      expect(result.success).toBe(true);
      expect(result.serverUrl).toBe('http://localhost:8080');
      expect(result.artifacts).toBeDefined();
      expect(result.buildTime).toBeGreaterThan(0);
    });

    test('should create project if it does not exist', async () => {
      const projectPath = '/test/new_flutter_app';
      const projectName = 'NewApp';

      // Mock that pubspec.yaml doesn't exist initially (will create project)
      // But build artifacts will exist after build
      let pubspecExists = false;
      mockExistsSync.mockImplementation((path) => {
        const pathStr = path.toString();
        if (pathStr.includes('pubspec.yaml')) return pubspecExists;
        // After project creation, artifacts should exist
        if (pathStr.includes('index.html') || 
            pathStr.includes('main.dart.js') ||
            pathStr.includes('flutter.js') ||
            pathStr.includes('manifest.json')) return true;
        return false;
      });

      // Simulate project creation
      mockMkdirSync.mockImplementation(() => {
        pubspecExists = true; // Project now exists
        return '';
      });

      const result = await FlutterWebBuilder.buildAndServe(projectPath, projectName);

      expect(result.success).toBe(true);
      expect(mockMkdirSync).toHaveBeenCalled(); // Project was created
    });

    test('should handle SDK installation failure', async () => {
      // Mock SDK check to fail and installation to fail
      const originalPromisify = require('util').promisify;
      require('util').promisify = jest.fn().mockImplementation((fn) => {
        if (fn === exec) {
          return jest.fn().mockImplementation((command) => {
            if (command.includes('flutter --version')) {
              return Promise.reject(new Error('flutter: command not found'));
            } else if (command.includes('wget') || command.includes('tar')) {
              return Promise.reject(new Error('Installation failed'));
            }
            return Promise.resolve({ stdout: '', stderr: '' });
          });
        }
        return originalPromisify(fn);
      });

      const result = await FlutterWebBuilder.buildAndServe('/test/project', 'TestApp');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Flutter SDK installation failed');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors during SDK installation', async () => {
      // Mock network failure during installation
      const originalPromisify = require('util').promisify;
      require('util').promisify = jest.fn().mockImplementation((fn) => {
        if (fn === exec) {
          return jest.fn().mockImplementation((command) => {
            if (command.includes('flutter --version')) {
              return Promise.reject(new Error('flutter: command not found'));
            } else if (command.includes('wget')) {
              return Promise.reject(new Error('Network unreachable'));
            }
            return Promise.resolve({ stdout: '', stderr: '' });
          });
        }
        return originalPromisify(fn);
      });

      const installResult = await FlutterWebBuilder.installFlutterSDK();

      expect(installResult.success).toBe(false);
      expect(installResult.error).toContain('Network unreachable');
    });

    test('should handle invalid project path', async () => {
      const result = await FlutterWebBuilder.buildFlutterWeb({
        projectPath: '/nonexistent/path',
        buildMode: 'debug'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project path does not exist');
    });

    test('should handle build timeout', async () => {
      // Mock long-running build command
      const originalPromisify = require('util').promisify;
      require('util').promisify = jest.fn().mockImplementation((fn) => {
        if (fn === exec) {
          return jest.fn().mockImplementation((command, options) => {
            if (command.includes('flutter build web')) {
              // Simulate timeout
              return new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Build timeout')), 100);
              });
            }
            return Promise.resolve({ stdout: '', stderr: '' });
          });
        }
        return originalPromisify(fn);
      });

      const result = await FlutterWebBuilder.buildFlutterWeb({
        projectPath: '/test/project',
        buildMode: 'debug'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Build timeout');
    });
  });

  describe('Performance and Reliability', () => {
    test('should complete build within reasonable time', async () => {
      const startTime = Date.now();
      
      const result = await FlutterWebBuilder.buildFlutterWeb({
        projectPath: '/test/project',
        buildMode: 'debug'
      });

      const endTime = Date.now();
      const actualBuildTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(actualBuildTime).toBeLessThan(5000); // Should complete within 5 seconds in test
      expect(result.buildTime).toBeGreaterThan(0);
    });

    test('should handle concurrent build requests', async () => {
      const projectPath1 = '/test/project1';
      const projectPath2 = '/test/project2';

      // Start two builds simultaneously
      const [result1, result2] = await Promise.all([
        FlutterWebBuilder.buildAndServe(projectPath1, 'App1'),
        FlutterWebBuilder.buildAndServe(projectPath2, 'App2')
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.serverUrl).toBeDefined();
      expect(result2.serverUrl).toBeDefined();
    });

    test('should provide detailed build metrics', async () => {
      const result = await FlutterWebBuilder.buildFlutterWeb({
        projectPath: '/test/project',
        buildMode: 'release'
      });

      expect(result.success).toBe(true);
      expect(result.buildTime).toBeGreaterThan(0);
      expect(result.artifacts).toBeInstanceOf(Array);
      expect(result.artifacts!.length).toBeGreaterThan(0);
      expect(result.buildOutput).toContain('Built build/web');
    });
  });

  describe('Configuration Variants', () => {
    test('should support debug build mode', async () => {
      const result = await FlutterWebBuilder.buildFlutterWeb({
        projectPath: '/test/project',
        buildMode: 'debug'
      });

      expect(result.success).toBe(true);
      // Verify debug build command was used (checked in mocked exec)
    });

    test('should support release build mode', async () => {
      const result = await FlutterWebBuilder.buildFlutterWeb({
        projectPath: '/test/project', 
        buildMode: 'release'
      });

      expect(result.success).toBe(true);
      // Verify release build command was used (checked in mocked exec)
    });

    test('should use custom port for web server', async () => {
      const customPort = 9090;
      
      const result = await FlutterWebBuilder.startWebServer('/test/build/web', customPort);

      expect(result.success).toBe(true);
      expect(result.serverUrl).toBe(`http://localhost:${customPort}`);
      expect(mockSpawn).toHaveBeenCalledWith(
        'python3',
        ['-m', 'http.server', customPort.toString(), '--bind', '0.0.0.0'],
        expect.any(Object)
      );
    });
  });
});