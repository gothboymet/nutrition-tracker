export type Mode = "cut" | "bulk";

export function calculateTargets(
  weight: number,
  calorieTarget: number,
  mode: Mode
) {
  let protein: number;
  let fat: number;

  if (mode === "cut") {
    protein = 2.2 * weight;
    fat = 0.8 * weight;
  } else {
    protein = 2.0 * weight;
    fat = 0.9 * weight;
  }

  const proteinKcal = protein * 4;
  const fatKcal = fat * 9;

  const carbs = (calorieTarget - (proteinKcal + fatKcal)) / 4;

  const fiber = (14 * calorieTarget) / 1000;

  return {
    calorie_target: Math.round(calorieTarget),
    protein_target: Number(protein.toFixed(1)),
    fat_target: Number(fat.toFixed(1)),
    carb_target: Number(carbs.toFixed(1)),
    fiber_target: Number(fiber.toFixed(1)),
    salt_min: 5,
    salt_max: 7,
  };
}