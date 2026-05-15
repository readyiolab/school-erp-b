const express = require('express');
const controller = require('./controller');
const router = express.Router();

router.get('/preview', controller.preview);
router.post('/promote', controller.promote);
router.get('/history', controller.history);

module.exports = router;
