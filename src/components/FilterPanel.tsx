import type { CatalogFacets, FacetValue } from '../../shared/recipe';
import type { SearchFilters } from '../api';
import { ChevronIcon, ResetIcon, SlidersIcon } from '../icons';

interface FilterPanelProps {
  filters: SearchFilters;
  facets: CatalogFacets | null;
  open: boolean;
  activeCount: number;
  screenFoodAvailable: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<SearchFilters>) => void;
  onReset: () => void;
}

function FacetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FacetValue[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="facet-select">
      <span>{label}</span>
      <span className="facet-select__control">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Any</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
        <ChevronIcon />
      </span>
    </label>
  );
}

function ToggleRune({
  checked,
  label,
  detail,
  onChange,
}: {
  checked: boolean;
  label: string;
  detail: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={checked ? 'toggle-rune is-active' : 'toggle-rune'}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-rune__mark" aria-hidden="true" />
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </label>
  );
}

export function FilterPanel({
  filters,
  facets,
  open,
  activeCount,
  screenFoodAvailable,
  onToggle,
  onChange,
  onReset,
}: FilterPanelProps) {
  return (
    <section
      className={open ? 'filters is-open' : 'filters'}
      aria-label="Recipe filters"
    >
      <button
        className="filters__toggle"
        type="button"
        onClick={onToggle}
        aria-expanded={open}
      >
        <SlidersIcon />
        <span>Filters</span>
        {activeCount > 0 ? <b>{activeCount}</b> : null}
        <ChevronIcon />
      </button>
      <div className="filters__body">
        <div className="quick-runes" aria-label="Quick filters">
          <ToggleRune
            checked={filters.quick30}
            label="Quick"
            detail="30 minutes or less"
            onChange={(quick30) => onChange({ quick30 })}
          />
          <ToggleRune
            checked={filters.under10}
            label="Few ingredients"
            detail="Under ten key items"
            onChange={(under10) => onChange({ under10 })}
          />
          <ToggleRune
            checked={filters.singleVessel}
            label="One vessel"
            detail="Less washing-up folklore"
            onChange={(singleVessel) => onChange({ singleVessel })}
          />
          <ToggleRune
            checked={filters.onePotOrPan}
            label="One pot or pan"
            detail="Civilisation's finest work"
            onChange={(onePotOrPan) => onChange({ onePotOrPan })}
          />
          <ToggleRune
            checked={filters.traybake}
            label="Traybake"
            detail="Put it in. Walk away."
            onChange={(traybake) => onChange({ traybake })}
          />
          {screenFoodAvailable ? (
            <ToggleRune
              checked={filters.screenFood}
              label="Screen food"
              detail="Film, TV & games"
              onChange={(screenFood) => onChange({ screenFood })}
            />
          ) : null}
        </div>
        <div className="facet-grid">
          <FacetSelect
            label="Chef or author"
            value={filters.chef}
            options={facets?.chefs ?? []}
            onChange={(chef) => onChange({ chef })}
          />
          <FacetSelect
            label="Cuisine"
            value={filters.cuisine}
            options={facets?.cuisines ?? []}
            onChange={(cuisine) => onChange({ cuisine })}
          />
          <FacetSelect
            label="Protein"
            value={filters.protein}
            options={facets?.proteins ?? []}
            onChange={(protein) => onChange({ protein })}
          />
          <FacetSelect
            label="Dish"
            value={filters.dish}
            options={facets?.dishTypes ?? []}
            onChange={(dish) => onChange({ dish })}
          />
          <FacetSelect
            label="Diet"
            value={filters.dietary}
            options={facets?.dietary ?? []}
            onChange={(dietary) => onChange({ dietary })}
          />
          <FacetSelect
            label="Difficulty"
            value={filters.difficulty}
            options={facets?.difficulties ?? []}
            onChange={(difficulty) => onChange({ difficulty })}
          />
          <FacetSelect
            label="Time band"
            value={filters.time}
            options={facets?.timeCategories ?? []}
            onChange={(time) => onChange({ time })}
          />
          <FacetSelect
            label="Supermarket odds"
            value={filters.availability}
            options={facets?.availability ?? []}
            onChange={(availability) => onChange({ availability })}
          />
        </div>
        <button
          type="button"
          className="filters__reset"
          onClick={onReset}
          disabled={activeCount === 0}
        >
          <ResetIcon />
          Reset the ritual
        </button>
      </div>
    </section>
  );
}
