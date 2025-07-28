import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Global test setup
beforeEach(() => {
  // Reset any mocks or state before each test
  vi.clearAllMocks();
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};