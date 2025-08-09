import React, { useEffect } from 'react';
import * as Result from '../../lib/functional/result.js';
import { 
  EventHandlers, 
  Render, 
  A11y 
} from '../../lib/functional/ui-patterns.js';
import {
  ToastConfig,
  validateToastProps,
  toastStylesFunc,
  getToastIconFunc
} from '../../lib/functional/toast-utils.js';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  duration = 3000,
  onClose 
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  }[type];

  const icon = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  }[type];

  return (
    <div 
      className={`
        fixed bottom-4 right-4 z-[9999]
        flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg
        ${bgColor} text-white
        animate-slide-in-bottom
      `}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-white/80 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
};

// ===== FUNCTIONAL VERSIONS - BACKWARD COMPATIBLE =====


/**
 * Functional Toast component with enhanced features
 */
export const ToastFunc: React.FC<ToastConfig & { onClose: () => void }> = (props) => {
  const validationResult = validateToastProps(props);
  const safeCloseHandler = EventHandlers.safe(props.onClose || (() => {}));
  
  useEffect(() => {
    if (Result.isOk(validationResult)) {
      const validProps = validationResult.value;
      if (validProps.isVisible && validProps.duration > 0) {
        const timer = setTimeout(safeCloseHandler, validProps.duration);
        return () => clearTimeout(timer);
      }
    }
  }, [validationResult, safeCloseHandler]);
  
  if (Result.isErr(validationResult)) {
    console.error('Toast validation errors:', validationResult.error);
    return null;
  }

  const validProps = validationResult.value;

  return Render.when(
    validProps.isVisible !== false,
    <div 
      className={toastStylesFunc(validProps.type, validProps.position)}
      role="alert"
      aria-live="polite"
      {...A11y.loading(false)}
    >
      <span className="text-lg" aria-hidden="true">
        {getToastIconFunc(validProps.type)}
      </span>
      <span className="text-sm font-medium">
        {validProps.message}
      </span>
      {Render.when(
        props.closable !== false,
        <button
          onClick={EventHandlers.preventDefault(safeCloseHandler)}
          className="ml-2 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20 rounded"
          aria-label="Close notification"
          type="button"
        >
          ✕
        </button>
      )}
    </div>
  );
};

