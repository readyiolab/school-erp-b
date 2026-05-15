const express = require('express');
const controller = require('./controller');
const router = express.Router();

router.post('/generate/:studentId', controller.generate);
router.post('/bulk-generate', controller.bulkGenerate);
router.get('/:studentId', controller.getByStudent);

module.exports = router;
