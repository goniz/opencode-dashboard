# Agent Guidelines for opencode-dashboard

## Build/Test/Lint Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Code Style Guidelines
- **Framework**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS v4 with utility classes
- **Imports**: Use `import type` for type-only imports, absolute imports with `@/*` alias
- **Components**: Export default function components with PascalCase names
- **Props**: Use `Readonly<{}>` wrapper for component props with children
- **Types**: Strict TypeScript enabled, use proper type annotations
- **Formatting**: Use double quotes, semicolons, 2-space indentation
- **CSS**: Prefer Tailwind utility classes over custom CSS
- **Images**: Use Next.js `Image` component with proper alt text and dimensions
- **Metadata**: Export `metadata` object for page-level SEO
- **Fonts**: Use Next.js font optimization (Geist fonts configured)
- **Error Handling**: Follow Next.js patterns for error boundaries and loading states

## Project Structure
- `src/app/` - App Router pages and layouts
- `public/` - Static assets
- TypeScript strict mode enabled with path aliases configured