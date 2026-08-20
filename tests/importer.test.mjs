import { describe, expect, it } from "vitest";
import { normalizeRecipe } from "../scripts/recipe-normalization.mjs";

const validRecipe = {
  id: "campfire.stew-1",
  name: "A sensible stew",
  chef: "Test Cook",
  source_url: "https://example.test/stew",
  key_ingredients: ["beans", " onion ", "beans"],
};

describe("recipe importer normalization", () => {
  it("normalizes supported aliases and de-duplicates useful ingredients", () => {
    const recipe = normalizeRecipe({ ...validRecipe, keyIngredients: validRecipe.key_ingredients, key_ingredients: undefined }, 0);
    expect(recipe.id).toBe("campfire.stew-1");
    expect(recipe.keyIngredients).toEqual(["beans", "onion"]);
    expect(recipe.sourceUrl).toBe("https://example.test/stew");
  });

  it.each([undefined, "beans", [], ["", "  "]])("rejects invalid key ingredients: %j", (key_ingredients) => {
    expect(() => normalizeRecipe({ ...validRecipe, key_ingredients }, 0)).toThrow(/key_ingredients/);
  });

  it("rejects IDs that cannot be used by the API route", () => {
    expect(() => normalizeRecipe({ ...validRecipe, id: "not/a-route" }, 0)).toThrow(/invalid id/);
  });
});
