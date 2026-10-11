'use client';

// Last resort when the root layout itself fails, so it brings its own <html> and plain styles.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
        <div style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: 24, margin: '0 0 12px' }}>The service is having a problem</h1>
          <p style={{ color: '#4b5563', lineHeight: 1.6 }}>Please try again in a moment. If it continues, contact HEVACRAZ.{error.digest ? ` Reference: ${error.digest}` : ''}</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, padding: '10px 20px', background: '#111827', color: '#fff', border: 0, fontWeight: 600, cursor: 'pointer' }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
