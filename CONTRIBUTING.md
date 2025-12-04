# Contributing to Claude Quota Scheduler

Thanks for your interest in contributing! This document outlines how to get started.

## Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/thevibeworks/claude-quota-scheduler.git
   cd claude-quota-scheduler
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Run type checking:
   ```bash
   bun run typecheck
   ```

## Making Changes

1. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes, ensuring:
   - TypeScript types are correct (`bun run typecheck`)
   - Code is formatted (`bun run format`)
   - Tests pass (`bun test`)

3. Commit with a clear message:
   ```bash
   git commit -m "feat: add support for X"
   ```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure CI passes
4. Request review from maintainers

## Code Style

- Use TypeScript strict mode
- Follow existing patterns in the codebase
- Keep functions small and focused
- Add JSDoc comments for public APIs

## Commit Message Format

We follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code change that neither fixes nor adds
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

## Questions?

Open an issue or start a discussion. We're happy to help!
