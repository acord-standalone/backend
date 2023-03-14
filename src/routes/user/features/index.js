
const { Router } = require('express');
const Joi = require('joi');
const prisma = require('../../../../db');
const formatifyFeatureDurations = require('../../../other/formatifyFeatureDurations');
const router = Router();
const degRegex = /^([0-9]{1,3})deg$/;

const patchColorNameScheme = Joi.object({
  points: Joi.array().items(Joi.object({
    color: Joi.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).required(),
    percent: Joi.number().min(0).max(100).required(),
  })),
  angle: Joi.string().regex(degRegex),
  type: Joi.string().valid("linear", "radial"),
  enabled: Joi.boolean(),
});

const patchProfileMusicScheme = Joi.object({
  trackId: Joi.string(),
  positionMs: Joi.number().min(0).max(28_800_000),
  enabled: Joi.boolean(),
  volume: Joi.number().min(0).max(100),
});


router.get('/profile/:userId', async (req, res) => {
  const userId = req.params.userId;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      features: {
        where: {
          enabled: true,
          current_duration: {
            consume_end: {
              gt: new Date()
            }
          },
          type: {
            in: req.query.include?.split(",").map(i => i.trim()).slice(0, 20) ?? [],
          }
        },
        select: {
          id: true,
          type: true,
          data: true,
          feature_id: true,
          enabled: true,
          ...((req.query.durations === 'true') ? {
            current_duration_id: true,
            durations: {
              select: {
                consume_start: true,
                consume_end: true,
                duration: true,
              }
            }
          } : {})
        }
      },
      last_exchange: true,
    }
  });

  if (!user) return res.status(404).setHeader("Cache-Control", "max-age=360").send({ ok: false, error: "User not found." });

  await formatifyFeatureDurations({ userId })

  if (req.query.durations === 'true' && req.user.id !== user.id) return res.status(401).setHeader("Cache-Control", "max-age=360").send({ ok: false, error: "You can't view other users' features." });

  if (req.query.durations === 'true' && user?.features?.length) user.features = user.features.map(formatDuration);

  user.features.push({
    id: -1,
    type: "badge",
    feature_id: 0,
    enabled: true,
    current_duration_id: -1,
    durations: {
      start: user.last_exchange.getTime(),
      end: user.last_exchange.getTime() + (86400000 * 7),
      now: Date.now(),
    }
  });

  if (req.user.id === user.id) res.setHeader("Cache-Control", "max-age=60");
  else res.setHeader("Cache-Control", "max-age=300");
  res.send({ ok: true, data: user });
});

router.get('/badge/:badgeId', async (req, res) => {
  const badgeId = req.params.badgeId;

  const badge = await prisma.badge.findUnique({
    where: {
      id: badgeId,
    }
  });

  if (!badge) return res.status(404).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Badge not found." });

  res.setHeader("Cache-Control", "max-age=600").send({ ok: true, data: badge });
});

router.get('/me/item/:featureId/durations', async (req, res) => {
  const userId = req.user.id;
  const featureId = req.params.featureId;

  const feature = await prisma.userFeature.findUnique({
    where: {
      id: featureId,
    },
    select: {
      user_id: true,
      durations: {
        select: {
          consume_start: true,
          consume_end: true,
          duration: true,
          id: true,
        }
      }
    }
  });

  if (!feature) return res.status(404).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Feature not found." });

  if (feature.user_id !== userId) return res.status(403).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "You don't have permission to access this feature." });

  res.setHeader("Cache-Control", "max-age=60").send({ ok: true, data: feature });
});

router.patch('/me/item/:featureId', async (req, res) => {

  const feature = await prisma.userFeature.findUnique({
    where: {
      id: req.params.featureId,
    },
  });

  if (!feature) return res.status(404).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Feature not found." });

  if (feature.user_id !== req.user.id) return res.status(403).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "You don't have permission to access this feature." });

  switch (feature.type) {

    case "colored_name": {

      try {
        const { colors, gradiant_direction, type, enabled } = (await patchColorNameScheme.validateAsync(req.body)) && req.body;

        const data = feature.data;

        if (colors) data.colors = colors;
        if (gradiant_direction) data.gradiant_direction = gradiant_direction;
        if (type) data.type = type;

        const responseData = await prisma.userFeature.update({
          where: { id: feature.id, },
          data: { data, enabled: typeof enabled === "boolean" ? enabled : feature.enabled }
        }).catch(() => {});

        res.send({ ok: true, data: responseData });
        
      } catch (e) {
        res.status(400)
        // .setHeader("Cache-Control", "max-age=3600") // TODO: Add cache control
        .send({ ok: false, error: e.message });
      }
      break;
    }

    case "hat": {
      const { enabled } = req.body;

      if (typeof enabled !== "boolean") return res.status(400).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Request body.enabled is missing." });

      if (enabled) {
        await prisma.userFeature.updateMany({
          where: {
            user_id: req.user.id,
            type: "hat",
          },
          data: {
            enabled: false
          }
        })
      }

      const responseData = await prisma.userFeature.update({
        where: { id: feature.id, },
        data: { enabled }
      }).catch(() => {});

      res.send({ ok: true, data: responseData });
      break;
    }

    case "profile_music": {

      try {
        const { trackId, positionMs, enabled, volume } = (await patchProfileMusicScheme.validateAsync(req.body)) && req.body;

        const data = feature.data;

        if (trackId) data.trackId = trackId;
        if (positionMs) data.positionMs = positionMs;
        if (volume) data.volume = volume;

        const responseData = await prisma.userFeature.update({
          where: { id: feature.id, },
          data: { data, enabled: typeof enabled === "boolean" ? enabled : feature.enabled }
        }).catch(() => {});

        res.send({ ok: true, data: responseData });
      } catch (e) {
        res.status(400)
        // .setHeader("Cache-Control", "max-age=3600") // TODO: Add cache control
        .send({ ok: false, error: e.message });
      }

      break;
    }

    default: {
      const { enabled } = req.body;

      if (typeof enabled !== "boolean") return res.status(400).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Request body.enabled is missing." });

      const responseData = await prisma.userFeature.update({
        where: { id: feature.id, },
        data: { enabled }
      }).catch(() => {});

      res.send({ ok: true, data: responseData });
      break;
    }

  }

});

function formatDuration(feature) {
  const now = Date.now();
  const start = feature.durations.reduce((prev, current) => ((prev.consume_start) && (prev.consume_start < current.consume_start)) ? prev : current)?.consume_start?.getTime() ?? now;
  const end = feature.durations.reduce((prev, current) => {
    if (current.consume_end && current.consume_start) {
      const duration = Math.max(0, current.consume_end.getTime() - now);
      return prev + duration;
    } else {
      return prev + Number(current.duration);
    }
  }, 0) + now;
  return {
    ...feature,
    durations: {
      start,
      now,
      end,
    },
  }
}

module.exports = router;