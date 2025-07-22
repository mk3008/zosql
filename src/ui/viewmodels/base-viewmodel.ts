/**
 * Base ViewModel class implementing MVVM pattern
 * UI Layer - Foundation for all ViewModels
 */

export type PropertyChangeCallback = (propertyName: string, value: any) => void;

/**
 * Base class for all ViewModels providing change notification
 */
export abstract class BaseViewModel {
  private _listeners: PropertyChangeCallback[] = [];
  
  /**
   * Subscribe to property changes
   * @param callback - Function called when any property changes
   * @returns Unsubscribe function
   */
  subscribe(callback: PropertyChangeCallback): () => void {
    this._listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this._listeners.indexOf(callback);
      if (index !== -1) {
        this._listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Notify all listeners of property change
   * @param propertyName - Name of the changed property
   * @param value - New value of the property
   */
  protected notifyChange(propertyName: string, value?: any): void {
    this._listeners.forEach(callback => callback(propertyName, value));
  }
  
  /**
   * Dispose of the ViewModel and clean up resources
   */
  dispose(): void {
    this._listeners.length = 0;
  }
}