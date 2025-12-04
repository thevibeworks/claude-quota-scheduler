# Claude Quota Scheduler - Product Requirements Document

```
                   ╔═══════════════════════════════════════════════╗
                   ║                                               ║
                   ║    claude-quota-scheduler                     ║
                   ║    ────────────────────────                   ║
                   ║    "Never waste a quota refresh again"        ║
                   ║                                               ║
                   ╚═══════════════════════════════════════════════╝
```

**Version**: 1.0.0
**Author**: Vibe Works
**Date**: 2025-12-04

---

## Executive Summary

Claude Code's 5-hour quota window creates a timing optimization problem: if you start using Claude "naturally" (when you sit down to work), your refresh cycles will desynchronize from your actual focus sessions, wasting quota capacity during critical hours.

**claude-quota-scheduler** solves this by automating "ghost pings" - minimal API calls that trigger the quota timer at optimal checkpoint times, ensuring fresh quota is available precisely when you need it.

---

## The Problem

```
WITHOUT SCHEDULER (Natural Usage):
──────────────────────────────────────────────────────────────────────

08:00   You wake up, coffee
10:00   Start work -> QUOTA STARTS
        |__________________________________ 5h window __|
11:00   [Deep Work]
12:00   [Deep Work] - using quota heavily
13:00   Lunch
14:00   Back to work <- Still in morning's window (nearly depleted)
15:00   QUOTA RESETS <- Interrupts your flow!
        |__________________________________ 5h window __|
16:00   [Work continues]
17:00   Done for day
...
21:00   Evening hack session <- Old window might still be active
        OR just expired (suboptimal)

RESULT: Quota resets happen MID-SESSION, interrupting flow
```

```
WITH SCHEDULER (Ghost Ping Strategy):
──────────────────────────────────────────────────────────────────────

09:00   [AUTO-PING] <- Triggers window BEFORE you start
        |__________________________________ 5h window __|
10:00   START FOCUS A <- Fresh 100% quota!
11:00   [Deep Work]
12:00   [Deep Work]
13:00   Lunch (quota regenerating)
14:00   [AUTO-PING] <- Triggers new window EXACTLY when Focus B starts
        |__________________________________ 5h window __|
14:00   START FOCUS B <- Fresh 100% quota!
15:00   [Deep Work]
16:00   [Deep Work]
17:00   Done
19:00   [AUTO-PING] <- Triggers window for evening session
        |__________________________________ 5h window __|
21:00   START FOCUS C <- Fresh 100% quota!
22:00   [Evening hacking]
23:00   [Evening hacking]

RESULT: Fresh quota at EVERY session start
```

---

## Design Philosophy

> "Simple things should be simple, complex things should be possible."
> — Alan Kay

### Core Principles

1. **Zero-Config Default**: Works out of the box with sensible defaults
2. **Infinite Customization**: Every parameter is overridable
3. **Multi-Account Native**: Built for teams and multiple personas
4. **Timezone-First**: The world is not UTC-centric
5. **Observable**: Know exactly what's happening and when
6. **Fun**: Because tooling should spark joy

---

## Feature Specification

### 1. Ghost Ping Engine

The core mechanism that triggers Claude's 5-hour quota timer.

```yaml
# Minimal request that triggers the timer
ghost_ping:
  method: "API call with minimal prompt"
  prompt: "ping" # or configurable
  model: "claude-sonnet-4-20250514" # cheapest sufficient model
  max_tokens: 5
  purpose: "Trigger 5h quota window start"
```

**Why it works**: Claude's quota system starts the 5-hour countdown when you send your _first_ message. By sending a trivial message at strategic times, we control _when_ the countdown begins.

### 2. Schedule Configuration

#### Simple Mode: Focus Sessions

```yaml
# Define your work patterns
focus_sessions:
  - name: "Morning Deep Work"
    start: "10:00"
    end: "12:00"

  - name: "Afternoon Grind"
    start: "14:00"
    end: "17:00"

  - name: "Night Owl"
    start: "21:00"
    end: "23:00"

# Scheduler auto-calculates optimal ping times
# Result: 09:00, 14:00, 19:00 (1h before sessions, or at session start)
```

#### Advanced Mode: Explicit Checkpoints

```yaml
# Direct control over ping times
checkpoints:
  - time: "09:00"
    accounts: ["primary", "work"]

  - time: "14:00"
    accounts: ["primary"]

  - time: "19:00"
    accounts: ["all"]
```

