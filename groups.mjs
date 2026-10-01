import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from "discord.js";
import { db } from "./db.mjs";
import { nowRoRTime, roRDateTime, roRDay, todayRoRDate } from "./time.mjs";

const ROLES = ["Tank", "Healer", "DPS"];
const DESCRIPTION_LIMIT = 500;

export async function ensureGroupSchema() {
  await db.query(`
    ALTER TABLE group_events
      ADD COLUMN IF NOT EXISTS description text,
      ADD COLUMN IF NOT EXISTS forming_now boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS time_tbc boolean NOT NULL DEFAULT false
  `);
}

function rolesMenu(customId, max = 3) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(
        max === 1 ? "Choose a role" : "Select every role you can play",
      )
      .setMinValues(1)
      .setMaxValues(max)
      .addOptions(
        ROLES.map((role) => ({
          label: role,
          value: role,
        })),
      ),
  );
}

async function getGroup(eventId) {
  const event = (
    await db.query("SELECT * FROM group_events WHERE id = $1", [eventId])
  ).rows[0];

  if (!event) return null;

  const signups = (
    await db.query(
      "SELECT * FROM group_signups WHERE event_id = $1 ORDER BY joined_at, id",
      [eventId],
    )
  ).rows;

  return { event, signups };
}

function view(event, signups) {
  const remaining = event.capacity - signups.length;
  const faction = event.faction === "order" ? "🔵 Order" : "🔴 Destruction";

  const roster =
    signups
      .map((signup) => {
        const role =
          signup.assigned_role ||
          signup.selected_roles.join(" / ") ||
          "role flexible";

        return "• <@" + signup.user_id + "> — " + role;
      })
      .join("\n") || "No one has joined yet.";

  const unix = Math.floor(new Date(event.event_at).getTime() / 1000);
  const when = event.time_tbc
    ? "<t:" + unix + ":D> (time TBC)"
    : "<t:" + unix + ":F>" + (event.forming_now ? " (forming now)" : "");

  return {
    content:
      "**⚔️ " +
      event.title +
      "** · " +
      faction +
      "\n" +
      when +
      (event.description ? "\n" + event.description : "") +
      "\n" +
      "**" +
      signups.length +
      "/" +
      event.capacity +
      " confirmed** · " +
      remaining +
      " " +
      (remaining === 1 ? "space" : "spaces") +
      " left · " +
      (event.status === "open" ? "Open" : "Closed") +
      "\n\n**Roster**\n" +
      roster +
      "\n\n",

    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("group:join:" + event.id)
          .setLabel(
            event.status === "open"
              ? remaining > 0
                ? "Join / Update roles"
                : "Update roles"
              : "Signups closed",
          )
          .setStyle(ButtonStyle.Primary)
          .setDisabled(event.status !== "open"),

        new ButtonBuilder()
          .setCustomId("group:leave:" + event.id)
          .setLabel("Leave")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("group:manage:" + event.id)
          .setLabel("Manage roster")
          .setStyle(ButtonStyle.Secondary),
      ),
    ],

    allowedMentions: { parse: [] },
  };
}

function manageView(event, notice) {
  return {
    content:
      (notice || "Creator-only roster controls.") +
      "\n\n**Description**\n" +
      (event.description || "None yet."),
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("group:add:" + event.id)
          .setLabel("Add / reserve player")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("group:assign:" + event.id)
          .setLabel("Assign role")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("group:remove:" + event.id)
          .setLabel("Remove player")
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId("group:toggle:" + event.id)
          .setLabel(
            event.status === "open" ? "Close signups" : "Reopen signups",
          )
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("group:cancel:" + event.id)
          .setLabel("Cancel group")
          .setStyle(ButtonStyle.Danger),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("group:description:" + event.id)
          .setLabel("Edit description")
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
    allowedMentions: { parse: [] },
  };
}

