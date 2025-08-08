/**
 * Editor Context utility functions
 * Extracted for React Fast Refresh compatibility
 */

import * as Option from './option.js';

/**
 * Editor operation types
 */
export interface EditorOperation {
  type: 'insert' | 'delete' | 'replace';
  position: { lineNumber: number; column: number };
  text?: string;
  range?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  timestamp: Date;
}

/**
 * Editor state helpers
 */
export const EditorContextUtils = {
  /**
   * Create editor operation
   */
  createOperation: (
    type: EditorOperation['type'],
    position: EditorOperation['position'],
    text?: string,
    range?: EditorOperation['range']
  ): EditorOperation => ({
    type,
    position,
    text,
    range,
    timestamp: new Date()
  }),

  /**
   * Validate cursor position
   */
  isValidPosition: (position: { lineNumber: number; column: number } | null): boolean => {
    if (!position) return false;
    return position.lineNumber > 0 && position.column > 0;
  },

  /**
   * Get position from option
   */
  getPositionOption: (position: { lineNumber: number; column: number } | null): Option.Option<{ lineNumber: number; column: number }> =>
    EditorContextUtils.isValidPosition(position) ? Option.some(position!) : Option.none,

  /**
   * Calculate line count from content
   */
  getLineCount: (content: string | null): number => {
    if (!content) return 0;
    return content.split('\n').length;
  },

  /**
   * Get content preview (first line)
   */
  getContentPreview: (content: string | null, maxLength: number = 50): string => {
    if (!content) return '';
    const firstLine = content.split('\n')[0];
    return firstLine.length > maxLength 
      ? `${firstLine.substring(0, maxLength)}...`
      : firstLine;
  }
};

/**
 * Default editor context values
 */
export const createDefaultEditorState = () => ({
  editorRef: Option.none,
  content: Option.none,
  lastOperation: Option.none,
  operationHistory: [],
  cursorPosition: Option.none,
  isReady: false
});