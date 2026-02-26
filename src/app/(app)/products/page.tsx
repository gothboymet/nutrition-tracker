"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

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

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);

  const [form, setForm] = useState({
    name: "",
    calories: "",
    protein: "",
    fat: "",
    carbs: "",
    fiber: "",
    salt: "",
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }

    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", userData.user.id)
      .eq("archived", false)
      .order("created_at", { ascending: false });

    setProducts(data || []);
  };

  const addProduct = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    if (!form.name.trim()) return;

    await supabase.from("products").insert({
      user_id: userData.user.id,
      name: form.name,
      calories_per_100g: Number(form.calories) || 0,
      protein_per_100g: Number(form.protein) || 0,
      fat_per_100g: Number(form.fat) || 0,
      carbs_per_100g: Number(form.carbs) || 0,
      fiber_per_100g: Number(form.fiber) || 0,
      salt_per_100g: Number(form.salt) || 0,
    });

    setForm({
      name: "",
      calories: "",
      protein: "",
      fat: "",
      carbs: "",
      fiber: "",
      salt: "",
    });

    loadProducts();
  };

  const archiveProduct = async (id: string) => {
    await supabase
      .from("products")
      .update({ archived: true })
      .eq("id", id);

    loadProducts();
  };

  const inputClass = "w-full border border-black px-3 py-2";

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <h1 className="text-xl font-semibold tracking-tight">
          Products
        </h1>

        <div className="border border-gray-200 rounded-xl p-5 bg-white space-y-4">
          <input
            placeholder="Product name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: "calories", label: "kcal" },
              { key: "protein", label: "Protein" },
              { key: "fat", label: "Fat" },
              { key: "carbs", label: "Carbs" },
              { key: "fiber", label: "Fiber" },
              { key: "salt", label: "Salt" },
            ].map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="text-xs text-gray-500">
                  {field.label} / 100g
                </label>
                <input
                  type="number"
                  value={(form as any)[field.key]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [field.key]: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            ))}
          </div>

          <button
            onClick={addProduct}
            className="w-full bg-black text-white py-2 rounded-lg text-sm hover:bg-gray-800 transition"
          >
            Add Product
          </button>
        </div>

        <div className="space-y-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="border border-gray-200 rounded-xl p-4 bg-white flex justify-between items-start"
            >
            <div>
              <div className="text-sm font-medium">
                {p.name}
              </div>

              <div className="text-xs text-gray-500 mt-1">
                {p.calories_per_100g} kcal · 
                P {p.protein_per_100g} · 
                F {p.fat_per_100g} · 
                C {p.carbs_per_100g} · 
                Fiber {p.fiber_per_100g} · 
                Salt {p.salt_per_100g}
              </div>
            </div>

            <button
              onClick={() => archiveProduct(p.id)}
              className="text-xs text-gray-500 hover:text-black transition"
            >
              Archive
            </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}