function descriptionModal(event) {
  const input = new TextInputBuilder()
    .setCustomId("description")
    .setLabel("Description")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(DESCRIPTION_LIMIT)
    .setPlaceholder("Extra details for this group");

  if (event.description) {
    input.setValue(event.description.slice(0, DESCRIPTION_LIMIT));
  }

  return new ModalBuilder()
    .setCustomId("group:description:" + event.id)
    .setTitle("Edit description")
    .addComponents(new ActionRowBuilder().addComponents(input));
}

async function refresh(client, eventId) {
  const current = await getGroup(eventId);

  if (!current?.event.message_id) {
    console.warn(`Group ${eventId} has no message_id`);
    return;
  }

  try {
    const channel = await client.channels.fetch(current.event.channel_id);

    if (!channel?.isTextBased()) {
      throw new Error(
        `Group channel ${current.event.channel_id} is not text based or no longer exists.`,
      );
    }

    // Log exactly what Discord thinks the bot can do here.
    if ("guild" in channel && channel.guild) {
      const me = channel.guild.members.me;
      const permissions = channel.permissionsFor(me);

      console.log(`Refreshing group ${eventId}`, {
        guildId: current.event.guild_id,
        channelId: current.event.channel_id,
        messageId: current.event.message_id,
        botId: client.user.id,
        viewChannel: permissions?.has("ViewChannel"),
        sendMessages: permissions?.has("SendMessages"),
        readMessageHistory: permissions?.has("ReadMessageHistory"),
      });
    }

    const message = await channel.messages.fetch(
      current.event.message_id,
    );

    await message.edit(view(current.event, current.signups));
  } catch (error) {
    console.error(`Failed to refresh group ${eventId}`, {
      guildId: current.event.guild_id,
      channelId: current.event.channel_id,
      messageId: current.event.message_id,
      code: error.code,
      status: error.status,
      message: error.message,
    });

    throw error;
  }
}

async function requireCreator(interaction, eventId) {
  const current = await getGroup(eventId);

  if (!current || current.event.creator_id !== interaction.user.id) {
    throw new Error("Only this group's creator can manage its roster.");
  }

  return current;
}

