"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { calculateTargets } from "@/lib/calculations";
import { addDays, formatDateLabel, localDateString } from "@/lib/date";
import { useRouter } from "next/navigation";
import CalorieCircle from "@/components/ui/CalorieCircle";
import MacroCircle from "@/components/ui/MacroCircle";
import LinearBar from "@/components/ui/LinearBar";
import MealSection from "@/components/day/MealSection";
import Button from "@/components/ui/Button";
import { ChevronLeft, ChevronRight} from "lucide-react";

type Meal = {
  id: string;
  name: string;
  order_index: number;
};

type Product = {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  fiber_per_100g: number;
  salt_per_100g: number;
};

type Day = {
  id: string;
  date: string;
  calorie_target: number;
  protein_target: number;
  fat_target: number;
  carb_target: number;
  fiber_target: number;
  salt_min: number;
  salt_max: number;
};

type MealItem = {
  id: string;
  meal_id: string;
  grams: number;
  product_id: string;
  calories_per_100g_snapshot: number;
  protein_per_100g_snapshot: number;
  fat_per_100g_snapshot: number;
  carbs_per_100g_snapshot: number;
  fiber_per_100g_snapshot: number;
  salt_per_100g_snapshot: number;
};


export default function DayPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<Day | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const loadSeq = useRef(0);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<MealItem[]>([]);
  const [searchMap, setSearchMap] = useState<Record<string, string>>({});
  const [newMealName, setNewMealName] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gramsMap, setGramsMap] = useState<Record<string, string>>({});
  const [expandedItems, setExpandedItems] = useState<
  Record<string, boolean>
>({});

  const [selectedDate, setSelectedDate] = useState(() => localDateString());
  const [tempDate, setTempDate] = useState(selectedDate);

const reportError = (message: string, err?: unknown) => {
  if (err) console.error(message, err);
  setError(message);
};

const loadDay = async () => {
  const seq = ++loadSeq.current;
  const date = selectedDate;
  setError(null);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    router.push("/login");
    return;
  }

  const userId = userData.user.id;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) return reportError("Could not load profile.", profileError);

  if (!profile) {
    // New account: targets can't be calculated until the profile is filled in.
    router.push("/profile");
    return;
  }

  const findDay = () =>
    supabase
      .from("days")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .limit(1)
      .maybeSingle();

  const { data: foundDay, error: dayError } = await findDay();
  if (dayError) return reportError("Could not load this day.", dayError);

  let existingDay: Day | null = foundDay;

  if (!existingDay) {
    const targets = calculateTargets(
      Number(profile.weight),
      Number(profile.calorie_target),
      profile.mode
    );

    const { data: newDay, error: insertError } = await supabase
      .from("days")
      .insert({
        user_id: userId,
        date,
        ...targets,
      })
      .select()
      .single();

    if (insertError) {
      // Another tab/request may have created the day at the same moment.
      const { data: retryDay } = await findDay();
      if (!retryDay) return reportError("Could not create this day.", insertError);
      existingDay = retryDay;
    } else {
      existingDay = newDay;
    }
  }

  if (!existingDay) return;
  const dayRow = existingDay;

  let { data: mealsData } = await supabase
    .from("meals")
    .select("*")
    .eq("day_id", dayRow.id)
    .order("order_index", { ascending: true });

  if (!mealsData || mealsData.length === 0) {
    const defaultMeals = [
      { name: "Breakfast", order_index: 0 },
      { name: "Lunch", order_index: 1 },
      { name: "Dinner", order_index: 2 },
      { name: "Snack", order_index: 3 },
    ];

    const { data: insertedMeals, error: mealsError } = await supabase
      .from("meals")
      .insert(
        defaultMeals.map((m) => ({
          ...m,
          day_id: dayRow.id,
        }))
      )
      .select()
      .order("order_index", { ascending: true });

    if (mealsError) reportError("Could not create default meals.", mealsError);
    mealsData = insertedMeals;
  }

  const { data: productsData } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false);

  const { data: itemsData, error: itemsError } = await supabase
    .from("meal_items")
    .select("*")
    .in("meal_id", (mealsData || []).map((m) => m.id));

  if (itemsError) reportError("Could not load meal items.", itemsError);

  // The user switched to another date while this one was loading.
  if (seq !== loadSeq.current) return;

  const itemsSafe = itemsData || [];
  const map: Record<string, string> = {};
  itemsSafe.forEach((item) => {
    map[item.id] = String(item.grams);
  });

  setDay(dayRow);
  setMeals(mealsData || []);
  setProducts(productsData || []);
  setItems(itemsSafe);
  setGramsMap(map);
  setLoading(false);
};

