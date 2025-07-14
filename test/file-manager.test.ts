/**
 * FileManager単体テスト
 * 実際のファイルシステムを使わずメモリ上でファイル操作をテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FileManager } from '../src/utils/file-manager.js';

describe('FileManager', () => {
    let fileManager: FileManager;

    beforeEach(() => {
        fileManager = new FileManager();
    });

    describe('基本的なファイル操作', () => {
        it('ファイルを作成・読み取りできる', () => {
            const path = 'test.txt';
            const content = 'Hello, World!';

            fileManager.writeFile(path, content);
            const result = fileManager.readFile(path);

            expect(result).toBe(content);
        });

        it('存在しないファイルを読み取るとnullを返す', () => {
            const result = fileManager.readFile('nonexistent.txt');
            expect(result).toBeNull();
        });

        it('ファイルの存在確認ができる', () => {
            const path = 'test.txt';

            expect(fileManager.exists(path)).toBe(false);

            fileManager.writeFile(path, 'content');
            expect(fileManager.exists(path)).toBe(true);
        });

        it('ファイルを削除できる', () => {
            const path = 'test.txt';
            fileManager.writeFile(path, 'content');

            expect(fileManager.exists(path)).toBe(true);
            
            const deleted = fileManager.deleteFile(path);
            expect(deleted).toBe(true);
            expect(fileManager.exists(path)).toBe(false);
        });

        it('存在しないファイルの削除はfalseを返す', () => {
            const deleted = fileManager.deleteFile('nonexistent.txt');
            expect(deleted).toBe(false);
        });
    });

    describe('ファイル更新', () => {
        it('既存ファイルを更新すると内容が変わる', () => {
            const path = 'test.txt';
            
            fileManager.writeFile(path, 'original');
            expect(fileManager.readFile(path)).toBe('original');

            fileManager.writeFile(path, 'updated');
            expect(fileManager.readFile(path)).toBe('updated');
        });

        it('ファイル更新時に作成日時は保持される', async () => {
            const path = 'test.txt';
            
            fileManager.writeFile(path, 'original');
            const files1 = fileManager.getAllFiles();
            const originalCreated = files1[0].created;

            // 少し待ってから更新
            await new Promise(resolve => setTimeout(resolve, 10));
            
            fileManager.writeFile(path, 'updated');
            const files2 = fileManager.getAllFiles();
            const updatedFile = files2[0];

            expect(updatedFile.created).toEqual(originalCreated);
            expect(updatedFile.modified.getTime()).toBeGreaterThan(originalCreated.getTime());
        });
    });

    describe('ディレクトリ操作', () => {
        beforeEach(() => {
            // テスト用ファイル構造を作成
            fileManager.writeFile('dir1/file1.txt', 'content1');
            fileManager.writeFile('dir1/file2.txt', 'content2');
            fileManager.writeFile('dir1/subdir/file3.txt', 'content3');
            fileManager.writeFile('dir2/file4.txt', 'content4');
            fileManager.writeFile('root.txt', 'root content');
        });

        it('ディレクトリ内のファイル一覧を取得できる', () => {
            const files = fileManager.listFiles('dir1');
            
            expect(files).toEqual([
                'dir1/file1.txt',
                'dir1/file2.txt',
                'dir1/subdir/file3.txt'
            ]);
        });

        it('存在しないディレクトリは空配列を返す', () => {
            const files = fileManager.listFiles('nonexistent');
            expect(files).toEqual([]);
        });

        it('トレイリングスラッシュありでもディレクトリ一覧を取得できる', () => {
            const files = fileManager.listFiles('dir1/');
            
            expect(files).toEqual([
                'dir1/file1.txt',
                'dir1/file2.txt',
                'dir1/subdir/file3.txt'
            ]);
        });
    });

    describe('glob パターンマッチ', () => {
        beforeEach(() => {
            fileManager.writeFile('src/index.ts', 'typescript');
            fileManager.writeFile('src/utils.ts', 'typescript');
            fileManager.writeFile('src/test.js', 'javascript');
            fileManager.writeFile('dist/index.js', 'compiled');
            fileManager.writeFile('README.md', 'readme');
        });

        it('*.ts パターンでTypeScriptファイルを取得', () => {
            const files = fileManager.glob('src/*.ts');
            
            expect(files).toEqual([
                'src/index.ts',
                'src/utils.ts'
            ]);
        });

        it('*.js パターンでJavaScriptファイルを取得', () => {
            const files = fileManager.glob('*/*.js');
            
            expect(files).toEqual([
                'dist/index.js',
                'src/test.js'
            ]);
        });

        it('? パターンで単一文字マッチ', () => {
            fileManager.writeFile('a.txt', 'a');
            fileManager.writeFile('b.txt', 'b');
            fileManager.writeFile('ab.txt', 'ab');
            
            const files = fileManager.glob('?.txt');
            
            expect(files).toEqual([
                'a.txt',
                'b.txt'
            ]);
        });

        it('マッチしないパターンは空配列を返す', () => {
            const files = fileManager.glob('*.py');
            expect(files).toEqual([]);
        });
    });

    describe('ユーティリティ機能', () => {
        it('clear()で全ファイルを削除', () => {
            fileManager.writeFile('file1.txt', 'content1');
            fileManager.writeFile('file2.txt', 'content2');
            
            expect(fileManager.size()).toBe(2);
            
            fileManager.clear();
            
            expect(fileManager.size()).toBe(0);
            expect(fileManager.exists('file1.txt')).toBe(false);
            expect(fileManager.exists('file2.txt')).toBe(false);
        });

        it('size()でファイル数を取得', () => {
            expect(fileManager.size()).toBe(0);
            
            fileManager.writeFile('file1.txt', 'content1');
            expect(fileManager.size()).toBe(1);
            
            fileManager.writeFile('file2.txt', 'content2');
            expect(fileManager.size()).toBe(2);
            
            fileManager.deleteFile('file1.txt');
            expect(fileManager.size()).toBe(1);
        });

        it('getAllFiles()で全ファイル情報を取得', () => {
            fileManager.writeFile('test.txt', 'content');
            
            const files = fileManager.getAllFiles();
            
            expect(files).toHaveLength(1);
            expect(files[0].path).toBe('test.txt');
            expect(files[0].content).toBe('content');
            expect(files[0].created).toBeInstanceOf(Date);
            expect(files[0].modified).toBeInstanceOf(Date);
        });
    });

    describe('Private CTE ファイル用のテストケース', () => {
        it('Private CTE ディレクトリ構造を作成', () => {
            const basePath = 'zosql/workspace/private-cte';
            
            fileManager.writeFile(`${basePath}/session_data.sql`, 'SELECT user_id FROM sessions');
            fileManager.writeFile(`${basePath}/user_engagement.sql`, 'SELECT user_id, sessions FROM engagement');
            fileManager.writeFile(`${basePath}/device_analysis.sql`, 'SELECT device_type FROM analysis');
            
            const files = fileManager.listFiles(basePath);
            
            expect(files).toEqual([
                'zosql/workspace/private-cte/device_analysis.sql',
                'zosql/workspace/private-cte/session_data.sql',
                'zosql/workspace/private-cte/user_engagement.sql'
            ]);
        });

        it('*.sql パターンでSQLファイルのみ取得', () => {
            fileManager.writeFile('zosql/workspace/private-cte/session_data.sql', 'SQL content');
            fileManager.writeFile('zosql/workspace/private-cte/metadata.json', 'JSON content');
            fileManager.writeFile('zosql/workspace/private-cte/readme.md', 'Markdown');
            
            const sqlFiles = fileManager.glob('zosql/workspace/private-cte/*.sql');
            
            expect(sqlFiles).toEqual([
                'zosql/workspace/private-cte/session_data.sql'
            ]);
        });

        it('CTE依存関係コメント付きSQLファイルの作成', () => {
            const cteName = 'user_engagement';
            const dependencies = ['session_data'];
            const query = 'SELECT user_id, COUNT(*) as sessions FROM session_data GROUP BY user_id';
            
            const content = [
                `/* name: ${cteName} */`,
                `/* description: Extracted CTE: ${cteName} */`,
                `/* dependencies: ${JSON.stringify(dependencies)} */`,
                '',
                query
            ].join('\n');
            
            fileManager.writeFile(`zosql/workspace/private-cte/${cteName}.sql`, content);
            
            const saved = fileManager.readFile(`zosql/workspace/private-cte/${cteName}.sql`);
            
            expect(saved).toBe(content);
            expect(saved).toContain('/* name: user_engagement */');
            expect(saved).toContain('/* dependencies: ["session_data"] */');
            expect(saved).toContain('SELECT user_id, COUNT(*) as sessions');
        });
    });

    describe('エラーハンドリング', () => {
        it('特殊文字を含むファイル名も処理できる', () => {
            const specialPath = 'dir/file with spaces & symbols.txt';
            const content = 'special content';
            
            fileManager.writeFile(specialPath, content);
            
            expect(fileManager.exists(specialPath)).toBe(true);
            expect(fileManager.readFile(specialPath)).toBe(content);
        });

        it('深いディレクトリ構造も処理できる', () => {
            const deepPath = 'very/deep/directory/structure/file.txt';
            const content = 'deep content';
            
            fileManager.writeFile(deepPath, content);
            
            expect(fileManager.exists(deepPath)).toBe(true);
            expect(fileManager.readFile(deepPath)).toBe(content);
        });
    });

    describe('レガシー互換性テスト', () => {
        it('should create and manage files in memory', () => {
            fileManager.writeFile('test.sql', 'SELECT * FROM users');
            
            expect(fileManager.exists('test.sql')).toBe(true);
            expect(fileManager.readFile('test.sql')).toBe('SELECT * FROM users');
            expect(fileManager.listFiles('')).toEqual(['test.sql']);
        });

        it('should handle multiple files', () => {
            fileManager.writeFile('users.cte.sql', 'SELECT * FROM users');
            fileManager.writeFile('orders.cte.sql', 'SELECT * FROM orders');
            fileManager.writeFile('main.sql', 'WITH users AS (), orders AS () SELECT * FROM users');
            
            const allFiles = fileManager.listFiles('');
            expect(allFiles).toHaveLength(3);
            expect(allFiles).toContain('users.cte.sql');
            expect(allFiles).toContain('orders.cte.sql');
            expect(allFiles).toContain('main.sql');
        });

        it('should overwrite existing files', () => {
            fileManager.writeFile('test.sql', 'original content');
            fileManager.writeFile('test.sql', 'updated content');
            
            expect(fileManager.readFile('test.sql')).toBe('updated content');
        });
    });
});