const discordWebhookUrl: string | undefined = process.env.DISCORD_WEBHOOK_URL

const color: Record<string, number> = {
  red: 15158332,
  green: 3066993,
  yellow: 16776960,
}

export async function sendDiscordAlert(
  site: { name: string; url: string; email: string },
  error?: Error,
) {
  const message = {
    embeds: [
      {
        title: `🚨 New Offer Claimed: ${site.name}`,
        description: site.url,
        color: color.green,
        fields: [
          { name: "URL", value: site.url },
          //{ name: "Error", value: error?.message },
          { name: "Timestamp", value: new Date().toISOString() },
          { name: "Email", value: site.email },
        ],
      },
    ],
  }

  try {
    if (!discordWebhookUrl) {
      console.log("Discord webhook URL is not defined. Skipping alert.")
      throw new Error("Discord webhook URL is not defined")
    }
    await fetch(discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    })
    console.log("Discord alert sent successfully.")
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Error enviando a Discord:", err.message)
    } else {
      console.error("Error enviando a Discord:", err)
    }
  }
}
