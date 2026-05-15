const express = require('express');
const controller = require('./controller');
const router = express.Router();

router.get('/students', controller.searchStudents);

module.exports = router;
