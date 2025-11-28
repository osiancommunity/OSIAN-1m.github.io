const express = require('express');
const router = express.Router();
const mentorshipController = require('../controllers/mentorshipController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes (for users to view videos)
router.get('/videos', mentorshipController.getMentorshipVideos);

// Protected routes (admin and superadmin)
router.get('/admin/videos', authMiddleware.authenticateToken, authMiddleware.requireRole(['admin', 'superadmin']), mentorshipController.getMentorshipVideosAdmin);
router.post('/admin/videos', authMiddleware.authenticateToken, authMiddleware.requireRole(['admin', 'superadmin']), mentorshipController.createMentorshipVideo);
router.put('/admin/videos/:id', authMiddleware.authenticateToken, authMiddleware.requireRole(['admin', 'superadmin']), mentorshipController.updateMentorshipVideo);
router.delete('/admin/videos/:id', authMiddleware.authenticateToken, authMiddleware.requireRole(['admin', 'superadmin']), mentorshipController.deleteMentorshipVideo);

// Increment views (public)
router.post('/videos/:id/views', mentorshipController.incrementVideoViews);

module.exports = router;
