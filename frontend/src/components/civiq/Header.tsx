// import Link from "next/link";

// export function Header() {
//   return (
//     <header className="sticky top-0 z-50 border-b border-white/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.76)_0%,rgba(255,255,255,0.52)_100%)] shadow-[0_4px_24px_-12px_rgba(30,42,51,0.08)] backdrop-blur-2xl backdrop-saturate-150">
//       <div className="mx-auto flex h-[3.35rem] max-w-6xl items-center justify-between px-4 sm:h-14 sm:px-6 lg:px-8">
//         <Link
//           href="/"
//           className="font-display text-lg font-semibold tracking-tight text-[var(--foreground)] transition hover:opacity-85"
//         >
//           civ<span className="text-[var(--accent)]">IQ</span>
//         </Link>
//         <p className="hidden text-sm text-[var(--muted)] sm:block">
//           NYC policy briefings
//         </p>
//       </div>
//     </header>
//   );
// }

// Updated header with settings button and callback prop
import Link from "next/link";

type HeaderProps = {
  onOpenSettings?: () => void;
};

export function Header({ onOpenSettings }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.76)_0%,rgba(255,255,255,0.52)_100%)] shadow-[0_4px_24px_-12px_rgba(30,42,51,0.08)] backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex h-[3.35rem] max-w-6xl items-center justify-between px-4 sm:h-14 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-[var(--foreground)] transition hover:opacity-85"
        >
          Civic <span className="text-[var(--accent)]">Spiegel</span>
        </Link>

        <div className="flex items-center gap-3">
          <p className="hidden text-sm text-[var(--muted)] sm:block">
            NYC policy briefings
          </p>

          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-xl border border-[var(--border)] bg-white/70 px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-white"
          >
            Settings
          </button>
        </div>
      </div>
    </header>
  );
}