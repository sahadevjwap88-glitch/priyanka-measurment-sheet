'use client';

import GraniteGridPage from '@/components/granite-grid-page';
import AuthGuard from '@/components/auth-guard';

export default function Home() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <main className="container mx-auto">
          <GraniteGridPage />
        </main>
      </div>
    </AuthGuard>
  );
}
