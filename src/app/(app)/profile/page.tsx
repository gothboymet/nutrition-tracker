"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { calculateTargets } from "@/lib/calculations";

type Mode = "cut" | "bulk";

export default function ProfilePage() {
  const router = useRouter();

  const [weight, setWeight] = useState<string>("");
  const [calories, setCalories] = useState<string>("");
  const [mode, setMode] = useState<Mode>("cut");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const modes: Mode[] = ["cut", "bulk"];

  useEffect(() => {
    const loadProfile = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userData.user.id)
        .single();

      if (data) {
        setWeight(String(data.weight));
        setCalories(String(data.calorie_target));
        setMode(data.mode);
      }

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleSave = async () => {
  const weightNum = Number(weight);
  const caloriesNum = Number(calories);

  if (weightNum <= 0 || caloriesNum <= 0) {
    alert("Values must be greater than 0");
    return;
  }

  setSaving(true);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const userId = userData.user.id;

  // 1️⃣ Обновляем профиль
  await supabase
    .from("profiles")
    .update({
      weight: weightNum,
      calorie_target: caloriesNum,
      mode,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // 2️⃣ Пересчитываем новые targets
  const newTargets = calculateTargets(
    weightNum,
    caloriesNum,
    mode
  );

  const today = new Date().toISOString().split("T")[0];

  // 3️⃣ Обновляем ВСЕ дни начиная с сегодня
  await supabase
    .from("days")
    .update(newTargets)
    .eq("user_id", userId)
    .gte("date", today);

  setSaving(false);
  alert("Saved");
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const handleExport = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const userId = userData.user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", userId);

  const { data: days } = await supabase
    .from("days")
    .select("*")
    .eq("user_id", userId);

  const dayIds = (days || []).map((d) => d.id);

  const { data: meals } = await supabase
    .from("meals")
    .select("*")
    .in("day_id", dayIds.length ? dayIds : [""]);

  const mealIds = (meals || []).map((m) => m.id);

  const { data: mealItems } = await supabase
    .from("meal_items")
    .select("*")
    .in("meal_id", mealIds.length ? mealIds : [""]);

  const exportObject = {
    profile,
    products,
    days,
    meals,
    mealItems,
    exported_at: new Date().toISOString(),
  };

  const blob = new Blob(
    [JSON.stringify(exportObject, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nutrition-tracker-backup.json";
  a.click();
  URL.revokeObjectURL(url);
};

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 bg-white dark:bg-neutral-950 space-y-5">
          <h1 className="text-xl font-semibold tracking-tight">Profile</h1>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              Weight (kg)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-neutral-900 text-black dark:text-white rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              Calorie Target
            </label>
            <input
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-neutral-900 text-black dark:text-white rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              Mode
            </label>

            <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden">
              {modes.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 text-sm capitalize transition ${
                    mode === m
                      ? "bg-zinc-200 dark:bg-neutral-800 text-black dark:text-white"
                      : "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-neutral-900"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="
              w-full
              bg-black text-white
              hover:bg-zinc-800
              dark:bg-white dark:text-black
              dark:hover:bg-zinc-200
              py-2 rounded-lg text-sm
              transition disabled:opacity-50
              "
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleExport}
            className="
              w-full
              border border-zinc-300 dark:border-zinc-700
              bg-white dark:bg-neutral-900
              text-black dark:text-white
              py-2 rounded-lg text-sm
              hover:bg-zinc-100 dark:hover:bg-neutral-800
              transition
              "
          >
            Export Data (JSON)
          </button>
        </div>
      </div>
    </div>
  );
}