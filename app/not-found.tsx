import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="text-sm leading-6 text-gray-600">That page does not exist, or you may not have access to it.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800">Go to dashboard</Link>
        <Link href="/" className="inline-flex min-h-11 items-center border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50">Home</Link>
      </div>
    </main>
  );
}