#### Expert Mode: Cron Expressions

```yaml
# Full cron control
schedule: "0 9,14,19 * * 1-5" # Weekdays only
schedule_weekend: "0 10,18 * * 0,6" # Different weekend pattern
```

### 3. Multi-Account Support

```yaml
accounts:
  primary:
    token_secret: "CLAUDE_OAUTH_PRIMARY"
    enabled: true

  work:
    token_secret: "CLAUDE_OAUTH_WORK"
    enabled: true
    schedule_override: "0 8,13,18 * * 1-5" # Different schedule

  side_project:
    token_secret: "CLAUDE_OAUTH_SIDE"
    enabled: false # Disabled but configured
```

Each account gets its own:

- OAuth token (stored in GitHub Secrets)
- Optional schedule override
- Enable/disable toggle
- Usage statistics

### 4. Timezone Intelligence

```yaml
timezone: "Asia/Shanghai"  # Your local timezone
# OR
timezone: "auto"  # Detect from runner (when possible)

# All times interpreted in specified timezone
# Cron expressions automatically converted
```

**Timezone Database**: Uses IANA timezone database via `Intl.DateTimeFormat`.

### 5. Notification System

```yaml
notifications:
  # GitHub Actions Summary (always on)
  summary: true

  # Slack webhook
  slack:
    webhook_secret: "SLACK_WEBHOOK"
    channel: "#claude-status"
    on_success: false # Don't spam on success
    on_failure: true

  # Discord webhook
  discord:
    webhook_secret: "DISCORD_WEBHOOK"
    on_success: true

  # Email (via SendGrid/Mailgun/etc)
  email:
    service: "sendgrid"
    api_key_secret: "SENDGRID_API_KEY"
    to: "you@example.com"
    on_failure: true

  # Custom webhook (POST request)
  webhook:
    url_secret: "CUSTOM_WEBHOOK_URL"
    on_success: true
    on_failure: true
```

### 6. Health Dashboard

Generated in GitHub Actions Summary:

```
╔═══════════════════════════════════════════════════════════════════╗
║               CLAUDE QUOTA SCHEDULER - STATUS REPORT              ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Timezone: Asia/Shanghai (UTC+8)                                  ║
║  Run Time: 2025-12-04 09:00:00 CST                               ║
║                                                                   ║
║  ┌─────────────┬────────────┬────────────┬───────────────────┐   ║
║  │ Account     │ Status     │ Ping Time  │ Next Window       │   ║
║  ├─────────────┼────────────┼────────────┼───────────────────┤   ║
║  │ primary     │ ✓ Success  │ 09:00:01   │ 09:00 - 14:00     │   ║
║  │ work        │ ✓ Success  │ 09:00:02   │ 09:00 - 14:00     │   ║
║  │ side_project│ ○ Skipped  │ --         │ (disabled)        │   ║
║  └─────────────┴────────────┴────────────┴───────────────────┘   ║
║                                                                   ║
║  Next scheduled runs:                                             ║
║    • 14:00 CST (in 5h 0m) - primary, work                        ║
║    • 19:00 CST (in 10h 0m) - primary, work                       ║
║                                                                   ║
║  Today's focus sessions:                                          ║
║    • 10:00-12:00: Morning Deep Work                              ║
║    • 14:00-17:00: Afternoon Grind                                ║
║    • 21:00-23:00: Night Owl                                      ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## Architecture

### System Components

```
┌──────────────────────────────────────────────────────────────────┐
│                     GitHub Actions Runner                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐      ┌─────────────────────────────────┐   │
│  │                 │      │                                 │   │
│  │   Schedule      │──────│    claude-quota-scheduler       │   │
│  │   Trigger       │      │    (GitHub Action)              │   │
│  │                 │      │                                 │   │
│  │  • cron         │      │  ┌───────────────────────────┐ │   │
│  │  • workflow_    │      │  │ Config Parser             │ │   │
│  │    dispatch     │      │  │ • YAML config             │ │   │
│  │  • repository_  │      │  │ • Environment vars        │ │   │
│  │    dispatch     │      │  │ • Timezone conversion     │ │   │
│  │                 │      │  └───────────────────────────┘ │   │
│  └─────────────────┘      │                                 │   │
│                           │  ┌───────────────────────────┐ │   │
│                           │  │ Account Manager           │ │   │
│                           │  │ • Multi-token handling    │ │   │
│                           │  │ • Parallel execution      │ │   │
│                           │  │ • Per-account settings    │ │   │
│                           │  └───────────────────────────┘ │   │
│                           │                                 │   │
│                           │  ┌───────────────────────────┐ │   │
│                           │  │ Ghost Ping Engine         │ │   │
│                           │  │ • Minimal API calls       │ │   │
│                           │  │ • Claude CLI wrapper      │ │   │
│                           │  │ • Error handling          │ │   │
│                           │  └───────────────────────────┘ │   │
│                           │                                 │   │
│                           │  ┌───────────────────────────┐ │   │
│                           │  │ Reporter                  │ │   │
│                           │  │ • Summary generation      │ │   │
│                           │  │ • Notification dispatch   │ │   │
│                           │  │ • Status artifacts        │ │   │
│                           │  └───────────────────────────┘ │   │
│                           │                                 │   │
│                           └─────────────────────────────────┘   │
│                                        │                         │
└────────────────────────────────────────│─────────────────────────┘
                                         │
                                         ▼
                           ┌─────────────────────────────┐
                           │                             │
                           │     Claude API / OAuth      │
                           │                             │
                           │  • Anthropic Direct         │
                           │  • AWS Bedrock              │
                           │  • Google Vertex            │
                           │                             │
                           └─────────────────────────────┘
