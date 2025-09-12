# Environment Variable Setup (Secure Method)

## 🔐 **Create Secure Admin User with Environment Variables**

### **Step 1: Create .env file**
In your `frontend` directory, create a file called `.env`:

```bash
# CCMIS Environment Variables
REACT_APP_ADMIN_USERNAME=admin
REACT_APP_ADMIN_EMAIL=admin@ccmis.com
REACT_APP_ADMIN_PASSWORD=YourSecurePassword123!
```

### **Step 2: Update .gitignore**
Make sure `.env` is in your `.gitignore` file:
```
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### **Step 3: Use Environment Variables in Code**
The app will read these values and create the admin user securely.

---

## 🚀 **Quick Setup Commands**

```bash
# Navigate to frontend directory
cd frontend

# Create .env file
echo "REACT_APP_ADMIN_USERNAME=admin" > .env
echo "REACT_APP_ADMIN_EMAIL=admin@ccmis.com" >> .env
echo "REACT_APP_ADMIN_PASSWORD=YourSecurePassword123!" >> .env

# Build and deploy
npm run build
firebase deploy --only hosting
```

---

## 🔒 **Security Benefits**

- ✅ No hardcoded credentials in source code
- ✅ Easy to change passwords
- ✅ Different credentials for different environments
- ✅ Not committed to version control
- ✅ Can be managed by deployment systems

---

## 📝 **Your Login Credentials**

After setup, use:
- **Username**: `admin` (or your custom username)
- **Email**: `admin@ccmis.com` (or your custom email)
- **Password**: `YourSecurePassword123!` (or your custom password)

---

**This is much more secure than hardcoded values!**
