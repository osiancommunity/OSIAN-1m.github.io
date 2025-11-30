const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendOTP, sendWelcomeEmail, sendResetOTP } = require('../config/nodemailer');
const fs = require('fs');
function logApp(message) {
    try { fs.appendFileSync(require('path').join(__dirname, '..', 'app.log'), `[${new Date().toISOString()}] ${message}\n`); } catch (_) {}
}

/**
 * @desc    Register a new user and send OTP
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body || {};
        const emailNorm = (email || '').trim().toLowerCase();
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required.' });
        }
        if (typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        const existing = await User.findOne({ email: emailNorm });
        if (existing) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        const n = (name && name[0]) ? name[0].toLowerCase() : (emailNorm && emailNorm[0] ? emailNorm[0].toLowerCase() : 'u');
        const sum = (emailNorm || '').toLowerCase().split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const base = `@${n}${String(sum % 1000000).padStart(6, '0')}`;
        let username = `${base}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
        for (let i = 0; i < 5; i++) {
            const exists = await User.findOne({ username });
            if (!exists) break;
            username = `${base}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
        }

        const bcryptjs = require('bcryptjs');
        const salt = bcryptjs.genSaltSync(10);
        const hashed = bcryptjs.hashSync(password, salt);
        const user = new User({ name, email: emailNorm, password: hashed, username });
        user._skipHash = true;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;

        try {
            await user.save();
        } catch (err) {
            logApp(`Register save error: ${err && err.message}`);
            if (err && err.code === 11000) {
                const fields = err.keyValue || {};
                if (err.keyPattern && err.keyPattern.username) {
                    username = `${base}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
                    user.username = username;
                    await user.save();
                } else {
                    return res.status(400).json({ message: 'Duplicate field value', fields });
                }
            } else if (err && err.name === 'ValidationError') {
                const details = Object.values(err.errors || {}).map(e => e.message);
                return res.status(400).json({ message: 'Validation error', details });
            } else {
                throw err;
            }
        }

        // Non-blocking: try sending email, ignore failures
        sendOTP(user.email, otp).catch(e => console.error('Email sending error:', e));

        res.status(201).json({ success: true, message: 'Registration successful. Please check your email for the OTP.', userId: user._id });

    } catch (error) {
        console.error('Registration Error:', error);
        logApp(`Registration Error: ${error && error.message}`);
        if (error && error.stack) {
            console.error('Registration Error stack:', error.stack);
        }
        if (error && error.name === 'ValidationError') {
            const details = Object.values(error.errors || {}).map(e => e.message);
            return res.status(400).json({ message: 'Validation error', details });
        }
        const msg = error && (error.message || error.toString()) ? (error.message || error.toString()) : 'Server error during registration.';
        const payload = { message: msg, name: error && error.name, code: error && error.code, debug: { stack: error && error.stack, error } };
        res.status(500).json(payload);
    }
};

// Development-only: step-by-step registration diagnostics
exports.registerDebug = async (req, res) => {
    try {
        const { name, email, password } = req.body || {};
        const results = { input: { name, email, passwordLen: password ? password.length : null } };
        if (!name || !email || !password) {
            results.stage = 'validate';
            return res.status(400).json({ ok: false, results, message: 'Missing fields' });
        }
        const existing = await User.findOne({ email });
        results.existing = !!existing;
        if (existing) {
            return res.status(400).json({ ok: false, results, message: 'Email exists' });
        }
        const n = (name && name[0]) ? name[0].toLowerCase() : (email && email[0] ? email[0].toLowerCase() : 'u');
        const sum = (email || '').toLowerCase().split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const base = `@${n}${String(sum % 1000000).padStart(6, '0')}`;
        let username = `${base}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
        results.usernameBase = base;
        results.username = username;
        const bcryptjs = require('bcryptjs');
        const salt = bcryptjs.genSaltSync(10);
        const hashed = bcryptjs.hashSync(password, salt);
        const user = new User({ name, email, password: hashed, username });
        user._skipHash = true;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        try {
            await user.save();
            results.saved = true;
        } catch (err) {
            results.saved = false;
            results.error = { name: err && err.name, code: err && err.code, keyValue: err && err.keyValue, keyPattern: err && err.keyPattern, message: err && err.message };
            if (err && err.code === 11000 && err.keyPattern && err.keyPattern.username) {
                username = `${base}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
                user.username = username;
                await user.save();
                results.retryUsername = username;
                results.saved = true;
            } else {
                return res.status(500).json({ ok: false, results });
            }
        }
        return res.status(201).json({ ok: true, results, userId: user._id });
    } catch (e) {
        return res.status(500).json({ ok: false, message: 'Unhandled', error: { name: e && e.name, message: e && e.message } });
    }
};

/**
 * @desc    Verify OTP and log the user in
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
exports.verifyOtp = async (req, res) => {
        const { email, otp } = req.body;
        const emailNorm = (email || '').trim().toLowerCase();

    try {
        // 1. Find the user by email
        const user = await User.findOne({ email: emailNorm });

        // 2. Validate OTP
        if (!user) {
            return res.status(400).json({ message: 'User not found.' });
        }
        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        // 3. Update user to verified status
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // 4. Generate JWT token
        const payload = {
            user: {
                id: user.id,
                name: user.name,
                role: user.role
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-key-for-development', {
            expiresIn: '1d' // Token expires in 1 day
        });

        // 5. Send welcome email
        try {
            await sendWelcomeEmail(user.email, user.name);
        } catch (emailError) {
            console.error('Welcome email sending error:', emailError);
            // Don't block login if welcome email fails
        }

        // 6. Respond with token and user data (excluding sensitive info)
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
            profile: user.profile
        };

        res.status(200).json({
            success: true,
            message: 'Verification successful. Logged in.',
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('OTP Verification Error:', error);
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};

/**
 * @desc    Resend OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
exports.resendOtp = async (req, res) => {
    const { userId } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ message: 'User not found.' });
        }
        if (user.isVerified) {
            return res.status(400).json({ message: 'This account is already verified.' });
        }

        // Generate and save a new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        // Resend email
        try {
            await sendOTP(user.email, otp);
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            return res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
        }

        res.status(200).json({
            success: true,
            message: 'A new OTP has been sent to your email.'
        });

    } catch (error) {
        console.error('Resend OTP Error:', error);
        res.status(500).json({ message: 'Server error while resending OTP.' });
    }
};

/**
 * @desc    Login an existing user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
    const { email, password } = req.body;
    const emailNorm = (email || '').trim().toLowerCase();

    try {
        console.log(`Login attempt for email: ${emailNorm}`);

        // Validate input
        if (!email || !password) {
            console.log('Login failed: Missing email or password');
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Find user and include password for comparison
        let user;
        try {
            user = await User.findOne({ email: emailNorm }).select('+password');
        } catch (dbError) {
            console.error('Database error during user lookup:', dbError);
            return res.status(500).json({ message: 'Database error. Please try again later.' });
        }

        if (!user) {
            console.log(`Login failed: User not found for email: ${emailNorm}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        let isPasswordValid;
        try {
            isPasswordValid = bcrypt.compareSync(password, user.password);
        } catch (bcryptError) {
            console.error('Bcrypt error during password comparison:', bcryptError);
            return res.status(500).json({ message: 'Authentication error. Please try again later.' });
        }

        if (!isPasswordValid) {
            console.log(`Login failed: Invalid password for email: ${emailNorm}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // FIX: Check if the user's account is verified and active before allowing login.
        if (!user.isVerified) {
            console.log(`Login failed: Account not verified for email: ${emailNorm}`);
            return res.status(403).json({
                message: 'Account not verified. Please verify your OTP.',
                // Send userId so the frontend can offer to resend OTP.
                userId: user._id
            });
        }
        if (!user.isActive) {
            console.log(`Login failed: Account deactivated for email: ${emailNorm}`);
            return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
        }

        // Generate JWT
        let token;
        try {
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                console.warn('Warning: JWT_SECRET environment variable is missing! Using fallback secret - development only.');
            }
            const payload = { user: { id: user.id, name: user.name, role: user.role } };
            token = jwt.sign(payload, jwtSecret || 'fallback-secret-key-for-development', { expiresIn: '1d' });
        } catch (jwtError) {
            console.error('JWT signing error:', jwtError);
            return res.status(500).json({ message: 'Token generation error. Please try again later.' });
        }

        // Prepare user object for response
        const userResponse = { _id: user._id, name: user.name, email: user.email, username: user.username, role: user.role, profile: user.profile };

        console.log(`Login successful for email: ${emailNorm}, role: ${user.role}`);
        res.status(200).json({ success: true, token, user: userResponse });

    } catch (error) {
        console.error('Unexpected login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
};

/**
 * @desc    Change user password
 * @route   POST /api/auth/change-password
 * @access  Private
 */
