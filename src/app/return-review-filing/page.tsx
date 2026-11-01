import { Suspense } from 'react';
import type { Metadata } from 'next';
import ReturnReviewShell from './components/ReturnReviewShell';

export const metadata: Metadata = {
  title: 'Review your return',
};

export default function ReturnReviewFilingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen grid place-items-center text-muted-foreground">
          Loading your return…
        </main>
      }
    >
      <ReturnReviewShell />
    </Suspense>
  );
}
