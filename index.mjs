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

  // A time already passed today means the next occurrence is tomorrow.
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

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "unreal") return;

  try {
    if (interaction.options.getSubcommand() !== "wb") return;

    const leader = interaction.options.getUser("leader", true);
    const time = interaction.options.getString("time", true).trim();
    const notify = interaction.options.getString("notify", true);
    const selectedRole = interaction.options.getRole("role");
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

    let notification = "";
    let notifiedRoleId = null;
    let allowedParses = [];

    if (notify === "everyone") {
      notification = "@everyone";
      allowedParses = ["everyone"];
    }

    if (notify === "custom-role") {
      if (!selectedRole) {
        await interaction.reply({
          content:
            "Choose a role in the `role` field when selecting “Choose a role”.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      notification = `${selectedRole}`;
      notifiedRoleId = selectedRole.id;
    }

    const serverTime = `${time.slice(0, 2)}:${time.slice(2)}`;
    const prefix = notification ? `${notification} ` : "";
    const remaining = formatTimeRemaining(unix);

    await interaction.reply({
      content:
        `**${prefix}${leader} is forming an Unreal RvR WB at <t:${unix}:t> · in ${remaining}**\n` +
        `*Time shown in your local timezone. RoR server time: ${serverTime}.*`,

      allowedMentions: {
        parse: allowedParses,
        users: [leader.id],
        roles: notifiedRoleId ? [notifiedRoleId] : [],
      },
    });
  } catch (error) {
    console.error("Unreal Bot command error:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Something went wrong while creating that warband callout.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
