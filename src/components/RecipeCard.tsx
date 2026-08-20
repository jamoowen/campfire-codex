import type { RecipeSummary } from '../../shared/recipe';
import {
  formatCookedDate,
  formatDifficulty,
  formatMinutes,
  humanize,
  recipeAccent,
  recipeBlurb,
} from '../format';
import {
  BookmarkIcon,
  ClockIcon,
  FlameIcon,
  PotIcon,
  StarIcon,
} from '../icons';
import type { CookedEntry } from '../storage';

interface RecipeCardProps {
  recipe: RecipeSummary;
  saved: boolean;
  cooked: boolean;
  cookedEntry: CookedEntry | null;
  rating: number;
  onOpen: () => void;
  onToggleSaved: () => void;
  onToggleCooked: () => void;
}

export function RecipeCard({
  recipe,
  saved,
  cooked,
  cookedEntry,
  rating,
  onOpen,
  onToggleSaved,
  onToggleCooked,
}: RecipeCardProps) {
  const accent = recipeAccent(recipe);
  const formatTag = recipe.onePot
    ? 'One pot'
    : recipe.onePan
      ? 'One pan'
      : recipe.traybake
        ? 'Traybake'
        : recipe.dishTypes.find((type) => type !== 'main')
          ? humanize(recipe.dishTypes.find((type) => type !== 'main')!)
          : 'Main';

  return (
    <article className={`recipe-card ${accent}`}>
      <button
        className="recipe-card__open"
        type="button"
        onClick={onOpen}
        aria-label={`Open ${recipe.name}`}
      >
        <span className="recipe-card__visual" aria-hidden="true">
          <span className="recipe-card__sigil">
            <PotIcon />
          </span>
          <span className="recipe-card__ingredient">
            {recipe.keyIngredients[0] ?? 'Dinner'}
          </span>
          <span className="recipe-card__format">{formatTag}</span>
        </span>
        <span className="recipe-card__content">
          <span className="recipe-card__eyeline">by {recipe.chef}</span>
          <strong>{recipe.name}</strong>
          <span className="recipe-card__blurb">{recipeBlurb(recipe)}</span>
          <span className="recipe-card__meta">
            <span>
              <ClockIcon />
              {formatMinutes(recipe.estimatedTotalMinutes)}
            </span>
            <span>
              <PotIcon />
              {recipe.normalizedKeyIngredientCount} key ingredients
            </span>
            <span>{formatDifficulty(recipe.difficulty)}</span>
          </span>
          {cookedEntry ? (
            <span className="recipe-card__history">
              Last conquered {formatCookedDate(cookedEntry.lastCookedAt)}
            </span>
          ) : null}
        </span>
      </button>
      <div className="recipe-card__actions">
        <button
          type="button"
          className={saved ? 'icon-action is-active' : 'icon-action'}
          onClick={onToggleSaved}
          aria-pressed={saved}
          aria-label={
            saved
              ? `Remove ${recipe.name} from saved recipes`
              : `Save ${recipe.name}`
          }
        >
          <BookmarkIcon filled={saved} />
          <span>{saved ? 'Saved' : 'Save'}</span>
        </button>
        <button
          type="button"
          className={cooked ? 'icon-action is-active' : 'icon-action'}
          onClick={onToggleCooked}
          aria-pressed={cooked}
          aria-label={
            cooked
              ? `Remove cooked mark from ${recipe.name}`
              : `Mark ${recipe.name} cooked`
          }
        >
          <FlameIcon filled={cooked} />
          <span>{cooked ? 'Cooked' : 'Cook it'}</span>
        </button>
        <span
          className="card-rating"
          aria-label={rating ? `Rated ${rating} out of 5` : 'Not rated'}
        >
          <StarIcon filled={rating > 0} />
          {rating || '—'}
        </span>
      </div>
    </article>
  );
}
