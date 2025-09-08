# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Freedom is a TypeScript monorepo for automated Genshin Impact cloud gaming scripts using Puppeteer. The project uses pnpm workspaces with a modular architecture consisting of three main packages:

- `@freedom/core`: Browser automation foundation and game session management
- `@freedom/executor`: Script execution engine that orchestrates game actions
- `@freedom/scripts`: High-level game scripts and automation workflows

## Development Commands

**Package Manager**: This project uses pnpm exclusively. Install dependencies with `pnpm install`.

**Development**:
- `pnpm dev` - Start development mode for all packages in parallel
- `pnpm -r --filter='./packages/scripts' run dev` - Run specific package dev mode

**Build & Test**:
- `pnpm build` - Build all packages
- `pnpm typecheck` - Run TypeScript type checking across all packages
- `pnpm lint` - Run ESLint on all packages
- `pnpm fix` - Auto-fix ESLint issues

**Individual Package Development**:
- Scripts package entry point: `tsx packages/scripts/src/index.ts`
- Each package builds with `tsc` to `dist/` directory

## Architecture

**Core Module** (`@freedom/core`):
- `App` class manages Puppeteer browser lifecycle
- Connects to Genshin Impact cloud gaming at `https://ys.mihoyo.com/cloud/#/`
- Provides `Game` interface (extends Puppeteer Page) for game interactions
- Handles browser context creation and cookie management

**Executor Module** (`@freedom/executor`):
- Depends on `@freedom/core`
- Orchestrates script execution and game state management
- Provides execution framework for automated game actions

**Scripts Module** (`@freedom/scripts`):
- Highest-level module depending on both core and executor
- Contains game-specific automation scripts (login, start actions)
- Entry point demonstrates typical usage: launch browser → create game session → login → start automation

## Code Quality

- Uses `@antfu/eslint-config` for consistent code style
- Husky pre-commit hooks with lint-staged for automatic formatting
- Conventional commits enforced via commitlint
- TypeScript strict mode enabled across all packages

## Requirements

- Node.js ≥18.0.0
- pnpm ≥9.6.0
- Puppeteer automatically installs Chrome browser on core package installation
