const express = require('express');
const authRoutes = require('./modules/auth/route');
const studentRoutes = require('./modules/student/route');
const admissionRoutes = require('./modules/admission/route');
const feeRoutes = require('./modules/fees/route');
const receiptRoutes = require('./modules/receipt/route');
const schoolRoutes = require('./modules/school/route');
const feeStructureRoutes = require('./modules/fee-structure/route');
const dashboardRoutes = require('./modules/dashboard/route');
const searchRoutes = require('./modules/search/route');
const reportRoutes = require('./modules/reports/route');
const promotionRoutes = require('./modules/promotion/route');
const auditRoutes = require('./modules/audit/route');
const idCardRoutes = require('./modules/id-card/route');
const payrollRoutes = require('./modules/payroll/route');
const academicRoutes = require('./modules/academic/route');

const authMiddleware = require('./middleware/authMiddleware');
const schoolMiddleware = require('./middleware/schoolMiddleware');

const router = express.Router();

// Public auth routes
router.use('/auth', authRoutes);

// All routes below require authentication + school context
router.use(authMiddleware, schoolMiddleware);

// Core modules
router.use('/students', studentRoutes);
router.use('/admissions', admissionRoutes);
router.use('/fees', feeRoutes);
router.use('/receipts', receiptRoutes);

// New modules
router.use('/school', schoolRoutes);
router.use('/fee-structures', feeStructureRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/search', searchRoutes);
router.use('/reports', reportRoutes);
router.use('/promotions', promotionRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/id-cards', idCardRoutes);
router.use('/payroll', payrollRoutes);
router.use('/academic', academicRoutes);

module.exports = router;
