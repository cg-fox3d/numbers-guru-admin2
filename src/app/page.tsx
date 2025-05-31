
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FullScreenLoader } from '@/components/common/FullScreenLoader';


export default function HomePage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user && isAdmin) {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isAdmin, loading, router]);

  return <FullScreenLoader />;
}
