"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");

  const handleUpdate = async () => {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Password updated.");
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-4 w-80">
        <h1 className="text-xl font-semibold">Set New Password</h1>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border px-3 py-2"
        />
        <button
          onClick={handleUpdate}
          className="w-full bg-black text-white py-2"
        >
          Update Password
        </button>
      </div>
    </div>
  );
}