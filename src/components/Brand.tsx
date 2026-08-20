export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'brand brand--compact' : 'brand'}>
      <span className="brand__emblem" aria-hidden="true">
        <picture>
          <source srcSet="/assets/pot-emblem-160.webp" type="image/webp" />
          <img
            src="/assets/pot-emblem-160.webp"
            alt=""
            width="64"
            height="64"
          />
        </picture>
      </span>
      <span className="brand__copy">
        <strong>Campfire Codex</strong>
        <small>Recipes worth adventuring for</small>
      </span>
    </div>
  );
}
