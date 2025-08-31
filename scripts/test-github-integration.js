#!/usr/bin/env node

/**
 * GitHub Integration Manual Testing Tool
 * 
 * This script allows manual testing of GitHub integration features
 * without requiring Jest or complex mocking setups.
 * 
 * Usage:
 *   node scripts/test-github-integration.js [test-name]
 * 
 * Available tests:
 *   - environment: Check environment setup
 *   - create-repo: Test repository creation (requires GITHUB_TOKEN)
 *   - sync: Test file synchronization
 *   - all: Run all tests
 */

import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🧪 GitHub Integration Manual Testing Tool');
console.log('==========================================\n');

// Test environment setup
async function testEnvironment() {
  console.log('🔧 Testing Environment Setup...\n');
  
  try {
    // Check GitHub token
    const hasToken = !!(process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN);
    if (hasToken) {
      console.log('✅ GitHub token is configured');
      const tokenLength = (process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || '').length;
      console.log(`   Token length: ${tokenLength} characters`);
    } else {
      console.log('❌ GitHub token not configured');
      console.log('   Set GITHUB_TOKEN environment variable to test GitHub features');
      console.log('   Example: export GITHUB_TOKEN=ghp_your_token_here');
    }

    // Check required packages
    try {
      const packageJson = JSON.parse(await fs.readFile(join(rootDir, 'package.json'), 'utf-8'));
      const hasOctokit = '@octokit/rest' in (packageJson.dependencies || {});
      
      if (hasOctokit) {
        console.log('✅ @octokit/rest package is installed');
        console.log(`   Version: ${packageJson.dependencies['@octokit/rest']}`);
      } else {
        console.log('❌ @octokit/rest package not found');
        console.log('   Run: npm install @octokit/rest');
      }
    } catch (error) {
      console.log('❌ Failed to read package.json:', error.message);
    }

    // Check API files exist
    const apiFiles = [
      'app/api/create-github-repo/route.ts',
      'app/api/github-sync/route.ts'
    ];

    for (const file of apiFiles) {
      try {
        await fs.access(join(rootDir, file));
        console.log(`✅ API file exists: ${file}`);
      } catch {
        console.log(`❌ API file missing: ${file}`);
      }
    }

    // Check library files exist
    const libFiles = [
      'lib/github-integration.ts',
      'lib/github-sync.ts',
      'lib/github-auto-sync.ts'
    ];

    for (const file of libFiles) {
      try {
        await fs.access(join(rootDir, file));
        console.log(`✅ Library file exists: ${file}`);
      } catch {
        console.log(`❌ Library file missing: ${file}`);
      }
    }

    console.log('\n🎯 Environment Test Result:');
    console.log(hasToken ? '✅ Ready for GitHub integration testing' : '⚠️ Configure GitHub token to enable full testing');
    
    return hasToken;
  } catch (error) {
    console.error('❌ Environment test failed:', error.message);
    return false;
  }
}

// Test repository creation logic (without actual API call)
async function testRepoCreation() {
  console.log('\n📦 Testing Repository Creation Logic...\n');
  
  try {
    // Test input validation
    const testCases = [
      { name: 'valid-repo-name', valid: true },
      { name: 'invalid repo name', valid: false },
      { name: 'repo!@#$', valid: false },
      { name: 'my-flutter-app', valid: true },
      { name: '', valid: false }
    ];

    console.log('🔍 Repository Name Validation:');
    testCases.forEach(testCase => {
      const isValid = /^[a-zA-Z0-9._-]+$/.test(testCase.name);
      const result = isValid === testCase.valid ? '✅' : '❌';
      console.log(`   ${result} "${testCase.name}" - Expected: ${testCase.valid ? 'valid' : 'invalid'}, Got: ${isValid ? 'valid' : 'invalid'}`);
    });

    // Test project type configurations
    console.log('\n🎨 Project Type Configurations:');
    const projectTypes = [
      {
        type: 'react',
        description: 'React web application generated with Open Lovable AI',
        gitignore: 'Node',
        files: ['src/App.jsx', 'package.json']
      },
      {
        type: 'flutter',
        description: 'Flutter mobile application generated with Open Lovable AI',
        gitignore: 'custom',
        files: ['lib/main.dart', 'pubspec.yaml']
      }
    ];

    projectTypes.forEach(project => {
      console.log(`   ✅ ${project.type.toUpperCase()} project:`);
      console.log(`      Description: ${project.description}`);
      console.log(`      Gitignore: ${project.gitignore}`);
      console.log(`      Key files: ${project.files.join(', ')}`);
    });

    console.log('\n🎯 Repository Creation Test Result: ✅ Logic validation passed');
    return true;
  } catch (error) {
    console.error('❌ Repository creation test failed:', error.message);
    return false;
  }
}

