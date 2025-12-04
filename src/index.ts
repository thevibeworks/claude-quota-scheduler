#!/usr/bin/env bun

import * as core from "@actions/core";
import * as fs from "fs";
import * as path from "path";
import { parseInputs, buildConfig } from "./config/parser";
import { isValidTimezone } from "./config/timezone";
import { pingAccountsParallel, pingAccountsSequential, type PingOptions } from "./ping/engine";
import { buildSchedulerResult } from "./reporter/summary";
import { dispatchNotifications } from "./notifications/dispatcher";
import type { Account } from "./types";

async function run(): Promise<void> {
  console.log("=".repeat(60));
  console.log("  Claude Quota Scheduler v1.0.0");
  console.log("  'Never waste a quota refresh again'");
  console.log("=".repeat(60));
  console.log();

  try {
    const inputs = parseInputs();
    const config = buildConfig(inputs);

    if (!isValidTimezone(config.timezone)) {
      throw new Error(`Invalid timezone: ${config.timezone}`);
    }

    const accounts = Object.values(config.accounts).filter(
      (a): a is Account => a !== null && typeof a === "object" && "token" in a
    );

    if (accounts.length === 0) {
      throw new Error(
        "No accounts configured. Provide oauth_token, oauth_tokens, or set CLAUDE_OAUTH_* environment variables."
      );
    }

    const enabledAccounts = accounts.filter((a) => a.enabled);
    if (enabledAccounts.length === 0) {
      throw new Error("All configured accounts are disabled.");
    }

    console.log(`Timezone: ${config.timezone}`);
    console.log(`Accounts: ${enabledAccounts.map((a) => a.name).join(", ")}`);
    console.log(`Dry run: ${config.settings.dryRun}`);
    console.log(`Debug: ${config.settings.debug}`);
    console.log();

    const pingOptions: PingOptions = {
      dryRun: config.settings.dryRun,
      debug: config.settings.debug,
      pathToClaudeExecutable: inputs.pathToClaudeExecutable,
    };

    console.log("Starting quota refresh pings...\n");

    const results = config.settings.parallel
      ? await pingAccountsParallel(enabledAccounts, config, pingOptions)
      : await pingAccountsSequential(enabledAccounts, config, pingOptions);

    const schedulerResult = buildSchedulerResult(results, config, inputs.summaryStyle);

    console.log("\n" + "=".repeat(60));
    console.log("Results:");
    console.log("=".repeat(60));

    for (const result of results) {
      const status = result.success ? "OK" : "FAILED";
      const icon = result.success ? "[+]" : "[x]";
      console.log(`${icon} ${result.account}: ${status} (${result.duration}ms)`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    }

    const summaryPath = path.join(process.env.RUNNER_TEMP || "/tmp", "quota-scheduler-summary.md");
    fs.writeFileSync(summaryPath, schedulerResult.summary);
    console.log(`\nSummary written to: ${summaryPath}`);

    core.setOutput("success", schedulerResult.success.toString());
    core.setOutput(
      "accounts_pinged",
      JSON.stringify(results.filter((r) => r.success).map((r) => r.account))
    );
    core.setOutput(
      "accounts_failed",
      JSON.stringify(results.filter((r) => !r.success).map((r) => r.account))
    );

    const nextWindowsObj: Record<string, string> = {};
    for (const [account, date] of Object.entries(schedulerResult.nextWindows)) {
      nextWindowsObj[account] = date.toISOString();
    }
    core.setOutput("next_windows", JSON.stringify(nextWindowsObj));
    core.setOutput("summary", schedulerResult.summary);

    await dispatchNotifications(schedulerResult, config);

    if (!schedulerResult.success) {
      const failedAccounts = results.filter((r) => !r.success).map((r) => r.account);
      core.setFailed(`Failed to ping accounts: ${failedAccounts.join(", ")}`);
    } else {
      console.log("\nAll pings completed successfully!");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(message);
    console.error(`\nError: ${message}`);
    process.exit(1);
  }
}

run();
