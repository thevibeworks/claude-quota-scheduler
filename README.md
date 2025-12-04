# Claude Quota Scheduler

```
     _____ _                 _        ___              _
    / ____| |               | |      / _ \            | |
   | |    | | __ _ _   _  __| | ___ | | | |_   _  ___ | |_ __ _
   | |    | |/ _` | | | |/ _` |/ _ \| | | | | | |/ _ \| __/ _` |
   | |____| | (_| | |_| | (_| |  __/| |_| | |_| | (_) | || (_| |
    \_____|_|\__,_|\__,_|\__,_|\___| \__\_\\__,_|\___/ \__\__,_|

    ╔═══════════════════════════════════════════════════╗
    ║       "Never waste a quota refresh again"         ║
    ╚═══════════════════════════════════════════════════╝
```

Optimize your Claude Code quota with automated ghost pings. Built on [claude-code-action-base](https://github.com/anthropics/claude-code-action).

## The Problem

Claude Code uses a **5-hour rolling quota window** that starts when you send your first message. If you start working "naturally", your quota resets mid-session:

```
WITHOUT SCHEDULER:
10:00  Start work -> Quota window begins
15:00  QUOTA RESETS mid-session (interrupting flow!)

WITH SCHEDULER:
09:00  [AUTO-PING] -> Window starts before you work
10:00  Start work with FRESH 100% quota
14:00  [AUTO-PING] -> Fresh quota for afternoon
19:00  [AUTO-PING] -> Fresh quota for evening
```

## Quick Start

### 1. Add Secret

Settings → Secrets → Actions → `CLAUDE_CODE_OAUTH_TOKEN`

### 2. Create Workflow

```yaml
# .github/workflows/quota.yml
name: Quota Scheduler

on:
  schedule:
    - cron: "0 9,14,19 * * *"  # Your optimal times
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - uses: thevibeworks/claude-quota-scheduler@v1
        with:
          oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          timezone: "Asia/Shanghai"
```

### 3. Done!

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `oauth_token` | Claude OAuth token | - |
| `anthropic_api_key` | API key (alt auth) | - |
| `account_name` | Name for logs | `default` |
| `timezone` | IANA timezone | `UTC` |
| `ping_prompt` | What to send | `ping` |
| `model` | Model to use | `claude-sonnet-4-20250514` |
| `dry_run` | Log without ping | `false` |
| `summary_style` | `minimal`/`detailed`/`ascii-art` | `ascii-art` |
| `use_bedrock` | Use AWS Bedrock | `false` |
| `use_vertex` | Use Google Vertex | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `success` | Whether ping succeeded |
| `window_end` | Quota window end (ISO 8601) |
| `summary` | Human-readable result |

## Multi-Account

Use GitHub's matrix strategy:

```yaml
jobs:
  ping:
    strategy:
      fail-fast: false
      matrix:
        account: [primary, work, personal]
    steps:
      - uses: thevibeworks/claude-quota-scheduler@v1
        with:
          account_name: ${{ matrix.account }}
          oauth_token: ${{ secrets[format('CLAUDE_OAUTH_{0}', matrix.account)] }}
```

## Schedule Calculator

| Focus Session | Ping Time | Why |
|--------------|-----------|-----|
| 10:00-12:00 | 09:00 | 1h buffer |
| 14:00-17:00 | 14:00 | Exact start |
| 21:00-23:00 | 19:00 | 2h buffer |

**Formula**: `session_start - buffer` (buffer = 0-2h)

## How It Works

1. Sends minimal `"ping"` to Claude via [base-action](https://github.com/anthropics/claude-code-action)
2. Triggers the 5-hour quota window
3. Your focus sessions start with fresh quota

## Architecture

This action is a thin wrapper around `anthropics/claude-code-action-base`:

```
┌─────────────────────────────┐
│   claude-quota-scheduler    │
│   • Multi-account naming    │
│   • Timezone display        │
│   • ASCII art summary       │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  claude-code-action-base    │
│   • Claude CLI install      │
│   • Auth handling           │
│   • Execution & output      │
└─────────────────────────────┘
```

## License

MIT

---

Built by [Vibe Works](https://github.com/thevibeworks) | Powered by [claude-code-action-base](https://github.com/anthropics/claude-code-action)
