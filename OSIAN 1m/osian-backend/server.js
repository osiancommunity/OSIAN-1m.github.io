const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from parent directory
dotenv.config({ path: '../.env' });

const app = express();

// Restrictive CORS based on env
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5000,http://localhost:5500,http://127.0.0.1:5500')
  .split(',')
  .map(s => s.trim());

// Security headers
app.disable('x-powered-by');
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      "img-src": ["'self'", "data:", "https:"],
      "font-src": ["'self'", "data:", "https://unpkg.com"],
      "connect-src": ["'self'", ...allowedOrigins],
      "frame-ancestors": ["'none'"]
    }
  }
}));
app.use(cors({
  origin: function (origin, callback) {
    // Allow same-origin/no-origin (curl) and exact match for configured origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json({ limit: '50mb' })); // Increase payload limit for large quiz data
app.use(express.urlencoded({ limit: '50mb', extended: true })); // For form data

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth', authLimiter);

// --- ADD THIS TO SERVE THE FRONTEND ---
// Serve static files from the parent directory (where index.html is)
app.use(express.static(path.join(__dirname, '..')));

// Connect to MongoDB with fallback to in-memory server for development
async function connectDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/osian';
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB:', uri);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.warn('Falling back to in-memory MongoDB for development...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      await mongoose.connect(memUri);
      console.log('Connected to in-memory MongoDB');
    } catch (memErr) {
      console.error('Failed to start in-memory MongoDB:', memErr.message);
      process.exit(1);
    }
  }
}

connectDatabase();

// Routes
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const quizRoutes = require('./routes/quizRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const resultRoutes = require('./routes/resultRoutes');
const mentorshipRoutes = require('./routes/mentorshipRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/mentorship', mentorshipRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Osian Backend is running' });
});

// --- ADD THIS TO HANDLE FRONTEND ROUTING ---
// For any route that is not an API route, send the index.html file
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// --- Global Error Handler ---
// This prevents HTML error pages and ensures JSON responses
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
