'use client';
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="h-[100dvh] overflow-hidden bg-background text-foreground">
        <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center space-y-4">
          <h2 className="text-2xl font-serif text-destructive">Critical Interface Failure</h2>
          <p className="text-sm opacity-80">{error.message || 'Root layout crashed'}</p>
          <button
            onClick={() => reset()}
            className="px-5 py-2 bg-primary text-white rounded-md mt-4"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
