// layout-diagnostics.js - Layout measurement and diagnostics module

export class LayoutDiagnostics {
  constructor(logger) {
    this.logger = logger;
    this.measurements = new Map();
  }

  /**
   * Measure and log element dimensions
   */
  measureElement(selector, label) {
    const element = document.querySelector(selector);
    if (!element) {
      this.logger.warn(`Element not found for measurement: ${selector}`);
      return null;
    }

    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    
    const measurement = {
      selector,
      label,
      timestamp: Date.now(),
      dimensions: {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right
      },
      computed: {
        display: computedStyle.display,
        position: computedStyle.position,
        overflow: computedStyle.overflow,
        overflowX: computedStyle.overflowX,
        overflowY: computedStyle.overflowY,
        flex: computedStyle.flex,
        flexDirection: computedStyle.flexDirection,
        minHeight: computedStyle.minHeight,
        maxHeight: computedStyle.maxHeight,
        zIndex: computedStyle.zIndex
      },
      scroll: {
        scrollHeight: element.scrollHeight,
        scrollWidth: element.scrollWidth,
        scrollTop: element.scrollTop,
        scrollLeft: element.scrollLeft,
        clientHeight: element.clientHeight,
        clientWidth: element.clientWidth
      },
      visibility: {
        isVisible: rect.width > 0 && rect.height > 0,
        isInViewport: this.isInViewport(rect),
        hasOverflow: element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth
      }
    };

    this.measurements.set(label, measurement);
    this.logger.info(`Layout measurement: ${label}`, measurement);
    
    return measurement;
  }

  /**
   * Check if element is in viewport
   */
  isInViewport(rect) {
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * Measure all key layout elements
   */
  measureAllLayouts() {
    const keyElements = [
      { selector: 'body', label: 'body' },
      { selector: '.header', label: 'header' },
      { selector: '.main-container', label: 'main-container' },
      { selector: '.sidebar', label: 'left-sidebar' },
      { selector: '#workspace-panel', label: 'workspace-panel' },
      { selector: '.editor-panel', label: 'editor-panel' },
      { selector: '.monaco-editor-section', label: 'monaco-editor-section' },
      { selector: '.monaco-toolbar', label: 'monaco-toolbar' },
      { selector: '#left-monaco-editor', label: 'left-monaco-editor' },
      { selector: '.monaco-editor', label: 'monaco-editor-instance' },
      { selector: '.panel-results-container', label: 'results-container' }
    ];

    const results = {};
    keyElements.forEach(({ selector, label }) => {
      const measurement = this.measureElement(selector, label);
      if (measurement) {
        results[label] = measurement;
      }
    });

    // Calculate relative positions
    this.calculateRelativePositions(results);
    
    return results;
  }

  /**
   * Calculate relative positions between elements
   */
  calculateRelativePositions(measurements) {
    const bodyMeasure = measurements['body'];
    if (!bodyMeasure) return;

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    this.logger.info('Viewport dimensions', viewport);

    // Check for overlapping elements
    const overlaps = [];
    const keys = Object.keys(measurements);
    
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const elem1 = measurements[keys[i]];
        const elem2 = measurements[keys[j]];
        
        if (this.elementsOverlap(elem1.dimensions, elem2.dimensions)) {
          overlaps.push({
            element1: keys[i],
            element2: keys[j],
            overlap: this.calculateOverlap(elem1.dimensions, elem2.dimensions)
          });
        }
      }
    }

    if (overlaps.length > 0) {
      this.logger.warn('Overlapping elements detected', overlaps);
    }

    // Check for elements outside viewport
    const outsideViewport = [];
    Object.entries(measurements).forEach(([label, measurement]) => {
      if (!measurement.visibility.isInViewport) {
        outsideViewport.push({
          label,
          position: {
            top: measurement.dimensions.top,
            bottom: measurement.dimensions.bottom,
            outsideTop: measurement.dimensions.top < 0,
            outsideBottom: measurement.dimensions.bottom > viewport.height,
            outsideLeft: measurement.dimensions.left < 0,
            outsideRight: measurement.dimensions.right > viewport.width
          }
        });
      }
    });

    if (outsideViewport.length > 0) {
      this.logger.warn('Elements outside viewport', outsideViewport);
    }
  }

  /**
   * Check if two elements overlap
   */
  elementsOverlap(rect1, rect2) {
    return !(
      rect1.right < rect2.left ||
      rect1.left > rect2.right ||
      rect1.bottom < rect2.top ||
      rect1.top > rect2.bottom
    );
  }

  /**
   * Calculate overlap area between two elements
   */
  calculateOverlap(rect1, rect2) {
    const xOverlap = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left));
    const yOverlap = Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top));
    return {
      area: xOverlap * yOverlap,
      width: xOverlap,
      height: yOverlap
    };
  }

  /**
   * Monitor element for changes
   */
  monitorElement(selector, label, callback) {
    const element = document.querySelector(selector);
    if (!element) {
      this.logger.warn(`Cannot monitor: element not found ${selector}`);
      return;
    }

    const observer = new MutationObserver((mutations) => {
      const measurement = this.measureElement(selector, label);
      if (measurement && callback) {
        callback(measurement, mutations);
      }
    });

    observer.observe(element, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      childList: true,
      subtree: true
    });

    // Also monitor resize
    const resizeObserver = new ResizeObserver((entries) => {
      const measurement = this.measureElement(selector, label);
      this.logger.info(`Element resized: ${label}`, {
        oldSize: entries[0].contentRect,
        newMeasurement: measurement
      });
    });

    resizeObserver.observe(element);

    return { mutationObserver: observer, resizeObserver };
  }

  /**
   * Get summary report
   */
  getSummaryReport() {
    const measurements = Array.from(this.measurements.values());
    
    return {
      totalElements: measurements.length,
      visibleElements: measurements.filter(m => m.visibility.isVisible).length,
      elementsInViewport: measurements.filter(m => m.visibility.isInViewport).length,
      elementsWithOverflow: measurements.filter(m => m.visibility.hasOverflow).length,
      averageHeight: measurements.reduce((sum, m) => sum + m.dimensions.height, 0) / measurements.length,
      totalViewportUsage: {
        width: Math.max(...measurements.map(m => m.dimensions.right)),
        height: Math.max(...measurements.map(m => m.dimensions.bottom))
      }
    };
  }
}

// Export for global use
window.LayoutDiagnostics = LayoutDiagnostics;