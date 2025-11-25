const Quiz = require('../models/Quiz');
const Result = require('../models/Result');

/**
 * @desc    Create a new quiz
 * @route   POST /api/quizzes
 * @access  Private (Admin, Superadmin)
 */
async function createQuiz(req, res) {
    try {
        // --- 1. Extract data from request ---
        const {
            title,
            category,
            quizType,
            duration,
            registrationLimit,
            scheduleTime,
            price,
            coverImage, // Base64 string
            questions  // Array of question objects
        } = req.body;

        // --- 2. Basic Validation ---
        if (!title || !category || !quizType || !duration || !questions || questions.length === 0) {
            return res.status(400).json({ message: 'Please provide all required quiz details, including at least one question.' });
        }
        
        // --- 3. Create new quiz instance ---
        const newQuiz = new Quiz({
            title,
            category,
            quizType,
            duration,
            registrationLimit,
            scheduleTime,
            price,
            coverImage,
            questions,
            createdBy: req.user.id // This comes from the auth middleware after token verification
        });

        // Set status to 'active' for paid and regular quizzes, 'upcoming' if scheduled in future
        if (scheduleTime && new Date(scheduleTime) > new Date()) {
            newQuiz.status = 'upcoming';
        } else {
            newQuiz.status = 'active';
        }

        // --- 4. Save to database ---
        const savedQuiz = await newQuiz.save();

        // --- 5. Send success response ---
        res.status(201).json(savedQuiz);

    } catch (error) {
        console.error('Error creating quiz:', error);
        // Handle validation errors from Mongoose
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: `Validation Error: ${error.message}` });
        }
        res.status(500).json({ message: 'Server error while creating quiz.' });
    }
};

/**
 * @desc    Get all quizzes, categorized for the user dashboard or all for admin management
 * @route   GET /api/quizzes
 * @access  Public (for user dashboard), Private (for admin management)
 */
async function getQuizzes(req, res) {
    try {
        console.log('getQuizzes called, req.user:', req.user ? req.user.role : 'undefined');
        // Admins and Superadmins get all quizzes for management
        // The `req.user` object is populated by your authentication middleware
        if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
            const allQuizzes = await Quiz.find()
                .populate('createdBy', 'name email') // Populate creator info for admin view
                .sort({ createdAt: -1 });
            return res.status(200).json({ allQuizzes }); // Return all quizzes under 'allQuizzes' key
        }

        // Regular users get categorized quizzes for their dashboard
        const allQuizzes = await Quiz.find()
            .populate('createdBy', 'name') // Only need creator name for user view
            .sort({ createdAt: -1 });

        const featured = {
            live: allQuizzes.filter(q => q.quizType === 'live'),
            paid: allQuizzes.filter(q => q.quizType === 'paid'),
            upcoming: allQuizzes.filter(q => q.quizType === 'upcoming')
        };

        const categories = {
            technical: allQuizzes.filter(q => q.category === 'technical'),
            law: allQuizzes.filter(q => q.category === 'law'),
            engineering: allQuizzes.filter(q => q.category === 'engineering'),
            gk: allQuizzes.filter(q => q.category === 'gk'),
            sports: allQuizzes.filter(q => q.category === 'sports'),
            coding: allQuizzes.filter(q => q.category === 'coding'),
            studies: allQuizzes.filter(q => q.category === 'studies')
        };

        res.status(200).json({ featured, categories });

    } catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({ message: 'Server error while fetching quizzes.' });
    }
};

/**
 * @desc    Get a single quiz by its ID
 * @route   GET /api/quizzes/:id
 * @access  Private (Logged-in users)
 */
async function getQuizById(req, res) {
    try {
        const quiz = await Quiz.findById(req.params.id)
            .populate('createdBy', 'name email'); // Populate creator info

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }

        // If a regular user, remove correct answers for security
        if (req.user && req.user.role === 'user') {
            const quizForUser = quiz.toObject(); // Convert Mongoose document to plain object
            quizForUser.questions = quizForUser.questions.map(q => {
                if (q.questionType === 'mcq') {
                    // Remove correctAnswer for MCQs
                    const { correctAnswer, ...rest } = q;
                    return rest;
                }
                return q; // Return written questions as is
            });
            return res.status(200).json(quizForUser);
        }

        // Admins/Superadmins get full quiz data
        res.status(200).json(quiz);

    } catch (error) {
        console.error(`Error fetching quiz ${req.params.id}:`, error);
        res.status(500).json({ message: 'Server error.' });
    }
};

/**
 * @desc    Update a quiz
 * @route   PUT /api/quizzes/:id
 * @access  Private (Admin, Superadmin, or Creator)
 */
