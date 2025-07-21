// logger.js - Client-side logging utility

export class Logger {
  constructor() {
    this.isEnabled = true;
  }

  async logToServer(message, data = null) {
    if (!this.isEnabled) return;
    
    const logData = {
      message: message,
      timestamp: new Date().toISOString(),
      data: data
    };
    
    try {
      await fetch('/api/debug-intellisense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logData)
      });
    } catch (err) {
      console.error('Failed to log to server:', err);
    }
  }

  info(message, data = null) {
    console.log(`[INFO] ${message}`, data);
    this.logToServer(message, data);
  }

  warn(message, data = null) {
    console.warn(`[WARN] ${message}`, data);
    this.logToServer(message, data);
  }

  error(message, data = null) {
    console.error(`[ERROR] ${message}`, data);
    this.logToServer(message, data);
  }

  debug(message, data = null) {
    console.debug(`[DEBUG] ${message}`, data);
    this.logToServer(message, data);
  }
}