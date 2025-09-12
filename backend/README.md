# CCMIS Backend API

A comprehensive backend API for the Chronic Care Management Information System (CCMIS) built with Node.js, Express, and MongoDB.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Hospital Management**: CRUD operations for healthcare facilities
- **User Management**: Healthcare workers, admins, and super admins
- **Patient Management**: Complete patient records and medical history
- **Consultation Management**: Medical consultations and follow-ups
- **Task Management**: Healthcare tasks and reminders
- **Data Synchronization**: Real-time data sync across devices
- **Security**: Rate limiting, data sanitization, and CORS protection

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting, Data Sanitization
- **Validation**: Express Validator
- **Logging**: Morgan

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Install MongoDB**
   - Download and install MongoDB from [mongodb.com](https://www.mongodb.com/try/download/community)
   - Start MongoDB service

5. **Seed the database**
   ```bash
   npm run seed
   ```

6. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
HOST=localhost

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ccmis
MONGODB_TEST_URI=mongodb://localhost:27017/ccmis_test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Email Configuration
EMAIL_FROM=noreply@ccmis.org
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000,https://ccmis-f6008.web.app
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password
- `GET /api/auth/logout` - Logout user

### Hospitals
- `GET /api/hospitals` - Get all hospitals
- `GET /api/hospitals/:id` - Get single hospital
- `POST /api/hospitals` - Create hospital (Super Admin only)
- `PUT /api/hospitals/:id` - Update hospital (Super Admin only)
- `DELETE /api/hospitals/:id` - Delete hospital (Super Admin only)
- `GET /api/hospitals/:id/stats` - Get hospital statistics
- `GET /api/hospitals/:id/users` - Get hospital users

## User Roles

### SUPER_ADMIN
- Full system access
- Can manage all hospitals
- Can create other admins
- Can access all data

### ADMIN
- Hospital-level access
- Can manage users in their hospital
- Can view all patients in their hospital
- Can manage hospital settings

### HCW (Healthcare Worker)
- Patient-level access
- Can only access assigned patients
- Can create consultations and tasks
- Limited to their assigned hospital

## Database Schema

### User Model
```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  role: ['HCW', 'ADMIN', 'SUPER_ADMIN'],
  hospitalId: ObjectId (ref: Hospital),
  firstName: String,
  lastName: String,
  isActive: Boolean,
  lastLogin: Date
}
```

### Hospital Model
```javascript
{
  name: String,
  code: String (unique),
  address: String,
  phone: String,
  email: String,
  lga: String,
  state: String,
  country: ['Nigeria', 'Refugee', 'Others'],
  capacity: Number,
  currentPatients: Number,
  staffCount: Number,
  isActive: Boolean
}
```

### Patient Model
```javascript
{
  fullName: String,
  age: Number,
  gender: ['male', 'female', 'other'],
  ccNumber: String (unique),
  phoneNumber: String,
  address: String,
  lga: String,
  state: String,
  country: ['Nigeria', 'Refugee', 'Others'],
  status: ['new_case', 'on_treatment', 'dead', 'stopped', 'loss_to_follow_up', 'restarted', 'transferred_out', 'transferred_in'],
  assignedHCW: ObjectId (ref: User),
  hospitalId: ObjectId (ref: Hospital),
  isActive: Boolean
}
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevent brute force attacks
- **Data Sanitization**: Prevent NoSQL injection and XSS
- **CORS Protection**: Configured for specific origins
- **Helmet**: Security headers
- **Input Validation**: Comprehensive request validation

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with sample data
- `npm run seed:test` - Seed test database
- `npm run build` - Build TypeScript (if using TS)

### Testing
```bash
npm test
```

## Deployment

### Production Checklist
1. Set `NODE_ENV=production`
2. Use strong JWT secret
3. Configure proper CORS origins
4. Set up MongoDB Atlas or production MongoDB
5. Configure email service
6. Set up SSL/HTTPS
7. Configure reverse proxy (nginx)
8. Set up monitoring and logging

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, email support@ccmis.org or create an issue in the repository.