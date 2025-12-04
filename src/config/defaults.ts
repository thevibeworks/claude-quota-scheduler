import type { Config } from "../types";

export const DEFAULT_CONFIG: Config = {
  version: "1",
  timezone: "UTC",
  settings: {
    pingPrompt: "ping",
    model: "claude-sonnet-4-20250514",
    retry: {
      attempts: 3,
      delayMs: 5000,
      backoffMultiplier: 2,
    },
    parallel: true,
    dryRun: false,
    debug: false,
  },
  accounts: {},
};

export const QUOTA_WINDOW_HOURS = 5;
export const MOTIVATIONAL_MESSAGES = [
  "Quota locked and loaded! Go build something amazing.",
  "Your future self thanks you for this optimization.",
  "5 hours of Claude power, ready to deploy.",
  "The early bird gets the quota.",
  "Fresh quota, fresh possibilities.",
  "Your coding session is now quota-certified.",
  "Optimal timing achieved. You're welcome.",
  "Quota primed and ready for action!",
];

export function getRandomMotivation(): string {
  return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
}
