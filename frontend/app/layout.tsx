import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: {
    default: "excursi — book unforgettable experiences",
    template: "%s · excursi",
  },
  description:
    "Discover and book tours, activities, and local experiences from trusted operators.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <footer className="mt-16 border-t border-line bg-[var(--bg-subtle)]">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
              <span className="font-extrabold text-ink">excursi</span>
              <span>
                © {new Date().getFullYear()} excursi. Experiences by independent
                operators.
              </span>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
