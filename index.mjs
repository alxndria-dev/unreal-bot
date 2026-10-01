import "dotenv/config";
import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import {
  createGroup,
  ensureGroupSchema,
  handleGroupComponent,
} from "./groups.mjs";
import { formatTimeRemaining, nextRoRTime } from "./time.mjs";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

async function handleLink(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({
      content: "This command can only be used inside a Discord server.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const channel = interaction.options.getChannel("channel", true);

  if (!("createInvite" in channel)) {
    return interaction.reply({
      content: "Choose a standard text channel for the invite.",
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const invite = await channel.createInvite({
    maxAge: 24 * 60 * 60,
    maxUses: 1,
    unique: true,
    reason: "Unreal link requested by " + interaction.user.tag,
  });

  const text =
    interaction.options.getString("text")?.trim() ||
    "Unreal Discord (click for link)";

  const input = interaction.options.getString("colour")?.trim() || "129,74,200";

  const match = /^(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})$/.exec(input);

  if (!match || match.slice(1).some((value) => Number(value) > 255)) {
    return interaction.editReply(
      "Invalid colour. Use RGB values from 0 to 255, for example 129,74,200.",
    );
  }

  const link =
    '<LINK data="WEBLINK:' +
    invite.url +
    '" text="' +
    text.replaceAll('"', "'") +
    '" color="' +
    match.slice(1).join(",") +
    '">';

  const fence = String.fromCharCode(96).repeat(3);

  return interaction.editReply(
    "Copy and paste this into Return of Reckoning chat:\n" +
      fence +
      "\n" +
      link +
      "\n" +
      fence,
  );
}

async function handleWarband(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({
      content: "Warband callouts can only be used inside a Discord server.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const time = interaction.options.getString("time", true).trim();
  const unix = nextRoRTime(time);

  if (!unix) {
    return interaction.reply({
      content:
        "Invalid time. Use four digits in 24-hour RoR server time, for example 2000.\n" +
        "Do not use 20:00, 8pm, or 200.",
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply();

  const leader = interaction.options.getUser("leader", true);
  const side = interaction.options.getString("side");
  const notifyRole = interaction.options.getRole("notify");

  const label =
    side === "order"
      ? "an Order"
      : side === "destruction"
        ? "a Destruction"
        : "an Unreal";

  const circle = side === "order" ? "🔵 " : side === "destruction" ? "🔴 " : "";

  const remaining = formatTimeRemaining(unix);
  const status = remaining === "NOW" ? "NOW" : "in " + remaining;

  return interaction.editReply({
    content:
      (notifyRole ? String(notifyRole) + "\n" : "") +
      "**" +
      circle +
      "<@" +
      leader.id +
      "> is forming " +
      label +
      " RvR WB at <t:" +
      unix +
      ":t> · " +
      status +
      "**\n" +
      "*Time shown in your local timezone. RoR server time: " +
      time.slice(0, 2) +
      ":" +
      time.slice(2) +
      ".*",

    allowedMentions: {
      users: [leader.id],
      roles: notifyRole ? [notifyRole.id] : [],
    },
  });
}

client.once(Events.ClientReady, (readyClient) => {
  console.log("Logged in as " + readyClient.user.tag);
});

client.on("error", (error) => {
  console.error("Unreal Bot client error:", error);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (
      interaction.isButton() ||
      interaction.isStringSelectMenu() ||
      interaction.isUserSelectMenu() ||
      interaction.isModalSubmit()
    ) {
      await handleGroupComponent(interaction, client);
      return;
    }

    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "unreal") return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "group") return createGroup(interaction);
    if (subcommand === "link") return handleLink(interaction);
    if (subcommand === "wb") return handleWarband(interaction);
  } catch (error) {
    console.error("Unreal Bot command error:", error);

    if (error.code === 10062) return;

    try {
      if (interaction.deferred) {
        await interaction.editReply(error.message || "Something went wrong.");
      } else if (!interaction.replied) {
        await interaction.reply({
          content: error.message || "Something went wrong.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyError) {
      console.error("Could not send error response:", replyError);
    }
  }
});

await ensureGroupSchema();

client.login(process.env.DISCORD_TOKEN);
