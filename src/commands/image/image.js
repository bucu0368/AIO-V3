const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { EMBED_COLORS } = require("@root/config.js");
const axios = require("axios");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "image",
  description: "Image generation and manipulation commands",
  category: "IMAGE",
  botPermissions: ["EmbedLinks"],
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "generate",
        description: "Generate an image from a text prompt",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "prompt",
            description: "The text prompt to generate an image from",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
        ],
      },
    ],
  },

  async interactionRun(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "generate") {
      const prompt = interaction.options.getString("prompt");
      
      // Send loading embed
      const loadingEmbed = new EmbedBuilder()
        .setColor(EMBED_COLORS.BOT_EMBED)
        .setTitle("🎨 Generating Image...")
        .setDescription(`**Prompt:** ${prompt}\n\n⏳ Please wait while I create your image...`)
        .setTimestamp()
        .setFooter({ 
          text: `Requested by ${interaction.user.username}`, 
          iconURL: interaction.user.displayAvatarURL() 
        });

      await interaction.followUp({ embeds: [loadingEmbed] });

      try {
        // Make API request
        const encodedPrompt = encodeURIComponent(prompt);
        const response = await axios.get(`https://bucu-api.vercel.app/image?prompt=${encodedPrompt}`, {
          headers: {
            'x-api-key': 'bucu'
          }
        });

        const data = response.data;

        // Create result embed
        const resultEmbed = new EmbedBuilder()
          .setColor(EMBED_COLORS.BOT_EMBED)
          .setTitle(data.message || "Image Generated Successfully")
          .setDescription(`**Prompt:** ${prompt}\n**Success:** ${data.success || 'true'}`)
          .setImage(data.image)
          .setTimestamp()
          .setFooter({ 
            text: `Requested by ${interaction.user.username}`, 
            iconURL: interaction.user.displayAvatarURL() 
          });

        await interaction.editReply({ embeds: [resultEmbed] });

      } catch (error) {
        console.error("Image generate command error:", error);
        
        const errorEmbed = new EmbedBuilder()
          .setColor(EMBED_COLORS.ERROR)
          .setTitle("❌ Failed to Generate Image")
          .setDescription(`**Prompt:** ${prompt}\n\nSorry, there was an error generating your image. Please try again later.`)
          .setTimestamp()
          .setFooter({ 
            text: `Requested by ${interaction.user.username}`, 
            iconURL: interaction.user.displayAvatarURL() 
          });

        await interaction.editReply({ embeds: [errorEmbed] });
      }
    }
  },
};