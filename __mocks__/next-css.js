// Mock CSS imports and exports for Jest testing
const mockCss = {
  __esModule: true,
  default: {},
};

// Support both CommonJS and ESM
if (typeof module !== 'undefined' && module.exports) {
  module.exports = mockCss;
}

if (typeof exports !== 'undefined') {
  Object.assign(exports, mockCss);
  // Prevent "exports is not defined" errors
  if (typeof global !== 'undefined') {
    global.exports = exports;
  }
}