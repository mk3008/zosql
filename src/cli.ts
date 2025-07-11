import { FileManager } from './file-manager.js';
import { decomposeSQL } from './sql-decomposer.js';
import { composeSQL } from './sql-composer.js';

export interface DecomposeResult {
  success: boolean;
  outputFiles: string[];
  fileManager: FileManager;
}

export interface RecomposeResult {
  success: boolean;
  outputFiles: string[];
  fileManager: FileManager;
}

export interface ComposeResult {
  success: boolean;
  sql: string;
}

export class CLI {
  async decompose(fileManager: FileManager, inputFile: string, outputPath: string): Promise<DecomposeResult> {
    try {
      const inputSql = fileManager.readFile(inputFile);
      if (!inputSql) {
        throw new Error(`File ${inputFile} not found`);
      }

      const result = decomposeSQL(inputSql, outputPath);
      
      return {
        success: true,
        outputFiles: result.files.map(f => f.name),
        fileManager: result.fileManager
      };
    } catch (error) {
      console.error('CLI decompose error:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
      return {
        success: false,
        outputFiles: [],
        fileManager: new FileManager()
      };
    }
  }

  async recompose(fileManager: FileManager, mainSqlPath: string): Promise<RecomposeResult> {
    try {
      const mainSql = fileManager.readFile(mainSqlPath);
      if (!mainSql) {
        throw new Error(`File ${mainSqlPath} not found`);
      }

      const result = decomposeSQL(mainSql, mainSqlPath.replace('/main.sql', ''));
      
      return {
        success: true,
        outputFiles: result.files.map(f => f.name),
        fileManager: result.fileManager
      };
    } catch (error) {
      return {
        success: false,
        outputFiles: [],
        fileManager: new FileManager()
      };
    }
  }

  async compose(fileManager: FileManager, developPath: string, originalPath: string): Promise<ComposeResult> {
    try {
      const result = composeSQL(fileManager, developPath, originalPath);
      
      return {
        success: true,
        sql: result.sql
      };
    } catch (error) {
      return {
        success: false,
        sql: ''
      };
    }
  }
}