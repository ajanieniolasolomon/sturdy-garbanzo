# 🚀 CCMIS Quick Start Guide

## ⚡ Get Your System Live in 5 Minutes!

### 🎯 What You Need
1. **Firebase Account** (free)
2. **Firebase CLI** (one-time install)
3. **Your CCMIS Project** (ready!)

### 🚀 Quick Deployment Steps

#### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

#### Step 2: Login to Firebase
```bash
firebase login
```

#### Step 3: Initialize Firebase Project
```bash
firebase init
# Select: Hosting, Firestore
# Use existing project
# Choose your project
```

#### Step 4: Update Firebase Config
Edit `frontend/src/lib/firebase.ts` with your project details from Firebase Console.

#### Step 5: Deploy!
```bash
./deploy.sh
```

## 🎉 That's It! Your System is Live!

### 🌐 Access Your Application
- **URL**: `https://your-project.firebaseapp.com`
- **Admin Panel**: Available after first user setup
- **Mobile**: Works on all devices

### 🔐 First Login
1. Go to Firebase Console → Firestore Database
2. Create a user document in 'users' collection
3. Set role to 'SUPER_ADMIN'
4. Login with your credentials

### 📱 Start Using
- **Register Patients**: Full patient management
- **Track Consultations**: Treatment progress
- **Export Data**: 22 comprehensive fields
- **Offline Mode**: Works without internet

## 🆘 Need Help?
- **Full Guide**: See `DEPLOYMENT_GUIDE.md`
- **Firebase Console**: [console.firebase.google.com](https://console.firebase.google.com)
- **Documentation**: [firebase.google.com/docs](https://firebase.google.com/docs)

---

**Your CCMIS system is ready to revolutionize healthcare management! 🏥✨**
