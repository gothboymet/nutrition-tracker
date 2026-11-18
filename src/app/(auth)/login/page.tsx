"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register" | "reset">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email) {
      setError("Enter your email.");
      return;
    }

    if (mode !== "reset" && !password) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      router.push("/day");
    }

    if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage(
          data.session
            ? "Account created. You can now log in."
            : "Account created. Check your email to confirm it, then log in."
        );
        setMode("login");
      }
    }

    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset",
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage("Password reset email sent.");
      }
    }

    setLoading(false);
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="max-w-sm w-full px-6 py-8 space-y-6">

        <h1 className="text-xl font-semibold tracking-tight text-center">
          Nutrition Tracker
        </h1>

        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4">

          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            autoFocus
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleEnter}
            className="w-full bg-background border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
          />

          {/* Password (hidden in reset mode) */}
          {mode !== "reset" && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleEnter}
              className="w-full bg-background border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
            />
          )}

          {/* Main button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-foreground text-background py-2 rounded-lg text-base sm:text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : mode === "register"
              ? "Create Account"
              : "Send Reset Link"}
          </button>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Success */}
          {message && (
            <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-300 border border-green-200 dark:border-green-900 rounded-lg px-3 py-2">
              {message}
            </div>
          )}

          {/* Secondary actions */}
          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex justify-between">

            {mode !== "reset" && (
              <button
                onClick={() =>
                  setMode(mode === "login" ? "register" : "login")
                }
                className="hover:text-foreground transition"
              >
                {mode === "login"
                  ? "Create account"
                  : "Already have an account?"}
              </button>
            )}

            {mode === "login" && (
              <button
                onClick={() => setMode("reset")}
                className="hover:text-foreground transition"
              >
                Forgot password?
              </button>
            )}

            {mode === "reset" && (
              <button
                onClick={() => setMode("login")}
                className="hover:text-foreground transition"
              >
                Back to login
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}