import { Request, Response } from 'express';
import { Logger } from '../utils/logging.js';

export class DebugApi {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  public handleDebugIntelliSense(req: Request, res: Response): void {
    try {
      const debugData = req.body;
      const timestamp = new Date().toISOString();
      this.logger.log(`[${timestamp}] IntelliSense Event: ${JSON.stringify(debugData, null, 2)}`);
      console.log('[DEBUG] IntelliSense log received:', debugData);
      res.json({ success: true, received: true });
    } catch (error) {
      this.logger.log(`[${new Date().toISOString()}] IntelliSense Debug Error: ${error}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}