const express = require('express');
const router = express.Router();
const { getSuperAdminKpis, getAdminKpis, getChartData } = require('../controllers/analyticsController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.get('/superadmin-kpis', authenticateToken, requireRole(['superadmin']), getSuperAdminKpis);
router.get('/admin-kpis', authenticateToken, requireRole(['admin','superadmin']), getAdminKpis);
router.get('/charts', authenticateToken, requireRole(['superadmin','admin']), getChartData);

module.exports = router;
