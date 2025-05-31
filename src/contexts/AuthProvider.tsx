
'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useEffect, useState, useCallback } from 'react'; 
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, token: string) => Promise<void>; 
  signOutAndRedirect: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const isAdminUser = currentUser.email === ADMIN_EMAIL;
        setIsAdmin(isAdminUser);
        if (pathname === '/login' && isAdminUser) {
          router.push('/admin/dashboard');
        } else if (pathname.startsWith('/admin') && !isAdminUser) {
          toast({
            title: 'Access Denied',
            description: 'You do not have admin privileges.',
            variant: 'destructive',
          });
          firebaseSignOut(auth).finally(() => {
            router.push('/login?error=role_denied');
          });
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        if (pathname.startsWith('/admin')) {
          router.push('/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, toast, pathname]);

  const signIn = useCallback(async (email: string, token: string) => {
    // This is a placeholder as actual sign-in is handled by FirebaseUI or custom logic
    // For context update, assuming login component updates Firebase state which onAuthStateChanged catches
    // console.log('AuthContext signIn placeholder:', email, token); // Removed console.log
  }, []);

  const signOutAndRedirect = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setIsAdmin(false);
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({ title: 'Logout Error', description: 'Failed to log out. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, router]); 
  

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOutAndRedirect }}>
      {children}
    </AuthContext.Provider>
  );
}
