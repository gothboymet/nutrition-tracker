import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {ChevronUp, ChevronDown, Trash2 } from "lucide-react";

type Meal = {
  id: string;
  name: string;
  order_index: number;
};

type Product = {
  id: string;
  name: string;
};

type MealItem = {
  id: string;
  meal_id: string;
  grams: number;
  product_id: string;
};

type Props = {
  gramsMap: Record<string, string>;
setGramsMap: React.Dispatch<
  React.SetStateAction<Record<string, string>>
>;
  meal: Meal;
  index: number;
  mealsLength: number;
  items: MealItem[];
  products: Product[];
  expandedItems: Record<string, boolean>;
  setExpandedItems: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  searchValue: string;
  setSearchValue: (value: string) => void;
  filteredProducts: Product[];
  calculateItem: any;
  calculateMealTotals: any;
  updateGrams: any;
  deleteItem: any;
  addItem: any;
  handleMoveMeal: any;
  handleDeleteMeal: any;
};

export default function MealSection({
  meal,
  index,
  items,
  products,
  expandedItems,
  setExpandedItems,
  searchValue,
  setSearchValue,
  filteredProducts,
  calculateItem,
  calculateMealTotals,
  updateGrams,
  deleteItem,
  addItem,
  handleMoveMeal,
  handleDeleteMeal,
  gramsMap,
  setGramsMap,
}: Props) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 bg-background transition-colors">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold tracking-tight">{meal.name}</h2>

        <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={() => handleMoveMeal(index, "up")}
        >
          <ChevronUp size={16} strokeWidth={1.5} />
        </Button>
        <Button
          variant="ghost"
          onClick={() => handleMoveMeal(index, "down")}
        >
          <ChevronDown size={16} strokeWidth={1.5} />
        </Button>

        <Button
          variant="ghost"
          onClick={() => handleDeleteMeal(meal.id)}
          className="text-zinc-400 dark:text-zinc-500 hover:text-red-500"
        >
          <Trash2 size={16} strokeWidth={1.5} />
        </Button>
        </div>
      </div>

      {items
        .filter((i) => i.meal_id === meal.id)
        .map((item) => {
          const calc = calculateItem(item);
          const product = products.find(
            (p) => p.id === item.product_id
          );

          return (
            <div key={item.id} className="space-y-1">
              <div className="flex items-center gap-3">
                <div
                  className="flex-1 truncate cursor-pointer"
                  onClick={() =>
                    setExpandedItems((prev) => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                >
                  {product?.name}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={gramsMap[item.id] ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;

                      setGramsMap((prev: Record<string, string>) => ({
                        ...prev,
                        [item.id]: value,
                      }));

                      if (value === "") return;

                      const num = Number(value);
                      if (!isNaN(num)) {
                        updateGrams(item.id, num);
                      }
                    }}
                    className="w-18 flex-none text-right"
                />
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-zinc-400 dark:text-zinc-500 hover:text-foreground transition"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {expandedItems[item.id] && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 pl-2">
                  {calc.calories} kcal | 
                  P {calc.protein.toFixed(1)} | 
                  F {calc.fat.toFixed(1)} | 
                  C {calc.carbs.toFixed(1)} | 
                  Fiber {calc.fiber.toFixed(1)} | 
                  Salt {calc.salt.toFixed(1)}
                </div>
              )}
            </div>
          );
        })}

      {(() => {
        const totals = calculateMealTotals(meal.id);

        return (
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 mt-3 text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-4">
            <span>{totals.calories} kcal</span>
            <span>P {totals.protein.toFixed(1)}</span>
            <span>F {totals.fat.toFixed(1)}</span>
            <span>C {totals.carbs.toFixed(1)}</span>
            <span>Fiber {totals.fiber.toFixed(1)}</span>
            <span>Salt {totals.salt.toFixed(1)}</span>
            </div>
        );
      })()}

      <Input
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        placeholder="Search product..."
        />

      {filteredProducts.map((p) => (
        <div
          key={p.id}
          className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1 rounded transition"
          onClick={() => addItem(meal.id, p)}
        >
          {p.name}
        </div>
      ))}
    </div>
  );
}