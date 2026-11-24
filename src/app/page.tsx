import { CardVault } from "@/components/CardVault";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">🃏</span>
          <span className="text-lg font-semibold tracking-tight">CardVault</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <CardVault />
      </main>

      <footer className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Your collection is saved in this browser only. Use &ldquo;Export to Excel&rdquo; to keep a backup.
      </footer>
    </div>
  );
}
