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
      ),
  );

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
  body: [command.toJSON()],
});

console.log("Unreal global commands deployed.");
