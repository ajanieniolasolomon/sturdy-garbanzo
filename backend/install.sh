#!/bin/bash

echo "🚀 CCMIS Backend Installation Script"
echo "====================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p tests

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Setting up environment configuration..."
    cp env.example .env
    echo "✅ Environment file created. Please edit .env with your configuration."
else
    echo "✅ Environment file already exists"
fi

# Create basic .gitignore
if [ ! -f .gitignore ]; then
    echo "📝 Creating .gitignore file..."
    cat > .gitignore << EOL
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# Uploads
uploads/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
EOL
    echo "✅ .gitignore file created"
fi

# Create basic directory structure
echo "📁 Creating source directory structure..."
mkdir -p src/{models,routes,middleware,services,utils,database}

# Create basic files
echo "📝 Creating basic source files..."

# Create logger utility
cat > src/utils/logger.js << 'EOL'
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ccmis-backend' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/combined.log') 
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = { logger };
EOL

# Create auth middleware
cat > src/middleware/auth.js << 'EOL'
const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

const authenticateHospital = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (!req.user.hospitalId) {
      return res.status(403).json({
        success: false,
        message: 'Hospital access required'
      });
    }
    next();
  });
};

module.exports = { authenticateToken, authenticateHospital };
EOL

# Create error handler middleware
cat > src/middleware/errorHandler.js << 'EOL'
const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };
EOL

echo "✅ Basic source files created"

# Create basic route files
echo "📝 Creating basic route files..."

# Create auth routes placeholder
cat > src/routes/auth.js << 'EOL'
const express = require('express');
const router = express.Router();

// TODO: Implement authentication routes
router.post('/login', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.post('/register', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

module.exports = router;
EOL

# Create other route placeholders
for route in patients consultations tasks users hospitals sync notifications; do
  cat > "src/routes/${route}.js" << EOL
const express = require('express');
const router = express.Router();

// TODO: Implement ${route} routes
router.get('/', (req, res) => {
  res.status(501).json({ message: '${route} routes not implemented yet' });
});

module.exports = router;
EOL
done

echo "✅ Route files created"

# Create database connection placeholder
cat > src/database/connection.js << 'EOL'
const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ccmis';
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

module.exports = { connectDB };
EOL

echo "✅ Database connection file created"

# Create basic test setup
echo "📝 Creating test setup..."
cat > tests/setup.js << 'EOL'
// Test setup file
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/ccmis-test';
process.env.JWT_SECRET = 'test-secret-key';
EOL

echo "✅ Test setup created"

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Start MongoDB database"
echo "3. Run 'npm run dev' to start development server"
echo ""
echo "For more information, see README.md"
echo ""
echo "Happy coding! 🚀"
