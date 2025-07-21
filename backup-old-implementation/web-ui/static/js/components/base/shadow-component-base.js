/**
 * Shadow Component Base Classes
 * 
 * Provides common functionality for all Shadow DOM components in the application.
 * This reduces code duplication and ensures consistent patterns across components.
 */

/**
 * Base class for Shadow DOM component logic
 */
export class ShadowComponentBase {
  constructor(shadowRoot, options = {}) {
    this.shadowRoot = shadowRoot;
    this.callbacks = new Map();
    this.state = {};
    this.config = { ...this.getDefaultConfig(), ...options };
    
    // Allow subclasses to do pre-init setup
    this.beforeInit();
    
    // Common initialization
    this.init();
  }

  // ============================================================
  // Hook methods for subclasses to override
  // ============================================================
  
  /**
   * Called before initialization - override for pre-init setup
   */
  beforeInit() {}
  
  /**
   * Get default configuration - override to provide defaults
   * @returns {Object} Default configuration object
   */
  getDefaultConfig() { 
    return {}; 
  }
  
  /**
   * Get component styles - override to provide CSS
   * @returns {string} CSS styles wrapped in <style> tags
   */
  getStyles() { 
    return ''; 
  }
  
  /**
   * Get component HTML content - override to provide markup
   * @returns {string} HTML content
   */
  renderContent() { 
    return ''; 
  }
  
  /**
   * Called after render completes - override for post-render setup
   */
  afterRender() {}
  
  /**
   * Get event prefix for CustomEvents - override to customize
   * @returns {string} Event prefix
   */
  getEventPrefix() { 
    return 'component'; 
  }
  
  /**
   * Get localStorage key for state persistence - override to customize
   * @returns {string} Storage key
   */
  getStateKey() { 
    return `${this.constructor.name.toLowerCase()}-state`; 
  }
  
  /**
   * Called after initialization - override for post-init setup
   */
  afterInit() {}
  
  /**
   * Called before destruction - override for cleanup
   */
  beforeDestroy() {}

  // ============================================================
  // Core functionality
  // ============================================================
  
  /**
   * Initialize the component
   */
  init() {
    this.loadState();
    this.render();
    this.setupEventListeners();
    this.afterInit();
    console.log(`[${this.constructor.name}] Initialized`);
  }

  /**
   * Render the component
   */
  render() {
    const html = `
      ${this.getStyles()}
      ${this.renderContent()}
    `;
    this.shadowRoot.innerHTML = html;
    this.afterRender();
  }

  // ============================================================
  // Event handling helpers
  // ============================================================
  
  /**
   * Setup event listeners - override in subclasses
   */
  setupEventListeners() {
    // Override in subclasses
  }

  /**
   * Add a click handler with event delegation
   * @param {string} selector - CSS selector
   * @param {Function} handler - Event handler function
   */
  addClickHandler(selector, handler) {
    this.shadowRoot.addEventListener('click', (e) => {
      const target = e.target.closest(selector);
      if (target) {
        handler.call(this, e, target);
      }
    });
  }

  /**
   * Add a change handler with event delegation
   * @param {string} selector - CSS selector
   * @param {Function} handler - Event handler function
   */
  addChangeHandler(selector, handler) {
    this.shadowRoot.addEventListener('change', (e) => {
      const target = e.target.closest(selector);
      if (target) {
        handler.call(this, e, target);
      }
    });
  }

  // ============================================================
  // Callback management
  // ============================================================
  
