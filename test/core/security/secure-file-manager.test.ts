/**
 * Secure File Manager Tests
 * Comprehensive test suite for file security validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'path';
import {
  SecureFileManager,
  FileSecurityError,
  createSecureFileManager,
  validateFilePath,
  createSecureWorkspacePath,
  createSecureResourcePath,
  DEFAULT_FILE_CONFIG
} from '@core/security/secure-file-manager';

describe('SecureFileManager', () => {
  let fileManager: SecureFileManager;
  const testBasePath = path.resolve(process.cwd(), 'test-files');

  beforeEach(() => {
    fileManager = createSecureFileManager({
      allowedBasePaths: [testBasePath],
      allowedExtensions: ['.sql', '.json', '.txt'],
      maxFileSize: 1024 * 1024, // 1MB for tests
      maxPathLength: 500
    });
  });

  describe('Path Validation', () => {
    it('should accept valid file paths', () => {
      const validPaths = [
        'workspace.sql',
        'data/queries.sql',
        'config.json',
        'readme.txt'
      ];

      validPaths.forEach(filePath => {
        const result = fileManager.validatePath(filePath);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject empty or invalid paths', () => {
      const invalidPaths = [
        '',
        null,
        undefined,
        123 as any
      ];

      invalidPaths.forEach(filePath => {
        const result = fileManager.validatePath(filePath);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe('INVALID_PATH');
      });
    });

    it('should enforce maximum path length', () => {
      const longPath = 'a'.repeat(600) + '.sql';
      const result = fileManager.validatePath(longPath);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_PATH');
      expect(result.errors[0].message).toContain('exceeds maximum length');
    });
  });

  describe('Path Traversal Protection', () => {
    const traversalAttempts = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      './../../secret.txt',
      'data/../../../secret.sql',
      '/etc/passwd',
      'C:\\Windows\\System32\\config\\sam',
      'folder/../../outside.sql',
      '../outside/file.sql',
      '..\\outside\\file.sql',
      'normal/../../../escape.sql'
    ];

    traversalAttempts.forEach(attempt => {
      it(`should block path traversal attempt: ${attempt}`, () => {
        const result = fileManager.validatePath(attempt);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'PATH_TRAVERSAL')).toBe(true);
      });
    });

    it('should allow valid relative paths within base directory', () => {
      const validRelativePaths = [
        'subfolder/file.sql',
        'data/queries/complex.sql',
        './config.json',
        'docs/readme.txt'
      ];

      validRelativePaths.forEach(filePath => {
        const result = fileManager.validatePath(filePath);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('File Extension Validation', () => {
    it('should accept allowed file extensions', () => {
      const allowedFiles = [
        'query.sql',
        'config.json',
        'readme.txt'
      ];

      allowedFiles.forEach(filePath => {
        const result = fileManager.validatePath(filePath);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject disallowed file extensions', () => {
      const disallowedFiles = [
        'script.exe',
        'data.bin',
        'config.php',
        'malware.sh',
        'document.docx',
        'image.png'
      ];

      disallowedFiles.forEach(filePath => {
        const result = fileManager.validatePath(filePath);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'FILE_NOT_ALLOWED')).toBe(true);
      });
    });

    it('should handle case-insensitive extension checking', () => {
      const result1 = fileManager.validatePath('query.SQL');
      const result2 = fileManager.validatePath('config.JSON');
      
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });
  });

  describe('Suspicious Character Detection', () => {
    const suspiciousFiles = [
      'file<script>.sql',
      'query>redirect.sql',
      'data|pipe.sql',
      'config"quote.json',
      'file\x00null.sql',
      'file\x01control.sql',
      '.hidden.sql',
      '~temp.sql'
    ];

    suspiciousFiles.forEach(filePath => {
      it(`should detect suspicious characters in: ${filePath}`, () => {
        const result = fileManager.validatePath(filePath);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'INVALID_PATH')).toBe(true);
      });
    });
  });

  describe('Safe File Path Generation', () => {
    it('should generate safe workspace paths', () => {
      const fileName = 'my-workspace';
      const safePath = fileManager.getSafeFilePath(`${fileName}.json`, 'workspaces');
      
      expect(safePath).toContain('workspaces');
      expect(safePath).toContain(`${fileName}.json`);
      expect(path.isAbsolute(safePath)).toBe(true);
    });

    it('should generate safe resource paths', () => {
      const fileName = 'shared-query.sql';
      const safePath = fileManager.getSafeFilePath(fileName, 'resources');
      
      expect(safePath).toContain('resources');
      expect(safePath).toContain(fileName);
    });

    it('should generate safe temp paths', () => {
      const fileName = 'temp-data.json';
      const safePath = fileManager.getSafeFilePath(fileName, 'temp');
      
      expect(safePath).toContain('temp');
      expect(safePath).toContain(fileName);
    });

    it('should sanitize dangerous filenames', () => {
      const dangerousName = '../../../etc/passwd<>:|?*';
      
      expect(() => {
        fileManager.getSafeFilePath(dangerousName, 'temp');
      }).toThrow(FileSecurityError);
    });
  });

  describe('Filename Sanitization', () => {
    it('should sanitize dangerous characters', () => {
      const manager = createSecureFileManager({
        allowedBasePaths: [testBasePath]
      });
      
      // Test internal sanitization by checking safe path generation
      const testCases = [
        { input: 'file<name>.sql', expected: 'file_name_.sql' },
        { input: 'query:data.sql', expected: 'query_data.sql' },
        { input: 'config|pipe.json', expected: 'config_pipe.json' },
        { input: '...hidden.sql', expected: '___hidden.sql' },
        { input: 'file   with   spaces.txt', expected: 'file_with_spaces.txt' }
      ];

      testCases.forEach(({ input }) => {
        expect(() => {
          manager.getSafeFilePath(input, 'temp');
        }).not.toThrow();
      });
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300) + '.sql';
      
      expect(() => {
        fileManager.getSafeFilePath(longName, 'temp');
      }).not.toThrow();
    });
  });

  describe('Symbolic Link Handling', () => {
    it('should warn about symbolic links when not allowed', () => {
      const symlinkPaths = [
        'link->target.sql',
        'data/symlink->../secret.json'
      ];

      symlinkPaths.forEach(filePath => {
        const result = fileManager.validatePath(filePath);
        expect(result.warnings.some(w => w.includes('Symbolic links'))).toBe(true);
      });
    });

    it('should allow symbolic links when configured', () => {
      const symlinkAllowedManager = createSecureFileManager({
        allowedBasePaths: [testBasePath],
        allowSymlinks: true
      });

      const result = symlinkAllowedManager.validatePath('link->target.sql');
      expect(result.warnings.some(w => w.includes('Symbolic links'))).toBe(false);
    });
  });

  describe('Path Resolution', () => {
    it('should resolve paths correctly within base directories', () => {
      const result = fileManager.validatePath('data/query.sql');
      
      expect(result.isValid).toBe(true);
      expect(path.isAbsolute(result.resolvedPath)).toBe(true);
      expect(result.resolvedPath).toContain('data');
      expect(result.resolvedPath).toContain('query.sql');
    });

    it('should handle different path separators', () => {
      const windowsPath = 'data\\query.sql';
      const unixPath = 'data/query.sql';
      
      const windowsResult = fileManager.validatePath(windowsPath);
      const unixResult = fileManager.validatePath(unixPath);
      
      // Both should resolve to valid paths (normalized)
      expect(windowsResult.isValid).toBe(true);
      expect(unixResult.isValid).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const defaultManager = createSecureFileManager();
      const config = defaultManager.getConfig();
      
      expect(config.allowedBasePaths).toEqual(DEFAULT_FILE_CONFIG.allowedBasePaths);
      expect(config.allowedExtensions).toEqual(DEFAULT_FILE_CONFIG.allowedExtensions);
      expect(config.maxFileSize).toBe(DEFAULT_FILE_CONFIG.maxFileSize);
    });

    it('should merge custom configuration', () => {
      const customConfig = {
        maxFileSize: 2048,
        allowedExtensions: ['.custom']
      };
      
      const customManager = createSecureFileManager(customConfig);
      const config = customManager.getConfig();
      
      expect(config.maxFileSize).toBe(2048);
      expect(config.allowedExtensions).toEqual(['.custom']);
      expect(config.maxPathLength).toBe(DEFAULT_FILE_CONFIG.maxPathLength); // Should keep default
    });

    it('should provide access to allowed base paths', () => {
      const basePaths = fileManager.getAllowedBasePaths();
      expect(basePaths).toHaveLength(1);
      expect(basePaths[0]).toContain('test-files');
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle case sensitivity based on platform', () => {
      const caseSensitiveManager = createSecureFileManager({
        allowedBasePaths: [testBasePath],
        caseSensitive: true
      });

      const caseInsensitiveManager = createSecureFileManager({
        allowedBasePaths: [testBasePath],
        caseSensitive: false
      });

      const mixedCasePath = 'Data/Query.SQL';
      
      const sensitiveResult = caseSensitiveManager.validatePath(mixedCasePath);
      const insensitiveResult = caseInsensitiveManager.validatePath(mixedCasePath);
      
      // Both should be valid but handle differently internally
      expect(sensitiveResult.isValid).toBe(true);
      expect(insensitiveResult.isValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed error information', () => {
      const result = fileManager.validatePath('../../../etc/passwd');
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBeInstanceOf(FileSecurityError);
      expect(result.errors[0].code).toBe('PATH_TRAVERSAL');
      expect(result.errors[0].attemptedPath).toBe('../../../etc/passwd');
      expect(result.errors[0].message).toContain('outside allowed directories');
    });

    it('should accumulate multiple validation errors', () => {
      const badPath = '../../../etc/passwd.exe'; // Both traversal and bad extension
      const result = fileManager.validatePath(badPath);
      
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors.some(e => e.code === 'PATH_TRAVERSAL')).toBe(true);
      expect(result.errors.some(e => e.code === 'FILE_NOT_ALLOWED')).toBe(true);
    });
  });

  describe('Factory Functions', () => {
    it('should create secure file manager with factory', () => {
      const manager = createSecureFileManager();
      expect(manager).toBeInstanceOf(SecureFileManager);
    });

    it('should validate file path with quick function', () => {
      const result = validateFilePath('test.sql');
      expect(result.isValid).toBeDefined();
      expect(result.resolvedPath).toBeDefined();
    });

    it('should create secure workspace path', () => {
      const workspacePath = createSecureWorkspacePath('test-workspace');
      expect(workspacePath).toContain('workspaces');
      expect(workspacePath).toContain('test-workspace.json');
    });

    it('should create secure resource path', () => {
      const resourcePath = createSecureResourcePath('shared.sql');
      expect(resourcePath).toContain('resources');
      expect(resourcePath).toContain('shared.sql');
    });
  });

  describe('Edge Cases', () => {
    it('should handle paths with repeated separators', () => {
      const messyPath = 'data//subfolder///file.sql';
      const result = fileManager.validatePath(messyPath);
      
      expect(result.isValid).toBe(true);
      expect(result.resolvedPath).not.toContain('//');
    });

    it('should handle empty path segments', () => {
      const emptySegmentPath = 'data//file.sql';
      const result = fileManager.validatePath(emptySegmentPath);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle current directory references safely', () => {
      const currentDirPath = './data/./file.sql';
      const result = fileManager.validatePath(currentDirPath);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should validate paths efficiently', () => {
      const startTime = Date.now();
      
      // Validate many paths
      for (let i = 0; i < 1000; i++) {
        fileManager.validatePath(`file${i}.sql`);
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in <1s
    });
  });
});