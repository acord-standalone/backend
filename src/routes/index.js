const { Router } = require('express');
const router = Router();

router.use('/auth', require('./auth/index.js'));

router.get('/', (req, res) => {
  res.send({ ok: true });
});



module.exports = router;