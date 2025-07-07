import { FileManager } from './file-manager';
import { decomposeSQL } from './sql-decomposer';
import { composeSQL } from './sql-composer';

export interface DecomposeResult {
  success: boolean;
  outputFiles: string[];
  fileManager: FileManager;
}

export interface ComposeResult {
  success: boolean;
  sql: string;
}

export class CLI {
  async decompose(fileManager: FileManager, inputFile: string): Promise<DecomposeResult> {
    try {
      const inputSql = fileManager.readFile(inputFile);
      if (!inputSql) {
        throw new Error(`File ${inputFile} not found`);
      }

      const result = decomposeSQL(inputSql);
      
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

  async compose(fileManager: FileManager): Promise<ComposeResult> {
    try {
      const result = composeSQL(fileManager);
      
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