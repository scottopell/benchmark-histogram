# CLAUDE.md - Agent Reference

## Commands
- Dev server: `pnpm run dev` (or `npm run dev`)
- Build: `pnpm run build` 
- TypeCheck: `pnpm run typecheck`
- Lint: `pnpm run lint`
- Preview production: `pnpm run preview`

## Code Style
- TypeScript with strict type checking (FunctionComponent<Props>)
- Functional React components with hooks
- Props interfaces defined separately (export interface Props {})
- 2-space indentation, semicolons required
- PascalCase for components/interfaces, camelCase for variables/functions
- Components structure: props → hooks → functions → JSX return
- Default exports for components, named exports for utilities
- Tailwind CSS for styling, combined with shadcn/ui components
- Use recharts for visualization components
- Apply proper error boundaries for component failures
- Prefer explicit typing over inference when appropriate
- Use context for shared state (VersionContext pattern)