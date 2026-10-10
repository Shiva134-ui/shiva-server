import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  loginDev?: () => void;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refreshRole: () => Promise<string | null>;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined' && localStorage.getItem('madesh_dev_admin') === 'true') {
      return {
        id: 'dev-admin',
        email: 'sivamadesh.134@gmail.com',
        name: 'Madesh (Admin)',
        role: 'admin'
      };
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined' && localStorage.getItem('madesh_dev_admin') === 'true') {
      return import.meta.env.VITE_API_TOKEN || 'c7f52004230ceda278c3b7907944f4d0b3be4e4262285a60da6eaa3ede65202f';
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined' && localStorage.getItem('madesh_dev_admin') === 'true') {
      return false;
    }
    return true;
  });
  const [error, setError] = useState<Error | null>(null);

  const refreshRole = async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      const t = await auth.currentUser.getIdToken(true);
      setToken(t);
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://api.madesh.in/api/v1';
      const res = await fetch(`${apiBase}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${t}`
        }
      });
      const data = await res.json();
      const email = auth.currentUser.email || '';
      const newRole = email.toLowerCase() === 'sivamadesh.134@gmail.com' ? 'admin' : (data.role || 'pending');
      setUser({
        id: auth.currentUser.uid,
        email,
        name: auth.currentUser.displayName || 'User',
        role: newRole
      });
      return newRole;
    } catch (err) {
      console.warn('Failed to refresh user role:', err);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const t = await firebaseUser.getIdToken();
          setToken(t);
          const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://api.madesh.in/api/v1';
          const res = await fetch(`${apiBase}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${t}`
            }
          });
          const data = await res.json();
          const email = firebaseUser.email || '';
          setUser({
            id: firebaseUser.uid,
            email,
            name: firebaseUser.displayName || 'User',
            role: email.toLowerCase() === 'sivamadesh.134@gmail.com' ? 'admin' : (data.role || 'pending')
          });
        } catch (e) {
          console.error('Failed to get role from backend:', e);
          const email = firebaseUser.email || '';
          setUser({
            id: firebaseUser.uid,
            email,
            name: firebaseUser.displayName || 'User',
            role: email.toLowerCase() === 'sivamadesh.134@gmail.com' ? 'admin' : 'pending'
          });
        }
      } else {
        if (import.meta.env.DEV && typeof window !== 'undefined' && localStorage.getItem('madesh_dev_admin') === 'true') {
          setUser({
            id: 'dev-admin',
            email: 'sivamadesh.134@gmail.com',
            name: 'Madesh (Admin)',
            role: 'admin'
          });
          setToken(import.meta.env.VITE_API_TOKEN || 'c7f52004230ceda278c3b7907944f4d0b3be4e4262285a60da6eaa3ede65202f');
        } else {
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err);
      throw err;
    }
  };

  const loginDev = () => {
    localStorage.setItem('madesh_dev_admin', 'true');
    setUser({
      id: 'dev-admin',
      email: 'sivamadesh.134@gmail.com',
      name: 'Madesh (Admin)',
      role: 'admin'
    });
    setToken(import.meta.env.VITE_API_TOKEN || 'c7f52004230ceda278c3b7907944f4d0b3be4e4262285a60da6eaa3ede65202f');
    setLoading(false);
  };

  const logout = async () => {
    try {
      localStorage.removeItem('madesh_dev_admin');
      setUser(null);
      setToken(null);
      await signOut(auth);
    } catch (err: any) {
      console.error("Logout error", err);
    }
  };

  const getIdToken = async () => {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
    return token;
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, isAuthenticated: !!user, login, loginDev, logout, getIdToken, refreshRole, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
