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
      <body className="min-h-screen bg-slate-50">
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <footer className="mt-16 border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">
              © {new Date().getFullYear()} excursi. Experiences by independent
              operators.
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
