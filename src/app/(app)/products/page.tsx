"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ScanBarcode, Star, X } from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner";
import { lookupBarcode, ProductDraft } from "@/lib/openfoodfacts";

type Product = {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  fiber_per_100g: number;
  salt_per_100g: number;
  favorite?: boolean;
  barcode?: string | null;
};

const EMPTY_FORM: ProductDraft & { barcode: string } = {
  name: "",
  calories: "",
  protein: "",
  fat: "",
  carbs: "",
  fiber: "",
  salt: "",
  barcode: "",
};

type ScanInfo =
  | { kind: "loading" }
  | { kind: "found"; warnings: string[] }
  | { kind: "not-found" }
  | { kind: "error" };

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [scanning, setScanning] = useState(false);
  const [scanInfo, setScanInfo] = useState<ScanInfo | null>(null);

  useEffect(() => {
    const init = async () => {
      const list = await loadProducts();

      // Opened from the day page scanner: /products?barcode=...
      const code = new URLSearchParams(window.location.search).get("barcode");
      if (code) {
        window.history.replaceState(null, "", "/products");
        handleBarcode(code, list);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBarcode = async (code: string, list: Product[] = products) => {
    setScanning(false);

    const existing = list.find((p) => p.barcode === code);
    if (existing) {
      alert(`Already in your products: ${existing.name}`);
      startEdit(existing);
      return;
    }

    setForm({ ...EMPTY_FORM, barcode: code });
    setScanInfo({ kind: "loading" });

    try {
      const result = await lookupBarcode(code);
      if (result.found) {
        setForm({ ...result.draft, barcode: code });
        setScanInfo({ kind: "found", warnings: result.warnings });
      } else {
        setScanInfo({ kind: "not-found" });
      }
    } catch (err) {
      console.error(err);
      setScanInfo({ kind: "error" });
    }
  };

  const clearScan = () => {
    setForm({ ...form, barcode: "" });
    setScanInfo(null);
  };

  const toggleFavorite = async (product: Product) => {
    const favorite = !product.favorite;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, favorite } : p))
    );

    const { error } = await supabase
      .from("products")
      .update({ favorite })
      .eq("id", product.id);

    if (error) {
      console.error(error);
      alert("Could not update favorite.");
      loadProducts();
    }
  };

  const startEdit = (product: Product) => {
  setEditingId(product.id);
  setEditForm({
    name: product.name,
    calories: String(product.calories_per_100g),
    protein: String(product.protein_per_100g),
    fat: String(product.fat_per_100g),
    carbs: String(product.carbs_per_100g),
    fiber: String(product.fiber_per_100g),
    salt: String(product.salt_per_100g),
  });
};

  const saveEdit = async () => {
  if (!editingId) return;

  const { error } = await supabase
    .from("products")
    .update({
      name: editForm.name,
      calories_per_100g: Number(editForm.calories) || 0,
      protein_per_100g: Number(editForm.protein) || 0,
      fat_per_100g: Number(editForm.fat) || 0,
      carbs_per_100g: Number(editForm.carbs) || 0,
      fiber_per_100g: Number(editForm.fiber) || 0,
      salt_per_100g: Number(editForm.salt) || 0,
    })
    .eq("id", editingId);

  if (error) {
    console.error(error);
    alert("Could not save product. Check your connection and try again.");
    return;
  }

  setEditingId(null);
  setEditForm(null);
  loadProducts();
};

  const cancelEdit = () => {
  setEditingId(null);
  setEditForm(null);
};

  const loadProducts = async (): Promise<Product[]> => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return [];
    }

    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", userData.user.id)
      .eq("archived", false)
      .order("favorite", { ascending: false })
      .order("created_at", { ascending: false });

    const list: Product[] = data || [];
    setProducts(list);
    return list;
  };

  const addProduct = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    if (!form.name.trim()) return;

    const { error } = await supabase.from("products").insert({
      user_id: userData.user.id,
      name: form.name,
      calories_per_100g: Number(form.calories) || 0,
      protein_per_100g: Number(form.protein) || 0,
      fat_per_100g: Number(form.fat) || 0,
      carbs_per_100g: Number(form.carbs) || 0,
      fiber_per_100g: Number(form.fiber) || 0,
      salt_per_100g: Number(form.salt) || 0,
      barcode: form.barcode || null,
    });

    if (error) {
      console.error(error);
      alert("Could not add product. Check your connection and try again.");
      return;
    }

    setForm(EMPTY_FORM);
    setScanInfo(null);

    // Came here from the day page scanner: go back to that day.
    let returnToDay = false;
    try {
      returnToDay = !!sessionStorage.getItem("nt:returnDate");
    } catch {}
    if (returnToDay) {
      router.push("/day");
      return;
    }

    loadProducts();
  };

  const archiveProduct = async (id: string) => {
    const { error } = await supabase
      .from("products")
      .update({ archived: true })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Could not archive product.");
      return;
    }

    loadProducts();
  };

  const inputClass = "w-full border border-black px-3 py-2";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {scanning && (
        <BarcodeScanner
          onDetected={(code) => handleBarcode(code)}
          onClose={() => setScanning(false)}
        />
      )}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <h1 className="text-xl font-semibold tracking-tight">
          Products
        </h1>

        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-neutral-950 space-y-4">
          <div className="flex gap-2">
          <input
            placeholder="Product name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            className="flex-1 min-w-0 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-neutral-900 text-black dark:text-white rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
          />
            <button
              onClick={() => setScanning(true)}
              aria-label="Scan barcode"
              title="Scan barcode"
              className="flex-none px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <ScanBarcode size={18} strokeWidth={1.5} />
            </button>
          </div>

          {form.barcode && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>Barcode {form.barcode}</span>
                <button
                  onClick={clearScan}
                  aria-label="Remove barcode"
                  className="hover:text-foreground transition"
                >
                  <X size={12} strokeWidth={1.75} />
                </button>
              </div>

              {scanInfo?.kind === "loading" && (
                <p className="text-xs text-zinc-500">Looking up the product...</p>
              )}

              {scanInfo?.kind === "found" && (
                <div
                  className={`text-xs rounded-lg px-3 py-2 border space-y-1 ${
                    scanInfo.warnings.length
                      ? "text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-200 dark:bg-amber-950 dark:border-amber-900"
                      : "text-zinc-600 bg-zinc-50 border-zinc-200 dark:text-zinc-300 dark:bg-zinc-900 dark:border-zinc-800"
                  }`}
                >
                  <p>
                    Filled in from Open Food Facts. Compare with the package
                    before saving.
                  </p>
                  {scanInfo.warnings.map((w) => (
                    <p key={w} className="font-medium">{w}</p>
                  ))}
                </div>
              )}

              {scanInfo?.kind === "not-found" && (
                <p className="text-xs rounded-lg px-3 py-2 border text-zinc-600 bg-zinc-50 border-zinc-200 dark:text-zinc-300 dark:bg-zinc-900 dark:border-zinc-800">
                  Not found in Open Food Facts. Fill in from the package. The
                  barcode will be saved, so next time the scan finds it.
                </p>
              )}

              {scanInfo?.kind === "error" && (
                <p className="text-xs rounded-lg px-3 py-2 border text-red-600 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950 dark:border-red-900">
                  Couldn&apos;t reach Open Food Facts. Fill in from the
                  package, or try scanning again.
                </p>
              )}
            </div>
          )}

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
                <label className="text-xs text-zinc-500 dark:text-zinc-400">
                  {field.label} / 100g
                </label>
                <input
                  type="number"
                  value={form[field.key as keyof ProductDraft]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [field.key]: e.target.value,
                    })
                  }
                  className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-neutral-900 text-black dark:text-white rounded-lg px-2 py-1.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
                />
              </div>
            ))}
          </div>

          <button
            onClick={addProduct}
            className="
              w-full
              bg-black text-white
              hover:bg-zinc-800
              dark:bg-white dark:text-black
              dark:hover:bg-gray-200
              py-2 rounded-lg text-sm
              transition
            "
          >
            Add Product
          </button>
        </div>

        <div className="space-y-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-neutral-950 space-y-3"
            >
              {editingId === p.id ? (
                <>
                  <input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-neutral-900 text-black dark:text-white rounded-lg px-3 py-2 text-base sm:text-sm"
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
                      <input
                        key={field.key}
                        type="number"
                        value={editForm[field.key]}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            [field.key]: e.target.value,
                          })
                        }
                        placeholder={field.label}
                        className="border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-neutral-900 text-black dark:text-white rounded-lg px-2 py-1.5 text-base sm:text-sm"
                      />
                    ))}
                  </div>

                  <div className="flex gap-3 text-xs">
                    <button
                      onClick={saveEdit}
                      className="
                        text-zinc-500 dark:text-zinc-400
                        hover:text-black dark:hover:text-white
                        transition font-medium
                      "
                    >
                      Save
                    </button>

                    <button
                      onClick={cancelEdit}
                      className="
                        text-zinc-500 dark:text-zinc-400
                        hover:text-black dark:hover:text-white
                        transition
                      "
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <button
                      onClick={() => toggleFavorite(p)}
                      aria-label={p.favorite ? "Remove from favorites" : "Add to favorites"}
                      title={p.favorite ? "Remove from favorites" : "Add to favorites"}
                      className={`flex-none mt-0.5 transition ${
                        p.favorite
                          ? "text-amber-500"
                          : "text-zinc-300 dark:text-zinc-600 hover:text-amber-500"
                      }`}
                    >
                      <Star
                        size={16}
                        strokeWidth={1.75}
                        fill={p.favorite ? "currentColor" : "none"}
                      />
                    </button>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {p.name}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {p.calories_per_100g} kcal · 
                      P {p.protein_per_100g} · 
                      F {p.fat_per_100g} · 
                      C {p.carbs_per_100g} · 
                      Fiber {p.fiber_per_100g} · 
                      Salt {p.salt_per_100g}
                    </div>
                  </div>
                  </div>

                  <div className="flex gap-3 text-xs">
                    <button
                      onClick={() => startEdit(p)}
                      className="text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => {
                        const confirmed = confirm("Archive this product?");
                        if (!confirmed) return;
                        archiveProduct(p.id);
                      }}
                      className="text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}