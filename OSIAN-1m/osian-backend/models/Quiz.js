const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// This is a sub-schema for the questions
const questionSchema = new Schema(
  {
    questionText: { type: String, required: true },
    questionType: {
      type: String,
      enum: ['mcq', 'written'],
      required: true
    },
    options: [{ text: { type: String } }], // Only for 'mcq'
    correctAnswer: { type: Number } // Only for 'mcq'
  },
  { _id: false }
);

// This is the main schema for the quiz
const quizSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    quizType: {
        type: String,
        enum: ['regular', 'live', 'upcoming', 'paid'],
        required: true
    },
    duration: {
        type: Number, // Stored in minutes
        required: true
    },
    
    // Cover image stored as a Base64 string
    coverImage: {
        type: String
    },

    registrationLimit: {
        type: Number,
        default: 0
    },
    scheduleTime: {
        type: Date,
        required: false
    },
    price: {
        type: Number,
        default: 0
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'unlisted'],
        default: 'public'
    },
    questions: [questionSchema], // An array of the new question schema
    
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'upcoming', 'draft', 'completed'],
        default: 'draft'
    },
    registeredUsers: {
        type: Number,
        default: 0
    },
    participants: [{
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date
        },
        completedAt: {
            type: Date
        },
        score: {
            type: Number
        }
    }],
    maxParticipants: {
        type: Number,
        default: null
    }
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;
