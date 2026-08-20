import type { RecipeRecord } from "../../shared/recipe";
import { formatCookedDate, formatDifficulty, formatMinutes, humanize } from "../format";
import {
  BookmarkIcon,
  ClockIcon,
  CloseIcon,
  ExternalIcon,
  FlameIcon,
  PotIcon,
  StarIcon,
} from "../icons";
import type { CookedEntry } from "../storage";
import { Modal } from "./Modal";

interface RecipeDrawerProps {
  open: boolean;
  recipe: RecipeRecord | null;
  loading: boolean;
  error: string | null;
  saved: boolean;
  cooked: boolean;
  cookedEntry: CookedEntry | null;
  rating: number;
  onClose: () => void;
  onToggleSaved: () => void;
  onToggleCooked: () => void;
  onCookAgain: () => void;
  onRating: (rating: number) => void;
}

export function RecipeDrawer({
  open,
  recipe,
  loading,
  error,
  saved,
  cooked,
  cookedEntry,
  rating,
  onClose,
  onToggleSaved,
  onToggleCooked,
  onCookAgain,
  onRating,
}: RecipeDrawerProps) {
  const externalAvailable = recipe ? !new URL(recipe.sourceUrl).hostname.endsWith(".invalid") : false;

  return (
    <Modal open={open} onClose={onClose} labelledBy="recipe-drawer-title" className="recipe-drawer">
      <button className="modal-close" type="button" onClick={onClose} aria-label="Close recipe">
        <CloseIcon />
      </button>
      {loading ? (
        <div className="drawer-loading">
          <span className="loading-rune" />
          <p>Consulting the pantry scrolls…</p>
        </div>
      ) : error ? (
        <div className="drawer-error">
          <h2 id="recipe-drawer-title">The scroll is missing.</h2>
          <p>{error}</p>
        </div>
      ) : recipe ? (
        <>
          <header className="drawer-header">
            <p>{recipe.sourceSite}</p>
            <h2 id="recipe-drawer-title">{recipe.name}</h2>
            <span>by {recipe.chef}</span>
            <div className="drawer-badges">
              <span>
                <ClockIcon /> {formatMinutes(recipe.estimatedTotalMinutes)}
              </span>
              <span>
                <PotIcon /> {recipe.normalizedKeyIngredientCount} key ingredients
              </span>
              <span>{formatDifficulty(recipe.difficulty)}</span>
            </div>
          </header>

          <div className="drawer-actions">
            <button
              type="button"
              className={saved ? "primary-action is-active" : "primary-action"}
              onClick={onToggleSaved}
              aria-pressed={saved}
            >
              <BookmarkIcon filled={saved} />
              {saved ? "Saved for later" : "Save this recipe"}
            </button>
            <button
              type="button"
              className={cooked ? "secondary-action is-active" : "secondary-action"}
              onClick={onToggleCooked}
              aria-pressed={cooked}
            >
              <FlameIcon filled={cooked} />
              {cooked ? "Cooked" : "I cooked this"}
            </button>
          </div>

          {cookedEntry ? (
            <div className="cooked-ledger">
              <span>
                Last conquered <strong>{formatCookedDate(cookedEntry.lastCookedAt)}</strong>
              </span>
              <button type="button" onClick={onCookAgain}>
                Cooked it again
              </button>
            </div>
          ) : null}

          <section className="rating-panel" aria-labelledby="rating-title">
            <div>
              <h3 id="rating-title">Your verdict</h3>
              <p>Entirely local. No tribunal, no account, no awkward follow-up email.</p>
            </div>
            <div className="star-picker" aria-label="Recipe rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={value <= rating ? "is-active" : ""}
                  onClick={() => onRating(value === rating ? 0 : value)}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  aria-pressed={value <= rating}
                >
                  <StarIcon filled={value <= rating} />
                </button>
              ))}
            </div>
          </section>

          <section className="drawer-section">
            <h3>Key ingredients</h3>
            <p className="section-note">
              Search-friendly terms, not a stolen ingredient list. Quantities live with the original
              author.
            </p>
            <ul className="ingredient-list">
              {recipe.keyIngredients.map((ingredient) => (
                <li key={ingredient}>{ingredient}</li>
              ))}
            </ul>
          </section>

          <section className="drawer-section detail-grid">
            <div>
              <h3>Classification</h3>
              <dl>
                <div>
                  <dt>Cuisine</dt>
                  <dd>{recipe.cuisines.map(humanize).join(", ") || "Unclassified"}</dd>
                </div>
                <div>
                  <dt>Protein</dt>
                  <dd>{recipe.proteins.map(humanize).join(", ") || "Not specified"}</dd>
                </div>
                <div>
                  <dt>Format</dt>
                  <dd>{recipe.dishTypes.map(humanize).join(", ")}</dd>
                </div>
                <div>
                  <dt>Availability</dt>
                  <dd>
                    {recipe.sainsburysAvailability === "high"
                      ? "Likely in a large supermarket"
                      : "A side quest may be required"}
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <h3>Useful warnings</h3>
              <dl>
                <div>
                  <dt>Hands-on time</dt>
                  <dd>
                    {recipe.estimatedHandsOnMinutes == null
                      ? "Not estimated"
                      : formatMinutes(recipe.estimatedHandsOnMinutes)}
                  </dd>
                </div>
                <div>
                  <dt>One vessel</dt>
                  <dd>{recipe.singleVessel ? "Yes. The sink rejoices." : "No. Regrettably."}</dd>
                </div>
                <div>
                  <dt>Speciality items</dt>
                  <dd>
                    {recipe.specialtyIngredients.length
                      ? recipe.specialtyIngredients.join(", ")
                      : "None flagged"}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {recipe.sourceTimeNote || recipe.passiveTimeNote ? (
            <section className="drawer-section source-notes">
              <h3>Timing notes</h3>
              {recipe.sourceTimeNote ? <p>{recipe.sourceTimeNote}</p> : null}
              {recipe.passiveTimeNote ? <p>{recipe.passiveTimeNote}</p> : null}
            </section>
          ) : null}

          <footer className="drawer-source">
            <p>
              Full quantities and instructions stay at the canonical source. Copyright law survives the
              dungeon.
            </p>
            {externalAvailable ? (
              <a href={recipe.sourceUrl} target="_blank" rel="noreferrer noopener">
                View the full recipe at {recipe.sourceSite}
                <ExternalIcon />
              </a>
            ) : (
              <span className="demo-source">Demo entry — no external source exists.</span>
            )}
          </footer>
        </>
      ) : null}
    </Modal>
  );
}
