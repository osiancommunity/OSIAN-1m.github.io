const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // The user who will receive the notification
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: String,
        required: [true, 'Notification subject is required.'],
        trim: true
    },
    message: {
        type: String,
        required: [true, 'Notification message is required.']
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields automatically
});

// Indexing for faster queries on user and read status
notificationSchema.index({ user: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;