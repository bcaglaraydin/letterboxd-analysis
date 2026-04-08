'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error intercepted by error.tsx:', error);
  }, [error]);

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center p-6 text-center space-y-6 bg-background">
      <h2 className="text-2xl font-serif text-destructive">Something went wrong!</h2>
      <p className="text-muted-foreground text-sm max-w-sm">
        {error.message || 'An unexpected error occurred during rendering.'}
      </p>
      <Button variant="outline" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
