"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

export function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-xl font-extrabold tracking-tight text-ink">
            excursi
          </span>
        </Link>

        {/* Search pill */}
        <form
          action="/search"
          className="mx-auto hidden w-full max-w-md items-center gap-2 rounded-full border border-line bg-white px-4 py-2 shadow-card focus-within:border-brand sm:flex"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="text-muted"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path
              d="m20 20-3-3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            name="q"
            placeholder="Search for experiences, places…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </form>

        {/* Nav */}
        <nav className="ml-auto flex items-center gap-3 text-sm font-semibold text-ink sm:ml-0">
          <Link href="/search" className="hidden hover:text-brand sm:inline">
            Explore
          </Link>
          {!loading && user ? (
            <>
              <Link href="/my-bookings" className="hover:text-brand">
                My Bookings
              </Link>
              <button
                type="button"
                onClick={logout}
                className="btn-outline"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-brand">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
