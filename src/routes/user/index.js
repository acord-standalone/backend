const { Router } = require('express');
const router = Router();

router.use('/features', require('./features/index.js'));

module.exports = router;