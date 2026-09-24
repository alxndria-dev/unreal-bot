import "dotenv/config";
import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

function nextRoRTime(input) {
  const match = /^([01]\d|2[0-3])([0-5]\d)$/.exec(input);

  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const serverOffset = 2 * 60 * 60 * 1000; // RoR is UTC+2
  const now = new Date();
  const serverNow = new Date(now.getTime() + serverOffset);

  let timestamp =
    Date.UTC(
      serverNow.getUTCFullYear(),
      serverNow.getUTCMonth(),
      serverNow.getUTCDate(),
      hour,
      minute,
      0,
    ) - serverOffset;

  if (timestamp <= now.getTime()) {
    timestamp += 24 * 60 * 60 * 1000;
  }

  return Math.floor(timestamp / 1000);
}

function formatTimeRemaining(unix) {
  const remainingMs = unix * 1000 - Date.now();
  const totalMinutes = Math.max(0, Math.floor(remainingMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const hourLabel = hours === 1 ? "hour" : "hours";
  const minuteLabel = minutes === 1 ? "minute" : "minutes";

  return `${hours} ${hourLabel} ${minutes} ${minuteLabel}`;
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on("error", (error) => {
  console.error("Unreal Bot client error:", error);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "unreal") return;

  try {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content:
          "Unreal Bot commands can only be used inside a Discord server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (interaction.options.getSubcommand() !== "wb") return;

    const leader = interaction.options.getUser("leader", true);
    const time = interaction.options.getString("time", true).trim();
    const side = interaction.options.getString("side");
    const notifyRole = interaction.options.getRole("notify");
    const unix = nextRoRTime(time);

    if (!unix) {
      await interaction.reply({
        content:
          "Invalid time. Use four digits in 24-hour RoR server time, for example `2000`.\n" +
          "Do not use `20:00`, `8pm`, or `200`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    const notification = notifyRole ? `${notifyRole}` : "";
    const serverTime = `${time.slice(0, 2)}:${time.slice(2)}`;
    const remaining = formatTimeRemaining(unix);

    const sideLabel =
      side === "order"
        ? "an Order"
        : side === "destruction"
          ? "a Destruction"
          : "an Unreal";

    const sideCircle =
      side === "order" ? "🔵 " : side === "destruction" ? "🔴 " : "";

    await interaction.editReply({
      content:
        `${notification ? `${notification}\n` : ""}` +
        `**${sideCircle}${leader} is forming ${sideLabel} RvR WB at <t:${unix}:t> · in ${remaining}**\n` +
        `*Time shown in your local timezone. RoR server time: ${serverTime}.*`,

      allowedMentions: {
        users: [leader.id],
        roles: notifyRole ? [notifyRole.id] : [],
      },
    });
  } catch (error) {
    console.error("Unreal Bot command error:", error);

    // Discord already received a response, commonly from a second bot process.
    if (error.code === 10062) return;

    try {
      if (interaction.deferred) {
        await interaction.editReply(
          "Something went wrong while creating that warband callout.",
        );
      } else if (!interaction.replied) {
        await interaction.reply({
          content: "Something went wrong while creating that warband callout.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyError) {
      console.error("Could not send error response:", replyError);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
