"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Sun, Moon } from "lucide-react";

export default function Header() {
  const pathname = usePathname();

  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setTheme("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);

    if (newTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    localStorage.setItem("theme", newTheme);
  };

  const linkClass = (path: string) =>
    `text-sm transition ${
    pathname === path
      ? "text-foreground font-medium"
      : "text-zinc-500 dark:text-zinc-400 hover:text-foreground"
    }`;

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/day" className="text-sm font-semibold tracking-tight">
        Nutrition Tracker
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6">
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
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            {theme === "dark" ? (
              <Sun size={16} />
            ) : (
              <Moon size={16} />
            )}
          </button>
          <button
            onClick={async () => {
              const confirmed = confirm("Are you sure you want to log out?");
              if (!confirmed) return;

              await supabase.auth.signOut();
              location.href = "/login";
            }}
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-foreground transition"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}