import { isRouteSafeRecipeId } from './recipe-normalization.mjs';

const screenTypes = new Set(['film', 'tv', 'video_game']);
const relationships = new Set([
  'creator_demonstrated',
  'professional_recreation',
]);

function requiredString(value, field, index) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Screen food record ${index + 1} is missing ${field}.`);
  }
  return value.trim();
}

export function normalizeScreenFoodIndex(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Screen food index must be an object.');
  }
  if (typeof raw.title !== 'string' || raw.title.trim() === '') {
    throw new Error('Screen food index is missing a title.');
  }
  if (!Array.isArray(raw.recipes) || raw.recipes.length === 0) {
    throw new Error('Screen food index contains no recipes.');
  }
  if (
    !Number.isInteger(raw.recipe_count) ||
    raw.recipe_count !== raw.recipes.length
  ) {
    throw new Error('Screen food index recipe_count does not match recipes.');
  }

  const references = new Map();
  raw.recipes.forEach((record, index) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error(`Screen food record ${index + 1} is not an object.`);
    }
    const id = requiredString(record.id, 'id', index);
    if (!isRouteSafeRecipeId(id)) {
      throw new Error(`Screen food record ${id} has an invalid id.`);
    }
    if (references.has(id)) {
      throw new Error(`Duplicate screen food recipe id: ${id}`);
    }
    if (record.pop_culture !== true || record.screen_origin !== true) {
      throw new Error(
        `Screen food record ${id} is not a verified screen reference.`,
      );
    }
    const type = requiredString(record.screen_type, 'screen_type', index);
    if (!screenTypes.has(type)) {
      throw new Error(
        `Screen food record ${id} has unsupported screen_type: ${type}`,
      );
    }
    const relationship = requiredString(
      record.screen_relationship,
      'screen_relationship',
      index,
    );
    if (!relationships.has(relationship)) {
      throw new Error(
        `Screen food record ${id} has unsupported screen_relationship: ${relationship}`,
      );
    }
    references.set(id, {
      title: requiredString(record.screen_title, 'screen_title', index),
      type,
      relationship,
    });
  });

  return references;
}

export function applyScreenReferences(recipes, references) {
  const recipeIds = new Set(recipes.map((recipe) => recipe.id));
  for (const id of references.keys()) {
    if (!recipeIds.has(id)) {
      throw new Error(`Screen food index references unknown recipe id: ${id}`);
    }
  }
  return recipes.map((recipe) => {
    const screenReference = references.get(recipe.id);
    return screenReference ? { ...recipe, screenReference } : recipe;
  });
}
