import type { Config, PingResult, SummaryStyle, SchedulerResult } from "../types";
import { formatTimeInTimezone, getTimezoneOffset } from "../config/timezone";
import { getRandomMotivation } from "../config/defaults";

export function generateSummary(
  results: PingResult[],
  config: Config,
  style: SummaryStyle
): string {
  switch (style) {
    case "minimal":
      return generateMinimalSummary(results, config);
    case "ascii-art":
      return generateAsciiArtSummary(results, config);
    case "detailed":
    default:
      return generateDetailedSummary(results, config);
  }
}

function generateMinimalSummary(results: PingResult[], config: Config): string {
  const success = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const tz = config.timezone;

  let summary = `## Quota Scheduler: ${success.length}/${results.length} OK\n\n`;

  if (success.length > 0) {
    summary += `**Success:** ${success.map((r) => r.account).join(", ")}\n`;
  }

  if (failed.length > 0) {
    summary += `**Failed:** ${failed.map((r) => `${r.account} (${r.error})`).join(", ")}\n`;
  }

  summary += `\n*${formatTimeInTimezone(new Date(), tz, "datetime")} ${getTimezoneOffset(tz)}*`;

  return summary;
}

function generateDetailedSummary(results: PingResult[], config: Config): string {
  const tz = config.timezone;
  const now = new Date();

  let summary = `## Claude Quota Scheduler - Status Report\n\n`;
  summary += `**Timezone:** ${tz} (${getTimezoneOffset(tz)})\n`;
  summary += `**Run Time:** ${formatTimeInTimezone(now, tz, "full")}\n\n`;

  summary += `### Account Status\n\n`;
  summary += `| Account | Status | Ping Time | Window End |\n`;
  summary += `|---------|--------|-----------|------------|\n`;

  for (const result of results) {
    const status = result.success ? "OK" : "FAILED";
    const statusIcon = result.success ? "\\:white\\_check\\_mark:" : "\\:x:";
    const pingTime = formatTimeInTimezone(result.timestamp, tz, "time");
    const windowEnd = result.windowEnd
      ? formatTimeInTimezone(result.windowEnd, tz, "time")
      : result.error || "N/A";

    summary += `| ${result.account} | ${statusIcon} ${status} | ${pingTime} | ${windowEnd} |\n`;
  }

  summary += `\n### Summary\n\n`;

  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  if (successCount === totalCount) {
    summary += `All ${totalCount} account(s) pinged successfully.\n\n`;
    summary += `> ${getRandomMotivation()}\n`;
  } else if (successCount > 0) {
    summary += `${successCount}/${totalCount} accounts pinged successfully.\n`;
    const failed = results.filter((r) => !r.success);
    summary += `\n**Failed accounts:**\n`;
    for (const f of failed) {
      summary += `- ${f.account}: ${f.error}\n`;
    }
  } else {
    summary += `All ${totalCount} ping(s) failed.\n`;
    summary += `\n**Errors:**\n`;
    for (const f of results) {
      summary += `- ${f.account}: ${f.error}\n`;
    }
  }

  return summary;
}

function generateAsciiArtSummary(results: PingResult[], config: Config): string {
  const tz = config.timezone;
  const now = new Date();
  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  const lines: string[] = [];

  lines.push("```");
  lines.push("╔═══════════════════════════════════════════════════════════════════╗");
  lines.push("║               CLAUDE QUOTA SCHEDULER - STATUS REPORT              ║");
  lines.push("╠═══════════════════════════════════════════════════════════════════╣");
  lines.push("║                                                                   ║");
  lines.push(`║  Timezone: ${padRight(tz + " (" + getTimezoneOffset(tz) + ")", 52)}  ║`);
  lines.push(`║  Run Time: ${padRight(formatTimeInTimezone(now, tz, "datetime"), 52)}  ║`);
  lines.push("║                                                                   ║");

  lines.push("║  ┌─────────────┬────────────┬────────────┬───────────────────┐   ║");
  lines.push("║  │ Account     │ Status     │ Ping Time  │ Window End        │   ║");
  lines.push("║  ├─────────────┼────────────┼────────────┼───────────────────┤   ║");

  for (const result of results) {
    const status = result.success ? "OK" : "FAILED";
    const pingTime = formatTimeInTimezone(result.timestamp, tz, "time").slice(0, 8);
    const windowEnd = result.windowEnd
      ? formatTimeInTimezone(result.windowEnd, tz, "time").slice(0, 8)
      : "(error)";

    lines.push(
      `║  │ ${padRight(result.account.slice(0, 11), 11)} │ ${result.success ? "\\u2713" : "\\u2717"} ${padRight(status, 8)} │ ${padRight(pingTime, 10)} │ ${padRight(windowEnd, 17)} │   ║`
    );
  }

  lines.push("║  └─────────────┴────────────┴────────────┴───────────────────┘   ║");
  lines.push("║                                                                   ║");

  if (successCount === totalCount) {
    lines.push("║       (\\__/)                                                     ║");
    lines.push('║       (o^.^)  "Quota ready!"                                     ║');
    lines.push("║       |>  <>|                                                    ║");
    lines.push("║                                                                   ║");
  } else if (successCount > 0) {
    lines.push("║       (\\__/)                                                     ║");
    lines.push('║       (>_<)   "Partial success..."                               ║');
    lines.push("║       |>  <>|                                                    ║");
    lines.push("║                                                                   ║");
  } else {
    lines.push("║       (\\__/)                                                     ║");
    lines.push('║       (T_T)   "All failed..."                                    ║');
    lines.push("║       |>  <>|                                                    ║");
    lines.push("║                                                                   ║");
  }

  lines.push("╚═══════════════════════════════════════════════════════════════════╝");
  lines.push("```");

  if (successCount === totalCount) {
    lines.push(`\n> ${getRandomMotivation()}`);
  }

  return lines.join("\n");
}

function padRight(str: string, len: number): string {
  if (str.length >= len) return str.slice(0, len);
  return str + " ".repeat(len - str.length);
}

export function buildSchedulerResult(
  results: PingResult[],
  config: Config,
  summaryStyle: SummaryStyle
): SchedulerResult {
  const success = results.every((r) => r.success);
  const summary = generateSummary(results, config, summaryStyle);

  const nextWindows: Record<string, Date> = {};
  for (const result of results) {
    if (result.windowEnd) {
      nextWindows[result.account] = result.windowEnd;
    }
  }

  return {
    success,
    results,
    summary,
    nextWindows,
  };
}
