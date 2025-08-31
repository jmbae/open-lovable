import { NextRequest, NextResponse } from 'next/server';
import { FlutterWebBuilder } from '@/lib/flutter-web-builder';

interface FlutterBuildRequest {
  sandboxId: string;
  projectPath?: string;
  projectName?: string;
  buildMode?: 'debug' | 'release';
  enableHotReload?: boolean;
}

interface FlutterBuildResponse {
  success: boolean;
  buildUrl?: string;
  buildOutput?: string;
  error?: string;
  buildTime?: number;
  artifacts?: string[];
  serverPid?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { 
      sandboxId, 
      projectPath = '/tmp/flutter_project',
      projectName = 'FlutterApp',
      buildMode = 'debug',
      enableHotReload = false
    }: FlutterBuildRequest = await request.json();
    
    console.log('[flutter-web-build] Build request received:', { 
      sandboxId, projectPath, projectName, buildMode, enableHotReload 
    });
    
    if (!sandboxId) {
      return NextResponse.json({
        success: false,
        error: 'Sandbox ID is required'
      }, { status: 400 });
    }
    
    // Use FlutterWebBuilder for complete build and serve process
    const buildResult = await FlutterWebBuilder.buildAndServe(
      projectPath,
      projectName,
      {
        buildMode,
        enableHotReload,
        port: 8080
      }
    );
    
    if (!buildResult.success) {
      return NextResponse.json({
        success: false,
        error: buildResult.error,
        buildOutput: buildResult.buildOutput,
        buildTime: buildResult.buildTime
      }, { status: 500 });
    }
    
    // Generate E2B preview URL
    const serverPort = 8080;
    const previewUrl = process.env.NODE_ENV === 'production' 
      ? `https://${sandboxId}-${serverPort}.e2b.dev`
      : buildResult.serverUrl;
    
    const response: FlutterBuildResponse = {
      success: true,
      buildUrl: previewUrl,
      buildOutput: buildResult.buildOutput,
      buildTime: buildResult.buildTime,
      artifacts: buildResult.artifacts,
      serverPid: buildResult.serverPid
    };
    
    console.log('[flutter-web-build] Flutter web build completed successfully:', {
      buildTime: buildResult.buildTime,
      artifacts: buildResult.artifacts?.length,
      previewUrl
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[flutter-web-build] API error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint for Flutter SDK
  try {
    const sdkInfo = await FlutterWebBuilder.checkFlutterSDK();
    
    return NextResponse.json({
      flutterSDK: sdkInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}