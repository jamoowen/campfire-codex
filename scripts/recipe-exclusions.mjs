import { isRouteSafeRecipeId } from './recipe-normalization.mjs';

export function normalizeRecipeExclusions(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('Recipe exclusions must be an object.');
  if (typeof raw.title !== 'string' || !raw.title.trim())
    throw new Error('Recipe exclusions are missing a title.');
  if (!Array.isArray(raw.recipes) || raw.recipes.length === 0)
    throw new Error('Recipe exclusions contain no recipes.');
  if (
    !Number.isInteger(raw.recipe_count) ||
    raw.recipe_count !== raw.recipes.length
  )
    throw new Error('Recipe exclusions recipe_count does not match recipes.');
  const exclusions = new Map();
  raw.recipes.forEach((entry, index) => {
    if (
      !entry ||
      typeof entry !== 'object' ||
      Array.isArray(entry) ||
      !isRouteSafeRecipeId(entry.id) ||
      typeof entry.reason !== 'string' ||
      !entry.reason.trim()
    )
      throw new Error(`Recipe exclusion ${index + 1} is invalid.`);
    if (exclusions.has(entry.id))
      throw new Error(`Duplicate recipe exclusion id: ${entry.id}`);
    exclusions.set(entry.id, entry.reason.trim());
  });
  return exclusions;
}

export function applyRecipeExclusions(recipes, exclusions) {
  const ids = new Set(recipes.map((recipe) => recipe.id));
  for (const id of exclusions.keys())
    if (!ids.has(id))
      throw new Error(`Recipe exclusion references unknown recipe id: ${id}`);
  return recipes.filter((recipe) => !exclusions.has(recipe.id));
}
