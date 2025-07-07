#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { CLI } from './cli';
import { FileManager } from './file-manager';

function printUsage() {
  console.log(`
zosql - SQL decomposition and composition tool

Usage:
  zosql decompose <input.sql> [output-dir]  Decompose SQL into CTE files
  zosql compose <input-dir> [output.sql]    Compose CTE files back to SQL
  zosql --help                               Show this help

Examples:
  zosql decompose complex.sql ./cte-files/
  zosql compose ./cte-files/ result.sql
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
    const outputDir = args[2] || './decomposed/';
    
    if (!inputFile) {
      console.error('Error: Input SQL file is required');
      printUsage();
      process.exit(1);
    }

    if (!existsSync(inputFile)) {
      console.error(`Error: File ${inputFile} not found`);
      process.exit(1);
    }

    try {
      // ファイルを読み込み
      const sqlContent = readFileSync(inputFile, 'utf8');
      const fileManager = new FileManager();
      fileManager.writeFile(inputFile, sqlContent);

      // 分解実行
      const result = await cli.decompose(fileManager, inputFile);
      
      if (!result.success) {
        console.error('Error: Failed to decompose SQL');
        process.exit(1);
      }

      // 出力ディレクトリ作成
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // ファイル出力
      for (const fileName of result.outputFiles) {
        const content = result.fileManager.readFile(fileName);
        if (content) {
          const outputPath = join(outputDir, fileName);
          writeFileSync(outputPath, content, 'utf8');
          console.log(`Created: ${outputPath}`);
        }
      }

      console.log(`\nSuccessfully decomposed ${inputFile} into ${result.outputFiles.length} files in ${outputDir}`);
      
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

  } else if (command === 'compose') {
    console.log('Compose functionality - coming soon!');
    // TODO: Implement compose from file system
    
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