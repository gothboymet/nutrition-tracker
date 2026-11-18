import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { ChevronUp, ChevronDown, Trash2, Plus, Star, ScanBarcode } from "lucide-react";

type Meal = {
  id: string;
  name: string;
  order_index: number;
};

type Product = {
  id: string;
  name: string;
  favorite?: boolean;
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
  quickAdds: { product: Product; grams: number }[];
  usualGrams: (productId: string) => number;
  onScan: () => void;
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
  quickAdds,
  usualGrams,
  onScan,
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

      {quickAdds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {quickAdds.map(({ product, grams }) => (
            <button
              key={product.id}
              onClick={() => addItem(meal.id, product, grams)}
              title={`Add ${product.name}, ${grams} g`}
              className="inline-flex items-center gap-1 max-w-full text-xs text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-full px-2.5 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <Plus size={12} strokeWidth={1.75} className="flex-none" />
              <span className="truncate">{product.name}</span>
              <span className="flex-none text-zinc-400 dark:text-zinc-500">
                · {grams} g
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-center">
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search product..."
          className="flex-1 min-w-0"
        />
        <button
          onClick={onScan}
          aria-label="Scan barcode"
          title="Scan barcode"
          className="flex-none p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          <ScanBarcode size={16} strokeWidth={1.5} />
        </button>
      </div>

      {filteredProducts.map((p) => {
        const usual = usualGrams(p.id);
        return (
          <div
            key={p.id}
            className="flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1 rounded transition"
            onClick={() => addItem(meal.id, p)}
          >
            <span className="flex items-center gap-1.5 min-w-0">
              {p.favorite && (
                <Star size={13} strokeWidth={1.75} className="flex-none text-amber-500" />
              )}
              <span className="truncate">{p.name}</span>
            </span>
            {usual > 0 && (
              <span className="flex-none text-xs text-zinc-400 dark:text-zinc-500">
                usually {usual} g
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}