useEffect(() => {
  loadDay();
}, [router, selectedDate]);

  const refreshItems = async (mealIds: string[] = meals.map((m) => m.id)) => {
    const { data, error } = await supabase
      .from("meal_items")
      .select("*")
      .in("meal_id", mealIds);

    if (error) return reportError("Could not refresh meal items.", error);

    const itemsData = data || [];

    setItems(itemsData);

    // 🔥 ВАЖНО: синхронизируем gramsMap
    const map: Record<string, string> = {};
    itemsData.forEach((item) => {
      map[item.id] = String(item.grams);
    });

    setGramsMap(map);
  };

  const addItem = async (mealId: string, product: Product) => {
    const { error } = await supabase.from("meal_items").insert({
      meal_id: mealId,
      product_id: product.id,
      grams: 0,
      order_index: 0,
      calories_per_100g_snapshot: product.calories_per_100g,
      protein_per_100g_snapshot: product.protein_per_100g,
      fat_per_100g_snapshot: product.fat_per_100g,
      carbs_per_100g_snapshot: product.carbs_per_100g,
      fiber_per_100g_snapshot: product.fiber_per_100g,
      salt_per_100g_snapshot: product.salt_per_100g,
    });

    if (error) return reportError("Could not add product. Check your connection.", error);

    refreshItems();

    setSearchMap((prev) => ({
      ...prev,
      [mealId]: "",
    }));
  };

  // Totals update instantly; the database write waits until typing pauses,
  // so "150" is saved once instead of as 1 -> 15 -> 150 (which could arrive out of order).
  const updateGrams = (id: string, grams: number) => {
    if (grams < 0) return;

    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, grams } : item
      )
    );

    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(async () => {
      delete saveTimers.current[id];
      const { error } = await supabase
        .from("meal_items")
        .update({ grams })
        .eq("id", id);

      if (error) reportError("Grams were not saved. Check your connection and try again.", error);
    }, 500);
  };

  const deleteItem = async (id: string) => {
    clearTimeout(saveTimers.current[id]);
    delete saveTimers.current[id];
    const { error } = await supabase.from("meal_items").delete().eq("id", id);
    if (error) return reportError("Could not delete item.", error);
    refreshItems();
  };

  const calculateItem = (item: MealItem) => {
    const factor = item.grams / 100;
    return {
      calories: Math.round(item.calories_per_100g_snapshot * factor),
      protein: Number((item.protein_per_100g_snapshot * factor).toFixed(1)),
      fat: Number((item.fat_per_100g_snapshot * factor).toFixed(1)),
      carbs: Number((item.carbs_per_100g_snapshot * factor).toFixed(1)),
      fiber: Number((item.fiber_per_100g_snapshot * factor).toFixed(1)),
      salt: Number((item.salt_per_100g_snapshot * factor).toFixed(1)),
    };
  };

  const calculateMealTotals = (mealId: string) => {
  const mealItems = items.filter((i) => i.meal_id === mealId);

  return mealItems.reduce(
    (acc, item) => {
      const calc = calculateItem(item);

      acc.calories += calc.calories;
      acc.protein += calc.protein;
      acc.fat += calc.fat;
      acc.carbs += calc.carbs;
      acc.fiber += calc.fiber;
      acc.salt += calc.salt;

      return acc;
    },
    {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      fiber: 0,
      salt: 0,
    }
  );
};

  const calculateDayTotals = () => {
    return items.reduce(
      (acc, item) => {
        const calc = calculateItem(item);
        acc.calories += calc.calories;
        acc.protein += calc.protein;
        acc.fat += calc.fat;
        acc.carbs += calc.carbs;
        acc.fiber += calc.fiber;
        acc.salt += calc.salt;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, salt: 0 }
    );
  };

  const dayTotals = calculateDayTotals();

  const changeDate = (direction: "prev" | "next") => {
    setSelectedDate((current) =>
      addDays(current, direction === "next" ? 1 : -1)
    );
  };

  const smartFilter = (mealId: string) => {
  const query = (searchMap[mealId] || "").toLowerCase().trim();

  if (!query) return []; // ⬅ ключевая строка

  const starts = products.filter((p) =>
    p.name.toLowerCase().startsWith(query)
  );

  const includes = products.filter(
    (p) =>
      !p.name.toLowerCase().startsWith(query) &&
      p.name.toLowerCase().includes(query)
  );

  return [...starts, ...includes].slice(0, 5);
};

  if (loading || !day) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 text-sm text-zinc-500">
        {error ? (
          <div className="space-y-3">
            <p className="text-red-500">{error}</p>
            <Button onClick={loadDay}>Retry</Button>
          </div>
        ) : (
          "Loading..."
        )}
      </div>
    );
  }

  const handleCopyYesterday = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const userId = userData.user.id;
  const yesterdayString = addDays(selectedDate, -1);

  // 1. Read everything from the previous day first (nothing is changed yet).
  const { data: yesterday } = await supabase
    .from("days")
    .select("*")
    .eq("user_id", userId)
    .eq("date", yesterdayString)
    .limit(1)
    .maybeSingle();

  if (!yesterday) {
    alert("No data for the previous day.");
    return;
  }

  const { data: yesterdayMeals, error: mealsError } = await supabase
    .from("meals")
    .select("*")
    .eq("day_id", yesterday.id)
    .order("order_index", { ascending: true });

  if (mealsError) return reportError("Could not read the previous day.", mealsError);
  if (!yesterdayMeals || yesterdayMeals.length === 0) {
    alert("No meals on the previous day.");
    return;
  }

  const { data: yesterdayItems, error: itemsError } = await supabase
    .from("meal_items")
    .select("*")
    .in("meal_id", yesterdayMeals.map((m) => m.id));

  if (itemsError) return reportError("Could not read the previous day.", itemsError);

  if (items.length > 0) {
    const confirmReplace = confirm(
      "This day already has products. Replace them with the previous day?"
    );
    if (!confirmReplace) return;
  }

  const oldMealIds = meals.map((m) => m.id);

  // 2. Create the copies. Meals get clean sequential order_index values,
  //    which are also used to match old meals to new ones.
  const { data: insertedMeals, error: insertMealsError } = await supabase
    .from("meals")
    .insert(
      yesterdayMeals.map((m, i) => ({
        day_id: day.id,
        name: m.name,
        order_index: i,
      }))
    )
    .select();

  if (insertMealsError || !insertedMeals) {
    return reportError("Copy failed. Nothing was changed.", insertMealsError);
  }

  const newMealIdByOld: Record<string, string> = {};
  yesterdayMeals.forEach((m, i) => {
    const newMeal = insertedMeals.find((n) => n.order_index === i);
    if (newMeal) newMealIdByOld[m.id] = newMeal.id;
  });

  const copiedItems = (yesterdayItems || [])
    .filter((item) => newMealIdByOld[item.meal_id])
    .map((item) => ({
      meal_id: newMealIdByOld[item.meal_id],
      product_id: item.product_id,
      grams: item.grams,
      order_index: item.order_index,
      calories_per_100g_snapshot: item.calories_per_100g_snapshot,
      protein_per_100g_snapshot: item.protein_per_100g_snapshot,
      fat_per_100g_snapshot: item.fat_per_100g_snapshot,
      carbs_per_100g_snapshot: item.carbs_per_100g_snapshot,
      fiber_per_100g_snapshot: item.fiber_per_100g_snapshot,
      salt_per_100g_snapshot: item.salt_per_100g_snapshot,
    }));

  if (copiedItems.length > 0) {
    const { error: insertItemsError } = await supabase
      .from("meal_items")
      .insert(copiedItems);

    if (insertItemsError) {
      // Roll back the half-made copy; the original meals are still untouched.
      await supabase
        .from("meals")
        .delete()
        .in("id", insertedMeals.map((m) => m.id));
      return reportError("Copy failed. Nothing was changed.", insertItemsError);
    }
  }

  // 3. Only now remove the old meals (meal_items are removed by cascade).
  if (oldMealIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("meals")
      .delete()
      .in("id", oldMealIds);
    if (deleteError) reportError("Copied, but old meals could not be removed.", deleteError);
  }

  await loadDay();
};

  const refreshMeals = async () => {
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .eq("day_id", day.id)
    .order("order_index", { ascending: true });

  if (error) return reportError("Could not refresh meals.", error);
  setMeals(data || []);
};

  const handleAddMeal = async () => {
  if (!newMealName.trim()) return;

  const nextIndex =
    meals.reduce((max, m) => Math.max(max, m.order_index), -1) + 1;

  const { error } = await supabase.from("meals").insert({
    day_id: day.id,
    name: newMealName.trim(),
    order_index: nextIndex,
  });

  if (error) return reportError("Could not add meal.", error);

  setNewMealName("");
  refreshMeals();
};

  const handleDeleteMeal = async (mealId: string) => {
  if (!confirm("Delete this meal?")) return;

  const { error } = await supabase.from("meals").delete().eq("id", mealId);
  if (error) return reportError("Could not delete meal.", error);

  refreshMeals();
  refreshItems(meals.filter((m) => m.id !== mealId).map((m) => m.id));
};

  const handleMoveMeal = async (
  index: number,
  direction: "up" | "down"
) => {
  const newIndex = direction === "up" ? index - 1 : index + 1;

  if (newIndex < 0 || newIndex >= meals.length) return;

  // Swap in the list, then renumber every meal 0..n-1. This also repairs
  // duplicate order_index values left over from older versions.
  const reordered = [...meals];
  [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];

  const changes = reordered
    .map((meal, i) => ({ meal, i }))
    .filter(({ meal, i }) => meal.order_index !== i);

  setMeals(reordered.map((meal, i) => ({ ...meal, order_index: i })));

  const results = await Promise.all(
    changes.map(({ meal, i }) =>
      supabase.from("meals").update({ order_index: i }).eq("id", meal.id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed) reportError("Could not save meal order.", failed.error);

  refreshMeals();
};

  

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)] flex items-start gap-3 text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2 shadow">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button onClick={() => changeDate("prev")} variant="ghost">
            <ChevronLeft size={18} strokeWidth={1.5} />
          </Button>

          <Button
            onClick={() => setSelectedDate(localDateString())}
          >
            Today
          </Button>

          <Button onClick={handleCopyYesterday}>
            Copy Yesterday
          </Button>

          <Button onClick={() => changeDate("next")} variant="ghost">
            <ChevronRight size={18} strokeWidth={1.5} />
          </Button>
        </div>

        {showDatePicker ? (
          <input
            type="date"
            value={tempDate}
            onChange={(e) => setTempDate(e.target.value)}
            onBlur={() => {
              if (tempDate) setSelectedDate(tempDate);
              setShowDatePicker(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (tempDate) setSelectedDate(tempDate);
                setShowDatePicker(false);
              }
            }}
            className="border border-zinc-300 dark:border-zinc-700 bg-background rounded-lg px-3 py-1.5 text-base sm:text-sm"
            autoFocus
          />
        ) : (
          <h1
            onClick={() => {
              setTempDate(selectedDate);
              setShowDatePicker(true);
            }}
            className="text-xl font-semibold tracking-tight cursor-pointer hover:opacity-70 transition"
          >
            {formatDateLabel(selectedDate)}
          </h1>
        )}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-6 bg-background">

          <div className="flex justify-center">
              <CalorieCircle
              current={dayTotals.calories}
              target={day.calorie_target}
              />
          </div>

          <div className="flex justify-center gap-6">
            <MacroCircle
              label="Protein"
              current={dayTotals.protein}
              target={day.protein_target}
            />

            <MacroCircle
              label="Fat"
              current={dayTotals.fat}
              target={day.fat_target}
            />

            <MacroCircle
              label="Carbs"
              current={dayTotals.carbs}
              target={day.carb_target}
            />
          </div>

          <LinearBar
            label="Fiber"
            current={dayTotals.fiber}
            target={day.fiber_target}
            color={
              dayTotals.fiber < day.fiber_target
              ? "bg-red-500"
              : "bg-foreground"
            }
          />

          <LinearBar
            label="Salt"
            current={dayTotals.salt}
            target={day.salt_max}
            color={
              dayTotals.salt < day.salt_min
                ? "bg-zinc-400"
                : dayTotals.salt > day.salt_max
                ? "bg-red-500"
                : "bg-foreground"
            }
          />
      </div>

        {meals.map((meal, index) => (
          <MealSection
            gramsMap={gramsMap}
            setGramsMap={setGramsMap}
            key={meal.id}
            meal={meal}
            index={index}
            mealsLength={meals.length}
            items={items}
            products={products}
            expandedItems={expandedItems}
            setExpandedItems={setExpandedItems}
            searchValue={searchMap[meal.id] || ""}
            setSearchValue={(value) =>
              setSearchMap((prev) => ({
                ...prev,
                [meal.id]: value,
              }))
            }
            filteredProducts={smartFilter(meal.id)}
            calculateItem={calculateItem}
            calculateMealTotals={calculateMealTotals}
            updateGrams={updateGrams}
            deleteItem={deleteItem}
            addItem={addItem}
            handleMoveMeal={handleMoveMeal}
            handleDeleteMeal={handleDeleteMeal}
          />
        ))}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-background">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Add new meal..."
              value={newMealName}
              onChange={(e) => setNewMealName(e.target.value)}
              className="flex-1 text-base sm:text-sm bg-transparent border-b border-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-foreground transition"
            />

            <button
              onClick={handleAddMeal}
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-foreground transition"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}