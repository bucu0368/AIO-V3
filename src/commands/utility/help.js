const { CommandCategory, BotClient } = require("@src/structures");
const { EMBED_COLORS, SUPPORT_SERVER } = require("@root/config.js");
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  Message,
  ButtonBuilder,
  CommandInteraction,
  ApplicationCommandOptionType,
  ButtonStyle,
} = require("discord.js");
const { getCommandUsage, getSlashUsage } = require("@handlers/command");

const CMDS_PER_PAGE = 15;
const IDLE_TIMEOUT = 30;

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "help",
  description: "command help menu",
  category: "UTILITY",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    usage: "[command]",
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "command",
        description: "name of the command",
        required: false,
        type: ApplicationCommandOptionType.String,
      },
    ],
  },

  async messageRun(message, args, data) {
    let trigger = args[0];

    // !help
    if (!trigger) {
      const response = await getHelpMenu(message);
      const sentMsg = await message.safeReply(response);
      return waiter(sentMsg, message.author.id, data.prefix);
    }

    // check if command help (!help cat)
    const cmd = message.client.getCommand(trigger);
    if (cmd) {
      const embed = getCommandUsage(cmd, data.prefix, trigger);
      return message.safeReply({ embeds: [embed] });
    }

    // No matching command/category found
    await message.safeReply("No matching command found");
  },

  async interactionRun(interaction) {
    let cmdName = interaction.options.getString("command");

    // !help
    if (!cmdName) {
      const response = await getHelpMenu(interaction);
      const sentMsg = await interaction.followUp(response);
      return waiter(sentMsg, interaction.user.id);
    }

    // check if command help (!help cat)
    const cmd = interaction.client.slashCommands.get(cmdName);
    if (cmd) {
      const embed = getSlashUsage(cmd);
      return interaction.followUp({ embeds: [embed] });
    }

    // No matching command/category found
    await interaction.followUp("No matching command found");
  },
};

/**
 * @param {CommandInteraction} interaction
 */
async function getHelpMenu({ client, guild }) {
  // Menu Row
  const options = [];
  for (const [k, v] of Object.entries(CommandCategory)) {
    if (v.enabled === false) continue;
    options.push({
      label: v.name,
      value: k,
      description: `View commands in ${v.name} category`,
      emoji: v.emoji,
    });
  }

  const menuRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("help-menu")
      .setPlaceholder("Choose the command category")
      .addOptions(options)
  );

  // Support, Invite, and Vote Links
  const supportButton = new ButtonBuilder()
    .setLabel("Support Server")
    .setEmoji('1238430085795545139')
    .setStyle(ButtonStyle.Link)
    .setURL("https://discord.gg/sNGBwSeZYM");

  const inviteButton = new ButtonBuilder()
    .setLabel("Invite Me")
    .setStyle(ButtonStyle.Link)
    .setEmoji('1238429920573784074')
    .setURL("https://discord.com/oauth2/authorize?client_id=1382728865952301168&permissions=8&integration_type=0&scope=bot");

  const voteButton = new ButtonBuilder()
    .setLabel("Vote Me")
    .setStyle(ButtonStyle.Link)
    .setEmoji('1238429509795971116')
    .setURL("https://top.gg/servers/1143415296862978058/vote");

  const buttonsRow = new ActionRowBuilder().addComponents([supportButton, inviteButton, voteButton]);

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.BOT_EMBED)
    .setThumbnail(client.user.displayAvatarURL())
    .setImage(`https://cdn.discordapp.com/attachments/1335597135202353224/1383364012703748106/663f19346f72a4507e459a7b.gif?ex=684e85a2&is=684d3422&hm=68cb26dee5e311cf2a801503e17174ef97c4a3c5cfbff071f19cd57df46af4d7&`)
        .addFields([
        {
          name: "__**<a:aloadingh:1383351932634005585> Features [1-9]**__",
          value: `>>> <:points:1383352244090441820> Admin 
<:users:1383352371786154024> Anime 
<:hammer:1383352509258666004> Automod 
<:cash:1383352620848250961> Economy 
<:fun:1383352734845112452> Fun 
<:notification:1383352854898675752> Giveaway 
<:link:1383352965972361236> Invite 
<:bot:1383353083026739305> Information`,
          inline: true
        },
        {
          name: "__**<a:aloadingh:1383351932634005585> Features [10-18]**__",
          value: `>>> <:gear:1383353292653989899> Moderation 
<:fav_songs:1383353461231587368> Music 
<:lock:1383353719558639708> Owner 
<:com:1383353834000224267> Social 
<:chart:1383353931006083123> Statistics 
<:claim:1383354023263993876> Suggestions 
<:transcript:1383354116331540570> Ticket 
<:search:1383354207473631395> Utility `,
          inline: true
        }
        ])
    .setDescription(`<a:aloadingh:1383351932634005585> **Emerald GX is here to help. \n > It is a multipourpose bot for your discord. \n > It can help you to build a Super server.**
<a:aloadingh:1383351932634005585> __**BOT INFO**__
> <:circle:1383354480363307089> Prefix: \`/\`
> <:circle:1383354480363307089> Discord.js Version: \`v14.15.2\`
> <:circle:1383354480363307089> Running on \`Node v20.13.1\`
> <:circle:1383354480363307089> Made by \`friday.su\``);

  return {
    embeds: [embed],
    components: [menuRow, buttonsRow],
  };
}


