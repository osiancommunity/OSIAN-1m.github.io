const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken: protect, requireRole: authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Route to get all users (Admin/Superadmin only)
router.get('/', protect, authorize(['admin', 'superadmin']), userController.getUsers);

// Route to get all admins (Superadmin only)
router.get('/admins', protect, authorize(['superadmin']), userController.getAdmins);

// Route to update a user's role (Superadmin only) - This is the new endpoint
router.put('/role', protect, authorize(['superadmin']), userController.updateUserRole);

// Route to activate/deactivate a user (Superadmin only)
router.put('/status', protect, authorize(['superadmin']), userController.updateUserStatus);

// Other user-related routes (e.g., profile, stats)
// FIX: The getProfile and updateProfile routes were missing.
router.get('/profile', protect, userController.getProfile); // GET endpoint to fetch profile
router.put('/profile', protect, upload.single('avatar'), userController.updateProfile); // PUT with multer middleware
router.get('/stats', protect, userController.getUserStats);
router.get('/stats/:id', protect, userController.getUserStats);

// Route to get user by ID (Admin/Superadmin only)
router.get('/:id', protect, authorize(['admin', 'superadmin']), userController.getUserById);

// Route to update a user's general information (Admin/Superadmin can update others, user can update self)
router.put('/:id', protect, authorize(['admin', 'superadmin']), userController.updateUser);

// Route to delete a user (Superadmin only)
router.delete('/:id', protect, authorize(['superadmin']), userController.deleteUser);

module.exports = router;
