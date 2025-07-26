/**
 * CTEDecomposer単体テスト
 * ブラウザ操作不要で CTE 分解処理をテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CTEDecomposer } from '../src/utils/cte-decomposer.js';
import { FileManager } from '../src/utils/file-manager.js';

describe('CTEDecomposer', () => {
    let decomposer: CTEDecomposer;
    let fileManager: FileManager;

    beforeEach(() => {
        decomposer = new CTEDecomposer();
        fileManager = new FileManager();
    });

    describe('基本的なCTE分解', () => {
        it('単一CTEを分解できる', async () => {
            const sql = `
                WITH users AS (
                    SELECT id, name FROM user_table
                )
                SELECT * FROM users
            `;

            const result = await decomposer.decompose(sql, fileManager);

            expect(result.privateCtesCreated).toBe(1);
            expect(result.decomposedCTEs).toHaveLength(1);
            expect(result.decomposedCTEs[0].name).toBe('users');
            
            // ファイルが作成されているか確認
            const files = fileManager.listFiles('zosql/workspace/private-cte');
            expect(files).toContain('zosql/workspace/private-cte/users.sql');
        });

        it('複数CTEを分解できる', async () => {
            const sql = `
                WITH session_data AS (
                    SELECT user_id, session_id FROM sessions
                ),
                user_engagement AS (
                    SELECT user_id, COUNT(*) as sessions 
                    FROM session_data 
                    GROUP BY user_id
                )
                SELECT * FROM user_engagement
            `;

            const result = await decomposer.decompose(sql, fileManager);

            expect(result.privateCtesCreated).toBe(2);
            expect(result.decomposedCTEs).toHaveLength(2);
            
            const cteNames = result.decomposedCTEs.map(cte => cte.name);
            expect(cteNames).toContain('session_data');
            expect(cteNames).toContain('user_engagement');

            // ファイルが作成されているか確認
            const files = fileManager.listFiles('zosql/workspace/private-cte');
            expect(files).toContain('zosql/workspace/private-cte/session_data.sql');
            expect(files).toContain('zosql/workspace/private-cte/user_engagement.sql');
        });

        it('CTEがない場合は何も作成しない', async () => {
            const sql = 'SELECT id, name FROM users';

            const result = await decomposer.decompose(sql, fileManager);

            expect(result.privateCtesCreated).toBe(0);
            expect(result.decomposedCTEs).toHaveLength(0);
            
            const files = fileManager.listFiles('zosql/workspace/private-cte');
            expect(files).toHaveLength(0);
        });
    });

    describe('ファイル内容の生成', () => {
        it('正しいファイル形式でCTEを保存する', async () => {
            const sql = `
                WITH user_stats AS (
                    SELECT user_id, COUNT(*) as count FROM orders GROUP BY user_id
                )
                SELECT * FROM user_stats
            `;

            await decomposer.decompose(sql, fileManager);

            const content = fileManager.readFile('zosql/workspace/private-cte/user_stats.sql');
            expect(content).toBeTruthy();
            
            // ヘッダーコメントの確認
            expect(content).toContain('/* name: user_stats */');
            expect(content).toContain('/* description: Extracted CTE: user_stats */');
            expect(content).toContain('/* dependencies: [] */');
            
            // SQL部分の確認（カスタムフォーマット：クォートなし、改行・インデント適用）
            expect(content).toContain('select');
            expect(content).toContain('user_id');
            expect(content).toContain('count(*) as count');
            expect(content).toContain('from');
            expect(content).toContain('orders');
            expect(content).toContain('group by');
        });

        it('依存関係を正しく抽出する', async () => {
            const sql = `
                WITH session_data AS (
                    SELECT user_id FROM sessions
                ),
                user_engagement AS (
                    SELECT user_id, COUNT(*) FROM session_data GROUP BY user_id
                )
                SELECT * FROM user_engagement
            `;

            await decomposer.decompose(sql, fileManager);

            // user_engagement は session_data に依存する
            const userEngagementContent = fileManager.readFile('zosql/workspace/private-cte/user_engagement.sql');
            expect(userEngagementContent).toContain('/* dependencies: ["session_data"] */');

            // session_data は依存関係なし
            const sessionDataContent = fileManager.readFile('zosql/workspace/private-cte/session_data.sql');
            expect(sessionDataContent).toContain('/* dependencies: [] */');
        });
    });

    describe('ファイル読み込み機能', () => {
        beforeEach(() => {
            // テスト用のPrivate CTEファイルを作成
            const sessionDataContent = [
                '/* name: session_data */',
                '/* description: Extracted CTE: session_data */',
                '/* dependencies: [] */',
                '',
                'SELECT user_id, session_id FROM user_sessions'
            ].join('\n');

            const userEngagementContent = [
                '/* name: user_engagement */',
                '/* description: Extracted CTE: user_engagement */',
                '/* dependencies: ["session_data"] */',
                '',
                'SELECT user_id, COUNT(*) as sessions FROM session_data GROUP BY user_id'
            ].join('\n');

            fileManager.writeFile('zosql/workspace/private-cte/session_data.sql', sessionDataContent);
            fileManager.writeFile('zosql/workspace/private-cte/user_engagement.sql', userEngagementContent);
        });

        it('Private CTEファイルを一覧取得できる', async () => {
            const files = decomposer.getPrivateCTEFiles(fileManager);
            
            expect(files).toHaveLength(2);
            expect(files).toContain('zosql/workspace/private-cte/session_data.sql');
            expect(files).toContain('zosql/workspace/private-cte/user_engagement.sql');
        });

        it('個別のCTEファイルを読み込める', async () => {
            const sessionData = decomposer.loadPrivateCTE(fileManager, 'zosql/workspace/private-cte/session_data.sql');
            
            expect(sessionData).toBeTruthy();
            expect(sessionData!.name).toBe('session_data');
            expect(sessionData!.dependencies).toEqual([]);
            expect(sessionData!.query).toContain('SELECT user_id, session_id FROM user_sessions');
        });

        it('すべてのPrivate CTEを読み込める', async () => {
            const allCTEs = decomposer.loadAllPrivateCTEs(fileManager);
            
            expect(allCTEs).toHaveLength(2);
            
            const names = allCTEs.map(cte => cte.name);
            expect(names).toContain('session_data');
            expect(names).toContain('user_engagement');

            const userEngagement = allCTEs.find(cte => cte.name === 'user_engagement');
            expect(userEngagement!.dependencies).toEqual(['session_data']);
        });

        it('存在しないファイルを読み込むとnullを返す', async () => {
            const result = decomposer.loadPrivateCTE(fileManager, 'nonexistent.sql');
            expect(result).toBeNull();
        });
    });

    describe('カスタムディレクトリ', () => {
        it('カスタムターゲットディレクトリを使用できる', async () => {
            const sql = `
                WITH custom_cte AS (
                    SELECT id FROM custom_table
                )
                SELECT * FROM custom_cte
            `;

            const customDir = 'custom/cte/path';
            const result = await decomposer.decompose(sql, fileManager, customDir);

            expect(result.privateCtesCreated).toBe(1);
            
            const files = fileManager.listFiles(customDir);
            expect(files).toContain('custom/cte/path/custom_cte.sql');
        });
    });

    describe('エラーハンドリング', () => {
        it('不正なSQLでエラーを投げる', async () => {
            const invalidSql = 'INVALID SQL SYNTAX';

            await expect(async () => {
                await decomposer.decompose(invalidSql, fileManager);
            }).rejects.toThrow('CTE decomposition failed');
        });

        it('破損したJSONの依存関係を無視する', async () => {
            const brokenDepsContent = [
                '/* name: broken_deps */',
                '/* description: Extracted CTE: broken_deps */',
                '/* dependencies: [invalid json] */',
                '',
                'SELECT 1'
            ].join('\n');

            fileManager.writeFile('zosql/workspace/private-cte/broken_deps.sql', brokenDepsContent);

            const cte = decomposer.loadPrivateCTE(fileManager, 'zosql/workspace/private-cte/broken_deps.sql');
            
            expect(cte).toBeTruthy();
            expect(cte!.dependencies).toEqual([]);  // 破損したJSONは空配列にフォールバック
        });
    });

    describe('実用的なケース', () => {
        it('複雑なクエリを分解して読み込める', async () => {
            const complexSql = `
                WITH session_data AS (
                    SELECT user_id, session_id, start_time, end_time
                    FROM user_sessions 
                    WHERE start_time >= current_date - INTERVAL '7 days'
                ),
                user_engagement AS (
                    SELECT user_id, COUNT(distinct session_id) as total_sessions,
                           AVG(extract(epoch from (end_time - start_time))) as avg_duration
                    FROM session_data 
                    GROUP BY user_id
                ),
                high_engagement_users AS (
                    SELECT user_id, total_sessions, avg_duration
                    FROM user_engagement
                    WHERE total_sessions >= 5 AND avg_duration >= 300
                )
                SELECT u.name, h.total_sessions, h.avg_duration
                FROM high_engagement_users h
                JOIN users u ON h.user_id = u.id
                ORDER BY h.total_sessions DESC, h.avg_duration DESC
            `;

            // 分解
            const result = await decomposer.decompose(complexSql, fileManager);
            expect(result.privateCtesCreated).toBe(3);

            // 読み込みテスト
            const allCTEs = decomposer.loadAllPrivateCTEs(fileManager);
            expect(allCTEs).toHaveLength(3);

            const cteNames = allCTEs.map(cte => cte.name);
            expect(cteNames).toContain('session_data');
            expect(cteNames).toContain('user_engagement');
            expect(cteNames).toContain('high_engagement_users');

            // 依存関係の確認
            const userEngagement = allCTEs.find(cte => cte.name === 'user_engagement');
            const highEngagement = allCTEs.find(cte => cte.name === 'high_engagement_users');

            expect(userEngagement!.dependencies).toContain('session_data');
            expect(highEngagement!.dependencies).toContain('user_engagement');
        });
    });

    describe('オプション設定', () => {
        it('カスタムオプションでCTEDecomposerを作成できる', async () => {
            const customDecomposer = new CTEDecomposer({
                addComments: false,
                preset: 'mysql',
                withClauseStyle: 'standard'
            });

            expect(customDecomposer).toBeTruthy();
            // オプションの詳細なテストは rawsql-ts 側で行われている前提
        });
    });
});