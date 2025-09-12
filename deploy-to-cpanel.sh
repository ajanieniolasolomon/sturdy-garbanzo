#!/bin/bash

# CCMIS cPanel Deployment Script
# This script helps prepare your CCMIS application for cPanel deployment

echo "🚀 CCMIS cPanel Deployment Preparation"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "frontend" ] && [ ! -d "backend" ]; then
    print_error "Please run this script from the CCMIS project root directory"
    exit 1
fi

print_info "Starting deployment preparation..."

# Step 1: Build Frontend
print_info "Building frontend for production..."
cd frontend
if [ -f "package.json" ]; then
    npm install
    npm run build
    if [ $? -eq 0 ]; then
        print_status "Frontend built successfully"
    else
        print_error "Frontend build failed"
        exit 1
    fi
else
    print_error "Frontend package.json not found"
    exit 1
fi
cd ..

# Step 2: Prepare Backend
print_info "Preparing backend for production..."
cd backend
if [ -f "package.json" ]; then
    # Install production dependencies only
    npm install --production
    if [ $? -eq 0 ]; then
        print_status "Backend dependencies installed"
    else
        print_error "Backend dependency installation failed"
        exit 1
    fi
else
    print_error "Backend package.json not found"
    exit 1
fi
cd ..

# Step 3: Create deployment package
print_info "Creating deployment package..."
DEPLOY_DIR="ccmis-deployment-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Copy backend files
print_info "Copying backend files..."
cp -r backend "$DEPLOY_DIR/"
rm -rf "$DEPLOY_DIR/backend/node_modules"
rm -rf "$DEPLOY_DIR/backend/.env"
rm -rf "$DEPLOY_DIR/backend/logs"
rm -rf "$DEPLOY_DIR/backend/uploads"

# Copy frontend build
print_info "Copying frontend build..."
cp -r frontend/dist "$DEPLOY_DIR/frontend-dist"

# Copy configuration files
print_info "Copying configuration files..."
cp frontend/.htaccess "$DEPLOY_DIR/frontend-dist/"
cp backend/env.production.example "$DEPLOY_DIR/backend/.env.example"
cp deploy-guide.md "$DEPLOY_DIR/"

# Create deployment instructions
cat > "$DEPLOY_DIR/DEPLOYMENT_INSTRUCTIONS.txt" << EOF
CCMIS cPanel Deployment Instructions
===================================

1. UPLOAD FILES TO CPANEL:
   - Upload the 'backend' folder to your cPanel public_html directory
   - Upload the 'frontend-dist' folder contents to your cPanel public_html directory
   - Or create a subdirectory like 'ccmis' and upload both folders there

2. SET UP NODE.JS APPLICATION:
   - In cPanel, go to "Node.js" or "Node.js Selector"
   - Create new application:
     * Application Root: /public_html/backend (or /public_html/ccmis/backend)
     * Application URL: yourdomain.com (or yourdomain.com/ccmis)
     * Application Startup File: src/server.js
     * Node.js Version: 18.x or higher

3. INSTALL DEPENDENCIES:
   - In cPanel Node.js terminal, run:
     cd /public_html/backend
     npm install --production

4. SET ENVIRONMENT VARIABLES:
   - Copy .env.example to .env
   - Update all values with your production settings
   - Set up MongoDB Atlas database
   - Configure JWT secrets
   - Set your domain in CORS settings

5. START APPLICATION:
   - In cPanel Node.js app, click "Start App"
   - Check logs for any errors

6. CONFIGURE WEB SERVER:
   - Ensure .htaccess file is in your frontend directory
   - Enable SSL/HTTPS
   - Test the application

7. TEST DEPLOYMENT:
   - Visit your domain
   - Test login functionality
   - Test offline capabilities
   - Test data synchronization

For detailed instructions, see deploy-guide.md

IMPORTANT SECURITY NOTES:
- Change all default passwords and secrets
- Use strong JWT secrets
- Enable HTTPS
- Configure MongoDB Atlas IP whitelisting
- Set up proper CORS origins

EOF

# Create a zip file for easy upload
print_info "Creating deployment zip file..."
zip -r "$DEPLOY_DIR.zip" "$DEPLOY_DIR"

print_status "Deployment package created: $DEPLOY_DIR.zip"
print_info "Deployment directory: $DEPLOY_DIR"

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
print_info "Next steps:"
echo "1. Upload $DEPLOY_DIR.zip to your cPanel"
echo "2. Extract the files in your public_html directory"
echo "3. Follow the instructions in DEPLOYMENT_INSTRUCTIONS.txt"
echo "4. Set up your MongoDB Atlas database"
echo "5. Configure environment variables"
echo "6. Start your Node.js application"
echo ""
print_warning "Don't forget to:"
echo "- Change all default passwords and secrets"
echo "- Set up SSL/HTTPS"
echo "- Configure MongoDB Atlas"
echo "- Test the application thoroughly"
echo ""
print_info "For detailed instructions, see: $DEPLOY_DIR/deploy-guide.md"
