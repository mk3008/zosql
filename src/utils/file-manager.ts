/**
 * FileManager - メモリ上でファイル管理を行うクラス
 * 実際のファイルシステムに書き出す前にメモリ上で検証可能にする
 */

export interface FileManagerFile {
    path: string;
    content: string;
    created: Date;
    modified: Date;
}

export class FileManager {
    private files: Map<string, FileManagerFile> = new Map();

    /**
     * ファイルを作成・更新
     */
    writeFile(path: string, content: string): void {
        const now = new Date();
        const existing = this.files.get(path);
        
        this.files.set(path, {
            path,
            content,
            created: existing?.created || now,
            modified: now
        });
    }

    /**
     * ファイル内容を読み取り
     */
    readFile(path: string): string | null {
        const file = this.files.get(path);
        return file ? file.content : null;
    }

    /**
     * ファイルが存在するかチェック
     */
    exists(path: string): boolean {
        return this.files.has(path);
    }

    /**
     * ファイルを削除
     */
    deleteFile(path: string): boolean {
        return this.files.delete(path);
    }

    /**
     * ディレクトリ内のファイル一覧を取得
     */
    listFiles(dirPath: string): string[] {
        const files: string[] = [];
        
        // 空文字列の場合はルートレベルのファイルを取得
        if (dirPath === '') {
            for (const path of this.files.keys()) {
                files.push(path);
            }
        } else {
            const normalizedDir = dirPath.endsWith('/') ? dirPath : dirPath + '/';
            for (const path of this.files.keys()) {
                if (path.startsWith(normalizedDir)) {
                    files.push(path);
                }
            }
        }
        
        return files.sort();
    }

    /**
     * パターンマッチでファイル一覧を取得
     */
    glob(pattern: string): string[] {
        const files: string[] = [];
        const regex = this.globToRegex(pattern);
        
        for (const path of this.files.keys()) {
            if (regex.test(path)) {
                files.push(path);
            }
        }
        
        return files.sort();
    }

    /**
     * glob パターンを正規表現に変換
     */
    private globToRegex(pattern: string): RegExp {
        const escaped = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // 特殊文字をエスケープ
            .replace(/\*/g, '.*')                   // * を .* に変換
            .replace(/\?/g, '.');                   // ? を . に変換
        
        return new RegExp(`^${escaped}$`);
    }

    /**
     * 全ファイルをクリア
     */
    clear(): void {
        this.files.clear();
    }

    /**
     * ファイル数を取得
     */
    size(): number {
        return this.files.size;
    }

    /**
     * 全ファイル情報を取得（デバッグ用）
     */
    getAllFiles(): FileManagerFile[] {
        return Array.from(this.files.values());
    }

    /**
     * 実際のファイルシステムに書き出し
     */
    async flushToFileSystem(basePath: string = ''): Promise<void> {
        const fs = await import('fs/promises');
        const path = await import('path');

        for (const file of this.files.values()) {
            const fullPath = basePath ? path.join(basePath, file.path) : file.path;
            const dir = path.dirname(fullPath);
            
            // ディレクトリを作成
            await fs.mkdir(dir, { recursive: true });
            
            // ファイルを書き込み
            await fs.writeFile(fullPath, file.content, 'utf8');
        }
    }

    /**
     * ファイルシステムからロード
     */
    async loadFromFileSystem(dirPath: string): Promise<void> {
        const fs = await import('fs/promises');
        const path = await import('path');

        const loadDirectory = async (currentPath: string, relativePath: string = '') => {
            try {
                const entries = await fs.readdir(currentPath, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(currentPath, entry.name);
                    const relativeFilePath = relativePath ? path.join(relativePath, entry.name) : entry.name;

                    if (entry.isDirectory()) {
                        await loadDirectory(fullPath, relativeFilePath);
                    } else if (entry.isFile()) {
                        const content = await fs.readFile(fullPath, 'utf8');
                        const stats = await fs.stat(fullPath);
                        
                        this.files.set(relativeFilePath, {
                            path: relativeFilePath,
                            content,
                            created: stats.birthtime,
                            modified: stats.mtime
                        });
                    }
                }
            } catch (error) {
                // ディレクトリが存在しない場合は無視
                if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                    throw error;
                }
            }
        };

        await loadDirectory(dirPath);
    }
}