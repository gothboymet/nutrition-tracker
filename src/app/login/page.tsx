"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) return;

    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
      } else {
        router.push("/");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        alert(error.message);
      } else {
        alert("Account created. You can now login.");
        setIsLogin(true);
      }
    }

    setLoading(false);
  };

  const handleResetPassword = async () => {
  if (!email) return;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/reset",
  });

  if (error) {
    alert(error.message);
  } else {
    alert("Password reset email sent.");
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-black">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-center">
          Nutrition Tracker
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-black px-3 py-2"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-black px-3 py-2"
        />

        <button
          onClick={handleAuth}
          disabled={loading}
          className="w-full bg-black text-white py-2 disabled:opacity-50"
        >
          {loading
            ? "Loading..."
            : isLogin
            ? "Login"
            : "Sign Up"}
        </button>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full text-sm underline"
        >
          {isLogin
            ? "Create new account"
            : "Already have an account?"}
        </button>
        <button
          onClick={handleResetPassword}
          className="w-full text-sm underline"
        >
          Reset password
        </button>
      </div>
    </div>
  );
}