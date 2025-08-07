# Agent Guidelines for opencode-dashboard

## Build/Test/Lint Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- Python tests: `uv run pytest tests/` - Run all tests
- Single test: `uv run pytest tests/test_specific_file.py` - Run specific test file
- Single test function: `uv run pytest tests/test_file.py::test_function_name` - Run specific test
- Test with coverage: `uv run pytest --cov=tests` - Run tests with coverage report

## Code Style Guidelines
- **Framework**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS v4 with utility classes
- **Imports**: Use `import type` for type-only imports, absolute imports with `@/*` alias
- **Components**: Export default function components with PascalCase names, use "use client" directive for client components
- **Props**: Use `Readonly<{}>` wrapper for component props with children, define interfaces for props
- **Types**: Strict TypeScript enabled, use proper type annotations
- **Formatting**: Use double quotes, semicolons, 2-space indentation
- **CSS**: Prefer Tailwind utility classes over custom CSS
- **Images**: Use Next.js `Image` component with proper alt text and dimensions
- **Metadata**: Export `metadata` object for page-level SEO
- **Fonts**: Use Next.js font optimization (Geist fonts configured)
- **Error Handling**: Follow Next.js patterns for error boundaries and loading states
- **State Management**: Use React hooks (useState, useEffect) and context providers
- **API Routes**: Use Next.js App Router API routes in `src/app/api/`

## Project Structure
- `src/app/` - App Router pages and layouts with API routes
- `src/components/` - Reusable React components
- `src/contexts/` - React context providers
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and shared logic
- `public/` - Static assets
- TypeScript strict mode enabled with path aliases configured

## CI/CD Guidelines
- **Test Matrix**: The CI workflow uses a matrix strategy to run each test file individually
- **Adding/Removing Test Files**: When adding or removing test files in `tests/test_*.py`, update the matrix in `.github/workflows/ci.yml` to include/exclude the new test file name
- **Matrix Location**: Update the `strategy.matrix.test-file` array in the `test` job

## Additional Notes
- No Cursor or Copilot rules found in the repository.
- Python API tests use pytest with httpx for testing Next.js API routes
- Test files located in `tests/` directory with `test_*.py` naming convention
