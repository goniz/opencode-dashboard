// Mock Next.js font imports for Jest testing
const createMockFont = (fontName) => jest.fn(() => ({
  style: {
    fontFamily: fontName,
  },
  className: `${fontName.toLowerCase()}-font`,
  variable: `--font-${fontName.toLowerCase()}`,
}))

module.exports = {
  __esModule: true,
  default: createMockFont('Default'),
  Geist: createMockFont('Geist'),
  Geist_Mono: createMockFont('Geist_Mono'),
  Inter: createMockFont('Inter'),
}