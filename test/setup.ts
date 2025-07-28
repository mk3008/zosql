import '@testing-library/jest-dom';

// Mock ResizeObserver for tests
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock Monaco Editor worker for tests
interface MonacoEnvironment {
  getWorkerUrl: () => string;
}

(globalThis as unknown as { MonacoEnvironment: MonacoEnvironment }).MonacoEnvironment = {
  getWorkerUrl: () => '',
};
