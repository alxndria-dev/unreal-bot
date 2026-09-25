import "dotenv/config";
import { REST, Routes, SlashCommandBuilder, ChannelType } from "discord.js";

const command = new SlashCommandBuilder()
  .setName("unreal")
  .setDescription("Unreal guild tools")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("wb")
      .setDescription("Post an RvR warband callout")
      .addUserOption((option) =>
        option
          .setName("leader")
          .setDescription("Warband leader")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("time")
          .setDescription("RoR server time, 24-hour format. Example: 2000")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("side")
          .setDescription("Warband faction")
          .setRequired(false)
          .addChoices(
            { name: "Order", value: "order" },
            { name: "Destruction", value: "destruction" },
          ),
      )
      .addRoleOption((option) =>
        option
          .setName("notify")
          .setDescription("Role to notify. Leave blank for no notification")
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("group")
      .setDescription("Create a first-come, first-served group")
      .addStringOption((option) =>
        option
          .setName("title")
          .setDescription("For example: Evening SCs")
          .setRequired(true)
          .setMaxLength(100),
      )
      .addStringOption((option) =>
        option
          .setName("time")
          .setDescription("RoR server time, 24-hour format. Example: 2000")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("date")
          .setDescription("RoR server date in YYYY-MM-DD format")
          .setRequired(true),
      )
      .addIntegerOption((option) =>
        option
          .setName("spaces")
          .setDescription("Total party size, including you. Default: 6")
          .setMinValue(2)
          .setMaxValue(24)
          .setRequired(false),
      )
      .addStringOption((option) =>
        option
          .setName("your_role")
          .setDescription("Your role in this group. Leave blank if flexible")
          .setRequired(false)
          .addChoices(
            { name: "Tank", value: "Tank" },
            { name: "Healer", value: "Healer" },
            { name: "DPS", value: "DPS" },
          ),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("link")
      .setDescription("Create an Unreal Discord invite for RoR chat")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Where new members should land")
          .setRequired(true)
          .addChannelTypes(
            ChannelType.GuildText,
            ChannelType.GuildAnnouncement,
          ),
      )
      .addStringOption((option) =>
        option
          .setName("text")
          .setDescription("Link text. Default: Unreal Discord (click for link)")
          .setRequired(false)
          .setMaxLength(100),
      )
      .addStringOption((option) =>
        option
          .setName("colour")
          .setDescription("RGB colour, for example: 129,74,200")
          .setRequired(false)
          .setMaxLength(11),
      ),
  );

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
  body: [command.toJSON()],
});

console.log("Unreal global commands deployed.");
