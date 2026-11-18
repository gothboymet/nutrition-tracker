import { supabase } from "@/lib/supabase";
import { addDays } from "@/lib/date";

// How the user has been eating recently, computed from meal history.
// Nothing is stored: it's recalculated from meal_items when a day loads.

export type QuickAdd = {
  productId: string;
  grams: number; // usual portion (median of past entries)
};

export type Usage = {
  /** Most frequent products per meal name ("breakfast", "lunch", ...), best first. */
  byMeal: Record<string, QuickAdd[]>;
  /** Usual grams and how often each product was used, across all meals. */
  byProduct: Record<string, { grams: number; count: number }>;
};

export const EMPTY_USAGE: Usage = { byMeal: {}, byProduct: {} };

const HISTORY_DAYS = 30;

const mealKey = (name: string) => name.trim().toLowerCase();

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  // Round to something a person would type: 5 g steps above 20 g.
  return value >= 20 ? Math.round(value / 5) * 5 : Math.round(value);
};

export async function loadUsage(
  userId: string,
  beforeDate: string
): Promise<Usage> {
  const from = addDays(beforeDate, -HISTORY_DAYS);

  const { data: days } = await supabase
    .from("days")
    .select("id, date")
    .eq("user_id", userId)
    .gte("date", from)
    .lt("date", beforeDate);

  if (!days || days.length === 0) return EMPTY_USAGE;

  const dateByDay: Record<string, string> = {};
  days.forEach((d) => (dateByDay[d.id] = d.date));

  const { data: meals } = await supabase
    .from("meals")
    .select("id, name, day_id")
    .in("day_id", days.map((d) => d.id));

  if (!meals || meals.length === 0) return EMPTY_USAGE;

  const mealInfo: Record<string, { key: string; date: string }> = {};
  meals.forEach(
    (m) => (mealInfo[m.id] = { key: mealKey(m.name), date: dateByDay[m.day_id] })
  );

  const { data: items } = await supabase
    .from("meal_items")
    .select("meal_id, product_id, grams")
    .in("meal_id", meals.map((m) => m.id))
    .gt("grams", 0)
    .limit(5000);

  if (!items) return EMPTY_USAGE;

  type Stat = { grams: number[]; days: Set<string>; last: string };
  const perMeal: Record<string, Record<string, Stat>> = {};
  const perProduct: Record<string, number[]> = {};

  items.forEach((item) => {
    const info = mealInfo[item.meal_id];
    if (!info) return;
    const grams = Number(item.grams);

    const stats = (perMeal[info.key] ||= {});
    const stat = (stats[item.product_id] ||= {
      grams: [],
      days: new Set(),
      last: "",
    });
    stat.grams.push(grams);
    stat.days.add(info.date);
    if (info.date > stat.last) stat.last = info.date;

    (perProduct[item.product_id] ||= []).push(grams);
  });

  const byMeal: Usage["byMeal"] = {};
  Object.entries(perMeal).forEach(([key, stats]) => {
    byMeal[key] = Object.entries(stats)
      // Ignore one-offs: a product must have been in this meal on 2+ days.
      .filter(([, s]) => s.days.size >= 2)
      .sort(
        ([, a], [, b]) =>
          b.days.size - a.days.size || b.last.localeCompare(a.last)
      )
      .map(([productId, s]) => ({ productId, grams: median(s.grams) }));
  });

  const byProduct: Usage["byProduct"] = {};
  Object.entries(perProduct).forEach(([productId, grams]) => {
    byProduct[productId] = { grams: median(grams), count: grams.length };
  });

  return { byMeal, byProduct };
}

export function quickAddsFor(
  usage: Usage,
  mealName: string,
  excludeProductIds: string[],
  availableProductIds: Set<string>,
  limit = 6
): QuickAdd[] {
  const exclude = new Set(excludeProductIds);
  return (usage.byMeal[mealKey(mealName)] || [])
    .filter((q) => !exclude.has(q.productId) && availableProductIds.has(q.productId))
    .slice(0, limit);
}
