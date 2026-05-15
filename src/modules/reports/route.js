const express = require('express');
const controller = require('./controller');
const router = express.Router();

// GET /reports/:type?from=...&to=...&format=pdf|excel&class=5&section=A
router.get('/:type', controller.generateReport);

module.exports = router;
