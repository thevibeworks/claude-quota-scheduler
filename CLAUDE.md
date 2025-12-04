# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**claude-quota-scheduler** is a GitHub Action that optimizes Claude Code quota usage by automating "ghost pings" - minimal API calls that trigger the 5-hour quota timer at strategic times.

## Architecture

```
src/
├── index.ts              # Main entry point
├── types.ts              # TypeScript type definitions
├── config/
│   ├── defaults.ts       # Default configuration values
│   ├── parser.ts         # Config file and input parsing
│   └── timezone.ts       # Timezone utilities
├── ping/
│   └── engine.ts         # Ghost ping execution logic
├── reporter/
│   └── summary.ts        # GitHub summary generation
└── notifications/
    └── dispatcher.ts     # Notification routing
```

## Development Commands

```bash
# Install dependencies
bun install

# Run locally
bun run src/index.ts

# Type checking
bun run typecheck

# Format code
bun run format

# Run tests
bun test
```

## Key Concepts

### Ghost Ping

A minimal API call (`"ping"`) that triggers Claude's 5-hour quota window. Uses the cheapest operation possible while still resetting the quota timer.

### Focus Sessions

User-defined work patterns that the scheduler uses to calculate optimal ping times. Each session has:

- `start`: When work begins
- `end`: When work ends
- `buffer_before`: How many minutes before session to ping

### Multi-Account Support

Supports unlimited accounts via:

- Direct `oauth_token` input
- JSON `oauth_tokens` object
- Environment variables matching `CLAUDE_OAUTH_*`
- Config file with `token_secret` references

## Environment Variables

- `INPUT_*`: Action inputs (set by GitHub Actions)
- `CLAUDE_OAUTH_*`: OAuth tokens for accounts
- `RUNNER_TEMP`: Temp directory for summaries
- `GITHUB_STEP_SUMMARY`: Path for GitHub summary

## Testing

When testing locally:

```bash
# Set required env vars
export INPUT_OAUTH_TOKEN="your-token"
export INPUT_TIMEZONE="UTC"
export INPUT_DRY_RUN="true"

# Run
bun run src/index.ts
```

## Code Style

- TypeScript strict mode
- Bun runtime
- No external test framework (use bun test)
- Minimal dependencies
