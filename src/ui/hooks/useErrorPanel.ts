import { useState, useCallback } from 'react';
import { ErrorInfo } from '../components/ErrorPanel';

export const useErrorPanel = () => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);

  const addError = useCallback((message: string, details?: string, stack?: string) => {
    const newError: ErrorInfo = {
      id: `error-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      message,
      details,
      stack,
      type: 'error'
    };

    setErrors(prev => [...prev, newError]);
  }, []);

  const clearError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    errors,
    addError,
    clearError,
    clearAllErrors
  };
};