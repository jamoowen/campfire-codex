import type { CatalogDataset } from "../../shared/recipe";
import { SearchIcon, ShieldIcon } from "../icons";

interface HeroProps {
  query: string;
  onQueryChange: (value: string) => void;
  dataset: CatalogDataset | null;
  source: "r2" | "demo" | null;
}

export function Hero({ query, onQueryChange, dataset, source }: HeroProps) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <picture className="hero__art" aria-hidden="true">
        <source
          type="image/avif"
          srcSet="/assets/campfire-party-640.avif 640w, /assets/campfire-party-960.avif 960w, /assets/campfire-party-1440.avif 1440w, /assets/campfire-party-1920.avif 1920w"
          sizes="100vw"
        />
        <source
          type="image/webp"
          srcSet="/assets/campfire-party-640.webp 640w, /assets/campfire-party-960.webp 960w, /assets/campfire-party-1440.webp 1440w, /assets/campfire-party-1920.webp 1920w"
          sizes="100vw"
        />
        <img src="/assets/campfire-party-1440.webp" alt="" width="1920" height="1343" />
      </picture>
      <div className="hero__veil" aria-hidden="true" />
      <div className="hero__content shell">
        <p className="hero__motto">No account. No prophecy. Just dinner.</p>
        <h1 id="hero-title">Find something worth lighting the stove for.</h1>
        <p className="hero__lede">
          Search chefs, ingredients, cuisines and weeknight shortcuts. Save the promising ones.
          Mark the survivors cooked. Judge them mercilessly.
        </p>
        <label className="hero-search">
          <span className="sr-only">Search recipes</span>
          <SearchIcon />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search recipes, chefs, ingredients…"
            autoComplete="off"
            maxLength={100}
            data-recipe-search
          />
          <kbd>/</kbd>
        </label>
        <div className="hero__stats" aria-label="Catalogue summary">
          <span>
            <strong>{dataset?.recipeCount ?? "—"}</strong> recipes
          </span>
          <span>
            <strong>{dataset?.authorCount ?? "—"}</strong> authors
          </span>
          <span>
            <ShieldIcon />
            private R2 catalogue
          </span>
        </div>
        {source === "demo" ? (
          <p className="demo-notice">
            Demo provisions are showing. Seed local R2 or upload your private catalogue to summon all
            {" "}
            {dataset?.recipeCount === 12 ? "300" : "your"} recipes.
          </p>
        ) : null}
      </div>
    </section>
  );
}
