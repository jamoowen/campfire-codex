import demoCatalogJson from '../data/demo-catalog.json';
import type {
  ApiError,
  CatalogPayload,
  MetaResponse,
  RecipeRecord,
  RecipeSummary,
  SearchResponse,
} from '../shared/recipe';

const CATALOG_KEY = 'catalog/v1.json';
const CATALOG_CACHE_MS = 60_000;
const MAX_PAGE_SIZE = 24;
const MAX_PAGE = 50;
const MAX_QUERY_LENGTH = 100;
const MAX_IDS = 100;

const demoCatalog = demoCatalogJson as unknown as CatalogPayload;

let catalogCache:
  | {
      catalog: CatalogPayload;
      source: 'r2' | 'demo';
      expiresAt: number;
    }
  | undefined;

const blockedUserAgents =
  /(?:\bbot\b|spider|crawler|scrapy|curl|wget|python-requests|httpclient|go-http-client|libwww|headless|phantom|selenium|playwright|puppeteer|postmanruntime|insomnia|node-fetch|axios|java\/)/i;

function clampInteger(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .toLocaleLowerCase('en-GB')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isLocalHost(hostname: string) {
  return (
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  );
}

function requestLooksHuman(request: Request, url: URL) {
  if (isLocalHost(url.hostname)) return true;

  const userAgent = request.headers.get('user-agent') ?? '';
  if (!userAgent || blockedUserAgents.test(userAgent)) return false;

  const fetchSite = request.headers.get('sec-fetch-site');
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (origin) {
    try {
      if (new URL(origin).origin !== url.origin) return false;
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      if (new URL(referer).origin !== url.origin) return false;
    } catch {
      return false;
    }
  }

  const browserContext = fetchSite === 'same-origin';
  const sameOriginEvidence = Boolean(origin || referer);
  return browserContext || sameOriginEvidence;
}

function baseHeaders() {
  return new Headers({
    'Cache-Control': 'private, no-store, max-age=0',
    'Content-Type': 'application/json; charset=utf-8',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Referrer-Policy': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex',
  });
}

function jsonResponse<T>(
  body: T,
  options: { status?: number; extraHeaders?: HeadersInit } = {},
) {
  const headers = baseHeaders();
  if (options.extraHeaders) {
    new Headers(options.extraHeaders).forEach((value, key) =>
      headers.set(key, value),
    );
  }
  return new Response(JSON.stringify(body), {
    status: options.status ?? 200,
    headers,
  });
}

function errorResponse(
  status: number,
  error: string,
  message: string,
  extraHeaders?: HeadersInit,
) {
  return jsonResponse<ApiError>({ error, message }, { status, extraHeaders });
}

function assertCatalog(value: unknown): CatalogPayload {
  if (!value || typeof value !== 'object')
    throw new Error('Catalogue is not an object.');
  const candidate = value as Partial<CatalogPayload>;
  if (candidate.schemaVersion !== 1 || !Array.isArray(candidate.recipes)) {
    throw new Error('Catalogue schema is invalid.');
  }
  if (!candidate.dataset || !candidate.facets) {
    throw new Error('Catalogue metadata is missing.');
  }
  return candidate as CatalogPayload;
}

async function loadCatalog(env: Env) {
  if (catalogCache && catalogCache.expiresAt > Date.now()) return catalogCache;

  try {
    const object = await env.RECIPES.get(CATALOG_KEY);
    if (object) {
      const catalog = assertCatalog(await object.json());
      catalogCache = {
        catalog,
        source: 'r2',
        expiresAt: Date.now() + CATALOG_CACHE_MS,
      };
      return catalogCache;
    }
  } catch (error) {
    console.warn('R2 catalogue unavailable; using demo data.', error);
  }

  catalogCache = {
    catalog: demoCatalog,
    source: 'demo',
    expiresAt: Date.now() + CATALOG_CACHE_MS,
  };
  return catalogCache;
}

async function withinLimit(
  limiter: RateLimitBinding,
  key: string,
  environment: Env['APP_ENV'],
) {
  try {
    return (await limiter.limit({ key })).success;
  } catch (error) {
    if (environment === 'production') {
      console.error('Rate limiter failed closed.', error);
      return false;
    }
    console.warn(
      'Rate limiter unavailable in local development; allowing request.',
      error,
    );
    return true;
  }
}

function hasValue(values: string[], wanted: string | null) {
  if (!wanted) return true;
  const normalizedWanted = normalizeText(wanted);
  return values.some((value) => normalizeText(value) === normalizedWanted);
}

function recipeSearchText(recipe: RecipeRecord) {
  return normalizeText(
    [
      recipe.name,
      recipe.chef,
      recipe.sourceSite,
      ...recipe.cuisines,
      ...recipe.proteins,
      ...recipe.dishTypes,
      ...recipe.dietary,
      ...recipe.keyIngredients,
      ...recipe.tags,
    ].join(' '),
  );
}

function relevanceScore(recipe: RecipeRecord, query: string) {
  if (!query) return 0;
  const normalizedQuery = normalizeText(query);
  const title = normalizeText(recipe.name);
  const chef = normalizeText(recipe.chef);
  let score = 0;
  if (title === normalizedQuery) score += 100;
  else if (title.startsWith(normalizedQuery)) score += 40;
  else if (title.includes(normalizedQuery)) score += 25;
  if (chef.includes(normalizedQuery)) score += 12;
  for (const ingredient of recipe.keyIngredients) {
    if (normalizeText(ingredient).includes(normalizedQuery)) score += 4;
  }
  return score;
}

function toSummary(recipe: RecipeRecord): RecipeSummary {
  return {
    id: recipe.id,
    name: recipe.name,
    chef: recipe.chef,
    sourceSite: recipe.sourceSite,
    cuisines: recipe.cuisines,
    proteins: recipe.proteins,
    dishTypes: recipe.dishTypes,
    dietary: recipe.dietary,
    difficulty: recipe.difficulty,
    estimatedTotalMinutes: recipe.estimatedTotalMinutes,
    estimatedHandsOnMinutes: recipe.estimatedHandsOnMinutes,
    timeCategory: recipe.timeCategory,
    keyIngredients: recipe.keyIngredients,
    normalizedKeyIngredientCount: recipe.normalizedKeyIngredientCount,
    under10KeyIngredients: recipe.under10KeyIngredients,
    sainsburysAvailability: recipe.sainsburysAvailability,
    onePot: recipe.onePot,
    onePan: recipe.onePan,
    traybake: recipe.traybake,
    singleVessel: recipe.singleVessel,
  };
}

function toRecipeRecord(recipe: RecipeRecord): RecipeRecord {
  return {
    id: recipe.id,
    name: recipe.name,
    chef: recipe.chef,
    authorType: recipe.authorType,
    sourceSite: recipe.sourceSite,
    sourceUrl: recipe.sourceUrl,
    sourceType: recipe.sourceType,
    sourceAttributionVerified: recipe.sourceAttributionVerified,
    cuisines: recipe.cuisines,
    proteins: recipe.proteins,
    dishTypes: recipe.dishTypes,
    dietary: recipe.dietary,
    difficulty: recipe.difficulty,
    estimatedTotalMinutes: recipe.estimatedTotalMinutes,
    estimatedHandsOnMinutes: recipe.estimatedHandsOnMinutes,
    timeCategory: recipe.timeCategory,
    timeBasis: recipe.timeBasis,
    handsOnTimeBasis: recipe.handsOnTimeBasis,
    sourceTimeNote: recipe.sourceTimeNote,
    passiveTimeNote: recipe.passiveTimeNote,
    keyIngredients: recipe.keyIngredients,
    normalizedKeyIngredientCount: recipe.normalizedKeyIngredientCount,
    under10KeyIngredients: recipe.under10KeyIngredients,
    tenOrFewerKeyIngredients: recipe.tenOrFewerKeyIngredients,
    sainsburysAvailability: recipe.sainsburysAvailability,
    specialtyIngredients: recipe.specialtyIngredients,
    onePot: recipe.onePot,
    onePan: recipe.onePan,
    onePotOrPan: recipe.onePotOrPan,
    traybake: recipe.traybake,
    singleVessel: recipe.singleVessel,
    tags: recipe.tags,
    selectionBatch: recipe.selectionBatch,
  };
}

function searchQuip(total: number, query: string) {
  if (total === 0)
    return 'The dungeon contains no such beast. Try fewer adjectives.';
  if (query && total === 1)
    return 'One survivor. Statistically suspicious, but useful.';
  if (total > 200)
    return 'A heroic quantity of dinner. Apply a filter before winter.';
  if (total > 60)
    return 'Plenty to choose from. Commitment remains your problem.';
  return `${total} plausible dinners. None require a prophecy.`;
}

function filterAndSort(recipes: RecipeRecord[], url: URL) {
  const params = url.searchParams;
  const query = (params.get('q') ?? '').slice(0, MAX_QUERY_LENGTH).trim();
  const queryTokens = normalizeText(query).split(' ').filter(Boolean);
  const requestedIds = (params.get('ids') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);
  const idSet = requestedIds.length > 0 ? new Set(requestedIds) : null;

  const filtered = recipes.filter((recipe) => {
    if (idSet && !idSet.has(recipe.id)) return false;
    if (queryTokens.length > 0) {
      const haystack = recipeSearchText(recipe);
      if (!queryTokens.every((token) => haystack.includes(token))) return false;
    }
    if (!hasValue([recipe.chef], params.get('chef'))) return false;
    if (!hasValue(recipe.cuisines, params.get('cuisine'))) return false;
    if (!hasValue(recipe.proteins, params.get('protein'))) return false;
    if (!hasValue(recipe.dishTypes, params.get('dish'))) return false;
    if (!hasValue(recipe.dietary, params.get('dietary'))) return false;
    if (!hasValue([recipe.difficulty], params.get('difficulty'))) return false;
    if (!hasValue([recipe.timeCategory], params.get('time'))) return false;
    if (!hasValue([recipe.sainsburysAvailability], params.get('availability')))
      return false;
    if (
      params.get('quick30') === '1' &&
      (recipe.estimatedTotalMinutes <= 0 || recipe.estimatedTotalMinutes > 30)
    )
      return false;
    if (params.get('under10') === '1' && !recipe.under10KeyIngredients)
      return false;
    if (params.get('singleVessel') === '1' && !recipe.singleVessel)
      return false;
    if (params.get('onePotOrPan') === '1' && !recipe.onePotOrPan) return false;
    if (params.get('traybake') === '1' && !recipe.traybake) return false;
    return true;
  });

  const sort = params.get('sort') ?? 'relevance';
  filtered.sort((left, right) => {
    if (sort === 'fastest') {
      return (
        (left.estimatedTotalMinutes <= 0
          ? Number.MAX_SAFE_INTEGER
          : left.estimatedTotalMinutes) -
          (right.estimatedTotalMinutes <= 0
            ? Number.MAX_SAFE_INTEGER
            : right.estimatedTotalMinutes) ||
        left.name.localeCompare(right.name)
      );
    }
    if (sort === 'fewest') {
      return (
        left.normalizedKeyIngredientCount -
          right.normalizedKeyIngredientCount ||
        left.name.localeCompare(right.name)
      );
    }
    if (sort === 'author') {
      return (
        left.chef.localeCompare(right.chef) ||
        left.name.localeCompare(right.name)
      );
    }
    if (sort === 'title') return left.name.localeCompare(right.name);
    return (
      relevanceScore(right, query) - relevanceScore(left, query) ||
      (left.estimatedTotalMinutes <= 0
        ? Number.MAX_SAFE_INTEGER
        : left.estimatedTotalMinutes) -
        (right.estimatedTotalMinutes <= 0
          ? Number.MAX_SAFE_INTEGER
          : right.estimatedTotalMinutes) ||
      left.name.localeCompare(right.name)
    );
  });

  if (idSet && requestedIds.length > 0 && sort === 'collection') {
    const order = new Map(requestedIds.map((id, index) => [id, index]));
    filtered.sort(
      (left, right) =>
        (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999),
    );
  }

  return { filtered, query };
}

async function handleApi(request: Request, env: Env, url: URL) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return errorResponse(
      405,
      'method_not_allowed',
      'Only GET is invited to this campfire.',
      {
        Allow: 'GET, HEAD',
      },
    );
  }

  if (!requestLooksHuman(request, url)) {
    return errorResponse(
      403,
      'automated_request_rejected',
      'This pantry is for browsers attached to humans.',
    );
  }

  const detailRoute = url.pathname.match(
    /^\/api\/recipes\/([A-Za-z0-9._-]{1,100})$/,
  );
  const limiter = detailRoute
    ? env.DETAIL_RATE_LIMITER
    : env.SEARCH_RATE_LIMITER;
  const connectingIp = request.headers.get('CF-Connecting-IP');
  if (!isLocalHost(url.hostname) && !connectingIp) {
    return errorResponse(
      403,
      'identity_unavailable',
      'The pantry cannot verify this request.',
    );
  }
  const limiterKey = `${detailRoute ? 'detail' : 'search'}:${connectingIp}`;
  if (
    !isLocalHost(url.hostname) &&
    !(await withinLimit(limiter, limiterKey, env.APP_ENV))
  ) {
    return errorResponse(
      429,
      'rate_limited',
      'The pantry keeper has noticed your enthusiasm. Wait a minute.',
      { 'Retry-After': '60' },
    );
  }

  if (url.pathname === '/api/health') {
    return jsonResponse({
      ok: true,
      service: 'campfire-codex',
      environment: env.APP_ENV,
    });
  }

  const { catalog, source } = await loadCatalog(env);

  if (url.pathname === '/api/meta') {
    const response: MetaResponse = {
      dataset: catalog.dataset,
      facets: catalog.facets,
      source,
    };
    return jsonResponse(response);
  }

  if (url.pathname === '/api/search') {
    const { filtered, query } = filterAndSort(catalog.recipes, url);
    const page = clampInteger(url.searchParams.get('page'), 1, 1, MAX_PAGE);
    const pageSize = clampInteger(
      url.searchParams.get('pageSize'),
      18,
      1,
      MAX_PAGE_SIZE,
    );
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const response: SearchResponse = {
      items: filtered.slice(start, start + pageSize).map(toSummary),
      total,
      page: safePage,
      pageSize,
      totalPages,
      source,
      quip: searchQuip(total, query),
    };
    return jsonResponse(response);
  }

  if (detailRoute) {
    const id = decodeURIComponent(detailRoute[1]!);
    const recipe = catalog.recipes.find((candidate) => candidate.id === id);
    if (!recipe) {
      return errorResponse(
        404,
        'recipe_not_found',
        'That recipe has either escaped or never existed.',
      );
    }
    return jsonResponse(toRecipeRecord(recipe));
  }

  return errorResponse(
    404,
    'not_found',
    `No route named ${titleCase(url.pathname)} lives here.`,
  );
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return new Response('Not found', { status: 404 });
    }

    try {
      const response = await handleApi(request, env, url);
      if (request.method === 'HEAD') {
        return new Response(null, {
          status: response.status,
          headers: response.headers,
        });
      }
      return response;
    } catch (error) {
      console.error('Unhandled API error', error);
      return errorResponse(
        500,
        'pantry_failure',
        'The pantry door is jammed. Heroism has limits. Try again.',
      );
    }
  },
} satisfies ExportedHandler<Env>;
