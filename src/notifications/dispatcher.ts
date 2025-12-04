import type { Config, SchedulerResult, NotificationConfig } from "../types";

export interface NotificationPayload {
  success: boolean;
  accountsTotal: number;
  accountsSuccess: number;
  accountsFailed: number;
  failedAccounts: string[];
  summary: string;
  timestamp: string;
}

export async function dispatchNotifications(
  result: SchedulerResult,
  config: Config
): Promise<void> {
  const notifications = config.notifications;
  if (!notifications) return;

  const shouldNotify =
    (result.success && notifications.webhook?.onSuccess) ||
    (!result.success && notifications.webhook?.onFailure);

  if (!shouldNotify) {
    console.log("Notification skipped based on success/failure rules");
    return;
  }

  const payload = buildPayload(result);

  if (notifications.webhook) {
    await sendWebhook(notifications.webhook.url, payload);
  }

  if (notifications.slack) {
    await sendSlackNotification(notifications.slack, payload);
  }

  if (notifications.discord) {
    await sendDiscordNotification(notifications.discord, payload);
  }
}

function buildPayload(result: SchedulerResult): NotificationPayload {
  const failedAccounts = result.results.filter((r) => !r.success).map((r) => r.account);

  return {
    success: result.success,
    accountsTotal: result.results.length,
    accountsSuccess: result.results.filter((r) => r.success).length,
    accountsFailed: failedAccounts.length,
    failedAccounts,
    summary: result.summary,
    timestamp: new Date().toISOString(),
  };
}

async function sendWebhook(url: string, payload: NotificationPayload): Promise<void> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Webhook failed: ${response.status} ${response.statusText}`);
    } else {
      console.log("Webhook notification sent successfully");
    }
  } catch (error) {
    console.error(`Webhook error: ${error}`);
  }
}

async function sendSlackNotification(
  config: NotificationConfig["slack"],
  payload: NotificationPayload
): Promise<void> {
  if (!config?.webhookUrl) return;

  const emoji = payload.success ? ":white_check_mark:" : ":x:";
  const color = payload.success ? "good" : "danger";

  const slackPayload = {
    channel: config.channel,
    attachments: [
      {
        color,
        title: `${emoji} Claude Quota Scheduler`,
        text: `${payload.accountsSuccess}/${payload.accountsTotal} accounts pinged successfully`,
        fields:
          payload.failedAccounts.length > 0
            ? [
                {
                  title: "Failed Accounts",
                  value: payload.failedAccounts.join(", "),
                  short: false,
                },
              ]
            : [],
        footer: "Claude Quota Scheduler",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      console.error(`Slack notification failed: ${response.status}`);
    } else {
      console.log("Slack notification sent successfully");
    }
  } catch (error) {
    console.error(`Slack error: ${error}`);
  }
}

async function sendDiscordNotification(
  config: NotificationConfig["discord"],
  payload: NotificationPayload
): Promise<void> {
  if (!config?.webhookUrl) return;

  const color = payload.success ? 0x00ff00 : 0xff0000;

  const discordPayload = {
    embeds: [
      {
        title: "Claude Quota Scheduler",
        description: `${payload.accountsSuccess}/${payload.accountsTotal} accounts pinged successfully`,
        color,
        fields:
          payload.failedAccounts.length > 0
            ? [
                {
                  name: "Failed Accounts",
                  value: payload.failedAccounts.join(", "),
                  inline: false,
                },
              ]
            : [],
        timestamp: new Date().toISOString(),
        footer: {
          text: "Claude Quota Scheduler",
        },
      },
    ],
  };

  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      console.error(`Discord notification failed: ${response.status}`);
    } else {
      console.log("Discord notification sent successfully");
    }
  } catch (error) {
    console.error(`Discord error: ${error}`);
  }
}
