/**
 * Debug Logger with Class-based Control
 * Controls logging verbosity by class/module
 */

interface LogConfig {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug';
}

class DebugLogger {
  private static configs: Map<string, LogConfig> = new Map();
  
  static configure(className: string, config: LogConfig) {
    this.configs.set(className, config);
  }
  
  static log(className: string, level: 'error' | 'warn' | 'info' | 'debug', message: string, ...args: unknown[]) {
    const config = this.configs.get(className);
    if (!config?.enabled) return;
    
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const configLevel = levels[config.level];
    const messageLevel = levels[level];
    
    if (messageLevel <= configLevel) {
      const prefix = `[${className}]`;
      switch (level) {
        case 'error':
          console.error(prefix, message, ...args);
          break;
        case 'warn':
          console.warn(prefix, message, ...args);
          break;
        case 'info':
          console.info(prefix, message, ...args);
          break;
        case 'debug':
          console.log(prefix, message, ...args);
          break;
      }
    }
  }
  
  static error(className: string, message: string, ...args: unknown[]) {
    this.log(className, 'error', message, ...args);
  }
  
  static warn(className: string, message: string, ...args: unknown[]) {
    this.log(className, 'warn', message, ...args);
  }
  
  static info(className: string, message: string, ...args: unknown[]) {
    this.log(className, 'info', message, ...args);
  }
  
  static debug(className: string, message: string, ...args: unknown[]) {
    this.log(className, 'debug', message, ...args);
  }
}

// Configuration for development
DebugLogger.configure('MainContentViewModel', { enabled: true, level: 'warn' });
DebugLogger.configure('WorkspaceEntity', { enabled: true, level: 'error' });
DebugLogger.configure('SqlModelsList', { enabled: false, level: 'error' });
DebugLogger.configure('LeftSidebar', { enabled: true, level: 'info' });
DebugLogger.configure('Layout', { enabled: true, level: 'debug' }); // Enable Layout logs for debugging
DebugLogger.configure('MainContentMvvm', { enabled: true, level: 'debug' }); // Enable MainContent logs for debugging
DebugLogger.configure('MonacoEditor', { enabled: false, level: 'error' }); // Disable noisy Monaco logs

export { DebugLogger };