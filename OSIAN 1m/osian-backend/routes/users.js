const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Assuming you have a User model
const { auth, superadmin } = require('../middleware/auth'); // Assuming auth middleware

/**
 * @route   GET /api/users
 * @desc    Get all users (Superadmin only)
 * @access  Private, Superadmin
 */
router.get('/', [auth, superadmin], async (req, res) => {
    try {
        // Find all users but exclude their passwords from the result
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   GET /api/users/admins
 * @desc    Get all admin and superadmin users (Superadmin only)
 * @access  Private, Superadmin
 */
router.get('/admins', [auth, superadmin], async (req, res) => {
    try {
        // Find users where the role is either 'admin' or 'superadmin'
        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).select('-password');
        res.json(admins);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update a user's role (Superadmin only)
 * @access  Private, Superadmin
 */
router.put('/:id/role', [auth, superadmin], async (req, res) => {
    const { role } = req.body;
    const validRoles = ['user', 'admin', 'superadmin'];

    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified.' });
    }

    try {
        let user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Prevent a superadmin from demoting themselves if they are the only one
        if (user.role === 'superadmin' && req.user.id === user.id) {
            const superadminCount = await User.countDocuments({ role: 'superadmin' });
            if (superadminCount <= 1) {
                return res.status(400).json({ message: 'Cannot change role of the only superadmin.' });
            }
        }

        user.role = role;
        await user.save();

        res.json({ message: 'User role updated successfully.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   PUT /api/users/:id/status
 * @desc    Update a user's status (activate/deactivate)
 * @access  Private, Superadmin
 */
router.put('/:id/status', [auth, superadmin], async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['active', 'inactive'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status specified.' });
    }

    try {
        let user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Prevent deactivating the only superadmin
        if (user.role === 'superadmin' && status === 'inactive') {
             const superadminCount = await User.countDocuments({ role: 'superadmin' });
            if (superadminCount <= 1) {
                return res.status(400).json({ message: 'Cannot deactivate the only superadmin.' });
            }
        }

        user.status = status;
        await user.save();

        res.json({ message: 'User status updated successfully.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;