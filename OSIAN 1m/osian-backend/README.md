# Osian Backend

A comprehensive backend API for the Osian quiz platform built with Node.js, Express, and MongoDB.

## Features

- **User Authentication & Authorization**
  - User registration with OTP verification
  - JWT-based authentication
  - Role-based access control (User, Admin, Superadmin)

- **Quiz Management**
  - Create and manage quizzes
  - Multiple question types support
  - Category and difficulty filtering
  - Quiz statistics and analytics

- **Results & Leaderboards**
  - Quiz submission and scoring
  - Detailed result tracking
  - Leaderboards for quizzes
  - Performance analytics

- **Payment Integration**
  - Order creation and management
  - Payment verification
  - Transaction history

- **Email Notifications**
  - OTP verification emails
  - Welcome emails
  - Customizable email templates

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: Nodemailer with Gmail
- **Validation**: Built-in Express validation
- **Security**: bcrypt for password hashing

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd osian-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your configuration:
   - MongoDB connection string
   - JWT secret
   - Email credentials
   - Payment gateway keys (optional)

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000` (or the port specified in your `.env`).

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/resend-otp` - Resend OTP
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Users
- `GET /api/users` - Get all users (Admin)
- `GET /api/users/:id` - Get user by ID (Admin)
- `PUT /api/users/:id` - Update user (Admin)
- `DELETE /api/users/:id` - Delete user (Superadmin)
- `GET /api/users/stats/:id?` - Get user statistics
- `PUT /api/users/profile` - Update user profile

### Quizzes
- `GET /api/quizzes` - Get all quizzes
- `GET /api/quizzes/:id` - Get quiz by ID
- `POST /api/quizzes` - Create quiz (Admin)
- `PUT /api/quizzes/:id` - Update quiz
- `DELETE /api/quizzes/:id` - Delete quiz (Admin)
- `GET /api/quizzes/categories` - Get quiz categories
- `GET /api/quizzes/:id/stats` - Get quiz statistics

### Results
- `POST /api/results/submit` - Submit quiz answers
- `GET /api/results/user/:userId?` - Get user results
- `GET /api/results/:id` - Get result by ID
- `GET /api/results/quiz/:quizId` - Get quiz results
- `GET /api/results/leaderboard/:quizId` - Get quiz leaderboard

### Payments
- `POST /api/payments/create-order` - Create payment order
- `POST /api/payments/verify-payment` - Verify payment
- `GET /api/payments/orders` - Get user orders
- `GET /api/payments/orders/:orderId` - Get order by ID
- `GET /api/payments/admin/orders` - Get all orders (Admin)
- `PUT /api/payments/admin/orders/:orderId/status` - Update order status (Admin)

## Data Models

### User
- Personal information (name, email, password)
- Role-based permissions
- Email verification status
- Quiz participation history
- Profile information

### Quiz
- Quiz metadata (title, description, category)
- Questions with multiple choice options
- Time limits and passing scores
- Participant tracking
- Statistics

### Result
- Quiz performance data
- Detailed answer tracking
- Time management
- Pass/fail status

### Order
- Payment transaction details
- Order status tracking
- Billing information
- Itemized purchases

## Security Features

- **Password Hashing**: bcrypt for secure password storage
- **JWT Authentication**: Stateless authentication with expiration
- **Role-based Access**: Different permissions for users, admins, and superadmins
- **Input Validation**: Comprehensive validation for all endpoints
- **OTP Verification**: Email-based verification for account security

## Development

### Project Structure
```
osian-backend/
├── controllers/     # Route handlers
├── models/         # MongoDB schemas
├── routes/         # API routes
├── middleware/     # Custom middleware
├── config/         # Configuration files
├── server.js       # Main application file
├── package.json    # Dependencies and scripts
└── README.md       # This file
```

### Adding New Features

1. **Models**: Create new Mongoose schemas in the `models/` directory
2. **Controllers**: Add business logic in the `controllers/` directory
3. **Routes**: Define API endpoints in the `routes/` directory
4. **Middleware**: Add custom middleware in the `middleware/` directory

### Testing

```bash
# Run tests (when implemented)
npm test
```

## Deployment

1. Set up environment variables for production
2. Configure MongoDB database
3. Set up email service credentials
4. Configure payment gateway (if using)
5. Deploy to your preferred hosting platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support or questions, please contact the development team or create an issue in the repository.
