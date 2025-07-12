import fs from 'fs';
import path from 'path';

export class Logger {
  private static instance: Logger;
  private logFile: string;
  private errorLogFile: string;
  private intelliSenseLogFile: string;
  private queryLogFile: string;

  private constructor() {
    this.logFile = path.join(process.cwd(), '.tmp', 'debug.log');
    this.errorLogFile = path.join(process.cwd(), '.tmp', 'error.log');
    this.intelliSenseLogFile = path.join(process.cwd(), '.tmp', 'intellisense.log');
    this.queryLogFile = path.join(process.cwd(), '.tmp', 'query.log');
    this.ensureLogDirectory();
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

  private writeToFile(filePath: string, message: string): void {
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
    this.writeToFile(this.logFile, message);
  }

  public error(message: string): void {
    this.writeToFile(this.errorLogFile, `[ERROR] ${message}`);
  }

  public intelliSense(message: string): void {
    this.writeToFile(this.intelliSenseLogFile, `[INTELLISENSE] ${message}`);
  }

  public query(message: string): void {
    this.writeToFile(this.queryLogFile, `[QUERY] ${message}`);
  }

  public info(message: string): void {
    this.writeToFile(this.logFile, `[INFO] ${message}`);
  }

  public warn(message: string): void {
    this.writeToFile(this.logFile, `[WARN] ${message}`);
  }

  public debug(message: string): void {
    this.writeToFile(this.logFile, `[DEBUG] ${message}`);
  }

  // Console replacement methods
  public static replaceConsole(): void {
    const logger = Logger.getInstance();
    
    // Store original console methods
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };

    // Replace console methods
    console.log = (...args: any[]) => {
      const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
      logger.log(`[CONSOLE.LOG] ${message}`);
    };

    console.error = (...args: any[]) => {
      const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
      logger.error(`[CONSOLE.ERROR] ${message}`);
    };

    console.warn = (...args: any[]) => {
      const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
      logger.warn(`[CONSOLE.WARN] ${message}`);
    };

    console.info = (...args: any[]) => {
      const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
      logger.info(`[CONSOLE.INFO] ${message}`);
    };

    // Store reference to original methods for potential restoration
    (console as any)._original = originalConsole;
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