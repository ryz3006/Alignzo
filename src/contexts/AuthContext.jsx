import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase.js';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(false); // Global loading state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const adminDocRef = doc(db, 'admins', user.uid);
        const adminDocSnap = await getDoc(adminDocRef);
        setIsAdmin(adminDocSnap.exists());
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = { currentUser, isAdmin, authLoading, isAppLoading, setIsAppLoading };

  return (
    <AuthContext.Provider value={value}>
      {!authLoading && children}
    </AuthContext.Provider>
  );
};
