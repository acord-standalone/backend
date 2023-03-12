const { Router } = require('express');
const router = Router();
const rateLimit = require('express-rate-limit').default;

const limiter = rateLimit({
  windowMs: 10000,
  max: 1000,
  keyGenerator: (request, response) => request.header("x-forwared-for")
});


router.use('/auth', require('./auth/index.js'));
router.use('/user', limiter, require("../middlewares/user-auth"), require('./user/index.js'));

router.get('/', (req, res) => {
  res.send({ ok: true });
});



module.exports = router;