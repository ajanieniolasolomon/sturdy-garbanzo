# CCMIS - Comprehensive Care Management Information System

A full-stack healthcare management system built with React, Node.js, and MongoDB, designed for rural healthcare centers to manage patients, consultations, and medical records.

## 🚀 Features

### ✅ **Completed Features**

- **Patient Management**: Complete CRUD operations with new patient structure
- **Consultation Management**: Comprehensive medical consultation system with:
  - Symptom tracking with severity levels
  - Vital signs recording
  - Physical examination by body systems
  - Diagnosis management (primary, secondary, differential)
  - Treatment planning with medications and procedures
  - Follow-up scheduling and referral management
- **Authentication System**: JWT-based authentication with role-based access control
- **Offline-First Architecture**: IndexedDB with Dexie.js for offline functionality
- **Real-time Sync**: Queue-based synchronization system
- **Responsive Design**: Modern UI with Tailwind CSS
- **PWA Support**: Progressive Web App capabilities

### 🏗️ **Architecture**

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + MongoDB + Mongoose
- **Database**: MongoDB with comprehensive schemas
- **Authentication**: JWT with refresh tokens
- **Offline Storage**: IndexedDB with Dexie.js
- **Real-time**: Socket.IO for live updates

## 📋 **Prerequisites**

- Node.js (v18 or higher)
- MongoDB (v5 or higher)
- npm or yarn

## 🛠️ **Installation & Setup**

### 1. Clone the Repository
```bash
git clone <repository-url>
cd CCMIS-New
```

### 2. Backend Setup
```bash
cd backend
npm install

# Create environment file
cp env.example .env
# Edit .env with your configuration

# Start MongoDB (if not running)
# macOS with Homebrew:
brew services start mongodb-community

# Start the backend server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Start the development server
npm run dev
```

## 🔧 **Configuration**

### Backend Environment Variables (.env)
```env
# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ccmis

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-at-least-32-characters-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-token-secret-different-from-jwt-secret
JWT_REFRESH_EXPIRES_IN=7d

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🚀 **Running the Application**

### Development Mode
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Start backend in production
cd backend
npm start
```

## 📊 **Database Models**

### Patient Model
- **New Structure**: `fullName`, `age`, `gender`, `ccNumber` (with slashes), `address`, `lga`, `state`, `country`
- **Optional Fields**: `phoneNumber`, `notes`
- **Validation**: Comprehensive validation with custom error messages

### Consultation Model
- **Comprehensive Medical Records**: Symptoms, vital signs, physical examination, diagnosis, treatment
- **Structured Data**: Organized by medical workflow
- **Follow-up Management**: Scheduling and referral tracking

### User Model
- **Role-Based Access**: HCW, ADMIN, SUPER_ADMIN
- **Hospital Association**: Multi-tenant architecture
- **Security**: Password hashing and JWT authentication

## 🔐 **Authentication & Authorization**

- **JWT Tokens**: Access and refresh token system
- **Role-Based Access Control**: Different permissions for different roles
- **Secure Routes**: Protected API endpoints
- **Password Security**: bcrypt hashing with configurable rounds

## 📱 **Offline Functionality**

- **IndexedDB Storage**: Local data persistence
- **Sync Queue**: Automatic synchronization when online
- **Conflict Resolution**: Handles data conflicts gracefully
- **PWA Support**: Installable web application

## 🧪 **Testing**

### Backend Testing
```bash
cd backend
npm run test:patient  # Test patient model
npm test             # Run all tests
```

### Frontend Testing
```bash
cd frontend
npm run build        # TypeScript compilation check
npm run lint         # ESLint check
```

## 📁 **Project Structure**

```
CCMIS-New/
├── backend/
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── middleware/      # Authentication, validation
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utilities
│   │   └── server.js       # Main server file
│   ├── test-patient-model.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Database, utilities
│   │   ├── hooks/          # Custom React hooks
│   │   └── App.tsx         # Main app component
│   └── package.json
└── README.md
```

## 🔄 **API Endpoints**

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Patients
- `GET /api/patients` - Get all patients
- `POST /api/patients` - Create patient
- `GET /api/patients/:id` - Get patient by ID
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Consultations
- `GET /api/consultations` - Get all consultations
- `POST /api/consultations` - Create consultation
- `GET /api/consultations/:id` - Get consultation by ID
- `PUT /api/consultations/:id` - Update consultation
- `DELETE /api/consultations/:id` - Delete consultation

## 🎯 **Usage**

1. **Start the application** using the development setup above
2. **Access the frontend** at `http://localhost:5173`
3. **Login** with demo credentials (if seeded)
4. **Navigate** through the dashboard to manage patients and consultations
5. **Create consultations** with comprehensive medical documentation
6. **Use offline** - the app works without internet connection

## 🔧 **Development**

### Adding New Features
1. Create database models in `backend/src/models/`
2. Add API routes in `backend/src/routes/`
3. Implement controllers in `backend/src/controllers/`
4. Create frontend components in `frontend/src/components/`
5. Update database interface in `frontend/src/lib/database.ts`

### Code Style
- **Backend**: Standard JavaScript with JSDoc comments
- **Frontend**: TypeScript with strict type checking
- **Styling**: Tailwind CSS utility classes
- **State Management**: Redux Toolkit

## 🚀 **Deployment**

### Production Checklist
- [ ] Set production environment variables
- [ ] Configure MongoDB production connection
- [ ] Set up SSL certificates
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

## 📝 **License**

MIT License - see LICENSE file for details

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 **Support**

For support and questions, please contact the development team.

---

**CCMIS v1.0.0** - Comprehensive Care Management Information System