```

### File Structure

```
claude-quota-scheduler/
├── action.yml                    # GitHub Action definition
├── src/
│   ├── index.ts                  # Main entrypoint
│   ├── config/
│   │   ├── parser.ts             # Config file parsing
│   │   ├── validator.ts          # Schema validation
│   │   ├── timezone.ts           # Timezone utilities
│   │   └── defaults.ts           # Default configurations
│   ├── accounts/
│   │   ├── manager.ts            # Multi-account orchestration
│   │   └── types.ts              # Account type definitions
│   ├── ping/
│   │   ├── engine.ts             # Ghost ping execution
│   │   ├── claude-cli.ts         # Claude CLI wrapper
│   │   └── providers.ts          # API/Bedrock/Vertex support
│   ├── notifications/
│   │   ├── dispatcher.ts         # Notification routing
│   │   ├── slack.ts              # Slack integration
│   │   ├── discord.ts            # Discord integration
│   │   └── webhook.ts            # Generic webhook
│   └── reporter/
│       ├── summary.ts            # GitHub summary generation
│       └── ascii-art.ts          # Fun ASCII art
├── configs/
│   ├── default.yml               # Default configuration
│   └── examples/
│       ├── simple.yml            # Minimal setup
│       ├── multi-account.yml     # Multiple accounts
│       ├── team.yml              # Team configuration
│       └── power-user.yml        # All features enabled
├── docs/
│   ├── PRD.md                    # This document
│   ├── SETUP.md                  # Setup guide
│   ├── CONFIGURATION.md          # Config reference
│   └── TROUBLESHOOTING.md        # Common issues
├── .github/
│   └── workflows/
│       ├── test.yml              # CI tests
│       └── scheduler-example.yml # Example workflow
├── package.json
├── bun.lock
├── tsconfig.json
├── CLAUDE.md                     # Claude Code context
├── README.md                     # Main documentation
└── LICENSE                       # MIT License
```

---

## Configuration Reference

### Full Schema

```yaml
# claude-quota-scheduler.yml
version: "1"

# Timezone for all time specifications
# Accepts IANA timezone names or "auto"
timezone: "America/New_York"

# Global settings
settings:
  # Prompt sent in ghost ping (minimal)
  ping_prompt: "ping"

  # Model to use (cheapest sufficient)
  model: "claude-sonnet-4-20250514"

  # Retry configuration
  retry:
    attempts: 3
    delay_ms: 5000
    backoff_multiplier: 2

  # Parallel execution for multiple accounts
  parallel: true

  # Dry run mode (log but don't ping)
  dry_run: false

# Account definitions
accounts:
  default:
    # GitHub Secret containing OAuth token
    token_secret: "CLAUDE_CODE_OAUTH_TOKEN"

    # Account-specific model override
    model: null # Use global setting

    # Enable/disable this account
    enabled: true

    # Schedule override (uses global if null)
    schedule: null

    # Custom ping prompt
    ping_prompt: null

