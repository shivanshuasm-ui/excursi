"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

export function Header() {
  const { user, loading, logout } = useAuth();

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
          {!loading && user ? (
            <>
              <Link href="/my-bookings" className="hover:text-brand">
                My Bookings
              </Link>
              <span className="hidden text-slate-400 sm:inline">
                {user.name}
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-brand px-3 py-1.5 text-white hover:bg-brand-dark"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
