import type { RecipeRecord, RecipeSummary } from "../shared/recipe";

export function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatDifficulty(value: string) {
  if (value === "easy_moderate") return "Easy-ish";
  return humanize(value);
}

export function formatMinutes(minutes: number) {
  if (minutes <= 0) return "Time unknown";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

export function formatCookedDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Some mysterious evening";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function recipeAccent(recipe: RecipeSummary | RecipeRecord) {
  const seed = [...recipe.id].reduce((total, character) => total + character.charCodeAt(0), 0);
  return `accent-${seed % 6}`;
}

export function recipeBlurb(recipe: RecipeSummary | RecipeRecord) {
  const primary = recipe.keyIngredients.slice(0, 3).join(", ");
  if (recipe.singleVessel) {
    return `${primary}. One vessel. Fewer dishes. Civilization limps onward.`;
  }
  if (recipe.estimatedTotalMinutes <= 15) {
    return `${primary}. Faster than deciding what to order.`;
  }
  if (recipe.dietary.includes("vegetarian") || recipe.dietary.includes("vegan")) {
    return `${primary}. No monster parts required.`;
  }
  return `${primary}. Sensible food for people with wildly unsensible schedules.`;
}
