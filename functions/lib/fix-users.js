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
exports.fixUserDocuments = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const db = admin.firestore();
// Fix existing user documents
exports.fixUserDocuments = functions.https.onRequest(async (req, res) => {
    try {
        console.log('🔧 Fixing user documents...');
        // Get all users
        const usersSnapshot = await db.collection('users').get();
        if (usersSnapshot.empty) {
            res.json({ success: true, message: 'No users found in Firestore' });
            return;
        }
        const batch = db.batch();
        let updateCount = 0;
        usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            // Check if user has firstName/lastName instead of fullName
            if (userData.firstName && userData.lastName && !userData.fullName) {
                const fullName = `${userData.firstName} ${userData.lastName}`;
                // Update the document
                batch.update(doc.ref, {
                    fullName: fullName,
                    // Remove firstName and lastName
                    firstName: admin.firestore.FieldValue.delete(),
                    lastName: admin.firestore.FieldValue.delete()
                });
                updateCount++;
                console.log(`Updating user: ${userData.email} -> fullName: ${fullName}`);
            }
        });
        if (updateCount > 0) {
            await batch.commit();
            console.log(`✅ Updated ${updateCount} user documents`);
        }
        else {
            console.log('✅ No user documents need updating');
        }
        // Verify the fix
        console.log('\n🔍 Verifying user documents...');
        const verifySnapshot = await db.collection('users').get();
        const users = [];
        verifySnapshot.forEach((doc) => {
            const userData = doc.data();
            users.push({
                email: userData.email,
                fullName: userData.fullName,
                role: userData.role
            });
            console.log(`User: ${userData.email} - fullName: ${userData.fullName} - role: ${userData.role}`);
        });
        res.json({
            success: true,
            message: `Updated ${updateCount} user documents`,
            users: users
        });
    }
    catch (error) {
        console.error('❌ Error fixing user documents:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fix user documents',
            error: error.message
        });
    }
});
//# sourceMappingURL=fix-users.js.map