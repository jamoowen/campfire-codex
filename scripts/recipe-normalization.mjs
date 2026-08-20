const ROUTE_SAFE_ID = /^[A-Za-z0-9._-]{1,100}$/;

const allowedDifficulty = new Set(["easy", "easy_moderate", "moderate"]);
const allowedTimeCategory = new Set([
  "very_quick_under_15",
  "quick_16_30",
  "weeknight_31_60",
  "longer_or_passive",
]);
const allowedAvailability = new Set(["high", "medium"]);

const string = (value, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;
const nullableString = (value) => {
  const result = string(value);
  return result.length > 0 ? result : null;
};
const list = (value) =>
  Array.isArray(value)
    ? [...new Set(value.map((item) => string(item)).filter(Boolean))]
    : [];
const integer = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : fallback;
const bool = (value, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

function requireValue(value, field, index) {
  const result = string(value);
  if (!result) throw new Error(`Recipe ${index + 1} is missing ${field}.`);
  return result;
}

export function isRouteSafeRecipeId(value) {
  return typeof value === "string" && ROUTE_SAFE_ID.test(value);
}

export function normalizeRecipe(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Recipe ${index + 1} is not an object.`);
  }

  const id = requireValue(raw.id, "id", index);
  if (!isRouteSafeRecipeId(id)) {
    throw new Error(`Recipe ${id} has an invalid id. IDs must match [A-Za-z0-9._-]{1,100}.`);
  }
  const name = requireValue(raw.name, "name", index);
  const chef = requireValue(raw.chef, "chef", index);
  const sourceUrl = requireValue(raw.source_url ?? raw.sourceUrl, "source_url", index);
  let parsedUrl;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    throw new Error(`Recipe ${id} has an invalid source_url.`);
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`Recipe ${id} source_url must use HTTP or HTTPS.`);
  }

  const keyIngredientInput = raw.key_ingredients ?? raw.keyIngredients;
  if (!Array.isArray(keyIngredientInput)) {
    throw new Error(`Recipe ${id} key_ingredients must be an array.`);
  }
  const keyIngredients = list(keyIngredientInput);
  if (keyIngredients.length === 0) {
    throw new Error(`Recipe ${id} key_ingredients must contain at least one non-empty string.`);
  }

  const difficulty = string(raw.difficulty, "easy");
  if (!allowedDifficulty.has(difficulty)) throw new Error(`Recipe ${id} has unsupported difficulty: ${difficulty}`);
  const timeCategory = string(raw.time_category ?? raw.timeCategory, "weeknight_31_60");
  if (!allowedTimeCategory.has(timeCategory)) throw new Error(`Recipe ${id} has unsupported time_category: ${timeCategory}`);
  const availability = string(raw.sainsburys_availability ?? raw.sainsburysAvailability, "medium");
  if (!allowedAvailability.has(availability)) throw new Error(`Recipe ${id} has unsupported sainsburys_availability: ${availability}`);

  const ingredientCount = integer(raw.normalized_key_ingredient_count ?? raw.normalizedKeyIngredientCount, keyIngredients.length);
  const onePot = bool(raw.one_pot ?? raw.onePot);
  const onePan = bool(raw.one_pan ?? raw.onePan);
  const traybake = bool(raw.traybake);
  const dishTypes = list(raw.dish_types ?? raw.dishTypes);
  const onePotOrPan = bool(raw.one_pot_or_pan ?? raw.onePotOrPan, onePot || onePan);
  const singleVessel = bool(raw.single_vessel ?? raw.singleVessel, onePotOrPan || traybake || dishTypes.includes("slow_cooker"));

  return {
    id, name, chef,
    authorType: string(raw.author_type ?? raw.authorType, "cookbook_author"),
    sourceSite: string(raw.source_site ?? raw.sourceSite, parsedUrl.hostname),
    sourceUrl,
    sourceType: string(raw.source_type ?? raw.sourceType, "reputable_source"),
    sourceAttributionVerified: bool(raw.source_attribution_verified ?? raw.sourceAttributionVerified, true),
    cuisines: list(raw.cuisines), proteins: list(raw.proteins), dishTypes, dietary: list(raw.dietary),
    difficulty,
    estimatedTotalMinutes: integer(raw.estimated_total_minutes ?? raw.estimatedTotalMinutes, 0),
    estimatedHandsOnMinutes: raw.estimated_hands_on_minutes == null && raw.estimatedHandsOnMinutes == null ? null : integer(raw.estimated_hands_on_minutes ?? raw.estimatedHandsOnMinutes),
    timeCategory,
    timeBasis: string(raw.time_basis ?? raw.timeBasis, "not_stated"),
    handsOnTimeBasis: nullableString(raw.hands_on_time_basis ?? raw.handsOnTimeBasis),
    sourceTimeNote: nullableString(raw.source_time_note ?? raw.sourceTimeNote),
    passiveTimeNote: nullableString(raw.passive_time_note ?? raw.passiveTimeNote),
    keyIngredients, normalizedKeyIngredientCount: ingredientCount,
    under10KeyIngredients: bool(raw.under_10_key_ingredients ?? raw.under10KeyIngredients, ingredientCount < 10),
    tenOrFewerKeyIngredients: bool(raw.ten_or_fewer_key_ingredients ?? raw.tenOrFewerKeyIngredients, ingredientCount <= 10),
    sainsburysAvailability: availability,
    specialtyIngredients: list(raw.specialty_ingredients ?? raw.specialtyIngredients),
    onePot, onePan, onePotOrPan, traybake, singleVessel,
    tags: list(raw.tags), selectionBatch: string(raw.selection_batch ?? raw.selectionBatch, "default"),
  };
}

export function label(value) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