  /**
   * Register a callback for an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  onCallback(event, callback) {
    this.callbacks.set(event, callback);
  }

  /**
   * Trigger a callback and dispatch CustomEvent
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  triggerCallback(event, data = null) {
    const callback = this.callbacks.get(event);
    if (callback) {
      callback(data);
    }
    
    this.dispatchComponentEvent(event, data);
  }

  /**
   * Dispatch a component-specific CustomEvent
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  dispatchComponentEvent(event, data) {
    this.shadowRoot.host.dispatchEvent(new CustomEvent(`${this.getEventPrefix()}-${event}`, {
      detail: data,
      bubbles: true
    }));
  }

  // ============================================================
  // State management
  // ============================================================
  
  /**
   * Save component state to localStorage
   */
  saveState() {
    const state = this.getStateToPersist();
    if (state && Object.keys(state).length > 0) {
      try {
        localStorage.setItem(this.getStateKey(), JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to save state:', e);
      }
    }
  }

  /**
   * Load component state from localStorage
   */
  loadState() {
    try {
      const saved = localStorage.getItem(this.getStateKey());
      if (saved) {
        const state = JSON.parse(saved);
        this.applyPersistedState(state);
      }
    } catch (error) {
      console.warn(`Failed to load ${this.constructor.name} state:`, error);
    }
  }

  /**
   * Get state to persist - override to customize
   * @returns {Object} State to persist
   */
  getStateToPersist() {
    return this.state;
  }

  /**
   * Apply persisted state - override to customize
   * @param {Object} state - Persisted state
   */
  applyPersistedState(state) {
    Object.assign(this.state, state);
  }

  // ============================================================
  // DOM utilities
  // ============================================================
  
  /**
   * Query selector shorthand
   * @param {string} selector - CSS selector
   * @returns {Element} First matching element
   */
  $(selector) {
    return this.shadowRoot.querySelector(selector);
  }

  /**
   * Query selector all shorthand
   * @param {string} selector - CSS selector
   * @returns {NodeList} All matching elements
   */
  $$(selector) {
    return this.shadowRoot.querySelectorAll(selector);
  }

  /**
   * Get element by ID shorthand
   * @param {string} id - Element ID
   * @returns {Element} Element with ID
   */
  getElementById(id) {
    return this.shadowRoot.getElementById(id);
  }

  /**
   * Show toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (info, success, warning, error)
   * @param {number} duration - Duration in milliseconds
   */
  showToast(message, type = 'info', duration = 4000) {
    try {
      // Use global toast function if available
      if (typeof window.showToast === 'function') {
        return window.showToast(message, type, '', duration);
      }
      
      // Use specific toast functions
      if (type === 'success' && typeof window.showSuccessToast === 'function') {
        return window.showSuccessToast(message);
      }
      if (type === 'error' && typeof window.showErrorToast === 'function') {
        return window.showErrorToast(message);
      }
      if (type === 'warning' && typeof window.showWarningToast === 'function') {
        return window.showWarningToast(message);
      }
      if (type === 'info' && typeof window.showInfoToast === 'function') {
        return window.showInfoToast(message);
      }
      
      // Fallback: console log
      console.log(`[TOAST ${type.toUpperCase()}] ${message}`);
      return null;
      
    } catch (error) {
      console.error('[ShadowComponentBase] Error showing toast:', error);
      console.log(`[TOAST ${type.toUpperCase()}] ${message}`);
      return null;
    }
  }

  // ============================================================
  // Lifecycle
  // ============================================================
  
  /**
   * Destroy the component and cleanup
   */
  destroy() {
    this.beforeDestroy();
    this.callbacks.clear();
    this.state = {};
    console.log(`[${this.constructor.name}] Destroyed`);
  }
}

/**
 * Base class for Shadow DOM Web Component elements
 */
export class ShadowElementBase extends HTMLElement {
  /**
   * Get the component class - must be overridden
   * @returns {Function} Component class constructor
   */
  static get componentClass() {
    throw new Error('componentClass getter must be implemented');
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.component = null;
  }

  /**
   * Web Component lifecycle - element added to DOM
   */
  connectedCallback() {
    const ComponentClass = this.constructor.componentClass;
    const options = this.gatherOptions();
    this.component = new ComponentClass(this.shadowRoot, options);
    this.setupComponentCallbacks();
    this.exposeComponentAPI();
  }

  /**
   * Web Component lifecycle - element removed from DOM
   */
  disconnectedCallback() {
    if (this.component) {
      this.component.destroy();
      this.component = null;
    }
  }

  // ============================================================
  // Override these methods in subclasses
  // ============================================================
  
  /**
   * Gather options from attributes - override to customize
   * @returns {Object} Options object
   */
  gatherOptions() {
    return {};
  }

  /**
   * Setup component callbacks - override to customize
   */
  setupComponentCallbacks() {}

  /**
   * Expose component API methods - override to customize
   */
  exposeComponentAPI() {}

  // ============================================================
  // Attribute utilities
  // ============================================================
  
  /**
   * Get attribute value with default
   * @param {string} name - Attribute name
   * @param {*} defaultValue - Default value
   * @returns {string} Attribute value or default
   */
  getAttributeOrDefault(name, defaultValue) {
    return this.getAttribute(name) || defaultValue;
  }

  /**
   * Check if boolean attribute exists
   * @param {string} name - Attribute name
   * @returns {boolean} True if attribute exists
   */
  getBooleanAttribute(name) {
    return this.hasAttribute(name);
  }

  /**
   * Get numeric attribute value
   * @param {string} name - Attribute name
   * @param {number} defaultValue - Default value
   * @returns {number} Numeric value or default
   */
  getNumberAttribute(name, defaultValue = 0) {
    const value = this.getAttribute(name);
    return value ? parseFloat(value) : defaultValue;
  }

  /**
   * Expose a component method as element method
   * @param {string} methodName - Method name to expose
   */
  exposeMethod(methodName) {
    this[methodName] = (...args) => this.component?.[methodName](...args);
  }

  /**
   * Expose multiple component methods
   * @param {string[]} methodNames - Array of method names
   */
  exposeMethods(methodNames) {
    methodNames.forEach(method => this.exposeMethod(method));
  }
}

// Export for global access if needed
if (typeof window !== 'undefined') {
  window.ShadowComponentBase = ShadowComponentBase;
  window.ShadowElementBase = ShadowElementBase;
}