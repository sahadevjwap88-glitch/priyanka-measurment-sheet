'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // This component will now primarily be for redirecting logged-in users
  // or handling auth-specific logic in the future, rather than blocking access.
  // For now, we allow children to render regardless of auth state
  // to support the offline-first free plan.

  // A potential future implementation could be:
  /*
  useEffect(() => {
    if (!isUserLoading && !user) {
      // For pages that *strictly* require authentication
      // router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <p>Loading...</p>
        </div>
    );
  }
  */

  return <>{children}</>;
}
