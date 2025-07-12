import { Request, Response } from 'express';
import { Logger } from '../utils/logging.js';

export interface IntelliSenseDebugLog {
  timestamp: string;
  phase: string;
  data: any;
  error?: string;
}

export class IntelliSenseDebugApi {
  private logger: Logger;
  private debugLogs: IntelliSenseDebugLog[] = [];

  constructor() {
    this.logger = Logger.getInstance();
  }

  public async handleDebugLog(req: Request, res: Response): Promise<void> {
    try {
      const { phase, data, error } = req.body;
      
      const debugLog: IntelliSenseDebugLog = {
        timestamp: new Date().toISOString(),
        phase,
        data,
        error
      };

      this.debugLogs.push(debugLog);
      
      // Keep only last 100 logs to prevent memory issues
      if (this.debugLogs.length > 100) {
        this.debugLogs = this.debugLogs.slice(-100);
      }

      this.logger.intelliSense(`${phase}: ${JSON.stringify(data)}`);
      
      if (error) {
        this.logger.intelliSense(`Error in ${phase}: ${error}`);
      }

      res.json({ success: true });
    } catch (error) {
      this.logger.error(`[INTELLISENSE-DEBUG] API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async handleGetDebugLogs(req: Request, res: Response): Promise<void> {
    try {
      const { phase, limit = 50 } = req.query;
      
      let filteredLogs = this.debugLogs;
      
      if (phase && typeof phase === 'string') {
        filteredLogs = this.debugLogs.filter(log => log.phase === phase);
      }
      
      // Return latest logs
      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      const recentLogs = filteredLogs.slice(-limitNum);

      res.json({
        success: true,
        logs: recentLogs,
        totalCount: filteredLogs.length,
        availablePhases: [...new Set(this.debugLogs.map(log => log.phase))]
      });
    } catch (error) {
      this.logger.error(`[INTELLISENSE-DEBUG] Get logs error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async handleAnalyzeLogs(_req: Request, res: Response): Promise<void> {
    try {
      const analysis = this.analyzeIntelliSenseIssues();
      
      res.json({
        success: true,
        analysis
      });
    } catch (error) {
      this.logger.error(`[INTELLISENSE-DEBUG] Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private analyzeIntelliSenseIssues(): any {
    const recentLogs = this.debugLogs.slice(-20); // Analyze last 20 logs
    
    const analysis = {
      totalLogs: recentLogs.length,
      phases: {} as Record<string, number>,
      commonIssues: [] as string[],
      successfulAliasDetections: 0,
      failedAliasDetections: 0,
      sqlParseSuccesses: 0,
      sqlParseFailures: 0,
      columnResolutionSuccesses: 0,
      columnResolutionFailures: 0,
      suggestions: [] as string[]
    };

    recentLogs.forEach(log => {
      // Count phases
      analysis.phases[log.phase] = (analysis.phases[log.phase] || 0) + 1;

      // Analyze specific issues
      if (log.phase === 'ALIAS_DETECTION') {
        if (log.data?.result) {
          analysis.successfulAliasDetections++;
        } else {
          analysis.failedAliasDetections++;
          if (log.data?.textBeforeCursor?.includes('.')) {
            analysis.commonIssues.push('Alias detection failed despite dot in text');
          }
        }
      }

      if (log.phase === 'SQL_PARSING') {
        if (log.data?.success) {
          analysis.sqlParseSuccesses++;
        } else {
          analysis.sqlParseFailures++;
          analysis.commonIssues.push(`SQL parse error: ${log.data?.error || 'Unknown'}`);
        }
      }

      if (log.phase === 'COLUMN_RESOLUTION') {
        if (log.data?.columns?.length > 0) {
          analysis.columnResolutionSuccesses++;
        } else {
          analysis.columnResolutionFailures++;
          analysis.commonIssues.push(`No columns found for table: ${log.data?.tableName || 'Unknown'}`);
        }
      }

      if (log.error) {
        analysis.commonIssues.push(`${log.phase} error: ${log.error}`);
      }
    });

    // Generate suggestions
    if (analysis.failedAliasDetections > 0) {
      analysis.suggestions.push('Check alias extraction logic - extractAliasFromText function may have issues');
    }
    
    if (analysis.sqlParseFailures > 0) {
      analysis.suggestions.push('SQL parsing is failing - check rawsql-ts integration');
    }
    
    if (analysis.columnResolutionFailures > 0) {
      analysis.suggestions.push('Column resolution failing - check schema data loading and table name mapping');
    }

    if (analysis.phases['ALIAS_DETECTION'] && !analysis.phases['SQL_PARSING']) {
      analysis.suggestions.push('Alias detection working but SQL parsing not reached - check flow logic');
    }

    return analysis;
  }

  public clearLogs(): void {
    this.debugLogs = [];
    this.logger.intelliSense('Debug logs cleared');
  }
}