export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-24 font-sans">
      <p className="font-mono text-sm text-muted">SVSD</p>
      <h1 className="text-4xl font-semibold tracking-tight">
        Next.js and React are set up.
      </h1>
      <p className="max-w-xl text-lg text-muted">
        Edit <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.9em]">src/app/page.tsx</code> to
        start building. Tokens live in{" "}
        <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.9em]">src/app/globals.css</code>.
      </p>
      <div className="flex gap-3">
        <a
          href="https://nextjs.org/docs"
          className="rounded-token bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          Next.js docs
        </a>
        <a
          href="https://github.com/jhfyj/design-to-code"
          className="rounded-token border border-border px-4 py-2 text-sm font-medium"
        >
          design-to-code library
        </a>
      </div>
    </main>
  );
}
