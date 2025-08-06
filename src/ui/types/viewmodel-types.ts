/**
 * ViewModel Type Definitions
 * Strengthened type definitions for migration to React patterns
 */

/**
 * Generic ViewModel interface for type safety
 */
export interface IViewModel {
  /**
   * Subscribe to property changes
   */
  subscribe(callback: PropertyChangeCallback): () => void;
  
  /**
   * Dispose resources
   */
  dispose(): void;
}

/**
 * Property change notification callback
 */
export type PropertyChangeCallback = (propertyName: string, value: unknown) => void;

/**
 * ViewModel with loading state
 */
export interface ILoadableViewModel extends IViewModel {
  readonly isLoading: boolean;
  readonly error: string | null;
}

/**
 * ViewModel with data management
 */
export interface IDataViewModel<T> extends ILoadableViewModel {
  readonly data: T | null;
  loadData(): Promise<void>;
  clearData(): void;
}

/**
 * Form ViewModel interface
 */
export interface IFormViewModel<T> extends IViewModel {
  readonly formData: T;
  readonly isValid: boolean;
  readonly validationErrors: Record<string, string>;
  
  updateField<K extends keyof T>(field: K, value: T[K]): void;
  validate(): boolean;
  submit(): Promise<void>;
  reset(): void;
}

/**
 * List ViewModel interface
 */
export interface IListViewModel<T> extends ILoadableViewModel {
  readonly items: readonly T[];
  readonly selectedItem: T | null;
  readonly selectedItems: readonly T[];
  
  selectItem(item: T): void;
  selectItems(items: T[]): void;
  clearSelection(): void;
  refresh(): Promise<void>;
}

/**
 * Dialog ViewModel interface
 */
export interface IDialogViewModel<TResult = void> extends IViewModel {
  readonly isOpen: boolean;
  readonly canConfirm: boolean;
  
  open(): void;
  close(): void;
  confirm(): Promise<TResult>;
  cancel(): void;
}

/**
 * Editor ViewModel interface
 */
export interface IEditorViewModel extends IViewModel {
  readonly content: string;
  readonly isDirty: boolean;
  readonly canSave: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  
  setContent(content: string): void;
  save(): Promise<void>;
  undo(): void;
  redo(): void;
  format(): Promise<void>;
}