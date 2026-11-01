'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

export default function NotFound() {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/');
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <h1 className="text-9xl font-bold text-primary opacity-20">404</h1>
        </div>

        <h2 className="text-2xl font-medium text-foreground mb-2">Page not found</h2>
        <p className="text-muted-foreground mb-8">
          The page you are looking for does not exist. Let’s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button type="button" onClick={handleGoBack} className="btn-primary">
            <Icon name="ArrowLeftIcon" size={16} />
            Go back
          </button>

          <button type="button" onClick={handleGoHome} className="btn-secondary">
            <Icon name="HomeIcon" size={16} />
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
