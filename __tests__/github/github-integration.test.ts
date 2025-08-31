import { jest } from '@jest/globals';
import { GitHubIntegration, type GitHubRepoConfig, type ProjectFile } from '../../lib/github-integration';

// Mock Octokit
jest.mock('@octokit/rest');

describe('GitHubIntegration', () => {
  let githubIntegration: GitHubIntegration;
  let mockOctokit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Octokit instance
    mockOctokit = {
      rest: {
        repos: {
          createForAuthenticatedUser: jest.fn(),
          get: jest.fn(),
          listForAuthenticatedUser: jest.fn(),
          createOrUpdateFileContents: jest.fn()
        },
        git: {
          getRef: jest.fn(),
          createBlob: jest.fn(),
          createTree: jest.fn(),
          createCommit: jest.fn(),
          updateRef: jest.fn()
        },
        users: {
          getAuthenticated: jest.fn()
        }
      }
    };

    // Mock Octokit constructor
    const MockOctokit = require('@octokit/rest').Octokit;
    MockOctokit.mockImplementation(() => mockOctokit);

    githubIntegration = new GitHubIntegration('test-token');
  });

  describe('Repository Creation', () => {
    test('should create React repository successfully', async () => {
      const mockRepo = {
        id: 123456,
        name: 'test-react-app',
        full_name: 'testuser/test-react-app',
        description: 'Test React app',
        private: true,
        html_url: 'https://github.com/testuser/test-react-app',
        clone_url: 'https://github.com/testuser/test-react-app.git',
        ssh_url: 'git@github.com:testuser/test-react-app.git',
        default_branch: 'main',
        created_at: '2025-08-31T00:00:00Z',
        updated_at: '2025-08-31T00:00:00Z',
        owner: { login: 'testuser' }
      };

      mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({
        data: mockRepo
      });

      const config: GitHubRepoConfig = {
        name: 'test-react-app',
        description: 'Test React app',
        private: true,
        projectType: 'react'
      };

      const result = await githubIntegration.createRepository(config);

      expect(result.success).toBe(true);
      expect(result.repo).toEqual({
        id: 123456,
        name: 'test-react-app',
        fullName: 'testuser/test-react-app',
        description: 'Test React app',
        private: true,
        htmlUrl: 'https://github.com/testuser/test-react-app',
        cloneUrl: 'https://github.com/testuser/test-react-app.git',
        sshUrl: 'git@github.com:testuser/test-react-app.git',
        defaultBranch: 'main',
        createdAt: '2025-08-31T00:00:00Z',
        updatedAt: '2025-08-31T00:00:00Z'
      });

      expect(mockOctokit.rest.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
        name: 'test-react-app',
        description: 'Test React app',
        private: true,
        auto_init: true,
        gitignore_template: 'Node',
        license_template: 'mit'
      });
    });

    test('should create Flutter repository with custom .gitignore', async () => {
      const mockRepo = {
        id: 789012,
        name: 'test-flutter-app',
        full_name: 'testuser/test-flutter-app',
        description: 'Test Flutter app',
        private: true,
        html_url: 'https://github.com/testuser/test-flutter-app',
        clone_url: 'https://github.com/testuser/test-flutter-app.git',
        ssh_url: 'git@github.com:testuser/test-flutter-app.git',
        default_branch: 'main',
        created_at: '2025-08-31T00:00:00Z',
        updated_at: '2025-08-31T00:00:00Z',
        owner: { login: 'testuser' }
      };

      mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({
        data: mockRepo
      });

      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({
        data: { commit: { sha: 'abc123' } }
      });

      const config: GitHubRepoConfig = {
        name: 'test-flutter-app',
        description: 'Test Flutter app',
        private: true,
        projectType: 'flutter',
        includeReadme: true
      };

      const result = await githubIntegration.createRepository(config);

      expect(result.success).toBe(true);
      expect(result.repo?.name).toBe('test-flutter-app');

      // Should create repository without gitignore_template for Flutter
      expect(mockOctokit.rest.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
        name: 'test-flutter-app',
        description: 'Test Flutter app',
        private: true,
        auto_init: true,
        gitignore_template: undefined, // Flutter uses custom .gitignore
        license_template: 'mit'
      });

      // Should add custom Flutter .gitignore
      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'testuser',
        repo: 'test-flutter-app',
        path: '.gitignore',
        message: 'Add Flutter .gitignore',
        content: expect.stringContaining('') // Base64 encoded Flutter .gitignore
      });
    });

    test('should handle repository name validation', async () => {
      const config: GitHubRepoConfig = {
        name: 'invalid repo name!', // Invalid characters
        description: 'Test app'
      };

      const result = await githubIntegration.createRepository(config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Repository name can only contain');
      expect(mockOctokit.rest.repos.createForAuthenticatedUser).not.toHaveBeenCalled();
    });

    test('should handle GitHub API errors', async () => {
      mockOctokit.rest.repos.createForAuthenticatedUser.mockRejectedValue({
        status: 422,
        message: 'Repository already exists'
      });

      const config: GitHubRepoConfig = {
        name: 'existing-repo'
      };

      const result = await githubIntegration.createRepository(config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('File Upload', () => {
    test('should upload project files successfully', async () => {
      // Mock repository data
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { default_branch: 'main' }
      });

      // Mock git reference
      mockOctokit.rest.git.getRef.mockResolvedValue({
        data: { object: { sha: 'base-commit-sha' } }
      });

      // Mock blob creation
      mockOctokit.rest.git.createBlob.mockResolvedValue({
        data: { sha: 'blob-sha-123' }
      });

      // Mock tree creation
      mockOctokit.rest.git.createTree.mockResolvedValue({
        data: { sha: 'tree-sha-456' }
      });

      // Mock commit creation
      mockOctokit.rest.git.createCommit.mockResolvedValue({
        data: { 
          sha: 'commit-sha-789',
          html_url: 'https://github.com/testuser/testrepo/commit/commit-sha-789',
          message: 'Test commit'
        }
      });

      // Mock reference update
      mockOctokit.rest.git.updateRef.mockResolvedValue({
        data: { object: { sha: 'commit-sha-789' } }
      });

      const files: ProjectFile[] = [
        { path: 'src/App.jsx', content: 'export default function App() { return <div>Hello</div>; }' },
        { path: 'package.json', content: '{ "name": "test-app", "version": "1.0.0" }' },
        { path: 'README.md', content: '# Test App\n\nGenerated with Open Lovable' }
      ];

      const result = await githubIntegration.uploadProjectFiles(
        'testuser',
        'testrepo',
        files,
        'Initial project upload'
      );

      expect(result.success).toBe(true);
      expect(result.commit).toEqual({
        sha: 'commit-sha-789',
        url: 'https://github.com/testuser/testrepo/commit/commit-sha-789',
        message: 'Test commit',
        filesChanged: 3
      });

      // Verify all API calls were made
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
        owner: 'testuser',
        repo: 'testrepo'
      });

      expect(mockOctokit.rest.git.createBlob).toHaveBeenCalledTimes(3);
      expect(mockOctokit.rest.git.createTree).toHaveBeenCalledTimes(1);
      expect(mockOctokit.rest.git.createCommit).toHaveBeenCalledTimes(1);
      expect(mockOctokit.rest.git.updateRef).toHaveBeenCalledTimes(1);
    });

    test('should handle upload errors', async () => {
      mockOctokit.rest.repos.get.mockRejectedValue({
        status: 404,
        message: 'Repository not found'
      });

      const files: ProjectFile[] = [
        { path: 'test.txt', content: 'test content' }
      ];

      const result = await githubIntegration.uploadProjectFiles(
        'testuser',
        'nonexistent-repo',
        files
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Repository Management', () => {
    test('should get repository information', async () => {
      const mockRepo = {
        id: 123456,
        name: 'test-repo',
        full_name: 'testuser/test-repo',
        description: 'Test repository',
        private: false,
        html_url: 'https://github.com/testuser/test-repo',
        clone_url: 'https://github.com/testuser/test-repo.git',
        ssh_url: 'git@github.com:testuser/test-repo.git',
        default_branch: 'main',
        created_at: '2025-08-31T00:00:00Z',
        updated_at: '2025-08-31T00:00:00Z'
      };

      mockOctokit.rest.repos.get.mockResolvedValue({
        data: mockRepo
      });

      const result = await githubIntegration.getRepository('testuser', 'test-repo');

      expect(result.success).toBe(true);
      expect(result.repo).toBeDefined();
      expect(result.repo!.name).toBe('test-repo');
      expect(result.repo!.private).toBe(false);
    });

    test('should list user repositories', async () => {
      const mockRepos = [
        {
          id: 1,
          name: 'repo1',
          full_name: 'user/repo1',
          description: 'First repo',
          private: true,
          html_url: 'https://github.com/user/repo1',
          clone_url: 'https://github.com/user/repo1.git',
          ssh_url: 'git@github.com:user/repo1.git',
          default_branch: 'main',
          created_at: '2025-08-31T00:00:00Z',
          updated_at: '2025-08-31T00:00:00Z'
        },
        {
          id: 2,
          name: 'repo2',
          full_name: 'user/repo2',
          description: 'Second repo',
          private: false,
          html_url: 'https://github.com/user/repo2',
          clone_url: 'https://github.com/user/repo2.git',
          ssh_url: 'git@github.com:user/repo2.git',
          default_branch: 'main',
          created_at: '2025-08-31T00:00:00Z',
          updated_at: '2025-08-31T00:00:00Z'
        }
      ];

      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: mockRepos
      });

      const result = await githubIntegration.listRepositories('private');

      expect(result.success).toBe(true);
      expect(result.repositories).toHaveLength(2);
      expect(result.repositories![0].name).toBe('repo1');
      expect(result.repositories![1].name).toBe('repo2');

      expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        type: 'private',
        sort: 'updated',
        per_page: 100
      });
    });
  });

  describe('Complete Project Repository Creation', () => {
    test('should create repository and upload files in one operation', async () => {
      // Mock repository creation
      const mockRepo = {
        id: 123456,
        name: 'complete-project',
        full_name: 'testuser/complete-project',
        description: 'Complete project test',
        private: true,
        html_url: 'https://github.com/testuser/complete-project',
        clone_url: 'https://github.com/testuser/complete-project.git',
        ssh_url: 'git@github.com:testuser/complete-project.git',
        default_branch: 'main',
        created_at: '2025-08-31T00:00:00Z',
        updated_at: '2025-08-31T00:00:00Z',
        owner: { login: 'testuser' }
      };

      mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({
        data: mockRepo
      });

      // Mock file upload process
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: { default_branch: 'main' }
      });

      mockOctokit.rest.git.getRef.mockResolvedValue({
        data: { object: { sha: 'initial-commit-sha' } }
      });

      mockOctokit.rest.git.createBlob.mockResolvedValue({
        data: { sha: 'file-blob-sha' }
      });

      mockOctokit.rest.git.createTree.mockResolvedValue({
        data: { sha: 'project-tree-sha' }
      });

      mockOctokit.rest.git.createCommit.mockResolvedValue({
        data: {
          sha: 'project-commit-sha',
          html_url: 'https://github.com/testuser/complete-project/commit/project-commit-sha',
          message: 'Initial project setup'
        }
      });

      mockOctokit.rest.git.updateRef.mockResolvedValue({
        data: { object: { sha: 'project-commit-sha' } }
      });

      const config: GitHubRepoConfig = {
        name: 'complete-project',
        description: 'Complete project test',
        private: true,
        projectType: 'react'
      };

      const files: ProjectFile[] = [
        { path: 'src/App.jsx', content: 'export default function App() { return <div>Complete</div>; }' },
        { path: 'package.json', content: '{ "name": "complete-project" }' }
      ];

      const result = await githubIntegration.createProjectRepository(
        config,
        files,
        'Initial project setup'
      );

      expect(result.success).toBe(true);
      expect(result.repo).toBeDefined();
      expect(result.commit).toBeDefined();
      expect(result.repo!.name).toBe('complete-project');
      expect(result.commit!.filesChanged).toBe(2);

      // Verify both repository creation and file upload were called
      expect(mockOctokit.rest.repos.createForAuthenticatedUser).toHaveBeenCalled();
      expect(mockOctokit.rest.git.createBlob).toHaveBeenCalledTimes(2);
    });

    test('should handle repository creation failure', async () => {
      mockOctokit.rest.repos.createForAuthenticatedUser.mockRejectedValue({
        status: 422,
        message: 'Repository name already exists'
      });

      const config: GitHubRepoConfig = {
        name: 'existing-repo'
      };

      const files: ProjectFile[] = [
        { path: 'test.txt', content: 'test' }
      ];

      const result = await githubIntegration.createProjectRepository(config, files);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    test('should handle file upload failure after repository creation', async () => {
      // Mock successful repository creation
      const mockRepo = {
        id: 123456,
        name: 'upload-fail-test',
        full_name: 'testuser/upload-fail-test',
        description: null,
        private: true,
        html_url: 'https://github.com/testuser/upload-fail-test',
        clone_url: 'https://github.com/testuser/upload-fail-test.git',
        ssh_url: 'git@github.com:testuser/upload-fail-test.git',
        default_branch: 'main',
        created_at: '2025-08-31T00:00:00Z',
        updated_at: '2025-08-31T00:00:00Z',
        owner: { login: 'testuser' }
      };

      mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({
        data: mockRepo
      });

      // Mock upload failure
      mockOctokit.rest.repos.get.mockRejectedValue({
        status: 403,
        message: 'Permission denied'
      });

      const config: GitHubRepoConfig = {
        name: 'upload-fail-test'
      };

      const files: ProjectFile[] = [
        { path: 'test.txt', content: 'test' }
      ];

      const result = await githubIntegration.createProjectRepository(config, files);

      expect(result.success).toBe(false);
      expect(result.repo).toBeDefined(); // Repository was created
      expect(result.error).toContain('file upload failed');
    });
  });

  describe('Authentication and Validation', () => {
    test('should validate GitHub token', async () => {
      const mockUser = {
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com'
      };

      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: mockUser
      });

      const result = await githubIntegration.validateToken();

      expect(result.valid).toBe(true);
      expect(result.user).toEqual({
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com'
      });
    });

    test('should handle invalid token', async () => {
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue({
        status: 401,
        message: 'Bad credentials'
      });

      const result = await githubIntegration.validateToken();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    test('should handle network errors during validation', async () => {
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue({
        status: 500,
        message: 'Server error'
      });

      const result = await githubIntegration.validateToken();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Server error');
    });
  });

  describe('Error Handling', () => {
    test('should handle rate limit errors', async () => {
      mockOctokit.rest.repos.createForAuthenticatedUser.mockRejectedValue({
        status: 403,
        message: 'API rate limit exceeded'
      });

      const config: GitHubRepoConfig = {
        name: 'rate-limit-test'
      };

      const result = await githubIntegration.createRepository(config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit exceeded');
    });

    test('should handle network connectivity issues', async () => {
      mockOctokit.rest.repos.createForAuthenticatedUser.mockRejectedValue({
        code: 'ENOTFOUND',
        message: 'Network error'
      });

      const config: GitHubRepoConfig = {
        name: 'network-test'
      };

      const result = await githubIntegration.createRepository(config);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Configuration Options', () => {
    test('should support public repositories', async () => {
      const mockRepo = {
        id: 123456,
        name: 'public-repo',
        full_name: 'testuser/public-repo',
        description: 'Public test repo',
        private: false, // Public repository
        html_url: 'https://github.com/testuser/public-repo',
        clone_url: 'https://github.com/testuser/public-repo.git',
        ssh_url: 'git@github.com:testuser/public-repo.git',
        default_branch: 'main',
        created_at: '2025-08-31T00:00:00Z',
        updated_at: '2025-08-31T00:00:00Z',
        owner: { login: 'testuser' }
      };

      mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({
        data: mockRepo
      });

      const config: GitHubRepoConfig = {
        name: 'public-repo',
        private: false // Explicitly public
      };

      const result = await githubIntegration.createRepository(config);

      expect(result.success).toBe(true);
      expect(result.repo!.private).toBe(false);

      expect(mockOctokit.rest.repos.createForAuthenticatedUser).toHaveBeenCalledWith(
        expect.objectContaining({
          private: false
        })
      );
    });

    test('should support different license options', async () => {
      const mockRepo = {
        id: 123456,
        name: 'license-test',
        full_name: 'testuser/license-test',
        description: null,
        private: true,
        html_url: 'https://github.com/testuser/license-test',
        clone_url: 'https://github.com/testuser/license-test.git',
        ssh_url: 'git@github.com:testuser/license-test.git',
        default_branch: 'main',
        created_at: '2025-08-31T00:00:00Z',
        updated_at: '2025-08-31T00:00:00Z',
        owner: { login: 'testuser' }
      };

      mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({
        data: mockRepo
      });

      const config: GitHubRepoConfig = {
        name: 'license-test',
        license: 'apache-2.0'
      };

      await githubIntegration.createRepository(config);

      expect(mockOctokit.rest.repos.createForAuthenticatedUser).toHaveBeenCalledWith(
        expect.objectContaining({
          license_template: 'apache-2.0'
        })
      );
    });

    test('should handle repositories without README', async () => {
      const mockRepo = {
        id: 123456,
        name: 'no-readme',
        full_name: 'testuser/no-readme',
        description: null,
        private: true,
        html_url: 'https://github.com/testuser/no-readme',
        clone_url: 'https://github.com/testuser/no-readme.git',
        ssh_url: 'git@github.com:testuser/no-readme.git',
        default_branch: 'main',
        created_at: '2025-08-31T00:00:00Z',
        updated_at: '2025-08-31T00:00:00Z',
        owner: { login: 'testuser' }
      };

      mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({
        data: mockRepo
      });

      const config: GitHubRepoConfig = {
        name: 'no-readme',
        includeReadme: false
      };

      await githubIntegration.createRepository(config);

      expect(mockOctokit.rest.repos.createForAuthenticatedUser).toHaveBeenCalledWith(
        expect.objectContaining({
          auto_init: false // No README
        })
      );

      // Should not try to add .gitignore since no README/auto_init
      expect(mockOctokit.rest.repos.createOrUpdateFileContents).not.toHaveBeenCalled();
    });
  });
});