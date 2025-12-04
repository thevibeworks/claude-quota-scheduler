import { spawn } from "child_process";
import type { Account, PingResult, Config } from "../types";
import { QUOTA_WINDOW_HOURS } from "../config/defaults";
import { addHours } from "../config/timezone";

export interface PingOptions {
  dryRun: boolean;
  debug: boolean;
  pathToClaudeExecutable?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pingAccount(
  account: Account,
  config: Config,
  options: PingOptions
): Promise<PingResult> {
  const startTime = Date.now();
  const timestamp = new Date();

  const prompt = account.pingPrompt || config.settings.pingPrompt;
  const model = account.model || config.settings.model;

  if (options.debug) {
    console.log(`[DEBUG] Pinging account: ${account.name}`);
    console.log(`[DEBUG] Prompt: "${prompt}"`);
    console.log(`[DEBUG] Model: ${model}`);
  }

  if (options.dryRun) {
    console.log(`[DRY RUN] Would ping account: ${account.name}`);
    return {
      account: account.name,
      success: true,
      timestamp,
      duration: Date.now() - startTime,
      windowEnd: addHours(timestamp, QUOTA_WINDOW_HOURS),
    };
  }

  const claudePath = options.pathToClaudeExecutable || "claude";

  try {
    const result = await executeClaudePing(claudePath, prompt, model, account.token, options.debug);

    return {
      account: account.name,
      success: result.success,
      timestamp,
      duration: Date.now() - startTime,
      windowEnd: result.success ? addHours(timestamp, QUOTA_WINDOW_HOURS) : undefined,
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      account: account.name,
      success: false,
      timestamp,
      duration: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

interface ClaudeResult {
  success: boolean;
  output?: string;
  error?: string;
}

function executeClaudePing(
  claudePath: string,
  prompt: string,
  model: string,
  token: string,
  debug: boolean
): Promise<ClaudeResult> {
  return new Promise((resolve) => {
    const args = ["--print", "--model", model, "--max-turns", "1", prompt];

    if (debug) {
      console.log(`[DEBUG] Executing: ${claudePath} ${args.join(" ")}`);
    }

    const proc = spawn(claudePath, args, {
      env: {
        ...process.env,
        CLAUDE_CODE_OAUTH_TOKEN: token,
      },
      timeout: 60000,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (error) => {
      resolve({
        success: false,
        error: `Failed to execute Claude CLI: ${error.message}`,
      });
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({
          success: true,
          output: stdout.trim(),
        });
      } else {
        resolve({
          success: false,
          error: stderr.trim() || `Process exited with code ${code}`,
        });
      }
    });

    setTimeout(() => {
      proc.kill("SIGTERM");
      resolve({
        success: false,
        error: "Timeout: Claude CLI did not respond within 60 seconds",
      });
    }, 60000);
  });
}

export async function pingAccountsSequential(
  accounts: Account[],
  config: Config,
  options: PingOptions
): Promise<PingResult[]> {
  const results: PingResult[] = [];

  for (const account of accounts) {
    if (!account.enabled) {
      console.log(`Skipping disabled account: ${account.name}`);
      continue;
    }

    const result = await pingWithRetry(account, config, options);
    results.push(result);

    if (accounts.indexOf(account) < accounts.length - 1) {
      await sleep(1000);
    }
  }

  return results;
}

export async function pingAccountsParallel(
  accounts: Account[],
  config: Config,
  options: PingOptions
): Promise<PingResult[]> {
  const enabledAccounts = accounts.filter((a) => a.enabled);

  if (enabledAccounts.length === 0) {
    console.log("No enabled accounts to ping");
    return [];
  }

  const promises = enabledAccounts.map((account) => pingWithRetry(account, config, options));

  return Promise.all(promises);
}

async function pingWithRetry(
  account: Account,
  config: Config,
  options: PingOptions
): Promise<PingResult> {
  const { attempts, delayMs, backoffMultiplier } = config.settings.retry;

  let lastResult: PingResult | null = null;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (options.debug && attempt > 1) {
      console.log(`[DEBUG] Retry attempt ${attempt} for account: ${account.name}`);
    }

    lastResult = await pingAccount(account, config, options);

    if (lastResult.success) {
      return lastResult;
    }

    if (attempt < attempts) {
      console.log(
        `Ping failed for ${account.name}, retrying in ${currentDelay}ms... (${attempt}/${attempts})`
      );
      await sleep(currentDelay);
      currentDelay *= backoffMultiplier;
    }
  }

  return lastResult!;
}
