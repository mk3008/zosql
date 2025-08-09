/**
 * Functional Error Panel State Management
 * Pure functions for error panel state and behavior
 */

import * as Option from './option.js';

/**
 * Error panel position
 */
export interface PanelPosition {
  x: number;
  y: number;
}

/**
 * Drag state
 */
export interface DragState {
  isDragging: boolean;
  offset: { x: number; y: number };
}

/**
 * Error panel state
 */
export interface ErrorPanelState {
  isExpanded: boolean;
  selectedErrorId: Option.Option<string>;
  position: PanelPosition;
  dragState: DragState;
}

/**
 * Error panel actions
 */
export type ErrorPanelAction =
  | { type: 'EXPAND_PANEL' }
  | { type: 'COLLAPSE_PANEL' }
  | { type: 'SELECT_ERROR'; payload: { errorId: string } }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'START_DRAG'; payload: { offset: { x: number; y: number } } }
  | { type: 'UPDATE_POSITION'; payload: { position: PanelPosition } }
  | { type: 'STOP_DRAG' };

/**
 * Create initial error panel state
 */
export const createInitialErrorPanelState = (): ErrorPanelState => ({
  isExpanded: false,
  selectedErrorId: Option.none,
  position: { 
    x: typeof window !== 'undefined' ? window.innerWidth - 420 : 400, 
    y: typeof window !== 'undefined' ? window.innerHeight - 120 : 100 
  },
  dragState: {
    isDragging: false,
    offset: { x: 0, y: 0 }
  }
});

/**
 * Error panel state reducer
 */
export const errorPanelReducer = (
  state: ErrorPanelState, 
  action: ErrorPanelAction
): ErrorPanelState => {
  switch (action.type) {
    case 'EXPAND_PANEL':
      return {
        ...state,
        isExpanded: true
      };

    case 'COLLAPSE_PANEL':
      return {
        ...state,
        isExpanded: false
      };

    case 'SELECT_ERROR':
      return {
        ...state,
        selectedErrorId: Option.some(action.payload.errorId)
      };

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedErrorId: Option.none
      };

    case 'START_DRAG':
      return {
        ...state,
        dragState: {
          isDragging: true,
          offset: action.payload.offset
        }
      };

    case 'UPDATE_POSITION':
      return {
        ...state,
        position: action.payload.position
      };

    case 'STOP_DRAG':
      return {
        ...state,
        dragState: {
          ...state.dragState,
          isDragging: false
        }
      };

    default:
      return state;
  }
};

/**
 * Action creators
 */
export const ErrorPanelActions = {
  expandPanel: (): ErrorPanelAction => ({ type: 'EXPAND_PANEL' }),
  collapsePanel: (): ErrorPanelAction => ({ type: 'COLLAPSE_PANEL' }),
  selectError: (errorId: string): ErrorPanelAction => ({ 
    type: 'SELECT_ERROR', 
    payload: { errorId } 
  }),
  clearSelection: (): ErrorPanelAction => ({ type: 'CLEAR_SELECTION' }),
  startDrag: (offset: { x: number; y: number }): ErrorPanelAction => ({ 
    type: 'START_DRAG', 
    payload: { offset } 
  }),
  updatePosition: (position: PanelPosition): ErrorPanelAction => ({ 
    type: 'UPDATE_POSITION', 
    payload: { position } 
  }),
  stopDrag: (): ErrorPanelAction => ({ type: 'STOP_DRAG' })
};

/**
 * Selectors
 */
export const ErrorPanelSelectors = {
  isExpanded: (state: ErrorPanelState): boolean => state.isExpanded,
  
  getSelectedErrorId: (state: ErrorPanelState): Option.Option<string> => 
    state.selectedErrorId,
  
  getPosition: (state: ErrorPanelState): PanelPosition => state.position,
  
  isDragging: (state: ErrorPanelState): boolean => state.dragState.isDragging,
  
  getDragOffset: (state: ErrorPanelState): { x: number; y: number } => 
    state.dragState.offset
};

/**
 * Panel positioning utilities
 */
