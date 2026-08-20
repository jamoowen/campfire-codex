import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import type { CatalogPayload, RecipeRecord } from "../shared/recipe";

function recipe(id: string): RecipeRecord {
  return {
    id, name: `Recipe ${id}`, chef: "Test Cook", authorType: "cookbook_author",
    sourceSite: "example.test", sourceUrl: `https://example.test/${id}`, sourceType: "reputable_source", sourceAttributionVerified: true,
    cuisines: [], proteins: [], dishTypes: [], dietary: [], difficulty: "easy",
    estimatedTotalMinutes: 20, estimatedHandsOnMinutes: 10, timeCategory: "quick_16_30", timeBasis: "stated", handsOnTimeBasis: null, sourceTimeNote: null, passiveTimeNote: null,
    keyIngredients: ["beans"], normalizedKeyIngredientCount: 1, under10KeyIngredients: true, tenOrFewerKeyIngredients: true,
    sainsburysAvailability: "high", specialtyIngredients: [], onePot: true, onePan: false, onePotOrPan: true, traybake: false, singleVessel: true, tags: [], selectionBatch: "test",
  };
}

beforeAll(async () => {
  const recipes = Array.from({ length: 25 }, (_, index) => recipe(`recipe-${index + 1}`));
  Object.assign(recipes[0]!, { method: "private method", instructions: ["private instructions"] });
  const catalog: CatalogPayload = {
    schemaVersion: 1, generatedAt: "2026-01-01T00:00:00.000Z",
    dataset: { title: "Test catalogue", recipeCount: recipes.length, authorCount: 1, sourceSiteCount: 1, generatedAt: "2026-01-01T00:00:00.000Z", isDemo: false, note: "test" },
    facets: { chefs: [], cuisines: [], proteins: [], dishTypes: [], dietary: [], difficulties: [], timeCategories: [], availability: [] },
    recipes,
  };
  await env.RECIPES.put("catalog/v1.json", JSON.stringify(catalog));
});

describe("Worker API", () => {
  it("rejects non-GET health requests before serving it", async () => {
    const response = await SELF.fetch("http://localhost/api/health", { method: "POST" });
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, HEAD");
  });

  it("does not set an identity cookie and keeps summaries bounded", async () => {
    const response = await SELF.fetch("http://localhost/api/search?pageSize=999");
    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toBeNull();
    const body = await response.json<{ items: Array<Record<string, unknown>>; pageSize: number }>();
    expect(body.pageSize).toBe(24);
    expect(body.items).toHaveLength(24);
    expect(body.items[0]).not.toHaveProperty("sourceUrl");
  });

  it("projects R2 recipe details through an allowlist", async () => {
    const response = await SELF.fetch("http://localhost/api/recipes/recipe-1");
    const body = await response.json<Record<string, unknown>>();
    expect(body).not.toHaveProperty("method");
    expect(body).not.toHaveProperty("instructions");
    expect(body.sourceUrl).toBe("https://example.test/recipe-1");
  });

  it("rejects same-site and wrong-scheme browser evidence on non-local requests", async () => {
    const response = await SELF.fetch("https://campfire.test/api/health", {
      headers: { "User-Agent": "Mozilla/5.0", "Sec-Fetch-Site": "same-site", Origin: "http://campfire.test", "CF-Connecting-IP": "192.0.2.1" },
    });
    expect(response.status).toBe(403);
  });
});
