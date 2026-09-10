import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isAnonymous: boolean;
  ownerId: string;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false, isAnonymous: false });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string>('');

  const ADMIN_EMAIL = 'gecolakey@gmail.com';

  useEffect(() => {
    // Generate or retrieve a persistent browser ID as fallback
    let deviceId = localStorage.getItem('abracadabra_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('abracadabra_device_id', deviceId);
    }
    setOwnerId(deviceId);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        try {
          // Attempt anonymous sign-in, but handle it silently if it fails
          // (e.g. if not enabled in Firebase Console)
          const cred = await signInAnonymously(auth);
          if (cred.user) {
            setOwnerId(cred.user.uid);
            setUser(cred.user);
          }
        } catch (error: any) {
          // Silent fallback: we already have deviceId set as ownerId in line 29
          if (error.code !== 'auth/admin-restricted-operation') {
            console.warn("Firebase Auth Note:", error.message);
          }
        } finally {
          setLoading(false);
        }
      } else {
        setUser(currentUser);
        setOwnerId(currentUser.uid);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const isAdmin = user?.email === ADMIN_EMAIL && user?.emailVerified;
  const isAnonymous = user?.isAnonymous ?? false;

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isAnonymous, ownerId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
