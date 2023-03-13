const { createDBI } = require("@mostfeatured/dbi")

const dbi = createDBI("acord-standalone", {
  discord: {
    token: process.env.DISCORD_TOKEN,
    options: {
      intents: ["Guilds"]
    },
  },
  strict: false,
});

module.exports = dbi;