'use client';

import { doc, getDoc, setDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { errorEmitter, FirestorePermissionError } from '@/firebase';

/**
 * Creates or updates a user document in Firestore after sign-in.
 * It checks if the user document exists. If not, it creates it with default settings.
 * This ensures every user has a profile document.
 * @param firestore - The Firestore instance.
 * @param user - The Firebase Auth user object.
 */
export function ensureUserDocument(firestore: Firestore, user: User) {
    if (!firestore || !user) return;
    
    const userRef = doc(firestore, 'users', user.uid);

    getDoc(userRef).then(userDoc => {
        if (!userDoc.exists()) {
            // Document doesn't exist, so create it with default settings.
            const userData = {
                id: user.uid,
                email: user.email,
                displayName: user.displayName || 'Anonymous',
                photoUrl: user.photoURL || '',
                createdAt: serverTimestamp(),
                // Default application settings
                address: '',
                businessName: '',
                phoneNumber: '',
                showLabourCharges: true,
                showTransportCharges: true,
                labourRate: 3,
                minLabourCharges: 200,
                isAdmin: false,
            };
            
            setDoc(userRef, userData).catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'create',
                    requestResourceData: userData,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
        }
    }).catch(async (serverError) => {
        // This catch is for errors during the initial getDoc
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}
