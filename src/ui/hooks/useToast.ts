/**
 * トースト通知管理のカスタムフック
 * UI Layer - React Hooks
 */

import { useState, useCallback } from 'react';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UseToastResult {
  toast: ToastMessage | null;
  showToast: (message: string, type?: ToastMessage['type']) => void;
  hideToast: () => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

export const useToast = (): UseToastResult => {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((
    message: string, 
    type: ToastMessage['type'] = 'info'
  ) => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success');
  }, [showToast]);

  const showError = useCallback((message: string) => {
    showToast(message, 'error');
  }, [showToast]);

  const showInfo = useCallback((message: string) => {
    showToast(message, 'info');
  }, [showToast]);

  return {
    toast,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showInfo
  };
};