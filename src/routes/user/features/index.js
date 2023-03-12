
const { Router } = require('express');
const prisma = require('../../../../db');
const router = Router();

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
          type: true,
          data: true,
          feature_id: true,
          enabled: true,
          ...((req.query.format === 'true') ? {
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
      }
    }
  });

  if (!user) return res.status(404).setHeader("Cache-Control", 360).send({ ok: false, error: "User not found." });

  if (req.query.format === 'true' && user?.features?.length) user.features = user.features.map(formatDuration);

  res.setHeader("Cache-Control", 60).send({ ok: true, user });
});

router.get('/badge/:badgeId', async (req, res) => {
  const badgeId = req.params.badgeId;

  const badge = await prisma.badge.findUnique({
    where: {
      id: badgeId,
    }
  });

  if (!badge) return res.status(404).setHeader("Cache-Control", 3600).send({ ok: false, error: "Badge not found." });

  res.setHeader("Cache-Control", 600).send({ ok: true, badge });
});

router.get('/feature/:featureId/durations', async (req, res) => {
  const userId = res.user.id;
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

  if (!feature) return res.status(404).setHeader("Cache-Control", 3600).send({ ok: false, error: "Feature not found." });

  if (feature.user_id !== userId) return res.status(403).setHeader("Cache-Control", 3600).send({ ok: false, error: "You don't have permission to access this feature." });

  res.setHeader("Cache-Control", 60).send({ ok: true, feature });
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