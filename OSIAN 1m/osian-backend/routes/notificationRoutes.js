const express = require('express');
const router = express.Router();
const { sendNotification, getNotifications, markAsRead, sendResultNotification } = require('../controllers/notificationController');
const { authenticateToken: protect, requireRole } = require('../middleware/authMiddleware');

const superadmin = requireRole(['superadmin']);
const admin = requireRole(['admin', 'superadmin']);

// @route   POST /api/notifications/send
// @desc    Send a notification to a group of users
// @access  Private/Superadmin
router.post('/send', protect, superadmin, sendNotification);

// @route   POST /api/notifications/send-result
// @desc    Send custom notification to selected users with result info
// @access  Private/Admin
router.post('/send-result', protect, admin, sendResultNotification);

// @route   GET /api/notifications
// @desc    Get all notifications for the logged-in user
// @access  Private
router.get('/', protect, getNotifications);

// @route   POST /api/notifications/read
// @desc    Mark one or more notifications as read
// @access  Private
router.post('/read', protect, markAsRead);

module.exports = router;
