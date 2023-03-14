const prisma = require("../../../../db");
const dbi = require("../../dbi");
const { ButtonStyle } = require("discord.js")
dbi.register(({ ChatInput, ChatInputOptions, Modal, Button }) => {

  ChatInput({
    name: "badge create",
    description: "Create a badge.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const badge = await prisma.badge.create({
        data: {
          name: interaction.options.getString("name"),
          display_name: interaction.options.getString("name"),
          image: "https://raw.githubusercontent.com/acord-standalone/assets/main/badges/member.svg"
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
    async onExecute({ interaction, data }) {
      const [badgeId, key] = data[0];
      const badge = await prisma.badge.findUnique({
        where: {
          id: badgeId
        },
        select: {
          [key]: true
        }
      });

      const naming = {
        display_name: "Display Name",
        name: "Name",
        image: "Image"
      }

      await interaction.showModal(dbi.interaction("badge:edit:modal").toJSON({
        reference: {
          data: [badgeId, key]
        },
        overrides: {
          components: [
            {
              components: [
                {
                  value: badge[key],
                  label: naming[key]
                }
              ]
            }
          ]
        }
      }));
    },
    options: {
      style: ButtonStyle.Primary,
      label: "Edit",
      disabled: false
    }
  });

  Modal({
    name: "badge:edit:modal",
    async onExecute({ interaction, data }) {
      const [badgeId, key] = data[0];
      const value = interaction.fields.getTextInputValue("badge:edit:input");
      await prisma.badge.update({
        where: {
          id: badgeId
        },
        data: {
          [key]: value
        }
      });

      interaction.editReply(await getBadgeManager(badgeId));
    },
    options: {
      title: "Edit Badge",
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              customId: "badge:edit:input",
              placeholder: "Display Name",
              style: 1,
              label: "Display Name",
              required: true,
            }
          ]
        }
      ]
    }
  });

  ChatInput({
    name: "badge edit",
    description: "Edit a badge.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const badgeId = interaction.options.getInteger("badge");
      await interaction.deferReply({ ephemeral: true });
      const badge = await prisma.badge.findUnique({
        where: {
          id: badgeId
        }
      });
      if (!badge) return interaction.editReply("Badge not found.");
      interaction.editReply(await getBadgeManager(badgeId));
    },
    options: [
      ChatInputOptions.integerAutocomplete({
        name: "badge",
        description: "The badge to edit.",
        required: true,
        onComplete: async ({ value }) => {
          const badge = await prisma.badge.findMany({
            where: {
              name: {
                contains: value
              }
            },
            select: {
              id: true,
              name: true
            }
          });

          return badge.map(badge => ({
            name: badge.name,
            value: badge.id
          }));
        },
      })
    ]
  })

  async function getBadgeManager(badgeId) {

    const badge = await prisma.badge.findUnique({
      where: {
        id: badgeId
      }
    });

    return {
      embeds: [{
        title: badge.display_name,
        description: badge.name,
        fields: [{
          name: "Image",
          value: badge.image
        }],
        thumbnail: { url: badge.image },
      }],
      components: [{
        type: 1,
        components: [
          dbi.interaction("badge:edit").toJSON({
            overrides: {
              style: ButtonStyle.Primary,
              label: "Edit Display Name",
              disabled: false
            },
            reference: {
              data: [badgeId, "display_name"]
            }
          }),
          dbi.interaction("badge:edit").toJSON({
            overrides: {
              style: ButtonStyle.Primary,
              label: "Edit Image",
              disabled: false
            },
            reference: {
              data: [badgeId, "image"]
            }
          })
        ]
      }]
    }
  };


});