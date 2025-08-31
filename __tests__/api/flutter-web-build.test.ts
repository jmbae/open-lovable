import { jest } from '@jest/globals';
import { FlutterWebBuilder } from '../../lib/flutter-web-builder';

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200
    }))
  }
}));

// Import after mocking
const { POST, GET } = require('../../app/api/flutter-web-build/route');

// Mock FlutterWebBuilder
jest.mock('../../lib/flutter-web-builder');
const mockFlutterWebBuilder = jest.mocked(FlutterWebBuilder);

describe('/api/flutter-web-build', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful mocks
    mockFlutterWebBuilder.checkFlutterSDK.mockResolvedValue({
      available: true,
      version: '3.16.0',
      webSupport: true
    });
    
    mockFlutterWebBuilder.buildAndServe.mockResolvedValue({
      success: true,
      buildTime: 25000,
      serverUrl: 'http://localhost:8080',
      serverPid: 12345,
      artifacts: ['index.html', 'main.dart.js', 'flutter.js', 'manifest.json'],
      buildOutput: 'Build completed successfully'
    });
  });

  describe('POST /api/flutter-web-build', () => {
    test('should build Flutter web app successfully', async () => {
      const requestBody = {
        sandboxId: 'test-sandbox-123',
        projectPath: '/tmp/flutter_test',
        projectName: 'TestApp',
        buildMode: 'debug'
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.buildUrl).toBe('http://localhost:8080');
      expect(responseData.buildTime).toBe(25000);
      expect(responseData.artifacts).toHaveLength(4);
      expect(responseData.serverPid).toBe(12345);

      expect(mockFlutterWebBuilder.buildAndServe).toHaveBeenCalledWith(
        '/tmp/flutter_test',
        'TestApp',
        {
          buildMode: 'debug',
          enableHotReload: false,
          port: 8080
        }
      );
    });

    test('should generate E2B production URL', async () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const requestBody = {
        sandboxId: 'prod-sandbox-456',
        projectName: 'ProdApp'
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.success).toBe(true);
      expect(responseData.buildUrl).toBe('https://prod-sandbox-456-8080.e2b.dev');

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    test('should handle missing sandboxId', async () => {
      const requestBody = {
        projectName: 'TestApp'
        // sandboxId missing
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Sandbox ID is required');
    });

    test('should handle build failure', async () => {
      mockFlutterWebBuilder.buildAndServe.mockResolvedValue({
        success: false,
        error: 'Flutter SDK not found',
        buildTime: 5000,
        buildOutput: 'Error: flutter command not found'
      });

      const requestBody = {
        sandboxId: 'test-sandbox-789',
        projectName: 'FailApp'
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Flutter SDK not found');
      expect(responseData.buildTime).toBe(5000);
      expect(responseData.buildOutput).toBe('Error: flutter command not found');
    });

    test('should use default values for optional parameters', async () => {
      const requestBody = {
        sandboxId: 'minimal-sandbox'
        // Only required field provided
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      const response = await POST(request);
      
      expect(mockFlutterWebBuilder.buildAndServe).toHaveBeenCalledWith(
        '/tmp/flutter_project', // default projectPath
        'FlutterApp', // default projectName
        {
          buildMode: 'debug', // default buildMode
          enableHotReload: false, // default enableHotReload
          port: 8080
        }
      );
    });

    test('should handle API errors gracefully', async () => {
      mockFlutterWebBuilder.buildAndServe.mockRejectedValue(new Error('Unexpected error'));

      const requestBody = {
        sandboxId: 'error-sandbox',
        projectName: 'ErrorApp'
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Unexpected error');
    });
  });

  describe('GET /api/flutter-web-build', () => {
    test('should return Flutter SDK health status', async () => {
      const request = {} as any;

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.flutterSDK).toEqual({
        available: true,
        version: '3.16.0',
        webSupport: true
      });
      expect(responseData.timestamp).toBeDefined();
      expect(mockFlutterWebBuilder.checkFlutterSDK).toHaveBeenCalled();
    });

    test('should handle SDK check failure', async () => {
      mockFlutterWebBuilder.checkFlutterSDK.mockResolvedValue({
        available: false,
        error: 'Flutter not installed'
      });

      const request = {} as any;

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.flutterSDK.available).toBe(false);
      expect(responseData.flutterSDK.error).toBe('Flutter not installed');
    });

    test('should handle API errors in health check', async () => {
      mockFlutterWebBuilder.checkFlutterSDK.mockRejectedValue(new Error('Health check failed'));

      const request = {} as any;

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Health check failed');
      expect(responseData.timestamp).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete Flutter app build workflow', async () => {
      const requestBody = {
        sandboxId: 'integration-test-sandbox',
        projectPath: '/tmp/flutter_integration_test',
        projectName: 'IntegrationApp',
        buildMode: 'debug',
        enableHotReload: true
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.buildUrl).toBeDefined();
      expect(responseData.buildTime).toBeGreaterThan(0);
      expect(responseData.artifacts).toContain('index.html');
      expect(responseData.serverPid).toBeDefined();

      // Verify proper parameters were passed
      expect(mockFlutterWebBuilder.buildAndServe).toHaveBeenCalledWith(
        '/tmp/flutter_integration_test',
        'IntegrationApp',
        {
          buildMode: 'debug',
          enableHotReload: true,
          port: 8080
        }
      );
    });

    test('should provide build metrics for monitoring', async () => {
      // Mock detailed build result
      mockFlutterWebBuilder.buildAndServe.mockResolvedValue({
        success: true,
        buildTime: 45000, // 45 seconds
        serverUrl: 'http://localhost:8080',
        serverPid: 98765,
        artifacts: ['index.html', 'main.dart.js', 'flutter.js', 'manifest.json', 'assets/'],
        buildOutput: `
Running "flutter pub get" in /tmp/flutter_project...
Building web application...
Compiling lib/main.dart for the Web...
✓ Built build/web
        `.trim()
      });

      const request = {
        json: () => Promise.resolve({
          sandboxId: 'metrics-test',
          projectName: 'MetricsApp'
        })
      } as any;

      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.success).toBe(true);
      expect(responseData.buildTime).toBe(45000);
      expect(responseData.artifacts).toHaveLength(5);
      expect(responseData.buildOutput).toContain('Built build/web');
      expect(responseData.buildOutput).toContain('Compiling lib/main.dart');
    });
  });
});