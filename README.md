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

Optimize your Claude Code quota with automated ghost pings. Ensure fresh quota is available precisely when your focus sessions begin.

## The Problem

Claude Code Pro uses a **5-hour rolling quota window** that starts when you send your first message. If you rely on "natural" usage, your refresh cycles will desynchronize from your actual work schedule:

```
WITHOUT SCHEDULER:
10:00  Start work -> Quota window begins
15:00  QUOTA RESETS mid-session (interrupting flow!)
20:00  Evening session uses leftover quota
```

```
WITH SCHEDULER:
09:00  [AUTO-PING] -> Window starts before you work
10:00  Start work with FRESH 100% quota
14:00  [AUTO-PING] -> New window for afternoon
14:00  Afternoon session with FRESH 100% quota
19:00  [AUTO-PING] -> New window for evening
21:00  Evening session with FRESH 100% quota
```

## Quick Start

### 1. Add Secret

Go to your repository Settings → Secrets → Actions and add:

- `CLAUDE_CODE_OAUTH_TOKEN`: Your Claude Code OAuth token

### 2. Create Workflow

Create `.github/workflows/claude-quota.yml`:

```yaml
name: Claude Quota Scheduler

on:
  schedule:
    # Adjust times to your timezone and focus sessions
    - cron: "0 9,14,19 * * *"
  workflow_dispatch:

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: thevibeworks/claude-quota-scheduler@v1
        with:
          oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          timezone: "America/New_York"
```

### 3. Done!

Your quota will now refresh at optimal times.

## Features

- **Zero Config Default**: Works out of the box with sensible defaults
- **Multi-Account Support**: Manage unlimited Claude accounts
- **Timezone-Aware**: Works with any IANA timezone
- **Focus Sessions**: Define your work patterns, auto-calculate ping times
- **Notifications**: Slack, Discord, or custom webhooks
- **Fun**: ASCII art status reports and motivational messages

## Usage Examples

### Basic (Single Account)

```yaml
- uses: thevibeworks/claude-quota-scheduler@v1
  with:
    oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
    timezone: "Asia/Shanghai"
```

### Multiple Accounts (Matrix Strategy)

```yaml
jobs:
  refresh:
    strategy:
      matrix:
        account: [primary, work, personal]
    steps:
      - uses: thevibeworks/claude-quota-scheduler@v1
        with:
          account_name: ${{ matrix.account }}
          oauth_token: ${{ secrets[format('CLAUDE_OAUTH_{0}', matrix.account)] }}
```

### Config File Based

```yaml
- uses: actions/checkout@v4
- uses: thevibeworks/claude-quota-scheduler@v1
  with:
    config_file: ".github/claude-quota.yml"
  env:
    CLAUDE_OAUTH_PRIMARY: ${{ secrets.CLAUDE_OAUTH_PRIMARY }}
```

See [configs/examples/](./configs/examples/) for configuration templates.

## Inputs

| Input                  | Description                           | Default                    |
| ---------------------- | ------------------------------------- | -------------------------- |
| `oauth_token`          | Claude OAuth token                    | -                          |
| `oauth_tokens`         | JSON object of account→token mappings | -                          |
| `config_file`          | Path to YAML config file              | -                          |
| `timezone`             | IANA timezone name                    | `UTC`                      |
| `ping_prompt`          | Prompt to send                        | `ping`                     |
| `model`                | Claude model to use                   | `claude-sonnet-4-20250514` |
| `accounts`             | Comma-separated account names         | `default`                  |
| `account_name`         | Single account name (for matrix)      | -                          |
| `dry_run`              | Log without pinging                   | `false`                    |
| `debug`                | Enable debug logging                  | `false`                    |
| `summary_style`        | `minimal`, `detailed`, or `ascii-art` | `detailed`                 |
| `notification_webhook` | Webhook URL for notifications         | -                          |

## Outputs

| Output            | Description                             |
| ----------------- | --------------------------------------- |
| `success`         | Whether all pings succeeded             |
| `accounts_pinged` | JSON array of successful accounts       |
| `accounts_failed` | JSON array of failed accounts           |
| `next_windows`    | JSON object of account→window end times |
| `summary`         | Human-readable summary                  |

## Schedule Calculator

Use this table to calculate your optimal ping times:

| Focus Session | Ping Time | Why                                     |
| ------------- | --------- | --------------------------------------- |
| 10:00-12:00   | 09:00     | 1h buffer, ensures fresh quota at start |
| 14:00-17:00   | 14:00     | Reset exactly at session start          |
| 21:00-23:00   | 19:00     | 2h buffer for evening session           |

**Rule of thumb**: Ping at `session_start - buffer` where buffer is 0-2 hours depending on how critical fresh quota is.

## Config File Reference

```yaml
version: "1"
timezone: "America/New_York"

settings:
  ping_prompt: "ping"
  model: "claude-sonnet-4-20250514"
  parallel: true
  retry:
    attempts: 3
    delay_ms: 5000

accounts:
  primary:
    token_secret: "CLAUDE_OAUTH_PRIMARY"
    enabled: true

  work:
    token_secret: "CLAUDE_OAUTH_WORK"
    enabled: true

schedule:
  focus_sessions:
    - name: "Morning"
      start: "10:00"
      end: "12:00"
      buffer_before: 60

notifications:
  slack:
    webhook_secret: "SLACK_WEBHOOK"
    on_failure: true
```

## How It Works

1. **Ghost Ping**: Sends a minimal prompt (`"ping"`) to Claude
2. **Timer Trigger**: This triggers Claude's 5-hour quota window
3. **Window Alignment**: By controlling when the ping happens, you control when your quota refreshes
4. **Fresh Start**: Your focus sessions always begin with fresh quota

The ping uses minimal tokens (~5) and completes in seconds.

## Security

- OAuth tokens stored in GitHub Secrets only
- Never logged or exposed in outputs
- All API calls over HTTPS
- No third-party services involved

## Contributing

PRs welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

## License

MIT - see [LICENSE](./LICENSE)

---

Built with frustration about wasted quota and love for automation by [Vibe Works](https://github.com/thevibeworks).
