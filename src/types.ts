export interface Account {
  name: string;
  token: string;
  model?: string;
  pingPrompt?: string;
  enabled: boolean;
}

export interface FocusSession {
  name: string;
  start: string;
  end: string;
  bufferBefore?: number;
}

export interface ScheduleConfig {
  focusSessions?: FocusSession[];
  checkpoints?: Array<{
    time: string;
    accounts?: string[];
  }>;
  cron?: string;
  cronWeekend?: string;
}

export interface NotificationConfig {
  webhook?: {
    url: string;
    onSuccess: boolean;
    onFailure: boolean;
  };
  slack?: {
    webhookUrl: string;
    channel?: string;
    onSuccess: boolean;
    onFailure: boolean;
  };
  discord?: {
    webhookUrl: string;
    onSuccess: boolean;
    onFailure: boolean;
  };
}

export interface Config {
  version: string;
  timezone: string;
  settings: {
    pingPrompt: string;
    model: string;
    retry: {
      attempts: number;
      delayMs: number;
      backoffMultiplier: number;
    };
    parallel: boolean;
    dryRun: boolean;
    debug: boolean;
  };
  accounts: Record<string, Account>;
  schedule?: ScheduleConfig;
  notifications?: NotificationConfig;
}

export interface PingResult {
  account: string;
  success: boolean;
  timestamp: Date;
  duration: number;
  error?: string;
  windowEnd?: Date;
}

export interface SchedulerResult {
  success: boolean;
  results: PingResult[];
  summary: string;
  nextWindows: Record<string, Date>;
}

export type SummaryStyle = "minimal" | "detailed" | "ascii-art";

export interface ActionInputs {
  oauthToken?: string;
  oauthTokens?: Record<string, string>;
  configFile?: string;
  timezone: string;
  pingPrompt: string;
  model: string;
  accounts: string[];
  accountName?: string;
  dryRun: boolean;
  debug: boolean;
  summaryStyle: SummaryStyle;
  notificationWebhook?: string;
  notificationOnSuccess: boolean;
  notificationOnFailure: boolean;
  pathToClaudeExecutable?: string;
}
