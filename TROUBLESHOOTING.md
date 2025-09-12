# CCMIS Troubleshooting Guide

## 🔧 **Setup & Login Issues**

### **Problem: Setup page doesn't redirect after creating account**

**Solution:**
1. Wait 2 seconds after clicking "Create Super Admin Account"
2. The page should automatically redirect to login
3. If it doesn't redirect, manually go to: https://ccmis-f6008.web.app/login

### **Problem: Cannot login with created credentials**

**Possible Causes & Solutions:**

#### **1. Database Not Initialized**
- **Symptom**: Setup fails with "User creation failed"
- **Solution**: Refresh the page and try setup again
- **Prevention**: The app now ensures database is initialized before user creation

#### **2. Username Case Sensitivity**
- **Symptom**: Login fails even with correct credentials
- **Solution**: Use exact username as entered during setup (case-sensitive)
- **Note**: The system stores usernames as entered but compares case-insensitively

#### **3. Password Complexity Issues**
- **Symptom**: Setup fails with password requirements
- **Solution**: Ensure password has:
  - At least 8 characters
  - One uppercase letter (A-Z)
  - One lowercase letter (a-z)
  - One number (0-9)
  - One special character (!@#$%^&* etc.)

#### **4. Browser Cache Issues**
- **Symptom**: Old setup page or login issues
- **Solution**: 
  - Clear browser cache (Ctrl+F5 or Cmd+Shift+R)
  - Try incognito/private browsing mode
  - Disable browser extensions temporarily

### **Problem: Setup page keeps appearing**

**Causes:**
1. **No users exist**: This is normal for first-time setup
2. **Database error**: Check browser console for errors
3. **Cache issues**: Clear browser cache

**Solution:**
1. Complete the setup process fully
2. Wait for redirect to login page
3. If persistent, clear browser data and try again

## 🔍 **Debugging Steps**

### **Check if User Was Created:**
1. Open browser Developer Tools (F12)
2. Go to Application/Storage tab
3. Look for IndexedDB → ccmis-db → users table
4. Verify your user exists with correct details

### **Check Browser Console:**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for any red error messages
4. Take screenshot of errors for troubleshooting

### **Verify Database:**
1. Go to Application/Storage → IndexedDB
2. Check if `ccmis-db` database exists
3. Verify `users` table has your account
4. Check if `hospitals` table has default hospital

## 🚨 **Common Error Messages**

### **"User creation failed - no user ID returned"**
- **Cause**: Database initialization issue
- **Solution**: Refresh page and try again

### **"Password Requirements" errors**
- **Cause**: Password doesn't meet complexity requirements
- **Solution**: Use stronger password with all required elements

### **"Invalid credentials"**
- **Cause**: Wrong username/password or user doesn't exist
- **Solution**: 
  - Double-check username spelling
  - Ensure password is exactly as entered during setup
  - Try password reset if needed

### **"No active user found with this email address"**
- **Cause**: Email doesn't match any user or user is inactive
- **Solution**: Use correct email address from setup

## 📱 **Mobile Issues**

### **Setup page not responsive**
- **Solution**: Use landscape mode or desktop browser for setup
- **Note**: Login and main app work fine on mobile

### **Touch issues on mobile**
- **Solution**: Ensure you're using a modern mobile browser
- **Recommended**: Chrome, Safari, or Firefox mobile

## 🔄 **Reset Everything (Last Resort)**

If nothing works, you can reset the entire application:

1. **Clear Browser Data:**
   - Go to browser settings
   - Clear all data for the site
   - Or use incognito/private mode

2. **Start Fresh:**
   - Visit https://ccmis-f6008.web.app
   - Setup page should appear
   - Create new Super Admin account

3. **Verify Setup:**
   - Check that you can login
   - Verify you see the dashboard
   - Test creating a new user

## 📞 **Still Having Issues?**

If problems persist:

1. **Check the deployed version**: https://ccmis-f6008.web.app
2. **Try different browser**: Chrome, Firefox, Safari, Edge
3. **Try incognito mode**: Eliminates cache/extension issues
4. **Check internet connection**: Ensure stable connection
5. **Try different device**: Desktop vs mobile

## ✅ **Success Indicators**

You know setup worked when:
- ✅ Setup page redirects to login after 2 seconds
- ✅ Success message shows your username
- ✅ You can login with created credentials
- ✅ You see the dashboard with Super Admin access
- ✅ You can create new users in Users page

---

**Current Status**: App is deployed and ready for setup at https://ccmis-f6008.web.app