module.exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        // We need to fetch the user with the password to compare it.
        const user = await User.findById(req.user.id).select('+password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        user.password = newPassword; // The 'pre-save' hook in User.js will hash it
        await user.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Failed to change password', error: error.message });
    }
};

// Development helper: create a demo verified user
exports.devCreateDemoUser = async (req, res) => {
    try {
        if ((process.env.NODE_ENV || 'development') !== 'development') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const email = 'demo.user@osian.io';
        let user = await User.findOne({ email });
        if (!user) {
            const username = '@d' + String(Date.now()).slice(-6);
            const salt = require('bcryptjs').genSaltSync(10);
            const hashed = require('bcryptjs').hashSync('Passw0rd!', salt);
            user = new User({ name: 'Demo User', email, password: hashed, username, isVerified: true });
            user._skipHash = true;
            await user.save();
        }
        res.json({ success: true, email, password: 'Passw0rd!', userId: user._id });
    } catch (e) {
        console.error('devCreateDemoUser error:', e);
        res.status(500).json({ message: 'Failed to create demo user' });
    }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    const emailNorm = (email || '').trim().toLowerCase();
    if (!emailNorm) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const user = await User.findOne({ email: emailNorm });
    if (!user) {
      return res.status(200).json({ message: 'If the email exists, an OTP has been sent' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    try {
      await sendResetOTP(user.email, otp);
    } catch (_) {}
    return res.status(200).json({ message: 'If the email exists, an OTP has been sent' });
  } catch (e) {
    return res.status(200).json({ message: 'If the email exists, an OTP has been sent' });
  }
};

exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    const emailNorm = (email || '').trim().toLowerCase();
    if (!emailNorm || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP and new password are required' });
    }
    const user = await User.findOne({ email: emailNorm }).select('+password');
    if (!user || !user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    if (user.resetOtp !== otp || user.resetOtpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();
    return res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to reset password' });
  }
};
