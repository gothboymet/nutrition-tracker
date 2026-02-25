"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { calculateTargets } from "@/lib/calculations";
import { useRouter } from "next/navigation";
import CalorieCircle from "@/components/ui/CalorieCircle";
import MacroCircle from "@/components/ui/MacroCircle";
import LinearBar from "@/components/ui/LinearBar";
import MealSection from "@/components/day/MealSection";
import Button from "@/components/ui/Button";

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
  const [day, setDay] = useState<any>(null);
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

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [tempDate, setTempDate] = useState(selectedDate);

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      const userId = userData.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      let { data: existingDay } = await supabase
        .from("days")
        .select("*")
        .eq("user_id", userId)
        .eq("date", selectedDate)
        .single();

      if (!existingDay) {
        const targets = calculateTargets(
          Number(profile.weight),
          Number(profile.calorie_target),
          profile.mode
        );

        const { data: newDay } = await supabase
          .from("days")
          .insert({
            user_id: userId,
            date: selectedDate,
            ...targets,
          })
          .select()
          .single();

        existingDay = newDay;
      }

      setDay(existingDay);

      let { data: mealsData } = await supabase
        .from("meals")
        .select("*")
        .eq("day_id", existingDay.id)
        .order("order_index", { ascending: true });

      if (!mealsData || mealsData.length === 0) {
        const defaultMeals = [
          { name: "Breakfast", order_index: 0 },
          { name: "Lunch", order_index: 1 },
          { name: "Dinner", order_index: 2 },
          { name: "Snack", order_index: 3 },
        ];

        const { data: insertedMeals } = await supabase
          .from("meals")
          .insert(
            defaultMeals.map((m) => ({
              ...m,
              day_id: existingDay.id,
            }))
          )
          .select()
          .order("order_index", { ascending: true });

        mealsData = insertedMeals;
      }