async function updateQuiz(req, res) {
    try {
        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }

        // Check if user can update this quiz
        // Only creator, admin, or superadmin can update
        if (quiz.createdBy.toString() !== req.user.id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Not authorized to update this quiz.' });
        }

        // Update fields from req.body
        const { title, category, quizType, duration, registrationLimit, scheduleTime, price, coverImage, questions } = req.body;

        quiz.title = title || quiz.title;
        quiz.category = category || quiz.category;
        quiz.quizType = quizType || quiz.quizType;
        quiz.duration = duration || quiz.duration;
        quiz.registrationLimit = registrationLimit !== undefined ? registrationLimit : quiz.registrationLimit;
        quiz.scheduleTime = scheduleTime !== undefined ? scheduleTime : quiz.scheduleTime;
        quiz.price = price !== undefined ? price : quiz.price;
        quiz.coverImage = coverImage || quiz.coverImage;
        quiz.questions = questions || quiz.questions;

        quiz.updatedAt = Date.now();
        await quiz.save();

        res.status(200).json(quiz);

    } catch (error) {
        console.error('Error updating quiz:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: `Validation Error: ${error.message}` });
        }
        res.status(500).json({ message: 'Server error while updating quiz.' });
    }
};

/**
 * @desc    Delete a quiz
 * @route   DELETE /api/quizzes/:id
 * @access  Private (Admin, Superadmin, or Creator)
 */
async function deleteQuiz(req, res) {
    try {
        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }

        // Check if user can delete this quiz
        // Only creator, admin, or superadmin can delete
        if (quiz.createdBy.toString() !== req.user.id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Not authorized to delete this quiz.' });
        }

        await Quiz.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Quiz deleted successfully.' });

    } catch (error) {
        console.error('Error deleting quiz:', error);
        res.status(500).json({ message: 'Server error while deleting quiz.' });
    }
};

// The following functions are from the original context and are kept for completeness.
// They might need further adjustments based on the updated Quiz model if they are actively used.

async function getQuizStats(req, res) {
    try {
        const quizId = req.params.id;

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found'
            });
        }

        const totalAttempts = await Result.countDocuments({ quizId });
        const completedAttempts = await Result.countDocuments({
            quizId,
            status: 'completed'
        });

        const results = await Result.find({ quizId, status: 'completed' });
        const averageScore = results.length > 0
            ? results.reduce((sum, result) => sum + result.percentage, 0) / results.length
            : 0;

        const passedAttempts = results.filter(result => result.passed).length;
        const passRate = completedAttempts > 0 ? (passedAttempts / completedAttempts) * 100 : 0;

        res.json({
            success: true,
            stats: {
                totalAttempts,
                completedAttempts,
                averageScore: Math.round(averageScore),
                passRate: Math.round(passRate),
                // The original Quiz model in context had 'participants', but the updated one does not.
                // If you need participant count, you'd need to track it in the Quiz model or via Results.
                // participants: quiz.participants.length
            }
        });
    } catch (error) {
        console.error('Get quiz stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get quiz stats',
            error: error.message
        });
    }
};

async function getCategories(req, res) {
    try {
        // Assuming 'isActive' is a field in the Quiz model for filtering active quizzes
        // Removed { isActive: true } as it's not explicitly in the updated model for general categories
        const categories = await Quiz.distinct('category'); 

        res.json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get categories',
            error: error.message
        });
    }
};

/**
 * @desc    Get quizzes created by the logged-in admin
 * @route   GET /api/quizzes/admin
 * @access  Private (Admin, Superadmin)
 */
async function getAdminQuizzes(req, res) {
    try {
        const adminId = req.user.id;

        const quizzes = await Quiz.find({ createdBy: adminId })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            quizzes
        });

    } catch (error) {
        console.error('Error fetching admin quizzes:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching quizzes.'
        });
    }
};

/**
 * @desc    Get quizzes registered by the logged-in user
 * @route   GET /api/quizzes/user/registered
 * @access  Private (User)
 */
async function getUserRegisteredQuizzes(req, res) {
    try {
        const userId = req.user.id;

        const quizzes = await Quiz.find({ 'participants.userId': userId })
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            quizzes
        });

    } catch (error) {
        console.error('Error fetching user registered quizzes:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching registered quizzes.'
        });
    }
};

module.exports = {
    createQuiz,
    getQuizzes,
    getQuizById,
    updateQuiz,
    deleteQuiz,
    getQuizStats,
    getCategories,
    getAdminQuizzes,
    getUserRegisteredQuizzes
};
