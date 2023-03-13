const { Router } = require('express');
const prisma = require('../../../db.js');
const router = Router();
const userIdRegex = /^[0-9]{18,19}$/;
router.use('/features', require('./features/index.js'));

router.get('/:userId', async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: {
      id: req.params.userId,
    },
    select: {
      id: true,
      data: {
        select: {
          key: true,
          value: true,
        }
      }
    }
  });

  user.data = user.data.reduce((acc, cur) => {
    acc[cur.key] = cur.value;
    return acc;
  }, {});

  if (!userIdRegex.test(req.user.id)) return next();
  
  if (!user) {
    return res
      .status(404)
      .setHeader("Cache-Control", "max-age=360")
      .send({ ok: false, error: "User not found." });
  }

  if (req.user.id !== user.id) {
    return res
      .setHeader("Cache-Control", "max-age=360")
      .send({ ok: true, data: user });
  } else {
    return res
      .setHeader("Cache-Control", "max-age=30")
      .send({ ok: true, data: user });
  }
});

module.exports = router;