setMeals(mealsData || []);

      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .eq("archived", false);

      setProducts(productsData || []);

      const { data: itemsData } = await supabase
        .from("meal_items")
        .select("*")
        .in("meal_id", (mealsData || []).map((m) => m.id));

      setItems(itemsData || []);
      const map: Record<string, string> = {};
      (itemsData || []).forEach((item) => {
        map[item.id] = String(item.grams);
      });
      setGramsMap(map);
      setLoading(false);
    };

    init();
  }, [router, selectedDate]);

  const refreshItems = async () => {
    const { data } = await supabase
      .from("meal_items")
      .select("*")
      .in("meal_id", meals.map((m) => m.id));

    setItems(data || []);
  };

  const addItem = async (mealId: string, product: Product) => {
  await supabase.from("meal_items").insert({
    meal_id: mealId,
    product_id: product.id,
    grams: 100,
    order_index: 0,
    calories_per_100g_snapshot: product.calories_per_100g,
    protein_per_100g_snapshot: product.protein_per_100g,
    fat_per_100g_snapshot: product.fat_per_100g,
    carbs_per_100g_snapshot: product.carbs_per_100g,
    fiber_per_100g_snapshot: product.fiber_per_100g,
    salt_per_100g_snapshot: product.salt_per_100g,
  });

  refreshItems();

  setSearchMap((prev) => ({
    ...prev,
    [mealId]: "",
  }));
};

  const updateGrams = async (id: string, grams: number) => {
    if (grams < 0) return;
    await supabase.from("meal_items").update({ grams }).eq("id", id);
    refreshItems();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("meal_items").delete().eq("id", id);
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

  const getFiberColor = () => {
    if (dayTotals.fiber < day.fiber_target) return "text-red-500";
    return "text-black";
  };

  const changeDate = (direction: "prev" | "next") => {
    const current = new Date(selectedDate);
    current.setDate(
        current.getDate() + (direction === "next" ? 1 : -1)
    );
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const getSaltColor = () => {
    if (dayTotals.salt < day.salt_min) return "text-gray-400";
    if (dayTotals.salt > day.salt_max) return "text-red-500";
    return "text-black";
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

  if (loading) return <div>Loading...</div>;

  const handleCopyYesterday = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const userId = userData.user.id;

  const today = new Date(selectedDate);
  const yesterdayDate = new Date(today);
  yesterdayDate.setDate(today.getDate() - 1);

  const yesterdayString = yesterdayDate
    .toISOString()
    .split("T")[0];

  // 1️⃣ Найти вчерашний день
  const { data: yesterday } = await supabase
    .from("days")
    .select("*")
    .eq("user_id", userId)
    .eq("date", yesterdayString)
    .single();

  if (!yesterday) {
    alert("No data yesterday.");
    return;
  }

  if (meals.length > 0 || items.length > 0) {
    const confirmReplace = confirm(
      "Current day has data. Replace structure and meals?"
    );
    if (!confirmReplace) return;
  }

  // 2️⃣ Удаляем текущие meals (и cascade удалит meal_items)
  await supabase
    .from("meals")
    .delete()
    .eq("day_id", day.id);

  // 3️⃣ Получаем вчерашние meals
  const { data: yesterdayMeals } = await supabase
    .from("meals")
    .select("*")
    .eq("day_id", yesterday.id)
    .order("order_index", { ascending: true });

  if (!yesterdayMeals) return;

  // 4️⃣ Создаём новые meals сегодня
  const insertedMealsResponse = await supabase
    .from("meals")
    .insert(
      yesterdayMeals.map((m) => ({
        day_id: day.id,
        name: m.name,
        order_index: m.order_index,
      }))
    )
    .select();

  const insertedMeals = insertedMealsResponse.data;
  if (!insertedMeals) return;

  // 5️⃣ Копируем meal_items
  for (let i = 0; i < yesterdayMeals.length; i++) {
    const oldMeal = yesterdayMeals[i];
    const newMeal = insertedMeals.find(
      (m) => m.order_index === oldMeal.order_index
    );

    if (!newMeal) continue;

    const { data: yesterdayItems } = await supabase
      .from("meal_items")
      .select("*")
      .eq("meal_id", oldMeal.id);

    if (!yesterdayItems || yesterdayItems.length === 0)
      continue;

    const copiedItems = yesterdayItems.map((item) => ({
      meal_id: newMeal.id,
      product_id: item.product_id,
      grams: item.grams,
      order_index: item.order_index,
      calories_per_100g_snapshot:
        item.calories_per_100g_snapshot,
      protein_per_100g_snapshot:
        item.protein_per_100g_snapshot,
      fat_per_100g_snapshot:
        item.fat_per_100g_snapshot,
      carbs_per_100g_snapshot:
        item.carbs_per_100g_snapshot,
      fiber_per_100g_snapshot:
        item.fiber_per_100g_snapshot,
      salt_per_100g_snapshot:
        item.salt_per_100g_snapshot,
    }));

    await supabase.from("meal_items").insert(copiedItems);
  }

  await refreshMeals();
  await refreshItems();
};

  const refreshMeals = async () => {
  const { data } = await supabase
    .from("meals")
    .select("*")
    .eq("day_id", day.id)
    .order("order_index", { ascending: true });

  setMeals(data || []);
};

  const handleAddMeal = async () => {
  if (!newMealName.trim()) return;

  await supabase.from("meals").insert({
    day_id: day.id,
    name: newMealName,
    order_index: meals.length,
  });

  setNewMealName("");
  refreshMeals();
};

  const handleDeleteMeal = async (mealId: string) => {
  if (!confirm("Delete this meal?")) return;

  await supabase.from("meals").delete().eq("id", mealId);

  refreshMeals();
  refreshItems();
};

  const handleMoveMeal = async (
  index: number,
  direction: "up" | "down"
) => {
  const newIndex = direction === "up" ? index - 1 : index + 1;

  if (newIndex < 0 || newIndex >= meals.length) return;

  const mealA = meals[index];
  const mealB = meals[newIndex];

  await supabase
    .from("meals")
    .update({ order_index: mealB.order_index })
    .eq("id", mealA.id);

  await supabase
    .from("meals")
    .update({ order_index: mealA.order_index })
    .eq("id", mealB.id);

  refreshMeals();
};

  

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button onClick={() => changeDate("prev")} variant="ghost">
            ←
          </Button>

          <Button
            onClick={() =>
              setSelectedDate(new Date().toISOString().split("T")[0])
            }
          >
            Today
          </Button>

          <Button onClick={handleCopyYesterday}>
            Copy Yesterday
          </Button>

          <Button onClick={() => changeDate("next")} variant="ghost">
            →
          </Button>
        </div>

        {showDatePicker ? (
          <input
            type="date"
            value={tempDate}
            onChange={(e) => setTempDate(e.target.value)}
            onBlur={() => {
              setSelectedDate(tempDate);
              setShowDatePicker(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSelectedDate(tempDate);
                setShowDatePicker(false);
              }
            }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
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
            {new Date(selectedDate).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h1>
        )}
        <input
          id="hidden-date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="hidden"
        />
        <div className="border border-gray-200 rounded-xl p-5 space-y-6 bg-white">

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
                : "bg-black"
            }
          />

          <LinearBar
            label="Salt"
            current={dayTotals.salt}
            target={day.salt_max}
            color={
              dayTotals.salt < day.salt_min
                ? "bg-gray-400"
                : dayTotals.salt > day.salt_max
                ? "bg-red-500"
                : "bg-black"
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
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Add new meal..."
              value={newMealName}
              onChange={(e) => setNewMealName(e.target.value)}
              className="flex-1 text-sm bg-transparent border-b border-gray-200 focus:outline-none focus:border-black transition"
            />

            <button
              onClick={handleAddMeal}
              className="text-sm text-gray-600 hover:text-black transition"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}