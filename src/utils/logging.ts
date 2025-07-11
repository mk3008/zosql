import fs from 'fs';
import path from 'path';

export class Logger {
  private static instance: Logger;
  private logFile: string;

  private constructor() {
    this.logFile = path.join(process.cwd(), '.tmp', 'debug.log');
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
      console.log('[LOG] Debug log file cleared');
    } catch (error) {
      console.error('Failed to clear log file:', error);
    }
  }

  public log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    try {
      fs.appendFileSync(this.logFile, logMessage);
      console.log(`[LOG] ${message}`);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
}