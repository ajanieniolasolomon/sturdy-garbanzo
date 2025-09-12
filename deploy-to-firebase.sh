#!/bin/bash

# CCMIS Firebase Deployment Script
# This script prepares and deploys the CCMIS system to Firebase

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "🚀 CCMIS Firebase Deployment Script"
    echo "=========================================="
    echo -e "${NC}"
}

# Check if Firebase CLI is installed
check_firebase_cli() {
    print_info "Checking Firebase CLI installation..."
    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI is not installed!"
        print_info "Installing Firebase CLI..."
        npm install -g firebase-tools
        print_success "Firebase CLI installed successfully!"
    else
        print_success "Firebase CLI is already installed!"
    fi
}

# Check if user is logged in to Firebase
check_firebase_login() {
    print_info "Checking Firebase authentication..."
    if ! firebase projects:list &> /dev/null; then
        print_warning "Not logged in to Firebase. Please log in..."
        firebase login
    else
        print_success "Already logged in to Firebase!"
    fi
}

# Initialize Firebase project
init_firebase() {
    print_info "Initializing Firebase project..."
    
    if [ ! -f "firebase.json" ]; then
        print_info "Creating Firebase configuration..."
        cat > firebase.json << EOF
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs18"
  },
  "hosting": {
    "public": "frontend/dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
EOF
        print_success "Firebase configuration created!"
    else
        print_success "Firebase configuration already exists!"
    fi
}

# Create Firestore rules
create_firestore_rules() {
    print_info "Creating Firestore security rules..."
    
    cat > firestore.rules << 'EOF'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their hospital's data
    match /patients/{patientId} {
      allow read, write: if request.auth != null 
        && request.auth.token.hospitalId == resource.data.hospitalId;
      allow create: if request.auth != null 
        && request.auth.token.hospitalId == request.resource.data.hospitalId;
    }
    
    match /consultations/{consultationId} {
      allow read, write: if request.auth != null 
        && request.auth.token.hospitalId == resource.data.hospitalId;
      allow create: if request.auth != null 
        && request.auth.token.hospitalId == request.resource.data.hospitalId;
    }
    
    match /tasks/{taskId} {
      allow read, write: if request.auth != null 
        && request.auth.token.hospitalId == resource.data.hospitalId;
      allow create: if request.auth != null 
        && request.auth.token.hospitalId == request.resource.data.hospitalId;
    }
    
    // Hospitals collection
    match /hospitals/{hospitalId} {
      allow read: if request.auth != null 
        && (request.auth.token.hospitalId == hospitalId || request.auth.token.role == 'SUPER_ADMIN');
    }
    
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null 
        && (request.auth.uid == userId || request.auth.token.role in ['ADMIN', 'SUPER_ADMIN']);
    }
  }
}
EOF
    
    print_success "Firestore rules created!"
}

# Create Firestore indexes
create_firestore_indexes() {
    print_info "Creating Firestore indexes..."
    
    cat > firestore.indexes.json << 'EOF'
{
  "indexes": [
    {
      "collectionGroup": "patients",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "hospitalId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "isActive",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "consultations",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "hospitalId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "patientId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "consultationDate",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "hospitalId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "assignedTo",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "dueDate",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
EOF
    
    print_success "Firestore indexes created!"
}

# Setup Firebase Functions
setup_functions() {
    print_info "Setting up Firebase Functions..."
    
    if [ ! -d "functions" ]; then
        print_info "Creating functions directory..."
        mkdir -p functions/src
    fi
    
    # Create package.json for functions
    cat > functions/package.json << 'EOF'
{
  "name": "ccmis-functions",
  "description": "CCMIS Cloud Functions",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "18"
  },
  "main": "lib/index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.8.0",
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "typescript": "^4.9.0",
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13"
  },
  "private": true
}
EOF
    
    # Create TypeScript config
    cat > functions/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2017"
  },
  "compileOnSave": true,
  "include": [
    "src"
  ]
}
EOF
    
    # Create main functions file
    cat > functions/src/index.ts << 'EOF'
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'CCMIS Firebase Functions'
  });
});

// Patient routes
app.get('/patients', async (req, res) => {
  try {
    const { hospitalId, search, country, state, lga } = req.query;
    let query = db.collection('patients').where('isActive', '==', true);
    
    if (hospitalId) {
      query = query.where('hospitalId', '==', hospitalId);
    }
    
    if (country) {
      query = query.where('country', '==', country);
    }
    
    if (state) {
      query = query.where('state', '==', state);
    }
    
    if (lga) {
      query = query.where('lga', '==', lga);
    }
    
    const snapshot = await query.get();
    let patients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Client-side search for text fields
    if (search) {
      const searchLower = (search as string).toLowerCase();
      patients = patients.filter(patient => 
        patient.fullName?.toLowerCase().includes(searchLower) ||
        patient.ccNumber?.toLowerCase().includes(searchLower) ||
        patient.notes?.toLowerCase().includes(searchLower)
      );
    }
    
    res.json({
      success: true,
      data: patients,
      total: patients.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching patients',
      error: (error as Error).message
    });
  }
});

app.post('/patients', async (req, res) => {
  try {
    const patientData = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    };
    
    const docRef = await db.collection('patients').add(patientData);
    
    res.json({
      success: true,
      message: 'Patient created successfully',
      data: { id: docRef.id, ...patientData }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating patient',
      error: (error as Error).message
    });
  }
});

// Export the Express app as a Cloud Function
export const api = functions.https.onRequest(app);
EOF
    
    print_success "Firebase Functions setup complete!"
}

# Build frontend
build_frontend() {
    print_info "Building frontend for production..."
    
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing frontend dependencies..."
        npm install
    fi
    
    # Build the frontend
    print_info "Building React application..."
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Frontend built successfully!"
    else
        print_error "Frontend build failed!"
        exit 1
    fi
    
    cd ..
}

# Install function dependencies
install_function_dependencies() {
    print_info "Installing function dependencies..."
    
    cd functions
    npm install
    cd ..
    
    print_success "Function dependencies installed!"
}

# Deploy to Firebase
deploy_to_firebase() {
    print_info "Deploying to Firebase..."
    
    # Deploy all services
    firebase deploy
    
    if [ $? -eq 0 ]; then
        print_success "Deployment successful!"
        print_info "Your CCMIS system is now live on Firebase!"
    else
        print_error "Deployment failed!"
        exit 1
    fi
}

# Main deployment function
main() {
    print_header
    
    print_info "Starting CCMIS Firebase deployment process..."
    
    # Check prerequisites
    check_firebase_cli
    check_firebase_login
    
    # Setup Firebase project
    init_firebase
    create_firestore_rules
    create_firestore_indexes
    setup_functions
    
    # Build and prepare
    build_frontend
    install_function_dependencies
    
    # Deploy
    deploy_to_firebase
    
    print_success "🎉 CCMIS Firebase deployment completed successfully!"
    print_info "📖 For detailed setup instructions, see: firebase-deployment-guide.md"
    print_info "🌐 Your app should be available at your Firebase hosting URL"
    
    echo ""
    print_info "Next steps:"
    echo "1. Configure Firebase Authentication in the Firebase Console"
    echo "2. Set up your first hospital and user accounts"
    echo "3. Test the offline functionality"
    echo "4. Configure custom domain (optional)"
}

# Run main function
main "$@"