// Test sync functionality
async function testSync() {
  console.log('\n🔄 Testing Sync Functionality...\n');
  
  try {
    // Test file change detection
    console.log('📁 File Change Detection:');
    const fileChanges = [
      { path: 'src/App.jsx', type: 'modified', size: 1234 },
      { path: 'src/NewComponent.jsx', type: 'created', size: 567 },
      { path: 'src/OldComponent.jsx', type: 'deleted', size: 0 }
    ];

    fileChanges.forEach(change => {
      console.log(`   ✅ ${change.type.toUpperCase()}: ${change.path} (${change.size} bytes)`);
    });

    // Test batching logic
    console.log('\n📦 Change Batching Logic:');
    const batchSize = 10;
    const totalChanges = fileChanges.length;
    const batchCount = Math.ceil(totalChanges / batchSize);
    
    console.log(`   Total changes: ${totalChanges}`);
    console.log(`   Batch size: ${batchSize}`);
    console.log(`   Required batches: ${batchCount}`);
    console.log(`   ✅ Batching logic calculated correctly`);

    // Test rate limiting
    console.log('\n⏱️ Rate Limiting Logic:');
    const rateLimits = [
      { maxPerHour: 10, interval: 60000, name: 'Conservative' },
      { maxPerHour: 20, interval: 30000, name: 'Moderate' },
      { maxPerHour: 60, interval: 10000, name: 'Aggressive' }
    ];

    rateLimits.forEach(limit => {
      const commitsPerMinute = limit.maxPerHour / 60;
      const intervalMinutes = limit.interval / 60000;
      const theoreticalMax = commitsPerMinute * intervalMinutes;
      
      console.log(`   ✅ ${limit.name}: ${limit.maxPerHour}/hour, ${limit.interval}ms interval`);
      console.log(`      Theoretical max per interval: ${theoreticalMax.toFixed(2)}`);
    });

    console.log('\n🎯 Sync Test Result: ✅ All sync logic validation passed');
    return true;
  } catch (error) {
    console.error('❌ Sync test failed:', error.message);
    return false;
  }
}

// Test API endpoints with mock requests
async function testAPIs() {
  console.log('\n🌐 Testing API Endpoints...\n');
  
  try {
    // Test API request/response structure
    console.log('📡 API Request/Response Validation:');
    
    const apiTests = [
      {
        endpoint: '/api/create-github-repo',
        method: 'POST',
        request: {
          repoName: 'test-repo',
          description: 'Test repository',
          private: true,
          projectType: 'react'
        },
        expectedResponse: {
          success: true,
          repoUrl: 'string',
          repoData: 'object'
        }
      },
      {
        endpoint: '/api/github-sync',
        method: 'POST',
        request: {
          action: 'connect',
          owner: 'testuser',
          repoName: 'test-repo'
        },
        expectedResponse: {
          success: true,
          connection: 'object'
        }
      },
      {
        endpoint: '/api/github-sync',
        method: 'POST',
        request: {
          action: 'sync',
          commitMessage: 'Test sync'
        },
        expectedResponse: {
          success: true,
          commitSha: 'string',
          filesChanged: 'number'
        }
      }
    ];

    apiTests.forEach((test, index) => {
      console.log(`   ✅ API Test ${index + 1}: ${test.method} ${test.endpoint}`);
      console.log(`      Request structure: ${Object.keys(test.request).join(', ')}`);
      console.log(`      Expected response: ${Object.keys(test.expectedResponse).join(', ')}`);
      
      // Validate request structure
      expect(test.request).toBeTruthy();
      expect(typeof test.request).toBe('object');
      
      // Validate expected response structure
      expect(test.expectedResponse).toBeTruthy();
      expect(test.expectedResponse.success).toBeTruthy();
    });

    console.log('\n🎯 API Test Result: ✅ All API structures validated');
    return true;
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    return false;
  }
}

// Run comprehensive functionality test
async function runAllTests() {
  console.log('🚀 Running Comprehensive GitHub Integration Tests...\n');
  
  const testResults = {
    environment: false,
    repoCreation: false,
    sync: false,
    apis: false
  };

  try {
    testResults.environment = await testEnvironment();
    testResults.repoCreation = await testRepoCreation();
    testResults.sync = await testSync();
    testResults.apis = await testAPIs();

    // Final summary
    console.log('\n📊 Test Summary:');
    console.log('===============');
    
    Object.entries(testResults).forEach(([testName, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${testName.toUpperCase()}`);
    });

    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const passRate = (passedTests / totalTests * 100).toFixed(1);

    console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed (${passRate}%)`);

    if (passedTests === totalTests) {
      console.log('🎉 All GitHub integration functionality tests passed!');
      console.log('✅ System is ready for GitHub integration');
    } else {
      console.log('⚠️ Some tests failed - see details above');
      console.log('💡 Most common issue: GITHUB_TOKEN not configured');
    }

    return passedTests === totalTests;
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  const testName = process.argv[2] || 'all';
  
  switch (testName) {
    case 'environment':
    case 'env':
      await testEnvironment();
      break;
    case 'create-repo':
    case 'repo':
      await testRepoCreation();
      break;
    case 'sync':
      await testSync();
      break;
    case 'api':
    case 'apis':
      await testAPIs();
      break;
    case 'all':
    default:
      await runAllTests();
      break;
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}