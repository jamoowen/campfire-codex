import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  MetaResponse,
  RecipeRecord,
  RecipeSummary,
  SearchResponse,
} from '../shared/recipe';
import {
  fetchMeta,
  fetchRecipe,
  searchRecipes,
  type SearchFilters,
} from './api';
import { useDebouncedValue } from './hooks';
import { ArrowIcon, ChevronIcon, FlameIcon, SlidersIcon } from './icons';
import { AboutDialog } from './components/AboutDialog';
import { AppHeader, type ViewMode } from './components/AppHeader';
import { EmptyState } from './components/EmptyState';
import { FilterPanel } from './components/FilterPanel';
import { Hero } from './components/Hero';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDrawer } from './components/RecipeDrawer';
import { Toast, type ToastMessage } from './components/Toast';
import { useRecipeJournal } from './storage';

const initialFilters: SearchFilters = {
  query: '',
  chef: '',
  cuisine: '',
  protein: '',
  dish: '',
  dietary: '',
  difficulty: '',
  time: '',
  availability: '',
  quick30: false,
  under10: false,
  singleVessel: false,
  onePotOrPan: false,
  traybake: false,
  screenFood: false,
  sort: 'relevance',
};

const viewCopy: Record<ViewMode, { title: string; description: string }> = {
  explore: {
    title: 'The recipe index',
    description:
      'Browse the hoard. Apply filters before it becomes a personality test.',
  },
  saved: {
    title: 'Saved provisions',
    description: 'Ideas you optimistically assumed future you would cook.',
  },
  cooked: {
    title: 'Conquered dishes',
    description:
      'A private record of pans survived and dinners successfully claimed.',
  },
};

function initialRecipeFromUrl() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('recipe');
}

