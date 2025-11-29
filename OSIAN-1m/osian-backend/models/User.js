const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Sub-schema for the user's profile information.
// This keeps the main User schema cleaner.
const ProfileSchema = new mongoose.Schema({
    avatar: {
        type: String,
        default: '' // URL to the profile picture
    },
    age: {
        type: Number
    },
    college: { // Used for both 'user' and 'admin'
        type: String
    },
    course: { // User-specific
        type: String
    },
    year: { // User-specific
        type: String
    },
    state: {
        type: String
    },
    city: {
        type: String
    },
    phone: {
        type: String
    },
    currentAddress: { // Admin-specific
        type: String
    }
}, { _id: false }); // _id: false prevents Mongoose from creating a separate _id for the sub-document.

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: [/^[@a-z0-9_]+$/,'Invalid username']
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'superadmin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false // Don't return password by default on queries
    },
    otp: {
        type: String
    },
    otpExpires: {
        type: Date
    },
    profile: ProfileSchema,
    isVerified: { // For OTP verification
        type: Boolean,
        default: false
    },
    isActive: { // For user management (banning/deactivating)
        type: Boolean,
        default: true
    },
    quizzesTaken: [{ // Array of quizzes taken by the user
        quizId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Quiz'
        },
        score: {
            type: Number,
            required: true
        },
        completedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Middleware to hash password before saving the user document
UserSchema.pre('save', async function(next) {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) {
        return next();
    }

    // Hash the password with a salt round of 10
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.pre('save', async function(next) {
    if (!this.username) {
        const n = (this.name && this.name[0]) ? this.name[0].toLowerCase() : (this.email && this.email[0] ? this.email[0].toLowerCase() : 'u');
        const sum = (this.email || '').toLowerCase().split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const suffix = String(sum % 1000000).padStart(6, '0');
        this.username = `@${n}${suffix}`;
    }
    next();
});

module.exports = mongoose.model('User', UserSchema);
