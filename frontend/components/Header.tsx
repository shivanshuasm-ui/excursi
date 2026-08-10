import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold text-brand">
          excursi
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/search" className="hover:text-brand">
            Explore
          </Link>
          <Link href="/my-bookings" className="hover:text-brand">
            My Bookings
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-brand px-3 py-1.5 text-white hover:bg-brand-dark"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
