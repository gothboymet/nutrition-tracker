"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const pathname = usePathname();

  const linkClass = (path: string) =>
    `text-sm transition ${
      pathname === path
        ? "text-black font-medium"
        : "text-gray-500 hover:text-black"
    }`;

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/day" className="text-sm font-semibold tracking-tight">
        Nutrition Tracker
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/day" className={linkClass("/day")}>
            Today
          </Link>
          <Link
            href="/products"
            className={linkClass("/products")}
          >
            Products
          </Link>
          <Link
            href="/profile"
            className={linkClass("/profile")}
          >
            Profile
          </Link>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              location.href = "/login";
            }}
            className="text-sm text-gray-500 hover:text-black transition"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}