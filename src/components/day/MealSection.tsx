import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

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
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold tracking-tight">{meal.name}</h2>

        <div className="flex gap-2">
        <Button
            variant="ghost"
            onClick={() => handleMoveMeal(index, "up")}
        >
            ↑
        </Button>
        <Button
        variant="ghost"
        onClick={() => handleMoveMeal(index, "down")}
        >
        ↓
        </Button>

        <Button
        variant="ghost"
        onClick={() => handleDeleteMeal(meal.id)}
        >
        🗑
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
              <div className="flex justify-between items-center">
                <div
                  className="cursor-pointer"
                  onClick={() =>
                    setExpandedItems((prev) => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                >
                  {product?.name}
                </div>

                <div className="flex gap-2 items-center">
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
                    className="w-20"
                />
                  <button onClick={() => deleteItem(item.id)}>
                    🗑
                  </button>
                </div>
              </div>

              {expandedItems[item.id] && (
                <div className="text-xs text-gray-600 pl-2">
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
            <div className="border-t pt-3 text-xs text-gray-500 flex flex-wrap gap-3">
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
          className="cursor-pointer hover:bg-gray-100 px-2 py-1"
          onClick={() => addItem(meal.id, p)}
        >
          {p.name}
        </div>
      ))}
    </div>
  );
}