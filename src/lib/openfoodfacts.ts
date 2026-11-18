// Free product database lookup (https://world.openfoodfacts.org).
// The data is crowd-sourced, so it is only used to pre-fill the product form,
// together with warnings about values that don't add up.

export type ProductDraft = {
  name: string;
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
  fiber: string;
  salt: string;
};

export type LookupResult =
  | { found: true; draft: ProductDraft; warnings: string[] }
  | { found: false };

const num = (value: unknown): number | null => {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

const fmt = (n: number | null, decimals = 1) =>
  n === null ? "" : String(Math.round(n * 10 ** decimals) / 10 ** decimals);

export async function lookupBarcode(code: string): Promise<LookupResult> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
      code
    )}?fields=product_name,product_name_de,product_name_en,brands,nutriments`
  );

  if (res.status === 404) return { found: false };
  if (!res.ok) throw new Error(`Open Food Facts error ${res.status}`);

  const data = await res.json();
  if (data.status !== 1 || !data.product) return { found: false };

  const p = data.product;
  const n = p.nutriments || {};

  let kcal = num(n["energy-kcal_100g"]);
  if (kcal === null && num(n["energy-kj_100g"]) !== null) {
    kcal = (num(n["energy-kj_100g"]) as number) / 4.184;
  }
  const protein = num(n.proteins_100g);
  const fat = num(n.fat_100g);
  const carbs = num(n.carbohydrates_100g);
  const fiber = num(n.fiber_100g);
  const salt = num(n.salt_100g);

  const baseName = (
    p.product_name_de ||
    p.product_name ||
    p.product_name_en ||
    ""
  ).trim();
  const brand = String(p.brands || "")
    .split(",")[0]
    .trim();
  const name =
    brand && !baseName.toLowerCase().includes(brand.toLowerCase())
      ? `${baseName} ${brand}`.trim()
      : baseName;

  const warnings: string[] = [];

  const missing = [
    kcal === null && "kcal",
    protein === null && "protein",
    fat === null && "fat",
    carbs === null && "carbs",
    fiber === null && "fiber",
    salt === null && "salt",
  ].filter(Boolean);
  if (missing.length) {
    warnings.push(`Missing: ${missing.join(", ")}. Fill in from the package.`);
  }

  if (kcal !== null && protein !== null && fat !== null && carbs !== null) {
    // EU labels: carbs exclude fiber; fiber counts 2 kcal/g.
    const expected = protein * 4 + carbs * 4 + fat * 9 + (fiber ?? 0) * 2;
    const diff = Math.abs(kcal - expected);
    if (diff > 20 && diff / Math.max(kcal, expected) > 0.12) {
      warnings.push(
        `Calories don't add up: ${Math.round(kcal)} kcal listed, but the macros give about ${Math.round(expected)} kcal. Check the package.`
      );
    }
  }

  if (
    [protein, fat, carbs, fiber, salt].some((v) => v !== null && v > 100) ||
    (protein ?? 0) + (fat ?? 0) + (carbs ?? 0) + (fiber ?? 0) > 105
  ) {
    warnings.push("Some values are more than 100 g per 100 g. Check the package.");
  }

  if (!name) warnings.push("No product name. Add one.");

  return {
    found: true,
    draft: {
      name,
      calories: kcal === null ? "" : String(Math.round(kcal)),
      protein: fmt(protein),
      fat: fmt(fat),
      carbs: fmt(carbs),
      fiber: fmt(fiber),
      salt: fmt(salt, 2),
    },
    warnings,
  };
}
