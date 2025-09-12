# CCMIS Production Deployment Guide for cPanel

## 1. Database Setup on cPanel

### Install PostgreSQL (if not already installed)
```bash
/usr/local/cpanel/scripts/installpostgres
```

### Create Database
1. Login to cPanel
2. Go to "PostgreSQL Databases"
3. Create a new database: `your_username_ccmis`
4. Create a new user: `your_username_ccmis`
5. Assign user to database with ALL PRIVILEGES

### Update .env file
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_username_ccmis
DB_USER=your_username_ccmis
DB_PASSWORD=your_database_password
```

## 2. Upload Files to cPanel

1. Upload the entire backend folder to your cPanel File Manager
2. Extract to your domain's root directory or subdirectory

## 3. Install Dependencies

```bash
cd /path/to/your/backend
npm install --production
```

## 4. Start the Server

```bash
# Make script executable
chmod +x start-production.sh

# Start the server
./start-production.sh
```

## 5. Configure Domain

1. Point your domain to the server
2. Update FRONTEND_URL in .env to your domain
3. Configure SSL certificate

## 6. Test the API

```bash
# Health check
curl https://yourdomain.com/health

# Login test
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ccmis.org","password":"admin123"}'
```

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
