import { describe, expect, it } from 'vitest';
import { normalizeRecipe } from '../scripts/recipe-normalization.mjs';
import {
  applyScreenReferences,
  normalizeScreenFoodIndex,
} from '../scripts/screen-food.mjs';

const validRecipe = {
  id: 'campfire.stew-1',
  name: 'A sensible stew',
  chef: 'Test Cook',
  source_url: 'https://example.test/stew',
  key_ingredients: ['beans', ' onion ', 'beans'],
};

describe('recipe importer normalization', () => {
  it('normalizes supported aliases and de-duplicates useful ingredients', () => {
    const recipe = normalizeRecipe(
      {
        ...validRecipe,
        keyIngredients: validRecipe.key_ingredients,
        key_ingredients: undefined,
      },
      0,
    );
    expect(recipe.id).toBe('campfire.stew-1');
    expect(recipe.keyIngredients).toEqual(['beans', 'onion']);
    expect(recipe.sourceUrl).toBe('https://example.test/stew');
  });

  it.each([undefined, 'beans', [], ['', '  ']])(
    'rejects invalid key ingredients: %j',
    (key_ingredients) => {
      expect(() =>
        normalizeRecipe({ ...validRecipe, key_ingredients }, 0),
      ).toThrow(/key_ingredients/);
    },
  );

  it('rejects IDs that cannot be used by the API route', () => {
    expect(() =>
      normalizeRecipe({ ...validRecipe, id: 'not/a-route' }, 0),
    ).toThrow(/invalid id/);
  });

  it('uses the curated screen-food index as the public reference source', () => {
    const recipes = [normalizeRecipe(validRecipe, 0)];
    const references = normalizeScreenFoodIndex({
      title: 'Curated screen food',
      recipe_count: 1,
      recipes: [
        {
          id: validRecipe.id,
          pop_culture: true,
          screen_origin: true,
          screen_title: 'The Ember Road',
          screen_type: 'film',
          screen_relationship: 'professional_recreation',
        },
      ],
    });
    expect(applyScreenReferences(recipes, references)[0]).toMatchObject({
      screenReference: {
        title: 'The Ember Road',
        type: 'film',
        relationship: 'professional_recreation',
      },
    });
  });

  it('rejects malformed and mismatched screen-food index records', () => {
    expect(() =>
      normalizeScreenFoodIndex({
        title: 'Broken index',
        recipe_count: 1,
        recipes: [
          {
            id: validRecipe.id,
            pop_culture: true,
            screen_origin: true,
            screen_title: 'The Ember Road',
            screen_type: 'book',
            screen_relationship: 'professional_recreation',
          },
        ],
      }),
    ).toThrow(/screen_type/);

    const references = new Map([
      [
        'missing-recipe',
        {
          title: 'The Ember Road',
          type: 'film',
          relationship: 'professional_recreation',
        },
      ],
    ]);
    expect(() => applyScreenReferences([], references)).toThrow(
      /unknown recipe/,
    );
  });
});
