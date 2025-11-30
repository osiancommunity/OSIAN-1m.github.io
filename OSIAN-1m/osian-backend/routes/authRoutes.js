const express = require('express');
const router = express.Router();
const { register, verifyOtp, resendOtp, login, changePassword, devCreateDemoUser, registerDebug, forgotPassword, resetPasswordWithOtp } = require('../controllers/authController');
const { authenticateToken: protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/register-dbg', registerDebug);
// Temporary diagnostic endpoint
router.post('/register2', (req, res) => {
  res.status(200).json({ ok: true, body: req.body });
});
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.post('/dev-create-demo', devCreateDemoUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordWithOtp);

// Protected routes
router.post('/change-password', protect, changePassword);

module.exports = router;
