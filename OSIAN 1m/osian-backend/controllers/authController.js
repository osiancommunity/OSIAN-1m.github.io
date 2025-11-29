const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { sendOTP, sendWelcomeEmail } = require('../config/nodemailer');

/**
 * @desc    Register a new user and send OTP
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // 1. Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        // 2. Create a new user instance
        user = new User({
            name,
            email,
            password // The pre-save hook in the model will hash this
        });

        // 3. Generate and save OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes

        await user.save();

        // 4. Send OTP via email
        try {
            await sendOTP(user.email, otp);
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            // Even if email fails, don't block registration. User can resend OTP.
        }

        // 5. Respond to frontend
        // The frontend needs the userId to call the verify-otp endpoint
        res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email for the OTP.',
            userId: user._id
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
};

/**
 * @desc    Verify OTP and log the user in
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    try {
        // 1. Find the user by email
        const user = await User.findOne({ email });

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

    try {
        console.log(`Login attempt for email: ${email}`);

        // Validate input
        if (!email || !password) {
            console.log('Login failed: Missing email or password');
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Find user and include password for comparison
        let user;
        try {
            user = await User.findOne({ email }).select('+password');
        } catch (dbError) {
            console.error('Database error during user lookup:', dbError);
            return res.status(500).json({ message: 'Database error. Please try again later.' });
        }

        if (!user) {
            console.log(`Login failed: User not found for email: ${email}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        let isPasswordValid;
        try {
            isPasswordValid = await bcrypt.compare(password, user.password);
        } catch (bcryptError) {
            console.error('Bcrypt error during password comparison:', bcryptError);
            return res.status(500).json({ message: 'Authentication error. Please try again later.' });
        }

        if (!isPasswordValid) {
            console.log(`Login failed: Invalid password for email: ${email}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // FIX: Check if the user's account is verified and active before allowing login.
        if (!user.isVerified) {
            console.log(`Login failed: Account not verified for email: ${email}`);
            return res.status(403).json({
                message: 'Account not verified. Please verify your OTP.',
                // Send userId so the frontend can offer to resend OTP.
                userId: user._id
            });
        }
        if (!user.isActive) {
            console.log(`Login failed: Account deactivated for email: ${email}`);
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

        console.log(`Login successful for email: ${email}, role: ${user.role}`);
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
exports.changePassword = async (req, res) => {
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
