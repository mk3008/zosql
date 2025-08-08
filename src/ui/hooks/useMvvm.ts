/**
 * MVVM Binding Hook
 * UI Layer - React hook for ViewModel binding
 */

import { useEffect, useState, useRef } from 'react';
import { BaseViewModel } from '@ui/viewmodels/base-viewmodel';

/**
 * Hook to bind React component to ViewModel
 * @param viewModel - The ViewModel instance to bind to
 * @returns Force re-render function for property changes
 */
export function useMvvmBinding<T extends BaseViewModel>(viewModel: T): T {
  const [, forceUpdate] = useState({});
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to ViewModel changes
    unsubscribeRef.current = viewModel.subscribe(() => {
      // Force React re-render when ViewModel properties change
      forceUpdate({});
    });

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [viewModel]);

  return viewModel;
}

/**
 * Hook to create and manage ViewModel lifecycle
 * @param ViewModelClass - The ViewModel class to instantiate
 * @param deps - Dependencies that cause ViewModel recreation
 * @returns The ViewModel instance
 */
export function useViewModel<T extends BaseViewModel>(
  ViewModelClass: new (...args: unknown[]) => T
): T {
  const viewModelRef = useRef<T | null>(null);

  // Create ViewModel if not exists or dependencies changed
  if (!viewModelRef.current) {
    viewModelRef.current = new ViewModelClass();
  }

  // Use the binding hook
  const boundViewModel = useMvvmBinding(viewModelRef.current);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewModelRef.current) {
        viewModelRef.current.dispose();
      }
    };
  }, []);

  return boundViewModel;
}