export const PanelPositioning = {
  /**
   * Constrain position to viewport bounds
   */
  constrainToViewport: (
    position: PanelPosition, 
    panelSize: { width: number; height: number }
  ): PanelPosition => {
    const viewport = {
      width: typeof window !== 'undefined' ? window.innerWidth : 1920,
      height: typeof window !== 'undefined' ? window.innerHeight : 1080
    };

    return {
      x: Math.max(0, Math.min(position.x, viewport.width - panelSize.width)),
      y: Math.max(0, Math.min(position.y, viewport.height - panelSize.height))
    };
  },

  /**
   * Calculate new position from mouse event
   */
  calculatePosition: (
    mouseX: number,
    mouseY: number,
    dragOffset: { x: number; y: number }
  ): PanelPosition => ({
    x: mouseX - dragOffset.x,
    y: mouseY - dragOffset.y
  }),

  /**
   * Calculate drag offset from mouse down event
   */
  calculateDragOffset: (
    mouseX: number,
    mouseY: number,
    currentPosition: PanelPosition
  ): { x: number; y: number } => ({
    x: mouseX - currentPosition.x,
    y: mouseY - currentPosition.y
  })
};

/**
 * Error filtering and sorting utilities
 */
export const ErrorUtils = {
  /**
   * Filter errors by type
   */
  filterByType: <T extends { type: string }>(errors: T[], type: string): T[] =>
    errors.filter(error => error.type === type),

  /**
   * Sort errors by timestamp (newest first)
   */
  sortByTimestamp: <T extends { timestamp: Date }>(errors: T[]): T[] =>
    [...errors].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),

  /**
   * Find error by ID
   */
  findById: <T extends { id: string }>(errors: T[], id: string): Option.Option<T> => {
    const found = errors.find(error => error.id === id);
    return Option.fromNullable(found);
  },

  /**
   * Group errors by type
   */
  groupByType: <T extends { type: string }>(errors: T[]): Record<string, T[]> =>
    errors.reduce((groups, error) => {
      const type = error.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(error);
      return groups;
    }, {} as Record<string, T[]>),

  /**
   * Get error statistics
   */
  getStatistics: <T extends { type: string; timestamp: Date }>(errors: T[]) => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const grouped = ErrorUtils.groupByType(errors);
    const recent = errors.filter(error => error.timestamp >= oneHourAgo);
    
    return {
      total: errors.length,
      byType: Object.fromEntries(
        Object.entries(grouped).map(([type, errs]) => [type, errs.length])
      ),
      recentCount: recent.length,
      oldestTimestamp: errors.length > 0 ? 
        Math.min(...errors.map(e => e.timestamp.getTime())) : 
        null,
      newestTimestamp: errors.length > 0 ? 
        Math.max(...errors.map(e => e.timestamp.getTime())) : 
        null
    };
  }
};

/**
 * Error panel event handlers
 */
export const ErrorPanelEventHandlers = {
  /**
   * Create mouse down handler for drag start
   */
  createMouseDownHandler: (
    currentPosition: PanelPosition,
    onStartDrag: (offset: { x: number; y: number }) => void
  ) => (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('.panel-header')) {
      event.preventDefault();
      const offset = PanelPositioning.calculateDragOffset(
        event.clientX,
        event.clientY,
        currentPosition
      );
      onStartDrag(offset);
    }
  },

  /**
   * Create mouse move handler for dragging
   */
  createMouseMoveHandler: (
    isDragging: boolean,
    dragOffset: { x: number; y: number },
    onUpdatePosition: (position: PanelPosition) => void
  ) => (event: MouseEvent) => {
    if (isDragging) {
      event.preventDefault();
      const newPosition = PanelPositioning.calculatePosition(
        event.clientX,
        event.clientY,
        dragOffset
      );
      const constrainedPosition = PanelPositioning.constrainToViewport(
        newPosition,
        { width: 400, height: 500 }
      );
      onUpdatePosition(constrainedPosition);
    }
  },

  /**
   * Create mouse up handler for drag end
   */
  createMouseUpHandler: (
    isDragging: boolean,
    onStopDrag: () => void
  ) => (event: MouseEvent) => {
    if (isDragging) {
      event.preventDefault();
      onStopDrag();
    }
  }
};

/**
 * Auto-expansion behavior
 */
export const AutoExpansionBehavior = {
  /**
   * Check if panel should auto-expand
   */
  shouldAutoExpand: (
    newErrorCount: number,
    previousErrorCount: number,
    isCurrentlyExpanded: boolean
  ): boolean => 
    newErrorCount > previousErrorCount && !isCurrentlyExpanded,

  /**
   * Get the most recent error ID for auto-selection
   */
  getMostRecentErrorId: <T extends { id: string; timestamp: Date }>(errors: T[]): Option.Option<string> => {
    if (errors.length === 0) {
      return Option.none;
    }
    
    const sorted = ErrorUtils.sortByTimestamp(errors);
    return Option.some(sorted[0].id);
  }
};