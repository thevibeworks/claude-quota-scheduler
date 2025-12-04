import { parse as parseYaml } from "yaml";
import * as fs from "fs";
import * as path from "path";
import type { Config, ActionInputs, Account } from "../types";
import { DEFAULT_CONFIG } from "./defaults";

export function parseInputs(): ActionInputs {
  const getEnv = (key: string, defaultValue = ""): string =>
    process.env[`INPUT_${key}`] ?? defaultValue;

  const getBool = (key: string, defaultValue = false): boolean => {
    const val = getEnv(key);
    if (!val) return defaultValue;
    return val.toLowerCase() === "true";
  };

  let oauthTokens: Record<string, string> | undefined;
  const tokensJson = getEnv("OAUTH_TOKENS");
  if (tokensJson) {
    try {
      oauthTokens = JSON.parse(tokensJson);
    } catch {
      console.warn("Failed to parse oauth_tokens JSON, ignoring");
    }
  }

  const accountsStr = getEnv("ACCOUNTS", "default");
  const accounts = accountsStr
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  return {
    oauthToken: getEnv("OAUTH_TOKEN") || undefined,
    oauthTokens,
    configFile: getEnv("CONFIG_FILE") || undefined,
    timezone: getEnv("TIMEZONE", "UTC"),
    pingPrompt: getEnv("PING_PROMPT", "ping"),
    model: getEnv("MODEL", "claude-sonnet-4-20250514"),
    accounts,
    accountName: getEnv("ACCOUNT_NAME") || undefined,
    dryRun: getBool("DRY_RUN", false),
    debug: getBool("DEBUG", false),
    summaryStyle: getEnv("SUMMARY_STYLE", "detailed") as ActionInputs["summaryStyle"],
    notificationWebhook: getEnv("NOTIFICATION_WEBHOOK") || undefined,
    notificationOnSuccess: getBool("NOTIFICATION_ON_SUCCESS", false),
    notificationOnFailure: getBool("NOTIFICATION_ON_FAILURE", true),
    pathToClaudeExecutable: getEnv("PATH_TO_CLAUDE_EXECUTABLE") || undefined,
  };
}

export function parseConfigFile(filePath: string): Partial<Config> {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, "utf-8");
  return parseYaml(content) as Partial<Config>;
}

export function buildConfig(inputs: ActionInputs): Config {
  let fileConfig: Partial<Config> = {};

  if (inputs.configFile) {
    fileConfig = parseConfigFile(inputs.configFile);
  }

  const accounts: Record<string, Account> = {};

  if (inputs.oauthToken) {
    const accountName = inputs.accountName || "default";
    accounts[accountName] = {
      name: accountName,
      token: inputs.oauthToken,
      enabled: true,
    };
  }

  if (inputs.oauthTokens) {
    for (const [name, token] of Object.entries(inputs.oauthTokens)) {
      accounts[name] = {
        name,
        token,
        enabled: true,
      };
    }
  }

  for (const name of Object.keys(process.env)) {
    if (name.startsWith("CLAUDE_OAUTH_")) {
      const accountName = name.replace("CLAUDE_OAUTH_", "").toLowerCase();
      const token = process.env[name];
      if (token && !accounts[accountName]) {
        accounts[accountName] = {
          name: accountName,
          token,
          enabled: true,
        };
      }
    }
  }

  if (fileConfig.accounts) {
    for (const [name, acc] of Object.entries(fileConfig.accounts)) {
      if (typeof acc === "object" && acc !== null) {
        const tokenSecretName = (acc as { token_secret?: string }).token_secret;
        if (tokenSecretName && process.env[tokenSecretName]) {
          accounts[name] = {
            name,
            token: process.env[tokenSecretName]!,
            model: (acc as { model?: string }).model,
            pingPrompt: (acc as { ping_prompt?: string }).ping_prompt,
            enabled: (acc as { enabled?: boolean }).enabled ?? true,
          };
        }
      }
    }
  }

  const config: Config = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    timezone: inputs.timezone || fileConfig.timezone || DEFAULT_CONFIG.timezone,
    settings: {
      ...DEFAULT_CONFIG.settings,
      ...(fileConfig.settings || {}),
      pingPrompt:
        inputs.pingPrompt || fileConfig.settings?.pingPrompt || DEFAULT_CONFIG.settings.pingPrompt,
      model: inputs.model || fileConfig.settings?.model || DEFAULT_CONFIG.settings.model,
      dryRun: inputs.dryRun || fileConfig.settings?.dryRun || DEFAULT_CONFIG.settings.dryRun,
      debug: inputs.debug || fileConfig.settings?.debug || DEFAULT_CONFIG.settings.debug,
    },
    accounts,
  };

  if (inputs.notificationWebhook) {
    config.notifications = {
      ...config.notifications,
      webhook: {
        url: inputs.notificationWebhook,
        onSuccess: inputs.notificationOnSuccess,
        onFailure: inputs.notificationOnFailure,
      },
    };
  }

  return config;
}