export default function App() {
  const [view, setView] = useState<ViewMode>('explore');
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [items, setItems] = useState<RecipeSummary[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(true);
  const [page, setPage] = useState(1);
  const [retryNonce, setRetryNonce] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    initialRecipeFromUrl(),
  );
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeRecord | null>(
    null,
  );
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const journal = useRecipeJournal();
  const debouncedQuery = useDebouncedValue(filters.query, 260);

  const effectiveFilters = useMemo<SearchFilters>(
    () => ({
      ...filters,
      query: debouncedQuery,
      sort: view === 'explore' ? filters.sort : 'collection',
    }),
    [debouncedQuery, filters, view],
  );

  const collectionIds = useMemo(() => {
    if (view === 'saved') return journal.savedIds;
    if (view === 'cooked') return journal.cookedIds;
    return [];
  }, [journal.cookedIds, journal.savedIds, view]);

  const activeFilterCount = useMemo(() => {
    return [
      filters.chef,
      filters.cuisine,
      filters.protein,
      filters.dish,
      filters.dietary,
      filters.difficulty,
      filters.time,
      filters.availability,
      filters.quick30,
      filters.under10,
      filters.singleVessel,
      filters.onePotOrPan,
      filters.traybake,
      filters.screenFood,
    ].filter(Boolean).length;
  }, [filters]);

  const searchCriteriaKey = useMemo(
    () =>
      JSON.stringify({
        view,
        filters: effectiveFilters,
        ids: collectionIds,
      }),
    [collectionIds, effectiveFilters, view],
  );

  const announce = useCallback((text: string) => {
    setToast({ id: Date.now(), text });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setMetaError(null);
    fetchMeta(controller.signal)
      .then(setMeta)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setMetaError(
          error instanceof Error
            ? error.message
            : 'The catalogue metadata refused to appear.',
        );
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchCriteriaKey]);

  useEffect(() => {
    if (view !== 'explore' && collectionIds.length === 0) {
      setItems([]);
      setResults({
        items: [],
        total: 0,
        page: 1,
        pageSize: 24,
        totalPages: 1,
        source: meta?.source ?? 'demo',
        quip: 'Nothing here yet. The ledger remains smugly blank.',
      });
      setSearching(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    setSearchError(null);
    searchRecipes(effectiveFilters, page, collectionIds, controller.signal)
      .then((response) => {
        setResults(response);
        setItems(response.items);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSearchError(
          error instanceof Error
            ? error.message
            : 'The pantry search failed dramatically.',
        );
        setItems([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearching(false);
      });
    return () => controller.abort();
  }, [collectionIds, effectiveFilters, meta?.source, page, retryNonce, view]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedRecipe(null);
      setDetailError(null);
      return;
    }
    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError(null);
    fetchRecipe(selectedId, controller.signal)
      .then(setSelectedRecipe)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setDetailError(
          error instanceof Error
            ? error.message
            : 'The recipe scroll is unreadable.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [selectedId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (event.key === '/' && !typing && !selectedId && !aboutOpen) {
        event.preventDefault();
        document
          .querySelector<HTMLInputElement>('[data-recipe-search]')
          ?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [aboutOpen, selectedId]);

  useEffect(() => {
    const onPopState = () => setSelectedId(initialRecipeFromUrl());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openRecipe = useCallback((id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('recipe', id);
    window.history.pushState({}, '', url);
    setSelectedId(id);
  }, []);

  const closeRecipe = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('recipe');
    window.history.pushState({}, '', url);
    setSelectedId(null);
  }, []);

  const patchFilters = useCallback((patch: Partial<SearchFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    announce('The ritual has been reset. The pantry denies everything.');
  }, [announce]);

  const toggleSaved = useCallback(
    (id: string) => {
      const savedNow = journal.toggleSaved(id);
      announce(
        savedNow
          ? 'Stashed. Future you now has obligations.'
          : 'Unstashed. Commitment successfully avoided.',
      );
    },
    [announce, journal],
  );

  const toggleCooked = useCallback(
    (id: string) => {
      const cookedNow = journal.toggleCooked(id);
      announce(
        cookedNow
          ? 'Conquered. The pan may never recover.'
          : 'Victory redacted. History is flexible.',
      );
    },
    [announce, journal],
  );

  const setRating = useCallback(
    (id: string, rating: number) => {
      journal.setRating(id, rating);
      announce(
        rating
          ? `Judgement rendered: ${rating}/5. Mercifully final.`
          : 'Verdict withdrawn. The court is confused.',
      );
    },
    [announce, journal],
  );

  const selectedCookedEntry = selectedId
    ? journal.cookedEntry(selectedId)
    : null;
  const filtered = activeFilterCount > 0 || Boolean(filters.query.trim());
  const copy = viewCopy[view];

  return (
    <div className="site-frame">
      <AppHeader
        view={view}
        onViewChange={(next) => {
          setView(next);
          window.requestAnimationFrame(() =>
            document
              .getElementById('recipes')
              ?.scrollIntoView({ behavior: 'smooth' }),
          );
        }}
        onAbout={() => setAboutOpen(true)}
        savedCount={journal.savedIds.length}
        cookedCount={journal.cookedIds.length}
      />
      <div className="hero-stack">
        <Hero
          query={filters.query}
          onQueryChange={(query) => patchFilters({ query })}
          dataset={meta?.dataset ?? null}
          source={meta?.source ?? null}
        />
      </div>

      <main id="recipes" className="catalogue shell">
        <div className="catalogue__ornament" aria-hidden="true">
          <span />
          <FlameIcon />
          <span />
        </div>

        <FilterPanel
          filters={filters}
          facets={meta?.facets ?? null}
          open={filtersOpen}
          activeCount={activeFilterCount}
          screenFoodAvailable={Boolean(meta?.dataset.screenFoodCount)}
          onToggle={() => setFiltersOpen((current) => !current)}
          onChange={patchFilters}
          onReset={resetFilters}
        />

        <section className="results" aria-labelledby="results-title">
          <header className="results__header">
            <div>
              <p>
                {view === 'explore'
                  ? 'Browse the hoard'
                  : view === 'saved'
                    ? 'Your provisions'
                    : 'The victory ledger'}
              </p>
              <h2 id="results-title">{copy.title}</h2>
              <span>{copy.description}</span>
            </div>
            <div className="results__tools">
              <span className="result-count">
                {searching
                  ? 'Consulting scrolls…'
                  : `${results?.total ?? 0} ${results?.total === 1 ? 'recipe' : 'recipes'}`}
              </span>
              {view === 'explore' ? (
                <label className="sort-control">
                  <span>Sort</span>
                  <select
                    value={filters.sort}
                    onChange={(event) =>
                      patchFilters({
                        sort: event.target.value as SearchFilters['sort'],
                      })
                    }
                  >
                    <option value="relevance">Best match</option>
                    <option value="fastest">Fastest first</option>
                    <option value="fewest">Fewest ingredients</option>
                    <option value="author">Author A–Z</option>
                    <option value="title">Title A–Z</option>
                  </select>
                  <ChevronIcon />
                </label>
              ) : null}
            </div>
          </header>

          {metaError ? (
            <p className="inline-warning">Catalogue metadata: {metaError}</p>
          ) : null}
          {results?.quip && !searching ? (
            <p className="results__quip">{results.quip}</p>
          ) : null}

          {searchError ? (
            <div className="search-failure">
              <SlidersIcon />
              <h3>The pantry door is jammed.</h3>
              <p>{searchError}</p>
              <button
                type="button"
                onClick={() => setRetryNonce((current) => current + 1)}
              >
                Try again
              </button>
            </div>
          ) : searching && items.length === 0 ? (
            <div className="recipe-grid" aria-label="Loading recipes">
              {Array.from({ length: 6 }, (_, index) => (
                <div className="recipe-skeleton" key={index} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState view={view} filtered={filtered} />
          ) : (
            <div className="recipe-grid">
              {items.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  saved={journal.isSaved(recipe.id)}
                  cooked={journal.isCooked(recipe.id)}
                  cookedEntry={journal.cookedEntry(recipe.id)}
                  rating={journal.ratingFor(recipe.id)}
                  onOpen={() => openRecipe(recipe.id)}
                  onToggleSaved={() => toggleSaved(recipe.id)}
                  onToggleCooked={() => toggleCooked(recipe.id)}
                />
              ))}
            </div>
          )}

          {results && results.totalPages > 1 ? (
            <nav className="pagination" aria-label="Recipe pages">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                <ArrowIcon direction="left" />
                Previous
              </button>
              <span>
                Page <strong>{results.page}</strong> of {results.totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.min(results.totalPages, current + 1),
                  )
                }
                disabled={page >= results.totalPages}
              >
                Next
                <ArrowIcon />
              </button>
            </nav>
          ) : null}
        </section>
      </main>

      <footer className="site-footer">
        <div className="shell">
          <span>Campfire Codex</span>
          <p>Great meals need neither magic nor an account. A pan helps.</p>
          <button type="button" onClick={() => setAboutOpen(true)}>
            What’s the catch?
          </button>
        </div>
      </footer>

      <RecipeDrawer
        open={Boolean(selectedId)}
        recipe={selectedRecipe}
        loading={detailLoading}
        error={detailError}
        saved={selectedId ? journal.isSaved(selectedId) : false}
        cooked={selectedId ? journal.isCooked(selectedId) : false}
        cookedEntry={selectedCookedEntry}
        rating={selectedId ? journal.ratingFor(selectedId) : 0}
        onClose={closeRecipe}
        onToggleSaved={() => selectedId && toggleSaved(selectedId)}
        onToggleCooked={() => selectedId && toggleCooked(selectedId)}
        onCookAgain={() => {
          if (!selectedId) return;
          journal.recordAnotherCook(selectedId);
          announce(
            'Another victory entered into the ledger. Modesty remains optional.',
          );
        }}
        onRating={(rating) => selectedId && setRating(selectedId, rating)}
      />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
