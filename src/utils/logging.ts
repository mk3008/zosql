import fs from 'fs';
import path from 'path';

type OriginalConsole = {
  log: typeof console.log;
  error: typeof console.error;
  warn: typeof console.warn;
  info: typeof console.info;
};

export interface LoggerConfig {
  enabled: boolean;
  console: boolean;
  intellisense: boolean;
  query: boolean;
  debug: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export class Logger {
  private static instance: Logger;
  private logFile: string;
  private errorLogFile: string;
  private intelliSenseLogFile: string;
  private queryLogFile: string;
  private config: LoggerConfig;

  private constructor() {
    this.logFile = path.join(process.cwd(), '.tmp', 'debug.log');
    this.errorLogFile = path.join(process.cwd(), '.tmp', 'error.log');
    this.intelliSenseLogFile = path.join(process.cwd(), '.tmp', 'intellisense.log');
    this.queryLogFile = path.join(process.cwd(), '.tmp', 'query.log');
    this.config = this.loadConfig();
    this.ensureLogDirectory();
  }

  private loadConfig(): LoggerConfig {
    // Default configuration
    const defaultConfig: LoggerConfig = {
      enabled: true,
      console: true,
      intellisense: true,
      query: true,
      debug: true,
      logLevel: 'debug'
    };

    // Try to load from environment variables
    const envConfig: Partial<LoggerConfig> = {
      enabled: process.env.ZOSQL_LOG_ENABLED !== 'false',
      console: process.env.ZOSQL_LOG_CONSOLE !== 'false',
      intellisense: process.env.ZOSQL_LOG_INTELLISENSE !== 'false',
      query: process.env.ZOSQL_LOG_QUERY !== 'false',
      debug: process.env.ZOSQL_LOG_DEBUG !== 'false',
      logLevel: (process.env.ZOSQL_LOG_LEVEL as LoggerConfig['logLevel']) || 'debug'
    };

    // Try to load from config file
    let fileConfig: Partial<LoggerConfig> = {};
    try {
      const configPath = path.join(process.cwd(), 'zosql.config.json');
      if (fs.existsSync(configPath)) {
        const configFile = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        fileConfig = configFile.logging || {};
      }
    } catch (error) {
      // Config file parsing failed, use defaults
    }

    // Merge configurations (env vars override file config, file config overrides defaults)
    return {
      ...defaultConfig,
      ...fileConfig,
      ...envConfig
    };
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private ensureLogDirectory(): void {
    const logDir = path.join(process.cwd(), '.tmp');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  public clearLog(): void {
    try {
      fs.writeFileSync(this.logFile, '');
      fs.writeFileSync(this.errorLogFile, '');
      fs.writeFileSync(this.intelliSenseLogFile, '');
      fs.writeFileSync(this.queryLogFile, '');
      this.writeToFile(this.logFile, '[LOG] All debug log files cleared');
    } catch (error) {
      this.writeToFile(this.errorLogFile, `Failed to clear log files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private shouldLog(logType: 'debug' | 'info' | 'warn' | 'error' | 'intellisense' | 'query' | 'console'): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Check specific log type
    switch (logType) {
      case 'intellisense':
        return this.config.intellisense;
      case 'query':
        return this.config.query;
      case 'console':
        return this.config.console;
      default:
        break;
    }

    // Check log level
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageIndex = levels.indexOf(logType as 'debug' | 'info' | 'warn' | 'error');
    
    return messageIndex >= currentLevelIndex;
  }

  private writeToFile(filePath: string, message: string, logType: 'debug' | 'info' | 'warn' | 'error' | 'intellisense' | 'query' | 'console' = 'debug'): void {
    if (!this.shouldLog(logType)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    try {
      fs.appendFileSync(filePath, logMessage);
    } catch (error) {
      // Fallback to error log if main log fails
      if (filePath !== this.errorLogFile) {
        try {
          fs.appendFileSync(this.errorLogFile, `[${timestamp}] Failed to write to ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        } catch (fallbackError) {
          // Last resort: create a timestamped error file
          const errorFile = path.join(process.cwd(), '.tmp', `error-${Date.now()}.log`);
          fs.appendFileSync(errorFile, `[${timestamp}] Critical logging error: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}\n`);
        }
      }
    }
  }

  public log(message: string): void {
    this.writeToFile(this.logFile, message, 'debug');
  }

  public error(message: string): void {
    this.writeToFile(this.errorLogFile, `[ERROR] ${message}`, 'error');
  }

  public intelliSense(message: string): void {
    this.writeToFile(this.intelliSenseLogFile, `[INTELLISENSE] ${message}`, 'intellisense');
  }

  public query(message: string): void {
    this.writeToFile(this.queryLogFile, `[QUERY] ${message}`, 'query');
  }

  public info(message: string): void {
    this.writeToFile(this.logFile, `[INFO] ${message}`, 'info');
  }

  public warn(message: string): void {
    this.writeToFile(this.logFile, `[WARN] ${message}`, 'warn');
  }

  public debug(message: string): void {
    this.writeToFile(this.logFile, `[DEBUG] ${message}`, 'debug');
  }

  // Console replacement methods
  public static replaceConsole(): void {
    const logger = Logger.getInstance();
    
    // Don't replace if console logging is disabled
    if (!logger.config.console) {
      return;
    }
    
    // Store original console methods
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };

    // Replace console methods
    console.log = (...args: unknown[]) => {
      const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
      logger.writeToFile(logger.logFile, `[CONSOLE.LOG] ${message}`, 'console');
    };

    console.error = (...args: unknown[]) => {
      const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
      logger.writeToFile(logger.errorLogFile, `[CONSOLE.ERROR] ${message}`, 'console');
    };

    console.warn = (...args: unknown[]) => {
      const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
      logger.writeToFile(logger.logFile, `[CONSOLE.WARN] ${message}`, 'console');
    };

    console.info = (...args: unknown[]) => {
      const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
      logger.writeToFile(logger.logFile, `[CONSOLE.INFO] ${message}`, 'console');
    };

    // Store reference to original methods for potential restoration
    (console as unknown as { _original: OriginalConsole })._original = originalConsole;
  }

  public static restoreConsole(): void {
    if ((console as unknown as { _original?: OriginalConsole })._original) {
      const original = (console as unknown as { _original: OriginalConsole })._original;
      console.log = original.log;
      console.error = original.error;
      console.warn = original.warn;
      console.info = original.info;
      delete (console as unknown as { _original?: OriginalConsole })._original;
    }
  }

  public updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Re-apply console replacement if needed
    if (newConfig.console !== undefined) {
      if (newConfig.console) {
        Logger.replaceConsole();
      } else {
        Logger.restoreConsole();
      }
    }
  }

  public getConfig(): LoggerConfig {
    return { ...this.config };
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public getLogFilePaths(): { [key: string]: string } {
    return {
      debug: this.logFile,
      error: this.errorLogFile,
      intellisense: this.intelliSenseLogFile,
      query: this.queryLogFile
    };
  }
}