# Schedule configuration (choose one approach)
schedule:
  # Approach 1: Focus sessions (recommended)
  focus_sessions:
    - name: "Morning"
      start: "10:00"
      end: "12:00"
      buffer_before: 60 # minutes before to ping

    - name: "Afternoon"
      start: "14:00"
      end: "17:00"
      buffer_before: 0 # ping exactly at start

    - name: "Evening"
      start: "21:00"
      end: "23:00"
      buffer_before: 120 # 2 hours before

  # Approach 2: Explicit checkpoints
  checkpoints:
    - time: "09:00"
      accounts: ["default"]

    - time: "14:00"
      accounts: ["default"]

    - time: "19:00"
      accounts: ["default"]

  # Approach 3: Cron expression
  cron: "0 9,14,19 * * *"

  # Weekend-specific schedule (optional)
  cron_weekend: "0 10,18 * * 0,6"

# Notification configuration
notifications:
  # GitHub Actions Summary (always enabled)
  summary:
    enabled: true
    style: "detailed" # "minimal" | "detailed" | "ascii-art"

  # Slack notifications
  slack:
    webhook_secret: "SLACK_WEBHOOK_URL"
    channel: "#claude-status"
    on_success: false
    on_failure: true
    mention_on_failure: "@channel"

  # Discord notifications
  discord:
    webhook_secret: "DISCORD_WEBHOOK_URL"
    on_success: true
    on_failure: true

  # Generic webhook (POST JSON)
  webhook:
    url_secret: "CUSTOM_WEBHOOK_URL"
    on_success: true
    on_failure: true
    include_details: true

# Advanced options
advanced:
  # Installation method for Claude CLI
  claude_install:
    method: "curl" # "curl" | "npm" | "skip"
    version: "latest"

  # Debug mode
  debug: false

  # Artifact retention
  artifacts:
    enabled: true
    retention_days: 7
```

---

## Usage Examples

### Example 1: Minimal Setup

```yaml
# .github/workflows/claude-quota.yml
name: Claude Quota Scheduler

on:
  schedule:
    - cron: "0 9,14,19 * * *" # Your optimal times
  workflow_dispatch:

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: thevibeworks/claude-quota-scheduler@v1
        with:
          oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          timezone: "Asia/Shanghai"
```

### Example 2: Multiple Accounts

```yaml
name: Claude Quota Scheduler (Multi-Account)

on:
  schedule:
    - cron: "0 9,14,19 * * *"
  workflow_dispatch:

jobs:
  refresh:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        account: [primary, work, personal]
    steps:
      - uses: thevibeworks/claude-quota-scheduler@v1
        with:
          account_name: ${{ matrix.account }}
          oauth_token: ${{ secrets[format('CLAUDE_OAUTH_{0}', matrix.account)] }}
          timezone: "America/New_York"
```

### Example 3: Config File Based

```yaml
name: Claude Quota Scheduler (Config File)

on:
  schedule:
    - cron: "0 * * * *" # Every hour (scheduler filters)
  workflow_dispatch:

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: thevibeworks/claude-quota-scheduler@v1
        with:
          config_file: ".github/claude-quota.yml"
        env:
          CLAUDE_OAUTH_PRIMARY: ${{ secrets.CLAUDE_OAUTH_PRIMARY }}
          CLAUDE_OAUTH_WORK: ${{ secrets.CLAUDE_OAUTH_WORK }}
```

### Example 4: Focus Sessions

```yaml
# .github/claude-quota.yml
timezone: "Europe/London"

schedule:
  focus_sessions:
    - name: "Early Bird"
      start: "06:00"
      end: "09:00"
      buffer_before: 30

    - name: "Core Hours"
      start: "10:00"
      end: "16:00"
      buffer_before: 0

    - name: "After Hours"
      start: "20:00"
      end: "23:00"
      buffer_before: 60
