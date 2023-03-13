const prisma = require("../../../../db");
const dbi = require("../../dbi");
const {ButtonStyle} = require("discord.js")
dbi.register(({ ChatInput, ChatInputOptions, Modal, Button }) => {

  ChatInput({
    name: "badge create",
    description: "Create a badge.",
    async onExecute({ interaction }) {
      const badge = await prisma.badge.create({
        data: {
          name: interaction.options.getString("name"),
          display_name: interaction.options.getString("name"),
        }
      });

      await interaction.deferReply({ ephemeral: true });
      interaction.editReply(getBadgeManager(badge.id));

    },
    options: [
      ChatInputOptions.string({
        name: "name",
        description: "The name of the badge.",
        required: true,
      }),
    ]
  });

  Button({
    name: "badge:edit",
    async onExecute({ interaction, data }) {},
    options: {
      style: ButtonStyle.Primary,
      label: "Edit",
      disabled: false
    }
  })

  function getBadgeManager(badgeId) {

  }

});