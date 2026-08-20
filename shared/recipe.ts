export type Difficulty = 'easy' | 'easy_moderate' | 'moderate';
export type TimeCategory =
  | 'very_quick_under_15'
  | 'quick_16_30'
  | 'weeknight_31_60'
  | 'longer_or_passive';
export type Availability = 'high' | 'medium';

export interface RecipeRecord {
  id: string;
  name: string;
  chef: string;
  authorType: string;
  sourceSite: string;
  sourceUrl: string;
  sourceType: string;
  sourceAttributionVerified: boolean;
  cuisines: string[];
  proteins: string[];
  dishTypes: string[];
  dietary: string[];
  difficulty: Difficulty;
  estimatedTotalMinutes: number;
  estimatedHandsOnMinutes: number | null;
  timeCategory: TimeCategory;
  timeBasis: string;
  handsOnTimeBasis: string | null;
  sourceTimeNote: string | null;
  passiveTimeNote: string | null;
  keyIngredients: string[];
  normalizedKeyIngredientCount: number;
  under10KeyIngredients: boolean;
  tenOrFewerKeyIngredients: boolean;
  sainsburysAvailability: Availability;
  specialtyIngredients: string[];
  onePot: boolean;
  onePan: boolean;
  onePotOrPan: boolean;
  traybake: boolean;
  singleVessel: boolean;
  tags: string[];
  selectionBatch: string;
}

export type RecipeSummary = Pick<
  RecipeRecord,
  | 'id'
  | 'name'
  | 'chef'
  | 'sourceSite'
  | 'cuisines'
  | 'proteins'
  | 'dishTypes'
  | 'dietary'
  | 'difficulty'
  | 'estimatedTotalMinutes'
  | 'estimatedHandsOnMinutes'
  | 'timeCategory'
  | 'keyIngredients'
  | 'normalizedKeyIngredientCount'
  | 'under10KeyIngredients'
  | 'sainsburysAvailability'
  | 'onePot'
  | 'onePan'
  | 'traybake'
  | 'singleVessel'
>;

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export interface CatalogFacets {
  chefs: FacetValue[];
  cuisines: FacetValue[];
  proteins: FacetValue[];
  dishTypes: FacetValue[];
  dietary: FacetValue[];
  difficulties: FacetValue[];
  timeCategories: FacetValue[];
  availability: FacetValue[];
}

export interface CatalogDataset {
  title: string;
  recipeCount: number;
  authorCount: number;
  sourceSiteCount: number;
  generatedAt: string;
  isDemo: boolean;
  note: string;
}

export interface CatalogPayload {
  schemaVersion: 1;
  generatedAt: string;
  dataset: CatalogDataset;
  facets: CatalogFacets;
  recipes: RecipeRecord[];
}

export interface MetaResponse {
  dataset: CatalogDataset;
  facets: CatalogFacets;
  source: 'r2' | 'demo';
}

export interface SearchResponse {
  items: RecipeSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  source: 'r2' | 'demo';
  quip: string;
}

export interface ApiError {
  error: string;
  message: string;
}
