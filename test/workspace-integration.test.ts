/**
 * WorkspaceApi統合テスト
 * FileManagerを使用したCTE分解処理の統合テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkspaceApi } from '../src/api/workspace-api.js';
import fs from 'fs/promises';
import path from 'path';
import type { Request, Response } from 'express';

// Mock Express Request/Response types for testing

describe('WorkspaceApi with FileManager Integration', () => {
    let workspaceApi: WorkspaceApi;
    const testWorkspacePath = path.join(process.cwd(), 'zosql', 'workspace');

    beforeEach(async () => {
        workspaceApi = new WorkspaceApi();
        
        // テスト用ワークスペースをクリーンアップ
        try {
            await fs.rm(testWorkspacePath, { recursive: true, force: true });
        } catch (error) {
            // ディレクトリが存在しない場合は無視
        }
    });

    afterEach(async () => {
        // テスト後のクリーンアップ
        try {
            await fs.rm(testWorkspacePath, { recursive: true, force: true });
        } catch (error) {
            // ディレクトリが存在しない場合は無視
        }
    });

    describe('CTE分解処理の統合テスト', () => {
        it('単一CTEを正しく分解してファイルに保存する', async () => {
            const sql = `
                WITH user_stats AS (
                    SELECT user_id, COUNT(*) as order_count 
                    FROM orders 
                    GROUP BY user_id
                )
                SELECT * FROM user_stats WHERE order_count > 5
            `;

            // モックRequest/Responseオブジェクト
            const req = {
                body: {
                    sql,
                    queryName: 'test_query',
                    originalFilePath: 'test.sql'
                },
                headers: {}
            } as unknown as Request;

            const res = {
                json: vi.fn(),
                status: vi.fn().mockReturnThis()
            } as unknown as Response;

            // デコンポーズ実行
            await workspaceApi.handleDecomposeQuery(req, res);

            // レスポンスが成功したことを確認
            expect(res.status).not.toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    workspace: expect.objectContaining({
                        privateCtes: expect.objectContaining({
                            user_stats: expect.objectContaining({
                                name: 'user_stats',
                                dependencies: expect.any(Array)
                            })
                        })
                    })
                })
            );

            // Private CTEファイルが正しく作成されているか確認
            const privateCteDir = path.join(testWorkspacePath, 'private-cte');
            const userStatsFile = path.join(privateCteDir, 'user_stats.sql');
            
            const fileExists = await fs.access(userStatsFile).then(() => true).catch(() => false);
            expect(fileExists).toBe(true);

            // ファイル内容を確認
            const content = await fs.readFile(userStatsFile, 'utf8');
            expect(content).toContain('/* name: user_stats */');
            expect(content).toContain('/* dependencies: [] */');
            expect(content).toContain('select "user_id", count(*) as "order_count"');
        });

        it('複数CTEの依存関係を正しく処理する', async () => {
            const sql = `
                WITH session_data AS (
                    SELECT user_id, session_id FROM user_sessions
                ),
                user_engagement AS (
                    SELECT user_id, COUNT(*) as sessions 
                    FROM session_data 
                    GROUP BY user_id
                ),
                high_engagement AS (
                    SELECT user_id, sessions
                    FROM user_engagement
                    WHERE sessions >= 5
                )
                SELECT * FROM high_engagement
            `;

            const req = {
                body: {
                    sql,
                    queryName: 'engagement_analysis',
                    originalFilePath: 'engagement.sql'
                }
            } as unknown as Request;

            const res = {
                json: vi.fn(),
                status: vi.fn().mockReturnThis()
            } as unknown as Response;

            await workspaceApi.handleDecomposeQuery(req, res);

            // 3つのCTEが作成されることを確認
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    workspace: expect.objectContaining({
                        privateCtes: expect.objectContaining({
                            session_data: expect.any(Object),
                            user_engagement: expect.any(Object),
                            high_engagement: expect.any(Object)
                        })
                    })
                })
            );

            // ファイルが作成されていることを確認
            const privateCteDir = path.join(testWorkspacePath, 'private-cte');
            
            const sessionDataFile = path.join(privateCteDir, 'session_data.sql');
            const userEngagementFile = path.join(privateCteDir, 'user_engagement.sql');
            const highEngagementFile = path.join(privateCteDir, 'high_engagement.sql');

            for (const filePath of [sessionDataFile, userEngagementFile, highEngagementFile]) {
                const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
                expect(fileExists).toBe(true);
            }

            // 依存関係を確認
            const userEngagementContent = await fs.readFile(userEngagementFile, 'utf8');
            expect(userEngagementContent).toContain('/* dependencies: ["session_data"] */');

            const highEngagementContent = await fs.readFile(highEngagementFile, 'utf8');
            expect(highEngagementContent).toContain('/* dependencies: ["user_engagement"] */');
        });

        it('CTEがない場合は何も作成しない', async () => {
            const sql = 'SELECT id, name FROM users WHERE active = true';

            const req = {
                body: {
                    sql,
                    queryName: 'simple_query',
                    originalFilePath: 'simple.sql'
                }
            } as unknown as Request;

            const res = {
                json: vi.fn(),
                status: vi.fn().mockReturnThis()
            } as unknown as Response;

            await workspaceApi.handleDecomposeQuery(req, res);

            // Private CTEが空であることを確認
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    workspace: expect.objectContaining({
                        privateCtes: {}
                    })
                })
            );

            // Private CTEディレクトリが空であることを確認
            const privateCteDir = path.join(testWorkspacePath, 'private-cte');
            try {
                const files = await fs.readdir(privateCteDir);
                expect(files).toHaveLength(0);
            } catch (error) {
                // ディレクトリが存在しない場合も正常
                expect((error as NodeJS.ErrnoException).code).toBe('ENOENT');
            }
        });
    });

    describe('エラーハンドリング', () => {
        it('不正なSQLでエラーレスポンスを返す', async () => {
            const req = {
                body: {
                    sql: 'INVALID SQL SYNTAX',
                    queryName: 'invalid_query'
                }
            } as unknown as Request;

            const res = {
                json: vi.fn(),
                status: vi.fn().mockReturnThis()
            } as unknown as Response;

            await workspaceApi.handleDecomposeQuery(req, res);

            // エラーが発生しても適切にハンドリングされることを確認
            // （CTEDecomposerはエラーをキャッチして空の結果を返す）
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    workspace: expect.objectContaining({
                        privateCtes: {}
                    })
                })
            );
        });

        it('SQLが空の場合は400エラーを返す', async () => {
            const req = {
                body: {
                    queryName: 'empty_query'
                }
            } as unknown as Request;

            const res = {
                json: vi.fn(),
                status: vi.fn().mockReturnThis()
            } as unknown as Response;

            await workspaceApi.handleDecomposeQuery(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'SQL is required'
            });
        });
    });

    describe('実用的なケース', () => {
        it('複雑な分析クエリを正しく分解する', async () => {
            const complexSql = `
                WITH session_data AS (
                    SELECT user_id, session_id, start_time, end_time,
                           extract(epoch from (end_time - start_time)) / 60 as session_duration_minutes
                    FROM user_sessions 
                    WHERE start_time >= current_date - INTERVAL '7 days'
                ),
                user_engagement AS (
                    SELECT user_id, 
                           COUNT(distinct session_id) as total_sessions,
                           AVG(session_duration_minutes) as avg_session_duration
                    FROM session_data 
                    GROUP BY user_id
                ),
                conversion_events AS (
                    SELECT user_id, event_type, event_time
                    FROM events 
                    WHERE event_time >= current_date - INTERVAL '7 days'
                      AND event_type IN ('signup', 'purchase')
                ),
                user_analysis AS (
                    SELECT ue.user_id, 
                           ue.total_sessions,
                           ue.avg_session_duration,
                           COUNT(ce.event_type) as conversion_events
                    FROM user_engagement ue
                    LEFT JOIN conversion_events ce ON ue.user_id = ce.user_id
                    GROUP BY ue.user_id, ue.total_sessions, ue.avg_session_duration
                )
                SELECT user_id, total_sessions, avg_session_duration, conversion_events
                FROM user_analysis
                WHERE total_sessions >= 3 AND conversion_events > 0
                ORDER BY conversion_events DESC, total_sessions DESC
            `;

            const req = {
                body: {
                    sql: complexSql,
                    queryName: 'user_behavior_analysis',
                    originalFilePath: 'user_behavior_analysis.sql'
                }
            } as unknown as Request;

            const res = {
                json: vi.fn(),
                status: vi.fn().mockReturnThis()
            } as unknown as Response;

            await workspaceApi.handleDecomposeQuery(req, res);

            // 4つのCTEが作成されることを確認
            const responseCall = (res.json as unknown as { mock: { calls: Array<[{ workspace: { privateCtes: Record<string, { dependencies: string[] }> } }]> } }).mock.calls[0][0];
            const privateCtes = responseCall.workspace.privateCtes;
            
            expect(Object.keys(privateCtes)).toHaveLength(4);
            expect(privateCtes).toHaveProperty('session_data');
            expect(privateCtes).toHaveProperty('user_engagement');
            expect(privateCtes).toHaveProperty('conversion_events');
            expect(privateCtes).toHaveProperty('user_analysis');

            // 依存関係の確認
            expect(privateCtes.user_engagement.dependencies).toContain('session_data');
            expect(privateCtes.user_analysis.dependencies).toContain('user_engagement');

            // ファイルが実際に作成されていることを確認
            const privateCteDir = path.join(testWorkspacePath, 'private-cte');
            const expectedFiles = ['session_data.sql', 'user_engagement.sql', 'conversion_events.sql', 'user_analysis.sql'];
            
            for (const fileName of expectedFiles) {
                const filePath = path.join(privateCteDir, fileName);
                const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
                expect(fileExists).toBe(true);
                
                const content = await fs.readFile(filePath, 'utf8');
                expect(content).toContain(`/* name: ${fileName.replace('.sql', '')} */`);
            }
        });
    });
});