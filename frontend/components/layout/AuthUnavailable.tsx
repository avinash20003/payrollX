export default function AuthUnavailable({ retryPath }: { retryPath: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-6 text-slate-100">
      <section className="max-w-md text-center" role="alert">
        <p>PAYROLLX could not verify your session right now.</p>
        <a
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
          href={retryPath}
        >
          Retry
        </a>
      </section>
    </main>
  );
}
