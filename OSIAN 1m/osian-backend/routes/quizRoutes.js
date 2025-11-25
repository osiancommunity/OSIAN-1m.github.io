const express = require('express');
const router = express.Router();
const {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  getQuizStats,
  getCategories,
  getAdminQuizzes,
  getUserRegisteredQuizzes
} = require('../controllers/quizController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Public routes
router.get('/categories', getCategories);
router.get('/', authenticateToken, getQuizzes);

// Admin routes
router.get('/admin', authenticateToken, requireRole(['admin', 'superadmin']), getAdminQuizzes);

// Public routes
router.get('/:id', authenticateToken, getQuizById);

// Protected routes
router.post('/', authenticateToken, requireRole(['admin', 'superadmin']), createQuiz);
router.put('/:id', authenticateToken, updateQuiz);
router.delete('/:id', authenticateToken, requireRole(['admin', 'superadmin']), deleteQuiz);
router.get('/:id/stats', authenticateToken, getQuizStats);

// User registered quizzes
router.get('/user/registered', authenticateToken, getUserRegisteredQuizzes);

module.exports = router;
