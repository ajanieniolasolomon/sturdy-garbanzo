# Create Super Admin User in Firebase Console

## 🔥 **Method 1: Firebase Authentication (Most Secure)**

### **Step 1: Enable Firebase Authentication**
1. Go to [Firebase Console](https://console.firebase.google.com/project/ccmis-f6008/authentication)
2. Click **"Get Started"** if not already enabled
3. Go to **"Sign-in method"** tab
4. Enable **"Email/Password"** provider
5. Click **"Save"**

### **Step 2: Create User in Firebase Console**
1. Go to **"Users"** tab in Authentication
2. Click **"Add user"**
3. Enter:
   - **Email**: `admin@ccmis.com`
   - **Password**: `Admin123!` (or your preferred password)
4. Click **"Add user"**

### **Step 3: Update App to Use Firebase Auth**
The app will automatically detect Firebase users and sync them with the local database.

---

## 🗄️ **Method 2: Direct Database Entry (Quick & Secure)**

### **Step 1: Access Firebase Firestore**
1. Go to [Firebase Console](https://console.firebase.google.com/project/ccmis-f6008/firestore)
2. Click **"Start collection"** if no collections exist
3. Create collection: `users`

### **Step 2: Add Super Admin Document**
1. Click **"Add document"**
2. Document ID: `admin-user-001` (or auto-generate)
3. Add these fields:

```json
{
  "id": "admin-user-001",
  "firstName": "Super",
  "lastName": "Admin", 
  "username": "admin",
  "email": "admin@ccmis.com",
  "password": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3", // "hello" hashed
  "role": "SUPER_ADMIN",
  "hospitalId": "1",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### **Step 3: Hash Your Password**
Use this online tool: https://emn178.github.io/online-tools/sha256.html
- Enter your password
- Copy the hash
- Replace the password field in Firestore

---

## 🔧 **Method 3: Environment Variable (Secure)**

### **Step 1: Create .env file**
```bash
# In your frontend directory
REACT_APP_ADMIN_USERNAME=admin
REACT_APP_ADMIN_EMAIL=admin@ccmis.com
REACT_APP_ADMIN_PASSWORD=YourSecurePassword123!
```

### **Step 2: Update App to Use Environment Variables**
The app will read these values and create the admin user automatically.

---

## 🚨 **Security Best Practices**

### **DO:**
- ✅ Use strong passwords (12+ characters)
- ✅ Change default credentials immediately
- ✅ Use Firebase Authentication when possible
- ✅ Enable 2FA on Firebase account
- ✅ Use environment variables for sensitive data
- ✅ Regularly rotate passwords

### **DON'T:**
- ❌ Use hardcoded credentials in production
- ❌ Use simple passwords like "admin123"
- ❌ Commit .env files to version control
- ❌ Share credentials in plain text
- ❌ Use the same password for multiple accounts

---

## 🎯 **Recommended Approach**

**For Production:**
1. Use **Firebase Authentication** (Method 1)
2. Create user in Firebase Console
3. App automatically syncs with local database

**For Development:**
1. Use **Environment Variables** (Method 3)
2. Keep credentials in .env file
3. Never commit .env to git

**For Quick Testing:**
1. Use **Direct Database Entry** (Method 2)
2. Create user in Firestore
3. Use hashed password

---

## 🔍 **Verify Security**

After setup, verify:
- [ ] User can login with created credentials
- [ ] User has SUPER_ADMIN role
- [ ] User can access all admin functions
- [ ] No hardcoded credentials in source code
- [ ] .env file is in .gitignore
- [ ] Firebase project has proper security rules

---

**Choose the method that works best for your situation!**