/**
 * @param {Message} msg
 * @param {string} userId
 * @param {string} prefix
 */
const waiter = (msg, userId, prefix) => {
  const collector = msg.channel.createMessageComponentCollector({
    filter: (reactor) => reactor.user.id === userId && msg.id === reactor.message.id,
    idle: IDLE_TIMEOUT * 1000,
    dispose: true,
    time: 5 * 60 * 1000,
  });

  let arrEmbeds = [];
  let currentPage = 0;
  let menuRow = msg.components[0];
  let buttonsRow = msg.components[1];

  collector.on("collect", async (response) => {
    if (!["help-menu", "previousBtn", "nextBtn"].includes(response.customId)) return;
    await response.deferUpdate();

    switch (response.customId) {
      case "help-menu": {
        const cat = response.values[0].toUpperCase();
        arrEmbeds = prefix ? getMsgCategoryEmbeds(msg.client, cat, prefix) : getSlashCategoryEmbeds(msg.client, cat);
        currentPage = 0;

        // Buttons Row
        let components = [];
        buttonsRow.components.forEach((button) =>
          components.push(ButtonBuilder.from(button).setDisabled(arrEmbeds.length > 1 ? false : true))
        );

        buttonsRow = new ActionRowBuilder().addComponents(components);
        msg.editable && (await msg.edit({ embeds: [arrEmbeds[currentPage]], components: [menuRow, buttonsRow] }));
        break;
      }

      case "previousBtn":
        if (currentPage !== 0) {
          --currentPage;
          msg.editable && (await msg.edit({ embeds: [arrEmbeds[currentPage]], components: [menuRow, buttonsRow] }));
        }
        break;

      case "nextBtn":
        if (currentPage < arrEmbeds.length - 1) {
          currentPage++;
          msg.editable && (await msg.edit({ embeds: [arrEmbeds[currentPage]], components: [menuRow, buttonsRow] }));
        }
        break;
    }
  });

  collector.on("end", () => {
    if (!msg.guild || !msg.channel) return;
    return msg.editable && msg.edit({ components: [] });
  });
};

/**
 * Returns an array of message embeds for a particular command category [SLASH COMMANDS]
 * @param {BotClient} client
 * @param {string} category
 */
