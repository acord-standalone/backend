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

  if (!userIdRegex.test(res.user.id)) return next();
  
  if (!user) {
    return res
      .status(404)
      .setHeader("Cache-Control", 360)
      .send({ ok: false, error: "User not found." });
  }

  if (res.user.id !== user.id) {
    return res
      .setHeader("Cache-Control", 360)
      .send({ ok: true, user });
  } else {
    return res
      .setHeader("Cache-Control", 30)
      .send({ ok: true, user });
  }
});

module.exports = router;