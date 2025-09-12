// Global test setup
import { vi } from 'vitest';
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
// Mock console methods to avoid noise in test output
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
};
beforeAll(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    // Mock console methods if needed
    if (process.env.VITEST_SILENT) {
        console.log = vi.fn();
        console.warn = vi.fn();
        console.error = vi.fn();
        console.info = vi.fn();
    }
});
afterAll(() => {
    // Restore console methods
    if (process.env.VITEST_SILENT) {
        console.log = originalConsole.log;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;
        console.info = originalConsole.info;
    }
});
beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
});
afterEach(() => {
    // Clean up after each test
    vi.restoreAllMocks();
});
//# sourceMappingURL=setup.js.map