function getSlashCategoryEmbeds(client, category) {
  let collector = "";

  // For IMAGE Category
  if (category === "IMAGE") {
    client.slashCommands
      .filter((cmd) => cmd.category === category)
      .forEach((cmd) => (collector += `\`/${cmd.name}\``));

    const availableFilters = client.slashCommands
      .get("filter")
      .slashCommand.options[0].choices.map((ch) => ch.name)
      .join(", ");

    const availableGens = client.slashCommands
      .get("generator")
      .slashCommand.options[0].choices.map((ch) => ch.name)
      .join(", ");

    collector +=
      "**Available Filters:**\n" + `${availableFilters}` + `*\n\n**Available Generators**\n` + `${availableGens}`;

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setThumbnail(CommandCategory[category]?.image)
      .setAuthor({ name: `${category} Commands` })
      .setDescription(collector);

    return [embed];
  }

  // For REMAINING Categories
  const commands = Array.from(client.slashCommands.filter((cmd) => cmd.category === category).values());

  if (commands.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setThumbnail(CommandCategory[category]?.image)
      .setAuthor({ name: `${category} Commands` })
      .setDescription("No commands in this category");

    return [embed];
  }

  const arrSplitted = [];
  const arrEmbeds = [];

  while (commands.length) {
    let toAdd = commands.splice(0, commands.length > CMDS_PER_PAGE ? CMDS_PER_PAGE : commands.length);

    toAdd = toAdd.map((cmd) => {
      const subCmds = cmd.slashCommand.options?.filter((opt) => opt.type === "SUB_COMMAND");
      const subCmdsString = subCmds?.map((s) => s.name).join(", ");

      return `<:arrow_gx:1383364374344765522>\`/${cmd.name}\`\n <:circle:1383354480363307089> ${cmd.description} \n ${
        !subCmds?.length ? "" : `❯ **SubCommands [${subCmds?.length}]**: ${subCmdsString}\n`
      } `;
    });

    arrSplitted.push(toAdd);
  }

  arrSplitted.forEach((item, index) => {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setThumbnail(CommandCategory[category]?.image)
      .setAuthor({ name: `${category} Commands` })
      .setDescription(item.join("\n"))
      .setFooter({ text: `page ${index + 1} of ${arrSplitted.length}` });
    arrEmbeds.push(embed);
  });

  return arrEmbeds;
}

/**
 * Returns an array of message embeds for a particular command category [MESSAGE COMMANDS]
 * @param {BotClient} client
 * @param {string} category
 * @param {string} prefix
 */
function getMsgCategoryEmbeds(client, category, prefix) {
  let collector = "";

  // For IMAGE Category
  if (category === "IMAGE") {
    client.commands
      .filter((cmd) => cmd.category === category)
      .forEach((cmd) =>
        cmd.command.aliases.forEach((alias) => {
          collector += `\`${alias}\`, `;
        })
      );

    collector +=
      "\n\nYou can use these image commands in following formats\n" +
      `**${prefix}cmd:** Picks message authors avatar as image\n` +
      `**${prefix}cmd <@member>:** Picks mentioned members avatar as image\n` +
      `**${prefix}cmd <url>:** Picks image from provided URL\n` +
      `**${prefix}cmd [attachment]:** Picks attachment image`;

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setThumbnail(CommandCategory[category]?.image)
      .setAuthor({ name: `${category} Commands` })
      .setDescription(collector);

    return [embed];
  }

  // For REMAINING Categories
  const commands = client.commands.filter((cmd) => cmd.category === category);

  if (commands.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setThumbnail(CommandCategory[category]?.image)
      .setAuthor({ name: `${category} Commands` })
      .setDescription("No commands in this category");

    return [embed];
  }

  const arrSplitted = [];
  const arrEmbeds = [];

  while (commands.length) {
    let toAdd = commands.splice(0, commands.length > CMDS_PER_PAGE ? CMDS_PER_PAGE : commands.length);
    toAdd = toAdd.map((cmd) => `<:arrow_gx:1383364374344765522> \`${prefix}${cmd.name}\`\n <:circle:1383354480363307089> ${cmd.description} \n`);
    arrSplitted.push(toAdd);
  }

  arrSplitted.forEach((item, index) => {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setThumbnail(CommandCategory[category]?.image)
      .setAuthor({ name: `${category} Commands` })
      .setDescription(item.join("\n"))
      .setFooter({
        text: `page ${index + 1} of ${arrSplitted.length} | Type ${prefix}help <command> for more command information`,
      });
    arrEmbeds.push(embed);
  });

  return arrEmbeds;
}
