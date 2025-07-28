// Mock Next.js font imports for Jest testing
const createMockFont = (fontName) => {
  const mockFn = jest.fn(() => ({
    style: {
      fontFamily: fontName,
    },
    className: `${fontName.toLowerCase()}-font`,
    variable: `--font-${fontName.toLowerCase()}`,
  }));
  
  // Add properties for static access
  mockFn.style = { fontFamily: fontName };
  mockFn.className = `${fontName.toLowerCase()}-font`;
  mockFn.variable = `--font-${fontName.toLowerCase()}`;
  
  return mockFn;
};

const mockExports = {
  __esModule: true,
  default: createMockFont('Default'),
  Geist: createMockFont('Geist'),
  Geist_Mono: createMockFont('Geist_Mono'),
  Inter: createMockFont('Inter'),
};

// Support both CommonJS and ESM
if (typeof module !== 'undefined' && module.exports) {
  module.exports = mockExports;
}

if (typeof exports !== 'undefined') {
  Object.assign(exports, mockExports);
}