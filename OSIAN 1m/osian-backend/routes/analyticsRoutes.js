const express = require('express');
const router = express.Router();
const { getSuperAdminKpis, getAdminKpis, getChartData } = require('../controllers/analyticsController');
const { protect, admin, superadmin } = require('../middleware/authMiddleware');

// @route   GET /api/analytics/superadmin-kpis
router.get('/superadmin-kpis', protect, superadmin, getSuperAdminKpis);

// @route   GET /api/analytics/admin-kpis
router.get('/admin-kpis', protect, admin, getAdminKpis);

// @route   GET /api/analytics/charts
router.get('/charts', protect, superadmin, getChartData);

module.exports = router;
