import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

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
          .setName("notify")
          .setDescription("Who should be notified?")
          .setRequired(true)
          .addChoices(
            { name: "@everyone", value: "everyone" },
            { name: "No notification", value: "none" },
            { name: "Choose a role", value: "custom-role" },
          ),
      )
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Role to notify when choosing a role")
          .setRequired(false),
      ),
  );

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

await rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
  { body: [command.toJSON()] },
);

console.log("Unreal command deployed.");
