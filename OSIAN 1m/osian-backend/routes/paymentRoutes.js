const express = require('express');
const router = express.Router();
const {
  getRazorpayKey,
  createOrder,
  verifyPayment,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/paymentController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Protected routes
router.post('/create-order', authenticateToken, createOrder);
router.post('/verify-payment', authenticateToken, verifyPayment);
router.get('/orders', authenticateToken, getUserOrders);
router.get('/orders/:orderId', authenticateToken, getOrderById);
router.get('/get-key', authenticateToken, getRazorpayKey);

// Admin routes
router.get('/admin/orders', authenticateToken, requireRole('admin', 'superadmin'), getAllOrders);
router.put('/admin/orders/:orderId/status', authenticateToken, requireRole('admin', 'superadmin'), updateOrderStatus);

module.exports = router;
