const axios = require("axios").default;

async function callbackCodeToAccessToken(code, redirectURI) {
  let response = await axios({
    method: "POST",
    url: "https://discord.com/api/oauth2/token",
    data: `client_id=${process.env.DISCORD_CLIENT_ID}&client_secret=${process.env.DISCORD_CLIENT_SECRET}&grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(redirectURI)}`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    responseType: "json"
  });
  return response.data.access_token;
}

async function getDiscordUserByAccessToken(accessToken) {
  return (await axios({
    method: "GET",
    url: "https://discord.com/api/users/@me",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    responseType: "json"
  })).data;
}

async function joinGuildByAccessToken(accessToken, guildId, userId) {
  return (await axios({
    method: "PUT",
    url: `https://discordapp.com/api/guilds/${guildId}/members/${userId}`,
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "content-type": "application/json",
    },
    data: JSON.stringify({
      "access_token": accessToken,
    }),
    responseType: "json"
  }))?.data;
}


module.exports = {
  callbackCodeToAccessToken,
  getDiscordUserByAccessToken,
  joinGuildByAccessToken
}