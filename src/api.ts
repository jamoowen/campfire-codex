import type {
  ApiError,
  MetaResponse,
  RecipeRecord,
  SearchResponse,
} from '../shared/recipe';

export interface SearchFilters {
  query: string;
  chef: string;
  cuisine: string;
  protein: string;
  dish: string;
  dietary: string;
  difficulty: string;
  time: string;
  availability: string;
  quick30: boolean;
  under10: boolean;
  singleVessel: boolean;
  onePotOrPan: boolean;
  traybake: boolean;
  screenFood: boolean;
  sort: 'relevance' | 'fastest' | 'fewest' | 'author' | 'title' | 'collection';
}

export class ApiClientError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: ApiError | null = null;
    try {
      body = (await response.json()) as ApiError;
    } catch {
      // Keep the generic fallback below.
    }
    throw new ApiClientError(
      response.status,
      body?.error ?? 'request_failed',
      body?.message ?? `Request failed with status ${response.status}.`,
    );
  }
  return (await response.json()) as T;
}

export async function fetchMeta(signal?: AbortSignal) {
  const response = await fetch('/api/meta', {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
    signal,
  });
  return readJson<MetaResponse>(response);
}

export async function searchRecipes(
  filters: SearchFilters,
  page: number,
  ids: string[],
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: '24',
    sort: filters.sort,
  });
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.chef) params.set('chef', filters.chef);
  if (filters.cuisine) params.set('cuisine', filters.cuisine);
  if (filters.protein) params.set('protein', filters.protein);
  if (filters.dish) params.set('dish', filters.dish);
  if (filters.dietary) params.set('dietary', filters.dietary);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.time) params.set('time', filters.time);
  if (filters.availability) params.set('availability', filters.availability);
  if (filters.quick30) params.set('quick30', '1');
  if (filters.under10) params.set('under10', '1');
  if (filters.singleVessel) params.set('singleVessel', '1');
  if (filters.onePotOrPan) params.set('onePotOrPan', '1');
  if (filters.traybake) params.set('traybake', '1');
  if (filters.screenFood) params.set('screenFood', '1');
  if (ids.length > 0) params.set('ids', ids.slice(0, 100).join(','));

  const response = await fetch(`/api/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
    signal,
  });
  return readJson<SearchResponse>(response);
}

export async function fetchRecipe(id: string, signal?: AbortSignal) {
  const response = await fetch(`/api/recipes/${encodeURIComponent(id)}`, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
    signal,
  });
  return readJson<RecipeRecord>(response);
}
