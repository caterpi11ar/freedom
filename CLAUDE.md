# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Freedom is a TypeScript monorepo for automated Genshin Impact cloud gaming scripts. The project is currently in active development with a sophisticated CLI interface implemented but core automation functionality still under development. The architecture follows a pnpm workspace structure with plans for browser automation using Playwright.

## Development Commands

**Package Manager**: This project uses pnpm exclusively. Install dependencies with `pnpm install`.

**Development**:
- `pnpm dev` - Start development mode for all packages in parallel
- `pnpm -r --filter='./packages/cli' run dev` - Run CLI package in development mode with tsx
- `tsx packages/cli/src/index.ts` - Direct CLI execution for testing

**Build & Test**:
- `pnpm build` - Build all packages using TypeScript composite builds
- `pnpm typecheck` - Run TypeScript type checking across all packages
- `pnpm lint:fix` - Auto-fix ESLint issues across the monorepo
- `pnpm test` / `pnpm test:ci` - Run Vitest tests

**CLI Package Development**:
- CLI entry point: `packages/cli/src/index.ts`
- Binary creation: `node packages/cli/scripts/create-bin.js`
- Interactive mode launches when no arguments provided

## Architecture

**Current Implementation Status**:
The project is transitional - while 7 packages are defined, only 2 are currently implemented:

**Active Packages**:
- `@freedom/cli`: Fully functional interactive command-line interface with 11 slash commands
- `@freedom/shared`: Global state management with comprehensive TypeScript definitions

**Planned Packages** (currently empty directories):
- `@freedom/core`: Browser automation and game session management
- `@freedom/executor`: Script execution engine
- `@freedom/logger`: Logging infrastructure
- `@freedom/storage`: Data persistence layer
- `@freedom/webhook`: Webhook functionality

**CLI Architecture**:
The CLI package (`@freedom/cli`) is the most mature component featuring:
- Interactive mode with real-time state-aware prompts
- Commander.js-based command system with slash command syntax
- Event-driven state management integration
- Custom readline interface with state subscriptions
- Comprehensive error handling and user feedback

**State Management**:
Centralized in `@freedom/shared` with:
- EventEmitter-based global store (`packages/shared/src/store/index.ts`)
- Comprehensive TypeScript interfaces for all application states
- Real-time state updates with listener subscriptions
- Automatic periodic tasks (uptime tracking, health monitoring)

**TypeScript Configuration**:
- Uses composite builds with project references for efficient incremental compilation
- Base configuration in `tsconfig.base.json` with strict type checking
- Path mapping configured for internal package dependencies
- ES2022 target with ES module format

## Code Quality

- Uses `@antfu/eslint-config` with minimal customization
- Husky pre-commit hooks with lint-staged for automatic formatting
- Conventional commits enforced via commitlint
- TypeScript strict mode enabled across all packages

## Development Rules

### Code Quality Checks
- **Must execute after every code modification**:
  - `pnpm lint:fix` - Auto-fix ESLint issues
  - `pnpm typecheck` - Pass TypeScript type checking
- Code modifications are only considered complete when both commands execute successfully without errors
- Code with lint errors or type errors must not be committed

### Language Standards
- **Strictly prohibit direct use of JavaScript**:
  - All new files must use TypeScript (.ts/.tsx)
  - Creation of .js files is not allowed
  - Existing .js files should be gradually migrated to TypeScript
  - Ensure all code has complete type definitions

## Key Implementation Details

**CLI Command System**:
Commands are defined in `packages/cli/src/commands/` with each command as a separate module. The main CLI supports both direct command execution and interactive mode with persistent state.

**State Bridge Pattern**:
`packages/cli/src/state/bridge.ts` provides integration between CLI and global state, enabling real-time prompt updates based on application state changes.

**Configuration Management**:
Configuration is managed through the global state system with type-safe interfaces defined in `packages/shared/src/types/config.ts`.

**Browser Automation** (Planned):
The project plans to use Playwright for browser automation but the logic is not yet implemented. The architecture anticipates browser automation in the core package.

## Development Notes

**Missing Core Functionality**:
The project currently lacks its primary functionality (browser automation, script execution) despite having a fully functional CLI interface. Core development should focus on implementing the browser automation logic and script execution engine.

**Testing Infrastructure**:
Vitest is configured but no test files exist. Testing should be implemented alongside core functionality development.

**Package Dependencies**:
Current packages have minimal cross-dependencies. The CLI package will need to import from core packages once they're implemented.

## Requirements

- Node.js ≥18.0.0
- pnpm ≥9.6.0
- Playwright will auto-install browsers when core package is implemented
