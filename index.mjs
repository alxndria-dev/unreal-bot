import "dotenv/config";
import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const UNREAL_DISCORD_LINK =
  '<LINK data="WEBLINK:https://discord.gg/GNAC8aGdq" text="Unreal Discord (click for link)" color="129,74,200">';

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

  const isCurrentServerMinute =
    serverNow.getUTCHours() === hour && serverNow.getUTCMinutes() === minute;

  if (timestamp <= now.getTime() && !isCurrentServerMinute) {
    timestamp += 24 * 60 * 60 * 1000;
  }

  return Math.floor(timestamp / 1000);
}

function formatTimeRemaining(unix) {
  const remainingMs = unix * 1000 - Date.now();
  const totalMinutes = Math.max(0, Math.floor(remainingMs / 60_000));

  if (totalMinutes === 0) {
    return "NOW";
  }

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
    const subcommand = interaction.options.getSubcommand();

    // LINK SUBCOMMAND START
    if (subcommand === "link") {
      if (!interaction.inGuild()) {
        await interaction.reply({
          content: "This command can only be used inside a Discord server.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const inviteChannel = interaction.options.getChannel("channel", true);

      if (!("createInvite" in inviteChannel)) {
        await interaction.reply({
          content: "Choose a standard text channel for the invite.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      const invite = await inviteChannel.createInvite({
        maxAge: 24 * 60 * 60,
        maxUses: 1,
        unique: true,
        reason: `Unreal link requested by ${interaction.user.tag}`,
      });

      const linkText =
        interaction.options.getString("text")?.trim() ||
        "Unreal Discord (click for link)";

      const colourInput =
        interaction.options.getString("colour")?.trim() || "129,74,200";

      const colourMatch = /^(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})$/.exec(
        colourInput,
      );

      if (
        !colourMatch ||
        colourMatch.slice(1).some((value) => Number(value) > 255)
      ) {
        await interaction.reply({
          content:
            "Invalid colour. Use RGB values from 0 to 255, for example `129,74,200`.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const colour = colourMatch.slice(1).join(",");

      const rorLink =
        `<LINK data="WEBLINK:${invite.url}" ` +
        `text="${linkText.replaceAll('"', "'")}" color="${colour}">`;

      await interaction.editReply(
        "Copy and paste this into Return of Reckoning chat:\n" +
          `\`\`\`\n${rorLink}\n\`\`\``,
      );
      return;
    }
    // LINK SUBCOMMAND END

    if (subcommand !== "wb") return;

    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "Warband callouts can only be used inside a Discord server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

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

    const timeStatus = remaining === "NOW" ? "NOW" : `in ${remaining}`;

    await interaction.editReply({
      content:
        `${notification ? `${notification}\n` : ""}` +
        `**${sideCircle}${leader} is forming ${sideLabel} RvR WB at <t:${unix}:t> · ${timeStatus}**\n` +
        `*Time shown in your local timezone. RoR server time: ${serverTime}.*`,

      allowedMentions: {
        users: [leader.id],
        roles: notifyRole ? [notifyRole.id] : [],
      },
    });
  } catch (error) {
    console.error("Unreal Bot command error:", error);

    if (error.code === 10062) return;

    try {
      if (interaction.deferred) {
        await interaction.editReply(
          "Something went wrong while creating that warband callout.",
        );
      } else if (!interaction.replied) {
        await interaction.reply({
          content: "Something went wrong while creating that command.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyError) {
      console.error("Could not send error response:", replyError);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