export async function createGroup(interaction) {
  if (!interaction.inGuild()) {
    throw new Error("Groups can only be created inside a Discord server.");
  }

  const dateInput = interaction.options.getString("date")?.trim();
  const timeInput = interaction.options.getString("server_time")?.trim();
  const formingNow = !dateInput && !timeInput;
  const timeTbc = Boolean(dateInput) && !timeInput;
  const description =
    interaction.options
      .getString("description")
      ?.trim()
      .slice(0, DESCRIPTION_LIMIT) || null;

  const unix = timeTbc
    ? roRDay(dateInput)
    : roRDateTime(dateInput || todayRoRDate(), timeInput || nowRoRTime());

  if (!unix) {
    throw new Error(
      "Invalid date or time. Use date YYYY-MM-DD and time 24-hour RoR server format, for example 2026-09-25 and 2000.",
    );
  }

  const pastDay = timeTbc && dateInput < todayRoRDate();
  const pastTime = !timeTbc && unix + 60 <= Math.floor(Date.now() / 1000);

  if (pastDay || pastTime) {
    throw new Error("The group date and time must be in the future.");
  }

  const connection = await db.connect();
  let event;

  const role = interaction.options.getString("your_role");
  const faction = interaction.options.getString("faction", true);

  try {
    await connection.query("BEGIN");

    event = (
      await connection.query(
        "INSERT INTO group_events (guild_id,channel_id,creator_id,title,faction,event_at,capacity,description,forming_now,time_tbc) VALUES ($1,$2,$3,$4,$5,to_timestamp($6),$7,$8,$9,$10) RETURNING *",
        [
          interaction.guildId,
          interaction.channelId,
          interaction.user.id,
          interaction.options.getString("title", true).trim(),
          faction,
          unix,
          interaction.options.getInteger("spaces") ?? 6,
          description,
          formingNow,
          timeTbc,
        ],
      )
    ).rows[0];

    await connection.query(
      `INSERT INTO group_signups
        (event_id, user_id, display_name, selected_roles, assigned_role)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        event.id,
        interaction.user.id,
        interaction.member.displayName,
        role ? [role] : [],
        role,
      ],
    );

    await connection.query("COMMIT");
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }

  const message = await interaction.reply({
    ...view(event, [
      {
        user_id: interaction.user.id,
        selected_roles: role ? [role] : [],
        assigned_role: role,
      },
    ]),
    fetchReply: true,
  });

  await db.query("UPDATE group_events SET message_id = $1 WHERE id = $2", [
    message.id,
    event.id,
  ]);
}

async function join(interaction, eventId, roles, client) {
  const connection = await db.connect();

  try {
    await connection.query("BEGIN");

    const event = (
      await connection.query(
        "SELECT * FROM group_events WHERE id = $1 FOR UPDATE",
        [eventId],
      )
    ).rows[0];

    if (!event || event.status !== "open") {
      throw new Error("This group is no longer open.");
    }

    const existing = (
      await connection.query(
        "SELECT id FROM group_signups WHERE event_id = $1 AND user_id = $2",
        [eventId, interaction.user.id],
      )
    ).rows[0];

    if (existing) {
      await connection.query(
        "UPDATE group_signups SET selected_roles = $1 WHERE id = $2",
        [roles, existing.id],
      );
    } else {
      const count = (
        await connection.query(
          "SELECT COUNT(*)::int AS total FROM group_signups WHERE event_id = $1",
          [eventId],
        )
      ).rows[0].total;

      if (count >= event.capacity) {
        throw new Error("That group filled before your signup was processed.");
      }

      await connection.query(
        `INSERT INTO group_signups
          (event_id, user_id, display_name, selected_roles)
         VALUES ($1, $2, $3, $4)`,
        [eventId, interaction.user.id, interaction.member.displayName, roles],
      );
    }

    await connection.query("COMMIT");
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }

  await refresh(client, eventId);
}

export async function handleGroupComponent(interaction, client) {
  const [scope, action, eventId, userId] = interaction.customId.split(":");

  if (scope !== "group") return false;

  if (interaction.isButton() && action === "join") {
    await interaction.reply({
      content:
        "Select every role you can play. You will still claim only one space.",
      components: [rolesMenu("group:roles:" + eventId)],
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  if (interaction.isStringSelectMenu() && action === "roles") {
    await join(interaction, eventId, interaction.values, client);

    await interaction.update({
      content: "You have claimed one space. Your role preferences are saved.",
      components: [],
    });
    return true;
  }

  if (interaction.isButton() && action === "leave") {
    const deleted = await db.query(
      `DELETE FROM group_signups
       WHERE event_id = $1 AND user_id = $2
       RETURNING id`,
      [eventId, interaction.user.id],
    );

    if (!deleted.rows[0]) {
      throw new Error("You are not in this group.");
    }

    await refresh(client, eventId);

    await interaction.reply({
      content: "You left the group and freed a space.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  if (interaction.isButton() && action === "manage") {
    const current = await requireCreator(interaction, eventId);

    await interaction.reply({
      ...manageView(current.event),
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  if (interaction.isButton() && action === "description") {
    const current = await requireCreator(interaction, eventId);

    await interaction.showModal(descriptionModal(current.event));
    return true;
  }

  if (interaction.isModalSubmit() && action === "description") {
    const current = await requireCreator(interaction, eventId);
    const description =
      interaction.fields
        .getTextInputValue("description")
        .trim()
        .slice(0, DESCRIPTION_LIMIT) || null;

    await db.query("UPDATE group_events SET description = $1 WHERE id = $2", [
      description,
      eventId,
    ]);

    current.event.description = description;
    await refresh(client, eventId);

    await interaction.update(
      manageView(
        current.event,
        description ? "Description saved." : "Description cleared.",
      ),
    );
    return true;
  }

  if (interaction.isButton() && ["add", "assign", "remove"].includes(action)) {
    await requireCreator(interaction, eventId);

    await interaction.update({
      content: "Select a player.",
      components: [
        new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder()
            .setCustomId("group:" + action + "user:" + eventId)
            .setPlaceholder("Select a player")
            .setMinValues(1)
            .setMaxValues(1),
        ),
      ],
    });
    return true;
  }

  if (interaction.isButton() && action === "toggle") {
    const current = await requireCreator(interaction, eventId);
    const status = current.event.status === "open" ? "closed" : "open";

    await db.query("UPDATE group_events SET status = $1 WHERE id = $2", [
      status,
      eventId,
    ]);

    await refresh(client, eventId);

    await interaction.update({
      content: "Signups are now " + status + ".",
      components: [],
    });
    return true;
  }

  if (interaction.isButton() && action === "cancel") {
    const current = await requireCreator(interaction, eventId);

    await db.query("DELETE FROM group_events WHERE id = $1", [eventId]);

    try {
      const channel = await client.channels.fetch(current.event.channel_id);

      if (channel?.isTextBased() && current.event.message_id) {
        const message = await channel.messages.fetch(current.event.message_id);
        await message.delete();
      }
    } catch (error) {
      console.error("Could not delete cancelled group message:", error);
    }

    await interaction.update({
      content: "Group cancelled and signup message deleted.",
      components: [],
    });
    return true;
  }

  if (
    interaction.isUserSelectMenu() &&
    ["adduser", "assignuser", "removeuser"].includes(action)
  ) {
    await requireCreator(interaction, eventId);

    const selectedId = interaction.values[0];

    if (action === "removeuser") {
      const deleted = await db.query(
        `DELETE FROM group_signups
         WHERE event_id = $1 AND user_id = $2
         RETURNING id`,
        [eventId, selectedId],
      );

      if (!deleted.rows[0]) {
        throw new Error("That player is not in this group.");
      }

      await refresh(client, eventId);

      await interaction.update({
        content: "Player removed.",
        components: [],
      });
      return true;
    }

    const next = action === "adduser" ? "addrole" : "assignrole";

    await interaction.update({
      content:
        action === "adduser"
          ? "Choose their confirmed role."
          : "Choose their final role.",
      components: [rolesMenu(`group:${next}:${eventId}:${selectedId}`, 1)],
    });
    return true;
  }

  if (
    interaction.isStringSelectMenu() &&
    ["addrole", "assignrole"].includes(action)
  ) {
    await requireCreator(interaction, eventId);

    const role = interaction.values[0];

    if (action === "assignrole") {
      const updated = await db.query(
        `UPDATE group_signups
         SET assigned_role = $1
         WHERE event_id = $2 AND user_id = $3
         RETURNING id`,
        [role, eventId, userId],
      );

      if (!updated.rows[0]) {
        throw new Error("That player is not in this group.");
      }
    } else {
      const connection = await db.connect();

      try {
        await connection.query("BEGIN");

        const event = (
          await connection.query(
            "SELECT * FROM group_events WHERE id = $1 FOR UPDATE",
            [eventId],
          )
        ).rows[0];

        const count = (
          await connection.query(
            "SELECT COUNT(*)::int AS total FROM group_signups WHERE event_id = $1",
            [eventId],
          )
        ).rows[0].total;

        if (!event || count >= event.capacity) {
          throw new Error("The group is already full.");
        }

        const member = await interaction.guild.members.fetch(userId);

        await connection.query(
          `INSERT INTO group_signups
            (event_id, user_id, display_name, selected_roles, assigned_role)
           VALUES ($1, $2, $3, $4, $5)`,
          [eventId, userId, member.displayName, [role], role],
        );

        await connection.query("COMMIT");
      } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
      } finally {
        connection.release();
      }
    }

    await refresh(client, eventId);

    await interaction.update({
      content:
        action === "addrole"
          ? "Player reserved as " + role + "."
          : "Assigned " + role + ".",
      components: [],
    });
    return true;
  }

  return true;
}
