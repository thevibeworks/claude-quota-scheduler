# CLAUDE.md

## Project Overview

**claude-quota-scheduler** - A thin wrapper around `anthropics/claude-code-action-base` that sends ghost pings to trigger Claude's 5-hour quota window at optimal times.

## Architecture

Pure composite action (no TypeScript):

```
action.yml
├── Start step     # Log account/timezone
├── Dry Run step   # Skip if dry_run=true
├── Ghost Ping     # -> anthropics/claude-code-action-base@beta
└── Result step    # Generate ASCII art summary
```

## Key Files

- `action.yml` - The entire action logic
- `README.md` - Usage docs
- `docs/PRD.md` - Product requirements

## How It Works

1. User schedules via cron
2. Action calls `claude-code-action-base` with minimal prompt
3. Base action handles Claude CLI install, auth, execution
4. We format the result as ASCII art summary

## Testing

```yaml
# Trigger manually with dry run
- uses: thevibeworks/claude-quota-scheduler@v1
  with:
    oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
    dry_run: "true"
```
