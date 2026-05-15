const express = require('express');
const controller = require('./controller');
const router = express.Router();

router.get('/summary', controller.getSummary);
router.get('/class-strength', controller.getClassStrength);
router.get('/section-occupancy', controller.getSectionOccupancy);
router.get('/revenue-chart', controller.getRevenueChart);

module.exports = router;
