const express = require('express');
const router = express.Router();

const authRoutes = require('./auth/route');
const schoolRoutes = require('./school/route');
const admissionRoutes = require('./admission/route');
const studentRoutes = require('./student/route');
const feeStructureRoutes = require('./fee-structure/route');
const feeRoutes = require('./fees/route');
const receiptRoutes = require('./receipt/route');
const dashboardRoutes = require('./dashboard/route');
const searchRoutes = require('./search/route');
const reportRoutes = require('./reports/route');
const promotionRoutes = require('./promotion/route');
const auditRoutes = require('./audit/route');
const idCardRoutes = require('./id-card/route');
const payrollRoutes = require('./payroll/route');
const academicRoutes = require('./academic/route');

// Basic root route
router.get('/', (req, res) => {
  res.json({ message: 'Welcome to the School ERP API' });
});

// Mount modules
router.use('/auth', authRoutes);
router.use('/school', schoolRoutes);
router.use('/admissions', admissionRoutes);
router.use('/students', studentRoutes);
router.use('/fee-structures', feeStructureRoutes);
router.use('/fees', feeRoutes);
router.use('/receipts', receiptRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/search', searchRoutes);
router.use('/reports', reportRoutes);
router.use('/promotions', promotionRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/id-cards', idCardRoutes);
router.use('/payroll', payrollRoutes);
router.use('/academic', academicRoutes);

module.exports = router;
