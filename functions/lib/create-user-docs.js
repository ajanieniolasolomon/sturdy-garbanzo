"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserDocuments = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
exports.createUserDocuments = functions.https.onCall(async (data, context) => {
    try {
        console.log('Creating user documents in Firestore...');
        // Get the existing users from Auth
        const listUsersResult = await admin.auth().listUsers();
        const users = listUsersResult.users;
        console.log(`Found ${users.length} users in Auth`);
        const results = [];
        for (const user of users) {
            console.log(`Processing user: ${user.email}`);
            // Determine role based on email
            let role = 'HCW';
            let hospitalId = null;
            if (user.email === 'admin@ccmis.org') {
                role = 'SUPER_ADMIN';
            }
            else if (user.email === 'admin@ruralhealthcenter.ng') {
                role = 'ADMIN';
                hospitalId = 'hospital_001';
            }
            else if (user.email === 'nelson@ruralhealthcenter.ng') {
                role = 'HCW';
                hospitalId = 'hospital_001';
            }
            // Create user document in Firestore
            const userDoc = {
                email: user.email,
                fullName: user.displayName || user.email.split('@')[0],
                role: role,
                hospitalId: hospitalId,
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            await admin.firestore().collection('users').doc(user.uid).set(userDoc);
            console.log(`✅ Created user document for ${user.email} with role ${role}`);
            results.push({
                email: user.email,
                role: role,
                hospitalId: hospitalId
            });
        }
        // Create a default hospital if needed
        const hospitalDoc = {
            name: 'Rural Health Center',
            address: '123 Health Street, Rural City',
            phone: '+234-123-456-7890',
            email: 'admin@ruralhealthcenter.ng',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await admin.firestore().collection('hospitals').doc('hospital_001').set(hospitalDoc);
        console.log('✅ Created default hospital');
        return {
            success: true,
            message: 'All user documents created successfully!',
            results: results
        };
    }
    catch (error) {
        console.error('Error creating user documents:', error);
        throw new functions.https.HttpsError('internal', 'Error creating user documents', error);
    }
});
//# sourceMappingURL=create-user-docs.js.map