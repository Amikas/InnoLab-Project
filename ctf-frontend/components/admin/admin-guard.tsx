'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'
import { useLocalePath } from '@/lib/i18n/use-locale';
import { useAuth } from '@/lib/hooks/use-auth';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { auth, isLoading } = useAuth(); // Changed from 'user' to 'auth'
  const router = useRouter()
  const withLocale = useLocalePath();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!auth.isAuthenticated || !auth.isAdmin) { // Fixed property access
        // Redirect non-admin users to home page
        router.push(withLocale('/'));
      } else {
        setIsAuthorized(true);
      }
    }
  }, [auth, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}