import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const input = path.resolve(
  process.cwd(),
  process.argv[2] ?? '.recipe-build/catalog-v1.json',
);
const catalog = JSON.parse(await readFile(input, 'utf8'));

if (catalog.schemaVersion !== 1)
  throw new Error('Unsupported catalogue schema version.');
if (!Array.isArray(catalog.recipes) || catalog.recipes.length === 0) {
  throw new Error('Catalogue contains no recipes.');
}
if (catalog.dataset?.recipeCount !== catalog.recipes.length) {
  throw new Error('dataset.recipeCount does not match recipes.length.');
}

const ids = new Set();
const forbidden = [
  'method',
  'methods',
  'instructions',
  'directions',
  'steps',
  'pop_culture',
  'screen_origin',
  'screen_relationship',
  'screen_title',
  'screen_type',
  'source_locator',
  'source_search_url',
];
const routeSafeId = /^[A-Za-z0-9._-]{1,100}$/;
const screenTypes = new Set(['film', 'tv', 'video_game']);
const screenRelationships = new Set([
  'creator_demonstrated',
  'professional_recreation',
]);
for (const recipe of catalog.recipes) {
  for (const field of ['id', 'name', 'chef', 'sourceUrl']) {
    if (typeof recipe[field] !== 'string' || recipe[field].length === 0) {
      throw new Error(`Recipe has an invalid ${field}.`);
    }
  }
  if (ids.has(recipe.id)) throw new Error(`Duplicate recipe id: ${recipe.id}`);
  ids.add(recipe.id);
  if (!routeSafeId.test(recipe.id))
    throw new Error(`Recipe ${recipe.id} has an invalid route id.`);
  let sourceUrl;
  try {
    sourceUrl = new URL(recipe.sourceUrl);
  } catch {
    throw new Error(`Recipe ${recipe.id} has an invalid sourceUrl.`);
  }
  if (!['http:', 'https:'].includes(sourceUrl.protocol)) {
    throw new Error(`Recipe ${recipe.id} sourceUrl must use HTTP or HTTPS.`);
  }
  for (const field of forbidden) {
    if (field in recipe)
      throw new Error(`Forbidden full-recipe field found: ${field}`);
  }
  if (
    !Array.isArray(recipe.keyIngredients) ||
    recipe.keyIngredients.length === 0 ||
    recipe.keyIngredients.some(
      (ingredient) =>
        typeof ingredient !== 'string' || ingredient.trim() === '',
    )
  ) {
    throw new Error(`Recipe ${recipe.id} has invalid keyIngredients.`);
  }
  if (recipe.screenReference != null) {
    const reference = recipe.screenReference;
    if (
      !reference ||
      typeof reference !== 'object' ||
      typeof reference.title !== 'string' ||
      reference.title.trim() === '' ||
      !screenTypes.has(reference.type) ||
      !screenRelationships.has(reference.relationship)
    ) {
      throw new Error(`Recipe ${recipe.id} has invalid screenReference.`);
    }
    if (
      Object.keys(reference).some(
        (key) => !['title', 'type', 'relationship'].includes(key),
      )
    ) {
      throw new Error(
        `Recipe ${recipe.id} screenReference contains an unsupported field.`,
      );
    }
  }
}

console.log(
  `Verified ${catalog.recipes.length} recipes in ${path.relative(process.cwd(), input)}.`,
);
