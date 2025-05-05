import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  userType: 'user' | 'restaurant_owner' | null;
  signIn: (email: string, password: string, type: 'user' | 'restaurant_owner') => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, type: 'user' | 'restaurant_owner') => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<'user' | 'restaurant_owner' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session initialization error:', error);
          setUser(null);
        } else {
          setUser(session?.user ?? null);
          // Retrieve user type from local storage
          const storedUserType = localStorage.getItem('userType') as 'user' | 'restaurant_owner' | null;
          setUserType(storedUserType);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthError = (error: AuthError | Error) => {
    console.error('Auth error details:', error);
    
    const errorMessage = error.message || '';
    
    if (errorMessage.includes('Failed to fetch')) {
      throw new Error('Unable to connect to authentication service. Please check your internet connection.');
    } else if (errorMessage.includes('Email not confirmed')) {
      throw new Error('Please check your email to confirm your account');
    } else if (errorMessage.includes('Invalid login credentials')) {
      throw new Error('Invalid email or password');
    } else if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
      throw new Error('This email is already registered');
    } else if (errorMessage.includes('stronger password')) {
      throw new Error('Please use a stronger password (min 6 characters)');
    } else if (errorMessage.includes('rate limit')) {
      throw new Error('Too many attempts. Please try again later');
    } else if (errorMessage.includes('network')) {
      throw new Error('Network error. Please check your connection');
    } else {
      throw new Error('An unexpected error occurred. Please try again');
    }
  };

  const signIn = async (email: string, password: string, type: 'user' | 'restaurant_owner') => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) handleAuthError(error);
      else {
        setUserType(type);
        localStorage.setItem('userType', type);
      }
    } catch (error: any) {
      handleAuthError(error);
    }
  };

  const signUp = async (email: string, password: string, type: 'user' | 'restaurant_owner') => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) handleAuthError(error);
      else {
        setUserType(type);
        localStorage.setItem('userType', type);
      }
    } catch (error: any) {
      handleAuthError(error);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setUserType(null);
      localStorage.removeItem('userType');
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error('Failed to sign out');
    }
  };

  return (
    <AuthContext.Provider value={{ user, userType, signIn, signOut, signUp, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}