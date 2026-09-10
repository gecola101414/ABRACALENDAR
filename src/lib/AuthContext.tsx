import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isAdminAuthenticated: boolean;
  verifyAdminPassword: (pass: string) => boolean;
  isAnonymous: boolean;
  ownerId: string;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  isAdmin: false, 
  isAdminAuthenticated: false,
  verifyAdminPassword: () => false,
  isAnonymous: false,
  ownerId: ''
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string>('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const ADMIN_EMAIL = 'gecolakey@gmail.com';
  const ADMIN_PASS = '123456';

  useEffect(() => {
    // Check if previously authenticated as admin in this session
    const isAuth = sessionStorage.getItem('admin_authenticated') === 'true';
    setIsAdminAuthenticated(isAuth);
    
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
          const cred = await signInAnonymously(auth);
          if (cred.user) {
            setOwnerId(cred.user.uid);
            setUser(cred.user);
          }
        } catch (error: any) {
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

  const isAdmin = user?.email === ADMIN_EMAIL;
  const isAnonymous = user?.isAnonymous ?? false;

  const verifyAdminPassword = (pass: string) => {
    if (pass === ADMIN_PASS) {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAdmin, 
      isAdminAuthenticated: isAdmin && isAdminAuthenticated,
      verifyAdminPassword,
      isAnonymous, 
      ownerId 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
