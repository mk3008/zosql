import { describe, it, expect } from 'vitest';
import { FileManager } from '../src/file-manager';

describe('FileManager', () => {
  it('should create and manage files in memory', () => {
    const fileManager = new FileManager();
    
    fileManager.writeFile('test.sql', 'SELECT * FROM users');
    
    expect(fileManager.exists('test.sql')).toBe(true);
    expect(fileManager.readFile('test.sql')).toBe('SELECT * FROM users');
    expect(fileManager.listFiles()).toEqual(['test.sql']);
  });

  it('should handle multiple files', () => {
    const fileManager = new FileManager();
    
    fileManager.writeFile('users.cte.sql', 'SELECT * FROM users');
    fileManager.writeFile('orders.cte.sql', 'SELECT * FROM orders');
    fileManager.writeFile('main.sql', 'WITH users AS (), orders AS () SELECT * FROM users');
    
    expect(fileManager.listFiles()).toHaveLength(3);
    expect(fileManager.listFiles()).toContain('users.cte.sql');
    expect(fileManager.listFiles()).toContain('orders.cte.sql');
    expect(fileManager.listFiles()).toContain('main.sql');
  });

  it('should overwrite existing files', () => {
    const fileManager = new FileManager();
    
    fileManager.writeFile('test.sql', 'original content');
    fileManager.writeFile('test.sql', 'updated content');
    
    expect(fileManager.readFile('test.sql')).toBe('updated content');
  });
});