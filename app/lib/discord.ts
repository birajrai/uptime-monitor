interface DiscordNotification {
  webhookUrl: string;
  monitorName: string;
  monitorUrl: string;
  newStatus: "UP" | "DOWN";
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
  previousStatus: "UP" | "DOWN" | null;
}

export async function sendDiscordNotification(
  notification: DiscordNotification
): Promise<boolean> {
  const isUp = notification.newStatus === "UP";
  const color = isUp ? 0x22c55e : 0xef4444;
  const title = isUp ? "Monitor Recovered" : "Monitor Down";

  const fields = [
    { name: "Monitor", value: notification.monitorName, inline: true },
    { name: "URL", value: notification.monitorUrl, inline: true },
  ];

  if (notification.previousStatus) {
    fields.push({
      name: "Status Change",
      value: `${notification.previousStatus} → ${notification.newStatus}`,
      inline: false,
    });
  }

  fields.push(
    { name: "Status Code", value: notification.statusCode?.toString() ?? "N/A", inline: true },
    { name: "Response Time", value: notification.responseTimeMs ? `${notification.responseTimeMs}ms` : "N/A", inline: true }
  );

  if (notification.errorMessage) {
    fields.push({ name: "Error", value: notification.errorMessage, inline: false });
  }

  const embed = {
    title,
    color,
    fields,
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(notification.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendTestWebhook(webhookUrl: string): Promise<boolean> {
  const embed = {
    title: "Test Notification",
    color: 0x22c55e,
    description: "This is a test message from your uptime monitor.",
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
