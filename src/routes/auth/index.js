const { Router } = require('express');
const { callbackCodeToAccessToken, joinGuildByAccessToken, getDiscordUserByAccessToken } = require('../../lib/discord.js');
const router = Router();
const crypto = require('crypto');
const prisma = require('../../../db.js');

function buildRedirectURI(hostname) {
  return `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=https://${hostname}/auth/callback&response_type=code&scope=identify%20guilds.join&state=${hostname}`
}

router.get('/', (req, res) => {
  if (!req.query.hostname) return res.send({ ok: false, error: 'No hostname provided.' });
  res.redirect(buildRedirectURI(req.query.hostname));
});

router.get('/callback/step2', async (req, res) => {
  if (!req.query.access_token) return res.send({ ok: false, error: "No access token provided." });
  const accessToken = req.query.access_token;

  const user = await getDiscordUserByAccessToken(accessToken).catch(() => { });
  if (!user) return res.send({ ok: false, error: 'Invalid user.' });

  console.log(user);

  const acordToken = crypto.randomUUID().replaceAll('-', '');

  await prisma.user.upsert({
    where: {
      id: user.id
    },
    update: {
      acord_token: acordToken,
      discord_access_token: accessToken,
    },
    create: {
      id: user.id,
      acord_token: acordToken,
      discord_access_token: accessToken,
    }
  });

  try {
    await joinGuildByAccessToken(accessToken, process.env.DISCORD_GUILD_ID, user.id);
  } catch { };

  res.redirect(`/static/callback/step3?data=${Buffer.from(JSON.stringify({ userId: user.id, acordToken }), "utf-8").toString("base64")}`);
});

router.get('/exchange', async (req, res) => {
  if (!req.query.acordToken) return res.send({ ok: false, error: 'No acordToken provided.' });
  const user = await prisma.user.findUnique({
    where: {
      acord_token: req.query.acordToken
    }
  });
  if (!user) return res.send({ ok: false, error: 'Invalid acordToken provided.' });

  res.send({ ok: true, data: { id: user.id } });
});


module.exports = router;