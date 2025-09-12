#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up CCMIS Production Environment...\n');

// Create production environment file
const envContent = `# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ccmis
DB_USER=postgres
DB_PASSWORD=your-postgres-password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=production

# Email Configuration (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL (for CORS)
FRONTEND_URL=https://ccmis-f6008.web.app

# cPanel Database Configuration (for production deployment)
# DB_HOST=your-cpanel-domain.com
# DB_PORT=5432
# DB_NAME=your_cpanel_username_ccmis
# DB_USER=your_cpanel_username_ccmis
# DB_PASSWORD=your-database-password
`;

fs.writeFileSync('.env', envContent);
console.log('✅ Created .env file');

// Create production startup script
const startScript = `#!/bin/bash

echo "🚀 Starting CCMIS Production Server..."

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    echo "   On macOS: brew services start postgresql"
    echo "   On Ubuntu: sudo systemctl start postgresql"
    exit 1
fi

# Check if database exists
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "📊 Creating database..."
    createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
fi

# Seed database if needed
echo "🌱 Seeding database..."
node src/database/seed-production.js

# Start production server
echo "🚀 Starting production server..."
node src/server-production.js
`;

fs.writeFileSync('start-production.sh', startScript);
fs.chmodSync('start-production.sh', '755');
console.log('✅ Created start-production.sh script');

// Create cPanel deployment guide
const cpanelGuide = `# CCMIS Production Deployment Guide for cPanel

## 1. Database Setup on cPanel

### Install PostgreSQL (if not already installed)
\`\`\`bash
/usr/local/cpanel/scripts/installpostgres
\`\`\`

### Create Database
1. Login to cPanel
2. Go to "PostgreSQL Databases"
3. Create a new database: \`your_username_ccmis\`
4. Create a new user: \`your_username_ccmis\`
5. Assign user to database with ALL PRIVILEGES

### Update .env file
\`\`\`env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_username_ccmis
DB_USER=your_username_ccmis
DB_PASSWORD=your_database_password
\`\`\`

## 2. Upload Files to cPanel

1. Upload the entire backend folder to your cPanel File Manager
2. Extract to your domain's root directory or subdirectory

## 3. Install Dependencies

\`\`\`bash
cd /path/to/your/backend
npm install --production
\`\`\`

## 4. Start the Server

\`\`\`bash
# Make script executable
chmod +x start-production.sh

# Start the server
./start-production.sh
\`\`\`

## 5. Configure Domain

1. Point your domain to the server
2. Update FRONTEND_URL in .env to your domain
3. Configure SSL certificate

## 6. Test the API

\`\`\`bash
# Health check
curl https://yourdomain.com/health

# Login test
curl -X POST https://yourdomain.com/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@ccmis.org","password":"admin123"}'
\`\`\`

## 7. Production Credentials

- Super Admin: admin@ccmis.org / admin123
- Hospital Admins: admin@hospital.ng / admin123
- Healthcare Workers: hcw@hospital.ng / hcw123

## 8. Security Checklist

- [ ] Change default passwords
- [ ] Update JWT_SECRET
- [ ] Configure SSL certificate
- [ ] Set up firewall rules
- [ ] Enable database backups
- [ ] Monitor server logs

## 9. Monitoring

- Check server logs regularly
- Monitor database performance
- Set up automated backups
- Monitor disk space and memory usage
`;

fs.writeFileSync('CPANEL-DEPLOYMENT.md', cpanelGuide);
console.log('✅ Created CPANEL-DEPLOYMENT.md guide');

console.log('\n🎉 Production setup completed!');
console.log('\n📋 Next steps:');
console.log('1. Install PostgreSQL on your system');
console.log('2. Update .env file with your database credentials');
console.log('3. Run: ./start-production.sh');
console.log('4. Follow CPANEL-DEPLOYMENT.md for cPanel deployment');
console.log('\n🔐 Default credentials:');
console.log('   Super Admin: admin@ccmis.org / admin123');
console.log('   Hospital Admins: admin@hospital.ng / admin123');
console.log('   Healthcare Workers: hcw@hospital.ng / hcw123');
