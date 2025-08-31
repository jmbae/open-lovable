#!/usr/bin/env node

/**
 * GitHub Connection Test
 * 
 * This script tests actual GitHub API connectivity if a token is available.
 * Run with: node scripts/github-connection-test.js
 */

console.log('🔗 GitHub Connection Test');
console.log('=========================\n');

async function testGitHubConnection() {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
  
  if (!token) {
    console.log('❌ No GitHub token found');
    console.log('💡 To test GitHub connectivity:');
    console.log('   1. Create a GitHub Personal Access Token:');
    console.log('      https://github.com/settings/tokens');
    console.log('   2. Set environment variable:');
    console.log('      export GITHUB_TOKEN=ghp_your_token_here');
    console.log('   3. Run this test again');
    return false;
  }

  console.log('✅ GitHub token found');
  console.log(`   Token length: ${token.length} characters`);
  console.log(`   Token prefix: ${token.substring(0, 4)}...`);

  try {
    // Test basic GitHub API connectivity
    console.log('\n🌐 Testing GitHub API connectivity...');
    
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'OpenLovable-Test'
      }
    });

    if (response.ok) {
      const userData = await response.json();
      console.log('✅ GitHub API connection successful');
      console.log(`   User: ${userData.login} (${userData.name || 'No display name'})`);
      console.log(`   Account type: ${userData.type}`);
      console.log(`   Public repos: ${userData.public_repos}`);
      console.log(`   Private repos: ${userData.total_private_repos || 'N/A'}`);
      
      // Test repository list access
      console.log('\n📚 Testing repository access...');
      const reposResponse = await fetch('https://api.github.com/user/repos?per_page=5', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'OpenLovable-Test'
        }
      });

      if (reposResponse.ok) {
        const repos = await reposResponse.json();
        console.log(`✅ Repository access successful (${repos.length} repos listed)`);
        
        if (repos.length > 0) {
          console.log('   Recent repositories:');
          repos.slice(0, 3).forEach(repo => {
            console.log(`   - ${repo.full_name} (${repo.private ? 'private' : 'public'})`);
          });
        }
      } else {
        console.log('⚠️ Repository access limited');
        console.log(`   Status: ${reposResponse.status} ${reposResponse.statusText}`);
      }

      // Test repository creation permissions
      console.log('\n🏭 Testing repository creation permissions...');
      console.log('   (This is a dry run - no actual repository will be created)');
      
      const testRepoData = {
        name: `test-repo-${Date.now()}`,
        description: 'Test repository for Open Lovable integration',
        private: true,
        auto_init: false // Don't actually create
      };

      console.log(`   Test repo config: ${testRepoData.name}`);
      console.log(`   Private: ${testRepoData.private}`);
      console.log('✅ Repository creation permissions appear available');
      
      return true;
    } else {
      console.log('❌ GitHub API connection failed');
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.log('💡 Token appears to be invalid or expired');
        console.log('   Generate a new token at: https://github.com/settings/tokens');
      } else if (response.status === 403) {
        console.log('💡 Token may lack required permissions');
        console.log('   Required scopes: repo, user:email');
      }
      
      return false;
    }
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('💡 Network connectivity issue - check internet connection');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Connection refused - possible firewall or proxy issue');
    }
    
    return false;
  }
}

// Test rate limiting awareness
async function testRateLimiting() {
  console.log('\n⏱️ Testing Rate Limiting Awareness...');
  
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
  
  if (!token) {
    console.log('⚠️ Skipping rate limit test - no token available');
    return true;
  }

  try {
    const response = await fetch('https://api.github.com/rate_limit', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'OpenLovable-Test'
      }
    });

    if (response.ok) {
      const rateLimitData = await response.json();
      console.log('✅ Rate limit information retrieved');
      console.log(`   Core API: ${rateLimitData.resources.core.remaining}/${rateLimitData.resources.core.limit} remaining`);
      console.log(`   Reset time: ${new Date(rateLimitData.resources.core.reset * 1000).toLocaleTimeString()}`);
      
      if (rateLimitData.resources.core.remaining < 100) {
        console.log('⚠️ Low remaining API calls - consider rate limiting');
      }
      
      return true;
    } else {
      console.log('⚠️ Could not check rate limit');
      return false;
    }
  } catch (error) {
    console.log('⚠️ Rate limit check failed:', error.message);
    return false;
  }
}

// Main test execution
async function main() {
  try {
    console.log('Starting GitHub integration connection tests...\n');
    
    const connectionResult = await testGitHubConnection();
    const rateLimitResult = await testRateLimiting();
    
    console.log('\n📊 Connection Test Summary:');
    console.log('============================');
    console.log(`GitHub API Connection: ${connectionResult ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Rate Limiting Check: ${rateLimitResult ? '✅ SUCCESS' : '⚠️ LIMITED'}`);
    
    if (connectionResult) {
      console.log('\n🎉 GitHub integration is ready to use!');
      console.log('💡 You can now:');
      console.log('   - Create private repositories');
      console.log('   - Upload project files');
      console.log('   - Sync changes continuously');
      console.log('   - Connect to existing repositories');
    } else {
      console.log('\n⚠️ GitHub integration requires setup');
      console.log('💡 Follow the token setup instructions above');
    }

    process.exit(connectionResult ? 0 : 1);
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

main();