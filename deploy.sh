#!/bin/bash

# CCMIS Deployment Script
# This script deploys the CCMIS system to Firebase

echo "🚀 Starting CCMIS Deployment..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Please login to Firebase first:"
    firebase login
fi

# Build the frontend
echo "🔨 Building frontend..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi
cd ..

echo "✅ Frontend built successfully!"

# Deploy to Firebase
echo "🚀 Deploying to Firebase..."
firebase deploy

if [ $? -eq 0 ]; then
    echo "🎉 CCMIS deployed successfully!"
    echo "🌐 Your application is now live!"
    echo "📱 You can access it at the URL shown above"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
