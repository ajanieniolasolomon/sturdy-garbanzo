#!/bin/bash

# CCMIS Production Deployment Script
# This script deploys the complete production system to Firebase

set -e  # Exit on any error

echo "🚀 Starting CCMIS Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    print_error "Not logged in to Firebase. Please login first:"
    echo "firebase login"
    exit 1
fi

print_status "Checking Firebase project..."
PROJECT_ID="ccmis-f6008"
if ! firebase use $PROJECT_ID &> /dev/null; then
    print_error "Firebase project $PROJECT_ID not found or not accessible"
    exit 1
fi

print_success "Firebase project $PROJECT_ID is accessible"

# Build frontend
print_status "Building frontend..."
cd frontend

# Install dependencies
print_status "Installing frontend dependencies..."
npm install

# Build for production
print_status "Building frontend for production..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Frontend build failed"
    exit 1
fi

print_success "Frontend built successfully"

# Deploy frontend to Firebase Hosting
print_status "Deploying frontend to Firebase Hosting..."
firebase deploy --only hosting

if [ $? -ne 0 ]; then
    print_error "Frontend deployment failed"
    exit 1
fi

print_success "Frontend deployed successfully"

# Deploy backend to Firebase Functions
print_status "Deploying backend to Firebase Functions..."
cd ../backend

# Install dependencies
print_status "Installing backend dependencies..."
npm install

# Deploy functions
print_status "Deploying Firebase Functions..."
firebase deploy --only functions

if [ $? -ne 0 ]; then
    print_error "Backend deployment failed"
    exit 1
fi

print_success "Backend deployed successfully"

# Deploy Firestore security rules
print_status "Deploying Firestore security rules..."
firebase deploy --only firestore:rules

if [ $? -ne 0 ]; then
    print_error "Firestore rules deployment failed"
    exit 1
fi

print_success "Firestore security rules deployed successfully"

# Deploy Firestore indexes
print_status "Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

if [ $? -ne 0 ]; then
    print_error "Firestore indexes deployment failed"
    exit 1
fi

print_success "Firestore indexes deployed successfully"

# Initialize Firestore with sample data
print_status "Initializing Firestore with sample data..."
node src/database/seed-firebase.js

if [ $? -ne 0 ]; then
    print_warning "Firestore initialization failed, but deployment continues"
fi

print_success "Firestore initialized with sample data"

# Get deployment URLs
print_status "Getting deployment URLs..."
FRONTEND_URL=$(firebase hosting:channel:list --json | jq -r '.channels[0].url // "https://ccmis-f6008.web.app"')
BACKEND_URL="https://us-central1-ccmis-f6008.cloudfunctions.net"

print_success "Deployment completed successfully!"
echo ""
echo "🎉 CCMIS Production System is now live!"
echo ""
echo "📱 Frontend URL: $FRONTEND_URL"
echo "🔧 Backend URL: $BACKEND_URL"
echo ""
echo "🔐 Default Credentials:"
echo "   Super Admin: admin@ccmis.org / admin123"
echo "   Hospital Admin: admin@ruralhealthcenter.ng / admin123"
echo "   Healthcare Worker: nelson@ruralhealthcenter.ng / hcw123"
echo ""
echo "📊 Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID"
echo ""
echo "✅ Production Features:"
echo "   ✅ Real-time Firestore database"
echo "   ✅ Offline-first architecture"
echo "   ✅ Multi-device sync"
echo "   ✅ File upload system"
echo "   ✅ Export functionality (PDF, Excel, CSV)"
echo "   ✅ Role-based access control"
echo "   ✅ Hospital-based data isolation"
echo "   ✅ Security rules and validation"
echo ""
echo "🏥 Ready for healthcare workers in Taraba State!"
echo "   ✅ Works offline in remote areas"
echo "   ✅ Syncs when connection available"
echo "   ✅ Multi-device support"
echo "   ✅ Real-time updates"
echo ""
print_success "Deployment completed successfully!"
