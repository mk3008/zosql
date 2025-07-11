#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { CLI } from './cli.js';
import { FileManager } from './file-manager.js';

function printUsage() {
  console.log(`
zosql - SQL decomposition and composition tool

Usage:
  zosql decompose <input.sql> <group> <feature>  Decompose SQL into zosql/develop format
  zosql recompose <main.sql-path>                 Recompose when CTE is added
  zosql compose <develop-path> <original-path>    Compose back to original SQL
  zosql --help                                    Show this help

Examples:
  zosql decompose complex.sql reports monthly_sales
  zosql recompose /zosql/develop/reports/monthly_sales.sql/main.sql
  zosql compose /zosql/develop/reports/monthly_sales.sql /sql/reports/monthly_sales.sql
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
    printUsage();
    return;
  }

  const command = args[0];
  const cli = new CLI();

  if (command === 'decompose') {
    const inputFile = args[1];
    const group = args[2];
    const feature = args[3];
    
    if (!inputFile || !group || !feature) {
      console.error('Error: Input SQL file, group, and feature are required');
      printUsage();
      process.exit(1);
    }

    if (!existsSync(inputFile)) {
      console.error(`Error: File ${inputFile} not found`);
      process.exit(1);
    }

    try {
      // 出力パスを構築
      const outputPath = `/zosql/develop/${group}/${feature}.sql`;
      
      // ファイルを読み込み
      const sqlContent = readFileSync(inputFile, 'utf8');
      const fileManager = new FileManager();
      fileManager.writeFile(inputFile, sqlContent);

      // 分解実行
      const result = await cli.decompose(fileManager, inputFile, outputPath);
      
      if (!result.success) {
        console.error('Error: Failed to decompose SQL');
        process.exit(1);
      }

      // 出力ディレクトリ作成
      const outputDir = `zosql/develop/${group}/${feature}.sql`;
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      
      const cteDir = `${outputDir}/cte`;
      if (!existsSync(cteDir)) {
        mkdirSync(cteDir, { recursive: true });
      }

      // ファイル出力
      for (const fileName of result.outputFiles) {
        const content = result.fileManager.readFile(fileName);
        if (content) {
          const outputPath = fileName.replace(/^\/zosql\//, 'zosql/');
          writeFileSync(outputPath, content, 'utf8');
          console.log(`Created: ${outputPath}`);
        }
      }

      console.log(`\nSuccessfully decomposed ${inputFile} into ${result.outputFiles.length} files in ${outputDir}`);
      
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
      process.exit(1);
    }

  } else if (command === 'recompose') {
    const mainSqlPath = args[1];
    
    if (!mainSqlPath) {
      console.error('Error: main.sql path is required');
      printUsage();
      process.exit(1);
    }

    if (!existsSync(mainSqlPath)) {
      console.error(`Error: File ${mainSqlPath} not found`);
      process.exit(1);
    }

    try {
      // ファイルを読み込み
      const sqlContent = readFileSync(mainSqlPath, 'utf8');
      const fileManager = new FileManager();
      fileManager.writeFile(mainSqlPath, sqlContent);

      // 再分解実行
      const result = await cli.recompose(fileManager, mainSqlPath);
      
      if (!result.success) {
        console.error('Error: Failed to recompose SQL');
        process.exit(1);
      }

      // 出力ディレクトリ取得
      const outputDir = mainSqlPath.replace('/main.sql', '');
      const cteDir = `${outputDir}/cte`;
      if (!existsSync(cteDir)) {
        mkdirSync(cteDir, { recursive: true });
      }

      // ファイル出力
      for (const fileName of result.outputFiles) {
        const content = result.fileManager.readFile(fileName);
        if (content) {
          const outputPath = fileName.replace(/^\/zosql\//, '');
          writeFileSync(outputPath, content, 'utf8');
          console.log(`Updated: ${outputPath}`);
        }
      }

      console.log(`\nSuccessfully recomposed ${mainSqlPath}`);
      
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

  } else if (command === 'compose') {
    const developPath = args[1];
    const originalPath = args[2];
    
    if (!developPath || !originalPath) {
      console.error('Error: Develop path and original path are required');
      printUsage();
      process.exit(1);
    }

    if (!existsSync(developPath)) {
      console.error(`Error: Directory ${developPath} not found`);
      process.exit(1);
    }

    try {
      // ディレクトリからファイルを読み込み
      const fileManager = new FileManager();
      const fs = await import('fs');
      
      // main.sqlを読み込み
      const mainSqlPath = join(developPath, 'main.sql');
      if (existsSync(mainSqlPath)) {
        const content = readFileSync(mainSqlPath, 'utf8');
        fileManager.writeFile(`${developPath}/main.sql`, content);
      }
      
      // cteディレクトリからCTEファイルを読み込み
      const cteDir = join(developPath, 'cte');
      if (existsSync(cteDir)) {
        const cteFiles = fs.readdirSync(cteDir);
        for (const file of cteFiles) {
          if (file.endsWith('.sql')) {
            const filePath = join(cteDir, file);
            const content = readFileSync(filePath, 'utf8');
            fileManager.writeFile(`${developPath}/cte/${file}`, content);
          }
        }
      }

      // 合成実行
      const result = await cli.compose(fileManager, developPath, originalPath);
      
      if (!result.success) {
        console.error('Error: Failed to compose SQL');
        process.exit(1);
      }

      // 結果を出力ファイルに書き込み
      writeFileSync(originalPath, result.sql, 'utf8');
      console.log(`Successfully composed SQL files from ${developPath} into ${originalPath}`);
      
      // developフォルダのクリーンアップ（将来実装）
      // TODO: compose時にdevelopフォルダをクリーンアップする機能
      
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    
  } else {
    console.error(`Error: Unknown command '${command}'`);
    printUsage();
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}