```

---

## Success Metrics

### Primary Metrics

| Metric               | Target | Measurement                                   |
| -------------------- | ------ | --------------------------------------------- |
| Quota Alignment Rate | >95%   | % of focus sessions starting with fresh quota |
| Ping Success Rate    | >99%   | % of scheduled pings completing successfully  |
| Latency              | <30s   | Time from schedule trigger to ping completion |

### Secondary Metrics

| Metric                 | Target      | Measurement                           |
| ---------------------- | ----------- | ------------------------------------- |
| User Adoption          | 1000+ stars | GitHub stars within 6 months          |
| Configuration Time     | <5min       | Time for new user to set up           |
| Documentation Coverage | 100%        | All features documented with examples |

---

## Roadmap

### v1.0 (Launch)

- [x] Core ghost ping engine
- [x] Multi-account support
- [x] Timezone handling
- [x] GitHub Actions integration
- [x] Basic notifications (summary, webhook)
- [x] Comprehensive documentation

### v1.1 (Polish)

- [ ] Slack/Discord native integrations
- [ ] Schedule calculator CLI tool
- [ ] Web-based schedule visualizer
- [ ] Usage analytics dashboard

### v2.0 (Advanced)

- [ ] Quota consumption tracking (if API allows)
- [ ] Predictive scheduling based on usage patterns
- [ ] Team workspace support
- [ ] Mobile app for schedule management

---

## Security Considerations

### Token Handling

- OAuth tokens stored in GitHub Secrets only
- Never logged or exposed in outputs
- Per-repository isolation
- Rotation recommendations documented

### Network Security

- All API calls over HTTPS
- No token forwarding to third parties
- Minimal permissions requested

### Audit Trail

- All pings logged in GitHub Actions
- Timestamp and account recorded
- Failure reasons captured

---

## Fun Elements

### ASCII Art Status

```
    ╭─────────────────────────────────────╮
    │  QUOTA SCHEDULER STATUS             │
    │  ═══════════════════════════════    │
    │                                      │
    │     ☕ Primary:    [████████  ] 80%  │
    │     💼 Work:       [██████████] 100% │
    │     🌙 Personal:   [disabled]        │
    │                                      │
    │  Next refresh in 2h 34m              │
    │                                      │
    │       ∧＿∧                           │
    │      ( ･ω･)  "Quota ready!"          │
    │      |つ🤖と|                         │
    │      ～( ＿_)                         │
    │                                      │
    ╰─────────────────────────────────────╯
```

### Motivational Messages

Random encouraging messages on successful pings:

- "Quota locked and loaded! Go build something amazing."
- "Your future self thanks you for this optimization."
- "5 hours of Claude power, ready to deploy."
- "The early bird gets the quota."

---

## Appendix

### A. Quota Mechanics Deep Dive

Claude Code Pro uses a **rolling 5-hour window** system:

1. **Window Start**: Triggered by first API call
2. **Capacity**: Fixed token budget per window
3. **Refresh**: New window available after 5 hours
4. **Stacking**: Windows do not stack; early ping = early refresh

**Key Insight**: The window starts on first _usage_, not on time. By controlling when the first usage happens, we control the entire schedule.

### B. Alternative Approaches Considered

| Approach            | Pros                      | Cons                       | Verdict      |
| ------------------- | ------------------------- | -------------------------- | ------------ |
| Manual reminders    | Zero infra                | Human error, annoying      | Rejected     |
| Local cron job      | Works offline             | Requires always-on machine | Rejected     |
| Serverless function | Minimal cost              | Extra infra, complexity    | Rejected     |
| GitHub Actions      | Free, reliable, auditable | Requires repo              | **Selected** |

### C. Why GitHub Actions?

1. **Free** for public repos, generous limits for private
2. **Reliable** scheduler with retry capabilities
3. **Auditable** complete history of all runs
4. **Extensible** easy to add notifications
5. **Familiar** most Claude users already use GitHub

---

_"The best tool is the one you actually use."_

```
     _____ _                 _        ___              _
    / ____| |               | |      / _ \            | |
   | |    | | __ _ _   _  __| | ___ | | | |_   _  ___ | |_ __ _
   | |    | |/ _` | | | |/ _` |/ _ \| | | | | | |/ _ \| __/ _` |
   | |____| | (_| | |_| | (_| |  __/| |_| | |_| | (_) | || (_| |
    \_____|_|\__,_|\__,_|\__,_|\___| \__\_\\__,_|\___/ \__\__,_|

   ____       _              _       _
  / ___|  ___| |__   ___  __| |_   _| | ___ _ __
  \___ \ / __| '_ \ / _ \/ _` | | | | |/ _ \ '__|
   ___) | (__| | | |  __/ (_| | |_| | |  __/ |
  |____/ \___|_| |_|\___|\__,_|\__,_|_|\___|_|

```
