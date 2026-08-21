import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { label, normalizeRecipe } from './recipe-normalization.mjs';
import {
  applyRecipeExclusions,
  normalizeRecipeExclusions,
} from './recipe-exclusions.mjs';
import {
  applyScreenReferences,
  normalizeScreenFoodIndex,
} from './screen-food.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.resolve(
  root,
  process.argv[2] ?? 'private/recipes.json',
);
const screenFoodIndexPath = path.resolve(
  root,
  process.argv[3] ?? 'private/pop-culture-index.json',
);
const exclusionsPath = path.join(root, 'private/recipe-exclusions.json');
const outputDir = path.join(root, '.recipe-build');
const outputPath = path.join(outputDir, 'catalog-v1.json');
const reportPath = path.join(outputDir, 'report.json');

const string = (value, fallback = '') =>
  typeof value === 'string' ? value.trim() : fallback;

function facet(recipes, accessor) {
  const counts = new Map();
  for (const recipe of recipes) {
    const values = accessor(recipe);
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: label(value), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

const rawText = await readFile(sourcePath, 'utf8');
const parsed = JSON.parse(rawText);
const rawRecipes = Array.isArray(parsed) ? parsed : parsed.recipes;
if (!Array.isArray(rawRecipes)) {
  throw new Error(
    'Expected a top-level array or an object with a recipes array.',
  );
}
if (rawRecipes.length === 0) throw new Error('The recipe array is empty.');
if (rawRecipes.length > 10_000) {
  throw new Error('This minimal R2 catalogue supports at most 10,000 recipes.');
}

const exclusions = normalizeRecipeExclusions(
  JSON.parse(await readFile(exclusionsPath, 'utf8')),
);
const baseRecipes = applyRecipeExclusions(
  rawRecipes.map(normalizeRecipe),
  exclusions,
);
const screenFoodIndex = normalizeScreenFoodIndex(
  JSON.parse(await readFile(screenFoodIndexPath, 'utf8')),
);
const recipes = applyScreenReferences(baseRecipes, screenFoodIndex);
const ids = new Set();
for (const recipe of recipes) {
  if (ids.has(recipe.id)) throw new Error(`Duplicate recipe id: ${recipe.id}`);
  ids.add(recipe.id);
}

const sourceMetadata = Array.isArray(parsed) ? {} : (parsed.metadata ?? {});
const generatedAt = new Date().toISOString();
const authors = new Set(recipes.map((recipe) => recipe.chef));
const sourceSites = new Set(recipes.map((recipe) => recipe.sourceSite));

const catalog = {
  schemaVersion: 1,
  generatedAt,
  dataset: {
    title: string(sourceMetadata.title, 'Private recipe catalogue'),
    recipeCount: recipes.length,
    authorCount: authors.size,
    sourceSiteCount: sourceSites.size,
    screenFoodCount: recipes.filter((recipe) => recipe.screenReference).length,
    generatedAt,
    isDemo: false,
    note: 'Key ingredients are normalized search terms. Full quantities and methods remain with the canonical source.',
  },
  facets: {
    chefs: facet(recipes, (recipe) => [recipe.chef]),
    cuisines: facet(recipes, (recipe) => recipe.cuisines),
    proteins: facet(recipes, (recipe) => recipe.proteins),
    dishTypes: facet(recipes, (recipe) => recipe.dishTypes),
    dietary: facet(recipes, (recipe) => recipe.dietary),
    difficulties: facet(recipes, (recipe) => [recipe.difficulty]),
    timeCategories: facet(recipes, (recipe) => [recipe.timeCategory]),
    availability: facet(recipes, (recipe) => [recipe.sainsburysAvailability]),
  },
  recipes,
};

const report = {
  builtAt: generatedAt,
  source: path.relative(root, sourcePath),
  output: path.relative(root, outputPath),
  recipeCount: recipes.length,
  authorCount: authors.size,
  sourceSiteCount: sourceSites.size,
  screenFoodCount: recipes.filter((recipe) => recipe.screenReference).length,
  excludedCount: exclusions.size,
  quick30OrLess: recipes.filter(
    (recipe) =>
      recipe.estimatedTotalMinutes > 0 && recipe.estimatedTotalMinutes <= 30,
  ).length,
  under10KeyIngredients: recipes.filter(
    (recipe) => recipe.under10KeyIngredients,
  ).length,
  singleVessel: recipes.filter((recipe) => recipe.singleVessel).length,
};

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(catalog)}\n`, 'utf8');
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Built ${report.recipeCount} recipes from ${report.source}.`);
console.log(`Private upload file: ${report.output}`);
console.log(
  `Authors: ${report.authorCount}; source sites: ${report.sourceSiteCount}.`,
);
