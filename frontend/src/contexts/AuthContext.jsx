import React, { createContext, useContext, useState, useEffect } from "react";
import { firebaseAuth } from "../firebase";
import { getCurrentUser } from "../api/users";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Firebase user
  const [backendUser, setBackendUser] = useState(null); // Backend user (with numeric id)
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      setIsAppLoading(true);
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const backendUser = await getCurrentUser(token, firebaseUser.email); // pass email for fallback
          setBackendUser(backendUser);
          setIsAdmin(backendUser.isAdmin || false);
        } catch {
          setBackendUser(null);
          setIsAdmin(false);
        }
      } else {
        setBackendUser(null);
        setIsAdmin(false);
      }
      setIsAppLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, backendUser, isAdmin, isAppLoading, setIsAppLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 